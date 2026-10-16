import { z } from "zod";
import { plannerBrandSchema, plannerReviewSchema, type PlannerDraft } from "./plannerSchemas";
import { normalizeTripDate } from "./dateUtils";

export const budgetAllocationCategories = ["main_transport", "accommodation", "local_transport", "food", "activities", "buffer"] as const;
const amountSchema = z.number().int().min(0).max(100_000).nullable();
export const budgetAllocationsSchema = z.object({
  main_transport: amountSchema, accommodation: amountSchema, local_transport: amountSchema,
  food: amountSchema, activities: amountSchema, buffer: amountSchema,
}).strict();
const capSchema = z.number().int().min(1).max(100_000).nullable();
const participantsSchema = z.number().int().min(1).max(50);
const dateSchema = z.string().length(10).refine((value) => normalizeTripDate(value) === value);
export const budgetAllocationSchema = z.object({
  version: z.literal(1), kind: z.literal("budget_allocation"), currency: z.literal("EUR"),
  scope: z.literal("per_person_whole_trip"), source: z.literal("user_input"),
  sourcePlanner: z.object({ brand: plannerBrandSchema, createdAt: z.string().datetime() }).strict(),
  basis: z.object({ budgetPerPerson: capSchema, participants: participantsSchema,
    origin: z.string().trim().min(1).max(100), destination: z.string().trim().min(1).max(100),
    startDate: dateSchema, endDate: dateSchema,
  }).strict().refine((basis) => basis.endDate >= basis.startDate),
  revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), allocations: budgetAllocationsSchema,
}).strict();
export type BudgetAllocations = z.infer<typeof budgetAllocationsSchema>;
export type BudgetAllocation = z.infer<typeof budgetAllocationSchema>;
export const emptyBudgetAllocations = (): BudgetAllocations => ({ main_transport: null, accommodation: null, local_transport: null, food: null, activities: null, buffer: null });

function basisFor(planner: PlannerDraft) {
  return { budgetPerPerson: planner.budgetPerPerson, participants: planner.participants!,
    origin: planner.origin!.canonical, destination: planner.destination!.canonical,
    startDate: planner.startDate!, endDate: planner.endDate! };
}
export function budgetAllocationNeedsReview(raw: unknown, rawPlanner: unknown): boolean {
  const allocation = budgetAllocationSchema.parse(raw); const planner = plannerReviewSchema.parse(rawPlanner);
  return allocation.sourcePlanner.brand !== planner.brand || allocation.sourcePlanner.createdAt !== planner.createdAt ||
    JSON.stringify(allocation.basis) !== JSON.stringify(basisFor(planner));
}

/** Explicitly acknowledged user allocations; never estimates or an update to Planner intent. */
export function createBudgetAllocation(rawPlanner: unknown, amounts: unknown, previous?: unknown): BudgetAllocation {
  const planner = plannerReviewSchema.parse(rawPlanner);
  const old = previous === undefined ? undefined : budgetAllocationSchema.parse(previous);
  if (old && (old.sourcePlanner.brand !== planner.brand || old.sourcePlanner.createdAt !== planner.createdAt)) throw new Error("Different planner");
  if (old?.revision === Number.MAX_SAFE_INTEGER) throw new Error("Revision exhausted");
  return budgetAllocationSchema.parse({ version: 1, kind: "budget_allocation", currency: "EUR", scope: "per_person_whole_trip", source: "user_input",
    sourcePlanner: { brand: planner.brand, createdAt: planner.createdAt }, basis: basisFor(planner),
    revision: old ? old.revision + 1 : 1, allocations: budgetAllocationsSchema.parse(amounts) });
}

export function summarizeBudgetAllocations(amounts: unknown, rawCap: unknown, rawParticipants: unknown) {
  const allocations = budgetAllocationsSchema.parse(amounts); const cap = capSchema.parse(rawCap); const participants = participantsSchema.parse(rawParticipants);
  const allocatedPerPerson = budgetAllocationCategories.reduce((sum, key) => sum + (allocations[key] ?? 0), 0);
  return { allocatedPerPerson, incomplete: budgetAllocationCategories.some((key) => allocations[key] === null),
    unallocatedPerPerson: cap === null ? null : Math.max(cap - allocatedPerPerson, 0),
    overallocatedPerPerson: cap === null ? null : Math.max(allocatedPerPerson - cap, 0),
    derivedGroupCap: cap === null ? null : cap * participants };
}
