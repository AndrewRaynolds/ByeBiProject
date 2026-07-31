import { describe, expect, it } from "vitest";
import {
  hotelResultSchema,
  hotelSearchQuerySchema,
  hotelSearchResponseSchema,
} from "./hotelSchemas";

const validHotel = {
  hotelId: "HOTEL-1",
  name: "Hotel Test",
  stars: "4",
  priceTotal: 320,
  currency: "EUR",
  offerId: "OFFER-1",
  bookingFlow: "REDIRECT",
  paymentPolicy: "PREPAY",
  checkInDate: "2026-08-10",
  checkOutDate: "2026-08-13",
};

describe("hotel schemas", () => {
  it("normalizes valid search parameters", () => {
    expect(
      hotelSearchQuerySchema.parse({
        cityCode: " bcn ",
        checkInDate: "2026-08-10",
        checkOutDate: "2026-08-13",
        adults: "4",
        currency: "eur",
      }),
    ).toEqual({
      cityCode: "BCN",
      checkInDate: "2026-08-10",
      checkOutDate: "2026-08-13",
      adults: 4,
      currency: "EUR",
    });
  });

  it.each([
    { cityCode: "BARCELONA" },
    { checkInDate: "2026-02-30" },
    { checkOutDate: "2026-08-10" },
    { checkOutDate: "2026-10-10" },
    { adults: "0" },
    { adults: "2.5" },
    { currency: "EURO" },
  ])("rejects invalid search parameters", (override) => {
    const result = hotelSearchQuerySchema.safeParse({
      cityCode: "BCN",
      checkInDate: "2026-08-10",
      checkOutDate: "2026-08-13",
      adults: "4",
      currency: "EUR",
      ...override,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete hotel response", () => {
    expect(
      hotelSearchResponseSchema.safeParse({
        cityCode: "BCN",
        checkInDate: "2026-08-10",
        checkOutDate: "2026-08-13",
        adults: 4,
        currency: "EUR",
        hotels: [validHotel],
      }).success,
    ).toBe(true);
  });

  it.each([
    { priceTotal: Number.NaN },
    { priceTotal: -10 },
    { hotelId: "" },
    { name: "" },
    { stars: "8" },
    { bookingFlow: "UNKNOWN" },
    { checkOutDate: "not-a-date" },
    { checkOutDate: "2026-08-09" },
  ])("rejects malformed hotel data", (override) => {
    expect(hotelResultSchema.safeParse({ ...validHotel, ...override }).success).toBe(false);
  });
});
