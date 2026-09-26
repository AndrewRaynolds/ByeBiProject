/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { createPlannerDraft, PLANNER_STORAGE_KEY } from "@shared/plannerSchemas";
import { persistCheckoutBridge } from "./plannerStorage";
import { loadProviderSearchContext } from "./providerSearchContext";

describe("provider search context", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("currentItinerary", JSON.stringify({
      origin: "Milano",
      destination: "Praga",
      startDate: "2026-12-10",
      endDate: "2026-12-13",
      people: 6,
      aviasalesCheckoutUrl: "",
    }));
  });

  it.each(["byebro", "byebride"] as const)("prefers the review-ready Planner for %s without changing the legacy bridge", (brand) => {
    const planner = createPlannerDraft({
      brand,
      origin: "Rome",
      destination: "Barcelona",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      participants: 8,
      budgetPerPerson: 500,
      preferenceArchetype: "Nightlife",
      interests: ["Food"],
    });
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(planner));
    expect(persistCheckoutBridge(localStorage, planner)).toBe(true);

    const loaded = loadProviderSearchContext(localStorage);
    expect(loaded?.searchContext).toMatchObject({
      source: "planner",
      origin: "Rome",
      destination: "Barcelona",
      participants: 8,
      preferences: ["Nightlife", "Food"],
    });
    expect(loaded?.legacyTripContext.destination).toBe("Barcelona");
  });

  it("falls back to a valid saved-trip/legacy context", () => {
    expect(loadProviderSearchContext(localStorage)?.searchContext).toMatchObject({
      source: "legacy",
      origin: "Milano",
      destination: "Praga",
      participants: 6,
    });
  });

  it("does not let an unrelated older Planner override a reopened saved trip", () => {
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(createPlannerDraft({
      brand: "byebro",
      origin: "Rome",
      destination: "Barcelona",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      participants: 8,
      budgetPerPerson: 500,
      preferenceArchetype: "Nightlife",
    })));
    expect(loadProviderSearchContext(localStorage)?.searchContext).toMatchObject({
      source: "legacy",
      destination: "Praga",
    });
  });

  it("does not classify a same-route Saved Trip as a Planner bridge", () => {
    localStorage.setItem("currentItinerary", JSON.stringify({
      origin: "Milano",
      destination: "Praga",
      startDate: "2026-12-10",
      endDate: "2026-12-13",
      people: 6,
      partyType: "bachelorette",
      budget: 250,
      activities: ["Spa"],
      aviasalesCheckoutUrl: "",
    }));
    const planner = createPlannerDraft({
      brand: "byebro",
      origin: "Milano",
      destination: "Praga",
      startDate: "2026-12-10",
      endDate: "2026-12-13",
      participants: 6,
      budgetPerPerson: 900,
      preferenceArchetype: "Nightlife",
      interests: ["Clubs"],
    });
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(planner));

    const loaded = loadProviderSearchContext(localStorage);
    expect(loaded?.searchContext).toMatchObject({
      source: "legacy",
      preferences: ["Spa"],
    });
    expect(loaded?.legacyTripContext).toMatchObject({ partyType: "bachelorette", budget: 250 });
  });

  it("does not let a stale Planner hijack a bridge from a different Planner snapshot", () => {
    const bridgePlanner = createPlannerDraft({
      brand: "byebro",
      origin: "Milano",
      destination: "Praga",
      startDate: "2026-12-10",
      endDate: "2026-12-13",
      participants: 6,
      budgetPerPerson: 500,
      preferenceArchetype: "Food",
      createdAt: "2026-09-20T10:00:00.000Z",
      updatedAt: "2026-09-20T10:00:00.000Z",
    });
    expect(persistCheckoutBridge(localStorage, bridgePlanner)).toBe(true);

    const stalePlanner = createPlannerDraft({
      brand: "byebro",
      origin: "Milano",
      destination: "Praga",
      startDate: "2026-12-10",
      endDate: "2026-12-13",
      participants: 6,
      budgetPerPerson: 1000,
      preferenceArchetype: "Nightlife",
      createdAt: "2026-09-21T10:00:00.000Z",
      updatedAt: "2026-09-21T10:00:00.000Z",
    });
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(stalePlanner));

    expect(loadProviderSearchContext(localStorage)?.searchContext).toMatchObject({
      source: "legacy",
      preferences: ["Food"],
    });
  });
});
