import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPlannerUpdate,
  createPlannerDraft,
  getMissingPlannerFields,
  normalizePlannerCity,
  plannerDraftSchema,
} from "./plannerSchemas";

describe("planner contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12));
  });
  afterEach(() => vi.useRealTimers());

  it("normalizes cities, dates, participants and budget per person", () => {
    const planner = createPlannerDraft({
      brand: "byebro",
      origin: "  milano  ",
      destination: "barcellona",
      startDate: "10/10/2026",
      endDate: "13/10/2026",
      participants: 8,
      budgetPerPerson: 650,
      preferenceArchetype: "nightlife",
      interests: [" music ", "food"],
    });

    expect(planner).toMatchObject({
      origin: { canonical: "Milano" },
      destination: { canonical: "Barcelona" },
      startDate: "2026-10-10",
      endDate: "2026-10-13",
      participants: 8,
      budgetPerPerson: 650,
      status: "review-ready",
    });
    expect(planner.preferences?.interests).toEqual(["music", "food"]);
  });

  it("keeps incomplete data as draft without budget or preference defaults", () => {
    const planner = createPlannerDraft({ brand: "byebride", destination: "Ibiza" });
    expect(planner.status).toBe("draft");
    expect(planner.budgetPerPerson).toBeNull();
    expect(planner.preferences).toBeNull();
    expect(getMissingPlannerFields(planner)).toContain("budgetPerPerson");
  });

  it("accepts an explicit experience archetype without inventing interests", () => {
    const planner = createPlannerDraft({
      brand: "byebride", origin: "Rome", destination: "Ibiza",
      startDate: "2026-10-10", endDate: "2026-10-13", participants: 5,
      budgetPerPerson: 600, preferenceArchetype: "wellness",
    });
    expect(planner.status).toBe("review-ready");
    expect(planner.preferences).toEqual({ archetype: "wellness", interests: [] });
  });

  it("rejects invalid ranges and unknown versions", () => {
    const draft = createPlannerDraft({ brand: "byebro" });
    expect(plannerDraftSchema.safeParse({ ...draft, version: 2 }).success).toBe(false);
    expect(() => applyPlannerUpdate(draft, {
      origin: "Rome", destination: "Ibiza", startDate: "2026-10-15", endDate: "2026-10-10",
      participants: 4, budgetPerPerson: 500, preferenceArchetype: "relax", interests: ["spa"],
    })).toThrow();
  });

  it("rejects past starts while accepting today, future dates and same-day trips", () => {
    const base = {
      brand: "byebro" as const, origin: "Rome", destination: "Ibiza",
      participants: 4, budgetPerPerson: 500, preferenceArchetype: "relax",
    };
    expect(() => createPlannerDraft({ ...base, startDate: "2026-01-14", endDate: "2026-01-16" })).toThrow();
    expect(createPlannerDraft({ ...base, startDate: "2026-01-15", endDate: "2026-01-15" }).status).toBe("review-ready");
    expect(createPlannerDraft({ ...base, startDate: "2026-01-16", endDate: "2026-01-17" }).status).toBe("review-ready");
  });

  it("enforces the canonical brand and party-type pairs", () => {
    const bro = createPlannerDraft({ brand: "byebro" });
    const bride = createPlannerDraft({ brand: "byebride" });
    expect(bro.partyType).toBe("bachelor");
    expect(bride.partyType).toBe("bachelorette");
    expect(plannerDraftSchema.safeParse({ ...bro, partyType: "bachelorette" }).success).toBe(false);
    expect(plannerDraftSchema.safeParse({ ...bride, partyType: "bachelor" }).success).toBe(false);
  });

  it("normalizes a known localized city and a free-form origin consistently", () => {
    expect(normalizePlannerCity("  praga ")).toBe("Prague");
    expect(normalizePlannerCity("new   york")).toBe("New York");
  });
});
