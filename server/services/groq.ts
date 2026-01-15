import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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

  flights?: {
    id?: number;
    airline: string;
    departure_at: string;
    return_at: string;
    flight_number: number;
    origin?: string;
    destination?: string;
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
  | { type: "tool_call"; toolCall: ToolCall };

const TRIP_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "set_destination",
      description: "Set the travel destination when the user chooses where they want to go",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "The destination city name" }
        },
        required: ["city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_origin",
      description: "Set the departure city when the user specifies where they want to fly from",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "The origin/departure city name" }
        },
        required: ["city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_dates",
      description: "Set the travel dates when the user provides departure and return dates",
      parameters: {
        type: "object",
        properties: {
          departure_date: { type: "string", description: "Departure date in YYYY-MM-DD format" },
          return_date: { type: "string", description: "Return date in YYYY-MM-DD format" }
        },
        required: ["departure_date", "return_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_participants",
      description: "Set the number of participants when the user specifies how many people are traveling",
      parameters: {
        type: "object",
        properties: {
          count: { type: "integer", description: "Number of participants/travelers" }
        },
        required: ["count"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "select_flight",
      description: "Select a specific flight when the user chooses from the available options",
      parameters: {
        type: "object",
        properties: {
          flight_number: { type: "integer", description: "The flight option number (1, 2, or 3)" }
        },
        required: ["flight_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "unlock_checkout",
      description: "Unlock the checkout button when the user confirms they want to proceed with booking",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

const SHARED_SYSTEM_PROMPT = `REQUIRED DATA POINTS:
Before searching for flights, you MUST have ALL of the following:
- destination (where they want to go)
- origin (departure city/airport)
- departure date
- return date
- number of participants

If the user provides multiple data points in one message, process ALL of them at once by calling the appropriate tools. You don't need to ask one question at a time.

AVAILABLE DESTINATIONS: Rome, Ibiza, Barcelona, Prague, Budapest, Krakow, Amsterdam, Berlin, Lisbon, Palma de Mallorca

ITALIAN AIRPORTS: Rome, Milan, Naples, Turin, Venice, Bologna, Florence, Bari, Catania, Palermo, Verona, Pisa, Genoa, Brindisi, Olbia, Cagliari, Alghero

TOOL USAGE:
- Call set_destination when you learn the destination
- Call set_origin when you learn the departure city
- Call set_dates when you learn travel dates (convert to YYYY-MM-DD format)
- Call set_participants when you learn the group size
- Call select_flight when the user chooses a flight option
- Call unlock_checkout when the user confirms they want to book

You can call MULTIPLE tools in a single response if the user provides multiple pieces of information.

PROACTIVE FOLLOW-UPS:
After processing what the user provides, check which required data points are still missing and ask about them naturally. Be conversational - don't just list what's missing. For example:
- If you have destination and dates but no origin: "Great choice! Where will you be flying from?"
- If you only have destination: "Sounds exciting! When are you thinking of going, and how many people will be joining?"
- If everything is ready: Proceed to show flights immediately.

BEHAVIOR:
- Keep responses concise (2-3 sentences max)
- Professional and friendly tone
- Focus ONLY on flights - do NOT suggest experiences, activities, or hotels
- When the user mentions a new destination, start fresh

CHECKOUT FLOW:
- When flights are shown and the user confirms (yes, ok, sure, confirm, proceed, perfect, let's do it, etc.), ALWAYS call unlock_checkout immediately
- NEVER confirm bookings as if they were completed - flights go through external checkout

BOOKING INFO:
- Flights use external affiliate checkout
- Hotels will appear at checkout (don't mention them in chat)`;

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
    const originCity = context.originCityName || "Rome";
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
      contextualPrompt += `   Flight no. ${f.flight_number}\n\n`;
    });
    contextualPrompt += `\nWhen the user chooses a flight (e.g., "the 2nd one", "I'll take the first", "flight 3"), call select_flight with the flight number.\n`;
  }

  return contextualPrompt;
}

export async function createGroqChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  try {
    const contextualPrompt = buildContextualPrompt(context);

    const messages: ChatMessage[] = [
      { role: "system", content: contextualPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
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

    return { content, toolCalls };
  } catch (error) {
    console.error("Groq API error:", error);
    throw new Error("Error communicating with GROQ");
  }
}

export async function* streamGroqChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
): AsyncGenerator<StreamChunk, void, unknown> {
  try {
    const contextualPrompt = buildContextualPrompt(context);

    const messages: ChatMessage[] = [
      { role: "system", content: contextualPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const stream = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      stream: true,
      tools: TRIP_TOOLS,
      tool_choice: "auto",
    });

    const toolCallsBuffer: Map<number, { name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
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

      if (chunk.choices[0]?.finish_reason === "tool_calls" || chunk.choices[0]?.finish_reason === "stop") {
        const entries = Array.from(toolCallsBuffer.entries());
        for (const [, buffer] of entries) {
          if (buffer.name) {
            try {
              const args = buffer.arguments ? JSON.parse(buffer.arguments) : {};
              yield { type: "tool_call", toolCall: { name: buffer.name, arguments: args } };
            } catch (e) {
              console.error("Error parsing streamed tool call:", e);
            }
          }
        }
        toolCallsBuffer.clear();
      }
    }
  } catch (error) {
    console.error("Groq streaming error:", error);
    yield { type: "content", content: "Sorry, there was a problem with the streaming. Please try again!" };
  }
}

interface ActivitySuggestion {
  name: string;
  description: string;
  icon: string;
  venues: string[];
}

export async function generateActivitySuggestions(
  destination: string,
  timeReference: string,
  partyType: "bachelor" | "bachelorette" = "bachelor",
): Promise<ActivitySuggestion[]> {
  try {
    const partyContext =
      partyType === "bachelorette"
        ? "bachelorette parties with focus on spa, beach clubs, brunch, shopping, cocktail bars, wellness experiences"
        : "bachelor parties with focus on nightclubs, boat parties, karting, paintball, breweries, VIP experiences";

    const systemPrompt = `You are an expert travel activity planner for ${partyContext} in Europe.

Generate 6 creative and exciting activity suggestions for ${destination} for a party happening in ${timeReference}.

Return ONLY a valid JSON array with exactly 6 activities. Each activity must have:
- name: Short, catchy name (max 4 words)
- description: Brief description (max 15 words)
- icon: One of these exactly: "music", "ship", "utensils", "party", "car", "waves", "flame", "beer", "mappin"
- venues: Array of 2-3 specific venue/location names in ${destination}

${
  partyType === "bachelorette"
    ? "Focus on: spa experiences, beach clubs, brunch spots, rooftop bars, wellness centers, shopping districts, sunset cruises, wine tasting, cooking classes."
    : "Focus on: nightclubs, boat parties, karting, paintball, beach clubs, breweries, escape rooms, VIP experiences, restaurants, bars."
}

Return ONLY the JSON array, no other text.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate 6 activity suggestions for ${destination}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "[]";

    // Try to parse JSON from response
    let jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response");
      return getFallbackActivities(destination);
    }

    const suggestions: ActivitySuggestion[] = JSON.parse(jsonMatch[0]);

    // Validate and clean suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return getFallbackActivities(destination);
    }

    return suggestions.slice(0, 6).map((s) => ({
      name: s.name || "Party Activity",
      description: s.description || "Fun activity for your group",
      icon: s.icon || "party",
      venues: Array.isArray(s.venues) ? s.venues.slice(0, 3) : [],
    }));
  } catch (error) {
    console.error("Error generating activity suggestions:", error);
    return getFallbackActivities(destination);
  }
}

function getFallbackActivities(destination: string): ActivitySuggestion[] {
  return [
    {
      name: "Club Night",
      description: "Experience the best nightlife in the city",
      icon: "music",
      venues: ["Local Club 1", "Local Club 2", "Local Club 3"],
    },
    {
      name: "Boat Party",
      description: "Private boat with drinks and music",
      icon: "ship",
      venues: ["Marina Charter", "Party Boats Co", "Sunset Cruises"],
    },
    {
      name: "Group Dinner",
      description: "Exclusive dining experience with great food",
      icon: "utensils",
      venues: ["Restaurant 1", "Restaurant 2", "Restaurant 3"],
    },
    {
      name: "Beach Club",
      description: "Relax and party at a premium beach club",
      icon: "waves",
      venues: ["Beach Club 1", "Beach Club 2", "Beach Club 3"],
    },
    {
      name: "Karting Race",
      description: "Competitive go-kart racing for the group",
      icon: "car",
      venues: ["Racing Track", "Karting Center", "Speed Zone"],
    },
    {
      name: "Bar Crawl",
      description: "Tour the best bars with a guide",
      icon: "beer",
      venues: ["Bar District", "Pub Street", "Nightlife Area"],
    },
  ];
}
