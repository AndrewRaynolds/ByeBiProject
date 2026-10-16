import { plannerReviewSchema, type PlannerDraft } from "@shared/plannerSchemas";
import { budgetAllocationSchema, createBudgetAllocation } from "@shared/budgetAllocationSchemas";
import { getPlannerStorageKey } from "./plannerStorage";
import { browserProgramLock, ProgramStorageError, type ProgramLock } from "./programStorage";
import { budgetAllocationStorageKey, programStorageKey } from "./planningDraftKeys";

export function readBudgetAllocation(storage: Storage, planner: PlannerDraft) {
  const raw = storage.getItem(budgetAllocationStorageKey(planner.brand));
  if (raw === null) return { kind: "empty" as const, raw, allocation: null };
  try {
    const value = budgetAllocationSchema.safeParse(JSON.parse(raw));
    if (!value.success) return { kind: "invalid" as const, raw, allocation: null };
    const same = value.data.sourcePlanner.brand === planner.brand && value.data.sourcePlanner.createdAt === planner.createdAt;
    return { kind: same ? "ready" as const : "foreign" as const, raw, allocation: same ? value.data : null };
  } catch { return { kind: "invalid" as const, raw, allocation: null }; }
}

export function writeBudgetAllocation(storage: Storage, planner: PlannerDraft, expectedRaw: string | null, amounts: unknown, lock: ProgramLock = browserProgramLock) {
  // Shared with program writes and New trip so reset cannot race either draft.
  return lock(programStorageKey(planner.brand), () => {
    const active = plannerReviewSchema.safeParse(JSON.parse(storage.getItem(getPlannerStorageKey(planner.brand)) ?? "null"));
    if (!active.success || JSON.stringify(active.data) !== JSON.stringify(plannerReviewSchema.parse(planner))) throw new ProgramStorageError("planner_changed");
    const current = readBudgetAllocation(storage, planner);
    if (current.raw !== expectedRaw) throw new ProgramStorageError("conflict");
    const allocation = createBudgetAllocation(planner, amounts, current.allocation ?? undefined);
    const raw = JSON.stringify(allocation);
    storage.setItem(budgetAllocationStorageKey(planner.brand), raw);
    return { kind: "ready" as const, raw, allocation };
  });
}
