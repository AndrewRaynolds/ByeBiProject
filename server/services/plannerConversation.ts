import { getMissingPlannerFields, type PlannerDraft } from "@shared/plannerSchemas";

type Locale = "it" | "en" | "es";
const copy = {
  it: {
    updated: "Ho aggiornato il riepilogo con i dettagli che hai indicato.",
    budget: "Ho aggiornato il budget per persona per l’intero viaggio.",
    clearedBudget: "Ho tolto il budget: possiamo continuare senza indicarlo.",
    preferences: "Ho aggiornato le preferenze del gruppo.",
    clearedPreferences: "Ho tolto le preferenze del gruppo.",
    ready: "Il tuo travel brief è pronto. Controlla i dettagli e modificali se serve.",
    origin: "Partiamo dal percorso: da quale città partite?",
    destination: "Possiamo confrontare alcune idee per la meta, da verificare insieme. Quale destinazione ti incuriosisce?",
    dates: "Per dare forma al viaggio, quali sono le date di partenza e ritorno?",
    startDate: "Abbiamo già il ritorno: in che giorno vorreste partire?",
    endDate: "Abbiamo già la partenza: in che giorno vorreste tornare?",
    participants: "Per completare il riepilogo, quante persone partecipano?",
  },
  en: {
    updated: "I've updated the brief with the details you shared.",
    budget: "I've updated the budget per person for the whole trip.",
    clearedBudget: "I've removed the budget: we can continue without one.",
    preferences: "I've updated the group's preferences.",
    clearedPreferences: "I've removed the group's preferences.",
    ready: "Your travel brief is ready. Review the details and edit anything you need.",
    origin: "Let's start with the route: which city are you departing from?",
    destination: "We can compare some destination ideas to check together. Which destination appeals to you?",
    dates: "To shape the trip, what are your departure and return dates?",
    startDate: "We already have the return date: which day would you like to leave?",
    endDate: "We already have the departure date: which day would you like to return?",
    participants: "To complete the brief, how many people are traveling?",
  },
  es: {
    updated: "He actualizado el resumen con los datos que has compartido.",
    budget: "He actualizado el presupuesto por persona para todo el viaje.",
    clearedBudget: "He quitado el presupuesto: podemos continuar sin indicarlo.",
    preferences: "He actualizado las preferencias del grupo.",
    clearedPreferences: "He quitado las preferencias del grupo.",
    ready: "Tu resumen de viaje está listo. Revisa los datos y modifica lo que necesites.",
    origin: "Empecemos por el trayecto: ¿desde qué ciudad salís?",
    destination: "Podemos comparar algunas ideas de destino para comprobar juntos. ¿Qué destino te apetece?",
    dates: "Para dar forma al viaje, ¿cuáles son las fechas de salida y regreso?",
    startDate: "Ya tenemos la vuelta: ¿qué día queréis salir?",
    endDate: "Ya tenemos la salida: ¿qué día queréis volver?",
    participants: "Para completar el resumen, ¿cuántas personas viajan?",
  },
};

/** Only validated intent is acknowledged; suggestions never mutate the Planner. */
export function buildPlannerFollowUp(planner: PlannerDraft, locale: Locale, previous?: PlannerDraft): string {
  const strings = copy[locale];
  const changed = ["origin", "destination", "startDate", "endDate", "participants", "budgetPerPerson", "preferences"]
    .filter((field) => {
      const key = field as keyof PlannerDraft;
      const before = previous?.[key] ?? null;
      return JSON.stringify(before) !== JSON.stringify(planner[key]);
    });
  let acknowledgement = changed.length ? strings.updated : "";
  if (changed.length === 1 && changed[0] === "budgetPerPerson") {
    acknowledgement = planner.budgetPerPerson === null ? strings.clearedBudget : strings.budget;
  } else if (changed.length === 1 && changed[0] === "preferences") {
    acknowledgement = planner.preferences === null ? strings.clearedPreferences : strings.preferences;
  }
  const next = getMissingPlannerFields(planner)[0];
  const question = next === "startDate" && !planner.endDate ? strings.dates
    : next ? strings[next as "origin" | "destination" | "startDate" | "endDate" | "participants"]
      : strings.ready;
  // Name only values actually changed in the validated brief. No model-generated claims.
  if (changed.length === 1 && changed[0] === "origin" && planner.origin) {
    acknowledgement = { it: `Ho aggiornato la partenza: ${planner.origin.canonical}.`, en: `We'll set off from ${planner.origin.canonical}.`, es: `Saldremos desde ${planner.origin.canonical}.` }[locale];
  } else if (changed.length === 1 && changed[0] === "destination" && planner.destination) {
    acknowledgement = { it: `${planner.destination.canonical}, prendiamo questa come meta da esplorare insieme.`, en: `${planner.destination.canonical}, let's explore that idea together.`, es: `${planner.destination.canonical}, exploremos esa idea juntos.` }[locale];
  } else if (changed.length === 1 && changed[0] === "participants" && planner.participants) {
    acknowledgement = { it: `Sarete in ${planner.participants}: il gruppo prende forma.`, en: `${planner.participants} of you: the group is taking shape.`, es: `Seréis ${planner.participants}: el grupo va tomando forma.` }[locale];
  }
  // A ready brief needs no extra acknowledgement or additional question.
  return next ? [acknowledgement, question].filter(Boolean).join(" ") : strings.ready;
}
