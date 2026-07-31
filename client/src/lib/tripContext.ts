import { z } from "zod";
import {
  calculateTripDays,
  isValidDateRange,
  normalizeTripDate,
} from "@shared/dateUtils";

const dateOnlySchema = z.string().refine(
  (value) => normalizeTripDate(value) === value,
  "Invalid date",
);

const checkoutUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    if (!value) return true;

    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Invalid checkout URL");

const storedTripContextSchema = z
  .object({
    origin: z.string().trim().max(100).optional(),
    originCity: z.string().trim().max(100).optional(),
    destination: z.string().trim().min(1).max(100),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    people: z.number().int().min(1).max(50),
    aviasalesCheckoutUrl: checkoutUrlSchema.optional().default(""),
    aviasalesUrl: checkoutUrlSchema.optional(),
    flightLabel: z.string().trim().max(200).optional(),
    selectedFlight: z
      .object({ label: z.string().trim().max(200).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (!isValidDateRange(value.startDate, value.endDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date",
      });
      return;
    }

    if (calculateTripDays(value.startDate, value.endDate) > 30) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Trip duration cannot exceed 30 days",
      });
    }
  });

export interface TripContext {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  people: number;
  aviasalesCheckoutUrl: string;
  flightLabel: string;
  originCity?: string;
}

export function createTripContext(value: unknown): TripContext | null {
  const result = storedTripContextSchema.safeParse(value);
  if (!result.success) return null;

  const origin = result.data.origin || result.data.originCity || "Italia";
  return {
    origin,
    destination: result.data.destination,
    startDate: result.data.startDate,
    endDate: result.data.endDate,
    people: result.data.people,
    aviasalesCheckoutUrl:
      result.data.aviasalesCheckoutUrl || result.data.aviasalesUrl || "",
    flightLabel:
      result.data.flightLabel ||
      result.data.selectedFlight?.label ||
      `${origin} → ${result.data.destination}`,
    originCity: result.data.originCity,
  };
}

export function parseStoredTripContext(serialized: string): TripContext | null {
  try {
    return createTripContext(JSON.parse(serialized));
  } catch {
    return null;
  }
}
