import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const user = await storage.createUser(userData);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users/:id/premium", async (req: Request, res: Response) => {
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
  app.post("/api/trips", async (req: Request, res: Response) => {
    try {
      const tripData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(tripData);
      return res.status(201).json(trip);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
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

  const httpServer = createServer(app);

  return httpServer;
}
