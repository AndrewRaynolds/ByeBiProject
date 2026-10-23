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

// Exact, explicit multilingual interest labels only. Unknown/negated prose stays neutral.
const interestLabels = {
  culture: ["culture", "cultura", "arte", "art", "history", "storia", "historia", "museums", "musei", "museos"],
  food: ["food", "cibo", "cucina", "gastronomia", "gastronomía", "comida", "cuisine"],
  relax: ["relax", "relaxation", "spa", "terme", "termas", "benessere", "wellness"],
  sea: ["sea", "mare", "mar", "beach", "spiaggia", "playa"],
  nightlife: ["nightlife", "vita notturna", "vida nocturna", "party", "festa", "fiesta"],
} as const;
export type DestinationInterest = keyof typeof interestLabels;
const destinationInterests: Record<DestinationIdeaId, readonly DestinationInterest[]> = {
  barcelona: ["sea", "nightlife", "culture"], budapest: ["relax", "nightlife"],
  lisbon: ["food", "nightlife"], prague: ["culture", "nightlife"],
  rome: ["culture", "food"], amsterdam: ["culture"],
};
export function matchingDestinationInterests(id: DestinationIdeaId, planner: PlannerDraft): DestinationInterest[] {
  const explicit = (planner.preferences?.interests ?? []).map(value => value.toLocaleLowerCase().trim());
  return destinationInterests[id].filter(topic => interestLabels[topic].some(label => explicit.includes(label)));
}
export function rankDestinationIdeas(planner: PlannerDraft): DestinationIdeaId[] {
  return [...destinationIdeaIds].sort((a, b) => matchingDestinationInterests(b, planner).length - matchingDestinationInterests(a, planner).length);
}
