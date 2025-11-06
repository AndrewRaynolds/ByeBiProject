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

export async function createGroqChatCompletion(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    // Build context-aware system prompt
    let contextualPrompt = BYEBRO_SYSTEM_PROMPT;
    
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
    // Build context-aware system prompt
    let contextualPrompt = BYEBRO_SYSTEM_PROMPT;
    
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
