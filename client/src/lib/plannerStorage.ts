import { z } from "zod";
import {
  createPlannerDraft,
  PLANNER_STORAGE_KEY,
  plannerDraftSchema,
  type PlannerBrand,
  type PlannerDraft,
} from "@shared/plannerSchemas";
import { PROVIDER_SELECTION_STORAGE_KEY } from "@shared/providerSelectionSchemas";

const LEGACY_ITINERARY_KEY = "currentItinerary";

export function getPlannerStorageKey(brand: PlannerBrand): string {
  return `${PLANNER_STORAGE_KEY}:${brand}`;
}

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

function legacyItineraryMatchesBrand(raw: unknown, brand: PlannerBrand): boolean {
  if (!raw || typeof raw !== "object") return true;
  const value = raw as {
    partyType?: unknown;
    plannerBridge?: { plannerBrand?: unknown };
  };
  if (value.plannerBridge?.plannerBrand === "byebro" || value.plannerBridge?.plannerBrand === "byebride") {
    return value.plannerBridge.plannerBrand === brand;
  }
  if (value.partyType === "bachelor" || value.partyType === "bachelorette") {
    return value.partyType === (brand === "byebride" ? "bachelorette" : "bachelor");
  }
  return true;
}

export function loadPlannerDraft(storage: Storage, brand: PlannerBrand): PlannerDraft {
  const brandStorageKey = getPlannerStorageKey(brand);
  const stored = storage.getItem(brandStorageKey);
  if (stored) {
    try {
      const parsed = plannerDraftSchema.safeParse(JSON.parse(stored));
      if (parsed.success && parsed.data.brand === brand) {
        storage.setItem(PLANNER_STORAGE_KEY, stored);
        return parsed.data;
      }
    } catch {
      // Corrupt and unknown-version values are discarded below.
    }
    storage.removeItem(brandStorageKey);
  }

  // Migrate the original single active-draft key without allowing one brand's
  // draft to become the other brand's plan.
  const originalStored = storage.getItem(PLANNER_STORAGE_KEY);
  if (originalStored) {
    try {
      const parsed = plannerDraftSchema.safeParse(JSON.parse(originalStored));
      if (parsed.success && parsed.data.brand === brand) {
        savePlannerDraft(storage, parsed.data);
        return parsed.data;
      }
      if (!parsed.success) storage.removeItem(PLANNER_STORAGE_KEY);
    } catch {
      storage.removeItem(PLANNER_STORAGE_KEY);
    }
  }

  const legacy = storage.getItem(LEGACY_ITINERARY_KEY);
  if (legacy) {
    try {
      const rawLegacy = JSON.parse(legacy);
      const migrated = legacyItineraryMatchesBrand(rawLegacy, brand)
        ? migrateLegacyItinerary(rawLegacy, brand)
        : null;
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
  const serialized = JSON.stringify(plannerDraftSchema.parse(planner));
  storage.setItem(getPlannerStorageKey(planner.brand), serialized);
  // Keep the active key for the checkout provenance bridge and old clients.
  storage.setItem(PLANNER_STORAGE_KEY, serialized);
}

export function startNewPlannerTrip(storage: Storage, brand: PlannerBrand): PlannerDraft {
  const next = createPlannerDraft({ brand });
  storage.removeItem(getPlannerStorageKey(brand));
  storage.removeItem(PLANNER_STORAGE_KEY);
  storage.removeItem(LEGACY_ITINERARY_KEY);
  storage.removeItem(PROVIDER_SELECTION_STORAGE_KEY);
  storage.removeItem("selectedFlight");
  savePlannerDraft(storage, next);
  return next;
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
