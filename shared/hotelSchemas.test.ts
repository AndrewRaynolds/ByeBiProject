import { describe, expect, it } from "vitest";
import {
  hotelResultSchema,
  hotelSearchQuerySchema,
  hotelSearchResponseSchema,
} from "./hotelSchemas";

const validHotel = {
  provider: "amadeus",
  hotelId: "HOTEL-1",
  name: "Hotel Test",
  stars: "4",
  priceTotal: 320,
  currency: "EUR",
  priceScope: "quoted-occupancy-total-stay",
  quotedAdults: 2,
  requestedAdults: 4,
  offerId: "OFFER-1",
  bookingFlow: "REDIRECT",
  paymentPolicy: "PREPAY",
  checkInDate: "2026-08-10",
  checkOutDate: "2026-08-13",
};

function validHotelResponse() {
  return {
    cityCode: "BCN",
    checkInDate: "2026-08-10",
    checkOutDate: "2026-08-13",
    adults: 4,
    currency: "EUR",
    hotelDataStatus: "live",
    fetchedAt: "2026-08-01T10:00:00.000Z",
    hotels: [{ ...validHotel }],
  };
}

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
    expect(hotelSearchResponseSchema.safeParse(validHotelResponse()).success).toBe(true);
  });

  it("accepts an unavailable provider response without fake hotel data", () => {
    expect(
      hotelSearchResponseSchema.safeParse({
        cityCode: "BCN",
        checkInDate: "2026-08-10",
        checkOutDate: "2026-08-13",
        adults: 12,
        currency: "EUR",
        hotelDataStatus: "unavailable",
        fetchedAt: "2026-08-01T10:00:00.000Z",
        hotels: [],
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
    { quotedAdults: 3 },
    { priceScope: "full-group" },
    { checkOutDate: "not-a-date" },
    { checkOutDate: "2026-08-09" },
  ])("rejects malformed hotel data", (override) => {
    expect(hotelResultSchema.safeParse({ ...validHotel, ...override }).success).toBe(false);
  });

  it("rejects a response that mislabels unavailable data as live inventory", () => {
    expect(hotelSearchResponseSchema.safeParse({
      cityCode: "BCN",
      checkInDate: "2026-08-10",
      checkOutDate: "2026-08-13",
      adults: 4,
      currency: "EUR",
      hotelDataStatus: "unavailable",
      fetchedAt: "2026-08-01T10:00:00.000Z",
      hotels: [validHotel],
    }).success).toBe(false);
  });

  it.each([
    ["quoted occupancy", (response: ReturnType<typeof validHotelResponse>) => { response.hotels[0].quotedAdults = 1; }],
    ["requested occupancy", (response: ReturnType<typeof validHotelResponse>) => { response.hotels[0].requestedAdults = 3; }],
    ["check-in scope", (response: ReturnType<typeof validHotelResponse>) => { response.hotels[0].checkInDate = "2026-08-11"; }],
    ["check-out scope", (response: ReturnType<typeof validHotelResponse>) => { response.hotels[0].checkOutDate = "2026-08-14"; }],
    ["single-search currency", (response: ReturnType<typeof validHotelResponse>) => { response.hotels[0].currency = "USD"; }],
    ["price-scope metadata", (response: ReturnType<typeof validHotelResponse>) => { response.hotels[0].priceScope = "full-group"; }],
  ])("rejects conflicting hotel response semantics: %s", (_label, mutate) => {
    const response = validHotelResponse();
    mutate(response);
    expect(hotelSearchResponseSchema.safeParse(response).success).toBe(false);
  });
});
