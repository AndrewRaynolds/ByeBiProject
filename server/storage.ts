import { 
  users, User, InsertUser, 
  trips, Trip, InsertTrip,
  itineraries, Itinerary, InsertItinerary,
  blogPosts, BlogPost, InsertBlogPost,
  merchandise, Merchandise, InsertMerchandise,
  destinations, Destination, InsertDestination,
  experiences, Experience, InsertExperience,
  expenseGroups, ExpenseGroup, InsertExpenseGroup,
  expenses, Expense, InsertExpense
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
    const destination = this.destinations.get(id);
    if (destination) {
      // Aggiorna l'URL dell'immagine con un nuovo timestamp
      const imageUrl = destination.image.split('?')[0] + `?t=${Date.now()}`;
      return { ...destination, image: imageUrl };
    }
    return destination;
  }

  async getAllDestinations(): Promise<Destination[]> {
    const destinations = Array.from(this.destinations.values());
    // Aggiungi timestamp alle immagini
    return destinations.map(destination => {
      const imageUrlBase = destination.image.split('?')[0]; 
      return {
        ...destination,
        image: `${imageUrlBase}?t=${Date.now()}`
      };
    });
  }

  async createDestination(insertDestination: InsertDestination): Promise<Destination> {
    const id = this.destinationId++;
    
    // Aggiungi timestamp alle URL delle immagini per forzare il refresh della cache
    const imageWithTimestamp = insertDestination.image.includes('?') 
      ? `${insertDestination.image}&t=${Date.now()}` 
      : `${insertDestination.image}?t=${Date.now()}`;
    
    const destination: Destination = { 
      ...insertDestination,
      image: imageWithTimestamp, 
      id
    };
    this.destinations.set(id, destination);
    return destination;
  }

  // Experience operations
  async getExperience(id: number): Promise<Experience | undefined> {
    const experience = this.experiences.get(id);
    if (experience) {
      // Aggiorna l'URL dell'immagine con un nuovo timestamp
      const imageUrl = experience.image.split('?')[0] + `?t=${Date.now()}`;
      return { ...experience, image: imageUrl };
    }
    return experience;
  }

  async getAllExperiences(): Promise<Experience[]> {
    const experiences = Array.from(this.experiences.values());
    // Aggiungi timestamp alle immagini
    return experiences.map(experience => {
      const imageUrlBase = experience.image.split('?')[0]; 
      return {
        ...experience,
        image: `${imageUrlBase}?t=${Date.now()}`
      };
    });
  }

  async createExperience(insertExperience: InsertExperience): Promise<Experience> {
    const id = this.experienceId++;
    
    // Aggiungi timestamp alle URL delle immagini per forzare il refresh della cache
    const imageWithTimestamp = insertExperience.image.includes('?') 
      ? `${insertExperience.image}&t=${Date.now()}` 
      : `${insertExperience.image}?t=${Date.now()}`;
    
    const experience: Experience = { 
      ...insertExperience,
      image: imageWithTimestamp, 
      id 
    };
    this.experiences.set(id, experience);
    return experience;
  }
  
  // Expense group operations (SplittaBro feature)
  async getExpenseGroup(id: number): Promise<ExpenseGroup | undefined> {
    return this.expenseGroups.get(id);
  }

  async getExpenseGroupsByTripId(tripId: number): Promise<ExpenseGroup[]> {
    return Array.from(this.expenseGroups.values()).filter(
      (group) => group.tripId === tripId,
    );
  }

  async getAllExpenseGroups(): Promise<ExpenseGroup[]> {
    return Array.from(this.expenseGroups.values());
  }

  async createExpenseGroup(insertGroup: InsertExpenseGroup): Promise<ExpenseGroup> {
    const id = this.expenseGroupId++;
    const group: ExpenseGroup = { 
      ...insertGroup,
      id,
      totalAmount: 0,
      createdAt: new Date().toISOString()
    };
    this.expenseGroups.set(id, group);
    return group;
  }
  
  // Expense operations (SplittaBro feature)
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenseItems.get(id);
  }

  async getExpensesByGroupId(groupId: number): Promise<Expense[]> {
    return Array.from(this.expenseItems.values()).filter(
      (expense) => expense.groupId === groupId,
    );
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.expenseId++;
    const expense: Expense = { 
      ...insertExpense, 
      id,
      date: new Date(),
      createdAt: new Date()
    };
    this.expenseItems.set(id, expense);
    return expense;
  }
  
  async updateExpense(id: number, updateData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = await this.getExpense(id);
    if (!expense) return undefined;
    
    const updatedExpense: Expense = {
      ...expense,
      ...updateData,
    };
    
    this.expenseItems.set(id, updatedExpense);
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    const exists = await this.getExpense(id);
    if (!exists) return false;
    
    return this.expenseItems.delete(id);
  }

  // Initialize with sample data
  private initializeDestinations() {
    const destinations: InsertDestination[] = [
      {
        name: "Amsterdam",
        country: "Netherlands",
        image: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Famous for its vibrant nightlife, beautiful canals, and rich cultural experiences.",
        tags: ["Nightlife", "Sightseeing"],
        rating: "4.5",
        reviewCount: 120
      },
      {
        name: "Barcelona",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "The ultimate party island with world-famous clubs and beautiful beaches.",
        tags: ["Nightlife", "Beaches"],
        rating: "4.9",
        reviewCount: 234
      },
      // Nuove destinazioni aggiunte
      {
        name: "Palma de Mallorca",
        country: "Spain",
        image: "https://cdn.pixabay.com/photo/2018/05/30/15/39/palma-de-mallorca-3441396_960_720.jpg",
        description: "Stunning beaches by day and lively clubs by night in this Mediterranean hotspot.",
        tags: ["Nightlife", "Beaches"],
        rating: "4.7",
        reviewCount: 189
      },
      {
        name: "Algarve",
        country: "Portugal",
        image: "https://images.unsplash.com/photo-1503917988258-f87a78e3c995?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Beautiful beaches, excellent golf courses, and vibrant nightlife on Portugal's southern coast.",
        tags: ["Beaches", "Golf", "Nightlife"],
        rating: "4.6",
        reviewCount: 156
      },
      {
        name: "Bucharest",
        country: "Romania",
        image: "https://images.unsplash.com/photo-1584646098378-0874589d76b1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Affordable nightlife and luxury experiences in Eastern Europe's party capital.",
        tags: ["Nightlife", "Affordable"],
        rating: "4.3",
        reviewCount: 132
      },
      {
        name: "Madrid",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Tapas, rooftop bars, and clubs that don't get going until after midnight.",
        tags: ["Nightlife", "Food", "Culture"],
        rating: "4.8",
        reviewCount: 205
      },
      {
        name: "Mykonos",
        country: "Greece",
        image: "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Beach clubs, crystal clear waters, and 24-hour partying on this Greek island paradise.",
        tags: ["Beaches", "Nightlife", "Luxury"],
        rating: "4.9",
        reviewCount: 251
      },
      {
        name: "Lisbon",
        country: "Portugal",
        image: "https://images.unsplash.com/photo-1536663815808-535e2280d2c2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Historic charm by day, vibrant nightlife by night in Portugal's coastal capital.",
        tags: ["Nightlife", "Food", "Culture"],
        rating: "4.6",
        reviewCount: 178
      },
      {
        name: "Dublin",
        country: "Ireland",
        image: "https://images.unsplash.com/photo-1549918864-48ac978761a4?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Pub crawls, live music, and friendly locals make Dublin perfect for bachelor parties.",
        tags: ["Nightlife", "Pubs", "Beer"],
        rating: "4.5",
        reviewCount: 183
      },
      {
        name: "Krakow",
        country: "Poland",
        image: "https://images.unsplash.com/photo-1558642084-fd07fae5282e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Affordable drinks, historic venues, and a welcoming party atmosphere.",
        tags: ["Nightlife", "Affordable", "History"],
        rating: "4.4",
        reviewCount: 155
      },
      {
        name: "Riga",
        country: "Latvia",
        image: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Baltic's party capital with affordable prices and unique themed venues.",
        tags: ["Nightlife", "Affordable"],
        rating: "4.2",
        reviewCount: 124
      },
      {
        name: "Tallinn",
        country: "Estonia",
        image: "https://images.unsplash.com/photo-1541343672885-9be56236302a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Medieval charm with modern nightlife in this picturesque Baltic city.",
        tags: ["Nightlife", "History", "Affordable"],
        rating: "4.3",
        reviewCount: 136
      },
      {
        name: "Warsaw",
        country: "Poland",
        image: "https://images.unsplash.com/photo-1519197924294-4ba991a11128?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Poland's energetic capital with vibrant nightlife, history and affordable luxury.",
        tags: ["Nightlife", "Culture", "Affordable"],
        rating: "4.5",
        reviewCount: 162
      },
      {
        name: "Vilnius",
        country: "Lithuania",
        image: "https://images.unsplash.com/photo-1585211969224-3e992986159d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Charming Old Town with hidden bars and clubs for an affordable weekend.",
        tags: ["Nightlife", "Affordable", "History"],
        rating: "4.2",
        reviewCount: 119
      },

      {
        name: "Hamburg",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1618259278412-2819cbdea4dc?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "The Reeperbahn district offers legendary nightlife and entertainment options.",
        tags: ["Nightlife", "Red Light District"],
        rating: "4.6",
        reviewCount: 163
      },

      {
        name: "Sofia",
        country: "Bulgaria",
        image: "https://cdn.pixabay.com/photo/2019/06/04/14/20/sofia-4252836_960_720.jpg",
        description: "Affordable beer, clubs, and casinos in the shadow of snow-capped mountains.",
        tags: ["Nightlife", "Affordable", "Casinos"],
        rating: "4.0",
        reviewCount: 103
      },
      {
        name: "London",
        country: "United Kingdom",
        image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "World-class nightlife, iconic landmarks and endless entertainment options in the UK's vibrant capital.",
        tags: ["Nightlife", "Culture", "Luxury"],
        rating: "4.7",
        reviewCount: 218
      },
      {
        name: "Liverpool",
        country: "United Kingdom",
        image: "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "The Beatles' hometown with an incredible music scene and friendly locals.",
        tags: ["Nightlife", "Music", "Culture"],
        rating: "4.5",
        reviewCount: 167
      },
      {
        name: "Manchester",
        country: "United Kingdom",
        image: "https://cdn.pixabay.com/photo/2020/02/26/15/34/manchester-4881842_960_720.jpg",
        description: "Legendary music scene, football culture and buzzing nightlife in this northern powerhouse.",
        tags: ["Nightlife", "Music", "Sport"],
        rating: "4.6",
        reviewCount: 174
      },
      {
        name: "Edinburgh",
        country: "United Kingdom",
        image: "https://cdn.pixabay.com/photo/2017/01/29/13/21/edinburgh-2017267_960_720.jpg",
        description: "Scotland's capital with historic pubs, whisky tours and dramatic scenery as a backdrop.",
        tags: ["Nightlife", "History", "Culture"],
        rating: "4.7",
        reviewCount: 181
      },
      {
        name: "Thessaloniki",
        country: "Greece",
        image: "https://cdn.pixabay.com/photo/2020/06/08/16/19/thessaloniki-5275684_960_720.jpg",
        description: "Seaside bars, tavernas, and clubs in Greece's second-largest city.",
        tags: ["Nightlife", "Food", "Beaches"],
        rating: "4.3",
        reviewCount: 128
      },
      {
        name: "Munich",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1595867818082-083862f3d630?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Home of Oktoberfest with year-round beer gardens and traditional breweries.",
        tags: ["Beer", "Nightlife", "Culture"],
        rating: "4.7",
        reviewCount: 184
      },
      {
        name: "Split",
        country: "Croatia",
        image: "https://cdn.pixabay.com/photo/2017/06/15/11/40/split-2405071_960_720.jpg",
        description: "Ancient Roman ruins by day, beachfront parties by night on the Adriatic coast.",
        tags: ["Beaches", "Nightlife", "History"],
        rating: "4.6",
        reviewCount: 147
      },
      // Aggiunta delle città italiane
      {
        name: "Rome",
        country: "Italy",
        image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Eternal city with incredible history, vibrant nightlife and amazing food scene.",
        tags: ["Culture", "History", "Nightlife", "Food"],
        rating: "4.7",
        reviewCount: 212
      },
      {
        name: "Milan",
        country: "Italy",
        image: "https://cdn.pixabay.com/photo/2018/07/26/07/45/milan-3562342_960_720.jpg",
        description: "Fashion capital with stylish clubs, fancy aperitivo scene and vibrant nightlife.",
        tags: ["Fashion", "Nightlife", "Food"],
        rating: "4.5",
        reviewCount: 156
      },
      {
        name: "Florence",
        country: "Italy",
        image: "https://cdn.pixabay.com/photo/2016/11/29/12/25/florence-1869826_960_720.jpg",
        description: "Renaissance gem with amazing wine tours, cuisine and Tuscan landscapes.",
        tags: ["Culture", "Wine", "Food"],
        rating: "4.8",
        reviewCount: 178
      },
      {
        name: "Naples",
        country: "Italy",
        image: "https://cdn.pixabay.com/photo/2019/04/24/21/55/naples-4153392_960_720.jpg",
        description: "Authentic Italian experience with the best pizza, nearby beaches and vibrant street life.",
        tags: ["Food", "Culture", "Beaches"],
        rating: "4.4",
        reviewCount: 143
      },
      {
        name: "Baja Sardinia",
        country: "Italy",
        image: "https://cdn.pixabay.com/photo/2019/06/17/20/03/sardinia-4281187_960_720.jpg",
        description: "Luxurious beach clubs, crystal waters and vibrant nightlife on Sardinia's Emerald Coast.",
        tags: ["Beaches", "Luxury", "Nightlife"],
        rating: "4.9",
        reviewCount: 132
      },
      // Aggiunte altro destinazioni per paese
      {
        name: "Valencia",
        country: "Spain",
        image: "https://cdn.pixabay.com/photo/2020/04/12/14/21/valencia-5035061_960_720.jpg",
        description: "Beautiful city with incredible beaches, futuristic architecture and famous nightlife.",
        tags: ["Beaches", "Culture", "Nightlife"],
        rating: "4.6",
        reviewCount: 167
      },
      {
        name: "Bilbao",
        country: "Spain",
        image: "https://cdn.pixabay.com/photo/2017/09/12/19/49/bilbao-2743876_960_720.jpg",
        description: "Basque country gem with incredible gastronomy, modern art and vibrant culture.",
        tags: ["Food", "Culture", "Nightlife"],
        rating: "4.5",
        reviewCount: 149
      },
      {
        name: "Paris",
        country: "France",
        image: "https://images.unsplash.com/photo-1500313830540-7b6650a74fd0?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "The City of Lights offers luxury experiences, world-class cuisine, and unforgettable nightlife.",
        tags: ["Culture", "Food", "Luxury", "Nightlife"],
        rating: "4.9",
        reviewCount: 245
      },
      {
        name: "Seville",
        country: "Spain",
        image: "https://cdn.pixabay.com/photo/2018/08/22/15/46/seville-3623804_960_720.jpg",
        description: "Passionate city with flamenco, tapas bars and romantic atmosphere.",
        tags: ["Culture", "Food", "Nightlife"],
        rating: "4.5",
        reviewCount: 154
      },
      {
        name: "Malaga",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1590086783191-a0694c7d1e6e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Costa del Sol paradise with beaches, beachfront bars and clubs, and rich culture.",
        tags: ["Beaches", "Nightlife", "Food"],
        rating: "4.6",
        reviewCount: 159
      },
      {
        name: "Frankfurt",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1577185816322-21f6a92ffc1f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Financial heart of Germany with impressive skyscrapers and surprising nightlife.",
        tags: ["Nightlife", "Breweries", "Culture"],
        rating: "4.3",
        reviewCount: 146
      },
      {
        name: "Cologne",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1524905316052-a4990b955e83?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Famous for its carnival, beer culture and vibrant LGBT scene.",
        tags: ["Beer", "Nightlife", "Culture"],
        rating: "4.4",
        reviewCount: 152
      },
      {
        name: "Porto",
        country: "Portugal",
        image: "https://images.unsplash.com/photo-1580323956656-26bbb1206e34?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Charming riverside city famous for its port wine cellars and vibrant food scene.",
        tags: ["Wine", "Food", "Culture"],
        rating: "4.7",
        reviewCount: 169
      },
      {
        name: "Faro",
        country: "Portugal",
        image: "https://images.unsplash.com/photo-1552042843-ed18bd009630?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Gateway to the Algarve with beautiful beaches and relaxed atmosphere.",
        tags: ["Beaches", "Nightlife", "Affordable"],
        rating: "4.3",
        reviewCount: 138
      },
      {
        name: "Galway",
        country: "Ireland",
        image: "https://images.unsplash.com/photo-1591416213802-1636b76acf0e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Ireland's cultural heart with amazing pubs, live music and friendly locals.",
        tags: ["Pubs", "Music", "Culture"],
        rating: "4.6",
        reviewCount: 157
      },
      {
        name: "Cork",
        country: "Ireland",
        image: "https://images.unsplash.com/photo-1567284783420-9c60fd0c3630?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Charming city with excellent pubs, brewery tours and nearby scenic countryside.",
        tags: ["Pubs", "Beer", "Culture"],
        rating: "4.4",
        reviewCount: 143
      },
      {
        name: "Nice",
        country: "France",
        image: "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Glamorous coastal city on the French Riviera with beaches and upscale nightlife.",
        tags: ["Beaches", "Luxury", "Nightlife"],
        rating: "4.7",
        reviewCount: 165
      },
      {
        name: "Marseille",
        country: "France",
        image: "https://images.unsplash.com/photo-1582880414862-2ed8f5162086?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Vibrant port city with Mediterranean flair, beaches and exciting nightlife.",
        tags: ["Beaches", "Culture", "Nightlife"],
        rating: "4.4",
        reviewCount: 149
      },
      {
        name: "Lyon",
        country: "France",
        image: "https://images.unsplash.com/photo-1603513492128-ba7bc9b3e143?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Gastronomic capital of France with incredible food scene and charming old town.",
        tags: ["Food", "Culture", "Nightlife"],
        rating: "4.5",
        reviewCount: 152
      },
      {
        name: "Heraklion",
        country: "Greece",
        image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Crete's lively capital with nearby beaches, archaeological sites and party resorts.",
        tags: ["Beaches", "Nightlife", "History"],
        rating: "4.3",
        reviewCount: 138
      },
      {
        name: "Rhodes",
        country: "Greece",
        image: "https://images.unsplash.com/photo-1574958269340-fa927503f3dd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Historic island with medieval old town, beautiful beaches and vibrant party scene.",
        tags: ["Beaches", "Nightlife", "History"],
        rating: "4.6",
        reviewCount: 148
      },
      {
        name: "Zagreb",
        country: "Croatia",
        image: "https://images.unsplash.com/photo-1582520122440-ca42c6c3a648?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Croatia's capital with trendy bars, affordable prices and nearby nature attractions.",
        tags: ["Nightlife", "Affordable", "Culture"],
        rating: "4.3",
        reviewCount: 126
      },
      {
        name: "Dubrovnik",
        country: "Croatia",
        image: "https://images.unsplash.com/photo-1555990720-0065b7f51880?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Game of Thrones filming location with medieval walls and vibrant cliff bars.",
        tags: ["Beaches", "Culture", "Nightlife"],
        rating: "4.8",
        reviewCount: 176
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
        name: "ByeBro Mugs",
        description: "Milk mugs featuring the ByeBro logo - perfect for morning afters!",
        price: 1299,
        image: "https://images.unsplash.com/photo-1508366717390-1b54517b6c96?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=350&q=80",
        type: "mug"
      },
      {
        name: "The Bro Socks",
        description: "Red and black socks with \"The Bro Socks\" embroidery for stylish bros.",
        price: 999,
        image: "https://images.unsplash.com/photo-1586350977771-b3714d332da4?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=350&q=80",
        type: "socks"
      },
      {
        name: "Last Night Badges",
        description: "Commemorative badges with \"One More Night, No More Rights!\" slogan.",
        price: 799,
        image: "https://images.unsplash.com/photo-1563290329-75d360304388?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=350&q=80",
        type: "badges"
      }
    ];
    
    merchandiseItems.forEach(merchandise => {
      this.createMerchandise(merchandise);
    });
  }
}

export const storage = new MemStorage();
