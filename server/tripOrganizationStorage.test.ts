import { describe, expect, it } from "vitest";
import { MemStorage } from "./storage";

describe("MemStorage trip organization status", () => {
  it("persists status only for the trip owner and clears it with the trip", async () => {
    const storage = new MemStorage();
    const trip = await storage.createTrip({
      userId: "user-a",
      name: "ByeBro · Barcelona",
      participants: 6,
      startDate: "2027-06-10",
      endDate: "2027-06-13",
      departureCity: "Rome",
      destinations: ["Barcelona"],
      experienceType: "bachelor",
      budget: 700,
      activities: ["nightlife"],
      specialRequests: null,
      includeMerch: false,
    });

    expect(await storage.getTripOrganizationStatusForUser(trip.id, "user-a")).toBeUndefined();
    expect(await storage.upsertTripOrganizationStatusForUser(
      trip.id,
      "user-b",
      { flight: "done", hotel: "pending", activities: "pending" },
    )).toBeUndefined();

    expect(await storage.upsertTripOrganizationStatusForUser(
      trip.id,
      "user-a",
      { flight: "done", hotel: "pending", activities: "done" },
    )).toEqual({ flight: "done", hotel: "pending", activities: "done" });

    expect(await storage.getTripOrganizationStatusForUser(trip.id, "user-a"))
      .toEqual({ flight: "done", hotel: "pending", activities: "done" });

    expect(await storage.deleteTripForUser(trip.id, "user-a")).toBe(true);
    expect(await storage.getTripOrganizationStatusForUser(trip.id, "user-a")).toBeUndefined();
  });
});
