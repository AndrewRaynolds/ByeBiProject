import axios from 'axios';

interface KiwiFlightSearch {
  fly_from: string;
  fly_to: string;
  date_from: string;
  date_to: string;
  adults: number;
  curr: string;
  limit: number;
}

interface KiwiHotelSearch {
  location: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency: string;
  limit: number;
}

interface KiwiLocation {
  id: string;
  name: string;
  code: string;
  country: {
    id: string;
    name: string;
    code: string;
  };
  type: string;
}

interface KiwiFlightResult {
  id: string;
  cityFrom: string;
  cityTo: string;
  flyFrom: string;
  flyTo: string;
  price: number;
  airlines: string[];
  route: Array<{
    flyFrom: string;
    flyTo: string;
    cityFrom: string;
    cityTo: string;
    dTime: number;
    aTime: number;
    airline: string;
    flight_no: number;
  }>;
  booking_token: string;
  deep_link: string;
  duration: {
    departure: number;
    return: number;
    total: number;
  };
}

interface KiwiHotelResult {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  price: {
    amount: number;
    currency: string;
  };
  stars: number;
  review_score: number;
  photos: string[];
  amenities: string[];
  address: string;
  deep_link: string;
}

export class KiwiAPI {
  private apiKey: string;
  private baseUrl: string = 'https://api.tequila.kiwi.com';

  constructor() {
    this.apiKey = process.env.KIWI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('KIWI_API_KEY is required');
    }
  }

  private getHeaders() {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  // Cerca destinazioni per codice città
  async searchLocations(term: string): Promise<KiwiLocation[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/locations/query`, {
        headers: this.getHeaders(),
        params: {
          term,
          locale: 'en-US',
          location_types: 'city',
          limit: 10,
        },
      });

      return response.data.locations || [];
    } catch (error: any) {
      console.error('Kiwi locations search error:', error.response?.data || error.message);
      return [];
    }
  }

  // Cerca voli
  async searchFlights(params: KiwiFlightSearch): Promise<KiwiFlightResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/search`, {
        headers: this.getHeaders(),
        params: {
          ...params,
          partner: 'picky',
          vehicle_type: 'aircraft',
          sort: 'price',
        },
      });

      return response.data.data || [];
    } catch (error: any) {
      console.error('Kiwi flights search error:', error.response?.data || error.message);
      return [];
    }
  }

  // Genera itinerario completo utilizzando i servizi Kiwi.com
  async generateItinerary(request: {
    destination: string;
    departureCity: string;
    startDate: string;
    endDate: string;
    groupSize: number;
    budget: 'budget' | 'standard' | 'luxury';
    interests: string[];
  }) {
    try {
      // 1. Trova il codice della destinazione
      const destinations = await this.searchLocations(request.destination);
      const destinationCode = destinations[0]?.code || request.destination;

      // 2. Trova il codice della città di partenza
      const departures = await this.searchLocations(request.departureCity);
      const departureCode = departures[0]?.code || request.departureCity;

      // 3. Cerca voli
      const flights = await this.searchFlights({
        fly_from: departureCode,
        fly_to: destinationCode,
        date_from: request.startDate,
        date_to: request.endDate,
        adults: request.groupSize,
        curr: 'EUR',
        limit: 5,
      });

      // 4. Calcola durata del viaggio
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // 5. Genera suggerimenti per attività basate sugli interessi
      const activities = this.generateActivitiesByInterests(request.interests, request.destination, durationDays);

      // 6. Calcola budget stimato
      const budgetMultiplier = request.budget === 'budget' ? 0.7 : request.budget === 'luxury' ? 1.5 : 1.0;
      const flightPrice = flights[0]?.price || 200;
      const estimatedDailyCost = request.budget === 'budget' ? 80 : request.budget === 'luxury' ? 250 : 150;
      const totalEstimatedCost = (flightPrice + (estimatedDailyCost * durationDays)) * budgetMultiplier;

      // 7. Costruisci itinerario
      const itinerary = {
        title: `${request.destination} - Addio al Celibato ${durationDays} Giorni`,
        destination: request.destination,
        summary: `Viaggio di ${durationDays} giorni a ${request.destination} per ${request.groupSize} persone. Include voli, alloggio e attività selezionate in base ai vostri interessi.`,
        duration: durationDays,
        groupSize: request.groupSize,
        budget: request.budget,
        flights: flights.slice(0, 3).map(flight => ({
          airline: flight.airlines[0] || 'Unknown',
          price: flight.price,
          duration: this.formatDuration(flight.duration.total),
          deepLink: flight.deep_link,
          departure: flight.cityFrom,
          arrival: flight.cityTo,
          departureCode: flight.flyFrom,
          arrivalCode: flight.flyTo,
        })),
        activities,
        estimatedTotalCost: totalEstimatedCost,
        currency: 'EUR',
        destinationInfo: destinations[0] || null,
        bookingLinks: {
          flights: flights[0]?.deep_link || '',
        },
      };

      return itinerary;
    } catch (error: any) {
      console.error('Kiwi itinerary generation error:', error);
      throw new Error('Errore nella generazione dell\'itinerario con Kiwi.com: ' + error.message);
    }
  }

  private generateActivitiesByInterests(interests: string[], destination: string, days: number) {
    const activitiesMap: Record<string, string[]> = {
      nightlife: [
        'Tour dei migliori pub e club locali',
        'Esperienza cocktail bar premium',
        'Night club con DJ internazionali',
        'Tour guidato della vita notturna',
      ],
      adventure: [
        'Attività adrenaliniche e sport estremi',
        'Escursioni e trekking urbano',
        'Tour in bicicletta della città',
        'Attività acquatiche e sport',
      ],
      culture: [
        'Tour guidato dei musei principali',
        'Visita ai monumenti storici',
        'Esperienza gastronomica locale',
        'Tour architettonico della città',
      ],
      food: [
        'Food tour dei piatti tipici',
        'Corso di cucina locale',
        'Degustazione birre artigianali',
        'Cena in ristoranti stellati',
      ],
      entertainment: [
        'Spettacoli e concerti live',
        'Casino e giochi',
        'Eventi sportivi locali',
        'Escape room e attività di gruppo',
      ],
    };

    const selectedActivities: string[] = [];
    
    interests.forEach(interest => {
      if (activitiesMap[interest]) {
        selectedActivities.push(...activitiesMap[interest]);
      }
    });

    // Se non ci sono interessi specifici, aggiungi attività generiche
    if (selectedActivities.length === 0) {
      selectedActivities.push(
        'Tour della città',
        'Visita ai luoghi di interesse',
        'Esperienze locali',
        'Attività di gruppo'
      );
    }

    // Distribuisci le attività sui giorni
    const dailyActivities = [];
    for (let day = 1; day <= days; day++) {
      const dayActivities = selectedActivities.slice((day - 1) * 2, day * 2);
      if (dayActivities.length > 0) {
        dailyActivities.push({
          day,
          activities: dayActivities,
        });
      }
    }

    return dailyActivities;
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  // Metodo per testare la connessione API
  async testConnection(): Promise<boolean> {
    try {
      await this.searchLocations('Rome');
      return true;
    } catch (error) {
      console.error('Kiwi API connection test failed:', error);
      return false;
    }
  }
}

export const kiwiAPI = new KiwiAPI();