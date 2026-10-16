import { z } from "zod";
import { plannerDraftSchema } from "./plannerSchemas";
import { plannerActionSchema } from "./plannerSuggestions";
import { getCityDefinition } from "./cityMapping";
const optionalText = (max: number) => z.string().trim().max(max).optional();
const chatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8_000),
}).strict();

const chatTripDetailsSchema = z.object({
  people: z.number().int().min(0).max(50),
  days: z.number().int().min(0).max(30),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  adventureType: z.string().trim().max(100),
  interests: z.array(z.string().trim().min(1).max(100)).max(20),
  budget: z.string().trim().max(30),
}).strict();

export const chatStreamRequestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  planner: plannerDraftSchema.optional(),
  locale: z.enum(["it", "en", "es"]).optional(),
  selectedDestination: optionalText(100),
  tripDetails: chatTripDetailsSchema.optional(),
  conversationHistory: z.array(chatHistoryMessageSchema).max(20).optional().default([]),
  partyType: z.enum(["bachelor", "bachelorette"]).optional(),
  originCity: optionalText(100),
  plannerAction: plannerActionSchema.optional(),
}).strict().superRefine((request, context) => {
  if (request.plannerAction) {
    if (!request.planner || request.planner.status !== "draft" || request.planner.destination !== null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["plannerAction"], message: "Destination actions require a draft with no destination" });
    }
    if (request.plannerAction.type === "choose_destination" &&
        getCityDefinition(request.planner?.origin?.canonical)?.key === request.plannerAction.destinationId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["plannerAction"], message: "Destination must differ from origin" });
    }
  }
  if (request.planner && request.partyType && request.partyType !== request.planner.partyType) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["partyType"],
      message: "Party type must match the planner",
    });
  }
});

export type ChatStreamRequest = z.infer<typeof chatStreamRequestSchema>;
