import { z } from "zod";
import { budgetAllocationsSchema, emptyBudgetAllocations } from "./budgetAllocationSchemas";
import { programItemSchema } from "./programSchemas";
import type { Trip } from "./schema";

/** Saved Trip planning is independent of the browser Planner's identity and lifetime. */
export const tripPlanningSchema = z.object({
  version: z.literal(1),
  budgetPerPerson: z.number().int().min(1).max(100_000).nullable(),
  allocations: budgetAllocationsSchema,
  plannedItems: z.array(programItemSchema).max(100),
}).strict().superRefine((plan, ctx) => {
  const ids = new Set<string>(); const positions = new Set<string>();
  plan.plannedItems.forEach((item, i) => {
    const position = `${item.date}:${item.slot}`;
    if (ids.has(item.id) || positions.has(position)) ctx.addIssue({ code: "custom", path: ["plannedItems", i], message: "Duplicate item or occupied slot" });
    ids.add(item.id); positions.add(position);
  });
});
export const tripPlanningSnapshotSchema = z.object({
  revision: z.number().int().min(0).max(2_147_483_646),
  contextRevision: z.string().regex(/^[a-f0-9]{64}$/),
  plan: tripPlanningSchema,
}).strict();
export const tripPlanningUpdateSchema = z.object({
  expectedRevision: z.number().int().min(0).max(2_147_483_645),
  expectedContextRevision: z.string().regex(/^[a-f0-9]{64}$/),
  plan: tripPlanningSchema,
}).strict();
export type TripPlanning = z.infer<typeof tripPlanningSchema>;
export type TripPlanningSnapshot = z.infer<typeof tripPlanningSnapshotSchema>;
export type TripPlanningUpdate = z.infer<typeof tripPlanningUpdateSchema>;
export type TripPlanningResult = { status: "not_found" } | { status: "conflict" } | { status: "invalid" } | { status: "updated"; snapshot: TripPlanningSnapshot };
export const emptyTripPlanning = (trip: Pick<Trip, "budget">): TripPlanning => ({
  version: 1, budgetPerPerson: trip.budget, allocations: emptyBudgetAllocations(), plannedItems: [],
});
export function planningFitsTrip(plan: TripPlanning, trip: Pick<Trip, "startDate" | "endDate">) {
  return plan.plannedItems.every((item) => item.date >= trip.startDate && item.date <= trip.endDate);
}
