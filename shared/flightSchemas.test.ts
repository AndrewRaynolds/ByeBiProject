import { describe, expect, it } from "vitest";
import {
  buildAviasalesUrl,
  flightHandoffResponseSchema,
  flightSearchQuerySchema,
  getAviasalesAdultCount,
  isAviasalesCheckoutUrl,
} from "./flightSchemas";

const validQuery = {
  origin: "Roma",
  destination: "Barcelona",
  departDate: "2026-08-10",
  returnDate: "2026-08-13",
  passengers: "4",
  currency: "eur",
};

describe("flight handoff schemas", () => {
  it("normalizes valid handoff parameters", () => {
    expect(flightSearchQuerySchema.parse(validQuery)).toMatchObject({
      passengers: 4,
      currency: "EUR",
    });
  });

  it.each([
    { departDate: "2026-02-30" },
    { returnDate: "2026-08-09" },
    { returnDate: "2026-10-10" },
    { passengers: "0" },
    { passengers: "2.5" },
    { currency: "EURO" },
  ])("rejects invalid handoff parameters", (override) => {
    expect(flightSearchQuerySchema.safeParse({ ...validQuery, ...override }).success).toBe(false);
  });

  it.each([
    [1, 1],
    [9, 9],
    [10, 9],
    [50, 9],
  ])("maps a group of %i travelers to %i Aviasales adults", (passengers, expected) => {
    expect(getAviasalesAdultCount(passengers)).toBe(expected);
  });

  it.each([0, 2.5, 51])("rejects invalid group size %s for Aviasales", (passengers) => {
    expect(getAviasalesAdultCount(passengers)).toBeNull();
  });

  it("builds a validated Aviasales URL", () => {
    expect(buildAviasalesUrl({
      originIata: "fco",
      destinationIata: "bcn",
      departDate: "2026-08-10",
      returnDate: "2026-08-13",
      adults: 4,
    })).toBe("https://www.aviasales.com/search/FCO1008BCN13084?marker=byebi");
  });

  it("accepts only HTTPS Aviasales search URLs", () => {
    expect(isAviasalesCheckoutUrl("https://www.aviasales.com/search/FCO1008BCN13084?marker=685469")).toBe(true);
    expect(isAviasalesCheckoutUrl("http://www.aviasales.com/search/FCO1008BCN13084?marker=685469")).toBe(false);
    expect(isAviasalesCheckoutUrl("https://example.com/search/FCO1008BCN13084?marker=685469")).toBe(false);
  });

  it("validates a handoff-only response with no live inventory", () => {
    const checkoutUrl = "https://www.aviasales.com/search/FCO1008BCN13089?marker=685469";
    const response = {
      origin: "FCO",
      destination: "BCN",
      departDate: "2026-08-10",
      returnDate: "2026-08-13",
      passengers: 12,
      checkoutAdults: 9,
      groupBookingRequired: true,
      checkoutUrl,
      handoff: { provider: "aviasales", url: checkoutUrl, exactOffer: false },
    };

    expect(flightHandoffResponseSchema.safeParse(response).success).toBe(true);
    expect(flightHandoffResponseSchema.safeParse({ ...response, checkoutAdults: 8 }).success).toBe(false);
    expect(flightHandoffResponseSchema.safeParse({
      ...response,
      handoff: { ...response.handoff, exactOffer: true },
    }).success).toBe(false);
  });
});
