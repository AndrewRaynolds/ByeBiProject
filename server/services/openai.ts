import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ItineraryRequest {
  destination: string;
  country: string;
  days: number;
  groupSize: number;
  budget: "budget" | "standard" | "luxury";
  interests: string[];
  theme: string;
}

interface DailyPlan {
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

interface GeneratedItinerary {
  title: string;
  destination: string;
  summary: string;
  days: DailyPlan[];
  tips: string[];
  estimatedTotalCost: string;
}

// Funzione per generare itinerari di esempio in caso di fallback
function generateFallbackItinerary(request: ItineraryRequest): GeneratedItinerary {
  console.log("Generando itinerario fallback per", request.destination, "con budget", request.budget);
  
  // Moltiplicatore di costo basato sul budget
  const budgetMultiplier = request.budget === "budget" ? 1 : request.budget === "standard" ? 1.6 : 2.5;
  const baseCost = 80 * budgetMultiplier;
  const totalPerDay = baseCost * request.groupSize;
  const totalCost = (totalPerDay * request.days).toFixed(0);
  
  // Dati specifici per Barcellona
  const barcelonaData = {
    brunch: [
      { name: "Brunch & Cake", location: "Carrer d'Enric Granados, 19", price: 25 },
      { name: "Milk Bar & Bistro", location: "Carrer d'en Gignàs, 21", price: 20 },
      { name: "Federal Café", location: "Carrer del Parlament, 39", price: 18 },
      { name: "Flax & Kale", location: "Carrer dels Tallers, 74b", price: 30 }
    ],
    bars: [
      { name: "Espit Chupitos", location: "Carrer d'Aribau, 77", price: 30, description: "Famous shots bar with hundreds of different creative shots" },
      { name: "Dow Jones Bar", location: "Carrer del Bruc, 97", price: 35, description: "Bar where drink prices fluctuate based on demand, like a stock market" },
      { name: "CocoVail Beer Hall", location: "Carrer d'Aragó, 284", price: 40, description: "American-style beer hall with a wide selection of craft beers" },
      { name: "Bobby's Free", location: "Carrer de Pau Claris, 85", price: 45, description: "Speakeasy cocktail bar hidden behind a barbershop façade" },
      { name: "Dr. Stravinsky", location: "Carrer dels Mirallers, 5", price: 50, description: "Innovative cocktail bar with lab-like atmosphere and unique drinks" }
    ],
    nightclubs: [
      { name: "Opium Barcelona", location: "Passeig Marítim, 34", price: 60, description: "Beachfront superclub with international DJs and ocean views" },
      { name: "Pacha Barcelona", location: "Passeig Marítim, 38", price: 65, description: "Barcelona outpost of the famous Ibiza club" },
      { name: "Razzmatazz", location: "Carrer dels Almogàvers, 122", price: 50, description: "Huge multi-room club with different music styles in each space" },
      { name: "Shôko", location: "Passeig Marítim, 36", price: 70, description: "Beachfront restaurant that transforms into a high-energy nightclub" },
      { name: "Sala Apolo", location: "Carrer Nou de la Rambla, 113", price: 40, description: "Historic venue with different themed nights" }
    ],
    restaurants: [
      { name: "Ciudad Condal", location: "Rambla de Catalunya, 18", price: 45, description: "Popular tapas bar with a wide variety of Spanish cuisine" },
      { name: "Cervecería Catalana", location: "Carrer de Mallorca, 236", price: 40, description: "Bustling tapas bar serving Spanish classics" },
      { name: "El Nacional", location: "Passeig de Gràcia, 24", price: 65, description: "Multi-space culinary experience with different food areas" },
      { name: "Botafumeiro", location: "Carrer Gran de Gràcia, 81", price: 90, description: "Upscale seafood restaurant favored by celebrities" },
      { name: "Can Culleretes", location: "Carrer d'en Quintana, 5", price: 50, description: "The oldest restaurant in Barcelona (since 1786)" }
    ],
    activities: [
      { name: "Boat Party Barcelona", location: "Port Olímpic", price: 80, description: "3-hour party cruise with drinks and music along the coast" },
      { name: "Barça Stadium Tour", location: "C. d'Arístides Maillol, 12", price: 35, description: "Tour of Camp Nou, the legendary FC Barcelona stadium" },
      { name: "Beach Club Day", location: "W Barcelona, Plaça Rosa Del Vents, 1", price: 100, description: "Day beds, cocktails and beach service at a premium beach club" },
      { name: "Montjuïc Cable Car", location: "Av. Miramar, 30", price: 15, description: "Scenic cable car ride offering panoramic views of the city" },
      { name: "Cooking Class", location: "Barcelona Cooking, La Rambla, 91", price: 70, description: "Interactive paella and tapas cooking class with drinks" }
    ],
    tips: [
      "Barcelona's nightlife usually doesn't pick up until after midnight, so plan accordingly",
      "The metro stops running at midnight Sunday to Thursday, and at 2 AM on Friday nights",
      "Reserve tables at popular clubs in advance to avoid waiting in long lines",
      "Taxis are plentiful and relatively affordable for late-night transportation",
      "Pickpocketing can be common in touristy areas, especially La Rambla, so stay alert",
      "Most bars in Barcelona have happy hour specials from 6-8 PM",
      "Clubs often have a free guest list you can join online before 1 AM",
      "Keep a copy of your hotel address in Spanish to show taxi drivers"
    ]
  };
  
  // Set per tenere traccia dei luoghi usati per evitare duplicati
  const usedPlaces = new Set<string>();
  
  // Funzione per selezionare un elemento casuale da un array senza ripetizioni
  const getUniqueRandom = <T extends { name: string }>(array: T[]): T => {
    const availableOptions = array.filter(item => !usedPlaces.has(item.name));
    if (availableOptions.length === 0) {
      // Se abbiamo usato tutte le opzioni, ripristiniamo
      usedPlaces.clear();
      return array[Math.floor(Math.random() * array.length)];
    }
    const selected = availableOptions[Math.floor(Math.random() * availableOptions.length)];
    usedPlaces.add(selected.name);
    return selected;
  };
  
  // Temi diversi per ogni giorno
  const dayThemes = [
    "The Perfect Introduction",
    "Local Culture Immersion",
    "Beach & Party Day",
    "Final Celebration"
  ];
  
  // Crea giorni diversi per l'itinerario
  const createDayPlan = (dayNum: number): DailyPlan => {
    const dayActivities = [];
    
    // MATTINA
    if (dayNum === 1) {
      // Primo giorno: check-in e introduzione alla città
      dayActivities.push({
        time: "11:00",
        activity: "Check-in & Welcome Drinks",
        description: "Arrive at your accommodation, check in, and enjoy welcome drinks while planning your adventure",
        location: "Your Accommodation in Barcelona",
        cost: `€${(15 * budgetMultiplier).toFixed(0)} per person`
      });
    } else {
      // Brunch di recupero
      const brunchSpot = getUniqueRandom(barcelonaData.brunch);
      dayActivities.push({
        time: "11:00",
        activity: `Recovery Brunch at ${brunchSpot.name}`,
        description: "Start the day with a late, hearty brunch to recover from the previous night's activities",
        location: brunchSpot.location,
        cost: `€${(brunchSpot.price * budgetMultiplier).toFixed(0)} per person`
      });
    }
    
    // POMERIGGIO
    if (dayNum === 1) {
      // Primo giorno: tour orientativo
      dayActivities.push({
        time: "14:00",
        activity: "Bachelor Party Kickoff Tour",
        description: "A guided walking tour of Barcelona's best bachelor party spots with a local expert",
        location: "Gothic Quarter",
        cost: `€${(30 * budgetMultiplier).toFixed(0)} per person`
      });
    } else if (dayNum === request.days) {
      // Ultimo giorno: attività speciale
      const activity = barcelonaData.activities[0]; // Boat party
      dayActivities.push({
        time: "14:00",
        activity: activity.name,
        description: activity.description,
        location: activity.location,
        cost: `€${(activity.price * budgetMultiplier).toFixed(0)} per person`
      });
    } else {
      // Altri giorni: attività varie
      const activity = getUniqueRandom(barcelonaData.activities);
      dayActivities.push({
        time: "15:00",
        activity: activity.name,
        description: activity.description,
        location: activity.location,
        cost: `€${(activity.price * budgetMultiplier).toFixed(0)} per person`
      });
    }
    
    // SERA: Bar Crawl o Cena
    if (request.interests.includes("barCrawl")) {
      // Se hanno selezionato bar crawl
      const startBar = getUniqueRandom(barcelonaData.bars);
      const secondBar = getUniqueRandom(barcelonaData.bars);
      
      dayActivities.push({
        time: "19:30",
        activity: `Bar Crawl Starting at ${startBar.name}`,
        description: `Begin your epic bar crawl at ${startBar.name} (${startBar.description}), followed by ${secondBar.name} and more`,
        location: startBar.location,
        cost: `€${((startBar.price + secondBar.price) * budgetMultiplier).toFixed(0)} per person`
      });
    } else {
      // Altrimenti, cena in ristorante
      const restaurant = getUniqueRandom(barcelonaData.restaurants);
      dayActivities.push({
        time: "20:00",
        activity: `Group Dinner at ${restaurant.name}`,
        description: restaurant.description,
        location: restaurant.location,
        cost: `€${(restaurant.price * budgetMultiplier).toFixed(0)} per person`
      });
    }
    
    // NOTTE
    if (request.interests.includes("nightclubs")) {
      const club = getUniqueRandom(barcelonaData.nightclubs);
      dayActivities.push({
        time: "00:00",
        activity: `VIP Night at ${club.name}`,
        description: `${club.description} with VIP table service and bottle service`,
        location: club.location,
        cost: `€${(club.price * 2 * budgetMultiplier).toFixed(0)} per person`
      });
    } else {
      // Fallback per chi non ha selezionato locali notturni
      const bar = getUniqueRandom(barcelonaData.bars);
      dayActivities.push({
        time: "22:00",
        activity: `Premium Experience at ${bar.name}`,
        description: bar.description,
        location: bar.location,
        cost: `€${(bar.price * 1.5 * budgetMultiplier).toFixed(0)} per person`
      });
    }
    
    // Genera il giorno formattato
    return {
      day: dayNum,
      title: `Day ${dayNum}: ${dayThemes[Math.min(dayNum - 1, dayThemes.length - 1)]}`,
      schedule: dayActivities,
      notes: dayNum === 1
        ? "Start your bachelor party adventure with a perfect introduction to Barcelona's vibrant scene."
        : dayNum === request.days
        ? "Make your final day in Barcelona an epic celebration to remember!"
        : "Continue exploring Barcelona's incredible nightlife and culture."
    };
  };
  
  // Crea un giorno per ciascun giorno richiesto
  const days = [];
  for (let i = 1; i <= request.days; i++) {
    days.push(createDayPlan(i));
  }
  
  // Calcola il costo stimato totale basato sulle attività
  let totalEstimated = 0;
  days.forEach(day => {
    day.schedule.forEach(activity => {
      if (activity.cost) {
        const costMatch = activity.cost.match(/€(\d+)/);
        if (costMatch && costMatch[1]) {
          totalEstimated += parseInt(costMatch[1], 10);
        }
      }
    });
  });
  
  // Arrotonda il totale a multipli di 50
  totalEstimated = Math.ceil(totalEstimated / 50) * 50;
  
  return {
    title: `${request.theme} in ${request.destination}`,
    destination: `${request.destination}, ${request.country}`,
    summary: `An unforgettable ${request.days}-day bachelor party in ${request.destination}, featuring the best nightlife, activities, and experiences tailored for a group of ${request.groupSize}. Experience the vibrant atmosphere of Barcelona's famous nightlife with a carefully curated plan that fits your ${request.budget} budget.`,
    days: days,
    tips: barcelonaData.tips.slice(0, 5),
    estimatedTotalCost: `€${totalEstimated} per person`
  };
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
        model: "gpt-4o",
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
        response_format: { type: "json_object" },
        temperature: 0.7,
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
    
    const systemPrompt = `Sei l'assistente ByeBro per organizzare addii al celibato. Rispondi sempre in italiano con tono informale ed entusiasta.

DESTINAZIONI DISPONIBILI: Roma, Ibiza, Barcellona, Praga, Budapest, Cracovia, Amsterdam, Berlino, Lisbona, Palma de Mallorca

REGOLE CONVERSAZIONE:
1. Se l'utente menziona una destinazione, impostala e chiedi dettagli
2. Per Ibiza, raccogli step-by-step: numero persone → giorni → tipo avventura
3. Quando hai tutti i dettagli per Ibiza, genera un itinerario dettagliato
4. Usa emoji e tono entusiasta
5. Non ripetere domande già fatte

STATO ATTUALE:
- Destinazione: ${selectedDestination || 'nessuna'}
- Persone: ${tripDetails?.people || 0}
- Giorni: ${tripDetails?.days || 0}
- Tipo avventura: ${tripDetails?.adventureType || 'non specificato'}
- Step conversazione: ${conversationState?.currentStep || 'initial'}

Rispondi al messaggio dell'utente basandoti su questo contesto. Restituisci la risposta in formato JSON con questa struttura:
{
  "response": "la tua risposta",
  "updatedTripDetails": { "people": numero, "days": numero, "adventureType": "tipo" },
  "updatedConversationState": { "currentStep": "step", "askedForPeople": boolean },
  "selectedDestination": "destinazione"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      response: result.response || "Scusa, non ho capito. Puoi ripetere?",
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

const TRIP_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "set_destination",
      description:
        "Set the travel destination when the user chooses where they want to go",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "The destination city name" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_origin",
      description:
        "Set the departure city when the user specifies where they want to fly from",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "The origin/departure city name",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_dates",
      description:
        "Set the travel dates when the user provides departure and return dates",
      parameters: {
        type: "object",
        properties: {
          departure_date: {
            type: "string",
            description: "Departure date in YYYY-MM-DD format",
          },
          return_date: {
            type: "string",
            description: "Return date in YYYY-MM-DD format",
          },
        },
        required: ["departure_date", "return_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_participants",
      description:
        "Set the number of participants when the user specifies how many people are traveling",
      parameters: {
        type: "object",
        properties: {
          count: {
            type: "integer",
            description: "Number of participants/travelers",
          },
        },
        required: ["count"],
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

const SHARED_SYSTEM_PROMPT = `CRITICAL RULE: You MUST ALWAYS provide a text response to the user, even when calling tools. Never respond with ONLY tool calls - always include a friendly message.

REQUIRED DATA POINTS:
Before searching for flights, you MUST have ALL of the following:
- destination (where they want to go)
- origin (departure city/airport)
- departure date
- return date
- number of participants

If the user provides multiple data points in one message, process ALL of them at once by calling the appropriate tools. You don't need to ask one question at a time. If some are still missing, ask for them naturally in your response. Once all information is collected, proceed to search and show flights immediately.

AVAILABLE DESTINATIONS: Rome, Ibiza, Barcelona, Prague, Budapest, Krakow, Amsterdam, Berlin, Lisbon, Palma de Mallorca

TOOL USAGE:
- Call set_destination when you learn the destination
- Call set_origin when you learn the departure city
- Call set_dates when you learn travel dates (convert to YYYY-MM-DD format)
- Call set_participants when you learn the group size
- Call select_flight when the user chooses a flight option
- Call unlock_checkout when the user confirms they want to book

You can call MULTIPLE tools in a single response if the user provides multiple pieces of information.

PROACTIVE FOLLOW-UPS:
After processing what the user provides, ALWAYS respond with text AND check which required data points are still missing. Ask about them naturally. Be conversational - don't just list what's missing. For example:
- If you have destination and dates but no origin: "Great choice! Where will you be flying from?"
- If you only have destination: "Sounds exciting! When are you thinking of going, and how many people will be joining?"
- If everything is ready: Proceed to show flights immediately.

BEHAVIOR:
- ALWAYS include a text message in your response - never just tool calls alone
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
      model: "gpt-4o",
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
      model: "gpt-4o",
      temperature: 0.6,
      stream: true,
      tools: TRIP_TOOLS,
      tool_choice: "auto",
    });

    const toolCallsBuffer: Map<number, { name: string; arguments: string }> =
      new Map();
    let hasContent = false;
    const collectedToolCalls: ToolCall[] = [];

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
              collectedToolCalls.push(toolCall);
              yield { type: "tool_call", toolCall };
            } catch (e) {
              console.error("Error parsing streamed tool call:", e);
            }
          }
        }
        toolCallsBuffer.clear();
      }
    }

    if (!hasContent && collectedToolCalls.length > 0) {
      const followUpMessage = generateFollowUpMessage(
        collectedToolCalls,
        context,
      );
      yield { type: "content", content: followUpMessage };
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
  const toolNames = toolCalls.map((tc) => tc.name);

  const hasDestination =
    toolNames.includes("set_destination") || context.selectedDestination;
  const hasOrigin = toolNames.includes("set_origin") || context.origin;
  const hasDates =
    toolNames.includes("set_dates") ||
    (context.tripDetails?.startDate && context.tripDetails?.endDate);
  const hasParticipants =
    toolNames.includes("set_participants") ||
    (context.tripDetails?.people && context.tripDetails.people > 0);

  const destCall = toolCalls.find((tc) => tc.name === "set_destination");
  const destination =
    destCall?.arguments?.city || context.selectedDestination || "";

  if (hasDestination && hasDates && hasOrigin && hasParticipants) {
    return `Perfect! I've got all the details for your trip to ${destination}. Let me find the best flights for you!`;
  }

  if (hasDestination && hasDates && hasOrigin) {
    return `Great choice! ${destination} is an amazing destination. How many people will be joining the trip?`;
  }

  if (hasDestination && hasDates) {
    return `${destination} sounds perfect! Which city will you be flying from?`;
  }

  if (hasDestination && hasOrigin) {
    return `Got it! When are you planning to travel to ${destination}? Let me know your departure and return dates.`;
  }

  if (hasDestination) {
    return `${destination} is an excellent choice! When are you thinking of going, and where will you be flying from?`;
  }

  return "Got it! What else can you tell me about your trip plans?";
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

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate 6 activity suggestions for ${destination}`,
        },
      ],
      model: "gpt-4o",
      temperature: 0.65,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "[]";

    let jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response");
      return getFallbackActivities(destination);
    }

    const suggestions: ActivitySuggestion[] = JSON.parse(jsonMatch[0]);

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