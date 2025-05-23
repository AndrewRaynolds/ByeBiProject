import { apiRequest } from "@/lib/queryClient";

export interface Flight {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  airline: string;
  price: number;
  currency: string;
  duration: string;
  stops: number;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  address: string;
  rating: number;
  price: number;
  currency: string;
  amenities: string[];
  images: string[];
  description: string;
}

export interface Activity {
  id: string;
  name: string;
  city: string;
  category: string;
  price: number;
  currency: string;
  rating: number;
  duration: string;
  description: string;
  images: string[];
}

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  address: string;
  cuisine: string;
  price: number;
  currency: string;
  rating: number;
  description: string;
  images: string[];
}

export interface Event {
  id: string;
  name: string;
  city: string;
  venue: string;
  date: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  images: string[];
}

export interface TravelPackage {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  budget: string;
  flights: Flight[];
  hotels: Hotel[];
  activities: Activity[];
  restaurants: Restaurant[];
  events: Event[];
}

export interface PackageRequest {
  destination: string;
  startDate: string;
  endDate: string;
  adults?: number;
  budget?: string;
}

// Servizio per le API di viaggio
class TravelService {
  // Ottiene voli tra due destinazioni
  async getFlights(
    origin: string = 'MXP',
    destination: string,
    departureDate: string,
    returnDate: string,
    adults: number = 1
  ): Promise<Flight[]> {
    const response = await apiRequest('GET', `/api/travel/flights?origin=${origin}&destination=${destination}&departureDate=${departureDate}&returnDate=${returnDate}&adults=${adults}`);
    return await response.json();
  }

  // Ottiene hotel in una città
  async getHotels(
    city: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number = 1
  ): Promise<Hotel[]> {
    const response = await apiRequest('GET', `/api/travel/hotels?city=${city}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}`);
    return await response.json();
  }

  // Ottiene attività in una città
  async getActivities(city: string): Promise<Activity[]> {
    const response = await apiRequest('GET', `/api/travel/activities?city=${city}`);
    return await response.json();
  }

  // Ottiene ristoranti in una città
  async getRestaurants(city: string, cuisine: string = ''): Promise<Restaurant[]> {
    const response = await apiRequest('GET', `/api/travel/restaurants?city=${city}${cuisine ? `&cuisine=${cuisine}` : ''}`);
    return await response.json();
  }

  // Ottiene eventi in una città
  async getEvents(
    city: string,
    startDate: string,
    endDate: string,
    category: string = 'nightlife'
  ): Promise<Event[]> {
    const response = await apiRequest('GET', `/api/travel/events?city=${city}&startDate=${startDate}&endDate=${endDate}&category=${category}`);
    return await response.json();
  }

  // Genera un pacchetto completo di viaggio
  async generatePackage(request: PackageRequest): Promise<TravelPackage> {
    const response = await apiRequest('POST', '/api/travel/packages', request);
    return await response.json();
  }

  // Utility per formattare le date
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Utility per convertire il nome della città nel codice destinazione
  getDestinationCode(city: string): string {
    const normalizedCity = city.toLowerCase();
    if (normalizedCity.includes('amsterdam')) return 'amsterdam';
    if (normalizedCity.includes('praga')) return 'praga';
    if (normalizedCity.includes('budapest')) return 'budapest';
    if (normalizedCity.includes('barcelona') || normalizedCity.includes('barcellona')) return 'barcellona';
    if (normalizedCity.includes('berlin') || normalizedCity.includes('berlino')) return 'berlino';
    return 'amsterdam'; // Default fallback
  }
}

// Esporta un'istanza del servizio
export const travelService = new TravelService();