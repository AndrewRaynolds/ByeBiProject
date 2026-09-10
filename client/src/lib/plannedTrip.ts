import { isValidDateRange } from "@shared/dateUtils";
import { apiRequest } from "./queryClient";

type PlannedActivity = string | { name?: string };

export type PlannedTripContext = {
  destination?: string;
  origin?: string;
  startDate?: string;
  endDate?: string;
  people?: number;
  partyType?: string;
  budget?: string;
  activities?: PlannedActivity[];
};

const budgetPerPerson: Record<string, number> = {
  economico: 300,
  low: 300,
  medio: 600,
  medium: 600,
  alto: 1_000,
  high: 1_000,
};

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
    !isValidDateRange(startDate, endDate) ||
    !Number.isInteger(participants) ||
    !participants ||
    participants < 1 ||
    participants > 50
  ) return null;

  const experienceType = context.partyType === "bachelorette"
    ? "bachelorette"
    : "bachelor";
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
    budget: budgetPerPerson[context.budget?.toLowerCase() ?? ""] ?? 600,
    activities,
    specialRequests: null,
    includeMerch: false,
  };
}

export async function savePlannedTrip(context: PlannedTripContext): Promise<{
  created: boolean;
}> {
  const payload = buildPlannedTripPayload(context);
  if (!payload) throw new Error("Trip planning data is incomplete");
  const response = await apiRequest("POST", "/api/trips", payload);
  return { created: response.status === 201 };
}
