import { z } from "zod";
import { calculateTripDays, isValidDateRange, normalizeTripDate } from "./dateUtils";

const dateOnlySchema = z.string().refine(
  (value) => normalizeTripDate(value) === value,
  "Invalid date",
);

const codeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/));

export const hotelSearchQuerySchema = z
  .object({
    cityCode: codeSchema,
    checkInDate: dateOnlySchema,
    checkOutDate: dateOnlySchema,
    adults: z.coerce.number().int().min(1).max(50),
    currency: codeSchema.default("EUR"),
  })
  .superRefine((value, context) => {
    if (!isValidDateRange(value.checkInDate, value.checkOutDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkOutDate"],
        message: "Check-out date must be after check-in date",
      });
      return;
    }

    if (calculateTripDays(value.checkInDate, value.checkOutDate) > 30) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkOutDate"],
        message: "Stay cannot exceed 30 nights",
      });
    }
  });

export const hotelResultSchema = z
  .object({
    hotelId: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    stars: z.string().regex(/^[1-5]$/).optional(),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    priceTotal: z.number().finite().positive(),
    currency: codeSchema,
    offerId: z.string().trim().min(1).max(200),
    bookingFlow: z.enum(["IN_APP", "REDIRECT"]),
    paymentPolicy: z.enum(["PAY_AT_HOTEL", "PREPAY", "DEPOSIT", "UNKNOWN"]),
    checkInDate: dateOnlySchema,
    checkOutDate: dateOnlySchema,
    roomDescription: z.string().trim().max(500).optional(),
  })
  .refine(
    (hotel) => isValidDateRange(hotel.checkInDate, hotel.checkOutDate),
    { path: ["checkOutDate"], message: "Invalid hotel stay date range" },
  );

export const hotelSearchResponseSchema = z.object({
  cityCode: codeSchema,
  checkInDate: dateOnlySchema,
  checkOutDate: dateOnlySchema,
  adults: z.coerce.number().int().min(1).max(50),
  currency: codeSchema,
  hotels: z.array(hotelResultSchema).max(30),
});

export type HotelResult = z.infer<typeof hotelResultSchema>;
export type HotelSearchQuery = z.infer<typeof hotelSearchQuerySchema>;
