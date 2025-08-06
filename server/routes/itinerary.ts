import { Request, Response } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Schema per validare i dati in arrivo dal frontend per Zapier
const zapierItinerarySchema = z.object({
  citta: z.string().min(1, "Città è richiesta"),
  date: z.object({
    startDate: z.string(),
    endDate: z.string()
  }),
  persone: z.number().int().min(1, "Numero persone deve essere almeno 1"),
  interessi: z.array(z.string()).optional().default([]),
  budget: z.enum(["economico", "medio", "alto"]).optional().default("medio"),
  esperienze: z.array(z.string()).optional().default([])
});

/**
 * Route POST /api/generate-itinerary
 * Integra con Zapier webhook per generare itinerari AI-powered
 * 
 * Riceve: città, date, persone, interessi, budget
 * Invia a Zapier: payload strutturato per ChatGPT
 * Ritorna: itinerario AI generato o fallback locale
 */
export const generateZapierItinerary = async (req: Request, res: Response) => {
  try {
    // Valida i dati in ingresso
    const requestData = zapierItinerarySchema.parse(req.body);
    
    // Prepara payload per Zapier webhook
    const zapierPayload = {
      destination: requestData.citta,
      startDate: requestData.date.startDate,
      endDate: requestData.date.endDate,
      groupSize: requestData.persone,
      budget: requestData.budget,
      interests: requestData.interessi,
      experiences: requestData.esperienze,
      timestamp: new Date().toISOString(),
      source: "ByeBro OneClick Assistant",
      language: "italian"
    };
    
    // Invia dati a Zapier webhook (se configurato)
    let zapierResponse = null;
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    
    if (zapierWebhookUrl) {
      try {
        console.log("📡 Sending data to Zapier webhook:", zapierPayload);
        
        const response = await fetch(zapierWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ByeBro-Assistant/1.0'
          },
          body: JSON.stringify(zapierPayload),
          signal: AbortSignal.timeout(30000) // 30 secondi timeout
        });
        
        if (response.ok) {
          zapierResponse = await response.json();
          console.log("✅ Zapier response received:", zapierResponse);
        } else {
          console.error("❌ Zapier webhook error:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("🔥 Error calling Zapier webhook:", error);
      }
    } else {
      console.log("⚠️ ZAPIER_WEBHOOK_URL not configured, using fallback");
    }
    
    // Genera contenuto itinerario (AI o fallback)
    let itineraryContent = "Itinerario personalizzato in generazione...";
    
    if (zapierResponse && zapierResponse.itinerary) {
      // Usa l'itinerario generato da ChatGPT tramite Zapier
      itineraryContent = zapierResponse.itinerary;
    } else {
      // Fallback: genera un itinerario di base strutturato
      const duration = Math.ceil(
        (new Date(requestData.date.endDate).getTime() - new Date(requestData.date.startDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      
      itineraryContent = `🎉 Addio al Celibato a ${requestData.citta}
      
📅 Durata: ${duration} giorni per ${requestData.persone} persone
💰 Budget: ${requestData.budget}
🎯 Interessi: ${requestData.interessi.join(', ') || 'Divertimento generale'}

📋 Itinerario personalizzato:
${zapierWebhookUrl ? 
  'Stiamo elaborando il vostro itinerario perfetto con ChatGPT tramite Zapier...' : 
  'Webhook Zapier non configurato - usando generazione locale'
}

⏰ L'itinerario dettagliato ${zapierWebhookUrl ? 'arriverà a breve!' : 'è pronto!'}`;
    }
    
    // Calcola prezzo basato su budget e destinazione
    const calculatePrice = (budget: string, destination: string, people: number) => {
      const basePrices = {
        'economico': { roma: 250, ibiza: 350, barcellona: 280 },
        'medio': { roma: 450, ibiza: 650, barcellona: 480 },
        'alto': { roma: 750, ibiza: 1200, barcellona: 850 }
      };
      
      const destinationKey = destination.toLowerCase() as keyof typeof basePrices[typeof budget];
      const basePrice = basePrices[budget as keyof typeof basePrices]?.[destinationKey] || 
                       basePrices[budget as keyof typeof basePrices]?.roma || 400;
      
      return Math.round(basePrice * Math.min(people * 0.15 + 0.85, 1.5));
    };
    
    // Ritorna risposta strutturata
    return res.status(200).json({
      success: true,
      itinerary: {
        name: `Addio al Celibato a ${requestData.citta}`,
        description: itineraryContent,
        duration: `${Math.ceil((new Date(requestData.date.endDate).getTime() - new Date(requestData.date.startDate).getTime()) / (1000 * 60 * 60 * 24))} giorni`,
        price: calculatePrice(requestData.budget, requestData.citta, requestData.persone),
        rating: "5.0"
      },
      aiContent: itineraryContent,
      zapierProcessed: !!zapierResponse,
      zapierWebhookConfigured: !!zapierWebhookUrl,
      message: zapierResponse ? 
        "Itinerario generato con AI tramite Zapier" : 
        zapierWebhookUrl ? 
          "Itinerario in elaborazione tramite Zapier" : 
          "Itinerario generato localmente"
    });
    
  } catch (error: any) {
    console.error("💥 Error generating itinerary:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        message: "Parametri itinerario non validi", 
        errors: fromZodError(error).message 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: "Errore nella generazione dell'itinerario",
      error: error.message || String(error)
    });
  }
};