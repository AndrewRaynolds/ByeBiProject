import { describe, expect, it } from "vitest";
import { buildPlannedTripPayload } from "./plannedTrip";

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
});
