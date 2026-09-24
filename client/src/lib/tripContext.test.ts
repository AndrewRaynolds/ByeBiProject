import { describe, expect, it } from "vitest";
import { createSavedTripContext, createTripContext, parseStoredTripContext } from "./tripContext";

const validContext = {
  origin: "Milano",
  destination: "Ibiza",
  startDate: "2026-08-10",
  endDate: "2026-08-13",
  people: 4,
  aviasalesCheckoutUrl: "https://www.aviasales.com/search/example?marker=685469",
};

describe("TripContext", () => {
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
    { ...validContext, endDate: "2026-08-10" },
    { ...validContext, endDate: "2026-10-10" },
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
