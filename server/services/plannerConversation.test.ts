import { describe, expect, it } from "vitest";
import { applyPlannerUpdate, createPlannerDraft, type PlannerBrand } from "@shared/plannerSchemas";
import { buildPlannerFollowUp } from "./plannerConversation";

const emptyUpdate = { origin: null, destination: null, startDate: null, endDate: null, participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null };

describe("controlled planner conversation", () => {
  it.each(["byebro", "byebride"] as PlannerBrand[])("offers editorial ideas without selecting one for %s", (brand) => {
    const planner = createPlannerDraft({ brand, origin: "Rome" });
    const before = JSON.stringify(planner);
    const text = buildPlannerFollowUp(planner, "it", planner);
    expect(text).toContain("idee per la meta");
    expect(text.match(/\?/g)).toHaveLength(1);
    expect(text).not.toMatch(/€|disponibil|offerta|prenotat/i);
    expect(JSON.stringify(planner)).toBe(before);
  });

  it("acknowledges changes but does not pretend an unchanged update changed the brief", () => {
    const before = createPlannerDraft({ brand: "byebro", destination: "Ibiza" });
    const after = applyPlannerUpdate(before, { ...emptyUpdate, origin: "Rome" });
    expect(buildPlannerFollowUp(after, "it", before)).toContain("Ho aggiornato");
    expect(buildPlannerFollowUp(after, "it", after)).not.toContain("Ho aggiornato");
  });

  it("asks only for departure when the return is already known", () => {
    const planner = createPlannerDraft({ brand: "byebro", origin: "Rome", destination: "Ibiza", endDate: "2099-10-13" });
    const text = buildPlannerFollowUp(planner, "it", planner);
    expect(text).toContain("Abbiamo già il ritorno");
    expect(text).not.toContain("date di partenza e ritorno");
    expect(text.match(/\?/g)).toHaveLength(1);
  });

  it.each([
    ["it", "Ho tolto il budget"], ["en", "I've removed the budget"], ["es", "He quitado el presupuesto"],
  ] as const)("acknowledges explicit removal in %s and keeps the next question focused", (locale, expected) => {
    const before = createPlannerDraft({ brand: "byebride", origin: "Rome", destination: "Ibiza", budgetPerPerson: 700 });
    const after = applyPlannerUpdate(before, { ...emptyUpdate, clearFields: ["budgetPerPerson"] });
    const text = buildPlannerFollowUp(after, locale, before);
    expect(text).toContain(expected);
    expect(text.match(/\?/g)).toHaveLength(1);
    expect(after.budgetPerPerson).toBeNull();
  });

  it.each(["it", "en", "es"] as const)("does not delay a complete brief for optional notes in %s", (locale) => {
    const planner = createPlannerDraft({ brand: "byebride", origin: "Rome", destination: "Ibiza", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6 });
    const text = buildPlannerFollowUp(planner, locale);
    expect(text).not.toContain("?");
    expect(text).not.toMatch(/budget|presupuesto|preferenc/i);
  });
});

it.each(["it", "en", "es"] as const)("acknowledges a validated group size naturally in %s, asking only for the next unknown field", locale => {
  const before = createPlannerDraft({ brand: "byebro", origin: "Rome", destination: "Lisbon" });
  const after = applyPlannerUpdate(before, { ...emptyUpdate, participants: 8 });
  const result = buildPlannerFollowUp(after, locale, before);
  expect(result).toContain("8"); expect(result.match(/\?/g)).toHaveLength(1);
  expect(result).not.toMatch(/budget|presupuesto|Aviasales|€|booking/);
});
