import { z } from "zod";

export type BookingKind = "flight" | "hotel" | "activities";
export type BookingStatus = "pending" | "done";
export type TripBookingStatus = Record<BookingKind, BookingStatus>;

const bookingStatusSchema = z.object({
  flight: z.enum(["pending", "done"]),
  hotel: z.enum(["pending", "done"]),
  activities: z.enum(["pending", "done"]),
});

export const defaultTripBookingStatus: TripBookingStatus = {
  flight: "pending",
  hotel: "pending",
  activities: "pending",
};

export function getTripBookingStatusKey(tripId: number): string {
  return `byebi:trip-booking-status:v1:${tripId}`;
}

export function loadTripBookingStatus(tripId: number): TripBookingStatus {
  try {
    const raw = localStorage.getItem(getTripBookingStatusKey(tripId));
    if (!raw) return { ...defaultTripBookingStatus };
    const parsed = bookingStatusSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { ...defaultTripBookingStatus };
  } catch {
    return { ...defaultTripBookingStatus };
  }
}

export function saveTripBookingStatus(tripId: number, status: TripBookingStatus): void {
  localStorage.setItem(getTripBookingStatusKey(tripId), JSON.stringify(status));
}
