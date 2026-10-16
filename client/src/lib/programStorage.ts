import { plannerReviewSchema, type PlannerBrand, type PlannerDraft } from "@shared/plannerSchemas";
import { programDraftSchema, type ProgramDraft } from "@shared/programSchemas";
import { getPlannerStorageKey, startNewPlannerTrip } from "./plannerStorage";

import { programStorageKey, budgetAllocationStorageKey } from "./planningDraftKeys";
export { programStorageKey } from "./planningDraftKeys";
export type ProgramLock = <T>(name: string, work: () => T) => Promise<T>;
export class ProgramStorageError extends Error {
  constructor(public readonly code: "unsupported" | "conflict" | "planner_changed") { super(code); }
}
export const browserProgramLock: ProgramLock = (name, work) => {
  if (!navigator.locks) return Promise.reject(new ProgramStorageError("unsupported"));
  return navigator.locks.request(name, { mode: "exclusive" }, work);
};

export function readProgram(storage: Storage, planner: PlannerDraft) {
  const raw = storage.getItem(programStorageKey(planner.brand));
  if (raw === null) return { raw, kind: "empty" as const, program: null };
  try {
    const parsed = programDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { raw, kind: "invalid" as const, program: null };
    const same = parsed.data.sourcePlanner.brand === planner.brand && parsed.data.sourcePlanner.createdAt === planner.createdAt;
    return { raw, kind: same ? "ready" as const : "foreign" as const, program: same ? parsed.data : null };
  } catch { return { raw, kind: "invalid" as const, program: null }; }
}

/** Lock + raw compare protects even branches with equal numeric revisions. No implicit retries. */
export function writeProgram(storage: Storage, planner: PlannerDraft, expectedRaw: string | null,
  build: () => ProgramDraft, lock: ProgramLock = browserProgramLock) {
  return lock(programStorageKey(planner.brand), () => {
    const active = plannerReviewSchema.safeParse(JSON.parse(storage.getItem(getPlannerStorageKey(planner.brand)) ?? "null"));
    if (!active.success || JSON.stringify(active.data) !== JSON.stringify(plannerReviewSchema.parse(planner))) throw new ProgramStorageError("planner_changed");
    if (storage.getItem(programStorageKey(planner.brand)) !== expectedRaw) throw new ProgramStorageError("conflict");
    const next = programDraftSchema.parse(build());
    if (next.sourcePlanner.brand !== planner.brand || next.sourcePlanner.createdAt !== planner.createdAt) throw new ProgramStorageError("planner_changed");
    const raw = JSON.stringify(next);
    storage.setItem(programStorageKey(planner.brand), raw);
    return { raw, program: next, kind: "ready" as const };
  });
}

export async function resetPlannerAndProgram(storage: Storage, brand: PlannerBrand, lock?: ProgramLock) {
  const work = () => {
    storage.removeItem(programStorageKey(brand));
    storage.removeItem(budgetAllocationStorageKey(brand));
    return startNewPlannerTrip(storage, brand);
  };
  // Unsupported browsers cannot write programs; core New trip remains usable there.
  return lock ? lock(programStorageKey(brand), work)
    : navigator.locks ? browserProgramLock(programStorageKey(brand), work) : work();
}
