import OpenAI from "openai";
import { generateFallbackItinerary } from "./fallback-itinerary";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ItineraryRequest {
  destination: string;
  country: string;
  days: number;
  groupSize: number;
  budget: "budget" | "standard" | "luxury";
  interests: string[];
  theme: string;
}

export interface DailyPlan {
  day: number;
  title: string;
  schedule: {
    time: string;
    activity: string;
    description: string;
    location?: string;
    cost?: string;
  }[];
  notes?: string;
}

export interface GeneratedItinerary {
  title: string;
  destination: string;
  summary: string;
  days: DailyPlan[];
  tips: string[];
  estimatedTotalCost: string;
}


export async function generateItinerary(request: ItineraryRequest): Promise<GeneratedItinerary> {
  try {
    // Controlla che ci sia una chiave API di OpenAI
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "") {
      console.log("No OpenAI API key found, using fallback itinerary");
      return generateFallbackItinerary(request);
    }
    
    const prompt = `Generate a detailed bachelor party itinerary for ${request.destination}, ${request.country}. 
    The itinerary should be for ${request.days} days with a group of ${request.groupSize} people.
    The budget level is "${request.budget}" and they are interested in: ${request.interests.join(", ")}.
    The bachelor party theme is: ${request.theme}.
    
    The itinerary should be wild, playful, and fun, in the style of the movie "The Hangover" but realistic and actually doable. 
    Include real venues, local nightclubs, restaurants, and activities that exist in ${request.destination}.
    
    Structure the response as a JSON object with the following format:
    {
      "title": "Catchy title for the itinerary",
      "destination": "${request.destination}, ${request.country}",
      "summary": "Brief summary of the itinerary",
      "days": [
        {
          "day": 1,
          "title": "Title for day 1",
          "schedule": [
            {
              "time": "Time slot",
              "activity": "Name of activity",
              "description": "Detailed description",
              "location": "Location name",
              "cost": "Estimated cost per person"
            }
          ],
          "notes": "Special notes about this day"
        }
      ],
      "tips": ["Tip 1", "Tip 2", "Tip 3"],
      "estimatedTotalCost": "Estimated total cost per person"
    }
    
    Include at least 4-6 activities per day, with a mix of daytime and nighttime activities.
    For a luxury budget, include high-end clubs, restaurants, and experiences.
    For a standard budget, include mid-range options that are still fun and memorable.
    For a budget option, include affordable alternatives that are still exciting.
    
    Make sure each day has a good flow and make the schedule realistic with travel time between venues.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert bachelor party planner who knows all the best venues, clubs, restaurants, and activities in popular destinations worldwide."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });
  
      const itineraryText = response.choices[0].message.content;
      if (!itineraryText) {
        console.log("Empty response from OpenAI, using fallback itinerary");
        return generateFallbackItinerary(request);
      }
  
      try {
        return JSON.parse(itineraryText) as GeneratedItinerary;
      } catch (parseError) {
        console.error("Error parsing JSON from OpenAI response:", parseError);
        return generateFallbackItinerary(request);
      }
    } catch (openaiError) {
      console.error("OpenAI API error, using fallback itinerary:", JSON.stringify(openaiError));
      
      // Verifica se l'API key è configurata
      if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY non configurata nell'ambiente");
      } else {
        console.log("OPENAI_API_KEY è presente nell'ambiente");
      }
      
      return generateFallbackItinerary(request);
    }
  } catch (error) {
    console.error("Error in generateItinerary function:", error);
    // Ritorna comunque un itinerario di fallback in caso di errore
    return generateFallbackItinerary(request);
  }
}

export async function generateAssistantResponse(context: {
  userMessage: string;
  selectedDestination: string;
  tripDetails: any;
  conversationState: any;
}): Promise<{
  response: string;
  updatedTripDetails?: any;
  updatedConversationState?: any;
  selectedDestination?: string;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const { userMessage, selectedDestination, tripDetails, conversationState } = context;
    
    const systemPrompt = `You are ByeBro assistant for planning bachelor parties. Always reply in the language the user initiates the conversation in with an informal and enthusiastic tone.

AVAILABLE DESTINATIONS: Rome, Ibiza, Barcelona, Prague, Budapest, Kraków, Amsterdam, Berlin, Lisbon, Palma de Mallorca

CONVERSATION RULES:
1. Your goal is to collect all the information you need to generate a detailed itinerary. As the user provides it, make sure to set it.
2. NEVER assume the departure city. If the user has not explicitly stated where they are departing from, you MUST ask them.
3. NEVER ask users to provide dates in a specific format (e.g., YYYY-MM-DD). Accept natural language dates such as "June 10 to June 14", "10/06 to 14/06", "next weekend", "first weekend of July", "August 3–6". Interpret and normalize dates internally without mentioning the format.
4. If key information is missing (departure city, dates, number of passengers), ask for it in a natural, minimal, and conversational way. Only ask for what is strictly necessary.
5. When the destination is provided, confirm it naturally without assuming anything else.
6. Once ALL required information is available, briefly confirm the full route and dates in natural language, then proceed.
7. Use emojis and an enthusiastic tone.
8. Do not repeat already asked questions.
9. Tone: Friendly, efficient, modern startup assistant. No technical jargon. No mention of formats or backend processes.

CURRENT STATE:
- Destination: ${selectedDestination || 'none'}
- People: ${tripDetails?.people || 0}
- Days: ${tripDetails?.days || 0}
- Adventure Type: ${tripDetails?.adventureType || 'not specified'}
- Conversation Step: ${conversationState?.currentStep || 'initial'}

Reply to the user's message based on this context. Return your answer in JSON format with this structure:
{
  "response": "your reply",
  "updatedTripDetails": { "people": number, "days": number, "adventureType": "type" },
  "updatedConversationState": { "currentStep": "step", "askedForPeople": boolean },
  "selectedDestination": "destination"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      response: result.response || "Something went wrong. Please try again.",
      updatedTripDetails: result.updatedTripDetails,
      updatedConversationState: result.updatedConversationState,
      selectedDestination: result.selectedDestination
    };

  } catch (error) {
    console.error("OpenAI Assistant Error:", error);
    throw error;
  }
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatContext {
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
  language?: string;

  flights?: {
    id?: number;
    airline: string;
    departure_at: string;
    return_at: string;
    flight_number: number;
    origin?: string;
    destination?: string;
    checkoutUrl?: string;
  }[];

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

type ToolValidationResult = {
  validToolCalls: ToolCall[];
  clarification?: string;
};

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

function validateToolCall(toolCall: ToolCall): { valid: boolean; message?: string } {
  const args = toolCall.arguments || {};

  switch (toolCall.name) {
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
      if (!depDate || !retDate || !isValidISODate(depDate) || !isValidISODate(retDate)) {
        return {
          valid: false,
          message: "I need your travel dates to search flights. When are you going and coming back?",
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
        console.log(`📅 Auto-corrected past dates → dep: ${depDate}, ret: ${retDate}`);
      }

      if (!Number.isInteger(passengers) || passengers <= 0) {
        return {
          valid: false,
          message: "How many people are traveling?",
        };
      }
      if (passengers > 9) {
        args._originalPassengers = passengers;
        args.passengers = 1;
        console.log(`👥 Passengers capped: ${passengers} → 1 (per-person search for Amadeus max 9 limit)`);
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
    case "select_flight": {
      const flightNumber = Number(args.flight_number);
      if (!Number.isInteger(flightNumber) || flightNumber <= 0) {
        return {
          valid: false,
          message: "Which flight option would you like? You can say 1, 2, or 3.",
        };
      }
      return { valid: true };
    }
    case "unlock_checkout":
      return { valid: true };
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
  switch (name) {
    case "search_flights": {
      const { searchFlights } = await import("./amadeus-flights");
      const { cityToIata } = await import("./cityMapping");

      // Helper to extract IATA code from strings like "Fiumicino (FCO)" or just use cityToIata
      const extractIata = (input: string): string => {
        // First try to extract IATA from parentheses, e.g., "Fiumicino (FCO)" -> "FCO"
        const parenMatch = input.match(/\(([A-Z]{3})\)/i);
        if (parenMatch) {
          return parenMatch[1].toUpperCase();
        }
        // Then try cityToIata lookup
        const mapped = cityToIata(input);
        if (mapped) {
          return mapped;
        }
        // Finally, if it looks like a 3-letter code already, use it
        if (/^[A-Z]{3}$/i.test(input.trim())) {
          return input.trim().toUpperCase();
        }
        // Last resort: take first 3 characters
        return input.substring(0, 3).toUpperCase();
      };

      const originCity = typeof args.origin === "string" ? args.origin : "";
      const destCity = typeof args.destination === "string" ? args.destination : "";
      const originIata = extractIata(originCity);
      const destIata = extractIata(destCity);
      const numPassengers = typeof args.passengers === "number" ? args.passengers : 1;
      const departureDate = typeof args.departure_date === "string" ? args.departure_date : "";
      const returnDate = typeof args.return_date === "string" ? args.return_date : undefined;

      console.log("🔍 search_flights tool called with:", {
        originCity,
        destCity,
        originIata,
        destIata,
        departure_date: departureDate,
        return_date: returnDate,
        passengers: numPassengers
      });

      try {
        const flightResults = await searchFlights({
          originCode: originIata,
          destinationCode: destIata,
          departureDate,
          returnDate,
          adults: numPassengers,
          currency: "EUR"
        });

        console.log("📦 Amadeus returned", flightResults.length, "flights");

        // Transform to simplified format for OpenAI + add checkout URLs
        const flights = flightResults.slice(0, 5).map((f) => {
          const depDate = f.outbound[0]?.departure.at?.slice(0, 10) || departureDate;
          const retDate = f.inbound?.[0]?.departure.at?.slice(0, 10) || returnDate || depDate;
          const depDay = depDate.slice(8, 10);
          const depMonth = depDate.slice(5, 7);
          const retDay = retDate.slice(8, 10);
          const retMonth = retDate.slice(5, 7);

          // Generate checkout URL for Aviasales booking
          const checkoutUrl = `https://www.aviasales.com/search/${originIata}${depDay}${depMonth}${destIata}${retDay}${retMonth}${numPassengers}?marker=${process.env.AVIASALES_PARTNER_ID || "byebi"}`;

          return {
            airline: f.airlines.join(", "),
            price: f.price,
            currency: f.currency,
            departure_at: f.outbound[0]?.departure.at,
            return_at: f.inbound?.[0]?.departure.at,
            stops: f.stops,
            duration: f.totalDuration,
            checkoutUrl
          };
        });

        console.log("✅ Transformed flights:", JSON.stringify(flights, null, 2));

        return { flights, origin: originIata, destination: destIata };
      } catch (error) {
        console.error("❌ Flight search error:", error);
        return { error: "Failed to search flights. Please try again.", flights: [] };
      }
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
        console.error("Hotel search error:", error);
        return { error: "Failed to search hotels. Please try again.", hotels: [] };
      }
    }

    case "select_flight":
      return { success: true, selected_flight: args.flight_number };

    case "unlock_checkout":
      return { success: true, checkout_unlocked: true };

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

const TRIP_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_flights",
      strict: true,
      description:
        "Search for available flights. Call this when you have origin, destination, dates, and passenger count.",
      parameters: {
        type: "object",
        properties: {
          origin: {
            type: "string",
            description: "Departure city name (e.g., Rome, Milan, London)",
          },
          destination: {
            type: "string",
            description: "Destination city name (e.g., Barcelona, Ibiza, Prague)",
          },
          departure_date: {
            type: "string",
            description: "Departure date in YYYY-MM-DD format",
          },
          return_date: {
            type: "string",
            description: "Return date in YYYY-MM-DD format",
          },
          passengers: {
            type: ["integer", "null"],
            description: "Number of passengers/travelers",
          },
        },
        required: ["origin", "destination", "departure_date", "return_date", "passengers"],
        additionalProperties: false
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_hotels",
      strict: true,
      description:
        "Search for available hotels. Call this when you have destination, check-in date, check-out date, and number of guests.",
      parameters: {
        type: "object",
        properties: {
          destination: {
            type: "string",
            description: "Destination city name (e.g., Barcelona, Rome, Prague)",
          },
          check_in_date: {
            type: "string",
            description: "Check-in date in YYYY-MM-DD format",
          },
          check_out_date: {
            type: "string",
            description: "Check-out date in YYYY-MM-DD format",
          },
          guests: {
            type: ["integer", "null"],
            description: "Number of guests/travelers",
          },
        },
        required: ["destination", "check_in_date", "check_out_date", "guests"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "select_flight",
      description:
        "Select a specific flight when the user chooses from the available options",
      parameters: {
        type: "object",
        properties: {
          flight_number: {
            type: "integer",
            description: "The flight option number (1, 2, or 3)",
          },
        },
        required: ["flight_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unlock_checkout",
      description:
        "Unlock the checkout button when the user confirms they want to proceed with booking",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

const SHARED_SYSTEM_PROMPT = (() => {
  const today = new Date().toISOString().slice(0, 10);
  return `Today is ${today}.

DESTINATIONS: Rome, Ibiza, Barcelona, Prague, Budapest, Krakow, Amsterdam, Berlin, Lisbon, Palma de Mallorca, Madrid, Bilbao

RULES:
- ALWAYS respond in the same language the user writes in. If user writes German, respond in German. French → French. etc.
- NEVER assume departure city. Always ask if not stated.
- NEVER mention date formats. Accept natural language dates ("June 10-14", "next weekend", "primo weekend di luglio") and convert to YYYY-MM-DD internally. When user says a month without a year, use the NEXT occurrence of that month (never a past date).
- Ask only for missing info: departure city, destination, dates, passengers. Keep it short and natural.
- Once you have all info, call search_flights IMMEDIATELY. Do NOT add any text like "wait", "searching", "un momento", "let me search". Just call the tool directly with NO accompanying text.
- Concise: 2-3 sentences max. Friendly startup tone. No jargon.
- Focus ONLY on flights. No activities, experiences, or hotels.

TOOLS:
- search_flights: needs origin, destination, departure_date, return_date, passengers. All dates MUST be today or in the future (YYYY-MM-DD).
- search_hotels: needs destination, check_in_date, check_out_date, guests.
- select_flight: when user picks a flight option.
- unlock_checkout: when user confirms booking. Flights go through external checkout — never say booking is completed.

When showing flights, list top options (1,2,3) with date/time, airline, flight number. Ask which one they prefer.`;
})();

const BYEBRO_SYSTEM_PROMPT = `You are the official assistant of ByeBro, part of the BYEBI app. Your task is to help plan bachelor party trips by finding REAL FLIGHTS. ALWAYS respond in the language the user writes in.

${SHARED_SYSTEM_PROMPT}`;

const BYEBRIDE_SYSTEM_PROMPT = `You are the official assistant of ByeBride, part of the BYEBI app. Your task is to help plan bachelorette party trips by finding REAL FLIGHTS. ALWAYS respond in the language the user writes in.

${SHARED_SYSTEM_PROMPT}`;

function buildContextualPrompt(context: ChatContext): string {
  const basePrompt =
    context.partyType === "bachelorette"
      ? BYEBRIDE_SYSTEM_PROMPT
      : BYEBRO_SYSTEM_PROMPT;
  let contextualPrompt = basePrompt;

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

  if (context.flights && context.flights.length > 0) {
    const originCity = context.originCityName;
    contextualPrompt += `\n\nAVAILABLE REAL FLIGHTS (from ${originCity} to ${context.selectedDestination}):`;
    contextualPrompt += `\nThese are REAL flights with updated prices. Present them to the user and ask which one they prefer.\n`;
    context.flights.forEach((f, idx) => {
      const depDate = new Date(f.departure_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const depTime = new Date(f.departure_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const retDate = new Date(f.return_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const retTime = new Date(f.return_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      contextualPrompt += `${idx + 1}. Departure: ${depDate} at ${depTime}\n`;
      contextualPrompt += `   Return: ${retDate} at ${retTime}\n`;
      contextualPrompt += `   Airline: ${f.airline}\n`;
      contextualPrompt += `   Flight no. ${f.flight_number}\n\n`;
      if (f.checkoutUrl) {
        contextualPrompt += `   Checkout link: ${f.checkoutUrl}\n\n`;
      }
    });
    contextualPrompt += `\nWhen the user chooses a flight (e.g., "the 2nd one", "I'll take the first", "flight 3"), call select_flight with the flight number.\n`;
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
          console.error("Error parsing tool call arguments:", e);
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
      finalContent = generateFollowUpMessage(validToolCalls, context);
    }

    return { content: finalContent, toolCalls: validToolCalls };
  } catch (error) {
    console.error("OpenAI API error:", error);
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
              console.error("Error parsing streamed tool call:", e);
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
        const fallbackContent = generateFollowUpMessage(collectedToolCalls, context);
        yield { type: "content", content: fallbackContent };
      }
    }
  } catch (error) {
    console.error("OpenAI streaming error:", error);
    yield {
      type: "content",
      content:
        "Sorry, there was a problem with the streaming. Please try again!",
    };
  }
}

function generateFollowUpMessage(
  toolCalls: ToolCall[],
  context: ChatContext,
): string {
  if (context.flights && context.flights.length > 0) {
    const originCity = context.originCityName;
    const flightOptions = context.flights
      .slice(0, 3)
      .map((f, idx) => {
        const depDate = new Date(f.departure_at).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const depTime = new Date(f.departure_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const retDate = new Date(f.return_at).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const retTime = new Date(f.return_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const link = f.checkoutUrl ? `\n   Link: ${f.checkoutUrl}` : "";

        return `${idx + 1}) ${originCity} → ${context.selectedDestination}: ${depDate} ${depTime} / Return ${retDate} ${retTime} (${f.airline} Flight ${f.flight_number})${link}`;
      })
      .join("\n");

    return `Here are the best flight options I found:\n${flightOptions}\n\nWhich one would you like?`;
  }

  const toolNames = new Set(toolCalls.map((tc) => tc.name));
  if (toolNames.has("search_flights")) {
    return "Searching for the best flights for you...";
  }

  return "Got it! Anything else you'd like to share?";
}

function detectUserLanguage(context: ChatContext, conversationHistory: ChatMessage[] = []): string {
  const patterns: [string, RegExp][] = [
    ["it", /\b(ciao|voglio|andare|siamo|partiamo|persone|voli|quando|dove|prenota|perfetto|procedi|andiamo|vorrei|cercare|partire|tornare|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|gennaio|febbraio|marzo|aprile|buongiorno|grazie|prego|scusa)\b/],
    ["es", /\b(hola|quiero|somos|salimos|personas|vuelos|cuando|donde|reservar|perfecto|vamos|buscar|salir|volver|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|enero|febrero|marzo|abril|gracias|buenos|entonces|pasajeros|volamos)\b/],
    ["de", /\b(hallo|ich|wir|fliegen|flug|flüge|personen|wann|wohin|buchen|suchen|reise|abflug|rückkehr|mai|juni|juli|august|september|oktober|november|dezember|januar|februar|märz|april|danke|bitte|guten)\b/],
    ["fr", /\b(bonjour|je|nous|voulons|aller|vol|vols|personnes|quand|chercher|réserver|parfait|partir|retour|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janvier|février|mars|avril|merci|salut|passagers)\b/],
    ["pt", /\b(olá|oi|quero|vamos|voo|voos|pessoas|quando|onde|reservar|perfeito|partir|voltar|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|janeiro|fevereiro|março|abril|obrigado|passageiros)\b/],
    ["en", /\b(hello|hi|want|going|looking|people|flights|when|where|book|perfect|let'?s|search|leave|return|may|june|july|august|september|october|november|december|january|february|march|april|thanks|please|passengers)\b/],
  ];
  const allMessages = [...conversationHistory].reverse();
  for (const msg of allMessages) {
    if (msg.role !== "user") continue;
    const text = msg.content.toLowerCase();
    for (const [lang, pattern] of patterns) {
      if (pattern.test(text)) return lang;
    }
  }
  return "it";
}

interface LocalStrings {
  noFlightsError: (o: string, d: string) => string;
  noFlights: (o: string, d: string) => string;
  flightsHeader: (o: string, d: string) => string;
  direct: string;
  stop: (n: number) => string;
  dep: string;
  ret: string;
  whichOne: string;
  perPersonNote: (n: number) => string;
  flightSelected: string;
  checkout: string;
}

const STRINGS: Record<string, LocalStrings> = {
  it: {
    noFlightsError: (o, d) => `Non sono riuscito a trovare voli da ${o} a ${d}. Vuoi provare date diverse?`,
    noFlights: (o, d) => `Nessun volo disponibile da ${o} a ${d} per quelle date. Prova con date diverse o un'altra destinazione?`,
    flightsHeader: (o, d) => `Ecco i migliori voli da **${o}** a **${d}**:\n\n`,
    direct: "diretto",
    stop: (n) => `${n} scal${n > 1 ? "i" : "o"}`,
    dep: "Partenza",
    ret: "Ritorno",
    whichOne: "Quale preferisci?",
    perPersonNote: (n) => `\n> I prezzi sono **per persona**. Per ${n} partecipanti, moltiplica il prezzo x${n}.\n\n`,
    flightSelected: "Perfetto, volo selezionato! Vuoi procedere con la prenotazione?",
    checkout: "Ottimo! Ti porto al checkout per completare la prenotazione.",
  },
  en: {
    noFlightsError: (o, d) => `Couldn't find flights from ${o} to ${d}. Want to try different dates?`,
    noFlights: (o, d) => `No flights available from ${o} to ${d} for those dates. Try different dates or another destination?`,
    flightsHeader: (o, d) => `Here are the best flights from **${o}** to **${d}**:\n\n`,
    direct: "direct",
    stop: (n) => `${n} stop${n > 1 ? "s" : ""}`,
    dep: "Departure",
    ret: "Return",
    whichOne: "Which one do you prefer?",
    perPersonNote: (n) => `\n> Prices are **per person**. For ${n} travelers, multiply the price x${n}.\n\n`,
    flightSelected: "Flight selected! Ready to proceed with booking?",
    checkout: "Taking you to checkout to complete the booking.",
  },
  es: {
    noFlightsError: (o, d) => `No encontré vuelos de ${o} a ${d}. ¿Quieres probar otras fechas?`,
    noFlights: (o, d) => `No hay vuelos disponibles de ${o} a ${d} para esas fechas. ¿Pruebas con otras fechas u otro destino?`,
    flightsHeader: (o, d) => `Aquí están los mejores vuelos de **${o}** a **${d}**:\n\n`,
    direct: "directo",
    stop: (n) => `${n} escala${n > 1 ? "s" : ""}`,
    dep: "Salida",
    ret: "Regreso",
    whichOne: "¿Cuál prefieres?",
    perPersonNote: (n) => `\n> Los precios son **por persona**. Para ${n} viajeros, multiplica el precio x${n}.\n\n`,
    flightSelected: "¡Vuelo seleccionado! ¿Quieres proceder con la reserva?",
    checkout: "¡Genial! Te llevo al checkout para completar la reserva.",
  },
  de: {
    noFlightsError: (o, d) => `Konnte keine Flüge von ${o} nach ${d} finden. Andere Daten versuchen?`,
    noFlights: (o, d) => `Keine Flüge von ${o} nach ${d} für diese Daten verfügbar. Andere Daten oder ein anderes Ziel?`,
    flightsHeader: (o, d) => `Hier sind die besten Flüge von **${o}** nach **${d}**:\n\n`,
    direct: "direkt",
    stop: (n) => `${n} Zwischenstopp${n > 1 ? "s" : ""}`,
    dep: "Abflug",
    ret: "Rückflug",
    whichOne: "Welchen bevorzugst du?",
    perPersonNote: (n) => `\n> Die Preise gelten **pro Person**. Für ${n} Reisende, multipliziere den Preis x${n}.\n\n`,
    flightSelected: "Flug ausgewählt! Möchtest du mit der Buchung fortfahren?",
    checkout: "Super! Ich bringe dich zum Checkout.",
  },
  fr: {
    noFlightsError: (o, d) => `Impossible de trouver des vols de ${o} à ${d}. Essayer d'autres dates ?`,
    noFlights: (o, d) => `Aucun vol disponible de ${o} à ${d} pour ces dates. Essayer d'autres dates ou une autre destination ?`,
    flightsHeader: (o, d) => `Voici les meilleurs vols de **${o}** à **${d}** :\n\n`,
    direct: "direct",
    stop: (n) => `${n} escale${n > 1 ? "s" : ""}`,
    dep: "Départ",
    ret: "Retour",
    whichOne: "Lequel préfères-tu ?",
    perPersonNote: (n) => `\n> Les prix sont **par personne**. Pour ${n} voyageurs, multiplie le prix x${n}.\n\n`,
    flightSelected: "Vol sélectionné ! Tu veux procéder à la réservation ?",
    checkout: "Super ! Je t'emmène au checkout.",
  },
  pt: {
    noFlightsError: (o, d) => `Não encontrei voos de ${o} para ${d}. Tentar outras datas?`,
    noFlights: (o, d) => `Nenhum voo disponível de ${o} para ${d} nessas datas. Tentar outras datas ou outro destino?`,
    flightsHeader: (o, d) => `Aqui estão os melhores voos de **${o}** para **${d}**:\n\n`,
    direct: "direto",
    stop: (n) => `${n} escala${n > 1 ? "s" : ""}`,
    dep: "Partida",
    ret: "Retorno",
    whichOne: "Qual você prefere?",
    perPersonNote: (n) => `\n> Os preços são **por pessoa**. Para ${n} viajantes, multiplique o preço x${n}.\n\n`,
    flightSelected: "Voo selecionado! Quer prosseguir com a reserva?",
    checkout: "Ótimo! Vou te levar ao checkout.",
  },
};

function generateLocalToolResponse(
  toolResults: Array<{ name: string; result: Record<string, unknown>; args: Record<string, unknown> }>,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
): string | null {
  const lang = detectUserLanguage(context, conversationHistory);
  const s = STRINGS[lang] || STRINGS.en;

  for (const { name, result, args } of toolResults) {
    switch (name) {
      case "search_flights": {
        const flights = result.flights as any[] | undefined;
        const origin = (args.origin as string) || context.originCityName || "";
        const destination = (args.destination as string) || context.selectedDestination || "";
        const originalPassengers = args._originalPassengers as number | undefined;

        if (!flights || flights.length === 0) {
          return result.error ? s.noFlightsError(origin, destination) : s.noFlights(origin, destination);
        }

        const localeMap: Record<string, string> = { it: "it-IT", es: "es-ES", de: "de-DE", fr: "fr-FR", pt: "pt-PT", en: "en-US" };
        const locale = localeMap[lang] || "en-US";
        const formatDT = (iso: string) => {
          const d = new Date(iso);
          return d.toLocaleDateString(locale, { day: "numeric", month: "long" }) +
            " " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
        };

        let msg = s.flightsHeader(origin, destination);
        if (originalPassengers && originalPassengers > 9) {
          msg += s.perPersonNote(originalPassengers);
        }
        flights.slice(0, 3).forEach((f: any, idx: number) => {
          const dep = f.departure_at ? formatDT(f.departure_at) : "N/A";
          const ret = f.return_at ? formatDT(f.return_at) : "N/A";
          const stopsLabel = f.stops > 0 ? ` (${s.stop(f.stops)})` : ` (${s.direct})`;
          const flightNum = f.flight_number ? ` #${f.flight_number}` : "";
          msg += `**${idx + 1}.** ${f.airline}${flightNum}${stopsLabel} — ${f.price}€\n`;
          msg += `   ${s.dep}: ${dep} / ${s.ret}: ${ret}\n\n`;
        });
        msg += s.whichOne;
        return msg;
      }

      case "select_flight":
        return s.flightSelected;

      case "unlock_checkout":
        return s.checkout;
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
): AsyncGenerator<StreamChunk, void, unknown> {
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
    console.log(`⏱️ [STREAM] Start | system_prompt=${systemPromptLength} chars | history=${historyLength} msgs | total_chars=${totalChars}`);

    // Tool loop: keep calling OpenAI until we get a response without tool calls
    let iteration = 0;
    while (true) {
      iteration++;
      const apiStart = Date.now();
      console.log(`⏱️ [STREAM] OpenAI API call #${iteration} starting...`);

      const stream = await openai.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
        stream: true,
        tools: TRIP_TOOLS,
        tool_choice: "auto",
      });

      const firstChunkStart = Date.now();
      console.log(`⏱️ [STREAM] Stream created in ${firstChunkStart - apiStart}ms, waiting for first chunk...`);

      let assistantContent = "";
      const toolCallsBuffer: Map<number, { id: string; name: string; arguments: string }> =
        new Map();
      let firstChunkReceived = false;
      let hasToolCalls = false;
      const contentBuffer: string[] = [];

      for await (const chunk of stream) {
        if (!firstChunkReceived) {
          console.log(`⏱️ [STREAM] First chunk received in ${Date.now() - firstChunkStart}ms (total since API call: ${Date.now() - apiStart}ms)`);
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
        console.log(`⏱️ [STREAM] Discarded filler text before tool call: "${assistantContent.slice(0, 80)}..."`);
      }

      const streamDone = Date.now();
      console.log(`⏱️ [STREAM] Stream #${iteration} fully consumed in ${streamDone - apiStart}ms`);

      // Finalize tool calls from buffer
      const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];
      for (const [, buffer] of toolCallsBuffer.entries()) {
        if (buffer.name && buffer.id) {
          toolCalls.push(buffer);
        }
      }

      console.log(`⏱️ [STREAM] Tool calls: [${toolCalls.map(tc => tc.name).join(", ")}] | content=${assistantContent.length} chars`);

      // If no tool calls, we're done - exit the loop
      if (toolCalls.length === 0) {
        console.log(`⏱️ [STREAM] No tool calls, done. Total: ${Date.now() - totalStart}ms`);
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
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.arguments || "{}");
        } catch {
          args = {};
        }

        const validation = validateToolCall({ name: toolCall.name, arguments: args });
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
        console.log(`⏱️ [STREAM] Tool "${toolCall.name}" executed in ${Date.now() - toolStart}ms`);

        yield { type: "tool_result", name: toolCall.name, result };
        toolResults.push({ name: toolCall.name, result, args });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      // Short-circuit: generate local response for search tools to avoid a second OpenAI call (~3-8s saved)
      const searchToolNames = new Set(["search_flights", "select_flight", "unlock_checkout"]);
      const allToolsAreSimple = canShortCircuit && toolResults.every(t => searchToolNames.has(t.name));

      if (allToolsAreSimple && toolResults.length > 0) {
        const localResponse = generateLocalToolResponse(toolResults, context, conversationHistory);
        if (localResponse) {
          console.log(`⏱️ [STREAM] Short-circuiting with local response (saved ~5-8s). Total: ${Date.now() - totalStart}ms`);
          yield { type: "content", content: localResponse };
          break;
        }
      }

      console.log(`⏱️ [STREAM] Needs followup via OpenAI. Elapsed: ${Date.now() - totalStart}ms`);
    }
  } catch (error) {
    console.error("OpenAI streaming error:", error);
    yield {
      type: "content",
      content: "Sorry, there was a problem. Please try again!",
    };
  }
}

