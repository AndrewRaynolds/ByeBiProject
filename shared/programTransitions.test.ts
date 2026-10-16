import { describe, expect, it } from "vitest";
import { createPlannerDraft } from "./plannerSchemas";
import { programActionSchema, programDraftSchema } from "./programSchemas";
import { applyProgramAction as transition, assessProgramContext, createProgramDraft, ProgramTransitionError } from "./programTransitions";

function applyProgramAction(program: unknown, action: object, context: unknown) {
  return transition(program, { expectedRevision: (program as { revision: number }).revision, ...action }, context);
}
function planner(brand: "byebro" | "byebride" = "byebro") {
  return createPlannerDraft({ brand, origin: "Rome", destination: "Lisbon", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6,
    preferenceArchetype: "custom", interests: ["museums"], createdAt: "2026-10-16T10:00:00.000Z" });
}
const idea = { id: "walk", title: "Explore a neighborhood", durationMinutes: null, provenance: { kind: "editorial", catalogVersion: 1, catalogId: "neighborhood_walk" } };
function withIdeas(brand: "byebro" | "byebride" = "byebro") {
  const context = planner(brand); return { context, program: applyProgramAction(createProgramDraft(context), { type: "set_ideas", ideas: [idea] }, context) };
}
function withItem() {
  const { context, program } = withIdeas();
  return { context, program: applyProgramAction(program, { type: "add_from_idea", ideaId: "walk", itemId: "first", date: "2099-10-11", slot: "afternoon" }, context) };
}
function errorCode(fn: () => unknown) { try { fn(); } catch (error) { return error instanceof ProgramTransitionError ? error.code : "validation"; } return "no_error"; }

describe("separate editorial program transitions", () => {
  it.each(["byebro", "byebride"] as const)("%s starts empty; preferences never become scheduled activities", (brand) => {
    const context = planner(brand); const before = structuredClone(context);
    const program = createProgramDraft(context);
    expect(program).toMatchObject({ version: 1, kind: "editorial_program", revision: 1, ideas: [], plannedItems: [] });
    expect(context).toEqual(before); expect(program).not.toHaveProperty("budgetPerPerson");
  });
  it("requires a review-ready planner and rejects opaque legacy activity arrays", () => {
    expect(() => createProgramDraft(createPlannerDraft({ brand: "byebro" }))).toThrow();
    expect(programDraftSchema.safeParse(["museums", "spa"]).success).toBe(false);
    expect(programDraftSchema.safeParse({ ...createProgramDraft(planner()), version: 2 }).success).toBe(false);
  });
  it("replaces ideas without scheduling them and preserves the source inputs", () => {
    const { context, program } = withIdeas(); const before = structuredClone(program);
    const next = applyProgramAction(program, { type: "set_ideas", ideas: [] }, context);
    expect(next.plannedItems).toEqual([]); expect(next.ideas).toEqual([]);
    expect(program).toEqual(before); expect(next.revision).toBe(program.revision + 1);
  });
  it("adds only an explicitly selected current idea, with no price or duration inference", () => {
    const { context, program } = withIdeas();
    const action = { type: "add_from_idea", ideaId: "walk", itemId: "first", date: "2099-10-11", slot: "afternoon" };
    const next = applyProgramAction(program, action, context);
    expect(next.plannedItems[0]).toMatchObject({ title: idea.title, durationMinutes: null, feasibility: "not_checked", userEdited: false, provenance: idea.provenance });
    expect(program.plannedItems).toEqual([]);
    expect(errorCode(() => applyProgramAction(program, { ...action, ideaId: "unknown" }, context))).toBe("unknown_idea");
  });
  it("keeps chosen items and their provenance when ideas rotate", () => {
    const { context, program } = withItem();
    const next = applyProgramAction(program, { type: "set_ideas", ideas: [] }, context);
    expect(next.plannedItems).toEqual(program.plannedItems);
    const edited = applyProgramAction(next, { type: "edit_item", itemId: "first", patch: { title: "Our chosen walk", durationMinutes: 45 } }, context);
    expect(edited.plannedItems[0]).toMatchObject({ title: "Our chosen walk", userEdited: true, durationMinutes: 45, provenance: idea.provenance });
  });
  it("creates, edits, moves and explicitly removes a custom item", () => {
    const context = planner(); const program = createProgramDraft(context);
    const added = applyProgramAction(program, { type: "add_custom", item: { id: "custom", title: "  Our break  ", date: "2099-10-10", slot: "morning", durationMinutes: 30 } }, context);
    expect(added.plannedItems[0]).toMatchObject({ title: "Our break", ideaId: null, provenance: { kind: "user" } });
    const edited = applyProgramAction(added, { type: "edit_item", itemId: "custom", patch: { date: "2099-10-13", slot: "evening", durationMinutes: null } }, context);
    expect(edited.plannedItems[0]).toMatchObject({ date: "2099-10-13", durationMinutes: null, userEdited: true });
    expect(applyProgramAction(edited, { type: "remove_item", itemId: "custom" }, context).plannedItems).toEqual([]);
  });
  it.each(["2099-10-09", "2099-10-14", "2099-02-29", "2099-11-31", "2099-10-11T10:00:00Z"])("rejects an invalid or out-of-trip date %s without mutating", (date) => {
    const { context, program } = withIdeas(); const before = structuredClone(program);
    expect(() => applyProgramAction(program, { type: "add_from_idea", ideaId: "walk", itemId: "item", date, slot: "morning" }, context)).toThrow();
    expect(program).toEqual(before);
  });
  it("handles month/year boundaries and a valid leap day as calendar days", () => {
    const context = createPlannerDraft({ brand: "byebro", origin: "Rome", destination: "Lisbon", participants: 6, startDate: "2099-12-31", endDate: "2100-01-01" });
    const program = createProgramDraft(context);
    expect(() => applyProgramAction(program, { type: "add_custom", item: { id: "year", title: "Together", date: "2100-01-01", slot: "morning", durationMinutes: null } }, context)).not.toThrow();
    const leap = createPlannerDraft({ brand: "byebride", origin: "Rome", destination: "Lisbon", participants: 6, startDate: "2096-02-28", endDate: "2096-03-01" });
    expect(() => applyProgramAction(createProgramDraft(leap), { type: "add_custom", item: { id: "leap", title: "Together", date: "2096-02-29", slot: "afternoon", durationMinutes: null } }, leap)).not.toThrow();
  });
  it("rejects occupied slots and duplicate IDs rather than replacing an item", () => {
    const { context, program } = withItem(); const before = structuredClone(program);
    for (const action of [
      { type: "add_from_idea", ideaId: "walk", itemId: "second", date: "2099-10-11", slot: "afternoon" },
      { type: "add_from_idea", ideaId: "walk", itemId: "first", date: "2099-10-12", slot: "afternoon" },
    ]) expect(() => applyProgramAction(program, action, context)).toThrow();
    expect(program).toEqual(before);
  });
  it.each(["title", "durationMinutes"])("does not erase %s via undefined from an in-process caller", (field) => {
    const { context, program } = withItem();
    expect(programActionSchema.safeParse({ expectedRevision: program.revision, type: "edit_item", itemId: "first", patch: { [field]: undefined } }).success).toBe(false);
    const result = applyProgramAction(program, { type: "edit_item", itemId: "first", patch: { title: undefined, durationMinutes: 40 } }, context);
    expect(result.plannedItems[0].title).toBe(idea.title);
  });
  it.each(["edit_item", "remove_item"])("rejects an unknown item for %s", (type) => {
    const { context, program } = withItem();
    expect(errorCode(() => applyProgramAction(program, { type, itemId: "unknown", ...(type === "edit_item" ? { patch: { title: "No" } } : {}) }, context))).toBe("unknown_item");
  });
});

describe("context review without silent rescheduling", () => {
  it.each(["brand", "createdAt"])("refuses to associate another planner by %s, including rebase", (field) => {
    const { context, program } = withItem();
    const other = field === "brand" ? planner("byebride") : { ...context, createdAt: "2026-10-16T11:00:00.000Z" };
    expect(assessProgramContext(program, other).samePlanner).toBe(false);
    expect(errorCode(() => applyProgramAction(program, { type: "rebase_program", positions: [] }, other))).toBe("different_planner");
  });
  it.each([{ participants: 8 }, { origin: { canonical: "Milan" } }, { destination: { canonical: "Barcelona" } }])("requires explicit review of changed route/group %#", (patch) => {
    const { context, program } = withItem(); const changed = { ...context, ...patch };
    expect(assessProgramContext(program, changed).contextChanged).toBe(true);
    expect(errorCode(() => applyProgramAction(program, { type: "remove_item", itemId: "first" }, changed))).toBe("review_required");
    const reviewed = applyProgramAction(program, { type: "rebase_program", positions: [] }, changed);
    expect(reviewed.plannedItems).toEqual(program.plannedItems);
    expect(assessProgramContext(reviewed, changed).contextChanged).toBe(false);
  });
  it("corrects dates atomically on explicit rebase, preserving every other item detail", () => {
    const { context, program } = withItem(); const before = structuredClone(program);
    const changed = { ...context, startDate: "2099-10-15", endDate: "2099-10-18", updatedAt: "2099-01-01T10:00:00.000Z" };
    expect(assessProgramContext(program, changed).invalidItemIds).toEqual(["first"]);
    expect(() => applyProgramAction(program, { type: "rebase_program", positions: [] }, changed)).toThrow();
    const result = applyProgramAction(program, { type: "rebase_program", positions: [{ itemId: "first", date: "2099-10-16", slot: "morning" }] }, changed);
    expect(result.plannedItems[0]).toEqual({ ...program.plannedItems[0], date: "2099-10-16", slot: "morning", userEdited: true });
    expect(result.sourcePlanner.updatedAt).toBe(changed.updatedAt); expect(program).toEqual(before);
  });
  it("does not infer changed preferences from the brand or rewrite chosen items after optional notes change", () => {
    const { context, program } = withItem();
    const changed = { ...context, budgetPerPerson: 600, preferences: { archetype: null, interests: ["food"] }, updatedAt: "2099-01-01T10:00:00.000Z" };
    expect(assessProgramContext(program, changed)).toMatchObject({ samePlanner: true, contextChanged: false, plannerChanged: true });
    expect(applyProgramAction(program, { type: "set_ideas", ideas: [] }, changed).plannedItems).toEqual(program.plannedItems);
  });
  it("rejects a colliding context correction atomically and preserves unrelated items on a valid correction", () => {
    const fixture = withItem(); const context = fixture.context;
    const program = applyProgramAction(fixture.program, { type: "add_custom", item: { id: "second", title: "Our own idea", date: "2099-10-12", slot: "morning", durationMinutes: 60 } }, context);
    const before = structuredClone(program);
    const changed = { ...context, startDate: "2099-10-12" };
    expect(() => applyProgramAction(program, { type: "rebase_program", positions: [{ itemId: "first", date: "2099-10-12", slot: "morning" }] }, changed)).toThrow();
    expect(program).toEqual(before);
    const corrected = applyProgramAction(program, { type: "rebase_program", positions: [{ itemId: "first", date: "2099-10-12", slot: "afternoon" }] }, changed);
    expect(corrected.plannedItems).toHaveLength(2);
    expect(corrected.plannedItems[1]).toEqual(before.plannedItems[1]);
  });
  it("rejects unknown or repeated correction IDs", () => {
    const { context, program } = withItem();
    const position = { itemId: "first", date: "2099-10-12", slot: "morning" };
    expect(errorCode(() => applyProgramAction(program, { type: "rebase_program", positions: [position, position] }, context))).toBe("duplicate_position");
    expect(errorCode(() => applyProgramAction(program, { type: "rebase_program", positions: [{ ...position, itemId: "unknown" }] }, context))).toBe("unknown_item");
  });
  it("reads historical program dates without requiring them to be future dates", () => {
    const program = createProgramDraft(planner());
    expect(programDraftSchema.safeParse({ ...program, basis: { ...program.basis, startDate: "2024-01-01", endDate: "2024-01-02" } }).success).toBe(true);
  });
  it("refuses revision overflow instead of losing concurrency precision", () => {
    const { context, program } = withItem();
    expect(errorCode(() => applyProgramAction({ ...program, revision: Number.MAX_SAFE_INTEGER }, { type: "set_ideas", ideas: [] }, context))).toBe("revision_exhausted");
  });
  it("rejects a stale or repeated action before modifying the current program", () => {
    const { context, program } = withItem();
    const action = { expectedRevision: program.revision, type: "edit_item", itemId: "first", patch: { title: "Chosen title" } };
    const next = transition(program, action, context);
    const before = structuredClone(next);
    expect(errorCode(() => transition(next, action, context))).toBe("stale_program");
    expect(next).toEqual(before);
    expect(() => transition(program, { type: "remove_item", itemId: "first" }, context)).toThrow();
  });
});

describe("strict semantic boundaries", () => {
  it.each(["price", "availability", "bookingStatus", "activities", "userId"])("rejects unrelated program field %s", (field) => {
    expect(programDraftSchema.safeParse({ ...createProgramDraft(planner()), [field]: "invented" }).success).toBe(false);
  });
  it.each([0, -1, 1.5, 721])("rejects an invalid user duration %s", (durationMinutes) => {
    const { context, program } = withItem();
    expect(() => applyProgramAction(program, { type: "edit_item", itemId: "first", patch: { durationMinutes } }, context)).toThrow();
  });
  it("rejects duplicate ideas, unknown provenance and a fabricated feasibility status", () => {
    const { context, program } = withItem();
    expect(() => applyProgramAction(program, { type: "set_ideas", ideas: [idea, idea] }, context)).toThrow();
    expect(programDraftSchema.safeParse({ ...program, plannedItems: [{ ...program.plannedItems[0], feasibility: "verified" }] }).success).toBe(false);
    expect(programDraftSchema.safeParse({ ...program, ideas: [{ ...idea, provenance: { kind: "editorial", catalogVersion: 1, catalogId: "hotel_offer" } }] }).success).toBe(false);
    expect(programDraftSchema.safeParse({ ...program, plannedItems: [{ ...program.plannedItems[0], provenance: { kind: "user" } }] }).success).toBe(false);
  });
  it("rejects oversized catalogs and unrelated action fields without trimming accepted content", () => {
    const { context, program } = withItem();
    expect(() => applyProgramAction(program, { type: "set_ideas", ideas: Array.from({ length: 13 }, (_, index) => ({ ...idea, id: `idea-${index}` })) }, context)).toThrow();
    expect(() => applyProgramAction(program, { type: "remove_item", itemId: "first", bookingStatus: "booked" }, context)).toThrow();
    expect(programDraftSchema.safeParse({ ...program, plannedItems: Array(101).fill(program.plannedItems[0]) }).success).toBe(false);
    expect(() => applyProgramAction(program, { type: "edit_item", itemId: "first", patch: { title: "x".repeat(201) } }, context)).toThrow();
  });
});
