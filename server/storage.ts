// Updated storage with only the 10 specified destinations
import { 
  User, Trip, Itinerary, BlogPost, Merchandise, Destination, Experience, 
  InsertUser, InsertTrip, InsertItinerary, InsertBlogPost, InsertMerchandise, 
  InsertDestination, InsertExperience, ExpenseGroup, Expense, 
  InsertExpenseGroup, InsertExpense 
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPremiumStatus(id: number, isPremium: boolean): Promise<User | undefined>;
  
  // Trip operations
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByUserId(userId: number): Promise<Trip[]>;
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
  getExpenseGroupsByTripId(tripId: number): Promise<ExpenseGroup[]>;
  getAllExpenseGroups(): Promise<ExpenseGroup[]>;
  createExpenseGroup(group: InsertExpenseGroup): Promise<ExpenseGroup>;
  
  // Expense operations (SplittaBro feature)
  getExpense(id: number): Promise<Expense | undefined>;
  getExpensesByGroupId(groupId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
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

  private userId: number;
  private tripId: number;
  private itineraryId: number;
  private blogPostId: number;
  private merchandiseId: number;
  private destinationId: number;
  private experienceId: number;
  private expenseGroupId: number;
  private expenseId: number;

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

    this.userId = 1;
    this.tripId = 1;
    this.itineraryId = 1;
    this.blogPostId = 1;
    this.merchandiseId = 1;
    this.destinationId = 1;
    this.experienceId = 1;
    this.expenseGroupId = 1;
    this.expenseId = 1;

    // Initialize with sample data
    this.initializeDestinations();
    this.initializeExperiences();
    this.initializeBlogPosts();
    this.initializeMerchandise();
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
      ...insertUser,
      createdAt: new Date(),
      updatedAt: new Date()
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
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripsByUserId(userId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(trip => trip.userId === userId);
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const trip: Trip = { 
      id: this.tripId++, 
      ...insertTrip,
      createdAt: new Date(),
      updatedAt: new Date()
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
      createdAt: new Date(),
      updatedAt: new Date()
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
    const blogPost: BlogPost = { 
      id: this.blogPostId++, 
      ...insertBlogPost,
      createdAt: new Date(),
      updatedAt: new Date()
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
      updatedAt: new Date()
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
      createdAt: new Date(),
      updatedAt: new Date()
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
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.experiences.set(experience.id, experience);
    return experience;
  }

  // Expense group operations
  async getExpenseGroup(id: number): Promise<ExpenseGroup | undefined> {
    return this.expenseGroups.get(id);
  }

  async getExpenseGroupsByTripId(tripId: number): Promise<ExpenseGroup[]> {
    return Array.from(this.expenseGroups.values()).filter(group => group.tripId === tripId);
  }

  async getAllExpenseGroups(): Promise<ExpenseGroup[]> {
    return Array.from(this.expenseGroups.values());
  }

  async createExpenseGroup(insertGroup: InsertExpenseGroup): Promise<ExpenseGroup> {
    const group: ExpenseGroup = { 
      id: this.expenseGroupId++, 
      ...insertGroup,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.expenseGroups.set(group.id, group);
    return group;
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
      updatedAt: new Date()
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
      updatedAt: new Date()
    };
    this.expenseItems.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenseItems.delete(id);
  }

  // Initialize with only the 10 specified destinations
  private initializeDestinations() {
    const destinations = [
      {
        name: "Roma",
        country: "Italy",
        image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "La Città Eterna - storia, cultura e vita notturna indimenticabile nella capitale italiana.",
        tags: ["Storia", "Cultura", "Vita notturna"],
        rating: "4.8",
        reviewCount: 512
      },
      {
        name: "Ibiza",
        country: "Spain", 
        image: "https://images.pexels.com/photos/18963669/pexels-photo-18963669.jpeg?auto=compress&cs=tinysrgb&h=300&w=500",
        description: "L'isola del divertimento - club leggendari, spiagge da sogno e feste senza fine.",
        tags: ["Club", "Spiagge", "Festa"],
        rating: "4.9",
        reviewCount: 678
      },
      {
        name: "Barcellona", 
        country: "Spain",
        image: "https://images.pexels.com/photos/819767/pexels-photo-819767.jpeg?auto=compress&cs=tinysrgb&h=300&w=500",
        description: "Sole, mare, sangria e vita notturna spettacolare - la destinazione mediterranea perfetta.",
        tags: ["Spiagge", "Vita notturna", "Cultura"],
        rating: "4.9",
        reviewCount: 445
      },
      {
        name: "Praga",
        country: "Czech Republic",
        image: "https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Fascino medievale e vita notturna leggendaria - perfetta per gli amanti della birra.",
        tags: ["Birra", "Vita notturna", "Cultura"],
        rating: "4.8",
        reviewCount: 342
      },
      {
        name: "Budapest",
        country: "Hungary",
        image: "https://images.pexels.com/photos/764494/pexels-photo-764494.jpeg?auto=compress&cs=tinysrgb&h=300&w=500",
        description: "Terme, ruin bar e vita notturna incredibile nella Perla del Danubio.",
        tags: ["Terme", "Ruin Bars", "Vita notturna"],
        rating: "4.6",
        reviewCount: 298
      },
      {
        name: "Cracovia",
        country: "Poland",
        image: "https://images.pexels.com/photos/32861252/pexels-photo-32861252.jpeg?auto=compress&cs=tinysrgb&h=300&w=500",
        description: "Città storica con prezzi accessibili e vita notturna vivace nel cuore della Polonia.",
        tags: ["Storia", "Prezzi bassi", "Vita notturna"],
        rating: "4.5",
        reviewCount: 234
      },
      {
        name: "Amsterdam",
        country: "Netherlands",
        image: "https://images.pexels.com/photos/3884483/pexels-photo-3884483.jpeg?auto=compress&cs=tinysrgb&h=300&w=500",
        description: "La Venezia del Nord - tour sui canali, vita notturna e addii al celibato indimenticabili.",
        tags: ["Canali", "Vita notturna", "Cultura"],
        rating: "4.7",
        reviewCount: 389
      },
      {
        name: "Berlino",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Club underground, street art e vita notturna senza fine nella capitale europea delle feste.",
        tags: ["Underground", "Club", "Arte"],
        rating: "4.5",
        reviewCount: 267
      },
      {
        name: "Lisbona",
        country: "Portugal",
        image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Fascino costiero, vita notturna vivace e pesce fresco nella splendida capitale portoghese.",
        tags: ["Costa", "Vita notturna", "Gastronomia"],
        rating: "4.4",
        reviewCount: 189
      },
      {
        name: "Palma de Mallorca",
        country: "Spain",
        image: "https://images.pexels.com/photos/8763806/pexels-photo-8763806.jpeg?auto=compress&cs=tinysrgb&h=300&w=500",
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
        excerpt: "Epic Roman nights that blend history with modern party culture...",
        content: "From Trastevere's wine bars to Testaccio's underground clubs, Rome offers an incredible nightlife scene...",
        image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        tags: ["nightlife", "rome", "history"],
        isPremium: false
      },
      {
        title: "Ibiza Uncovered: The Ultimate Party Guide",
        excerpt: "Everything you need to know about Ibiza's legendary club scene...",
        content: "From Amnesia to Pacha, we break down the best clubs, when to go, and how to do it right...",
        image: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        tags: ["ibiza", "clubs", "nightlife"],
        isPremium: true
      },
      {
        title: "Cracovia: Eastern Europe's Hidden Gem",
        excerpt: "Discover why Poland's ancient capital is becoming the go-to destination...",
        content: "Affordable prices, incredible architecture, and a nightlife scene that rivals any major European city...",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        tags: ["krakow", "budget", "culture"],
        isPremium: false
      }
    ];
    
    blogPosts.forEach(post => {
      this.createBlogPost(post);
    });
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

export const storage = new MemStorage();