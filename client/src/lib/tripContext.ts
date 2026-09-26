import { z } from "zod";
import {
  calculateTripDays,
  normalizeTripDate,
} from "@shared/dateUtils";
import { isAviasalesCheckoutUrl } from "@shared/flightSchemas";
import { isValidPlannerStartDate } from "@shared/plannerSchemas";
import type { Trip } from "@shared/schema";

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
      return isAviasalesCheckoutUrl(value);
    } catch {
      return false;
    }
  }, "Invalid checkout URL");

const storedTripContextSchema = z
  .object({
    origin: z.string().trim().max(100).optional(),
    originCity: z.string().trim().max(100).optional(),
    destination: z.string().trim().min(1).max(100),
    partyType: z.enum(["bachelor", "bachelorette"]).optional(),
    budget: z.union([
      z.string().trim().min(1).max(30),
      z.number().int().positive(),
    ]).optional(),
    activities: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
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
    if (!value.origin?.trim() && !value.originCity?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origin"],
        message: "Origin is required",
      });
      return;
    }

    if (!isValidPlannerStartDate(value.startDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Start date cannot be in the past",
      });
      return;
    }

    if (value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date cannot be before start date",
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
  partyType?: "bachelor" | "bachelorette";
  budget?: string | number;
  activities?: string[];
}

export function createTripContext(value: unknown): TripContext | null {
  const result = storedTripContextSchema.safeParse(value);
  if (!result.success) return null;

  const origin = result.data.origin || result.data.originCity!;
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
    ...(result.data.partyType ? { partyType: result.data.partyType } : {}),
    ...(result.data.budget !== undefined ? { budget: result.data.budget } : {}),
    ...(result.data.activities ? { activities: result.data.activities } : {}),
  };
}

export function createSavedTripContext(
  trip: Pick<Trip, "departureCity" | "destinations" | "startDate" | "endDate" | "participants" | "experienceType" | "budget" | "activities">,
): TripContext | null {
  const destination = trip.destinations?.[0] ?? "";
  const origin = trip.departureCity;

  return createTripContext({
    destination,
    origin,
    originCity: origin,
    startDate: trip.startDate,
    endDate: trip.endDate,
    people: trip.participants,
    partyType: trip.experienceType === "bachelorette" ? "bachelorette" : "bachelor",
    budget: trip.budget,
    activities: trip.activities ?? [],
    aviasalesCheckoutUrl: "",
    flightLabel: `${origin} → ${destination}`,
  });
}

export function parseStoredTripContext(serialized: string): TripContext | null {
  try {
    return createTripContext(JSON.parse(serialized));
  } catch {
    return null;
  }
}
