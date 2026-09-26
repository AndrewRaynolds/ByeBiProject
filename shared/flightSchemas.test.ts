import { describe, expect, it } from "vitest";
import {
  buildAviasalesUrl,
  getAviasalesAdultCount,
  isAviasalesCheckoutUrl,
  flightResultSchema,
  flightCheckoutSearchResponseSchema,
  flightSearchQuerySchema,
} from "./flightSchemas";

const validQuery = {
  origin: "Roma",
  destination: "Barcelona",
  departDate: "2026-08-10",
  returnDate: "2026-08-13",
  passengers: "4",
  currency: "eur",
};

const validSegment = {
  departure: { iataCode: "FCO", at: "2026-08-10T10:00:00" },
  arrival: { iataCode: "BCN", at: "2026-08-10T12:00:00" },
  carrierCode: "VY",
  carrierName: "Vueling",
  flightNumber: "6101",
  duration: "PT2H",
};

function validCheckoutResponse() {
  const checkoutUrl = "https://www.aviasales.com/search/FCO1008BCN13089?marker=685469";
  return {
    origin: "FCO",
    destination: "BCN",
    departDate: "2026-08-10",
    returnDate: "2026-08-13",
    passengers: 12,
    checkoutAdults: 9,
    groupBookingRequired: true,
    currency: "EUR",
    checkoutUrl,
    handoff: { provider: "aviasales", url: checkoutUrl, exactOffer: false },
    flightDataStatus: "live",
    fetchedAt: "2026-08-01T10:00:00.000Z",
    flights: [{
      provider: "amadeus",
      offerId: "amadeus-offer-42",
      airlines: ["Vueling"],
      outbound: [validSegment],
      price: 899,
      currency: "EUR",
      priceScope: "searched-passengers-total",
      quotedPassengers: 9,
      requestedPassengers: 12,
      totalDuration: "PT2H",
      stops: 0,
    }],
  };
}

describe("flight schemas", () => {
  it("normalizes valid search parameters", () => {
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
  ])("rejects invalid search parameters", (override) => {
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
    expect(
      buildAviasalesUrl({
        originIata: "fco",
        destinationIata: "bcn",
        departDate: "2026-08-10",
        returnDate: "2026-08-13",
        adults: 4,
      }),
    ).toBe("https://www.aviasales.com/search/FCO1008BCN13084?marker=byebi");
  });

  it("accepts only HTTPS Aviasales search checkout URLs", () => {
    expect(isAviasalesCheckoutUrl(
      "https://www.aviasales.com/search/FCO1008BCN13084?marker=685469",
    )).toBe(true);
    expect(isAviasalesCheckoutUrl(
      "http://www.aviasales.com/search/FCO1008BCN13084?marker=685469",
    )).toBe(false);
    expect(isAviasalesCheckoutUrl(
      "https://example.com/search/FCO1008BCN13084?marker=685469",
    )).toBe(false);
  });

  it.each([
    { originIata: "ROME" },
    { destinationIata: "BC" },
    { departDate: "2026-02-30" },
    { returnDate: "2026-08-09" },
    { adults: 10 },
    { partnerId: "bad marker!" },
  ])("refuses unsafe Aviasales URL parameters", (override) => {
    expect(
      buildAviasalesUrl({
        originIata: "FCO",
        destinationIata: "BCN",
        departDate: "2026-08-10",
        returnDate: "2026-08-13",
        adults: 4,
        ...override,
      }),
    ).toBeNull();
  });

  it("accepts a complete flight result", () => {
    expect(
      flightResultSchema.safeParse({
        id: "1",
        price: 149.99,
        currency: "EUR",
        outbound: [validSegment],
        inbound: [{
          ...validSegment,
          departure: { iataCode: "BCN", at: "2026-08-13T18:00:00" },
          arrival: { iataCode: "FCO", at: "2026-08-13T20:00:00" },
        }],
        airlines: ["Vueling"],
        totalDuration: "PT2H",
        stops: 0,
      }).success,
    ).toBe(true);
  });

  it.each([
    { price: Number.NaN },
    { price: 0 },
    { outbound: [] },
    { airlines: [] },
    { totalDuration: "2 hours" },
    { stops: -1 },
  ])("rejects malformed flight results", (override) => {
    const result = {
      id: "1",
      price: 149.99,
      currency: "EUR",
      outbound: [validSegment],
      airlines: ["Vueling"],
      totalDuration: "PT2H",
      stops: 0,
      ...override,
    };
    expect(flightResultSchema.safeParse(result).success).toBe(false);
  });

  it("validates normalized offers instead of passing unknown flight data through", () => {
    const response = validCheckoutResponse();
    expect(flightCheckoutSearchResponseSchema.safeParse(response).success).toBe(true);
    expect(flightCheckoutSearchResponseSchema.safeParse({
      ...response,
      flights: [{ ...response.flights[0], offerId: "" }],
    }).success).toBe(false);
  });

  it.each([
    ["checkout adult cap", (response: ReturnType<typeof validCheckoutResponse>) => { response.checkoutAdults = 8; }],
    ["group-booking flag", (response: ReturnType<typeof validCheckoutResponse>) => { response.groupBookingRequired = false; }],
    ["requested passenger scope", (response: ReturnType<typeof validCheckoutResponse>) => { response.flights[0].requestedPassengers = 11; }],
    ["quoted passenger scope", (response: ReturnType<typeof validCheckoutResponse>) => { response.flights[0].quotedPassengers = 8; }],
    ["single-search currency", (response: ReturnType<typeof validCheckoutResponse>) => { response.flights[0].currency = "USD"; }],
  ])("rejects conflicting flight response semantics: %s", (_label, mutate) => {
    const response = validCheckoutResponse();
    mutate(response);
    expect(flightCheckoutSearchResponseSchema.safeParse(response).success).toBe(false);
  });
});
