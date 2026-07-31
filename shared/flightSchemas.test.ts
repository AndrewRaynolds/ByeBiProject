import { describe, expect, it } from "vitest";
import {
  buildAviasalesUrl,
  flightResultSchema,
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
});

