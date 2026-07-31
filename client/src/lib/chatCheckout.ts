import { z } from "zod";
import { createTripContext, type TripContext } from "./tripContext";

const flightSearchArgumentsSchema = z.object({
  origin: z.string().trim().min(1).max(100),
  destination: z.string().trim().min(1).max(100),
  departure_date: z.string(),
  return_date: z.string(),
  passengers: z.number().int().min(1).max(50),
}).passthrough();

const flightSearchResultSchema = z.object({
  checkoutReady: z.literal(true),
  checkoutUrl: z.string().trim().min(1).max(2048),
}).passthrough();

export function createChatCheckoutContext(
  rawArguments: unknown,
  rawResult: unknown,
): TripContext | null {
  const argumentsResult = flightSearchArgumentsSchema.safeParse(rawArguments);
  const searchResult = flightSearchResultSchema.safeParse(rawResult);
  if (!argumentsResult.success || !searchResult.success) return null;

  const args = argumentsResult.data;
  return createTripContext({
    origin: args.origin,
    originCity: args.origin,
    destination: args.destination,
    startDate: args.departure_date,
    endDate: args.return_date,
    people: args.passengers,
    aviasalesCheckoutUrl: searchResult.data.checkoutUrl,
    flightLabel: `${args.origin} → ${args.destination}`,
  });
}
