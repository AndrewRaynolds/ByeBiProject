import { describe, expect, it } from "vitest";
import { MemStorage } from "./storage";

const tripInput = {
  userId: "owner-a", name: "Trip", participants: 3, startDate: "2026-11-12",
  endDate: "2026-11-14", departureCity: "Pisa", destinations: ["Barcelona"],
  experienceType: "bachelor", budget: null,
};

describe("candidate options ownership and lifecycle", () => {
  it("allows multiple options, denies other users and cascades with saved trip", async () => {
    const store = new MemStorage();
    const trip = await store.createTrip(tripInput);
    const input = {
      category: "hotel" as const, url: "https://example.com/offer",
      title: "Potential hotel", source: "example.com",
      priceNote: "€100 observed",
    };
    expect(await store.addTripOptionForUser(trip.id, "stranger", input)).toBeUndefined();
    const option = await store.addTripOptionForUser(trip.id, "owner-a", input);
    expect(option?.title).toBe("Potential hotel");
    expect(await store.addTripOptionForUser(trip.id, "owner-a", { ...input, title: "Second" })).toBeDefined();
    expect(await store.listTripOptionsForUser(trip.id, "stranger")).toBeUndefined();
    expect(await store.listTripOptionsForUser(trip.id, "owner-a")).toHaveLength(2);
    expect(await store.updateTripOptionForUser(trip.id, option!.id, "stranger", { title: "Hacked" })).toBeUndefined();
    expect((await store.updateTripOptionForUser(trip.id, option!.id, "owner-a", { title: "Edited" }))?.title).toBe("Edited");
    expect(await store.removeTripOptionForUser(trip.id, option!.id, "stranger")).toBe(false);
    expect(await store.removeTripOptionForUser(trip.id, option!.id, "owner-a")).toBe(true);
    expect(await store.deleteTripForUser(trip.id, "owner-a")).toBe(true);
    expect(await store.listTripOptionsForUser(trip.id, "owner-a")).toBeUndefined();
  });
});
