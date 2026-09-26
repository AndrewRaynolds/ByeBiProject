import { z } from "zod";
import { isAviasalesCheckoutUrl } from "./flightSchemas";

export const PROVIDER_SELECTION_VERSION = 1 as const;
export const PROVIDER_SELECTION_STORAGE_KEY = "byebi:providerSelections:v1" as const;

const searchFingerprintInputSchema = z.object({
  origin: z.string().trim().min(1).max(100),
  destination: z.string().trim().min(1).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  participants: z.number().int().min(1).max(50),
  preferences: z.array(z.string().trim().min(1).max(100)).max(21).optional(),
}).strict();

function normalizeFingerprintText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export type ProviderSearchFingerprintInput = z.input<typeof searchFingerprintInputSchema>;

export function createProviderSearchFingerprint(input: ProviderSearchFingerprintInput): string {
  const parsed = searchFingerprintInputSchema.parse(input);
  const material = JSON.stringify({
    origin: normalizeFingerprintText(parsed.origin),
    destination: normalizeFingerprintText(parsed.destination),
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    participants: parsed.participants,
  });
  return `provider-search-v1:${fnv1a(material)}`;
}

const selectedFlightSchema = z.object({
  provider: z.literal("amadeus"),
  offerId: z.string().trim().min(1).max(100),
  airlineNames: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  departureAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  arrivalAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  returnDepartureAt: z.string().refine((value) => Number.isFinite(Date.parse(value))).optional(),
  price: z.number().finite().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  priceScope: z.literal("searched-passengers-total"),
  quotedPassengers: z.number().int().min(1).max(9),
  externalHandoff: z.object({
    provider: z.literal("aviasales"),
    url: z.string().max(2048).refine(isAviasalesCheckoutUrl),
    exactOffer: z.literal(false),
  }).strict(),
}).strict();

const selectedHotelSchema = z.object({
  provider: z.literal("amadeus"),
  hotelId: z.string().trim().min(1).max(100),
  offerId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priceTotal: z.number().finite().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  priceScope: z.literal("quoted-occupancy-total-stay"),
  quotedAdults: z.number().int().min(1).max(2),
  requestedAdults: z.number().int().min(1).max(50),
}).strict();

export const providerSelectionSchema = z.object({
  version: z.literal(PROVIDER_SELECTION_VERSION),
  searchFingerprint: z.string().regex(/^provider-search-v1:[0-9a-f]{8}$/),
  selectedFlight: selectedFlightSchema.optional(),
  selectedHotel: selectedHotelSchema.optional(),
  updatedAt: z.string().datetime(),
}).strict();

export type ProviderSelections = z.infer<typeof providerSelectionSchema>;
export type SelectedFlight = z.infer<typeof selectedFlightSchema>;
export type SelectedHotel = z.infer<typeof selectedHotelSchema>;
