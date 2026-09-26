import {
  tripOrganizationStatusSchema,
  type TripOrganizationStatus,
} from "@shared/tripOrganizationSchemas";

const LEGACY_TRIP_ORGANIZATION_PREFIX = "byebi:trip-booking-status:v1:";

export function getLegacyTripOrganizationStatusKey(tripId: number): string {
  return `${LEGACY_TRIP_ORGANIZATION_PREFIX}${tripId}`;
}

export function loadLegacyTripOrganizationStatus(
  tripId: number,
  storage: Storage = localStorage,
): TripOrganizationStatus | null {
  if (!Number.isInteger(tripId) || tripId < 1) return null;
  const key = getLegacyTripOrganizationStatusKey(tripId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = tripOrganizationStatusSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    storage.removeItem(key);
    return null;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function clearLegacyTripOrganizationStatus(
  tripId: number,
  storage: Storage = localStorage,
): void {
  if (!Number.isInteger(tripId) || tripId < 1) return;
  storage.removeItem(getLegacyTripOrganizationStatusKey(tripId));
}
