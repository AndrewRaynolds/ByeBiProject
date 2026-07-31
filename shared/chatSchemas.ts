import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const httpUrlSchema = z.string().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "Invalid URL");

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

const rawChatFlightSchema = z.object({
  flightId: optionalText(100),
  id: z.union([z.number().int().nonnegative(), z.string().trim().max(100)]).optional(),
  airline: z.string().trim().min(1).max(100),
  departure_at: optionalText(40),
  departureAt: optionalText(40),
  return_at: optionalText(40),
  returnAt: optionalText(40),
  flight_number: z.number().int().positive().optional(),
  flightNumber: z.union([z.number().int().positive(), z.string().trim().max(10)]).optional(),
  origin: optionalText(100),
  destination: optionalText(100),
  checkoutUrl: httpUrlSchema.optional(),
}).strict();

export const chatStreamRequestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  selectedDestination: optionalText(100),
  tripDetails: chatTripDetailsSchema.optional(),
  conversationHistory: z.array(chatHistoryMessageSchema).max(20).optional().default([]),
  partyType: z.enum(["bachelor", "bachelorette"]).optional().default("bachelor"),
  originCity: optionalText(100),
  flights: z.array(rawChatFlightSchema).max(10).optional(),
}).strict();

export type ChatStreamRequest = z.infer<typeof chatStreamRequestSchema>;

