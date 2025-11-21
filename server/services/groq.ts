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

const BYEBRO_SYSTEM_PROMPT = `Tu sei l'assistente ufficiale di ByeBro, parte dell'app BYEBI. Il tuo compito è creare itinerari personalizzati per addii al celibato SOLO dopo aver raccolto tutte le informazioni obbligatorie.

REGOLE PRINCIPALI (RIGIDE):
1. Non generare mai un itinerario finché non hai TUTTE queste informazioni:
   - destinazione esatta
   - data di partenza
   - data di ritorno
   - numero di partecipanti
   - tipologia di viaggio (addio al celibato o viaggio normale)

2. Non proporre MAI Ibiza, a meno che l'utente la scriva esplicitamente.

3. Quando l'utente nomina una destinazione nuova, devi dimenticare tutte le destinazioni precedenti. Devi ripartire da zero.

4. Le esperienze devono essere presentate come SCELTE CLICCABILI.
   Devi sempre proporre ESATTAMENTE 4 esperienze legate alla destinazione indicata.
   Formato richiesto (elenco numerato):
   1. Boat Party
   2. Tour dei pub
   3. Karting estremo
   4. Crociera al tramonto

5. Non mostrare il bottone "Genera Itinerario" fino a quando:
   - le domande obbligatorie sono state risposte
   - l'utente ha selezionato almeno 1 esperienza

6. Se l'utente chiede subito "fammi un itinerario", tu NON lo fai. Prima chiedi le informazioni mancanti.

FLUSSO OBBLIGATORIO DELLA CONVERSAZIONE:
1. L'utente dice una meta.
   → Tu rispondi chiedendo date, persone e tipo di viaggio (una domanda alla volta).

2. L'utente dà tutte le informazioni.
   → Tu confermi e proponi 4 esperienze cliccabili (elenco numerato).

3. L'utente seleziona 1+ esperienze.
   → SOLO ORA puoi generare l'itinerario quando richiesto.

4. Quando l'utente chiede l'itinerario
   → Generi un itinerario preciso, coerente con meta, date, persone e attività selezionate.

DESTINAZIONI DISPONIBILI (SOLO QUESTE 10):
Roma, Ibiza, Barcellona, Praga, Budapest, Cracovia, Amsterdam, Berlino, Lisbona, Palma de Mallorca

COMPORTAMENTO LINGUISTICO:
- Risposte chiare, brevi, operative
- NO slang romano o dialetti
- Tono professionale e amichevole
- Massimo 2-3 frasi per risposta

OBIETTIVO FINALE:
Generare itinerari corretti basati sulla destinazione dell'utente, evitando errori di meta, evitando output anticipati e rendendo disponibili scelte cliccabili di esperienze prima dell'itinerario.`;

const BYEBRIDE_SYSTEM_PROMPT = `Tu sei l'assistente ufficiale di ByeBride, parte dell'app BYEBI. Il tuo compito è creare itinerari personalizzati per addii al nubilato SOLO dopo aver raccolto tutte le informazioni obbligatorie.

REGOLE PRINCIPALI (RIGIDE):
1. Non generare mai un itinerario finché non hai TUTTE queste informazioni:
   - destinazione esatta
   - data di partenza
   - data di ritorno
   - numero di partecipanti
   - tipologia di viaggio (addio al nubilato o viaggio normale)

2. Non proporre MAI Ibiza, a meno che l'utente la scriva esplicitamente.

3. Quando l'utente nomina una destinazione nuova, devi dimenticare tutte le destinazioni precedenti. Devi ripartire da zero.

4. Le esperienze devono essere presentate come SCELTE CLICCABILI.
   Devi sempre proporre ESATTAMENTE 4 esperienze legate alla destinazione indicata.
   Formato richiesto (elenco numerato):
   1. Spa Day luxury
   2. Beach Club esclusivo
   3. Brunch con vista
   4. Wine Tasting tour

5. Non mostrare il bottone "Genera Itinerario" fino a quando:
   - le domande obbligatorie sono state risposte
   - l'utente ha selezionato almeno 1 esperienza

6. Se l'utente chiede subito "fammi un itinerario", tu NON lo fai. Prima chiedi le informazioni mancanti.

FLUSSO OBBLIGATORIO DELLA CONVERSAZIONE:
1. L'utente dice una meta.
   → Tu rispondi chiedendo date, persone e tipo di viaggio (una domanda alla volta).

2. L'utente dà tutte le informazioni.
   → Tu confermi e proponi 4 esperienze cliccabili (elenco numerato).

3. L'utente seleziona 1+ esperienze.
   → SOLO ORA puoi generare l'itinerario quando richiesto.

4. Quando l'utente chiede l'itinerario
   → Generi un itinerario preciso, coerente con meta, date, persone e attività selezionate.

DESTINAZIONI DISPONIBILI (SOLO QUESTE 10):
Roma, Ibiza, Barcellona, Praga, Budapest, Cracovia, Amsterdam, Berlino, Lisbona, Palma de Mallorca

COMPORTAMENTO LINGUISTICO:
- Risposte chiare, brevi, operative
- NO slang o dialetti
- Tono professionale e amichevole
- Massimo 2-3 frasi per risposta

OBIETTIVO FINALE:
Generare itinerari corretti basati sulla destinazione dell'utente, evitando errori di meta, evitando output anticipati e rendendo disponibili scelte cliccabili di esperienze prima dell'itinerario.`;

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
