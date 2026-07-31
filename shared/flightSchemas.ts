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

const flightDateTimeSchema = z
  .string()
  .min(16)
  .max(35)
  .refine((value) => Number.isFinite(Date.parse(value)), "Invalid flight date-time");

export const flightSegmentSchema = z.object({
  departure: z.object({
    iataCode: iataCodeSchema,
    terminal: z.string().trim().max(10).optional(),
    at: flightDateTimeSchema,
  }),
  arrival: z.object({
    iataCode: iataCodeSchema,
    terminal: z.string().trim().max(10).optional(),
    at: flightDateTimeSchema,
  }),
  carrierCode: z.string().trim().regex(/^[A-Z0-9]{2,3}$/),
  carrierName: z.string().trim().min(1).max(100).optional(),
  flightNumber: z.string().trim().min(1).max(10),
  duration: z.string().trim().regex(/^PT/).max(30),
});

export const flightResultSchema = z.object({
  id: z.string().trim().min(1).max(100),
  price: z.number().finite().positive(),
  currency: currencyCodeSchema,
  outbound: z.array(flightSegmentSchema).min(1).max(10),
  inbound: z.array(flightSegmentSchema).min(1).max(10).optional(),
  airlines: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  totalDuration: z.string().trim().regex(/^PT/).max(30),
  stops: z.number().int().min(0).max(9),
});

export type FlightSegment = z.infer<typeof flightSegmentSchema>;
export type FlightResult = z.infer<typeof flightResultSchema>;

