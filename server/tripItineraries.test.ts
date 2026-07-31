import { describe, expect, it, vi } from "vitest";
import { readOwnedTripItineraries } from "./tripItineraries";

function createStorage() {
  return {
    getTrip: vi.fn(),
    getItinerariesByTripId: vi.fn(),
    createItinerary: vi.fn(),
  };
}

describe("readOwnedTripItineraries", () => {
  it("rejects invalid trip identifiers", async () => {
    const storage = createStorage();

    const result = await readOwnedTripItineraries(
      "not-a-number",
      "owner-1",
      storage,
    );

    expect(result).toEqual({
      status: 400,
      body: { message: "Invalid trip ID" },
    });
    expect(storage.getTrip).not.toHaveBeenCalled();
  });

  it("does not reveal another user's trip", async () => {
    const storage = createStorage();
    storage.getTrip.mockResolvedValue({ id: 42, userId: "owner-2" });

    const result = await readOwnedTripItineraries("42", "owner-1", storage);

    expect(result).toEqual({
      status: 404,
      body: { message: "Trip not found" },
    });
    expect(storage.getItinerariesByTripId).not.toHaveBeenCalled();
  });

  it("returns persisted itineraries without creating new records", async () => {
    const storage = createStorage();
    const persisted = [{ id: 7, tripId: 42, name: "Viaggio reale" }];
    storage.getTrip.mockResolvedValue({ id: 42, userId: "owner-1" });
    storage.getItinerariesByTripId.mockResolvedValue(persisted);

    const result = await readOwnedTripItineraries("42", "owner-1", storage);

    expect(result).toEqual({ status: 200, body: persisted });
    expect(storage.getItinerariesByTripId).toHaveBeenCalledWith(42);
    expect(storage.createItinerary).not.toHaveBeenCalled();
  });
});
