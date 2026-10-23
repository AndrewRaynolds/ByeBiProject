import { describe, expect, it } from "vitest";
import { aiProgramProposalSchema, appendAiProgramProposal, hasFreeAiProgramSlot } from "./aiProgramSchemas";
import { emptyTripPlanning } from "./tripPlanningSchemas";
const trip = { startDate: "2099-10-10", endDate: "2099-10-13", budget: 500 };
const proposal = { version: 1, items: [{ catalogId: "food_break", date: trip.startDate, slot: "evening" }] };
const append = (plan: unknown, draft: unknown = proposal) => appendAiProgramProposal(plan, draft, trip, id => id, () => "new-id");
describe("AI program proposals", () => {
  it("appends atomically, keeps budget and existing items, leaves source untouched", () => {
    const original = append(emptyTripPlanning(trip));
    const before = JSON.stringify(original);
    const next = appendAiProgramProposal(original, { version: 1, items: [{ catalogId: "free_time", date: trip.endDate, slot: "morning" }] }, trip, id => id, () => "second-id");
    expect(JSON.stringify(original)).toBe(before); expect(next.plannedItems[0]).toEqual(original.plannedItems[0]);
    expect(next.budgetPerPerson).toBe(500); expect(next.plannedItems[1]).toMatchObject({ durationMinutes: null, feasibility: "not_checked", provenance: { kind: "editorial" } });
  });
  it("rejects conflicts, duplicate IDs, invalid calendar dates, out-of-range days and too many ideas", () => {
    expect(() => append(append(emptyTripPlanning(trip)))).toThrow();
    for (const date of ["2099-02-30", "2099-10-14", "2099-10-09"]) expect(() => append(emptyTripPlanning(trip), { ...proposal, items: [{ ...proposal.items[0], date }] })).toThrow();
    expect(() => append(emptyTripPlanning(trip), { ...proposal, items: [proposal.items[0], { ...proposal.items[0], slot: "morning" }] })).toThrow();
    expect(aiProgramProposalSchema.safeParse({ ...proposal, items: Array(13).fill(proposal.items[0]) }).success).toBe(false);
  });
  it("rejects invented titles, prices, duration, URLs, unknown catalogs, empty and unknown versions", () => {
    for (const extra of [{ price: 10 }, { title: "Booked hotel" }, { durationMinutes: 60 }, { url: "https://example.com" }, { catalogId: "hotel" }]) {
      expect(aiProgramProposalSchema.safeParse({ ...proposal, items: [{ ...proposal.items[0], ...extra }] }).success).toBe(false);
    }
    expect(aiProgramProposalSchema.safeParse({ version: 2, items: proposal.items }).success).toBe(false);
    expect(aiProgramProposalSchema.safeParse({ version: 1, items: [] }).success).toBe(false);
  });
  it("detects a fully occupied trip without making any proposal", () => {
    const plan = emptyTripPlanning(trip);
    expect(hasFreeAiProgramSlot(plan, trip)).toBe(true);
    plan.plannedItems = ["10", "11", "12", "13"].flatMap((day) => ["morning", "afternoon", "evening"].map((slot) => ({
      id: `activity-${day}-${slot}`, ideaId: null, title: "Existing activity", date: `2099-10-${day}`,
      slot: slot as "morning" | "afternoon" | "evening", durationMinutes: null,
      provenance: { kind: "user" as const }, feasibility: "not_checked" as const, userEdited: true,
    })));
    expect(hasFreeAiProgramSlot(plan, trip)).toBe(false);
    expect(hasFreeAiProgramSlot(plan, { startDate: "2099-10-13", endDate: "2099-10-12" })).toBe(false);
    plan.plannedItems.pop();
    expect(hasFreeAiProgramSlot(plan, trip)).toBe(true);
  });
});
