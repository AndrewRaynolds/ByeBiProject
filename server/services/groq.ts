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
    price: number;
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

const BYEBRO_SYSTEM_PROMPT = `Tu sei l'assistente ufficiale di ByeBro, parte dell'app BYEBI. Il tuo compito è creare itinerari personalizzati per addii al celibato SOLO dopo aver raccolto tutte le informazioni obbligatorie.

REGOLE PRINCIPALI (RIGIDE):
1. Non generare mai un itinerario finché non hai TUTTE queste informazioni:
   - destinazione esatta
   - CITTÀ DI PARTENZA (aeroporto di origine in Italia)
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
   - l'utente ha scelto un volo

6. Se l'utente chiede subito "fammi un itinerario", tu NON lo fai. Prima chiedi le informazioni mancanti.

FLUSSO OBBLIGATORIO DELLA CONVERSAZIONE:
1. L'utente dice una meta.
   → Chiedi: "Da quale città italiana vuoi partire?" (Roma, Milano, Napoli, Torino, Venezia, Bologna, Firenze, Bari, Catania, Palermo, ecc.)

2. L'utente dice la città di partenza.
   → Emetti [SET_ORIGIN:NomeCittà] e chiedi le date del viaggio.

3. L'utente dà le date.
   → Chiedi il numero di partecipanti.

4. L'utente dà il numero persone.
   → A questo punto riceverai i voli reali. Presentali all'utente con i prezzi reali.
   → Chiedi: "Quale volo preferisci? Scegli 1, 2 o 3."

5. L'utente sceglie un volo (es. "il 2", "prendo il primo", "volo 3").
   → Emetti [SELECT_FLIGHT:numero] e digli "Ti porto al checkout del partner per il volo."
   → Subito dopo, presenta gli hotel disponibili (riceverai la lista).
   → Chiedi: "Quale hotel preferisci? Scegli 1, 2, 3..."

6. L'utente sceglie un hotel (es. "hotel 2", "il primo").
   → Emetti [SELECT_HOTEL:numero]
   → Se hotel IN_APP: "Prenotazione confermata! Pagherai in hotel."
   → Se hotel REDIRECT: "Ti porto al checkout esterno per l'hotel."
   → SOLO ORA proponi le 4 esperienze.

7. L'utente seleziona esperienze.
   → SOLO ORA sblocca il bottone itinerario.

ORDINE RIGIDO: Voli → Hotel → Experience. MAI proporre experience prima degli hotel!

DESTINAZIONI DISPONIBILI (SOLO QUESTE 10):
Roma, Ibiza, Barcellona, Praga, Budapest, Cracovia, Amsterdam, Berlino, Lisbona, Palma de Mallorca

AEROPORTI ITALIANI SUPPORTATI:
Roma, Milano, Napoli, Torino, Venezia, Bologna, Firenze, Bari, Catania, Palermo, Verona, Pisa, Genova, Brindisi, Olbia, Cagliari, Alghero

COMPORTAMENTO LINGUISTICO:
- Risposte chiare, brevi, operative
- NO slang romano o dialetti
- Tono professionale e amichevole
- Massimo 2-3 frasi per risposta

FORMATO DIRETTIVE (COMANDI NASCOSTI NEL TESTO):
Quando raccogli informazioni, inserisci direttive nascoste nel formato [COMANDO:valore] che il sistema userà per tracciare lo stato.
Esempi:
- Quando l'utente dice la destinazione: includi [SET_DESTINATION:Barcellona]
- Quando l'utente dice la città di partenza: includi [SET_ORIGIN:Milano] o [SET_ORIGIN:Napoli]
- Quando l'utente dà le date: includi [SET_DATES:2024-06-15,2024-06-18]
- Quando l'utente dà il numero persone: includi [SET_PARTICIPANTS:6]
- Quando l'utente dice il tipo evento: includi [SET_EVENT_TYPE:bachelor]
- Quando l'utente sceglie un volo (1, 2 o 3): includi [SELECT_FLIGHT:1] o [SELECT_FLIGHT:2] o [SELECT_FLIGHT:3]
- Quando l'utente sceglie un hotel (1-5): includi [SELECT_HOTEL:1], [SELECT_HOTEL:2], ecc.
- Quando hai tutte le info, mostra le 4 esperienze: [SHOW_EXPERIENCES:Boat Party|Pub Crawl|Karting|Sunset Cruise]
- Quando l'utente seleziona esperienze: [UNLOCK_ITINERARY_BUTTON]

IMPORTANTE: Le direttive devono essere inserite alla FINE del tuo messaggio, dopo il testo visibile all'utente.

REGOLE BOOKING (IMPORTANTE):
- VOLI: Tutti i voli richiedono checkout esterno. Quando l'utente sceglie un volo, digli "Ti porto al checkout del nostro partner per completare la prenotazione del volo."
- HOTEL IN_APP (pagamento in hotel): Digli "Prenotazione confermata! Pagherai direttamente in hotel al check-in."
- HOTEL REDIRECT (prepagamento): Digli "Ti porto al checkout esterno per completare il pagamento."
- NON confermare MAI una prenotazione volo come se fosse già fatta. I voli vanno sempre al checkout esterno.

OBIETTIVO FINALE:
Generare itinerari corretti basati sulla destinazione dell'utente, evitando errori di meta, evitando output anticipati e rendendo disponibili scelte cliccabili di esperienze prima dell'itinerario.`;

const BYEBRIDE_SYSTEM_PROMPT = `Tu sei l'assistente ufficiale di ByeBride, parte dell'app BYEBI. Il tuo compito è creare itinerari personalizzati per addii al nubilato SOLO dopo aver raccolto tutte le informazioni obbligatorie.

REGOLE PRINCIPALI (RIGIDE):
1. Non generare mai un itinerario finché non hai TUTTE queste informazioni:
   - destinazione esatta
   - CITTÀ DI PARTENZA (aeroporto di origine in Italia)
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
   - l'utente ha scelto un volo

6. Se l'utente chiede subito "fammi un itinerario", tu NON lo fai. Prima chiedi le informazioni mancanti.

FLUSSO OBBLIGATORIO DELLA CONVERSAZIONE:
1. L'utente dice una meta.
   → Chiedi: "Da quale città italiana vuoi partire?" (Roma, Milano, Napoli, Torino, Venezia, Bologna, Firenze, Bari, Catania, Palermo, ecc.)

2. L'utente dice la città di partenza.
   → Emetti [SET_ORIGIN:NomeCittà] e chiedi le date del viaggio.

3. L'utente dà le date.
   → Chiedi il numero di partecipanti.

4. L'utente dà il numero persone.
   → A questo punto riceverai i voli reali. Presentali all'utente con i prezzi reali.
   → Chiedi: "Quale volo preferisci? Scegli 1, 2 o 3."

5. L'utente sceglie un volo (es. "il 2", "prendo il primo", "volo 3").
   → Emetti [SELECT_FLIGHT:numero] e digli "Ti porto al checkout del partner per il volo."
   → Subito dopo, presenta gli hotel disponibili (riceverai la lista).
   → Chiedi: "Quale hotel preferisci? Scegli 1, 2, 3..."

6. L'utente sceglie un hotel (es. "hotel 2", "il primo").
   → Emetti [SELECT_HOTEL:numero]
   → Se hotel IN_APP: "Prenotazione confermata! Pagherai in hotel."
   → Se hotel REDIRECT: "Ti porto al checkout esterno per l'hotel."
   → SOLO ORA proponi le 4 esperienze.

7. L'utente seleziona esperienze.
   → SOLO ORA sblocca il bottone itinerario.

ORDINE RIGIDO: Voli → Hotel → Experience. MAI proporre experience prima degli hotel!

DESTINAZIONI DISPONIBILI (SOLO QUESTE 10):
Roma, Ibiza, Barcellona, Praga, Budapest, Cracovia, Amsterdam, Berlino, Lisbona, Palma de Mallorca

AEROPORTI ITALIANI SUPPORTATI:
Roma, Milano, Napoli, Torino, Venezia, Bologna, Firenze, Bari, Catania, Palermo, Verona, Pisa, Genova, Brindisi, Olbia, Cagliari, Alghero

COMPORTAMENTO LINGUISTICO:
- Risposte chiare, brevi, operative
- NO slang o dialetti
- Tono professionale e amichevole
- Massimo 2-3 frasi per risposta

FORMATO DIRETTIVE (COMANDI NASCOSTI NEL TESTO):
Quando raccogli informazioni, inserisci direttive nascoste nel formato [COMANDO:valore] che il sistema userà per tracciare lo stato.
Esempi:
- Quando l'utente dice la destinazione: includi [SET_DESTINATION:Barcellona]
- Quando l'utente dice la città di partenza: includi [SET_ORIGIN:Milano] o [SET_ORIGIN:Napoli]
- Quando l'utente dà le date: includi [SET_DATES:2024-06-15,2024-06-18]
- Quando l'utente dà il numero persone: includi [SET_PARTICIPANTS:6]
- Quando l'utente dice il tipo evento: includi [SET_EVENT_TYPE:bachelorette]
- Quando l'utente sceglie un volo (1, 2 o 3): includi [SELECT_FLIGHT:1] o [SELECT_FLIGHT:2] o [SELECT_FLIGHT:3]
- Quando l'utente sceglie un hotel (1-5): includi [SELECT_HOTEL:1], [SELECT_HOTEL:2], ecc.
- Quando hai tutte le info, mostra le 4 esperienze: [SHOW_EXPERIENCES:Spa Day|Beach Club|Brunch|Wine Tasting]
- Quando l'utente seleziona esperienze: [UNLOCK_ITINERARY_BUTTON]

IMPORTANTE: Le direttive devono essere inserite alla FINE del tuo messaggio, dopo il testo visibile all'utente.

REGOLE BOOKING (IMPORTANTE):
- VOLI: Tutti i voli richiedono checkout esterno. Quando l'utente sceglie un volo, digli "Ti porto al checkout del nostro partner per completare la prenotazione del volo."
- HOTEL IN_APP (pagamento in hotel): Digli "Prenotazione confermata! Pagherai direttamente in hotel al check-in."
- HOTEL REDIRECT (prepagamento): Digli "Ti porto al checkout esterno per completare il pagamento."
- NON confermare MAI una prenotazione volo come se fosse già fatta. I voli vanno sempre al checkout esterno.

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
        contextualPrompt += `${idx + 1}) ${f.airline} - €${f.price} a persona\n`;
        contextualPrompt += `   Partenza: ${depDate} ore ${depTime}\n`;
        contextualPrompt += `   Ritorno: ${retDate} ore ${retTime}\n`;
        contextualPrompt += `   Volo n. ${f.flight_number}\n\n`;
      });
      contextualPrompt += `\nQuando l'utente sceglie un volo (es. "il 2", "prendo il primo", "volo 3"), devi emettere la direttiva [SELECT_FLIGHT:numero] alla fine del messaggio.\n`;
    }

    // Add real hotel options if available
    if (context.hotels && context.hotels.length > 0) {
      contextualPrompt += `\n\n🏨 HOTEL REALI DISPONIBILI a ${context.selectedDestination}:`;
      contextualPrompt += `\nQuesti sono hotel REALI con prezzi aggiornati. Dopo che l'utente ha scelto il volo, presenta questi hotel.\n`;
      context.hotels.forEach((h, idx) => {
        const stars = h.stars ? `${h.stars}⭐` : '';
        const bookingType = h.bookingFlow === 'IN_APP' ? '✅ Prenota qui' : '🔗 Redirect';
        contextualPrompt += `${idx + 1}) ${h.name} ${stars} - €${h.priceTotal} totale\n`;
        contextualPrompt += `   ${h.roomDescription || 'Camera standard'}\n`;
        contextualPrompt += `   Pagamento: ${h.paymentPolicy} | ${bookingType}\n\n`;
      });
      contextualPrompt += `\nQuando l'utente sceglie un hotel (es. "hotel 1", "il secondo"), emetti [SELECT_HOTEL:numero].\n`;
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
