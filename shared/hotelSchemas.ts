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
    provider: z.literal("amadeus"),
    hotelId: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    stars: z.string().regex(/^[1-5]$/).optional(),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    priceTotal: z.number().finite().positive(),
    currency: codeSchema,
    priceScope: z.literal("quoted-occupancy-total-stay"),
    quotedAdults: z.number().int().min(1).max(2),
    requestedAdults: z.number().int().min(1).max(50),
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
  hotelDataStatus: z.enum(["live", "unavailable"]),
  fetchedAt: z.string().datetime(),
  hotels: z.array(hotelResultSchema).max(30),
}).strict().superRefine((response, context) => {
  if (response.hotelDataStatus === "unavailable" && response.hotels.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["hotels"],
      message: "Unavailable responses cannot contain hotels",
    });
  }
  response.hotels.forEach((hotel, index) => {
    if (hotel.requestedAdults !== response.adults) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hotels", index, "requestedAdults"],
        message: "Hotel request scope must match response scope",
      });
    }
    if (hotel.quotedAdults !== Math.min(hotel.requestedAdults, 2)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hotels", index, "quotedAdults"],
        message: "Hotel quoted occupancy must match provider quote scope",
      });
    }
    if (hotel.checkInDate !== response.checkInDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hotels", index, "checkInDate"],
        message: "Hotel check-in must match response search scope",
      });
    }
    if (hotel.checkOutDate !== response.checkOutDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hotels", index, "checkOutDate"],
        message: "Hotel check-out must match response search scope",
      });
    }
    if (hotel.currency !== response.currency) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hotels", index, "currency"],
        message: "Hotel currency must match response currency",
      });
    }
  });
});

export type HotelResult = z.infer<typeof hotelResultSchema>;
export type HotelSearchQuery = z.infer<typeof hotelSearchQuerySchema>;
