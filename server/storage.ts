import { 
  users, User, InsertUser, 
  trips, Trip, InsertTrip,
  itineraries, Itinerary, InsertItinerary,
  blogPosts, BlogPost, InsertBlogPost,
  merchandise, Merchandise, InsertMerchandise,
  destinations, Destination, InsertDestination,
  experiences, Experience, InsertExperience
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private itineraries: Map<number, Itinerary>;
  private blogPosts: Map<number, BlogPost>;
  private merchandiseItems: Map<number, Merchandise>;
  private destinations: Map<number, Destination>;
  private experiences: Map<number, Experience>;
  
  private userId: number;
  private tripId: number;
  private itineraryId: number;
  private blogPostId: number;
  private merchandiseId: number;
  private destinationId: number;
  private experienceId: number;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.itineraries = new Map();
    this.blogPosts = new Map();
    this.merchandiseItems = new Map();
    this.destinations = new Map();
    this.experiences = new Map();
    
    this.userId = 1;
    this.tripId = 1;
    this.itineraryId = 1;
    this.blogPostId = 1;
    this.merchandiseId = 1;
    this.destinationId = 1;
    this.experienceId = 1;

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
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id, 
      isPremium: false,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPremiumStatus(id: number, isPremium: boolean): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      isPremium
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripsByUserId(userId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(
      (trip) => trip.userId === userId,
    );
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.tripId++;
    const trip: Trip = { 
      ...insertTrip, 
      id,
      createdAt: new Date()
    };
    this.trips.set(id, trip);
    return trip;
  }

  // Itinerary operations
  async getItinerary(id: number): Promise<Itinerary | undefined> {
    return this.itineraries.get(id);
  }

  async getItinerariesByTripId(tripId: number): Promise<Itinerary[]> {
    return Array.from(this.itineraries.values()).filter(
      (itinerary) => itinerary.tripId === tripId,
    );
  }

  async createItinerary(insertItinerary: InsertItinerary): Promise<Itinerary> {
    const id = this.itineraryId++;
    const itinerary: Itinerary = { 
      ...insertItinerary, 
      id,
      createdAt: new Date()
    };
    this.itineraries.set(id, itinerary);
    return itinerary;
  }

  // Blog post operations
  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }

  async getFreeBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values()).filter(
      (blogPost) => !blogPost.isPremium,
    );
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values());
  }

  async createBlogPost(insertBlogPost: InsertBlogPost): Promise<BlogPost> {
    const id = this.blogPostId++;
    const blogPost: BlogPost = { 
      ...insertBlogPost, 
      id,
      createdAt: new Date()
    };
    this.blogPosts.set(id, blogPost);
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
    return Array.from(this.merchandiseItems.values()).filter(
      (merchandise) => merchandise.type === type,
    );
  }

  async createMerchandise(insertMerchandise: InsertMerchandise): Promise<Merchandise> {
    const id = this.merchandiseId++;
    const merchandise: Merchandise = { 
      ...insertMerchandise, 
      id,
      createdAt: new Date()
    };
    this.merchandiseItems.set(id, merchandise);
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
    const id = this.destinationId++;
    const destination: Destination = { 
      ...insertDestination, 
      id
    };
    this.destinations.set(id, destination);
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
    const id = this.experienceId++;
    const experience: Experience = { 
      ...insertExperience, 
      id 
    };
    this.experiences.set(id, experience);
    return experience;
  }

  // Initialize with sample data
  private initializeDestinations() {
    const destinations: InsertDestination[] = [
      {
        name: "Amsterdam",
        country: "Netherlands",
        image: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Famous for its vibrant nightlife, beautiful canals, and rich cultural experiences.",
        tags: ["Nightlife", "Sightseeing"],
        rating: "4.5",
        reviewCount: 120
      },
      {
        name: "Barcelona",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Beach parties, tapas bars, and clubbing until sunrise in this Mediterranean paradise.",
        tags: ["Nightlife", "Beaches"],
        rating: "4.8",
        reviewCount: 210
      },
      {
        name: "Prague",
        country: "Czech Republic",
        image: "https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Beer tours, historic pubs, and a vibrant nightlife scene in this beautiful historic city.",
        tags: ["Nightlife", "Breweries"],
        rating: "4.0",
        reviewCount: 98
      },
      {
        name: "Budapest",
        country: "Hungary",
        image: "https://images.unsplash.com/photo-1551867633-194f125bddfa?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Thermal spas by day, ruin bars by night in this affordable European hotspot.",
        tags: ["Nightlife", "Spas"],
        rating: "4.2",
        reviewCount: 145
      },
      {
        name: "Berlin",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "World-class clubbing and a vibrant arts scene make Berlin a top destination for bachelor parties.",
        tags: ["Nightlife", "Culture"],
        rating: "4.7",
        reviewCount: 187
      },
      {
        name: "Ibiza",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1626197031507-c17099753214?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "The ultimate party island with world-famous clubs and beautiful beaches.",
        tags: ["Nightlife", "Beaches"],
        rating: "4.9",
        reviewCount: 234
      }
    ];
    
    destinations.forEach(destination => {
      this.createDestination(destination);
    });
  }

  private initializeExperiences() {
    const experiences: InsertExperience[] = [
      {
        name: "The Ultimate BroNight",
        description: "Epic club-hopping, exclusive nightclubs, casinos, and unforgettable alcohol-fueled adventures.",
        image: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "My Olympic Bro",
        description: "Exciting sports activities, live sporting events, competitive challenges, and vibrant bars.",
        image: "https://images.unsplash.com/photo-1495727034151-8ffc00a478ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "Chill and Feel",
        description: "Relaxed upscale experiences, chic restaurants, refined bars, and elegant city tours.",
        image: "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "The Last Adventure",
        description: "One last wild adventure with your bros - outdoor activities, hiking, camping, and beers by the fire.",
        image: "https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      }
    ];
    
    experiences.forEach(experience => {
      this.createExperience(experience);
    });
  }

  private initializeBlogPosts() {
    const blogPosts: InsertBlogPost[] = [
      {
        title: "Amsterdam: The Night We Can't Remember",
        content: "Our group of 8 hit Amsterdam for my buddy's bachelor party. The Red Light District was an eye-opener, but the real story happened when we decided to try the 'special brownies'...",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        isPremium: false
      },
      {
        title: "Barcelona Beach Disaster: A Warning",
        content: "What started as a perfect day at the beach turned into a comedy of errors. Lost wallets, sunburn from hell, and an unexpected encounter with local police when we tried to...",
        image: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        isPremium: false
      },
      {
        title: "Berlin Underground: The Ultimate Guide",
        content: "How we got into Berlin's most exclusive clubs, the secret password that works every time, and the underground party scene most tourists never see...",
        image: "https://images.unsplash.com/photo-1545128485-c400e7702796?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        isPremium: true
      },
      {
        title: "Prague Beer Tour Gone Wrong",
        content: "We thought we could handle Czech beer. We were wrong. Here's how we survived 15 different breweries in one weekend and the embarrassing story that ensued...",
        image: "https://images.unsplash.com/photo-1555658636-6e4a36218be7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        isPremium: true
      }
    ];
    
    blogPosts.forEach(blogPost => {
      this.createBlogPost(blogPost);
    });
  }

  private initializeMerchandise() {
    const merchandiseItems: InsertMerchandise[] = [
      {
        name: "Custom T-Shirts",
        description: "Personalized t-shirts with your design, names, dates, and more.",
        price: 1999,
        image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=350&q=80",
        type: "tshirt"
      },
      {
        name: "Custom Caps",
        description: "Stylish caps with embroidered designs, perfect for sunny destinations.",
        price: 1499,
        image: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=350&q=80",
        type: "cap"
      },
      {
        name: "Custom Mugs",
        description: "Personalized mugs to commemorate the bachelor party.",
        price: 1299,
        image: "https://images.unsplash.com/photo-1609873539821-3b46e0efdf37?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
        type: "mug"
      },
      {
        name: "Custom Socks",
        description: "Fun, personalized socks for the whole group.",
        price: 999,
        image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
        type: "socks"
      },
      {
        name: "Custom Badges",
        description: "Pin badges with custom designs for your bachelor party.",
        price: 799,
        image: "https://images.unsplash.com/photo-1524259062458-8038c526102b?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
        type: "badges"
      }
    ];
    
    merchandiseItems.forEach(merchandise => {
      this.createMerchandise(merchandise);
    });
  }
}

export const storage = new MemStorage();
