import { z } from "zod";
import { programIdeaCatalogIds, programSlotSchema } from "./programSchemas";
import { planningFitsTrip, tripPlanningSchema, tripPlanningUpdateSchema, type TripPlanning } from "./tripPlanningSchemas";

/** Transient proposal: never part of persisted planning until explicit acceptance and save. */
export const aiProgramItemsSchema = z.array(z.object({
  catalogId: z.enum(programIdeaCatalogIds), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), slot: programSlotSchema,
}).strict()).min(1).max(12);
export const aiProgramRequestSchema = tripPlanningUpdateSchema.extend({ locale: z.enum(["it", "en", "es"]) }).strict();
export const aiProgramProposalSchema = z.object({ version: z.literal(1), items: aiProgramItemsSchema }).strict();
export type AiProgramProposal = z.infer<typeof aiProgramProposalSchema>;

/** Atomic append: occupied positions/IDs or stale context reject the entire proposal. */
export function appendAiProgramProposal(rawPlan: unknown, rawProposal: unknown, trip: { startDate: string; endDate: string }, titleFor: (id: typeof programIdeaCatalogIds[number]) => string, idFor: () => string): TripPlanning {
  const plan = tripPlanningSchema.parse(rawPlan); const proposal = aiProgramProposalSchema.parse(rawProposal);
  const next = tripPlanningSchema.parse({ ...plan, plannedItems: [...plan.plannedItems, ...proposal.items.map(item => ({
    id: idFor(), ideaId: item.catalogId, title: titleFor(item.catalogId), date: item.date, slot: item.slot,
    durationMinutes: null, provenance: { kind: "editorial", catalogVersion: 1, catalogId: item.catalogId },
    feasibility: "not_checked", userEdited: false,
  }))] });
  if (!planningFitsTrip(next, trip)) throw new Error("Proposal outside trip dates");
  return next;
}

/** Reject a full calendar before calling AI. Saved planning permits at most 100 activities. */
export function hasFreeAiProgramSlot(plan: Pick<TripPlanning, "plannedItems">, trip: { startDate: string; endDate: string }): boolean {
  const start = Date.parse(`${trip.startDate}T00:00:00Z`);
  const end = Date.parse(`${trip.endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
  const days = Math.floor((end - start) / 86_400_000) + 1;
  // An invalid/out-of-range local plan is separately rejected by the endpoint.
  return days * 3 > plan.plannedItems.length;
}
