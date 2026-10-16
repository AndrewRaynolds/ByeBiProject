import { createHash } from "node:crypto";
import type { Trip } from "@shared/schema";
import { emptyTripPlanning, tripPlanningSnapshotSchema, type TripPlanning } from "@shared/tripPlanningSchemas";

export function tripPlanningSnapshot(trip: Trip, row?: { revision: number; plan: TripPlanning }) {
  const contextRevision = createHash("sha256").update(JSON.stringify([
    trip.id, trip.departureCity, trip.destinations, trip.startDate, trip.endDate,
    trip.participants, trip.experienceType, trip.budget,
  ])).digest("hex");
  return tripPlanningSnapshotSchema.parse({ revision: row?.revision ?? 0, contextRevision,
    plan: row?.plan ?? emptyTripPlanning(trip) });
}
