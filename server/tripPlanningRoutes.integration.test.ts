import express from "express";
import type { AddressInfo } from "node:net";
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { MemStorage } from "./storage";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), store: null as unknown }));
vi.mock("./storage", async (original) => {
  const module = await original<typeof import("./storage")>();
  return { ...module, get storage() { return mocks.store; } };
});
vi.mock("./supabase", () => ({ supabase: { auth: { getUser: mocks.getUser } } }));
vi.mock("./zapier-integration", () => ({ registerZapierRoutes: vi.fn() }));
describe("Saved Trip planning API with real memory storage", () => {
  let server: Awaited<ReturnType<typeof import("./routes").registerRoutes>>, url: string, store: MemStorage, id: number;
  const headers = { Authorization: "Bearer owner", "Content-Type": "application/json" };
  beforeAll(async () => {
    const app = express(); app.use(express.json()); const { registerRoutes } = await import("./routes");
    server = await registerRoutes(app); await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    mocks.getUser.mockImplementation(async (token: string) => ({ data: { user: token === "invalid" ? null : { id: token } }, error: null }));
    store = new MemStorage(); mocks.store = store;
    id = (await store.createTrip({ userId: "owner", name: "Trip", participants: 4, startDate: "2099-10-10", endDate: "2099-10-13", departureCity: "Rome", destinations: ["Lisbon"], experienceType: "bachelor", budget: null })).id;
  });
  afterAll(async () => { await new Promise<void>((r) => server.close(() => r())); });
  const endpoint = () => `${url}/api/trips/${id}/planning`;
  it.each(["GET", "PUT"])("requires a valid bearer session for %s", async (method) => {
    for (const auth of [undefined, "Bearer invalid"]) {
      const res = await fetch(endpoint(), { method, headers: auth ? { Authorization: auth } : {} });
      expect(res.status).toBe(401);
    }
  });
  it("isolates owners, persists across independent GETs, rejects stale writes and validates input", async () => {
    const res = await fetch(endpoint(), { headers }); const base = await res.json();
    expect(res.headers.get("cache-control")).toBe("no-store"); expect(base.revision).toBe(0);
    const patch = { expectedRevision: 0, expectedContextRevision: base.contextRevision, plan: { ...base.plan, budgetPerPerson: 500 } };
    expect((await fetch(endpoint(), { headers: { Authorization: "Bearer other" } })).status).toBe(404);
    expect((await fetch(endpoint(), { method: "PUT", headers: { ...headers, Authorization: "Bearer other" }, body: JSON.stringify(patch) })).status).toBe(404);
    const saved = await fetch(endpoint(), { method: "PUT", headers, body: JSON.stringify(patch) }); expect(saved.status).toBe(200);
    const deviceB = await (await fetch(endpoint(), { headers })).json(); expect(deviceB).toMatchObject({ revision: 1, plan: { budgetPerPerson: 500 } });
    expect((await fetch(endpoint(), { method: "PUT", headers, body: JSON.stringify(patch) })).status).toBe(409);
    expect((await fetch(endpoint(), { method: "PUT", headers, body: JSON.stringify({ ...patch, userId: "other" }) })).status).toBe(400);
    expect((await fetch(`${url}/api/trips/no/planning`, { headers })).status).toBe(400);
  });
  it("returns sanitized failure without leaking internals", async () => {
    vi.spyOn(store, "getTripPlanningForUser").mockRejectedValueOnce(new Error("secret connection"));
    const res = await fetch(endpoint(), { headers }); expect(res.status).toBe(500); expect(await res.text()).not.toContain("secret");
  });
});
