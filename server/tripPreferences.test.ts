import { describe, expect, it, vi } from "vitest";
import { MemStorage, DatabaseStorage } from "./storage";
import { tripPreferencesSnapshot } from "./tripPreferences";
import { preferenceNotesEqual, tripPreferencesPatchSchema } from "@shared/tripPreferencesSchemas";
import { PgDialect } from "drizzle-orm/pg-core";

const payload = { userId: "owner", name: "Fixture", participants: 6, startDate: "2099-10-10", endDate: "2099-10-13", departureCity: "Rome", destinations: ["Lisbon"], experienceType: "bachelor", budget: 700, activities: ["museums"] };

describe("preference write contract", () => {
  const revision = "a".repeat(64);
  it.each([{ notes: [""], expectedRevision: revision }, { notes: ["x".repeat(101)], expectedRevision: revision }, { notes: Array(21).fill("x"), expectedRevision: revision }, { notes: [], expectedRevision: "old" }, { notes: [], expectedRevision: revision, userId: "other" }, { notes: [], expectedRevision: revision, budget: 1 }])("rejects invalid or unrelated writes %#", (input) => {
    expect(tripPreferencesPatchSchema.safeParse(input).success).toBe(false);
  });
  it("trims new notes but preserves comparison order, case and language", () => {
    expect(tripPreferencesPatchSchema.parse({ notes: ["  museums  "], expectedRevision: revision }).notes).toEqual(["museums"]);
    expect(preferenceNotesEqual(null, [])).toBe(true);
    expect(preferenceNotesEqual([" a ", "b"], ["a", "b"])).toBe(true);
    expect(preferenceNotesEqual(["a", "b"], ["b", "a"])).toBe(false);
    expect(preferenceNotesEqual(["Museums"], ["museums"])).toBe(false);
  });
});

describe("owner-scoped atomic preference edits in memory", () => {
  it("updates only preferences, keeps the ID and deduplication, and supports removal", async () => {
    const store = new MemStorage(); const trip = await store.createTrip(payload);
    const first = await store.updateTripPreferencesForUser(trip.id, "owner", { notes: ["team games"], expectedRevision: tripPreferencesSnapshot(trip).revision });
    expect(first.status).toBe("updated");
    const updated = (await store.getTripForUser(trip.id, "owner"))!;
    expect(updated).toEqual({ ...trip, activities: ["team games"] });
    const duplicate = await store.createTripIfAbsent(payload);
    expect(duplicate).toMatchObject({ created: false, trip: { id: trip.id, activities: ["team games"] } });
    expect((await store.getTripsByUserId("owner"))).toHaveLength(1);
    await store.updateTripPreferencesForUser(trip.id, "owner", { notes: [], expectedRevision: tripPreferencesSnapshot(updated).revision });
    expect((await store.getTrip(trip.id))?.activities).toEqual([]);
  });
  it("does not overwrite a concurrent change, but makes a repeated applied write idempotent", async () => {
    const store = new MemStorage(); const trip = await store.createTrip(payload);
    const revision = tripPreferencesSnapshot(trip).revision;
    const [first, second] = await Promise.all([
      store.updateTripPreferencesForUser(trip.id, "owner", { notes: ["first"], expectedRevision: revision }),
      store.updateTripPreferencesForUser(trip.id, "owner", { notes: ["second"], expectedRevision: revision }),
    ]);
    expect(first.status).toBe("updated"); expect(second.status).toBe("conflict");
    const retry = await store.updateTripPreferencesForUser(trip.id, "owner", { notes: ["first"], expectedRevision: revision });
    expect(retry.status).toBe("updated");
    expect((await store.getTrip(trip.id))?.activities).toEqual(["first"]);
  });
  it("preserves historical notes on read and isolates owner, missing IDs and revisions", async () => {
    const store = new MemStorage(); const trip = await store.createTrip({ ...payload, activities: ["x".repeat(180)] });
    const revision = tripPreferencesSnapshot(trip).revision;
    expect(tripPreferencesSnapshot(trip).notes).toEqual(["x".repeat(180)]);
    expect(await store.updateTripPreferencesForUser(trip.id, "other", { notes: [], expectedRevision: revision })).toEqual({ status: "not_found" });
    expect(await store.updateTripPreferencesForUser(99999, "owner", { notes: [], expectedRevision: revision })).toEqual({ status: "not_found" });
    expect(tripPreferencesSnapshot({ ...trip, id: trip.id + 1 }).revision).not.toBe(revision);
    expect((await store.getTrip(trip.id))?.activities).toEqual(trip.activities);
  });
  it("accepts null legacy notes without rewriting them until explicitly removed", async () => {
    const store = new MemStorage(); const trip = await store.createTrip({ ...payload, activities: null });
    expect(tripPreferencesSnapshot(trip).notes).toBeNull();
    await store.updateTripPreferencesForUser(trip.id, "owner", { notes: [], expectedRevision: tripPreferencesSnapshot(trip).revision });
    expect((await store.getTrip(trip.id))?.activities).toEqual([]);
  });
});

describe("PostgreSQL adapter transaction contract (simulated connection)", () => {
  it.each(["updated", "conflict", "not_found"] as const)("locks the owner row and performs only the permitted write: %s", async (outcome) => {
    const events: string[] = []; const filters: unknown[] = [];
    const trip = { ...payload, id: 7, specialRequests: null, includeMerch: false, createdAt: new Date() };
    const returning = vi.fn(async () => { events.push("write"); return [{ ...trip, activities: ["new"] }]; });
    const set = vi.fn(() => ({ where: (filter: unknown) => { filters.push(filter); return { returning }; } }));
    const transaction = {
      select: () => ({ from: () => ({ where: (filter: unknown) => { filters.push(filter); return { limit: () => ({ for: async (lock: string) => { events.push(lock); return outcome === "not_found" ? [] : [trip]; } }) }; } }) }),
      update: () => ({ set }),
    };
    const connection = { db: { transaction: async (fn: (tx: typeof transaction) => unknown) => { events.push("begin"); const result = await fn(transaction); events.push("commit"); return result; } }, close: vi.fn() };
    const store = new DatabaseStorage(connection as never);
    const result = await store.updateTripPreferencesForUser(7, "owner", { notes: ["new"], expectedRevision: outcome === "conflict" ? "0".repeat(64) : tripPreferencesSnapshot(trip).revision });
    expect(result.status).toBe(outcome);
    expect(events).toEqual(outcome === "updated" ? ["begin", "update", "write", "commit"] : ["begin", "update", "commit"]);
    const dialect = new PgDialect();
    for (const filter of filters) {
      const query = dialect.sqlToQuery(filter as never);
      expect(query.params).toEqual([7, "owner"]);
      expect(query.sql).toContain('"id"'); expect(query.sql).toContain('"user_id"');
    }
    if (outcome === "updated") expect(set).toHaveBeenCalledWith({ activities: ["new"] });
    else expect(set).not.toHaveBeenCalled();
  });
});
