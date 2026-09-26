import OpenAI from "openai";
import { buildAviasalesUrl, getAviasalesAdultCount } from "@shared/flightSchemas";
import { calculateTripDays, isValidDateRange, normalizeTripDate } from "@shared/dateUtils";
import { resolveIataCode } from "./cityMapping";
import { getSafeErrorMetadata } from "../safeError";
import {
  applyPlannerUpdate,
  createPlannerDraft,
  getMissingPlannerFields,
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


  hotels?: {
    hotelId: string;
    name: string;
    stars?: string;
    priceTotal: number;
    currency: string;
    offerId: string;
    bookingFlow: "IN_APP" | "REDIRECT";
    paymentPolicy: string;
    roomDescription?: string;
  }[];
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
    (toolCall.name !== "search_flights" && toolCall.name !== "search_hotels")
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

function validateToolCall(toolCall: ToolCall): { valid: boolean; message?: string } {
  const args = toolCall.arguments || {};

  switch (toolCall.name) {
    case "update_planner": {
      const parsed = plannerUpdateArgumentsSchema.safeParse(args);
      return parsed.success
        ? { valid: true }
        : { valid: false, message: "Please provide only the planner details the user explicitly shared." };
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
    case "search_hotels": {
      const destination = typeof args.destination === "string" ? args.destination.trim() : "";
      const checkIn = typeof args.check_in_date === "string" ? args.check_in_date.trim() : "";
      const checkOut = typeof args.check_out_date === "string" ? args.check_out_date.trim() : "";
      const guests = Number(args.guests);

      if (!destination) {
        return {
          valid: false,
          message: "Which city should I search hotels in?",
        };
      }
      if (!checkIn || !checkOut || !isValidISODate(checkIn) || !isValidISODate(checkOut)) {
        return {
          valid: false,
          message: "I need your check-in and check-out dates to search hotels. When are you arriving and leaving?",
        };
      }
      if (!Number.isInteger(guests) || guests <= 0) {
        return {
          valid: false,
          message: "How many guests will be staying?",
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
      if (!update.success) return { error: "Invalid planner update" };
      try {
        const current = context.planner ?? createPlannerDraft({
          brand: context.partyType === "bachelorette" ? "byebride" : "byebro",
          partyType: context.partyType,
        });
        const planner = applyPlannerUpdate(current, update.data);
        return { planner, missingFields: getMissingPlannerFields(planner) };
      } catch {
        return { error: "Invalid planner details" };
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

    case "search_hotels": {
      const { searchHotels } = await import("./amadeus-hotels");
      const { cityToIata } = await import("./cityMapping");

      const destCity = typeof args.destination === "string" ? args.destination : "";
      const destIata = cityToIata(destCity) || destCity.substring(0, 3).toUpperCase();
      const checkIn = typeof args.check_in_date === "string" ? args.check_in_date : "";
      const checkOut = typeof args.check_out_date === "string" ? args.check_out_date : "";
      const guests = typeof args.guests === "number" ? args.guests : 2;

      try {
        const hotelResults = await searchHotels({
          cityCode: destIata,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: guests,
          currency: "EUR",
        });

        const hotels = (hotelResults || []).slice(0, 5).map((h) => ({
          hotelId: h.hotelId,
          name: h.name,
          stars: h.stars,
          priceTotal: h.priceTotal,
          currency: h.currency,
          offerId: h.offerId,
          bookingFlow: h.bookingFlow,
          paymentPolicy: h.paymentPolicy,
          roomDescription: h.roomDescription,
        }));

        return { hotels, destination: destIata };
      } catch (error) {
        console.error("Hotel search error", getSafeErrorMetadata(error));
        return { error: "Failed to search hotels. Please try again.", hotels: [] };
      }
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
        },
        required: ["origin", "destination", "startDate", "endDate", "participants", "budgetPerPerson", "preferenceArchetype", "interests"],
        additionalProperties: false,
      },
    },
  },
];

const SHARED_SYSTEM_PROMPT = (() => {
  const today = new Date().toISOString().slice(0, 10);
  return `Today is ${today}.

DESTINATIONS: Rome, Ibiza, Barcelona, Prague, Budapest, Krakow, Amsterdam, Berlin, Lisbon, Palma de Mallorca

RULES:
- Collect exactly: departure city, destination, start date, end date, participants, budget per person, and group preferences/experience archetype.
- NEVER assume departure city, budget, or preferences. Budget always means EUR PER PERSON, never the group total.
- NEVER mention date formats. Accept natural language dates ("June 10-14", "next weekend", "primo weekend di luglio") and convert to YYYY-MM-DD internally. When user says a month without a year, use the NEXT occurrence of that month (never a past date).
- Call update_planner whenever the user supplies or changes planner details, merging the CURRENT PLANNER and the new message. Use null for values that remain unknown.
- After the tool result, ask only for the next missing detail. When no fields are missing, briefly say the travel brief is ready for review.
- NEVER output text alongside a tool call. When calling a tool, output ONLY the tool call with zero accompanying text.
- Concise: 2-3 sentences max. Friendly startup tone. No jargon.
- Do not search providers, invent prices, flights, hotels, activities, availability, or offers.

TOOLS:
- update_planner: validates and persists only the planner brief. It never calls a travel provider.`;
})();

const BYEBRO_SYSTEM_PROMPT = `You are the ByeBro planner for bachelor party travel briefs. ALWAYS respond in the language the user writes in.

${SHARED_SYSTEM_PROMPT}`;

const BYEBRIDE_SYSTEM_PROMPT = `You are the ByeBride planner for bachelorette party travel briefs. ALWAYS respond in the language the user writes in.

${SHARED_SYSTEM_PROMPT}`;

function buildContextualPrompt(context: ChatContext): string {
  const basePrompt =
    context.partyType === "bachelorette"
      ? BYEBRIDE_SYSTEM_PROMPT
      : BYEBRO_SYSTEM_PROMPT;
  let contextualPrompt = basePrompt;

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
  const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === "user");
  const text = `${lastUserMsg?.content || ""} ${userMessage}`.toLowerCase();
  const itPatterns = /\b(ciao|voglio|andare|siamo|partiamo|dal|al|persone|voli|quando|dove|prenota|perfetto|procedi)\b/;
  const esPatterns = /\b(hola|quiero|somos|salimos|del|personas|vuelos|cuando|donde|reservar|perfecto)\b/;
  if (itPatterns.test(text)) return "it";
  if (esPatterns.test(text)) return "es";
  return "en";
}

interface LocalStrings {
  noFlightsError: (o: string, d: string) => string;
  noFlights: (o: string, d: string) => string;
  plannerReady: string;
}

const STRINGS: Record<string, LocalStrings> = {
  it: {
    noFlightsError: (o, d) => `Non sono riuscito a preparare il collegamento da ${o} a ${d}. Controlla città e date, poi riprova.`,
    noFlights: (o, d) => `Ho preparato il viaggio da ${o} a ${d}. Ti porto al checkout: sceglierai il volo direttamente su Aviasales.`,
    plannerReady: "Il tuo travel brief è pronto. Controlla i dettagli e modificali se serve.",
  },
  en: {
    noFlightsError: (o, d) => `I couldn't prepare the connection from ${o} to ${d}. Check the cities and dates, then try again.`,
    noFlights: (o, d) => `I've prepared your trip from ${o} to ${d}. Taking you to checkout so you can choose the flight directly on Aviasales.`,
    plannerReady: "Your travel brief is ready. Review the details and edit anything you need.",
  },
  es: {
    noFlightsError: (o, d) => `No pude preparar la conexión de ${o} a ${d}. Comprueba las ciudades y las fechas e inténtalo de nuevo.`,
    noFlights: (o, d) => `He preparado tu viaje de ${o} a ${d}. Te llevo al checkout para elegir el vuelo directamente en Aviasales.`,
    plannerReady: "Tu resumen de viaje está listo. Revisa los datos y modifica lo que necesites.",
  },
};

function generateLocalToolResponse(
  toolResults: Array<{ name: string; result: Record<string, unknown>; args: Record<string, unknown> }>,
  context: ChatContext,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
): string | null {
  const lang = detectUserLanguage(userMessage, conversationHistory);
  const s = STRINGS[lang] || STRINGS.en;

  for (const { name, result, args } of toolResults) {
    switch (name) {
      case "update_planner": {
        const parsed = plannerDraftSchema.safeParse(result.planner);
        if (parsed.success && parsed.data.status === "review-ready") return s.plannerReady;
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
    const maxToolIterations = 4;
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
        },
        { signal },
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

      if (!hasToolCalls && contentBuffer.length > 0) {
        for (const chunk of contentBuffer) {
          yield { type: "content", content: chunk };
        }
      } else if (hasToolCalls && assistantContent) {
        debugLog(`⏱️ [STREAM] Discarded filler text before tool call: "${assistantContent.slice(0, 80)}..."`);
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

      debugLog(`⏱️ [STREAM] Tool calls: [${toolCalls.map(tc => tc.name).join(", ")}] | content=${assistantContent.length} chars`);

      // If no tool calls, we're done - exit the loop
      if (toolCalls.length === 0) {
        debugLog(`⏱️ [STREAM] No tool calls, done. Total: ${Date.now() - totalStart}ms`);
        completed = true;
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

        const validation = validateToolCall(constrainedToolCall);
        if (!validation.valid) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: validation.message })
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
        debugLog(`⏱️ [STREAM] Tool "${toolCall.name}" executed in ${Date.now() - toolStart}ms`);

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
      const allToolsAreSimple = canShortCircuit && toolResults.every(t => searchToolNames.has(t.name));

      if (allToolsAreSimple && toolResults.length > 0) {
        const localResponse = generateLocalToolResponse(
          toolResults,
          context,
          userMessage,
          conversationHistory,
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
        content: "Sorry, I couldn't complete the request. Please try again.",
      };
    }
  } catch (error) {
    if (signal?.aborted) return;
    console.error("OpenAI streaming error", getSafeErrorMetadata(error));
    yield {
      type: "content",
      content: "Sorry, there was a problem. Please try again!",
    };
  }
}
