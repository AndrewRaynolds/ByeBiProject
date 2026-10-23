import { getCityDefinition, getCityDefinitionByKey } from "@shared/cityMapping";
import { applyPlannerUpdate, getMissingPlannerFields, plannerDraftSchema, type PlannerDraft } from "@shared/plannerSchemas";
import { rankDestinationIdeas, plannerActionSchema, plannerSuggestionsSchema, type DestinationIdeaId } from "@shared/plannerSuggestions";
import { buildPlannerFollowUp } from "./plannerConversation";

export function buildDestinationSuggestions(planner: PlannerDraft, seenIds: DestinationIdeaId[] = []) {
  const originKey = getCityDefinition(planner.origin?.canonical)?.key;
  const eligible = rankDestinationIdeas(planner).filter((id) => id !== originKey);
  const unseen = eligible.filter((id) => !seenIds.includes(id));
  const ids = planner.destination || planner.status !== "draft" ? [] : (unseen.length ? unseen : eligible).slice(0, 2);
  return plannerSuggestionsSchema.parse({ version: 1, brand: planner.brand,
    plannerCreatedAt: planner.createdAt, plannerUpdatedAt: planner.updatedAt, destinationIds: ids });
}

/** A typed user action, never an AI interpretation or automatic destination choice. */
export function handlePlannerAction(rawPlanner: unknown, rawAction: unknown, locale: "it" | "en" | "es") {
  const current = plannerDraftSchema.parse(rawPlanner);
  const action = plannerActionSchema.parse(rawAction);
  if (current.destination || current.status !== "draft") throw new Error("Destination already chosen");
  if (action.type === "suggest_destinations") {
    const content = { it: "Ecco alcuni spunti editoriali da confrontare. Scegli una meta solo se ti convince: prezzi e disponibilità vanno verificati sui partner.",
      en: "Here are some editorial ideas to compare. Choose a destination only if it appeals to you: check prices and availability with the partners.",
      es: "Aquí tienes algunas ideas editoriales para comparar. Elige un destino solo si te convence: comprueba precios y disponibilidad con los socios." }[locale];
    return { content, suggestions: buildDestinationSuggestions(current, action.seenIds) };
  }
  const city = getCityDefinitionByKey(action.destinationId);
  if (!city || getCityDefinition(current.origin?.canonical)?.key === city.key) throw new Error("Invalid destination choice");
  const planner = applyPlannerUpdate(current, { origin: null, destination: city.canonical, startDate: null,
    endDate: null, participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null });
  return { planner, missingFields: getMissingPlannerFields(planner),
    content: buildPlannerFollowUp(planner, locale, current), suggestions: buildDestinationSuggestions(planner) };
}
