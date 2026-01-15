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
  origin?: string; // IATA code for flight origin (e.g., "ROM")
  originCityName?: string; // City name for display (e.g., "Roma", "Napoli")

  flights?: {
    id?: number;
    airline: string;
    departure_at: string;
    return_at: string;
    flight_number: number;
    origin?: string; // IATA code injected from backend
    destination?: string; // IATA code
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

const SHARED_SYSTEM_PROMPT = `MAIN RULES:
1. ALWAYS collect these 5 pieces of information BEFORE searching for flights:
   - destination
   - departure city (origin airport)
   - departure date
   - return date
   - number of participants

2. NEVER suggest experiences, activities, or hotels. The flow is ONLY: Trip info → Flights → Checkout.

3. When the user mentions a new destination, start from scratch.

MANDATORY FLOW (always in the language chosen by the user):
1. The user mentions a destination.
   → Ask: "Which city would you like to depart from?"

2. The user provides the departure city.
   → Emit [SET_ORIGIN:CityName] and ask for travel dates. Don't ask the user for a specific format, you will convert it later.

3. The user provides the dates.
   → Ask for the number of participants.

4. The user provides the number of people.
   → You will receive real flights. Present only one and ask for confirmation.
   → Ask: "Do you confirm to proceed to checkout?"

5. The user confirms (ok, yes, sure, confirm, proceed, etc.)
   → ALWAYS EMIT [UNLOCK_ITINERARY_BUTTON:true] at the end of the message to show the checkout button.

DESTINATIONS: Rome, Ibiza, Barcelona, Prague, Budapest, Krakow, Amsterdam, Berlin, Lisbon, Palma de Mallorca

ITALIAN AIRPORTS: Rome, Milan, Naples, Turin, Venice, Bologna, Florence, Bari, Catania, Palermo, Verona, Pisa, Genoa, Brindisi, Olbia, Cagliari, Alghero

BEHAVIOR:
- Short responses (2-3 sentences max)
- Professional and friendly tone
- NO experiences, NO activities, NO hotels in the chat

DIRECTIVES (emit at the end of the message when appropriate):
- [SET_DESTINATION:city] - when the user chooses a destination
- [SET_ORIGIN:city] - when the user provides the departure city
- [SET_DATES:yyyy-mm-dd,yyyy-mm-dd] - when the user provides the dates
- [SET_PARTICIPANTS:number] - when the user provides the number of participants
- [SELECT_FLIGHT:number] - when the user chooses a flight (1, 2, or 3)
- [UNLOCK_ITINERARY_BUTTON:true] - MANDATORY when the user confirms (ok, yes, confirm, sure, proceed)

CRITICAL RULE: When the user responds with any form of confirmation after seeing the flight (ok, yes, sure, confirm, proceed, perfect, etc.), you MUST ALWAYS emit [UNLOCK_ITINERARY_BUTTON:true] at the end of the message. This is MANDATORY.

BOOKING RULES:
- FLIGHTS: Always external checkout via affiliate link.
- HOTELS: DO NOT suggest hotels in the chat. The user will see them at checkout.
- NEVER confirm bookings as if they were already made.
- NEVER suggest experiences or activities.`;

const BYEBRO_SYSTEM_PROMPT = `You are the official assistant of ByeBro, part of the BYEBI app. Your task is to help plan bachelor party trips by finding REAL FLIGHTS. ALWAYS respond in the language the user writes in.

${SHARED_SYSTEM_PROMPT}`;

const BYEBRIDE_SYSTEM_PROMPT = `You are the official assistant of ByeBride, part of the BYEBI app. Your task is to help plan bachelorette party trips by finding REAL FLIGHTS. ALWAYS respond in the language the user writes in.

${SHARED_SYSTEM_PROMPT}`;

export async function createGroqChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
): Promise<string> {
  try {
    // Build context-aware system prompt based on party type
    const basePrompt =
      context.partyType === "bachelorette"
        ? BYEBRIDE_SYSTEM_PROMPT
        : BYEBRO_SYSTEM_PROMPT;
    let contextualPrompt = basePrompt;

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

    // Prepare messages array
    const messages: ChatMessage[] = [
      { role: "system", content: contextualPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "openai/gpt-oss-120b",
      temperature: 0.5,
    });

    return (
      chatCompletion.choices[0]?.message?.content ||
      "Sorry, there was a problem. Please try again!"
    );
  } catch (error) {
    console.error("Groq API error:", error);
    throw new Error("Error communicating with GROQ");
  }
}

export async function* streamGroqChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
): AsyncGenerator<string, void, unknown> {
  try {
    // Build context-aware system prompt based on party type
    const basePrompt =
      context.partyType === "bachelorette"
        ? BYEBRIDE_SYSTEM_PROMPT
        : BYEBRO_SYSTEM_PROMPT;
    let contextualPrompt = basePrompt;

    // Add origin city info if available
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

    // Add real flight options if available
    if (context.flights && context.flights.length > 0) {
      const originCity = context.originCityName || "Rome";
      contextualPrompt += `\n\n🛫 AVAILABLE REAL FLIGHTS (from ${originCity} to ${context.selectedDestination}):`;
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
        //contextualPrompt += `\n${idx + 1}. ${f.airline} - ${f.price} €`;

        contextualPrompt += `   Departure: ${depDate} at ${depTime}\n`;
        contextualPrompt += `   Return: ${retDate} at ${retTime}\n`;
        contextualPrompt += `   Flight no. ${f.flight_number}\n\n`;
      });
      contextualPrompt += `\nWhen the user chooses a flight (e.g., "the 2nd one", "I'll take the first", "flight 3"), you must emit the directive [SELECT_FLIGHT:number] at the end of the message.\n`;
    }

    // Prepare messages array
    const messages: ChatMessage[] = [
      { role: "system", content: contextualPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const stream = await groq.chat.completions.create({
      messages,
      model: "openai/gpt-oss-120b",
      temperature: 0.6,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("Groq streaming error:", error);
    yield "Sorry, there was a problem with the streaming. Please try again!";
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
      model: "openai/gpt-oss-120b",
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
