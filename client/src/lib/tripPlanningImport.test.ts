import { describe, it, expect } from "vitest";
import { previewLocalTripPlanning } from "./tripPlanningImport";
import { programStorageKey, budgetAllocationStorageKey } from "./planningDraftKeys";
import type { Trip } from "@shared/schema";
const trip: Trip = { id: 1, userId: "owner", name: "Trip", departureCity: "Rome", destinations: ["Lisbon"], participants: 6, startDate: "2025-10-10", endDate: "2025-10-13", budget: 700, experienceType: "bachelor", activities: null, specialRequests: null, includeMerch: false, createdAt: null };
const basis = { origin: "Rome", destination: "Lisbon", participants: 6, startDate: trip.startDate, endDate: trip.endDate };
const sourcePlanner = { brand: "byebro", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" };
const program = { version: 1, kind: "editorial_program", sourcePlanner, basis, revision: 2, ideas: [], plannedItems: [{ id: "one", title: "Walk", ideaId: null, date: trip.startDate, slot: "morning", durationMinutes: null, provenance: { kind: "user" }, feasibility: "not_checked", userEdited: false }] };
const budget = { version: 1, kind: "budget_allocation", currency: "EUR", scope: "per_person_whole_trip", source: "user_input", sourcePlanner: { brand: sourcePlanner.brand, createdAt: sourcePlanner.createdAt }, basis: { ...basis, budgetPerPerson: 700 }, revision: 1,
  allocations: { main_transport: 0, accommodation: null, local_transport: null, food: 100, activities: null, buffer: null } };
const storageFor = (p: unknown = program, b: unknown = budget) => {
  const data = new Map([[programStorageKey("byebro"), JSON.stringify(p)], [budgetAllocationStorageKey("byebro"), JSON.stringify(b)]]);
  return { getItem: (key: string) => data.get(key) ?? null };
};
describe("explicit local planning preview", () => {
  it("converts matching old drafts without requiring future travel dates or writing storage", () => {
    const result = previewLocalTripPlanning(storageFor(), trip);
    expect(result.plannedItems[0].title).toBe("Walk"); expect(result.allocations.main_transport).toBe(0); expect(result.allocations.accommodation).toBeNull();
  });
  it.each([
    { ...program, basis: { ...basis, destination: "Madrid" } },
    { ...program, basis: { ...basis, participants: 7 } },
    { ...program, sourcePlanner: { ...sourcePlanner, createdAt: "2025-02-01T00:00:00.000Z" } },
    { ...program, version: 9 },
  ])("rejects mismatches and ambiguous drafts %#", (value) => {
    expect(() => previewLocalTripPlanning(storageFor(value), trip)).toThrow();
  });
  it("rejects missing, inaccessible and corrupt storage and changed budget", () => {
    expect(() => previewLocalTripPlanning({ getItem: () => null }, trip)).toThrow();
    expect(() => previewLocalTripPlanning({ getItem: () => "{" }, trip)).toThrow();
    expect(() => previewLocalTripPlanning({ getItem: () => { throw Error("disabled"); } }, trip)).toThrow();
    expect(() => previewLocalTripPlanning(storageFor(), { ...trip, budget: 800 })).toThrow();
    expect(() => previewLocalTripPlanning(storageFor(), { ...trip, destinations: ["Lisbon", "Madrid"] })).toThrow();
  });
});
