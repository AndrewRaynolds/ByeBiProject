import { z } from "zod";
import { calculateTripDays, isValidDateRange, normalizeTripDate } from "./dateUtils";

export const iataCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/));

const currencyCodeSchema = iataCodeSchema;
const dateOnlySchema = z.string().refine(
  (value) => normalizeTripDate(value) === value,
  "Invalid date",
);

export const flightSearchQuerySchema = z
  .object({
    origin: z.string().trim().min(1).max(100),
    destination: z.string().trim().min(1).max(100),
    departDate: dateOnlySchema,
    returnDate: dateOnlySchema.optional(),
    passengers: z.coerce.number().int().min(1).max(50).default(1),
    currency: currencyCodeSchema.default("EUR"),
  })
  .superRefine((value, context) => {
    if (!value.returnDate) return;
    if (!isValidDateRange(value.departDate, value.returnDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["returnDate"],
        message: "Return date must be after departure date",
      });
      return;
    }
    if (calculateTripDays(value.departDate, value.returnDate) > 30) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["returnDate"],
        message: "Trip cannot exceed 30 days",
      });
    }
  });

const aviasalesUrlParamsSchema = z
  .object({
    originIata: iataCodeSchema,
    destinationIata: iataCodeSchema,
    departDate: dateOnlySchema,
    returnDate: dateOnlySchema.optional(),
    adults: z.number().int().min(1).max(9).default(1),
    partnerId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).default("byebi"),
  })
  .refine(
    (value) => !value.returnDate || isValidDateRange(value.departDate, value.returnDate),
    { path: ["returnDate"], message: "Invalid return date" },
  );

export type AviasalesUrlParams = z.input<typeof aviasalesUrlParamsSchema>;

export function getAviasalesAdultCount(passengers: number): number | null {
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 50) return null;
  return Math.min(passengers, 9);
}

export function isAviasalesCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "www.aviasales.com"
      && url.pathname.startsWith("/search/");
  } catch {
    return false;
  }
}

export function buildAviasalesUrl(value: AviasalesUrlParams): string | null {
  const result = aviasalesUrlParamsSchema.safeParse(value);
  if (!result.success) return null;

  const { originIata, destinationIata, departDate, returnDate, adults, partnerId } = result.data;
  const departure = `${departDate.slice(8, 10)}${departDate.slice(5, 7)}`;
  const returning = returnDate
    ? `${returnDate.slice(8, 10)}${returnDate.slice(5, 7)}`
    : "";
  return `https://www.aviasales.com/search/${originIata}${departure}${destinationIata}${returning}${adults}?marker=${encodeURIComponent(partnerId)}`;
}

export const flightHandoffResponseSchema = z.object({
  origin: iataCodeSchema,
  destination: iataCodeSchema,
  departDate: dateOnlySchema,
  returnDate: dateOnlySchema.optional(),
  passengers: z.number().int().min(1).max(50),
  checkoutAdults: z.number().int().min(1).max(9),
  groupBookingRequired: z.boolean(),
  checkoutUrl: z.string().max(2048).refine(isAviasalesCheckoutUrl),
  handoff: z.object({
    provider: z.literal("aviasales"),
    url: z.string().max(2048).refine(isAviasalesCheckoutUrl),
    exactOffer: z.literal(false),
  }).strict(),
}).strict().superRefine((response, context) => {
  if (response.handoff.url !== response.checkoutUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["handoff", "url"],
      message: "Handoff URL must match checkout URL",
    });
  }
  if (response.checkoutAdults !== Math.min(response.passengers, 9)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["checkoutAdults"],
      message: "Checkout adult count must match the supported passenger scope",
    });
  }
  if (response.groupBookingRequired !== (response.passengers > response.checkoutAdults)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["groupBookingRequired"],
      message: "Group booking flag does not match passenger scope",
    });
  }
});

export type FlightHandoffResponse = z.infer<typeof flightHandoffResponseSchema>;
