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
      },
      // Nuove destinazioni aggiunte
      {
        name: "Palma de Mallorca",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Stunning beaches by day and lively clubs by night in this Mediterranean hotspot.",
        tags: ["Nightlife", "Beaches"],
        rating: "4.7",
        reviewCount: 189
      },
      {
        name: "Algarve",
        country: "Portugal",
        image: "https://images.unsplash.com/photo-1566419377145-1c4925d75500?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1518310952931-b1de897abd40?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Historic charm by day, vibrant nightlife by night in Portugal's coastal capital.",
        tags: ["Nightlife", "Food", "Culture"],
        rating: "4.6",
        reviewCount: 178
      },
      {
        name: "Dublin",
        country: "Ireland",
        image: "https://images.unsplash.com/photo-1564959130747-897fb406b9e5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Pub crawls, live music, and friendly locals make Dublin perfect for bachelor parties.",
        tags: ["Nightlife", "Pubs", "Beer"],
        rating: "4.5",
        reviewCount: 183
      },
      {
        name: "Krakow",
        country: "Poland",
        image: "https://images.unsplash.com/photo-1562864769-9a7b20095e41?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1562064361-256f027fe7fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Medieval charm with modern nightlife in this picturesque Baltic city.",
        tags: ["Nightlife", "History", "Affordable"],
        rating: "4.3",
        reviewCount: 136
      },
      {
        name: "Kiev",
        country: "Ukraine",
        image: "https://images.unsplash.com/photo-1590573236787-2b3a3a989de7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Emerging party scene with upscale clubs and affordable luxury experiences.",
        tags: ["Nightlife", "Affordable", "Luxury"],
        rating: "4.1",
        reviewCount: 118
      },
      {
        name: "Belgrade",
        country: "Serbia",
        image: "https://images.unsplash.com/photo-1608057430003-2b3f22b3e26b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Legendary nightlife with floating clubs on the river and parties until sunrise.",
        tags: ["Nightlife", "Affordable"],
        rating: "4.4",
        reviewCount: 142
      },
      {
        name: "Vilnius",
        country: "Lithuania",
        image: "https://images.unsplash.com/photo-1610962599945-45e593913705?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Charming Old Town with hidden bars and clubs for an affordable weekend.",
        tags: ["Nightlife", "Affordable", "History"],
        rating: "4.2",
        reviewCount: 119
      },
      {
        name: "Bratislava",
        country: "Slovakia",
        image: "https://images.unsplash.com/photo-1600007033163-9ade5ac2b7ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Central European gem with castle views and vibrant beer culture.",
        tags: ["Nightlife", "Beer", "Affordable"],
        rating: "4.0",
        reviewCount: 107
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
        name: "Odessa",
        country: "Ukraine",
        image: "https://images.unsplash.com/photo-1594498653385-d5172c532c00?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Black Sea beaches and clubs with beautiful architecture as a backdrop.",
        tags: ["Beaches", "Nightlife", "Affordable"],
        rating: "4.1",
        reviewCount: 112
      },
      {
        name: "Sofia",
        country: "Bulgaria",
        image: "https://images.unsplash.com/photo-1596642779378-3db04b95f06a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Affordable beer, clubs, and casinos in the shadow of snow-capped mountains.",
        tags: ["Nightlife", "Affordable", "Casinos"],
        rating: "4.0",
        reviewCount: 103
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
        name: "Thessaloniki",
        country: "Greece",
        image: "https://images.unsplash.com/photo-1612436395424-08c3c10d6711?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1555990538-17835ba38a8a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1574155376612-bfa4ed8aabfd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Fashion capital with stylish clubs, fancy aperitivo scene and vibrant nightlife.",
        tags: ["Fashion", "Nightlife", "Food"],
        rating: "4.5",
        reviewCount: 156
      },
      {
        name: "Florence",
        country: "Italy",
        image: "https://images.unsplash.com/photo-1541370976299-4d52ee1a47a8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Renaissance gem with amazing wine tours, cuisine and Tuscan landscapes.",
        tags: ["Culture", "Wine", "Food"],
        rating: "4.8",
        reviewCount: 178
      },
      {
        name: "Naples",
        country: "Italy",
        image: "https://images.unsplash.com/photo-1597057880641-c1f3fbde2c60?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Authentic Italian experience with the best pizza, nearby beaches and vibrant street life.",
        tags: ["Food", "Culture", "Beaches"],
        rating: "4.4",
        reviewCount: 143
      },
      {
        name: "Baja Sardinia",
        country: "Italy",
        image: "https://images.unsplash.com/photo-1594735514819-4fd512aae2ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Luxurious beach clubs, crystal waters and vibrant nightlife on Sardinia's Emerald Coast.",
        tags: ["Beaches", "Luxury", "Nightlife"],
        rating: "4.9",
        reviewCount: 132
      },
      // Aggiunte altro destinazioni per paese
      {
        name: "Valencia",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1596394642643-da47f5de8c2e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Beautiful city with incredible beaches, futuristic architecture and famous nightlife.",
        tags: ["Beaches", "Culture", "Nightlife"],
        rating: "4.6",
        reviewCount: 167
      },
      {
        name: "Seville",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1558961166-68c7af5b9b97?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1564722079273-35d15ce7eedf?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Financial heart of Germany with impressive skyscrapers and surprising nightlife.",
        tags: ["Nightlife", "Breweries", "Culture"],
        rating: "4.3",
        reviewCount: 146
      },
      {
        name: "Cologne",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1578067141530-05b478de02ee?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1567156345550-52ddaeb97911?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Gateway to the Algarve with beautiful beaches and relaxed atmosphere.",
        tags: ["Beaches", "Nightlife", "Affordable"],
        rating: "4.3",
        reviewCount: 138
      },
      {
        name: "Galway",
        country: "Ireland",
        image: "https://images.unsplash.com/photo-1564017552458-14927ce61b7c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Ireland's cultural heart with amazing pubs, live music and friendly locals.",
        tags: ["Pubs", "Music", "Culture"],
        rating: "4.6",
        reviewCount: 157
      },
      {
        name: "Cork",
        country: "Ireland",
        image: "https://images.unsplash.com/photo-1582374458567-49011847696e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1572918284933-c21742e0a407?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Vibrant port city with Mediterranean flair, beaches and exciting nightlife.",
        tags: ["Beaches", "Culture", "Nightlife"],
        rating: "4.4",
        reviewCount: 149
      },
      {
        name: "Lyon",
        country: "France",
        image: "https://images.unsplash.com/photo-1486151412355-1b16fad0a6f2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Gastronomic capital of France with incredible food scene and charming old town.",
        tags: ["Food", "Culture", "Nightlife"],
        rating: "4.5",
        reviewCount: 152
      },
      {
        name: "Heraklion",
        country: "Greece",
        image: "https://images.unsplash.com/photo-1586156938613-769886aae531?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "https://images.unsplash.com/photo-1568125631245-a317a32e3148?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        description: "Croatia's capital with trendy bars, affordable prices and nearby nature attractions.",
        tags: ["Nightlife", "Affordable", "Culture"],
        rating: "4.3",
        reviewCount: 126
      },
      {
        name: "Dubrovnik",
        country: "Croatia",
        image: "https://images.unsplash.com/photo-1591085318719-7a83bde53c62?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
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
        image: "/assets/images/staples_center.png"
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
