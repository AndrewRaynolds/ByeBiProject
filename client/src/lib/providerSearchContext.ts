import { plannerReviewSchema, PLANNER_STORAGE_KEY } from "@shared/plannerSchemas";
import { createProviderSearchFingerprint } from "@shared/providerSelectionSchemas";
import { getPlannerStorageKey, plannerCheckoutBridgeProvenanceSchema } from "./plannerStorage";
import { parseStoredTripContext, type TripContext } from "./tripContext";

export type ProviderSearchContext = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  participants: number;
  preferences: string[];
  source: "planner" | "legacy";
  fingerprint: string;
};

function fromTripContext(context: TripContext): ProviderSearchContext {
  const preferences = context.activities ?? [];
  const searchInput = {
    origin: context.origin,
    destination: context.destination,
    startDate: context.startDate,
    endDate: context.endDate,
    participants: context.people,
  };
  return {
    ...searchInput,
    preferences,
    source: "legacy",
    fingerprint: createProviderSearchFingerprint(searchInput),
  };
}

export function loadProviderSearchContext(storage: Storage): {
  searchContext: ProviderSearchContext;
  legacyTripContext: TripContext;
} | null {
  const legacyRaw = storage.getItem("currentItinerary");
  if (!legacyRaw) return null;
  const legacyTripContext = parseStoredTripContext(legacyRaw);
  if (!legacyTripContext) return null;

  let bridgeProvenance: ReturnType<typeof plannerCheckoutBridgeProvenanceSchema.parse> | null = null;
  try {
    const parsedBridge = plannerCheckoutBridgeProvenanceSchema.safeParse(JSON.parse(legacyRaw)?.plannerBridge);
    bridgeProvenance = parsedBridge.success ? parsedBridge.data : null;
  } catch {
    // The validated legacy context remains usable without Planner provenance.
  }

  const plannerRaw = bridgeProvenance
    ? storage.getItem(getPlannerStorageKey(bridgeProvenance.plannerBrand)) ?? storage.getItem(PLANNER_STORAGE_KEY)
    : storage.getItem(PLANNER_STORAGE_KEY);
  if (plannerRaw) {
    try {
      const parsed = plannerReviewSchema.safeParse(JSON.parse(plannerRaw));
      if (parsed.success) {
        const planner = parsed.data;
        const plannerMatchesCheckout = bridgeProvenance !== null &&
          bridgeProvenance.plannerBrand === planner.brand &&
          bridgeProvenance.plannerCreatedAt === planner.createdAt &&
          bridgeProvenance.plannerUpdatedAt === planner.updatedAt;
        if (!plannerMatchesCheckout) {
          return { searchContext: fromTripContext(legacyTripContext), legacyTripContext };
        }
        const preferences = [
          ...(planner.preferences!.archetype ? [planner.preferences!.archetype] : []),
          ...planner.preferences!.interests,
        ];
        const searchInput = {
          origin: planner.origin!.canonical,
          destination: planner.destination!.canonical,
          startDate: planner.startDate!,
          endDate: planner.endDate!,
          participants: planner.participants!,
        };
        return {
          searchContext: {
            ...searchInput,
            preferences,
            source: "planner",
            fingerprint: createProviderSearchFingerprint(searchInput),
          },
          legacyTripContext,
        };
      }
    } catch {
      // Legacy checkout remains available when the versioned Planner value is corrupt.
    }
  }

  return { searchContext: fromTripContext(legacyTripContext), legacyTripContext };
}
