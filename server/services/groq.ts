import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  selectedDestination?: string;
  tripDetails?: {
    people: number;
    days: number;
    adventureType: string;
  };
  conversationState?: {
    currentStep: string;
  };
  partyType?: 'bachelor' | 'bachelorette';
}

const BYEBRO_SYSTEM_PROMPT = `Sei l'assistente AI di ByeBro, la piattaforma #1 per organizzare addii al celibato epici in Europa!

PERSONALITÀ:
- Entusiasta, energico e informale (usa "tu" non "lei")
- Usa emojis con moderazione per dare energia
- Parla come un amico che organizza il miglior weekend di sempre
- Focus totale su divertimento, festa e esperienze memorabili

DESTINAZIONI DISPONIBILI (SOLO QUESTE 10):
1. 🇮🇹 Roma - Storia, cibo incredibile, vita notturna a Trastevere
2. 🇪🇸 Ibiza - Club leggendari, boat party, spiagge paradisiache
3. 🇪🇸 Barcellona - Spiagge, tapas, vita notturna pazzesca
4. 🇨🇿 Praga - Birra economica, castelli, locali fantastici
5. 🇭🇺 Budapest - Bagni termali, ruin bar, prezzi ottimi
6. 🇵🇱 Cracovia - Prezzi imbattibili, centro UNESCO
7. 🇳🇱 Amsterdam - Canali, vita notturna, atmosfera unica
8. 🇩🇪 Berlino - Club underground techno 24/7
9. 🇵🇹 Lisbona - Fascino costiero, fado, autenticità
10. 🇪🇸 Palma de Mallorca - Beach club esclusivi

COMPITO:
- Aiuta a pianificare addii al celibato indimenticabili
- Fai domande su: destinazione, numero persone, durata, tipo di esperienza
- Suggerisci attività, club, ristoranti, esperienze
- Sii specifico con prezzi e dettagli quando possibile
- Per Ibiza, hai un database completo di venue e prezzi

STILE RISPOSTE:
- Brevi e puntuali (max 3-4 frasi)
- Concrete e actionable
- Un'emozione alla volta
- Entusiaste ma non esagerate`;

const BYEBRIDE_SYSTEM_PROMPT = `Sei l'assistente AI di ByeBride, la piattaforma #1 per organizzare addii al nubilato indimenticabili in Europa! 💕

PERSONALITÀ:
- Entusiasta, allegra e informale (usa "tu" non "lei")
- Usa emojis con moderazione per dare energia positiva
- Parla come un'amica che organizza il miglior weekend di sempre
- Focus su divertimento, relax, spa, beach club e esperienze magiche

DESTINAZIONI DISPONIBILI (SOLO QUESTE 10):
1. 🇮🇹 Roma - Storia, shopping, aperitivi chic, rooftop bar
2. 🇪🇸 Ibiza - Beach club esclusivi, sunset, boat party glamour
3. 🇪🇸 Barcellona - Spiagge, brunch, spa, tapas e shopping
4. 🇨🇿 Praga - Spa rilassanti, castelli, atmosfera romantica
5. 🇭🇺 Budapest - Bagni termali luxury, ruin bar, prezzi ottimi
6. 🇵🇱 Cracovia - Prezzi imbattibili, centro UNESCO, spa
7. 🇳🇱 Amsterdam - Canali romantici, brunch, shopping unico
8. 🇩🇪 Berlino - Club alternativi, spa, atmosfera cosmopolita
9. 🇵🇹 Lisbona - Fascino costiero, sunset, rooftop bar
10. 🇪🇸 Palma de Mallorca - Beach club luxury, spa, relax

COMPITO:
- Aiuta a pianificare addii al nubilato indimenticabili
- Fai domande su: destinazione, numero persone, durata, tipo di esperienza
- Suggerisci attività: spa, beach club, brunch, shopping, cocktail bar, wellness
- Sii specifico con prezzi e dettagli quando possibile

STILE RISPOSTE:
- Brevi e puntuali (max 3-4 frasi)
- Concrete e actionable
- Un'emozione alla volta
- Entusiaste ma eleganti`;

export async function createGroqChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    // Build context-aware system prompt based on party type
    const basePrompt = context.partyType === 'bachelorette' ? BYEBRIDE_SYSTEM_PROMPT : BYEBRO_SYSTEM_PROMPT;
    let contextualPrompt = basePrompt;
    
    if (context.selectedDestination) {
      contextualPrompt += `\n\nDESTINAZIONE SELEZIONATA: ${context.selectedDestination.toUpperCase()}`;
      
      if (context.tripDetails) {
        contextualPrompt += `\nDETTAGLI VIAGGIO:`;
        if (context.tripDetails.people > 0) contextualPrompt += `\n- Persone: ${context.tripDetails.people}`;
        if (context.tripDetails.days > 0) contextualPrompt += `\n- Giorni: ${context.tripDetails.days}`;
        if (context.tripDetails.adventureType) contextualPrompt += `\n- Tipo: ${context.tripDetails.adventureType}`;
      }
    }

    // Prepare messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: contextualPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: userMessage }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 500,
      top_p: 0.9,
    });

    return chatCompletion.choices[0]?.message?.content || "Mi dispiace, c'è stato un problema. Riprova!";
  } catch (error) {
    console.error("Groq API error:", error);
    throw new Error("Errore nella comunicazione con GROQ");
  }
}

export async function* streamGroqChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = []
): AsyncGenerator<string, void, unknown> {
  try {
    // Build context-aware system prompt based on party type
    const basePrompt = context.partyType === 'bachelorette' ? BYEBRIDE_SYSTEM_PROMPT : BYEBRO_SYSTEM_PROMPT;
    let contextualPrompt = basePrompt;
    
    if (context.selectedDestination) {
      contextualPrompt += `\n\nDESTINAZIONE SELEZIONATA: ${context.selectedDestination.toUpperCase()}`;
      
      if (context.tripDetails) {
        contextualPrompt += `\nDETTAGLI VIAGGIO:`;
        if (context.tripDetails.people > 0) contextualPrompt += `\n- Persone: ${context.tripDetails.people}`;
        if (context.tripDetails.days > 0) contextualPrompt += `\n- Giorni: ${context.tripDetails.days}`;
        if (context.tripDetails.adventureType) contextualPrompt += `\n- Tipo: ${context.tripDetails.adventureType}`;
      }
    }

    // Prepare messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: contextualPrompt },
      ...conversationHistory.slice(-6),
      { role: 'user', content: userMessage }
    ];

    const stream = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 500,
      top_p: 0.9,
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
    yield "Mi dispiace, c'è stato un problema con lo streaming. Riprova!";
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
  partyType: 'bachelor' | 'bachelorette' = 'bachelor'
): Promise<ActivitySuggestion[]> {
  try {
    const partyContext = partyType === 'bachelorette' 
      ? 'bachelorette parties with focus on spa, beach clubs, brunch, shopping, cocktail bars, wellness experiences'
      : 'bachelor parties with focus on nightclubs, boat parties, karting, paintball, breweries, VIP experiences';
    
    const systemPrompt = `You are an expert travel activity planner for ${partyContext} in Europe.

Generate 6 creative and exciting activity suggestions for ${destination} for a party happening in ${timeReference}.

Return ONLY a valid JSON array with exactly 6 activities. Each activity must have:
- name: Short, catchy name (max 4 words)
- description: Brief description (max 15 words)
- icon: One of these exactly: "music", "ship", "utensils", "party", "car", "waves", "flame", "beer", "mappin"
- venues: Array of 2-3 specific venue/location names in ${destination}

${partyType === 'bachelorette' 
  ? 'Focus on: spa experiences, beach clubs, brunch spots, rooftop bars, wellness centers, shopping districts, sunset cruises, wine tasting, cooking classes.'
  : 'Focus on: nightclubs, boat parties, karting, paintball, beach clubs, breweries, escape rooms, VIP experiences, restaurants, bars.'
}

Return ONLY the JSON array, no other text.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate 6 activity suggestions for ${destination}` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      max_tokens: 1000,
      top_p: 0.95,
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

    return suggestions.slice(0, 6).map(s => ({
      name: s.name || "Party Activity",
      description: s.description || "Fun activity for your group",
      icon: s.icon || "party",
      venues: Array.isArray(s.venues) ? s.venues.slice(0, 3) : []
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
      venues: ["Local Club 1", "Local Club 2", "Local Club 3"]
    },
    {
      name: "Boat Party",
      description: "Private boat with drinks and music",
      icon: "ship",
      venues: ["Marina Charter", "Party Boats Co", "Sunset Cruises"]
    },
    {
      name: "Group Dinner",
      description: "Exclusive dining experience with great food",
      icon: "utensils",
      venues: ["Restaurant 1", "Restaurant 2", "Restaurant 3"]
    },
    {
      name: "Beach Club",
      description: "Relax and party at a premium beach club",
      icon: "waves",
      venues: ["Beach Club 1", "Beach Club 2", "Beach Club 3"]
    },
    {
      name: "Karting Race",
      description: "Competitive go-kart racing for the group",
      icon: "car",
      venues: ["Racing Track", "Karting Center", "Speed Zone"]
    },
    {
      name: "Bar Crawl",
      description: "Tour the best bars with a guide",
      icon: "beer",
      venues: ["Bar District", "Pub Street", "Nightlife Area"]
    }
  ];
}
