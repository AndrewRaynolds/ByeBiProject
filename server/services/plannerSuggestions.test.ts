import { describe, expect, it } from "vitest";
import { createPlannerDraft } from "@shared/plannerSchemas";
import { destinationIdeaIds, plannerSuggestionsSchema, suggestionsMatchPlanner } from "@shared/plannerSuggestions";
import { buildDestinationSuggestions, handlePlannerAction } from "./plannerSuggestions";

describe("editorial destination actions", () => {
  it.each(["byebro", "byebride"] as const)("shows at most two ideas without mutating the %s draft", (brand) => {
    const planner = createPlannerDraft({ brand, origin: "Rome", budgetPerPerson: 600, interests: ["food"] });
    const before = JSON.stringify(planner);
    const result = handlePlannerAction(planner, { type: "suggest_destinations", seenIds: [] }, "it");
    expect(result.suggestions.destinationIds).toEqual(["barcelona", "budapest"]);
    expect(result).not.toHaveProperty("planner");
    expect(JSON.stringify(planner)).toBe(before);
    expect(result.content).toContain("spunti editoriali");
  });

  it("cycles through alternatives, excludes the origin and restarts after all ideas were seen", () => {
    const planner = createPlannerDraft({ brand: "byebro", origin: "Barcellona" });
    const seen = new Set<(typeof destinationIdeaIds)[number]>();
    for (let i = 0; i < 3; i++) {
      const ids = buildDestinationSuggestions(planner, [...seen]).destinationIds;
      expect(ids).not.toContain("barcelona");
      expect(ids.every(id => !seen.has(id))).toBe(true);
      ids.forEach(id => seen.add(id));
    }
    expect(seen.size).toBe(5);
    expect(buildDestinationSuggestions(planner, [...seen]).destinationIds).toEqual(["budapest", "lisbon"]);
  });

  it("changes only the destination after an explicit choice and completes a valid brief", () => {
    const planner = createPlannerDraft({ brand: "byebride", origin: "Rome", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6, budgetPerPerson: 500, interests: ["food"] });
    const result = handlePlannerAction(planner, { type: "choose_destination", destinationId: "lisbon" }, "it");
    expect(result.planner).toMatchObject({ destination: { canonical: "Lisbon" }, status: "review-ready", brand: "byebride", participants: 6, budgetPerPerson: 500, preferences: planner.preferences, startDate: planner.startDate, endDate: planner.endDate, createdAt: planner.createdAt });
    expect(planner.destination).toBeNull();
    expect(result.suggestions.destinationIds).toEqual([]);
    expect(result.content).not.toContain("?");
    expect(result.planner).not.toHaveProperty("booking");
  });

  it.each(["it", "en", "es"] as const)("returns a readable %s reply for clients that ignore suggestions", (locale) => {
    const result = handlePlannerAction(createPlannerDraft({ brand: "byebro" }), { type: "suggest_destinations", seenIds: [] }, locale);
    expect(result.content.length).toBeGreaterThan(40);
    expect(plannerSuggestionsSchema.safeParse(result.suggestions).success).toBe(true);
  });

  it("rejects unsupported, same-origin and stale choices instead of replacing a known destination", () => {
    const planner = createPlannerDraft({ brand: "byebro", origin: "Roma" });
    expect(() => handlePlannerAction(planner, { type: "choose_destination", destinationId: "rome" }, "it")).toThrow();
    expect(() => handlePlannerAction(planner, { type: "choose_destination", destinationId: "javascript:alert(1)" }, "it")).toThrow();
    expect(() => handlePlannerAction(createPlannerDraft({ brand: "byebro", destination: "Ibiza" }), { type: "choose_destination", destinationId: "lisbon" }, "it")).toThrow();
  });

  it("rejects forged, duplicate, oversized and wrong-brand suggestion packets", () => {
    const planner = createPlannerDraft({ brand: "byebro" });
    const packet = buildDestinationSuggestions(planner);
    expect(suggestionsMatchPlanner(packet, planner)).toBe(true);
    expect(suggestionsMatchPlanner({ ...packet, brand: "byebride" }, planner)).toBe(false);
    expect(suggestionsMatchPlanner({ ...packet, plannerUpdatedAt: "2000-01-01T00:00:00.000Z" }, planner)).toBe(false);
    expect(plannerSuggestionsSchema.safeParse({ ...packet, destinationIds: ["barcelona", "barcelona"] }).success).toBe(false);
    expect(plannerSuggestionsSchema.safeParse({ ...packet, destinationIds: ["barcelona", "rome", "prague"] }).success).toBe(false);
    expect(plannerSuggestionsSchema.safeParse({ ...packet, imageUrl: "https://example.com/fake" }).success).toBe(false);
  });
});
