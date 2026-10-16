import { z } from "zod";
import { plannerBrandSchema, type PlannerDraft } from "./plannerSchemas";
import { getCityDefinition } from "./cityMapping";

// Editorial inspiration only. No inventory, prices, provider links or inferred preferences.
export const destinationIdeaIds = ["barcelona", "budapest", "lisbon", "prague", "rome", "amsterdam"] as const;
export const destinationIdeaIdSchema = z.enum(destinationIdeaIds);
export type DestinationIdeaId = z.infer<typeof destinationIdeaIdSchema>;

export const plannerActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("suggest_destinations"), seenIds: z.array(destinationIdeaIdSchema).max(destinationIdeaIds.length) }).strict(),
  z.object({ type: z.literal("choose_destination"), destinationId: destinationIdeaIdSchema }).strict(),
]);
export type PlannerAction = z.infer<typeof plannerActionSchema>;

export const plannerSuggestionsSchema = z.object({
  version: z.literal(1),
  brand: plannerBrandSchema,
  plannerCreatedAt: z.string().datetime(),
  plannerUpdatedAt: z.string().datetime(),
  destinationIds: z.array(destinationIdeaIdSchema).max(2).refine((ids) => new Set(ids).size === ids.length),
}).strict();
export type PlannerSuggestions = z.infer<typeof plannerSuggestionsSchema>;

export function suggestionsMatchPlanner(suggestions: PlannerSuggestions, planner: PlannerDraft): boolean {
  return planner.status === "draft" && planner.destination === null &&
    suggestions.brand === planner.brand && suggestions.plannerCreatedAt === planner.createdAt &&
    suggestions.plannerUpdatedAt === planner.updatedAt &&
    !suggestions.destinationIds.some((id) => id === getCityDefinition(planner.origin?.canonical)?.key);
}
