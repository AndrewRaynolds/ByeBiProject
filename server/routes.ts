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
import { travelAPI } from "./services/travel-api";
import { imageSearchService } from "./services/image-search";
import { kiwiAPI } from "./services/kiwi-api";

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



  // Travel API routes
  app.get("/api/travel/flights", async (req: Request, res: Response) => {
    try {
      const { origin, destination, departureDate, returnDate, adults } = req.query;
      
      if (!destination || !departureDate || !returnDate) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      const flights = await travelAPI.getFlights(
        origin as string || 'MXP',
        destination as string,
        departureDate as string,
        returnDate as string,
        adults ? parseInt(adults as string) : 1
      );
      
      return res.status(200).json(flights);
    } catch (error: any) {
      console.error("Error fetching flights:", error);
      return res.status(500).json({ 
        message: "Failed to fetch flights",
        error: error.message || String(error)
      });
    }
  });

  app.get("/api/travel/hotels", async (req: Request, res: Response) => {
    try {
      const { city, checkInDate, checkOutDate, adults } = req.query;
      
      if (!city || !checkInDate || !checkOutDate) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      const hotels = await travelAPI.getHotels(
        city as string,
        checkInDate as string,
        checkOutDate as string,
        adults ? parseInt(adults as string) : 1
      );
      
      return res.status(200).json(hotels);
    } catch (error: any) {
      console.error("Error fetching hotels:", error);
      return res.status(500).json({ 
        message: "Failed to fetch hotels",
        error: error.message || String(error)
      });
    }
  });

  app.get("/api/travel/activities", async (req: Request, res: Response) => {
    try {
      const { city } = req.query;
      
      if (!city) {
        return res.status(400).json({ message: "Missing city parameter" });
      }
      
      const activities = await travelAPI.getActivities(city as string);
      
      return res.status(200).json(activities);
    } catch (error: any) {
      console.error("Error fetching activities:", error);
      return res.status(500).json({ 
        message: "Failed to fetch activities",
        error: error.message || String(error)
      });
    }
  });

  app.get("/api/travel/restaurants", async (req: Request, res: Response) => {
    try {
      const { city, cuisine } = req.query;
      
      if (!city) {
        return res.status(400).json({ message: "Missing city parameter" });
      }
      
      const restaurants = await travelAPI.getRestaurants(
        city as string,
        cuisine as string || ''
      );
      
      return res.status(200).json(restaurants);
    } catch (error: any) {
      console.error("Error fetching restaurants:", error);
      return res.status(500).json({ 
        message: "Failed to fetch restaurants",
        error: error.message || String(error)
      });
    }
  });

  app.get("/api/travel/events", async (req: Request, res: Response) => {
    try {
      const { city, startDate, endDate, category } = req.query;
      
      if (!city || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      const events = await travelAPI.getEvents(
        city as string,
        startDate as string,
        endDate as string,
        category as string || 'nightlife'
      );
      
      return res.status(200).json(events);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      return res.status(500).json({ 
        message: "Failed to fetch events",
        error: error.message || String(error)
      });
    }
  });

  // OneClick API per generare pacchetti completi
  // Test Kiwi.com API connection
  app.get("/api/kiwi/test", async (req: Request, res: Response) => {
    try {
      const isConnected = await kiwiAPI.testConnection();
      return res.status(200).json({ 
        connected: isConnected,
        message: isConnected ? "Kiwi.com API connected successfully" : "Unable to connect to Kiwi.com API"
      });
    } catch (error: any) {
      return res.status(500).json({ 
        connected: false,
        message: "Error testing Kiwi.com connection: " + error.message 
      });
    }
  });

  // Search locations using Kiwi.com
  app.get("/api/kiwi/locations", async (req: Request, res: Response) => {
    try {
      const { term } = req.query;
      if (!term || typeof term !== 'string') {
        return res.status(400).json({ message: "Search term is required" });
      }
      
      const locations = await kiwiAPI.searchLocations(term);
      return res.status(200).json(locations);
    } catch (error: any) {
      return res.status(500).json({ 
        message: "Error searching locations: " + error.message 
      });
    }
  });

  app.post("/api/travel/packages", async (req: Request, res: Response) => {
    try {
      const { destination, departureCity, startDate, endDate, adults, budget, interests } = req.body;
      
      if (!destination || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required parameters: destination, startDate, endDate" });
      }

      // Conversione delle date in formato stringa (YYYY-MM-DD)
      const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
      const formattedEndDate = new Date(endDate).toISOString().split('T')[0];
      const numAdults = adults || 2;
      const departureLocation = departureCity || "Milan";
      
      // Usa le API reali di Kiwi.com e Booking.com
      const { travelAPI: realTravelAPI } = await import("./services/travel-api");
      
      const realPackage = await realTravelAPI.generateTravelPackage({
        destination,
        departureCity: departureLocation,
        checkIn: formattedStartDate,
        checkOut: formattedEndDate,
        adults: numAdults,
        budget: budget as "budget" | "standard" | "luxury" || "standard",
        interests: interests || ["nightlife", "food"]
      });
      
      // Mantieni la compatibilità con il frontend esistente
      const compatiblePackage = {
        destination,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        adults: numAdults,
        budget: budget || "standard",
        flights: [realPackage.flights.outbound],
        hotels: realPackage.hotels,
        activities: realPackage.activities.map((activity, index) => ({
          id: `activity_${index}`,
          name: activity,
          city: destination,
          category: interests?.[0] || "nightlife",
          price: realPackage.estimatedDailyCost * 0.3,
          currency: realPackage.currency,
          rating: 4.5,
          duration: "2-3 hours",
          description: activity,
          images: []
        })),
        restaurants: [],
        events: [],
        totalCost: realPackage.totalCost,
        currency: realPackage.currency,
        realApiData: true
      };
      
      return res.status(200).json(compatiblePackage);
    } catch (error: any) {
      console.error("Error generating real travel package:", error);
      
      // Fallback al sistema esistente solo se le API reali falliscono
      try {
        const formattedStartDate = new Date(req.body.startDate).toISOString().split('T')[0];
        const formattedEndDate = new Date(req.body.endDate).toISOString().split('T')[0];
        const numAdults = req.body.adults || 1;
        
        const [flights, hotels, activities, restaurants, events] = await Promise.all([
          travelAPI.getFlights("MXP", req.body.destination, formattedStartDate, formattedEndDate, numAdults),
          travelAPI.getHotels(req.body.destination, formattedStartDate, formattedEndDate, numAdults),
          travelAPI.getActivities(req.body.destination),
          travelAPI.getRestaurants(req.body.destination),
          travelAPI.getEvents(req.body.destination, formattedStartDate, formattedEndDate)
        ]);
        
        const fallbackPackage = {
          destination: req.body.destination,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          adults: numAdults,
          budget: req.body.budget || "standard",
          flights,
          hotels,
          activities,
          restaurants,
          events,
          realApiData: false,
          fallbackReason: error.message
        };
        
        return res.status(200).json(fallbackPackage);
      } catch (fallbackError: any) {
        return res.status(500).json({ 
          message: "Failed to generate travel package with both real and fallback APIs",
          realApiError: error.message,
          fallbackError: fallbackError.message
        });
      }
    }
  });

  // Test API connections for Kiwi.com and Booking.com
  app.get("/api/travel/test-apis", async (req: Request, res: Response) => {
    try {
      const { travelAPI: realTravelAPI } = await import("./services/travel-api");
      const status = await realTravelAPI.testAPIs();
      
      res.json({
        status: "ok",
        apis: status,
        message: `Kiwi API: ${status.kiwi ? 'Connected' : 'Failed'}, Booking API: ${status.booking ? 'Connected' : 'Failed'}`
      });
    } catch (error: any) {
      console.error("Error testing APIs:", error);
      res.status(500).json({ message: "Error testing APIs: " + error.message });
    }
  });

  // Search flights using real Kiwi API
  app.get("/api/travel/flights/search", async (req: Request, res: Response) => {
    try {
      const { from, to, dateFrom, dateTo, adults = 2 } = req.query;
      
      if (!from || !to || !dateFrom || !dateTo) {
        return res.status(400).json({ message: "Missing required parameters: from, to, dateFrom, dateTo" });
      }

      const { kiwiAPI } = await import("./services/kiwi-api");
      
      const flights = await kiwiAPI.searchFlights({
        fly_from: from as string,
        fly_to: to as string,
        date_from: dateFrom as string,
        date_to: dateTo as string,
        adults: parseInt(adults as string),
        curr: 'EUR',
        limit: 10
      });

      res.json(flights);
    } catch (error: any) {
      console.error("Error searching flights:", error);
      res.status(500).json({ message: "Error searching flights: " + error.message });
    }
  });

  // Search hotels using real Booking API
  app.get("/api/travel/hotels/search", async (req: Request, res: Response) => {
    try {
      const { destination, checkIn, checkOut, adults = 2 } = req.query;
      
      if (!destination || !checkIn || !checkOut) {
        return res.status(400).json({ message: "Missing required parameters: destination, checkIn, checkOut" });
      }

      const { bookingAPI } = await import("./services/booking-api");
      
      // Prima trova la destinazione
      const destinations = await bookingAPI.searchDestinations(destination as string);
      if (destinations.length === 0) {
        return res.status(404).json({ message: `No destinations found for: ${destination}` });
      }

      // Poi cerca gli hotel
      const hotels = await bookingAPI.searchHotels({
        dest_id: destinations[0].dest_id,
        checkin_date: checkIn as string,
        checkout_date: checkOut as string,
        adults_number: parseInt(adults as string),
        room_number: 1,
        units: 'metric',
        locale: 'en-gb',
        currency: 'EUR'
      });

      res.json({
        destination: destinations[0],
        hotels: hotels
      });
    } catch (error: any) {
      console.error("Error searching hotels:", error);
      res.status(500).json({ message: "Error searching hotels: " + error.message });
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

  // GROQ Streaming Chat endpoint (NEW - Ultra-fast LLM streaming)
  app.post("/api/chat/groq-stream", async (req: Request, res: Response) => {
    try {
      const { message, selectedDestination, tripDetails, conversationHistory } = req.body;
      
      if (!process.env.GROQ_API_KEY) {
        return res.status(400).json({ 
          success: false, 
          error: "GROQ API key not configured" 
        });
      }

      // Setup Server-Sent Events (SSE) for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Import GROQ service
      const { streamGroqChatCompletion } = await import('./services/groq');
      
      const context = {
        selectedDestination,
        tripDetails,
      };

      // Stream response chunks
      for await (const chunk of streamGroqChatCompletion(message, context, conversationHistory || [])) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Send completion signal
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
