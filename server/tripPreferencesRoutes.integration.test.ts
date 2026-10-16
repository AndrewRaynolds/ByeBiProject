import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { auth: { getUser } } }));
vi.mock("./zapier-integration", () => ({ registerZapierRoutes: vi.fn() }));
vi.mock("./storage", async (original) => {
  const actual = await original<typeof import("./storage")>();
  return { ...actual, storage: new actual.MemStorage() };
});
import { storage } from "./storage";

describe("real preference routes with isolated memory storage", () => {
  let server: Awaited<ReturnType<typeof import("./routes").registerRoutes>>;
  let base: string; let id: number;
  const headers = { Authorization: "Bearer owner", "Content-Type": "application/json" };
  beforeAll(async () => {
    const app = express(); app.use(express.json());
    server = await (await import("./routes")).registerRoutes(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    getUser.mockImplementation(async (token: string) => ({ data: { user: ["owner", "other"].includes(token) ? { id: token } : null }, error: null }));
    id = (await storage.createTrip({ userId: "owner", name: "Fixture", participants: 6, startDate: "2099-10-10", endDate: "2099-10-13", departureCity: "Rome", destinations: ["Lisbon"], experienceType: "bachelor", budget: 700, activities: ["museums"] })).id;
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

  async function snapshot() { return (await fetch(`${base}/api/trips/${id}/preferences`, { headers })).json(); }
  it("reads intact notes without side effects and requires explicit owner PATCH", async () => {
    const before = await storage.getTrip(id); const current = await snapshot();
    expect(current).toMatchObject({ notes: ["museums"], revision: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(await storage.getTrip(id)).toEqual(before);
    const response = await fetch(`${base}/api/trips/${id}/preferences`, { method: "PATCH", headers, body: JSON.stringify({ notes: [" team games "], expectedRevision: current.revision }) });
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ notes: ["team games"] });
    expect(await storage.getTrip(id)).toEqual({ ...before, activities: ["team games"] });
  });
  it("rejects a stale concurrent edit and accepts an idempotent retry", async () => {
    const current = await snapshot();
    const patch = (notes: string[]) => fetch(`${base}/api/trips/${id}/preferences`, { method: "PATCH", headers, body: JSON.stringify({ notes, expectedRevision: current.revision }) });
    expect((await patch(["first"])).status).toBe(200);
    expect((await patch(["second"])).status).toBe(409);
    expect((await patch(["first"])).status).toBe(200);
    const fresh = await snapshot();
    expect(fresh.notes).toEqual(["first"]);
    expect((await fetch(`${base}/api/trips/${id}/preferences`, { method: "PATCH", headers, body: JSON.stringify({ notes: [], expectedRevision: fresh.revision }) })).status).toBe(200);
    expect((await snapshot()).notes).toEqual([]);
  });
  it.each(["GET", "PATCH"])("requires authentication for %s", async (method) => {
    expect((await fetch(`${base}/api/trips/${id}/preferences`, { method })).status).toBe(401);
  });
  it.each(["GET", "PATCH"])("does not disclose another owner's trip for %s", async (method) => {
    const current = await snapshot();
    const response = await fetch(`${base}/api/trips/${id}/preferences`, { method, headers: { ...headers, Authorization: "Bearer other" }, ...(method === "PATCH" ? { body: JSON.stringify({ notes: [], expectedRevision: current.revision }) } : {}) });
    expect(response.status).toBe(404);
    expect((await snapshot()).notes).toEqual(["museums"]);
  });
  it.each(["0", "bad", "1.5", "-1"])("rejects invalid ID %s", async (value) => {
    expect((await fetch(`${base}/api/trips/${value}/preferences`, { headers })).status).toBe(400);
  });
  it.each([{ notes: [""], expectedRevision: "a".repeat(64) }, { notes: [], expectedRevision: "a".repeat(64), userId: "other" }, { notes: [], expectedRevision: "old" }])("rejects invalid writes %#", async (body) => {
    expect((await fetch(`${base}/api/trips/${id}/preferences`, { method: "PATCH", headers, body: JSON.stringify(body) })).status).toBe(400);
  });
  it("sanitizes storage errors", async () => {
    vi.spyOn(storage, "getTripForUser").mockRejectedValueOnce(new Error("private storage detail"));
    const response = await fetch(`${base}/api/trips/${id}/preferences`, { headers });
    expect(response.status).toBe(500); expect(await response.json()).toEqual({ message: "Server error" });
  });
});
