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
    startDate?: string;
    endDate?: string;
  };
  conversationState?: {
    currentStep: string;
  };
  partyType?: 'bachelor' | 'bachelorette';
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
    bookingFlow: 'IN_APP' | 'REDIRECT';
    paymentPolicy: string;
    roomDescription?: string;
  }[];
}

const BYEBRO_SYSTEM_PROMPT = `Tu sei l'assistente ufficiale di ByeBro, parte dell'app BYEBI. Il tuo compito è aiutare a pianificare viaggi per addii al celibato trovando VOLI REALI.

REGOLE PRINCIPALI:
1. Raccogli SEMPRE queste 5 informazioni PRIMA di cercare voli:
   - destinazione
   - città di partenza (aeroporto origine)
   - data partenza
   - data ritorno
   - numero partecipanti

2. NON proporre MAI esperienze, attività o hotel. Il flusso è SOLO: Info viaggio → Voli → Checkout.

3. Quando l'utente nomina una destinazione nuova, riparti da zero.

FLUSSO OBBLIGATORIO:
1. L'utente dice una meta.
   → Chiedi: "Da quale città italiana vuoi partire?"

2. L'utente dice la città di partenza.
   → Emetti [SET_ORIGIN:NomeCittà] e chiedi le date del viaggio.

3. L'utente dà le date.
   → Chiedi il numero di partecipanti.

4. L'utente dà il numero persone.
   → Riceverai i voli reali. Presentane solo uno e chiedi conferma.
   → Chiedi: "Confermi per procedere al checkout?"

5. L'utente conferma (ok, sì, va bene, confermo, procedi, ecc.)
   → EMETTI SEMPRE [UNLOCK_ITINERARY_BUTTON:true] alla fine del messaggio per mostrare il bottone checkout.

DESTINAZIONI: Roma, Ibiza, Barcellona, Praga, Budapest, Cracovia, Amsterdam, Berlino, Lisbona, Palma de Mallorca

AEROPORTI ITALIANI: Roma, Milano, Napoli, Torino, Venezia, Bologna, Firenze, Bari, Catania, Palermo, Verona, Pisa, Genova, Brindisi, Olbia, Cagliari, Alghero

COMPORTAMENTO:
- Risposte brevi (2-3 frasi max)
- Tono professionale e amichevole
- NO esperienze, NO attività, NO hotel nella chat

DIRETTIVE (emetti alla fine del messaggio quando appropriato):
- [SET_DESTINATION:città] - quando l'utente sceglie una destinazione
- [SET_ORIGIN:città] - quando l'utente dice la città di partenza
- [SET_DATES:yyyy-mm-dd,yyyy-mm-dd] - quando l'utente fornisce le date
- [SET_PARTICIPANTS:numero] - quando l'utente dice quanti partecipanti
- [SELECT_FLIGHT:numero] - quando l'utente sceglie un volo (1, 2 o 3)
- [UNLOCK_ITINERARY_BUTTON:true] - OBBLIGATORIO quando l'utente conferma (ok, sì, confermo, va bene, procedi)

REGOLA CRITICA: Quando l'utente risponde con qualsiasi forma di conferma dopo aver visto il volo (ok, sì, va bene, confermo, procedi, perfetto, ecc.), DEVI SEMPRE emettere [UNLOCK_ITINERARY_BUTTON:true] alla fine del messaggio. Questo è OBBLIGATORIO.

REGOLE BOOKING:
- VOLI: Sempre checkout esterno tramite link affiliato.
- HOTEL: NON proporre hotel nella chat. L'utente li vedrà nel checkout.
- NON confermare MAI prenotazioni come se fossero già fatte.
- NON proporre MAI esperienze o attività.`;

const BYEBRIDE_SYSTEM_PROMPT = `Tu sei l'assistente ufficiale di ByeBride, parte dell'app BYEBI. Il tuo compito è aiutare a pianificare viaggi per addii al nubilato trovando VOLI REALI.

REGOLE PRINCIPALI:
1. Raccogli SEMPRE queste 5 informazioni PRIMA di cercare voli:
   - destinazione
   - città di partenza (aeroporto origine)
   - data partenza
   - data ritorno
   - numero partecipanti

2. NON proporre MAI esperienze, attività o hotel. Il flusso è SOLO: Info viaggio → Voli → Checkout.

3. Quando l'utente nomina una destinazione nuova, riparti da zero.

FLUSSO OBBLIGATORIO:
1. L'utente dice una meta.
   → Chiedi: "Da quale città italiana vuoi partire?"

2. L'utente dice la città di partenza.
   → Emetti [SET_ORIGIN:NomeCittà] e chiedi le date del viaggio.

3. L'utente dà le date.
   → Chiedi il numero di partecipanti.

4. L'utente dà il numero persone.
   → Riceverai i voli reali. Presentane solo uno e chiedi conferma.
   → Chiedi: "Confermi per procedere al checkout?"

5. L'utente conferma (ok, sì, va bene, confermo, procedi, ecc.)
   → EMETTI SEMPRE [UNLOCK_ITINERARY_BUTTON:true] alla fine del messaggio per mostrare il bottone checkout.

DESTINAZIONI: Roma, Ibiza, Barcellona, Praga, Budapest, Cracovia, Amsterdam, Berlino, Lisbona, Palma de Mallorca

AEROPORTI ITALIANI: Roma, Milano, Napoli, Torino, Venezia, Bologna, Firenze, Bari, Catania, Palermo, Verona, Pisa, Genova, Brindisi, Olbia, Cagliari, Alghero

COMPORTAMENTO:
- Risposte brevi (2-3 frasi max)
- Tono professionale e amichevole
- NO esperienze, NO attività, NO hotel nella chat

DIRETTIVE (emetti alla fine del messaggio quando appropriato):
- [SET_DESTINATION:città] - quando l'utente sceglie una destinazione
- [SET_ORIGIN:città] - quando l'utente dice la città di partenza
- [SET_DATES:yyyy-mm-dd,yyyy-mm-dd] - quando l'utente fornisce le date
- [SET_PARTICIPANTS:numero] - quando l'utente dice quanti partecipanti
- [SELECT_FLIGHT:numero] - quando l'utente sceglie un volo (1, 2 o 3)
- [UNLOCK_ITINERARY_BUTTON:true] - OBBLIGATORIO quando l'utente conferma (ok, sì, confermo, va bene, procedi)

REGOLA CRITICA: Quando l'utente risponde con qualsiasi forma di conferma dopo aver visto il volo (ok, sì, va bene, confermo, procedi, perfetto, ecc.), DEVI SEMPRE emettere [UNLOCK_ITINERARY_BUTTON:true] alla fine del messaggio. Questo è OBBLIGATORIO.

REGOLE BOOKING:
- VOLI: Sempre checkout esterno tramite link affiliato.
- HOTEL: NON proporre hotel nella chat. L'utente li vedrà nel checkout.
- NON confermare MAI prenotazioni come se fossero già fatte.
- NON proporre MAI esperienze o attività.`;

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
    
    // Add origin city info if available
    if (context.origin && context.originCityName) {
      contextualPrompt += `\n\nCITTÀ DI PARTENZA: ${context.originCityName} (codice aeroporto: ${context.origin})`;
    }
    
    if (context.selectedDestination) {
      contextualPrompt += `\n\nDESTINAZIONE SELEZIONATA: ${context.selectedDestination.toUpperCase()}`;
      
      if (context.tripDetails) {
        contextualPrompt += `\nDETTAGLI VIAGGIO:`;
        if (context.tripDetails.people > 0) contextualPrompt += `\n- Persone: ${context.tripDetails.people}`;
        if (context.tripDetails.days > 0) contextualPrompt += `\n- Giorni: ${context.tripDetails.days}`;
        if (context.tripDetails.adventureType) contextualPrompt += `\n- Tipo: ${context.tripDetails.adventureType}`;
      }
    }
    
    // Add real flight options if available
    if (context.flights && context.flights.length > 0) {
      const originCity = context.originCityName || 'Roma';
      contextualPrompt += `\n\n🛫 VOLI REALI DISPONIBILI (da ${originCity} verso ${context.selectedDestination}):`;
      contextualPrompt += `\nQuesti sono voli REALI con prezzi aggiornati. Presentali all'utente e chiedi quale preferisce.\n`;
      context.flights.forEach((f, idx) => {
        const depDate = new Date(f.departure_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
        const depTime = new Date(f.departure_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const retDate = new Date(f.return_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
        const retTime = new Date(f.return_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); 
        //contextualPrompt += `\n${idx + 1}. ${f.airline} - ${f.price} €`;
        
        contextualPrompt += `   Partenza: ${depDate} ore ${depTime}\n`;
        contextualPrompt += `   Ritorno: ${retDate} ore ${retTime}\n`;
        contextualPrompt += `   Volo n. ${f.flight_number}\n\n`;
      });
      contextualPrompt += `\nQuando l'utente sceglie un volo (es. "il 2", "prendo il primo", "volo 3"), devi emettere la direttiva [SELECT_FLIGHT:numero] alla fine del messaggio.\n`;
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
