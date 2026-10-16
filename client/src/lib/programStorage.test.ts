/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { createPlannerDraft } from "@shared/plannerSchemas";
import { applyProgramAction, createProgramDraft } from "@shared/programTransitions";
import { getPlannerStorageKey, savePlannerDraft } from "./plannerStorage";
import { programStorageKey, readProgram, resetPlannerAndProgram, writeProgram, type ProgramLock } from "./programStorage";

function context(brand: "byebro" | "byebride" = "byebro") {
  return createPlannerDraft({ brand, origin: "Rome", destination: "Lisbon", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6, createdAt: "2026-10-16T10:00:00.000Z" });
}
function serialLock(): ProgramLock {
  let tail: Promise<unknown> = Promise.resolve();
  return (_name, work) => { const next = tail.then(work); tail = next.catch(() => {}); return next; };
}
describe("isolated local program persistence", () => {
  beforeEach(() => localStorage.clear());
  it("writes only explicitly, resumes unchanged and isolates brand and planner identity", async () => {
    const planner = context(); savePlannerDraft(localStorage, planner);
    expect(readProgram(localStorage, planner).kind).toBe("empty");
    const next = await writeProgram(localStorage, planner, null, () => createProgramDraft(planner), serialLock());
    expect(readProgram(localStorage, planner)).toEqual(next);
    expect(readProgram(localStorage, context("byebride")).kind).toBe("empty");
    expect(readProgram(localStorage, { ...planner, createdAt: "2026-10-17T10:00:00.000Z" }).kind).toBe("foreign");
  });
  it.each(['{broken', '{"version":99}'])("preserves invalid bytes until explicit replacement: %s", async (raw) => {
    const planner = context(); savePlannerDraft(localStorage, planner);
    localStorage.setItem(programStorageKey(planner.brand), raw);
    expect(readProgram(localStorage, planner).kind).toBe("invalid");
    expect(localStorage.getItem(programStorageKey(planner.brand))).toBe(raw);
    await writeProgram(localStorage, planner, raw, () => createProgramDraft(planner), serialLock());
    expect(readProgram(localStorage, planner).kind).toBe("ready");
  });
  it("serializes two tabs and refuses a stale branch even with equal numeric revisions", async () => {
    const planner = context(); savePlannerDraft(localStorage, planner); const lock = serialLock();
    const initial = await writeProgram(localStorage, planner, null, () => createProgramDraft(planner), lock);
    const build = (title: string) => applyProgramAction(initial.program, { expectedRevision: 1, type: "add_custom", item: { id: "item", title, date: planner.startDate, slot: "morning", durationMinutes: null } }, planner);
    const results = await Promise.allSettled([writeProgram(localStorage, planner, initial.raw, () => build("first"), lock), writeProgram(localStorage, planner, initial.raw, () => build("second"), lock)]);
    expect(results[0].status).toBe("fulfilled"); expect(results[1]).toMatchObject({ status: "rejected", reason: { code: "conflict" } });
    expect(readProgram(localStorage, planner).program?.plannedItems[0].title).toBe("first");
  });
  it("refuses a changed Planner before writing", async () => {
    const planner = context(); savePlannerDraft(localStorage, { ...planner, participants: 8 });
    await expect(writeProgram(localStorage, planner, null, () => createProgramDraft(planner), serialLock())).rejects.toMatchObject({ code: "planner_changed" });
    expect(localStorage.getItem(programStorageKey(planner.brand))).toBeNull();
  });
  it("does not confirm writes when storage fails", async () => {
    const planner = context(); savePlannerDraft(localStorage, planner);
    const broken = { getItem: (key: string) => localStorage.getItem(key), setItem: () => { throw new Error("quota"); } } as unknown as Storage;
    await expect(writeProgram(broken, planner, null, () => createProgramDraft(planner), serialLock())).rejects.toThrow("quota");
  });
  it("orders New trip after an in-flight program write, clears only that brand and prevents resurrection", async () => {
    const planner = context(); const other = context("byebride"); savePlannerDraft(localStorage, planner); savePlannerDraft(localStorage, other);
    const lock = serialLock(); const oldOther = JSON.stringify(createProgramDraft(other));
    localStorage.setItem(programStorageKey(other.brand), oldOther);
    await Promise.all([writeProgram(localStorage, planner, null, () => createProgramDraft(planner), lock), resetPlannerAndProgram(localStorage, planner.brand, lock)]);
    expect(localStorage.getItem(programStorageKey(planner.brand))).toBeNull();
    expect(localStorage.getItem(programStorageKey(other.brand))).toBe(oldOther);
    expect(JSON.parse(localStorage.getItem(getPlannerStorageKey(planner.brand))!).status).toBe("draft");
    await expect(writeProgram(localStorage, planner, null, () => createProgramDraft(planner), lock)).rejects.toMatchObject({ code: "planner_changed" });
  });
});
