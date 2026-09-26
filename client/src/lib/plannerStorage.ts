import { z } from "zod";
import {
  createPlannerDraft,
  PLANNER_STORAGE_KEY,
  plannerDraftSchema,
  type PlannerBrand,
  type PlannerDraft,
} from "@shared/plannerSchemas";

const LEGACY_ITINERARY_KEY = "currentItinerary";

export const PLANNER_CHECKOUT_BRIDGE_VERSION = 1 as const;

export const plannerCheckoutBridgeProvenanceSchema = z.object({
  version: z.literal(PLANNER_CHECKOUT_BRIDGE_VERSION),
  plannerBrand: z.enum(["byebro", "byebride"]),
  plannerCreatedAt: z.string().datetime(),
  plannerUpdatedAt: z.string().datetime(),
}).strict();

const legacyItinerarySchema = z.object({
  origin: z.string().trim().min(1).max(100).optional(),
  originCity: z.string().trim().min(1).max(100).optional(),
  destination: z.string().trim().min(1).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  people: z.number().int().min(1).max(50).optional(),
  partyType: z.enum(["bachelor", "bachelorette"]).optional(),
}).passthrough();

export function migrateLegacyItinerary(raw: unknown, brand: PlannerBrand): PlannerDraft | null {
  const parsed = legacyItinerarySchema.safeParse(raw);
  if (!parsed.success) return null;
  const legacy = parsed.data;
  const hasReliableField = Boolean(
    legacy.origin || legacy.originCity || legacy.destination || legacy.startDate ||
    legacy.endDate || legacy.people,
  );
  if (!hasReliableField) return null;

  try {
    return createPlannerDraft({
      brand,
    partyType: legacy.partyType,
      origin: legacy.origin ?? legacy.originCity,
      destination: legacy.destination,
      startDate: legacy.startDate,
      endDate: legacy.endDate,
      participants: legacy.people,
    });
  } catch {
    return null;
  }
}

export function loadPlannerDraft(storage: Storage, brand: PlannerBrand): PlannerDraft {
  const stored = storage.getItem(PLANNER_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = plannerDraftSchema.safeParse(JSON.parse(stored));
      if (parsed.success && parsed.data.brand === brand) return parsed.data;
    } catch {
      // Corrupt and unknown-version values are discarded below.
    }
    storage.removeItem(PLANNER_STORAGE_KEY);
  }

  const legacy = storage.getItem(LEGACY_ITINERARY_KEY);
  if (legacy) {
    try {
      const migrated = migrateLegacyItinerary(JSON.parse(legacy), brand);
      if (migrated) {
        savePlannerDraft(storage, migrated);
        return migrated;
      }
    } catch {
      // Leave the legacy value untouched; it may still serve the legacy checkout.
    }
  }

  return createPlannerDraft({ brand });
}

export function savePlannerDraft(storage: Storage, planner: PlannerDraft): void {
  storage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(plannerDraftSchema.parse(planner)));
}

export function createLegacyCheckoutBridge(planner: PlannerDraft): Record<string, unknown> | null {
  if (planner.status !== "review-ready" || !planner.origin || !planner.destination ||
      !planner.startDate || !planner.endDate || !planner.participants ||
      !planner.budgetPerPerson || !planner.preferences) return null;

  const activities = [
    ...(planner.preferences.archetype ? [planner.preferences.archetype] : []),
    ...planner.preferences.interests,
  ].filter((value, index, values) => values.indexOf(value) === index);

  return {
    origin: planner.origin.canonical,
    originCity: planner.origin.displayLabel ?? planner.origin.canonical,
    destination: planner.destination.canonical,
    startDate: planner.startDate,
    endDate: planner.endDate,
    people: planner.participants,
    partyType: planner.partyType,
    budget: planner.budgetPerPerson,
    activities,
    plannerBridge: {
      version: PLANNER_CHECKOUT_BRIDGE_VERSION,
      plannerBrand: planner.brand,
      plannerCreatedAt: planner.createdAt,
      plannerUpdatedAt: planner.updatedAt,
    },
    aviasalesCheckoutUrl: "",
    flightLabel: `${planner.origin.canonical} → ${planner.destination.canonical}`,
  };
}

export function persistCheckoutBridge(storage: Storage, planner: PlannerDraft): boolean {
  const bridge = createLegacyCheckoutBridge(planner);
  if (!bridge) return false;
  storage.setItem(LEGACY_ITINERARY_KEY, JSON.stringify(bridge));
  storage.removeItem("selectedFlight");
  return true;
}
