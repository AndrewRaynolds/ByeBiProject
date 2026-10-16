import { createHash } from "node:crypto";
import type { Trip } from "@shared/schema";
import type { TripPreferencesPatch, TripPreferencesSnapshot } from "@shared/tripPreferencesSchemas";

type PreferenceTrip = Pick<Trip, "id" | "userId" | "activities">;
export function tripPreferencesSnapshot(trip: PreferenceTrip): TripPreferencesSnapshot {
  return { notes: trip.activities, revision: createHash("sha256")
    .update(JSON.stringify([trip.id, trip.userId, trip.activities])).digest("hex") };
}

export function tripPreferencesConflict(trip: PreferenceTrip, patch: TripPreferencesPatch): boolean {
  // A retry after an applied write is safe even when the original revision is stale.
  return tripPreferencesSnapshot(trip).revision !== patch.expectedRevision &&
    JSON.stringify(trip.activities) !== JSON.stringify(patch.notes);
}
