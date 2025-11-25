import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertTripSchema, 
  insertExpenseGroupSchema, 
  insertExpenseSchema 
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { generateItinerary } from "./services/openai";
import { setupAuth } from "./auth";
import { registerZapierRoutes } from "./zapier-integration";
import { imageSearchService } from "./services/image-search";
import { searchCheapestFlights, cityToIata } from "./services/aviasales";


export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Authorization middleware
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Authentication required" });
  };

  app.post("/api/users/:id/premium", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isPremium } = req.body;
      
      if (typeof isPremium !== 'boolean') {
        return res.status(400).json({ message: "isPremium must be a boolean" });
      }
      
      const updatedUser = await storage.updateUserPremiumStatus(id, isPremium);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = updatedUser;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Trip routes
  app.post("/api/trips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(tripData);
      return res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/trips/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const trips = await storage.getTripsByUserId(userId);
      return res.status(200).json(trips);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/trips/:id/itineraries", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Generate mock itineraries
      const mockItinerary1 = {
        tripId,
        name: "Amsterdam Adventure",
        description: "Experience the best of Amsterdam's nightlife and culture",
        duration: "3 Nights, 4 Days",
        price: 650,
        image: "https://images.unsplash.com/photo-1534570122623-99e8378a9aa7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400&q=80",
        rating: "4.5",
        highlights: [
          "Red Light District night tour with local guide",
          "Heineken Experience with beer tasting",
          "Canal cruise with open bar",
          "VIP access to top nightclubs"
        ],
        includes: ["Flights", "Accommodation", "Activities", "Custom Merch"]
      };
      
      const mockItinerary2 = {
        tripId,
        name: "Prague Party",
        description: "Historic sites by day, epic parties by night",
        duration: "4 Nights, 5 Days",
        price: 580,
        image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400&q=80",
        rating: "4.0",
        highlights: [
          "Beer spa experience with unlimited beer",
          "Pub crawl through historic Old Town",
          "Traditional Czech dinner with folk show",
          "Party boat cruise on Vltava River"
        ],
        includes: ["Flights", "Accommodation", "Activities", "Custom Merch"]
      };
      
      // Create the itineraries
      const itinerary1 = await storage.createItinerary(mockItinerary1);
      const itinerary2 = await storage.createItinerary(mockItinerary2);
      
      return res.status(200).json([itinerary1, itinerary2]);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Destination routes
  app.get("/api/destinations", async (req: Request, res: Response) => {
    try {
      const destinations = await storage.getAllDestinations();
      return res.status(200).json(destinations);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Experience routes
  app.get("/api/experiences", async (req: Request, res: Response) => {
    try {
      const experiences = await storage.getAllExperiences();
      return res.status(200).json(experiences);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Blog post routes
  app.get("/api/blog-posts", async (req: Request, res: Response) => {
    try {
      const { premium } = req.query;
      let blogPosts;
      
      if (premium === 'true') {
        blogPosts = await storage.getAllBlogPosts();
      } else {
        blogPosts = await storage.getFreeBlogPosts();
      }
      
      return res.status(200).json(blogPosts);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Merchandise routes
  app.get("/api/merchandise", async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      let merchandiseItems;
      
      if (type) {
        merchandiseItems = await storage.getMerchandiseByType(type as string);
      } else {
        merchandiseItems = await storage.getAllMerchandise();
      }
      
      return res.status(200).json(merchandiseItems);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // SplittaBro - Expense Group routes
  app.post("/api/expense-groups", async (req: Request, res: Response) => {
    try {
      const groupData = insertExpenseGroupSchema.parse(req.body);
      const group = await storage.createExpenseGroup(groupData);
      return res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/trips/:tripId/expense-groups", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const expenseGroups = await storage.getExpenseGroupsByTripId(tripId);
      return res.status(200).json(expenseGroups);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get all expense groups (for SplittaBro standalone use)
  app.get("/api/expense-groups", async (req: Request, res: Response) => {
    try {
      // Get all expense groups
      const allGroups = await storage.getAllExpenseGroups();
      return res.status(200).json(allGroups);
    } catch (error) {
      console.error("Error fetching expense groups:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/expense-groups/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const group = await storage.getExpenseGroup(id);
      
      if (!group) {
        return res.status(404).json({ message: "Expense group not found" });
      }
      
      return res.status(200).json(group);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // SplittaBro - Expense routes
  app.post("/api/expenses", async (req: Request, res: Response) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      return res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/expense-groups/:groupId/expenses", async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const group = await storage.getExpenseGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Expense group not found" });
      }
      
      const expenses = await storage.getExpensesByGroupId(groupId);
      return res.status(200).json(expenses);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpense(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      return res.status(200).json(expense);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedExpense = await storage.updateExpense(id, updateData);
      
      if (!updatedExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      return res.status(200).json(updatedExpense);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteExpense(id);
      
      if (!result) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      return res.status(200).json({ message: "Expense deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Zapier AI-powered itinerary generation
  app.post("/api/generate-itinerary", async (req: Request, res: Response) => {
    try {
      // Schema per validare i dati in arrivo dal frontend
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
      
      const requestData = zapierItinerarySchema.parse(req.body);
      
      // Prepara i dati per Zapier webhook
      const zapierPayload = {
        destination: requestData.citta,
        startDate: requestData.date.startDate,
        endDate: requestData.date.endDate,
        groupSize: requestData.persone,
        budget: requestData.budget,
        interests: requestData.interessi,
        experiences: requestData.esperienze,
        timestamp: new Date().toISOString(),
        source: "ByeBro OneClick Assistant"
      };
      
      // Invia i dati a Zapier webhook (se configurato)
      let zapierResponse = null;
      const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
      
      if (zapierWebhookUrl) {
        try {
          console.log("Sending data to Zapier webhook:", zapierPayload);
          
          const response = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(zapierPayload)
          });
          
          if (response.ok) {
            zapierResponse = await response.json();
            console.log("Zapier response received:", zapierResponse);
          } else {
            console.error("Zapier webhook error:", response.status, response.statusText);
          }
        } catch (error) {
          console.error("Error calling Zapier webhook:", error);
        }
      }
      
      // Se Zapier ha restituito un itinerario, usalo; altrimenti usa fallback
      let itineraryContent = "Itinerario personalizzato in generazione...";
      
      if (zapierResponse && zapierResponse.itinerary) {
        itineraryContent = zapierResponse.itinerary;
      } else {
        // Fallback: genera un itinerario di base
        const duration = Math.ceil(
          (new Date(requestData.date.endDate).getTime() - new Date(requestData.date.startDate).getTime()) 
          / (1000 * 60 * 60 * 24)
        );
        
        itineraryContent = `🎉 Addio al Celibato a ${requestData.citta}
        
📅 Durata: ${duration} giorni per ${requestData.persone} persone
💰 Budget: ${requestData.budget}
🎯 Interessi: ${requestData.interessi.join(', ') || 'Divertimento generale'}

📋 Itinerario personalizzato:
Stiamo elaborando il vostro itinerario perfetto con ChatGPT tramite Zapier...

⏰ L'itinerario dettagliato arriverà a breve!`;
      }
      
      // Crea un itinerario nel storage per persistenza
      const itineraryToSave = {
        tripId: req.body.tripId || 0,
        name: `Addio al Celibato a ${requestData.citta}`,
        description: itineraryContent,
        duration: `${Math.ceil((new Date(requestData.date.endDate).getTime() - new Date(requestData.date.startDate).getTime()) / (1000 * 60 * 60 * 24))} giorni`,
        price: requestData.budget === "economico" ? 299 : requestData.budget === "medio" ? 499 : 799,
        image: `https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300&q=80`,
        rating: "5.0",
        highlights: [`${requestData.persone} persone`, `Budget ${requestData.budget}`, `Destinazione: ${requestData.citta}`],
        includes: ["Itinerario AI personalizzato", "Consigli locali", "Pianificazione ottimizzata"]
      };
      
      const savedItinerary = await storage.createItinerary(itineraryToSave);
      
      return res.status(200).json({
        success: true,
        itinerary: savedItinerary,
        aiContent: itineraryContent,
        zapierProcessed: !!zapierResponse,
        message: zapierResponse ? "Itinerario generato con AI" : "Itinerario in elaborazione tramite Zapier"
      });
      
    } catch (error: any) {
      console.error("Error generating itinerary:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid itinerary parameters", 
          errors: fromZodError(error).message 
        });
      }
      
      return res.status(500).json({ 
        message: "Failed to generate itinerary",
        error: error.message || String(error)
      });
    }
  });

  // Generated Itinerary routes (OneClick Assistant)
  const destinationToIATA: Record<string, string> = {
    'roma': 'ROM',
    'ibiza': 'IBZ',
    'barcellona': 'BCN',
    'praga': 'PRG',
    'budapest': 'BUD',
    'cracovia': 'KRK',
    'amsterdam': 'AMS',
    'berlino': 'BER',
    'lisbona': 'LIS',
    'palma de mallorca': 'PMI'
  };

  app.post("/api/generated-itineraries", async (req: Request, res: Response) => {
    try {
      const { destination, startDate, endDate, participants, eventType, selectedExperiences } = req.body;
      
      if (!destination || !startDate || !endDate || !participants || !eventType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get user ID if authenticated
      const userId = (req.user as any)?.id;

      // Map destination to IATA code for flight search
      const destIATA = destinationToIATA[destination.toLowerCase()];
      
      // Search for flights (assuming origin is always Rome for now)
      let flights = null;
      if (destIATA) {
        try {
          const { searchCheapestFlights } = await import("./services/aviasales");
          const flightData = await searchCheapestFlights({
            origin: 'ROM',
            destination: destIATA,
            departDate: startDate,
            currency: 'EUR'
          });
          
          // Parse flight data
          const destCode = Object.keys(flightData.data)[0];
          const offersObj = flightData.data[destCode] || {};
          const offers = Object.values(offersObj as any)
            .sort((a: any, b: any) => a.price - b.price)
            .slice(0, 3)
            .map((o: any) => ({
              airline: o.airline,
              price: o.price,
              departureAt: o.departure_at,
              returnAt: o.return_at,
              flightNumber: o.flight_number
            }));
          
          flights = offers.length > 0 ? offers[0] : null;
        } catch (error) {
          console.error("Flight search failed:", error);
        }
      }

      // Generate hotel recommendation
      const hotel = {
        name: `Hotel Premium ${destination}`,
        rating: 4.5,
        pricePerNight: participants > 4 ? 150 : 100,
        address: `Centro ${destination}`
      };

      // Generate daily activities based on selected experiences
      const dailyActivities = Array.from({ length: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) }, (_, i) => ({
        day: i + 1,
        activities: selectedExperiences?.slice(0, 2) || ['Esplorazione città', 'Vita notturna']
      }));

      // Calculate total price
      const flightPrice = flights ? flights.price * participants : 200 * participants;
      const hotelPrice = hotel.pricePerNight * dailyActivities.length;
      const activitiesPrice = dailyActivities.length * 150 * participants;
      const totalPrice = flightPrice + hotelPrice + activitiesPrice;

      // Save itinerary
      const itinerary = await storage.createGeneratedItinerary({
        userId,
        destination,
        startDate,
        endDate,
        participants,
        eventType,
        selectedExperiences: selectedExperiences || [],
        flights,
        hotel,
        dailyActivities,
        totalPrice,
        status: "draft"
      });

      res.json(itinerary);
    } catch (error) {
      console.error("Error creating itinerary:", error);
      res.status(500).json({ error: "Failed to create itinerary" });
    }
  });

  app.get("/api/generated-itineraries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const itinerary = await storage.getGeneratedItinerary(id);
      
      if (!itinerary) {
        return res.status(404).json({ error: "Itinerary not found" });
      }

      res.json(itinerary);
    } catch (error) {
      console.error("Error fetching itinerary:", error);
      res.status(500).json({ error: "Failed to fetch itinerary" });
    }
  });

  // Register Zapier integration routes
  registerZapierRoutes(app);

  // Image Search API routes
  app.get("/api/images/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!query) {
        return res.status(400).json({ 
          success: false, 
          message: "Query parameter is required" 
        });
      }

      const result = await imageSearchService.searchImages(query, limit);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in image search:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  });

  app.get("/api/images/destinations/:destination", async (req: Request, res: Response) => {
    try {
      const destination = req.params.destination;
      const count = parseInt(req.query.count as string) || 10;
      
      const result = await imageSearchService.searchDestinationImages(destination, count);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in destination image search:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  });

  app.get("/api/images/test", async (req: Request, res: Response) => {
    try {
      const result = await imageSearchService.searchBarcelonaImages();
      return res.status(200).json({
        test: "Barcelona aerial images",
        ...result
      });
    } catch (error) {
      console.error("Error in image test:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  });

  // GROQ Activity Suggestions endpoint (NEW - AI-powered activity ideas)
  app.post("/api/chat/activity-suggestions", async (req: Request, res: Response) => {
    try {
      const { destination, startDate, endDate, month, partyType } = req.body;
      
      if (!destination) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required field: destination" 
        });
      }

      if (!process.env.GROQ_API_KEY) {
        console.warn("GROQ API key not configured, using fallback activities");
      }

      // Import GROQ service
      const { generateActivitySuggestions } = await import('./services/groq');
      
      const timeReference = month || (startDate && endDate ? `${startDate} to ${endDate}` : 'summer');
      const suggestions = await generateActivitySuggestions(destination, timeReference, partyType || 'bachelor');

      return res.status(200).json({
        success: true,
        suggestions
      });

    } catch (error: any) {
      console.error('Activity Suggestions Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // GROQ Streaming Chat endpoint (NEW - Ultra-fast LLM streaming)
  app.post("/api/chat/groq-stream", async (req: Request, res: Response) => {
    try {
      const { message, selectedDestination, tripDetails, conversationHistory, partyType } = req.body;

      if (!process.env.GROQ_API_KEY) {
        return res.status(400).json({ 
          success: false, 
          error: "GROQ API key not configured" 
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 🔹 1) Determina codici IATA da usare
      // Per ora: origine fissa ROM, destination dalla città selezionata
      const originIata = "ROM";  // TODO: in futuro leggilo dall’utente / UI
      const destinationIata = cityToIata(selectedDestination);

      let flights: any[] | undefined = undefined;

      // 🔍 DEBUG: Log incoming request body
      console.log("🔍 GROQ-STREAM BACKEND RECEIVED:", {
        message: message?.substring(0, 50) + "...",
        selectedDestination,
        tripDetails,
        partyType,
        hasConversationHistory: !!conversationHistory
      });

      if (destinationIata) {
        console.log(`✈️ IATA mapping: "${selectedDestination}" → ${destinationIata}`);
        try {
          const raw = await searchCheapestFlights({
            origin: originIata,
            destination: destinationIata,
            currency: "EUR",
          });

          const destCode = Object.keys(raw.data)[0];
          const offersObj = raw.data[destCode] || {};

          flights = Object.values(offersObj as any)
            .sort((a: any, b: any) => a.price - b.price)
            .slice(0, 3); // 3 voli più economici

          console.log(`✅ Flights found: ${flights?.length || 0} cheapest options`, flights);

        } catch (err) {
          console.error("❌ Errore chiamata Aviasales in groq-stream:", err);
        }
      } else {
        console.log(`⚠️ No IATA code found for destination: "${selectedDestination}"`);
      }

      const { streamGroqChatCompletion } = await import('./services/groq');

      const context = {
        selectedDestination,
        tripDetails,
        partyType: partyType || 'bachelor',
        flights,
      };
      
      console.log("📦 Context passed to GROQ:", { ...context, flights: context.flights?.length || 0 });

      for await (const chunk of streamGroqChatCompletion(message, context, conversationHistory || [])) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

    } catch (error: any) {
      console.error('GROQ Streaming Error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });

  // OneClick Assistant chat endpoint (Fallback to OpenAI)
  app.post("/api/chat/assistant", async (req: Request, res: Response) => {
    try {
      const { message, selectedDestination, tripDetails, conversationState } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.json({ 
          success: false, 
          error: "OpenAI API key not configured" 
        });
      }

      // Import OpenAI service
      const { generateAssistantResponse } = await import('./services/openai');
      
      const result = await generateAssistantResponse({
        userMessage: message,
        selectedDestination,
        tripDetails,
        conversationState
      });

      res.json({
        success: true,
        response: result.response,
        updatedTripDetails: result.updatedTripDetails,
        updatedConversationState: result.updatedConversationState,
        selectedDestination: result.selectedDestination
      });

    } catch (error: any) {
      console.error('OpenAI Assistant Error:', error);
      res.json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
