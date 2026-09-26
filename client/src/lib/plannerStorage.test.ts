/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { createPlannerDraft, PLANNER_STORAGE_KEY } from "@shared/plannerSchemas";
import {
  createLegacyCheckoutBridge,
  getPlannerStorageKey,
  loadPlannerDraft,
  migrateLegacyItinerary,
  persistCheckoutBridge,
  savePlannerDraft,
  startNewPlannerTrip,
} from "./plannerStorage";
const RETIRED_RETIRED_PROVIDER_SELECTION_STORAGE_KEY = "byebi:providerSelections:v1";

describe("planner storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips the versioned draft across refreshes", () => {
    const draft = createPlannerDraft({ brand: "byebro", destination: "Ibiza" });
    savePlannerDraft(localStorage, draft);
    expect(loadPlannerDraft(localStorage, "byebro")).toEqual(draft);
    expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toContain('"version":1');
    expect(localStorage.getItem(getPlannerStorageKey("byebro"))).toContain('"brand":"byebro"');
  });

  it("keeps resumable drafts isolated by brand", () => {
    const bro = createPlannerDraft({ brand: "byebro", destination: "Ibiza" });
    const bride = createPlannerDraft({ brand: "byebride", destination: "Prague" });
    savePlannerDraft(localStorage, bro);
    savePlannerDraft(localStorage, bride);

    expect(loadPlannerDraft(localStorage, "byebro")).toMatchObject({ brand: "byebro", destination: { canonical: "Ibiza" } });
    expect(loadPlannerDraft(localStorage, "byebride")).toMatchObject({ brand: "byebride", destination: { canonical: "Prague" } });
  });

  it("starts a fresh current-brand draft and clears transient provider state only", () => {
    const bro = createPlannerDraft({ brand: "byebro", destination: "Ibiza" });
    const bride = createPlannerDraft({ brand: "byebride", destination: "Prague" });
    savePlannerDraft(localStorage, bro);
    savePlannerDraft(localStorage, bride);
    localStorage.setItem("currentItinerary", JSON.stringify({ destination: "Ibiza" }));
    localStorage.setItem(RETIRED_PROVIDER_SELECTION_STORAGE_KEY, "old selections");
    localStorage.setItem("selectedFlight", "old flight");
    localStorage.setItem("unrelated", "keep me");

    const next = startNewPlannerTrip(localStorage, "byebro");

    expect(next).toMatchObject({ brand: "byebro", status: "draft", destination: null });
    expect(localStorage.getItem("currentItinerary")).toBeNull();
    expect(localStorage.getItem(RETIRED_PROVIDER_SELECTION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("selectedFlight")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep me");
    expect(JSON.parse(localStorage.getItem(getPlannerStorageKey("byebride"))!)).toMatchObject({ destination: { canonical: "Prague" } });
  });

  it("does not migrate a checkout bridge into the other brand", () => {
    localStorage.setItem("currentItinerary", JSON.stringify({
      destination: "Ibiza",
      partyType: "bachelor",
      plannerBridge: { plannerBrand: "byebro" },
    }));
    expect(loadPlannerDraft(localStorage, "byebride")).toMatchObject({ brand: "byebride", destination: null });
  });

  it.each(["not-json", JSON.stringify({ version: 99 })])(
    "fails safely for corrupt or unknown-version data",
    (value) => {
      localStorage.setItem(PLANNER_STORAGE_KEY, value);
      const draft = loadPlannerDraft(localStorage, "byebride");
      expect(draft.status).toBe("draft");
      expect(draft.brand).toBe("byebride");
      expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBeNull();
    },
  );

  it("migrates only trustworthy legacy values without inventing budget or preferences", () => {
    const migrated = migrateLegacyItinerary({
      origin: "Roma", destination: "Ibiza", startDate: "2026-10-10",
      endDate: "2026-10-13", people: 6,
    }, "byebro");
    expect(migrated).toMatchObject({
      origin: { canonical: "Rome" }, destination: { canonical: "Ibiza" },
      participants: 6, budgetPerPerson: null, preferences: null, status: "draft",
    });
  });

  it("creates a checkout bridge only from a complete review", () => {
    expect(createLegacyCheckoutBridge(createPlannerDraft({ brand: "byebro" }))).toBeNull();
    const ready = createPlannerDraft({
      brand: "byebride", origin: "Rome", destination: "Ibiza",
      startDate: "2099-10-10", endDate: "2099-10-13", participants: 4,
      budgetPerPerson: 700, preferenceArchetype: "wellness", interests: ["spa"],
    });
    expect(createLegacyCheckoutBridge(ready)).toMatchObject({
      budget: 700, activities: ["wellness", "spa"], partyType: "bachelorette",
      plannerBridge: {
        version: 1,
        plannerBrand: "byebride",
        plannerCreatedAt: ready.createdAt,
        plannerUpdatedAt: ready.updatedAt,
      },
    });
    expect(persistCheckoutBridge(localStorage, ready)).toBe(true);
    expect(JSON.parse(localStorage.getItem("currentItinerary")!).plannerBridge.plannerCreatedAt).toBe(ready.createdAt);
  });

  it("preserves an archetype-only preference in the legacy activities field", () => {
    const ready = createPlannerDraft({
      brand: "byebro", origin: "Rome", destination: "Ibiza",
      startDate: "2099-10-10", endDate: "2099-10-13", participants: 4,
      budgetPerPerson: 700, preferenceArchetype: "wellness",
    });
    expect(createLegacyCheckoutBridge(ready)).toMatchObject({
      activities: ["wellness"], partyType: "bachelor",
    });
  });

  it("derives the canonical party type when migrating a mismatched legacy value", () => {
    expect(migrateLegacyItinerary({
      destination: "Ibiza", people: 5, partyType: "bachelorette",
    }, "byebro")?.partyType).toBe("bachelor");
  });
});
