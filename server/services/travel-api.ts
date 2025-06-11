import { kiwiAPI } from './kiwi-api';
import { bookingAPI } from './booking-api';

interface TravelPackageRequest {
  destination: string;
  departureCity: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  budget: 'budget' | 'standard' | 'luxury';
  interests: string[];
}

interface TravelPackageResult {
  flights: {
    outbound: any;
    return: any;
    totalPrice: number;
  };
  hotels: any[];
  totalCost: number;
  currency: string;
  activities: string[];
  estimatedDailyCost: number;
}

export class TravelAPI {
  
  // Genera pacchetto viaggio completo con API reali
  async generateTravelPackage(request: TravelPackageRequest): Promise<TravelPackageResult> {
    try {
      console.log('Generating travel package with real APIs for:', request.destination);

      // Step 1: Trova il codice aeroporto per la destinazione
      const destinationLocations = await kiwiAPI.searchLocations(request.destination);
      const departureLocations = await kiwiAPI.searchLocations(request.departureCity);

      if (destinationLocations.length === 0) {
        throw new Error(`Cannot find airport code for destination: ${request.destination}`);
      }
      if (departureLocations.length === 0) {
        throw new Error(`Cannot find airport code for departure city: ${request.departureCity}`);
      }

      const destinationCode = destinationLocations[0].code;
      const departureCode = departureLocations[0].code;

      // Step 2: Cerca voli reali
      const flightResults = await kiwiAPI.searchFlights({
        fly_from: departureCode,
        fly_to: destinationCode,
        date_from: request.checkIn,
        date_to: request.checkOut,
        adults: request.adults,
        curr: 'EUR',
        limit: 5
      });

      if (flightResults.length === 0) {
        throw new Error(`No flights found from ${request.departureCity} to ${request.destination}`);
      }

      const selectedFlight = flightResults[0]; // Prendi il volo più economico

      // Step 3: Cerca destinazioni Booking.com
      const bookingDestinations = await bookingAPI.searchDestinations(request.destination);
      
      if (bookingDestinations.length === 0) {
        throw new Error(`Cannot find hotels in destination: ${request.destination}`);
      }

      const destinationId = bookingDestinations[0].dest_id;

      // Step 4: Cerca hotel reali
      const hotelResults = await bookingAPI.searchHotels({
        dest_id: destinationId,
        checkin_date: request.checkIn,
        checkout_date: request.checkOut,
        adults_number: request.adults,
        room_number: 1,
        units: 'metric',
        locale: 'en-gb',
        currency: 'EUR'
      });

      if (hotelResults.length === 0) {
        throw new Error(`No hotels found in ${request.destination} for the selected dates`);
      }

      // Filtra hotel per budget
      const filteredHotels = this.filterHotelsByBudget(hotelResults, request.budget);
      const selectedHotels = filteredHotels.slice(0, 3); // Top 3 hotel

      // Step 5: Calcola costi totali
      const flightCost = selectedFlight.price;
      const hotelCost = selectedHotels.length > 0 ? selectedHotels[0].min_total_price : 0;
      const totalCost = flightCost + hotelCost;

      // Step 6: Genera attività basate sugli interessi
      const activities = this.generateActivitiesByInterests(request.interests, request.destination);

      // Step 7: Stima costo giornaliero
      const days = this.calculateDays(request.checkIn, request.checkOut);
      const dailyCost = this.calculateDailyCost(request.budget, request.destination);

      return {
        flights: {
          outbound: selectedFlight,
          return: selectedFlight, // Stesso volo per andata e ritorno
          totalPrice: flightCost
        },
        hotels: selectedHotels,
        totalCost: totalCost + (dailyCost * days),
        currency: 'EUR',
        activities,
        estimatedDailyCost: dailyCost
      };

    } catch (error: any) {
      console.error('Travel package generation error:', error.message);
      throw new Error(`Failed to generate travel package: ${error.message}`);
    }
  }

  private filterHotelsByBudget(hotels: any[], budget: string): any[] {
    const sortedHotels = hotels.sort((a, b) => a.min_total_price - b.min_total_price);
    
    switch (budget) {
      case 'budget':
        return sortedHotels.filter(hotel => hotel.min_total_price <= 150);
      case 'standard':
        return sortedHotels.filter(hotel => hotel.min_total_price > 150 && hotel.min_total_price <= 300);
      case 'luxury':
        return sortedHotels.filter(hotel => hotel.min_total_price > 300);
      default:
        return sortedHotels;
    }
  }

  private generateActivitiesByInterests(interests: string[], destination: string): string[] {
    const activityMap: { [key: string]: string[] } = {
      'nightlife': [
        `Explore ${destination}'s famous nightclub district`,
        'VIP table booking at premium clubs',
        'Pub crawl with local guide',
        'Rooftop bar hopping experience'
      ],
      'food': [
        `Traditional ${destination} food tour`,
        'Michelin-starred restaurant reservations',
        'Local brewery and distillery visits',
        'Cooking class with local chef'
      ],
      'culture': [
        `Historic city center walking tour in ${destination}`,
        'Museum and art gallery visits',
        'Local cultural performances',
        'Architecture and heritage sites tour'
      ],
      'adventure': [
        'Extreme sports activities',
        'Outdoor adventure excursions',
        'Water sports and activities',
        'Mountain hiking and climbing'
      ],
      'relaxation': [
        'Spa and wellness treatments',
        'Beach club day passes',
        'Scenic boat tours',
        'Wine tasting experiences'
      ]
    };

    const activities: string[] = [];
    interests.forEach(interest => {
      const interestActivities = activityMap[interest.toLowerCase()] || [];
      activities.push(...interestActivities.slice(0, 2)); // Max 2 attività per interesse
    });

    return activities.slice(0, 6); // Max 6 attività totali
  }

  private calculateDays(checkIn: string, checkOut: string): number {
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateDailyCost(budget: string, destination: string): number {
    const baseCosts = {
      'budget': 50,
      'standard': 100,
      'luxury': 200
    };

    // Aggiusta per destinazione (città costose vs economiche)
    const expensiveCities = ['london', 'paris', 'amsterdam', 'zurich', 'oslo'];
    const cheapCities = ['prague', 'budapest', 'krakow', 'sofia', 'zagreb'];
    
    let multiplier = 1;
    if (expensiveCities.some(city => destination.toLowerCase().includes(city))) {
      multiplier = 1.5;
    } else if (cheapCities.some(city => destination.toLowerCase().includes(city))) {
      multiplier = 0.7;
    }

    return Math.round((baseCosts[budget as keyof typeof baseCosts] || baseCosts.standard) * multiplier);
  }

  // Test connessione di entrambe le API
  async testAPIs(): Promise<{ kiwi: boolean; booking: boolean }> {
    const [kiwiStatus, bookingStatus] = await Promise.all([
      kiwiAPI.testConnection(),
      bookingAPI.testConnection()
    ]);

    return {
      kiwi: kiwiStatus,
      booking: bookingStatus
    };
  }
}

export const travelAPI = new TravelAPI();