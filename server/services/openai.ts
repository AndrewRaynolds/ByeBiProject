import OpenAI from "openai";
import { ZodError } from "zod";
import { buildAviasalesUrl, getAviasalesAdultCount } from "@shared/flightSchemas";
import { calculateTripDays, isValidDateRange, normalizeTripDate } from "@shared/dateUtils";
import { resolveIataCode } from "./cityMapping";
import { getSafeErrorMetadata } from "../safeError";
import { buildPlannerFollowUp } from "./plannerConversation";
import {
  applyPlannerUpdate,
  createPlannerDraft,
  getMissingPlannerFields,
  getLocalDateOnly,
  plannerDraftSchema,
  plannerUpdateArgumentsSchema,
  type PlannerDraft,
} from "@shared/plannerSchemas";

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.log(...args);
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatContext {
  locale?: "it" | "en" | "es";
  planner?: PlannerDraft;
  selectedDestination?: string;
  tripDetails?: {
    people: number;
    days: number;
    adventureType: string;
    startDate?: string;
    endDate?: string;
  };
  conversationState?: {
    currentStep: string;
  };
  partyType?: "bachelor" | "bachelorette";
  origin?: string;
  originCityName?: string;

}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export type StreamChunk =
  | { type: "content"; content: string }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "tool_result"; name: string; result: Record<string, unknown> };

export function enforceSelectedDestination(
  toolCall: ToolCall,
  context: ChatContext,
): ToolCall {
  if (
    !(context.planner?.destination?.canonical || context.selectedDestination) ||
    toolCall.name !== "search_flights"
  ) {
    return toolCall;
  }

  const destination = context.planner?.destination?.canonical ?? context.selectedDestination;
  return {
    ...toolCall,
    arguments: {
      ...toolCall.arguments,
      destination,
    },
  };
}

type ToolValidationResult = {
  validToolCalls: ToolCall[];
  clarification?: string;
};

function isValidISODate(value: string): boolean {
  return normalizeTripDate(value) === value;
}

// Return field identifiers only: Zod messages/inputs can contain private user data.
function plannerErrorFields(error: ZodError): string[] {
  const allowed = new Set(["origin", "destination", "startDate", "endDate", "participants", "budgetPerPerson", "preferenceArchetype", "interests", "preferences", "clearFields"]);
  return [...new Set(error.issues.map(issue => String(issue.path[0])).filter(field => allowed.has(field)))];
}

function validateToolCall(toolCall: ToolCall): { valid: boolean; message?: string; fields?: string[] } {
  const args = toolCall.arguments || {};

  switch (toolCall.name) {
    case "update_planner": {
      const parsed = plannerUpdateArgumentsSchema.safeParse(args);
      return parsed.success
        ? { valid: true }
        : { valid: false, message: "Correct only the invalid fields using explicit user details; preserve all other values.", fields: plannerErrorFields(parsed.error) };
    }
    case "search_flights": {
      const origin = typeof args.origin === "string" ? args.origin.trim() : "";
      const destination = typeof args.destination === "string" ? args.destination.trim() : "";
      let depDate = typeof args.departure_date === "string" ? args.departure_date.trim() : "";
      let retDate = typeof args.return_date === "string" ? args.return_date.trim() : "";
      const passengers = Number(args.passengers);
      
      if (!origin || !destination) {
        return {
          valid: false,
          message: "I need both the departure city and destination to search flights.",
        };
      }
      const originIata = resolveIataCode(origin);
      const destinationIata = resolveIataCode(destination);
      if (originIata && destinationIata && originIata === destinationIata) {
        return {
          valid: false,
          message: "I still need your departure city; it must be different from the destination.",
        };
      }
      if (!depDate || !retDate || !isValidISODate(depDate) || !isValidISODate(retDate)) {
        return {
          valid: false,
          message: "I need your travel dates to search flights. When are you going and coming back?",
        };
      }
      if (!isValidDateRange(depDate, retDate) || calculateTripDays(depDate, retDate) > 30) {
        return {
          valid: false,
          message: "The return date must be after departure and the trip cannot exceed 30 days.",
        };
      }

      const today = new Date().toISOString().slice(0, 10);
      if (depDate < today) {
        const [y, m, d] = depDate.split("-").map(Number);
        const [ry, rm, rd] = retDate.split("-").map(Number);
        const tripDays = Math.round((new Date(ry, rm - 1, rd).getTime() - new Date(y, m - 1, d).getTime()) / 86400000);
        const nowYear = new Date().getFullYear();
        let newYear = nowYear;
        const candidateDate = `${newYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (candidateDate < today) newYear++;
        depDate = `${newYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const newEnd = new Date(newYear, m - 1, d + (tripDays > 0 ? tripDays : 5));
        retDate = newEnd.toISOString().slice(0, 10);
        args.departure_date = depDate;
        args.return_date = retDate;
        debugLog(`📅 Auto-corrected past dates → dep: ${depDate}, ret: ${retDate}`);
      }

      if (!Number.isInteger(passengers) || passengers <= 0 || passengers > 50) {
        return {
          valid: false,
          message: "How many people are traveling? ByeBi supports groups from 1 to 50 people.",
        };
      }
      return { valid: true };
    }
    default:
      return { valid: false, message: "Can you clarify what you'd like to do?" };
  }
}

function validateToolCalls(toolCalls: ToolCall[]): ToolValidationResult {
  const validToolCalls: ToolCall[] = [];
  let clarification: string | undefined;

  for (const toolCall of toolCalls) {
    const validation = validateToolCall(toolCall);
    if (validation.valid) {
      validToolCalls.push(toolCall);
      continue;
    }
    if (!clarification && validation.message) {
      clarification = validation.message;
    }
  }

  return { validToolCalls, clarification };
}

/**
 * Execute a tool call and return the result.
 * This function is used by the server-side tool loop to execute tools
 * and feed results back to OpenAI for natural conversation continuation.
 */
export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  context: ChatContext
): Promise<Record<string, unknown>> {
  args = enforceSelectedDestination({ name, arguments: args }, context).arguments;

  switch (name) {
    case "update_planner": {
      const update = plannerUpdateArgumentsSchema.safeParse(args);
      if (!update.success) return { error: "Invalid planner update", fields: plannerErrorFields(update.error) };
      const invalidDates = (["startDate", "endDate"] as const).filter(field =>
        update.data[field] !== null && !normalizeTripDate(update.data[field]!),
      );
      if (invalidDates.length) return { error: "Invalid planner details", fields: invalidDates };
      try {
        const current = context.planner ?? createPlannerDraft({
          brand: context.partyType === "bachelorette" ? "byebride" : "byebro",
          partyType: context.partyType,
        });
        const planner = applyPlannerUpdate(current, update.data);
        return { planner, missingFields: getMissingPlannerFields(planner) };
      } catch (error) {
        return { error: "Invalid planner details", fields: error instanceof ZodError ? plannerErrorFields(error) : [] };
      }
    }
    case "search_flights": {
      const originCity = typeof args.origin === "string" ? args.origin : "";
      const destCity = typeof args.destination === "string" ? args.destination : "";
      const originIata = resolveIataCode(originCity);
      const destIata = resolveIataCode(destCity);
      const groupSize = typeof args.passengers === "number" ? args.passengers : 0;
      const departureDate = typeof args.departure_date === "string" ? args.departure_date : "";
      const returnDate = typeof args.return_date === "string" ? args.return_date : undefined;

      if (!originIata || !destIata) {
        return { error: "Unsupported origin or destination" };
      }

      const checkoutAdults = getAviasalesAdultCount(groupSize);
      if (!checkoutAdults) {
        return { error: "Invalid passenger count" };
      }

      const checkoutUrl = buildAviasalesUrl({
        originIata,
        destinationIata: destIata,
        departDate: departureDate,
        returnDate,
        adults: checkoutAdults,
        partnerId: process.env.AVIASALES_PARTNER_ID || "byebi",
      });
      if (!checkoutUrl) return { error: "Invalid flight checkout parameters" };

      return {
        checkoutReady: true,
        checkoutUrl,
        origin: originIata,
        destination: destIata,
        groupSize,
        checkoutAdults,
        groupBookingRequired: groupSize > checkoutAdults,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

const TRIP_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_planner",
      strict: true,
      description:
        "Merge explicitly provided trip details into the planner. Call after interpreting any new planner detail; use null for every value that is still unknown.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: ["string", "null"], description: "Departure city, or null if unknown" },
          destination: { type: ["string", "null"], description: "Destination city, or null if unknown" },
          startDate: { type: ["string", "null"], description: "Start date as YYYY-MM-DD, or null" },
          endDate: { type: ["string", "null"], description: "End date as YYYY-MM-DD, or null" },
          participants: { type: ["integer", "null"], description: "Group size, or null" },
          budgetPerPerson: { type: ["integer", "null"], description: "Budget in EUR per person, never total group budget, or null" },
          preferenceArchetype: { type: ["string", "null"], description: "Group experience archetype, or null" },
          interests: { type: ["array", "null"], items: { type: "string" }, description: "Explicit group interests, or null" },
          clearFields: { type: ["array", "null"], items: { type: "string", enum: ["budgetPerPerson", "preferences"] }, maxItems: 2, description: "Only fields the user explicitly asks to remove. Use null for their corresponding update values. Empty array when nothing is being removed." },
        },
        required: ["origin", "destination", "startDate", "endDate", "participants", "budgetPerPerson", "preferenceArchetype", "interests", "clearFields"],
        additionalProperties: false,
      },
    },
  },
];

const SHARED_SYSTEM_PROMPT = `DESTINATIONS: Rome, Ibiza, Barcelona, Prague, Budapest, Krakow, Amsterdam, Berlin, Lisbon, Palma de Mallorca

RULES:
- Required details: departure city, destination, start date, end date, and participants.
- Budget per person and group preferences/experience archetype are optional. Preserve them if volunteered, but never ask for them or delay the travel brief because they are unknown. They are optional notes, not filters applied to external partner searches.
- NEVER assume departure city, budget, or preferences. Budget always means EUR PER PERSON, never the group total.
- A volunteered amount with unclear scope needs one clarification before applying it. For a group total, propose the per-person calculation and await explicit confirmation before updating budgetPerPerson. Qualitative words such as cheap/medium/high are not numeric budgets; never convert them into amounts. Never silently round or convert a currency.
- If the user explicitly removes budget or preferences, call update_planner with clearFields naming only those fields and null for their corresponding update values. Otherwise clearFields is empty; ordinary null values preserve existing details.
- NEVER mention date formats. Accept natural language dates ("June 10-14", "next weekend", "primo weekend di luglio") and convert to YYYY-MM-DD internally. When user says a month without a year, use the NEXT occurrence of that month (never a past date).
- Call update_planner once when the user supplies or changes planner details. Send only changed values; null preserves known values. After a tool error, correct only the reported fields if the user's message/history supports the correction; otherwise ask one targeted question. Never repeat a failed call unchanged. For a retry request, recover explicitly supplied details from recent user messages that are still missing in CURRENT PLANNER and call update_planner once if there are any. A retry request does not authorize changing destination or other known details.
- Recognize what the user has shared and help them move forward, instead of listing fields to fill in. Ask at most one useful question per turn and never re-ask a known detail. When no essential fields are missing, say the brief is ready for review without asking more questions.
- If the user is undecided, offer up to two destination ideas from the supported destinations with an editorial reason, then one useful question. Explain they are inspiration to verify, not offers. Never write a suggestion into the Planner unless the user chooses it. Do not infer interests from the party type or brand. All editorial styles are available to both brands. Use explicitly confirmed preferences as optional intent notes; never claim they filter partner searches or represent scheduled or bookable activities.
- NEVER output text alongside a tool call. When calling a tool, output ONLY the tool call with zero accompanying text.
- Concise: 2-3 sentences max. Friendly startup tone. No jargon.
- Do not search providers, invent prices, flights, hotels, activities, availability, or offers.

TOOLS:
- update_planner: validates and persists only the planner brief. It never calls a travel provider.`;

const BYEBRO_SYSTEM_PROMPT = `You are the ByeBro planner for bachelor party travel briefs.
Voice: friendly, direct and playfully collaborative. Help the group build shared complicity; invite rather than pressure.

${SHARED_SYSTEM_PROMPT}`;

const BYEBRIDE_SYSTEM_PROMPT = `You are the ByeBride planner for bachelorette party travel briefs.
Voice: warm, attentive and imaginative. Help the group express what matters to the person being celebrated; invite rather than pressure.

${SHARED_SYSTEM_PROMPT}`;

function buildContextualPrompt(context: ChatContext): string {
  const basePrompt =
    context.partyType === "bachelorette"
      ? BYEBRIDE_SYSTEM_PROMPT
      : BYEBRO_SYSTEM_PROMPT;
  let contextualPrompt = `Today is ${getLocalDateOnly()}.\n\n${basePrompt}`;

  if (context.planner) {
    contextualPrompt += `\n\nCURRENT PLANNER (validated JSON; preserve known values unless the user changes them):\n${JSON.stringify(context.planner)}`;
    contextualPrompt += `\nMISSING FIELDS: ${getMissingPlannerFields(context.planner).join(", ") || "none"}`;
  }

  if (context.origin && context.originCityName) {
    contextualPrompt += `\n\nDEPARTURE CITY: ${context.originCityName} (airport code: ${context.origin})`;
  }

  if (context.selectedDestination) {
    contextualPrompt += `\n\nSELECTED DESTINATION: ${context.selectedDestination.toUpperCase()}`;

    if (context.tripDetails) {
      contextualPrompt += `\nTRIP DETAILS:`;
      if (context.tripDetails.people > 0)
        contextualPrompt += `\n- People: ${context.tripDetails.people}`;
      if (context.tripDetails.days > 0)
        contextualPrompt += `\n- Days: ${context.tripDetails.days}`;
      if (context.tripDetails.adventureType)
        contextualPrompt += `\n- Type: ${context.tripDetails.adventureType}`;
    }
  }

  if (context.locale) {
    const language = { it: "Italian", en: "English", es: "Spanish" }[context.locale];
    contextualPrompt += `\n\nRESPONSE LANGUAGE: Always respond in ${language}, the selected interface language. This is the single authoritative language rule and overrides user-message language and all conversation history, including earlier assistant replies. A locale change applies immediately to the next response. Short replies, numbers, destination names and tool results must not change the response language.`;
  } else {
    contextualPrompt += "\n\nRESPONSE LANGUAGE: Respond in the language of the user's latest unambiguous message. For short or ambiguous replies, preserve the last recognizable user language.";
  }

  return contextualPrompt;
}

export async function createOpenAIChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  try {
    const contextualPrompt = buildContextualPrompt(context);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: contextualPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: "gpt-4o-mini",
      tools: TRIP_TOOLS,
      tool_choice: "auto",
    });

    const message = chatCompletion.choices[0]?.message;
    const content = message?.content || "";
    const toolCalls: ToolCall[] = [];

    if (message?.tool_calls) {
      for (const tc of message.tool_calls) {
        if (tc.type !== "function") continue;
        try {
          toolCalls.push({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || "{}"),
          });
        } catch (e) {
          console.error("Error parsing tool call arguments", getSafeErrorMetadata(e));
        }
      }
    }

    const { validToolCalls, clarification } = validateToolCalls(toolCalls);
    let finalContent = content;
    if (clarification) {
      finalContent = finalContent.trim()
        ? `${finalContent}\n\n${clarification}`
        : clarification;
    }

    // If no content was returned, generate a quick follow-up without a second API call
    if (!finalContent.trim() && validToolCalls.length > 0 && !clarification) {
      finalContent = generateFollowUpMessage(validToolCalls);
    }

    return { content: finalContent, toolCalls: validToolCalls };
  } catch (error) {
    console.error("OpenAI API error", getSafeErrorMetadata(error));
    throw new Error("Error communicating with OpenAI");
  }
}

export async function* streamOpenAIChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
): AsyncGenerator<StreamChunk, void, unknown> {
  try {
    const contextualPrompt = buildContextualPrompt(context);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: contextualPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    const stream = await openai.chat.completions.create({
      messages,
      model: "gpt-4o-mini",
      stream: true,
      tools: TRIP_TOOLS,
      tool_choice: "auto",
    });

    const toolCallsBuffer: Map<number, { name: string; arguments: string }> =
      new Map();
    let hasContent = false;
    const collectedToolCalls: ToolCall[] = [];
    let pendingClarification: string | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        hasContent = true;
        yield { type: "content", content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallsBuffer.has(idx)) {
            toolCallsBuffer.set(idx, { name: "", arguments: "" });
          }
          const buffer = toolCallsBuffer.get(idx)!;
          if (tc.function?.name) {
            buffer.name = tc.function.name;
          }
          if (tc.function?.arguments) {
            buffer.arguments += tc.function.arguments;
          }
        }
      }

      if (
        chunk.choices[0]?.finish_reason === "tool_calls" ||
        chunk.choices[0]?.finish_reason === "stop"
      ) {
        const entries = Array.from(toolCallsBuffer.entries());
        for (const [, buffer] of entries) {
          if (buffer.name) {
            try {
              const args = buffer.arguments ? JSON.parse(buffer.arguments) : {};
              const toolCall = { name: buffer.name, arguments: args };
              const validation = validateToolCall(toolCall);
              if (validation.valid) {
                collectedToolCalls.push(toolCall);
                yield { type: "tool_call", toolCall };
              } else if (!pendingClarification && validation.message) {
                pendingClarification = validation.message;
              }
            } catch (e) {
              console.error("Error parsing streamed tool call", getSafeErrorMetadata(e));
            }
          }
        }
        toolCallsBuffer.clear();
      }
    }

    // If the model didn't produce any text content, generate a quick follow-up
    // without making another API call (which would defeat the purpose of streaming)
    if (!hasContent) {
      if (pendingClarification) {
        yield { type: "content", content: pendingClarification };
      } else if (collectedToolCalls.length > 0) {
        // Use local follow-up generation instead of a second API call
        const fallbackContent = generateFollowUpMessage(collectedToolCalls);
        yield { type: "content", content: fallbackContent };
      }
    }
  } catch (error) {
    console.error("OpenAI streaming error", getSafeErrorMetadata(error));
    yield {
      type: "content",
      content:
        "Sorry, there was a problem with the streaming. Please try again!",
    };
  }
}

function generateFollowUpMessage(toolCalls: ToolCall[]): string {
  const toolNames = new Set(toolCalls.map((tc) => tc.name));
  if (toolNames.has("update_planner")) {
    return "Planner details updated.";
  }
  if (toolNames.has("search_flights")) {
    return "Preparing your checkout...";
  }

  return "Got it! Anything else you'd like to share?";
}

export function detectUserLanguage(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
): string {
  const itPatterns = /\b(ciao|voglio|andare|siamo|partiamo|dal|al|persone|voli|quando|dove|prenota|perfetto|procedi)\b/;
  const esPatterns = /\b(hola|quiero|somos|salimos|del|personas|vuelos|cuando|donde|reservar|perfecto)\b/;
  const enPatterns = /\b(hello|want|from|people|flights|where|when|book|please|travel)\b/;
  // Legacy callers without a locale retain the last recognizable user language.
  const userTexts = [userMessage, ...[...conversationHistory].reverse()
    .filter((message) => message.role === "user").map((message) => message.content)];
  for (const message of userTexts) {
    const text = message.toLowerCase();
    if (itPatterns.test(text)) return "it";
    if (esPatterns.test(text)) return "es";
    if (enPatterns.test(text)) return "en";
  }
  return "en";
}

interface LocalStrings {
  noFlightsError: (o: string, d: string) => string;
  noFlights: (o: string, d: string) => string;
  requestIncomplete: string;
  requestError: string;
}

const STRINGS: Record<string, LocalStrings> = {
  it: {
    noFlightsError: (o, d) => `Non sono riuscito a preparare il collegamento da ${o} a ${d}. Controlla città e date, poi riprova.`,
    noFlights: (o, d) => `Ho preparato il viaggio da ${o} a ${d}. Ti porto al checkout: sceglierai il volo direttamente su Aviasales.`,
    requestIncomplete: "Non sono riuscito a completare la richiesta. Riprova.",
    requestError: "Si è verificato un problema. Riprova.",
  },
  en: {
    noFlightsError: (o, d) => `I couldn't prepare the connection from ${o} to ${d}. Check the cities and dates, then try again.`,
    noFlights: (o, d) => `I've prepared your trip from ${o} to ${d}. Taking you to checkout so you can choose the flight directly on Aviasales.`,
    requestIncomplete: "I couldn't complete the request. Please try again.",
    requestError: "There was a problem. Please try again.",
  },
  es: {
    noFlightsError: (o, d) => `No pude preparar la conexión de ${o} a ${d}. Comprueba las ciudades y las fechas e inténtalo de nuevo.`,
    noFlights: (o, d) => `He preparado tu viaje de ${o} a ${d}. Te llevo al checkout para elegir el vuelo directamente en Aviasales.`,
    requestIncomplete: "No pude completar la solicitud. Inténtalo de nuevo.",
    requestError: "Se ha producido un problema. Inténtalo de nuevo.",
  },
};

export function getDeterministicPlannerFollowUp(
  planner: PlannerDraft,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  locale?: ChatContext["locale"],
  previousPlanner?: PlannerDraft,
): string {
  const lang = locale ?? detectUserLanguage(userMessage, conversationHistory);
  return buildPlannerFollowUp(planner, lang === "it" || lang === "es" ? lang : "en", previousPlanner);
}

function generateLocalToolResponse(
  toolResults: Array<{ name: string; result: Record<string, unknown>; args: Record<string, unknown> }>,
  context: ChatContext,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  previousPlanner?: PlannerDraft,
): string | null {
  const lang = context.locale ?? detectUserLanguage(userMessage, conversationHistory);
  const s = STRINGS[lang] || STRINGS.en;

  for (const { name, result, args } of [...toolResults].reverse()) {
    switch (name) {
      case "update_planner": {
        const parsed = plannerDraftSchema.safeParse(result.planner);
        if (parsed.success) {
          return getDeterministicPlannerFollowUp(parsed.data, userMessage, conversationHistory, context.locale, previousPlanner);
        }
        break;
      }
      case "search_flights": {
        const origin = (args.origin as string) || context.originCityName || "";
        const destination = (args.destination as string) || context.selectedDestination || "";
        return result.error ? s.noFlightsError(origin, destination) : s.noFlights(origin, destination);
      }

    }
  }
  return null;
}

function plannerCorrectionMessage(context: ChatContext, userMessage: string, history: ChatMessage[], fields: string[]): string {
  const lang = context.locale ?? detectUserLanguage(userMessage, history);
  const locale = lang === "it" || lang === "es" ? lang : "en";
  const field = fields[0];
  const key = field === "startDate" || field === "endDate" ? "dates"
    : field === "origin" || field === "destination" || field === "participants" ? field
    : field === "budgetPerPerson" ? "budget" : field ? "preferences" : "retry";
  const copy = {
    it: { dates: "Le date proposte non sono valide. Quali sono le date di partenza e ritorno, con l’anno?", origin: "Non ho potuto aggiornare la partenza. Da quale città partite?", destination: "Non ho potuto aggiornare la meta. Qual è la destinazione?", participants: "Quante persone partecipano, da 1 a 50?", budget: "Qual è il budget in euro per persona per l’intero viaggio?", preferences: "Quali preferenze vuoi modificare o rimuovere?", retry: "Non ho potuto interpretare l’aggiornamento. Puoi riscrivere il dettaglio che vuoi aggiungere o correggere?" },
    en: { dates: "The proposed dates are invalid. What are your departure and return dates, including the year?", origin: "I couldn't update the departure city. Which city are you departing from?", destination: "I couldn't update the destination. Where would you like to go?", participants: "How many people are traveling, from 1 to 50?", budget: "What is the budget in euros per person for the whole trip?", preferences: "Which preferences would you like to change or remove?", retry: "I couldn't interpret the update. Could you rephrase the detail you want to add or correct?" },
    es: { dates: "Las fechas propuestas no son válidas. ¿Cuáles son las fechas de salida y regreso, incluido el año?", origin: "No pude actualizar la salida. ¿Desde qué ciudad salís?", destination: "No pude actualizar el destino. ¿Adónde queréis ir?", participants: "¿Cuántas personas viajan, de 1 a 50?", budget: "¿Cuál es el presupuesto en euros por persona para todo el viaje?", preferences: "¿Qué preferencias quieres modificar o eliminar?", retry: "No pude interpretar la actualización. ¿Puedes reformular el dato que quieres añadir o corregir?" },
  };
  return copy[locale][key];
}

/**
 * New streaming function that implements the proper OpenAI function calling loop.
 * Instead of hard-coding follow-up messages, this function:
 * 1. Streams the initial response
 * 2. When tool calls are received, executes them
 * 3. Sends tool results back to OpenAI
 * 4. Continues the conversation naturally
 */
export async function* streamOpenAIChatCompletionWithTools(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk, void, unknown> {
  if (signal?.aborted) return;

  const totalStart = Date.now();
  try {
    const contextualPrompt = buildContextualPrompt(context);

    // Build initial messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: contextualPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    const systemPromptLength = contextualPrompt.length;
    const historyLength = conversationHistory.length;
    const totalChars = messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
    debugLog(`⏱️ [STREAM] Start | system_prompt=${systemPromptLength} chars | history=${historyLength} msgs | total_chars=${totalChars}`);

    // Tool loop: keep calling OpenAI until we get a response without tool calls
    const maxToolIterations = 2;
    let lastInvalidFields: string[] = [];
    const attemptedTools = new Set<string>();
    const successfulTools = new Map<string, Record<string, unknown>>();
    let completed = false;
    for (let iteration = 1; iteration <= maxToolIterations; iteration++) {
      if (signal?.aborted) return;

      const apiStart = Date.now();
      debugLog(`⏱️ [STREAM] OpenAI API call #${iteration} starting...`);

      const stream = await openai.chat.completions.create(
        {
          messages,
          model: "gpt-4o-mini",
          stream: true,
          tools: TRIP_TOOLS,
          tool_choice: "auto",
          parallel_tool_calls: false,
        },
        { signal, maxRetries: 0 },
      );

      const firstChunkStart = Date.now();
      debugLog(`⏱️ [STREAM] Stream created in ${firstChunkStart - apiStart}ms, waiting for first chunk...`);

      let assistantContent = "";
      const toolCallsBuffer: Map<number, { id: string; name: string; arguments: string }> =
        new Map();
      let firstChunkReceived = false;
      let hasToolCalls = false;
      const contentBuffer: string[] = [];

      for await (const chunk of stream) {
        if (signal?.aborted) return;

        if (!firstChunkReceived) {
          debugLog(`⏱️ [STREAM] First chunk received in ${Date.now() - firstChunkStart}ms (total since API call: ${Date.now() - apiStart}ms)`);
          firstChunkReceived = true;
        }
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          assistantContent += delta.content;
          contentBuffer.push(delta.content);
        }

        if (delta?.tool_calls) {
          hasToolCalls = true;
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallsBuffer.has(idx)) {
              toolCallsBuffer.set(idx, { id: "", name: "", arguments: "" });
            }
            const buffer = toolCallsBuffer.get(idx)!;
            if (tc.id) buffer.id = tc.id;
            if (tc.function?.name) buffer.name = tc.function.name;
            if (tc.function?.arguments) buffer.arguments += tc.function.arguments;
          }
        }
      }

      if (!hasToolCalls && contentBuffer.length > 0 && attemptedTools.size === 0) {
        for (const chunk of contentBuffer) {
          yield { type: "content", content: chunk };
        }
      } else if (hasToolCalls && assistantContent) {
        debugLog("[STREAM] Discarded text accompanying tool calls");
      }

      const streamDone = Date.now();
      debugLog(`⏱️ [STREAM] Stream #${iteration} fully consumed in ${streamDone - apiStart}ms`);

      // Finalize tool calls from buffer
      const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];
      for (const [, buffer] of toolCallsBuffer.entries()) {
        if (buffer.name && buffer.id) {
          toolCalls.push(buffer);
        }
      }

      debugLog(`[STREAM] tool_count=${toolCalls.length} content_chars=${assistantContent.length}`);

      // If no tool calls, we're done - exit the loop
      if (toolCalls.length === 0) {
        debugLog(`⏱️ [STREAM] No tool calls, done. Total: ${Date.now() - totalStart}ms`);
        if (!hasToolCalls && assistantContent.trim() && attemptedTools.size === 0) {
          completed = true;
        }
        break;
      }

      // Add assistant message with tool calls to history
      messages.push({
        role: "assistant",
        content: assistantContent || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments }
        }))
      });

      // Keep the validated pre-update snapshot for truthful acknowledgements.
      const previousPlanner = context.planner;
      // Execute each tool and collect results
      let canShortCircuit = true;
      const toolResults: Array<{ name: string; result: Record<string, unknown>; args: Record<string, unknown> }> = [];

      for (const toolCall of toolCalls) {
        if (signal?.aborted) return;

        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.arguments || "{}");
        } catch {
          args = {};
        }

        const constrainedToolCall = enforceSelectedDestination(
          { name: toolCall.name, arguments: args },
          context,
        );
        args = constrainedToolCall.arguments;

        const fingerprint = JSON.stringify([toolCall.name, args]);
        if (attemptedTools.has(fingerprint)) {
          const cachedResult = successfulTools.get(fingerprint);
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(cachedResult ?? { error: "Repeated tool call rejected", fields: lastInvalidFields }) });
          if (!cachedResult) canShortCircuit = false;
          continue;
        }
        attemptedTools.add(fingerprint);
        const validation = validateToolCall(constrainedToolCall);
        if (!validation.valid) {
          lastInvalidFields = validation.fields ?? [];
          debugLog(`[STREAM] invalid_tool fields=${lastInvalidFields.join(",")}`);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: validation.message, fields: lastInvalidFields })
          });
          canShortCircuit = false;
          continue;
        }

        yield { type: "tool_call", toolCall: { name: toolCall.name, arguments: args } };

        const toolStart = Date.now();
        const result = await executeToolCall(toolCall.name, args, context);
        if (signal?.aborted) return;
        if (toolCall.name === "update_planner") {
          const updatedPlanner = plannerDraftSchema.safeParse(result.planner);
          if (updatedPlanner.success) context.planner = updatedPlanner.data;
        }
        if (!result.error) successfulTools.set(fingerprint, result);
        if (result.error) {
          canShortCircuit = false;
          lastInvalidFields = Array.isArray(result.fields) ? result.fields.filter((field): field is string => typeof field === "string") : [];
          debugLog(`[STREAM] tool_rejected fields=${lastInvalidFields.join(",")}`);
        }
        debugLog(`[STREAM] Tool executed in ${Date.now() - toolStart}ms`);

        yield { type: "tool_result", name: toolCall.name, result };
        toolResults.push({ name: toolCall.name, result, args });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      // Short-circuit: generate local response for search tools to avoid a second OpenAI call (~3-8s saved)
      const searchToolNames = new Set(["search_flights", "update_planner"]);
      const hasValidatedPlanner = toolResults.some(t => t.name === "update_planner" && plannerDraftSchema.safeParse(t.result.planner).success);
      const allToolsAreSimple = hasValidatedPlanner || (canShortCircuit && toolResults.every(t => searchToolNames.has(t.name)));

      if (allToolsAreSimple && toolResults.length > 0) {
        const localResponse = hasValidatedPlanner && !canShortCircuit
          ? plannerCorrectionMessage(context, userMessage, conversationHistory, lastInvalidFields)
          : generateLocalToolResponse(
          toolResults,
          context,
          userMessage,
          conversationHistory,
          previousPlanner,
        );
        if (localResponse) {
          debugLog(`⏱️ [STREAM] Short-circuiting with local response (saved ~5-8s). Total: ${Date.now() - totalStart}ms`);
          yield { type: "content", content: localResponse };
          completed = true;
          break;
        }
      }

      debugLog(`⏱️ [STREAM] Needs followup via OpenAI. Elapsed: ${Date.now() - totalStart}ms`);
    }

    if (!completed && !signal?.aborted) {
      yield {
        type: "content",
        content: plannerCorrectionMessage(context, userMessage, conversationHistory, lastInvalidFields),
      };
    }
  } catch (error) {
    if (signal?.aborted) return;
    console.error("OpenAI streaming error", getSafeErrorMetadata(error));
    yield {
      type: "content",
      content: STRINGS[context.locale ?? detectUserLanguage(userMessage, conversationHistory)].requestError,
    };
  }
}
