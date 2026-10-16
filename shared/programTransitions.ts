import { plannerReviewSchema, type PlannerDraft } from "./plannerSchemas";
import { programActionSchema, programDraftSchema, type ProgramDraft } from "./programSchemas";

export class ProgramTransitionError extends Error {
  constructor(public readonly code: "different_planner" | "stale_program" | "review_required" | "unknown_idea" | "unknown_item" | "duplicate_position" | "revision_exhausted") {
    super(code); this.name = "ProgramTransitionError";
  }
}

function basisFor(planner: PlannerDraft) {
  return { origin: planner.origin!.canonical, destination: planner.destination!.canonical,
    startDate: planner.startDate!, endDate: planner.endDate!, participants: planner.participants! };
}
function sourceFor(planner: PlannerDraft) {
  return { brand: planner.brand, createdAt: planner.createdAt, updatedAt: planner.updatedAt };
}
function nextRevision(program: ProgramDraft) {
  if (program.revision === Number.MAX_SAFE_INTEGER) throw new ProgramTransitionError("revision_exhausted");
  return program.revision + 1;
}

/** Creates an empty independent proposal. Preferences never become scheduled items. */
export function createProgramDraft(rawPlanner: unknown): ProgramDraft {
  const planner = plannerReviewSchema.parse(rawPlanner);
  return programDraftSchema.parse({ version: 1, kind: "editorial_program", sourcePlanner: sourceFor(planner),
    basis: basisFor(planner), revision: 1, ideas: [], plannedItems: [] });
}

export function assessProgramContext(rawProgram: unknown, rawPlanner: unknown) {
  const program = programDraftSchema.parse(rawProgram); const planner = plannerReviewSchema.parse(rawPlanner);
  const samePlanner = program.sourcePlanner.brand === planner.brand && program.sourcePlanner.createdAt === planner.createdAt;
  const basis = basisFor(planner);
  return {
    samePlanner,
    contextChanged: JSON.stringify(program.basis) !== JSON.stringify(basis),
    plannerChanged: program.sourcePlanner.updatedAt !== planner.updatedAt,
    invalidItemIds: program.plannedItems.filter((item) => item.date < basis.startDate || item.date > basis.endDate).map((item) => item.id),
  };
}

/** Pure, validated intent transitions. No storage, clocks, AI or provider calls. */
export function applyProgramAction(rawProgram: unknown, rawAction: unknown, rawPlanner: unknown): ProgramDraft {
  const program = programDraftSchema.parse(rawProgram); const action = programActionSchema.parse(rawAction);
  const planner = plannerReviewSchema.parse(rawPlanner); const assessment = assessProgramContext(program, planner);
  if (!assessment.samePlanner) throw new ProgramTransitionError("different_planner");
  if (action.expectedRevision !== program.revision) throw new ProgramTransitionError("stale_program");
  if (assessment.contextChanged && action.type !== "rebase_program") throw new ProgramTransitionError("review_required");
  let next: ProgramDraft = { ...program, revision: nextRevision(program) };
  switch (action.type) {
    case "set_ideas":
      next.ideas = action.ideas;
      break;
    case "add_from_idea": {
      const idea = program.ideas.find((item) => item.id === action.ideaId);
      if (!idea) throw new ProgramTransitionError("unknown_idea");
      next.plannedItems = [...program.plannedItems, { id: action.itemId, ideaId: idea.id, title: idea.title,
        date: action.date, slot: action.slot, durationMinutes: idea.durationMinutes,
        provenance: idea.provenance, feasibility: "not_checked", userEdited: false }];
      break;
    }
    case "add_custom":
      next.plannedItems = [...program.plannedItems, { ...action.item, ideaId: null, provenance: { kind: "user" }, feasibility: "not_checked", userEdited: false }];
      break;
    case "edit_item":
      if (!program.plannedItems.some((item) => item.id === action.itemId)) throw new ProgramTransitionError("unknown_item");
      // Undefined cannot erase required data when invoked by an in-process caller.
      const patch = Object.fromEntries(Object.entries(action.patch).filter(([, value]) => value !== undefined));
      next.plannedItems = program.plannedItems.map((item) => item.id === action.itemId ? { ...item, ...patch, userEdited: true } : item);
      break;
    case "remove_item":
      if (!program.plannedItems.some((item) => item.id === action.itemId)) throw new ProgramTransitionError("unknown_item");
      next.plannedItems = program.plannedItems.filter((item) => item.id !== action.itemId);
      break;
    case "rebase_program": {
      const ids = new Set<string>();
      for (const position of action.positions) {
        if (ids.has(position.itemId)) throw new ProgramTransitionError("duplicate_position");
        if (!program.plannedItems.some((item) => item.id === position.itemId)) throw new ProgramTransitionError("unknown_item");
        ids.add(position.itemId);
      }
      next.sourcePlanner = sourceFor(planner); next.basis = basisFor(planner);
      next.plannedItems = program.plannedItems.map((item) => {
        const position = action.positions.find((entry) => entry.itemId === item.id);
        return position ? { ...item, date: position.date, slot: position.slot, userEdited: true } : item;
      });
      break;
    }
  }
  return programDraftSchema.parse(next);
}
