import { z } from "zod";
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
  selectedDestination: optionalText(100),
  tripDetails: chatTripDetailsSchema.optional(),
  conversationHistory: z.array(chatHistoryMessageSchema).max(20).optional().default([]),
  partyType: z.enum(["bachelor", "bachelorette"]).optional().default("bachelor"),
  originCity: optionalText(100),
}).strict();

export type ChatStreamRequest = z.infer<typeof chatStreamRequestSchema>;
