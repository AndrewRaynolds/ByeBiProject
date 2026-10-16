import { isValidPlannerDateRange } from "@shared/plannerSchemas";
import type { Trip } from "@shared/schema";
import { apiRequest } from "./queryClient";

type PlannedActivity = string | { name?: string };

export type PlannedTripContext = {
  destination?: string;
  origin?: string;
  startDate?: string;
  endDate?: string;
  people?: number;
  partyType?: string;
  budget?: string | number | null;
  activities?: PlannedActivity[];
};

export function resolvePlannedTripBudget(
  budget: PlannedTripContext["budget"],
): number | null {
  if (typeof budget === "number") {
    return Number.isInteger(budget) && budget >= 1 && budget <= 100_000
      ? budget
      : null;
  }
  if (typeof budget !== "string") return null;
  // A qualitative legacy band is not a confirmed per-person amount.
  return null;
}

export function buildPlannedTripPayload(context: PlannedTripContext) {
  const destination = context.destination?.trim();
  const departureCity = context.origin?.trim();
  const participants = context.people;
  const startDate = context.startDate;
  const endDate = context.endDate;
  if (
    !destination ||
    !departureCity ||
    !startDate ||
    !endDate ||
    !isValidPlannerDateRange(startDate, endDate) ||
    !Number.isInteger(participants) ||
    !participants ||
    participants < 1 ||
    participants > 50
  ) return null;

  const experienceType = context.partyType === "bachelorette"
    ? "bachelorette"
    : "bachelor";
  const resolvedBudget = resolvePlannedTripBudget(context.budget);
  if (context.budget != null && resolvedBudget === null) return null;

  const activities = (context.activities ?? [])
    .map((activity) => typeof activity === "string" ? activity : activity.name)
    .filter((activity): activity is string => Boolean(activity?.trim()))
    .map((activity) => activity.trim())
    .slice(0, 20);

  return {
    name: `${experienceType === "bachelorette" ? "ByeBride" : "ByeBro"} · ${destination}`,
    participants,
    startDate,
    endDate,
    departureCity,
    destinations: [destination],
    experienceType,
    budget: resolvedBudget,
    activities,
    specialRequests: null,
    includeMerch: false,
  };
}

export async function savePlannedTrip(context: PlannedTripContext, options?: { signal?: AbortSignal }): Promise<{
  created: boolean;
  tripId?: number;
}> {
  const payload = buildPlannedTripPayload(context);
  if (!payload) throw new Error("Trip planning data is incomplete");
  const response = options
    ? await apiRequest("POST", "/api/trips", payload, options)
    : await apiRequest("POST", "/api/trips", payload);
  if (response.status === 201) return { created: true };
  if (response.status !== 200) throw new Error("Invalid save response");
  const value = await response.json();
  if (!Number.isSafeInteger(value?.id) || value.id <= 0) throw new Error("Missing saved trip identity");
  return { created: false, tripId: value.id };
}

const normalizeIdentity = (value: string | null | undefined) =>
  (value ?? "").trim().toLocaleLowerCase("en");

export function plannedTripMatchesSavedTrip(
  context: PlannedTripContext,
  trip: Pick<Trip, "participants" | "startDate" | "endDate" | "departureCity" | "destinations" | "experienceType" | "budget">,
): boolean {
  const payload = buildPlannedTripPayload(context);
  if (!payload) return false;
  return (
    trip.participants === payload.participants &&
    trip.startDate === payload.startDate &&
    trip.endDate === payload.endDate &&
    normalizeIdentity(trip.departureCity) === normalizeIdentity(payload.departureCity) &&
    normalizeIdentity(trip.destinations?.[0]) === normalizeIdentity(payload.destinations[0]) &&
    trip.experienceType === payload.experienceType &&
    trip.budget === payload.budget
  );
}
