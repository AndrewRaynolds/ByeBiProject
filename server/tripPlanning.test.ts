import { describe, it, expect, vi } from "vitest";
import { MemStorage, DatabaseStorage, toPublicSharedTrip } from "./storage";
import { emptyTripPlanning, tripPlanningUpdateSchema } from "@shared/tripPlanningSchemas";
import { tripPlanningSnapshot } from "./tripPlanning";
import { PgDialect } from "drizzle-orm/pg-core";

export const payload = { userId: "owner", name: "Fixture", participants: 6, startDate: "2099-10-10", endDate: "2099-10-13", departureCity: "Rome", destinations: ["Lisbon"], experienceType: "bachelor", budget: 700, activities: ["museums"] };
const item = { id: "one", ideaId: null, title: "Walk", date: payload.startDate, slot: "morning" as const, durationMinutes: null, provenance: { kind: "user" as const }, feasibility: "not_checked" as const, userEdited: false };

describe("owner-scoped Saved Trip planning", () => {
  it("reads empty state without persistence, writes budget/program together, survives another client and clears with trip", async () => {
    const store = new MemStorage(); const trip = await store.createTrip(payload);
    const base = (await store.getTripPlanningForUser(trip.id, "owner"))!;
    expect(base).toMatchObject({ revision: 0, plan: { budgetPerPerson: 700, plannedItems: [] } });
    expect(await store.getTripPlanningForUser(trip.id, "other")).toBeUndefined();
    const patch = { expectedRevision: 0, expectedContextRevision: base.contextRevision, plan: { ...base.plan, budgetPerPerson: 800, plannedItems: [item] } };
    expect(await store.updateTripPlanningForUser(trip.id, "other", patch)).toEqual({ status: "not_found" });
    const result = await store.updateTripPlanningForUser(trip.id, "owner", patch);
    expect(result.status).toBe("updated");
    expect((await store.getTripForUser(trip.id, "owner"))!.budget).toBe(800);
    const deviceB = (await store.getTripPlanningForUser(trip.id, "owner"))!;
    expect(deviceB).toMatchObject({ revision: 1, plan: patch.plan });
    expect(deviceB.contextRevision).not.toBe(base.contextRevision);
    expect(await store.updateTripPlanningForUser(trip.id, "owner", patch)).toEqual({ status: "conflict" });
    expect(toPublicSharedTrip((await store.getTrip(trip.id))!)).not.toHaveProperty("budget");
    expect(toPublicSharedTrip((await store.getTrip(trip.id))!)).not.toHaveProperty("plannedItems");
    await store.deleteTripForUser(trip.id, "owner");
    expect(await store.getTripPlanningForUser(trip.id, "owner")).toBeUndefined();
  });
  it.each([0, 1])("accepts one writer and rejects the concurrent stale writer at revision %s", async (revision) => {
    const store = new MemStorage(); const trip = await store.createTrip(payload);
    let base = (await store.getTripPlanningForUser(trip.id, "owner"))!;
    if (revision === 1) {
      await store.updateTripPlanningForUser(trip.id, "owner", { expectedRevision: 0, expectedContextRevision: base.contextRevision, plan: base.plan });
      base = (await store.getTripPlanningForUser(trip.id, "owner"))!;
    }
    const results = await Promise.all([800, 900].map((cap) => store.updateTripPlanningForUser(trip.id, "owner", { expectedRevision: base.revision, expectedContextRevision: base.contextRevision, plan: { ...base.plan, budgetPerPerson: cap } })));
    expect(results.map((r) => r.status).sort()).toEqual(["conflict", "updated"]);
  });
  it("rejects mismatched trip context and out-of-range dates without changing budget", async () => {
    const store = new MemStorage(); const trip = await store.createTrip(payload); const base = (await store.getTripPlanningForUser(trip.id, "owner"))!;
    const patch = { expectedRevision: 0, expectedContextRevision: "0".repeat(64), plan: base.plan };
    expect(await store.updateTripPlanningForUser(trip.id, "owner", patch)).toEqual({ status: "conflict" });
    expect(await store.updateTripPlanningForUser(trip.id, "owner", { ...patch, expectedContextRevision: base.contextRevision, plan: { ...base.plan, budgetPerPerson: 900, plannedItems: [{ ...item, date: "2099-10-14" }] } })).toEqual({ status: "invalid" });
    expect(await store.getTripPlanningForUser(trip.id, "owner")).toEqual(base);
  });
  it("validates strict input, distinct zero/null, date/slot uniqueness, revisions, amounts and provenance", () => {
    const plan = emptyTripPlanning(payload); const patch = { expectedRevision: 0, expectedContextRevision: "a".repeat(64), plan };
    expect(tripPlanningUpdateSchema.safeParse(patch).success).toBe(true);
    const zero = { ...plan, allocations: { ...plan.allocations, food: 0 } };
    expect(tripPlanningUpdateSchema.parse({ ...patch, plan: zero }).plan.allocations.food).toBe(0);
    for (const invalid of [
      { ...patch, userId: "other" }, { ...patch, expectedRevision: -1 },
      { ...patch, plan: { ...plan, version: 2 } },
      { ...patch, plan: { ...plan, budgetPerPerson: 0 } },
      { ...patch, plan: { ...plan, allocations: { ...plan.allocations, food: 0.5 } } },
      { ...patch, plan: { ...plan, plannedItems: [item, { ...item, id: "two" }] } },
      { ...patch, plan: { ...plan, plannedItems: [{ ...item, feasibility: "confirmed" }] } },
    ]) expect(tripPlanningUpdateSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("database planning transaction boundary", () => {
  it.each(["updated", "conflict", "not_found", "invalid"])("locks owner before reading revision, then writes atomically: %s", async (outcome) => {
    const trip = { ...payload, id: 7, specialRequests: null, includeMerch: false, createdAt: new Date() };
    const events: string[] = []; const filters: unknown[] = [];
    const upsert = vi.fn(async () => { events.push("plan"); });
    const returning = vi.fn(async () => { events.push("budget"); return [{ ...trip, budget: 800 }]; });
    let selects = 0;
    const tx = {
      select: () => ({ from: () => ({ where: (f: unknown) => {
        filters.push(f); selects++;
        return selects === 1 ? { limit: () => ({ for: async (lock: string) => { events.push(lock); return outcome === "not_found" ? [] : [trip]; } }) } : Promise.resolve([]);
      } }) }),
      insert: () => ({ values: () => ({ onConflictDoUpdate: upsert }) }),
      update: () => ({ set: () => ({ where: (f: unknown) => { filters.push(f); return { returning }; } }) }),
    };
    const store = new DatabaseStorage({ db: { transaction: async (work: (tx: unknown) => unknown) => { events.push("begin"); const result = await work(tx); events.push("commit"); return result; } }, close: vi.fn() } as never);
    const base = tripPlanningSnapshot(trip);
    const result = await store.updateTripPlanningForUser(7, "owner", { expectedRevision: outcome === "conflict" ? 1 : 0, expectedContextRevision: base.contextRevision,
      plan: { ...base.plan, budgetPerPerson: 800, plannedItems: outcome === "invalid" ? [{ ...item, date: "2099-10-14" }] : [item] } });
    expect(result.status).toBe(outcome);
    expect(events).toEqual(outcome === "updated" ? ["begin", "update", "plan", "budget", "commit"] : ["begin", "update", "commit"]);
    const sql = new PgDialect().sqlToQuery(filters[0] as never);
    expect(sql.params).toEqual([7, "owner"]);
    expect(sql.sql).toContain('"user_id"');
    expect(upsert).toHaveBeenCalledTimes(outcome === "updated" ? 1 : 0);
  });
});
