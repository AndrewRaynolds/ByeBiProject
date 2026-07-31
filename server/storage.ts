// Updated storage with only the 10 specified destinations
import { 
  User, Trip, Itinerary, BlogPost, Merchandise, Destination, Experience, 
  InsertUser, InsertTrip, InsertItinerary, InsertBlogPost, InsertMerchandise, 
  InsertDestination, InsertExperience, ExpenseGroup, Expense, 
  InsertExpenseGroup, InsertExpense, GeneratedItinerary, InsertGeneratedItinerary,
  expenseGroups as expenseGroupsTable,
  expenses as expensesTable,
  generatedItineraries as generatedItinerariesTable,
  blogPosts as blogPostsTable,
  stripeWebhookEvents,
  trips as tripsTable,
} from "@shared/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { createDatabase, type DatabaseConnection } from "./db";

export interface IStorage {
  healthCheck(): Promise<void>;
  close(): Promise<void>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPremiumStatus(id: number, isPremium: boolean): Promise<User | undefined>;
  
  // Trip operations
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByUserId(userId: string): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;

  // Itinerary operations
  getItinerary(id: number): Promise<Itinerary | undefined>;
  getItinerariesByTripId(tripId: number): Promise<Itinerary[]>;
  createItinerary(itinerary: InsertItinerary): Promise<Itinerary>;

  // Blog post operations
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getFreeBlogPosts(): Promise<BlogPost[]>;
  getAllBlogPosts(): Promise<BlogPost[]>;
  createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost>;

  // Merchandise operations
  getMerchandise(id: number): Promise<Merchandise | undefined>;
  getAllMerchandise(): Promise<Merchandise[]>;
  getMerchandiseByType(type: string): Promise<Merchandise[]>;
  createMerchandise(merchandise: InsertMerchandise): Promise<Merchandise>;

  // Destination operations
  getDestination(id: number): Promise<Destination | undefined>;
  getAllDestinations(): Promise<Destination[]>;
  createDestination(destination: InsertDestination): Promise<Destination>;

  // Experience operations
  getExperience(id: number): Promise<Experience | undefined>;
  getAllExperiences(): Promise<Experience[]>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  
  // Expense group operations (SplittaBro feature)
  getExpenseGroup(id: number): Promise<ExpenseGroup | undefined>;
  getExpenseGroupsByTripId(tripId: number, ownerId: string): Promise<ExpenseGroup[]>;
  getAllExpenseGroups(ownerId: string): Promise<ExpenseGroup[]>;
  createExpenseGroup(group: InsertExpenseGroup, ownerId: string): Promise<ExpenseGroup>;
  isExpenseGroupOwner(groupId: number, ownerId: string): Promise<boolean>;
  
  // Expense operations (SplittaBro feature)
  getExpense(id: number): Promise<Expense | undefined>;
  getExpensesByGroupId(groupId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Generated Itinerary operations (OneClick Assistant)
  getGeneratedItinerary(id: number): Promise<GeneratedItinerary | undefined>;
  getGeneratedItinerariesByUserId(userId: string): Promise<GeneratedItinerary[]>;
  createGeneratedItinerary(itinerary: InsertGeneratedItinerary): Promise<GeneratedItinerary>;
  updateGeneratedItinerary(id: number, itinerary: Partial<InsertGeneratedItinerary>): Promise<GeneratedItinerary | undefined>;

  // Stripe webhook idempotency
  hasProcessedStripeEvent(eventId: string): Promise<boolean>;
  markStripeEventProcessed(eventId: string, sessionId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private itineraries: Map<number, Itinerary>;
  private blogPosts: Map<number, BlogPost>;
  private merchandiseItems: Map<number, Merchandise>;
  private destinations: Map<number, Destination>;
  private experiences: Map<number, Experience>;
  private expenseGroups: Map<number, ExpenseGroup>;
  private expenseItems: Map<number, Expense>;
  private generatedItineraries: Map<number, GeneratedItinerary>;
  private processedStripeEventIds: Set<string>;

  private userId: number;
  private tripId: number;
  private itineraryId: number;
  private blogPostId: number;
  private merchandiseId: number;
  private destinationId: number;
  private experienceId: number;
  private expenseGroupId: number;
  private expenseId: number;
  private generatedItineraryId: number;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.itineraries = new Map();
    this.blogPosts = new Map();
    this.merchandiseItems = new Map();
    this.destinations = new Map();
    this.experiences = new Map();
    this.expenseGroups = new Map();
    this.expenseItems = new Map();
    this.generatedItineraries = new Map();
    this.processedStripeEventIds = new Set();

    this.userId = 1;
    this.tripId = 1;
    this.itineraryId = 1;
    this.blogPostId = 1;
    this.merchandiseId = 1;
    this.destinationId = 1;
    this.experienceId = 1;
    this.expenseGroupId = 1;
    this.expenseId = 1;
    this.generatedItineraryId = 1;

    // Initialize with sample data
    this.initializeDestinations();
    this.initializeExperiences();
    this.initializeBlogPosts();
    this.initializeMerchandise();
  }

  async healthCheck(): Promise<void> {
    return Promise.resolve();
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { 
      id: this.userId++, 
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      isPremium: false,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserPremiumStatus(id: number, isPremium: boolean): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      isPremium,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripsByUserId(userId: string): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(trip => trip.userId === userId);
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const trip: Trip = { 
      id: this.tripId++, 
      userId: insertTrip.userId,
      name: insertTrip.name,
      participants: insertTrip.participants,
      startDate: insertTrip.startDate,
      endDate: insertTrip.endDate,
      departureCity: insertTrip.departureCity,
      destinations: insertTrip.destinations ?? null,
      experienceType: insertTrip.experienceType,
      budget: insertTrip.budget,
      activities: insertTrip.activities ?? null,
      specialRequests: insertTrip.specialRequests ?? null,
      includeMerch: insertTrip.includeMerch ?? false,
      createdAt: new Date(),
    };
    this.trips.set(trip.id, trip);
    return trip;
  }

  // Itinerary operations
  async getItinerary(id: number): Promise<Itinerary | undefined> {
    return this.itineraries.get(id);
  }

  async getItinerariesByTripId(tripId: number): Promise<Itinerary[]> {
    return Array.from(this.itineraries.values()).filter(itinerary => itinerary.tripId === tripId);
  }

  async createItinerary(insertItinerary: InsertItinerary): Promise<Itinerary> {
    const itinerary: Itinerary = { 
      id: this.itineraryId++, 
      ...insertItinerary,
      highlights: insertItinerary.highlights ?? null,
      includes: insertItinerary.includes ?? null,
      createdAt: new Date(),
    };
    this.itineraries.set(itinerary.id, itinerary);
    return itinerary;
  }

  // Blog post operations
  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }

  async getFreeBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values()).filter(post => !post.isPremium);
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values());
  }

  async createBlogPost(insertBlogPost: InsertBlogPost): Promise<BlogPost> {
    return this.storeBlogPost(insertBlogPost);
  }

  private storeBlogPost(insertBlogPost: InsertBlogPost): BlogPost {
    const blogPost: BlogPost = { 
      id: this.blogPostId++, 
      ...insertBlogPost,
      isPremium: insertBlogPost.isPremium ?? false,
      location: insertBlogPost.location ?? null,
      createdAt: new Date(),
    };
    this.blogPosts.set(blogPost.id, blogPost);
    return blogPost;
  }

  // Merchandise operations
  async getMerchandise(id: number): Promise<Merchandise | undefined> {
    return this.merchandiseItems.get(id);
  }

  async getAllMerchandise(): Promise<Merchandise[]> {
    return Array.from(this.merchandiseItems.values());
  }

  async getMerchandiseByType(type: string): Promise<Merchandise[]> {
    return Array.from(this.merchandiseItems.values()).filter(item => item.type === type);
  }

  async createMerchandise(insertMerchandise: InsertMerchandise): Promise<Merchandise> {
    const merchandise: Merchandise = { 
      id: this.merchandiseId++, 
      ...insertMerchandise,
      createdAt: new Date(),
    };
    this.merchandiseItems.set(merchandise.id, merchandise);
    return merchandise;
  }

  // Destination operations
  async getDestination(id: number): Promise<Destination | undefined> {
    return this.destinations.get(id);
  }

  async getAllDestinations(): Promise<Destination[]> {
    return Array.from(this.destinations.values());
  }

  async createDestination(insertDestination: InsertDestination): Promise<Destination> {
    const destination: Destination = { 
      id: this.destinationId++, 
      ...insertDestination,
      tags: insertDestination.tags ?? null,
    };
    this.destinations.set(destination.id, destination);
    return destination;
  }

  // Experience operations
  async getExperience(id: number): Promise<Experience | undefined> {
    return this.experiences.get(id);
  }

  async getAllExperiences(): Promise<Experience[]> {
    return Array.from(this.experiences.values());
  }

  async createExperience(insertExperience: InsertExperience): Promise<Experience> {
    const experience: Experience = { 
      id: this.experienceId++, 
      ...insertExperience,
    };
    this.experiences.set(experience.id, experience);
    return experience;
  }

  // Expense group operations
  async getExpenseGroup(id: number): Promise<ExpenseGroup | undefined> {
    return this.expenseGroups.get(id);
  }

  async getExpenseGroupsByTripId(tripId: number, ownerId: string): Promise<ExpenseGroup[]> {
    return Array.from(this.expenseGroups.values()).filter(
      (group) => group.ownerId === ownerId && group.tripId === tripId,
    );
  }

  async getAllExpenseGroups(ownerId: string): Promise<ExpenseGroup[]> {
    return Array.from(this.expenseGroups.values()).filter(
      (group) => group.ownerId === ownerId,
    );
  }

  async createExpenseGroup(insertGroup: InsertExpenseGroup, ownerId: string): Promise<ExpenseGroup> {
    const group: ExpenseGroup = { 
      id: this.expenseGroupId++, 
      ownerId,
      tripId: insertGroup.tripId ?? null,
      name: insertGroup.name,
      description: insertGroup.description ?? null,
      members: insertGroup.members,
      totalAmount: 0,
      currency: insertGroup.currency ?? "EUR",
      createdAt: new Date(),
    };
    this.expenseGroups.set(group.id, group);
    return group;
  }

  async isExpenseGroupOwner(groupId: number, ownerId: string): Promise<boolean> {
    return this.expenseGroups.get(groupId)?.ownerId === ownerId;
  }

  // Expense operations
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenseItems.get(id);
  }

  async getExpensesByGroupId(groupId: number): Promise<Expense[]> {
    return Array.from(this.expenseItems.values()).filter(expense => expense.groupId === groupId);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const expense: Expense = { 
      id: this.expenseId++, 
      ...insertExpense,
      createdAt: new Date(),
    };
    this.expenseItems.set(expense.id, expense);
    return expense;
  }

  async updateExpense(id: number, updateData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = this.expenseItems.get(id);
    if (!expense) return undefined;
    
    const updatedExpense: Expense = {
      ...expense,
      ...updateData,
    };
    this.expenseItems.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenseItems.delete(id);
  }

  // Generated Itinerary operations (OneClick Assistant)
  async getGeneratedItinerary(id: number): Promise<GeneratedItinerary | undefined> {
    return this.generatedItineraries.get(id);
  }

  async getGeneratedItinerariesByUserId(userId: string): Promise<GeneratedItinerary[]> {
    return Array.from(this.generatedItineraries.values()).filter(
      itinerary => itinerary.userId === userId
    );
  }

  async createGeneratedItinerary(insertItinerary: InsertGeneratedItinerary): Promise<GeneratedItinerary> {
    const itinerary: GeneratedItinerary = { 
      id: this.generatedItineraryId++, 
      ...insertItinerary,
      selectedExperiences: insertItinerary.selectedExperiences ?? null,
      flights: insertItinerary.flights ?? null,
      hotel: insertItinerary.hotel ?? null,
      dailyActivities: insertItinerary.dailyActivities ?? null,
      status: insertItinerary.status || "draft",
      createdAt: new Date()
    };
    this.generatedItineraries.set(itinerary.id, itinerary);
    return itinerary;
  }

  async updateGeneratedItinerary(id: number, updates: Partial<InsertGeneratedItinerary>): Promise<GeneratedItinerary | undefined> {
    const itinerary = this.generatedItineraries.get(id);
    if (!itinerary) return undefined;
    
    const updatedItinerary: GeneratedItinerary = {
      ...itinerary,
      ...updates
    };
    this.generatedItineraries.set(id, updatedItinerary);
    return updatedItinerary;
  }

  async hasProcessedStripeEvent(eventId: string): Promise<boolean> {
    return this.processedStripeEventIds.has(eventId);
  }

  async markStripeEventProcessed(eventId: string, _sessionId: string): Promise<void> {
    this.processedStripeEventIds.add(eventId);
  }

  // Initialize with only the 10 specified destinations
  private initializeDestinations() {
    const destinations = [
      {
        name: "Roma",
        country: "Italy",
        image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "La Città Eterna - storia, cultura e vita notturna indimenticabile nella capitale italiana.",
        tags: ["Storia", "Cultura", "Vita notturna"],
        rating: "4.8",
        reviewCount: 512
      },
      {
        name: "Ibiza",
        country: "Spain", 
        image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "L'isola del divertimento - club leggendari, spiagge da sogno e feste senza fine.",
        tags: ["Club", "Spiagge", "Festa"],
        rating: "4.9",
        reviewCount: 678
      },
      {
        name: "Barcellona", 
        country: "Spain",
        image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Sole, mare, sangria e vita notturna spettacolare - la destinazione mediterranea perfetta.",
        tags: ["Spiagge", "Vita notturna", "Cultura"],
        rating: "4.9",
        reviewCount: 445
      },
      {
        name: "Praga",
        country: "Czech Republic",
        image: "https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Fascino medievale e vita notturna leggendaria - perfetta per gli amanti della birra.",
        tags: ["Birra", "Vita notturna", "Cultura"],
        rating: "4.8",
        reviewCount: 342
      },
      {
        name: "Budapest",
        country: "Hungary",
        image: "https://images.unsplash.com/photo-1468824357306-a439d58ccb1c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Terme, ruin bar e vita notturna incredibile nella Perla del Danubio.",
        tags: ["Terme", "Ruin Bars", "Vita notturna"],
        rating: "4.6",
        reviewCount: 298
      },
      {
        name: "Cracovia",
        country: "Poland",
        image: "https://images.unsplash.com/photo-1674246145742-c6e4563d94cb?ixlib=rb-4.1.0&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Città storica con prezzi accessibili e vita notturna vivace nel cuore della Polonia.",
        tags: ["Storia", "Prezzi bassi", "Vita notturna"],
        rating: "4.5",
        reviewCount: 234
      },
      {
        name: "Amsterdam",
        country: "Netherlands",
        image: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "La Venezia del Nord - tour sui canali, vita notturna e addii al celibato indimenticabili.",
        tags: ["Canali", "Vita notturna", "Cultura"],
        rating: "4.7",
        reviewCount: 389
      },
      {
        name: "Berlino",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Club underground, street art e vita notturna senza fine nella capitale europea delle feste.",
        tags: ["Underground", "Club", "Arte"],
        rating: "4.5",
        reviewCount: 267
      },
      {
        name: "Lisbona",
        country: "Portugal",
        image: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Fascino costiero, vita notturna vivace e pesce fresco nella splendida capitale portoghese.",
        tags: ["Costa", "Vita notturna", "Gastronomia"],
        rating: "4.4",
        reviewCount: 189
      },
      {
        name: "Palma de Mallorca",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1729253980006-c961754ef578?ixlib=rb-4.1.0&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Isola balearica con spiagge cristalline, beach club e vita notturna mediterranea.",
        tags: ["Spiagge", "Beach club", "Isola"],
        rating: "4.6",
        reviewCount: 156
      }
    ];
    
    destinations.forEach(destination => {
      this.createDestination(destination);
    });
  }

  private initializeExperiences() {
    const experiences = [
      {
        name: "The Ultimate BroNight",
        description: "Epic club-hopping, exclusive nightclubs, casinos, and unforgettable alcohol-fueled adventures.",
        image: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "My Olympic Bro",
        description: "Exciting sports activities, live sporting events, competitive challenges, and vibrant bars.",
        image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "Chill and Feel the Bro",
        description: "Relaxed upscale experiences, chic restaurants, refined bars, and elegant city tours.",
        image: "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "The Wild Broventure",
        description: "One last wild adventure with your bros - outdoor activities, hiking, camping, and beers by the fire.",
        image: "https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      }
    ];
    
    experiences.forEach(experience => {
      this.createExperience(experience);
    });
  }

  private initializeBlogPosts() {
    const blogPosts = [
      {
        title: "Roma: The Night We Can't Remember",
        content: "From Trastevere's wine bars to Testaccio's underground clubs, Rome offers an incredible nightlife scene. We started at a rooftop aperitivo with views of the Colosseum, then ended up in a basement club at 5am. The bachelor had no idea what hit him.",
        image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        isPremium: false,
        location: "Roma",
        category: "drink" as const
      },
      {
        title: "Ibiza Uncovered: The Ultimate Party Guide",
        content: "From Amnesia to Pacha, we break down the best clubs, when to go, and how to do it right. We got VIP access to three clubs in one night, watched the sunrise from a yacht, and somehow everyone made the flight home. Barely.",
        image: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        isPremium: true,
        location: "Ibiza",
        category: "weird" as const
      },
      {
        title: "Cracovia: Eastern Europe's Hidden Gem",
        content: "Affordable prices, incredible architecture, and a nightlife scene that rivals any major European city. We spent four days exploring the Old Town by day and the underground clubs by night. The vodka was cheaper than water and twice as dangerous.",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        isPremium: false,
        location: "Cracovia",
        category: "drink" as const
      }
    ];
    
    blogPosts.forEach(post => this.storeBlogPost(post));
  }

  private initializeMerchandise() {
    const merchandise = [
      {
        name: "Custom T-Shirts",
        description: "Personalized bachelor party t-shirts with your group's name and destination",
        price: 25.99,
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        type: "apparel"
      },
      {
        name: "ByeBro Flask Set",
        description: "Premium stainless steel flasks engraved with your bachelor party details",
        price: 45.99,
        image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        type: "accessories"
      },
      {
        name: "Memory Book",
        description: "Custom photo album to capture all your unforgettable moments",
        price: 35.99,
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        type: "keepsakes"
      }
    ];
    
    merchandise.forEach(item => {
      this.createMerchandise(item);
    });
  }
}

export class DatabaseStorage extends MemStorage {
  constructor(private readonly connection: DatabaseConnection) {
    super();
  }

  private get db() {
    return this.connection.db;
  }

  override async healthCheck(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }

  override async close(): Promise<void> {
    await this.connection.close();
  }

  override async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await this.db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.id, id))
      .limit(1);
    return trip;
  }

  override async getTripsByUserId(userId: string): Promise<Trip[]> {
    return this.db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.userId, userId));
  }

  override async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await this.db
      .insert(tripsTable)
      .values(insertTrip)
      .returning();
    return trip;
  }

  override async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await this.db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.id, id))
      .limit(1);
    return post;
  }

  override async getFreeBlogPosts(): Promise<BlogPost[]> {
    return this.db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.isPremium, false))
      .orderBy(desc(blogPostsTable.createdAt), desc(blogPostsTable.id));
  }

  override async getAllBlogPosts(): Promise<BlogPost[]> {
    return this.db
      .select()
      .from(blogPostsTable)
      .orderBy(desc(blogPostsTable.createdAt), desc(blogPostsTable.id));
  }

  override async createBlogPost(
    insertBlogPost: InsertBlogPost,
  ): Promise<BlogPost> {
    const [post] = await this.db
      .insert(blogPostsTable)
      .values(insertBlogPost)
      .returning();
    return post;
  }

  override async getExpenseGroup(id: number): Promise<ExpenseGroup | undefined> {
    const [group] = await this.db
      .select()
      .from(expenseGroupsTable)
      .where(eq(expenseGroupsTable.id, id))
      .limit(1);
    return group;
  }

  override async getExpenseGroupsByTripId(
    tripId: number,
    ownerId: string,
  ): Promise<ExpenseGroup[]> {
    return this.db
      .select()
      .from(expenseGroupsTable)
      .where(
        and(
          eq(expenseGroupsTable.tripId, tripId),
          eq(expenseGroupsTable.ownerId, ownerId),
        ),
      );
  }

  override async getAllExpenseGroups(ownerId: string): Promise<ExpenseGroup[]> {
    return this.db
      .select()
      .from(expenseGroupsTable)
      .where(eq(expenseGroupsTable.ownerId, ownerId));
  }

  override async createExpenseGroup(
    insertGroup: InsertExpenseGroup,
    ownerId: string,
  ): Promise<ExpenseGroup> {
    const [group] = await this.db
      .insert(expenseGroupsTable)
      .values({
        ...insertGroup,
        tripId: insertGroup.tripId ?? null,
        ownerId,
      })
      .returning();
    return group;
  }

  override async isExpenseGroupOwner(
    groupId: number,
    ownerId: string,
  ): Promise<boolean> {
    const [group] = await this.db
      .select({ id: expenseGroupsTable.id })
      .from(expenseGroupsTable)
      .where(
        and(
          eq(expenseGroupsTable.id, groupId),
          eq(expenseGroupsTable.ownerId, ownerId),
        ),
      )
      .limit(1);
    return Boolean(group);
  }

  override async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await this.db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id))
      .limit(1);
    return expense;
  }

  override async getExpensesByGroupId(groupId: number): Promise<Expense[]> {
    return this.db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.groupId, groupId));
  }

  override async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await this.db
      .insert(expensesTable)
      .values(insertExpense)
      .returning();
    return expense;
  }

  override async updateExpense(
    id: number,
    updateData: Partial<InsertExpense>,
  ): Promise<Expense | undefined> {
    const [expense] = await this.db
      .update(expensesTable)
      .set(updateData)
      .where(eq(expensesTable.id, id))
      .returning();
    return expense;
  }

  override async deleteExpense(id: number): Promise<boolean> {
    const deleted = await this.db
      .delete(expensesTable)
      .where(eq(expensesTable.id, id))
      .returning({ id: expensesTable.id });
    return deleted.length > 0;
  }

  override async getGeneratedItinerary(
    id: number,
  ): Promise<GeneratedItinerary | undefined> {
    const [itinerary] = await this.db
      .select()
      .from(generatedItinerariesTable)
      .where(eq(generatedItinerariesTable.id, id))
      .limit(1);
    return itinerary;
  }

  override async getGeneratedItinerariesByUserId(
    userId: string,
  ): Promise<GeneratedItinerary[]> {
    return this.db
      .select()
      .from(generatedItinerariesTable)
      .where(eq(generatedItinerariesTable.userId, userId));
  }

  override async createGeneratedItinerary(
    insertItinerary: InsertGeneratedItinerary,
  ): Promise<GeneratedItinerary> {
    const [itinerary] = await this.db
      .insert(generatedItinerariesTable)
      .values(insertItinerary)
      .returning();
    return itinerary;
  }

  override async updateGeneratedItinerary(
    id: number,
    updates: Partial<InsertGeneratedItinerary>,
  ): Promise<GeneratedItinerary | undefined> {
    const [itinerary] = await this.db
      .update(generatedItinerariesTable)
      .set(updates)
      .where(eq(generatedItinerariesTable.id, id))
      .returning();
    return itinerary;
  }

  override async hasProcessedStripeEvent(eventId: string): Promise<boolean> {
    const [event] = await this.db
      .select({ eventId: stripeWebhookEvents.eventId })
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.eventId, eventId))
      .limit(1);
    return Boolean(event);
  }

  override async markStripeEventProcessed(
    eventId: string,
    sessionId: string,
  ): Promise<void> {
    await this.db
      .insert(stripeWebhookEvents)
      .values({ eventId, sessionId })
      .onConflictDoNothing({ target: stripeWebhookEvents.eventId });
  }
}

export function createStorageFromEnvironment(): IStorage {
  const persistenceMode = process.env.CRITICAL_DATA_PERSISTENCE;

  if (process.env.NODE_ENV === "production" && persistenceMode !== "database") {
    throw new Error(
      "CRITICAL_DATA_PERSISTENCE=database is required in production",
    );
  }

  if (persistenceMode !== "database") {
    return new MemStorage();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required when CRITICAL_DATA_PERSISTENCE=database",
    );
  }

  return new DatabaseStorage(createDatabase(databaseUrl));
}

export const storage = createStorageFromEnvironment();
