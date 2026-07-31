import { describe, expect, it } from "vitest";
import {
  generatedItineraryRequestSchema,
  getTripDurationDays,
} from "./generatedItinerary";

const validRequest = {
  destination: "Roma",
  startDate: "2026-08-10",
  endDate: "2026-08-13",
  participants: 4,
  eventType: "adventure",
  selectedExperiences: ["food", "nightlife"],
};

describe("generated itinerary requests", () => {
  it("accepts and normalizes a valid request", () => {
    expect(generatedItineraryRequestSchema.parse(validRequest)).toEqual(
      validRequest,
    );
    expect(getTripDurationDays(validRequest.startDate, validRequest.endDate)).toBe(3);
  });

  it.each([
    { ...validRequest, startDate: "2026-02-30" },
    { ...validRequest, endDate: "2026-08-10" },
    { ...validRequest, endDate: "2026-10-10" },
    { ...validRequest, participants: 0 },
    { ...validRequest, participants: 51 },
    { ...validRequest, participants: "4" },
  ])("rejects unsafe or inconsistent input", (request) => {
    expect(generatedItineraryRequestSchema.safeParse(request).success).toBe(false);
  });

  it("defaults missing experiences to an empty list", () => {
    const { selectedExperiences, ...withoutExperiences } = validRequest;
    expect(
      generatedItineraryRequestSchema.parse(withoutExperiences)
        .selectedExperiences,
    ).toEqual([]);
  });

  it("rejects unexpected client-controlled fields", () => {
    expect(
      generatedItineraryRequestSchema.safeParse({
        ...validRequest,
        userId: "another-user",
        totalPrice: 1,
      }).success,
    ).toBe(false);
  });
});
