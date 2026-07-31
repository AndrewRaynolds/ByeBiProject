import type { Itinerary } from "@shared/schema";
import type { IStorage } from "./storage";

type TripItineraryReader = Pick<
  IStorage,
  "getTrip" | "getItinerariesByTripId"
>;

export type TripItinerariesResult =
  | { status: 200; body: Itinerary[] }
  | { status: 400 | 404; body: { message: string } };

export async function readOwnedTripItineraries(
  rawTripId: string,
  userId: string,
  storage: TripItineraryReader,
): Promise<TripItinerariesResult> {
  const tripId = Number(rawTripId);
  if (!Number.isInteger(tripId) || tripId <= 0) {
    return { status: 400, body: { message: "Invalid trip ID" } };
  }

  const trip = await storage.getTrip(tripId);
  if (!trip || trip.userId !== userId) {
    return { status: 404, body: { message: "Trip not found" } };
  }

  const itineraries = await storage.getItinerariesByTripId(tripId);
  return { status: 200, body: itineraries };
}
