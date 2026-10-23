import express from "express";
import type { AddressInfo } from "node:net";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { MemStorage } from "./storage";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), store: null as unknown, propose: vi.fn() }));
vi.mock("./storage", async original => ({ ...await original<typeof import("./storage")>(), get storage() { return mocks.store; } }));
vi.mock("./supabase", () => ({ supabase: { auth: { getUser: mocks.getUser } } }));
vi.mock("./zapier-integration", () => ({ registerZapierRoutes: vi.fn() }));
vi.mock("./services/aiProgram", () => ({ proposeAiProgram: mocks.propose }));
describe("owner-only transient AI program API", () => {
  let server: Awaited<ReturnType<typeof import("./routes").registerRoutes>>, url: string, store: MemStorage, id: number, body: any;
  const headers = { Authorization: "Bearer owner", "Content-Type": "application/json" };
  const proposal = { version: 1, items: [{ catalogId: "free_time", date: "2099-10-10", slot: "morning" }] };
  beforeEach(async () => {
    mocks.propose.mockReset(); mocks.propose.mockResolvedValue(proposal);
    mocks.getUser.mockImplementation(async token => ({ data: { user: token === "invalid" ? null : { id: token } }, error: null }));
    store = new MemStorage(); mocks.store = store;
    id = (await store.createTrip({ userId: "owner", name: "Trip", participants: 4, startDate: "2099-10-10", endDate: "2099-10-13", departureCity: "Rome", destinations: ["Lisbon"], experienceType: "bachelor", budget: null })).id;
    const snapshot = (await store.getTripPlanningForUser(id, "owner"))!;
    body = { locale: "it", expectedRevision: snapshot.revision, expectedContextRevision: snapshot.contextRevision, plan: snapshot.plan };
    const app = express(); app.use(express.json()); const { registerRoutes } = await import("./routes");
    server = await registerRoutes(app); await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/trips/${id}/planning/proposal`;
  });
  afterEach(async () => { if (server?.listening) await new Promise<void>(resolve => server.close(() => resolve())); });
  const request = (patch = body, auth = "Bearer owner") => fetch(url, { method: "POST", headers: { ...headers, Authorization: auth }, body: JSON.stringify(patch) });
  it("requires authentication and ownership before calling AI", async () => {
    expect((await request(body, "")).status).toBe(401);
    expect((await request(body, "Bearer invalid")).status).toBe(401);
    expect((await request(body, "Bearer other")).status).toBe(404);
    expect(mocks.propose).not.toHaveBeenCalled();
  });
  it("validates contracts and stale revisions before calling AI", async () => {
    expect((await request({ ...body, userId: "other" })).status).toBe(400);
    expect((await request({ ...body, expectedRevision: 9 })).status).toBe(409);
    expect((await request({ ...body, locale: "fr" })).status).toBe(400);
    expect(mocks.propose).not.toHaveBeenCalled();
  });
  it("returns a proposal with no write, including when there are unsaved local changes", async () => {
    body.plan.budgetPerPerson = 800;
    const response = await request(); expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store"); expect(await response.json()).toEqual(proposal);
    const saved = await store.getTripPlanningForUser(id, "owner"); expect(saved).toMatchObject({ revision: 0, plan: { budgetPerPerson: null, plannedItems: [] } });
  });
  it("rejects occupied slots without removing existing activities", async () => {
    body.plan.plannedItems = [{ id: "kept", ideaId: null, title: "Keep me", date: "2099-10-10", slot: "morning", durationMinutes: null, provenance: { kind: "user" }, feasibility: "not_checked", userEdited: true }];
    expect((await request()).status).toBe(503);
    expect(body.plan.plannedItems[0].title).toBe("Keep me");
  });
  it("rechecks revisions after an intervening save", async () => {
    mocks.propose.mockImplementationOnce(async () => { await store.updateTripPlanningForUser(id, "owner", { expectedRevision: body.expectedRevision, expectedContextRevision: body.expectedContextRevision, plan: body.plan }); return proposal; });
    expect((await request()).status).toBe(409);
    expect((await store.getTripPlanningForUser(id, "owner"))?.revision).toBe(1);
  });
  it("sanitizes provider failures and offers no substitute data", async () => {
    mocks.propose.mockRejectedValueOnce(new Error("secret provider payload"));
    const response = await request(); expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret");
    expect((await store.getTripPlanningForUser(id, "owner"))?.revision).toBe(0);
  });
  it("returns 422 without calling OpenAI when every date and slot is occupied", async () => {
    body.plan.plannedItems = ["10", "11", "12", "13"].flatMap(day => ["morning", "afternoon", "evening"].map(slot => ({
      id: `occupied-${day}-${slot}`, ideaId: null, title: "Already planned", date: `2099-10-${day}`,
      slot, durationMinutes: null, provenance: { kind: "user" }, feasibility: "not_checked", userEdited: true,
    })));
    const response = await request();
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "NO_FREE_SLOTS" });
    expect(mocks.propose).not.toHaveBeenCalled();
    expect((await store.getTripPlanningForUser(id, "owner"))?.revision).toBe(0);
  });
  it("limits repeated AI requests", async () => {
    for (let i = 0; i < 5; i++) expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(429); expect(mocks.propose).toHaveBeenCalledTimes(5);
  });
  it("discards an in-flight proposal after ownership is lost", async () => {
    mocks.propose.mockImplementationOnce(async () => {
      vi.spyOn(store, "getTripPlanningForUser").mockResolvedValueOnce(undefined); return proposal;
    });
    expect((await request()).status).toBe(404);
  });

});
