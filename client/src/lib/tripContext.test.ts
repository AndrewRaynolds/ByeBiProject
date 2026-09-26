import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSavedTripContext, createTripContext, parseStoredTripContext } from "./tripContext";

const validContext = {
  origin: "Milano",
  destination: "Ibiza",
  startDate: "2026-01-20",
  endDate: "2026-01-23",
  people: 4,
  aviasalesCheckoutUrl: "https://www.aviasales.com/search/example?marker=685469",
};

describe("TripContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12));
  });
  afterEach(() => vi.useRealTimers());

  it("normalizes the shared checkout fields", () => {
    expect(createTripContext(validContext)).toEqual({
      ...validContext,
      flightLabel: "Milano → Ibiza",
      originCity: undefined,
    });
  });

  it("supports the legacy originCity field", () => {
    const { origin, ...legacyContext } = validContext;
    expect(
      createTripContext({ ...legacyContext, originCity: "Roma" }),
    ).toMatchObject({ origin: "Roma", originCity: "Roma" });
  });

  it("keeps a same-day planner valid through the legacy checkout parser", () => {
    expect(createTripContext({ ...validContext, endDate: validContext.startDate })).toMatchObject({
      startDate: "2026-01-20", endDate: "2026-01-20",
    });
  });

  it("accepts today and future dates through the legacy checkout parser", () => {
    expect(createTripContext({
      ...validContext,
      startDate: "2026-01-15",
      endDate: "2026-01-16",
    })).toMatchObject({ startDate: "2026-01-15", endDate: "2026-01-16" });
    expect(createTripContext(validContext)).toMatchObject({
      startDate: "2026-01-20", endDate: "2026-01-23",
    });
  });

  it("discards a stored legacy context whose start date is in the past", () => {
    expect(parseStoredTripContext(JSON.stringify({
      ...validContext,
      startDate: "2026-01-14",
      endDate: "2026-01-16",
    }))).toBeNull();
  });

  it("preserves the ByeBride party type when local data is parsed again", () => {
    expect(
      parseStoredTripContext(JSON.stringify({
        ...validContext,
        partyType: "bachelorette",
      })),
    ).toMatchObject({ partyType: "bachelorette" });
  });

  it("supports the legacy Aviasales URL field", () => {
    const { aviasalesCheckoutUrl, ...legacyContext } = validContext;
    expect(
      createTripContext({
        ...legacyContext,
        aviasalesUrl: "https://www.aviasales.com/search/legacy-flight?marker=685469",
      }),
    ).toMatchObject({
      aviasalesCheckoutUrl: "https://www.aviasales.com/search/legacy-flight?marker=685469",
    });
  });

  it("restores all useful saved-trip fields without persisting a flight URL", () => {
    expect(createSavedTripContext({
      departureCity: "Roma",
      destinations: ["Barcellona"],
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      participants: 8,
      experienceType: "bachelorette",
      budget: 475,
      activities: ["Tapas tour", "Kart"],
    })).toMatchObject({
      origin: "Roma",
      destination: "Barcellona",
      people: 8,
      partyType: "bachelorette",
      budget: 475,
      activities: ["Tapas tour", "Kart"],
      aviasalesCheckoutUrl: "",
    });
  });

  it.each([
    { ...validContext, startDate: "2026-02-30" },
    { ...validContext, endDate: "2026-01-19" },
    { ...validContext, endDate: "2026-03-10" },
    { ...validContext, origin: undefined, originCity: undefined },
    { ...validContext, people: 0 },
    { ...validContext, people: "4" },
    { ...validContext, partyType: "birthday" },
    { ...validContext, aviasalesCheckoutUrl: "javascript:alert(1)" },
    { ...validContext, aviasalesCheckoutUrl: "https://example.com/search/flight" },
  ])("rejects invalid checkout data", (context) => {
    expect(createTripContext(context)).toBeNull();
  });

  it("returns null for corrupted local storage", () => {
    expect(parseStoredTripContext("{not-json")).toBeNull();
  });
});
