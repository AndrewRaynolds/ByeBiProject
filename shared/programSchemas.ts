import { z } from "zod";
import { normalizeTripDate } from "./dateUtils";
import { plannerBrandSchema } from "./plannerSchemas";

export const PROGRAM_CONTRACT_VERSION = 1 as const;
export const programIdeaCatalogIds = ["neighborhood_walk", "team_game", "shared_moment", "food_break", "free_time"] as const;
const idSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const titleSchema = z.string().trim().min(1).max(200);
const dateSchema = z.string().length(10).refine((value) => normalizeTripDate(value) === value, "Invalid calendar date");
const durationSchema = z.number().int().min(1).max(720).nullable();
export const programSlotSchema = z.enum(["morning", "afternoon", "evening"]);
const catalogIdSchema = z.enum(programIdeaCatalogIds);
const editorialProvenanceSchema = z.object({
  kind: z.literal("editorial"), catalogVersion: z.literal(1), catalogId: catalogIdSchema,
}).strict();
const provenanceSchema = z.discriminatedUnion("kind", [editorialProvenanceSchema, z.object({ kind: z.literal("user") }).strict()]);

export const programIdeaSchema = z.object({
  id: idSchema, title: titleSchema, durationMinutes: durationSchema,
  provenance: editorialProvenanceSchema,
}).strict();
export const programItemSchema = z.object({
  id: idSchema, ideaId: idSchema.nullable(), title: titleSchema,
  date: dateSchema, slot: programSlotSchema, durationMinutes: durationSchema,
  provenance: provenanceSchema, feasibility: z.literal("not_checked"), userEdited: z.boolean(),
}).strict().superRefine((item, context) => {
  if (item.provenance.kind === "user" && item.ideaId !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["ideaId"], message: "Custom items cannot claim an editorial idea" });
  }
  if (item.provenance.kind === "editorial" && item.ideaId === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["ideaId"], message: "Editorial items retain their originating idea ID" });
  }
});

const programBasisSchema = z.object({
  origin: z.string().trim().min(1).max(100), destination: z.string().trim().min(1).max(100),
  startDate: dateSchema, endDate: dateSchema, participants: z.number().int().min(1).max(50),
}).strict().refine((basis) => basis.endDate >= basis.startDate, { path: ["endDate"], message: "Invalid trip range" });

export const programDraftSchema = z.object({
  version: z.literal(PROGRAM_CONTRACT_VERSION), kind: z.literal("editorial_program"),
  sourcePlanner: z.object({ brand: plannerBrandSchema, createdAt: z.string().datetime(), updatedAt: z.string().datetime() }).strict(),
  basis: programBasisSchema, revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  ideas: z.array(programIdeaSchema).max(12), plannedItems: z.array(programItemSchema).max(100),
}).strict().superRefine((program, context) => {
  const seenIdeas = new Set<string>();
  program.ideas.forEach((idea, index) => {
    if (seenIdeas.has(idea.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["ideas", index, "id"], message: "Duplicate idea ID" });
    seenIdeas.add(idea.id);
  });
  const seenItems = new Set<string>(); const seenSlots = new Set<string>();
  program.plannedItems.forEach((item, index) => {
    const occupied = `${item.date}:${item.slot}`;
    if (seenItems.has(item.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["plannedItems", index, "id"], message: "Duplicate item ID" });
    if (seenSlots.has(occupied)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["plannedItems", index, "slot"], message: "Slot already occupied" });
    if (item.date < program.basis.startDate || item.date > program.basis.endDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ["plannedItems", index, "date"], message: "Item outside trip range" });
    seenItems.add(item.id); seenSlots.add(occupied);
  });
});

const positionSchema = z.object({ itemId: idSchema, date: dateSchema, slot: programSlotSchema }).strict();
const itemEditSchema = z.object({ title: titleSchema.optional(), date: dateSchema.optional(), slot: programSlotSchema.optional(), durationMinutes: durationSchema.optional() })
  .strict().refine((value) => Object.keys(value).some((key) => value[key as keyof typeof value] !== undefined), "Empty edit");

const expectedRevisionSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const programActionSchema = z.discriminatedUnion("type", [
  z.object({ expectedRevision: expectedRevisionSchema, type: z.literal("set_ideas"), ideas: z.array(programIdeaSchema).max(12) }).strict(),
  z.object({ expectedRevision: expectedRevisionSchema, type: z.literal("add_from_idea"), ideaId: idSchema, itemId: idSchema, date: dateSchema, slot: programSlotSchema }).strict(),
  z.object({ expectedRevision: expectedRevisionSchema, type: z.literal("add_custom"), item: z.object({ id: idSchema, title: titleSchema, date: dateSchema, slot: programSlotSchema, durationMinutes: durationSchema }).strict() }).strict(),
  z.object({ expectedRevision: expectedRevisionSchema, type: z.literal("edit_item"), itemId: idSchema, patch: itemEditSchema }).strict(),
  z.object({ expectedRevision: expectedRevisionSchema, type: z.literal("remove_item"), itemId: idSchema }).strict(),
  z.object({ expectedRevision: expectedRevisionSchema, type: z.literal("rebase_program"), positions: z.array(positionSchema).max(100) }).strict(),
]);
export type ProgramDraft = z.infer<typeof programDraftSchema>;
export type ProgramAction = z.infer<typeof programActionSchema>;
