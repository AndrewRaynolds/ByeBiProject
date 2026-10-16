import type { Trip } from "@shared/schema";
import { budgetAllocationSchema, emptyBudgetAllocations } from "@shared/budgetAllocationSchemas";
import { programDraftSchema } from "@shared/programSchemas";
import { emptyTripPlanning, planningFitsTrip, tripPlanningSchema } from "@shared/tripPlanningSchemas";
import { programStorageKey, budgetAllocationStorageKey } from "./planningDraftKeys";

/** No writes/removals. Matching context permits preview, never proves trip identity. */
export function previewLocalTripPlanning(storage: Pick<Storage, "getItem">, trip: Trip) {
  const brand = trip.experienceType === "bachelorette" ? "byebride" : "byebro";
  const programRaw = storage.getItem(programStorageKey(brand));
  const budgetRaw = storage.getItem(budgetAllocationStorageKey(brand));
  if (!programRaw && !budgetRaw) throw new Error("No local draft");
  const program = programRaw ? programDraftSchema.parse(JSON.parse(programRaw)) : null;
  const budget = budgetRaw ? budgetAllocationSchema.parse(JSON.parse(budgetRaw)) : null;
  const normalize = (v: string) => v.trim().toLocaleLowerCase("en");
  for (const draft of [program, budget]) {
    if (!draft) continue;
    if (draft.sourcePlanner.brand !== brand ||
      normalize(draft.basis.origin) !== normalize(trip.departureCity) ||
      trip.destinations?.length !== 1 || normalize(draft.basis.destination) !== normalize(trip.destinations[0]) ||
      draft.basis.startDate !== trip.startDate || draft.basis.endDate !== trip.endDate ||
      draft.basis.participants !== trip.participants) throw new Error("Different context");
  }
  if (budget && budget.basis.budgetPerPerson !== trip.budget) throw new Error("Different budget");
  if (budget && program && budget.sourcePlanner.createdAt !== program.sourcePlanner.createdAt) throw new Error("Ambiguous drafts");
  const plan = tripPlanningSchema.parse({ ...emptyTripPlanning(trip),
    allocations: budget?.allocations ?? emptyBudgetAllocations(), plannedItems: program?.plannedItems ?? [] });
  if (!planningFitsTrip(plan, trip)) throw new Error("Different dates");
  return plan;
}
