import { describe, expect, it } from "vitest";
import { buildPlannedTripPayload, plannedTripMatchesSavedTrip } from "./plannedTrip";

describe("planned trip persistence", () => {
  it("maps a completed chatbot itinerary to the dashboard trip model", () => {
    expect(buildPlannedTripPayload({
      destination: "Barcellona",
      origin: "Roma",
      startDate: "2027-06-10",
      endDate: "2027-06-13",
      people: 8,
      partyType: "bachelor",
      budget: "medio",
      activities: [{ name: "Boat party" }, "Pub crawl"],
    })).toEqual({
      name: "ByeBro · Barcellona",
      participants: 8,
      startDate: "2027-06-10",
      endDate: "2027-06-13",
      departureCity: "Roma",
      destinations: ["Barcellona"],
      experienceType: "bachelor",
      budget: 600,
      activities: ["Boat party", "Pub crawl"],
      specialRequests: null,
      includeMerch: false,
    });
  });

  it("rejects incomplete or invalid chatbot planning data", () => {
    expect(buildPlannedTripPayload({ destination: "Ibiza" })).toBeNull();
    expect(buildPlannedTripPayload({
      destination: "Ibiza",
      origin: "Milano",
      startDate: "2027-06-13",
      endDate: "2027-06-10",
      people: 6,
    })).toBeNull();
  });

  it("recognizes only a saved trip with the same dashboard details", () => {
    const context = {
      destination: "Barcellona",
      origin: "Roma",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      people: 12,
      partyType: "bachelor",
      budget: "medio",
    };
    const savedTrip = {
      participants: 12,
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      departureCity: "Roma",
      destinations: ["Barcellona"],
      experienceType: "bachelor",
      budget: 600,
    };

    expect(plannedTripMatchesSavedTrip(context, savedTrip)).toBe(true);
    expect(plannedTripMatchesSavedTrip(context, { ...savedTrip, participants: 8 })).toBe(false);
    expect(plannedTripMatchesSavedTrip(context, { ...savedTrip, departureCity: "Milano" })).toBe(false);
  });

  it("preserves a reopened trip's exact numeric budget for deduplication", () => {
    const context = {
      destination: "Barcellona",
      origin: "Roma",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      people: 8,
      partyType: "bachelor",
      budget: 475,
      activities: ["Kart"],
    };
    const savedTrip = {
      participants: 8,
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      departureCity: "Roma",
      destinations: ["Barcellona"],
      experienceType: "bachelor",
      budget: 475,
    };

    expect(buildPlannedTripPayload(context)).toMatchObject({ budget: 475, activities: ["Kart"] });
    expect(plannedTripMatchesSavedTrip(context, savedTrip)).toBe(true);
  });
});
