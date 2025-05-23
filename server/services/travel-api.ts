import axios from 'axios';

// Interfacce per i dati di viaggio
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

/**
 * Amadeus API Service
 * Documention: https://developers.amadeus.com/
 */
class AmadeusApi {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://test.api.amadeus.com/v1';
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY || '';
    this.apiSecret = process.env.AMADEUS_API_SECRET || '';
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    try {
      const response = await axios({
        method: 'post',
        url: 'https://test.api.amadeus.com/v1/security/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: `grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.apiSecret}`
      });

      this.token = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
      return this.token;
    } catch (error) {
      console.error('Error getting Amadeus token:', error);
      throw new Error('Failed to authenticate with Amadeus API');
    }
  }

  async searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    returnDate: string,
    adults: number = 1
  ): Promise<Flight[]> {
    if (!this.apiKey || !this.apiSecret) {
      console.log('Amadeus API keys not configured, returning fallback data');
      return this.getFallbackFlights(origin, destination);
    }

    try {
      const token = await this.getToken();
      const response = await axios.get(
        `${this.baseUrl}/shopping/flight-offers`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate,
            returnDate,
            adults,
            max: 10
          }
        }
      );

      return response.data.data.map((offer: any) => {
        const segment = offer.itineraries[0].segments[0];
        return {
          id: offer.id,
          origin: segment.departure.iataCode,
          destination: segment.arrival.iataCode,
          departureDate: segment.departure.at,
          returnDate: offer.itineraries[1]?.segments[0]?.departure?.at || '',
          airline: segment.carrierCode,
          price: offer.price.total,
          currency: offer.price.currency,
          duration: segment.duration,
          stops: offer.itineraries[0].segments.length - 1
        };
      });
    } catch (error) {
      console.error('Error searching flights with Amadeus:', error);
      return this.getFallbackFlights(origin, destination);
    }
  }

  async searchHotels(
    cityCode: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number = 1
  ): Promise<Hotel[]> {
    if (!this.apiKey || !this.apiSecret) {
      console.log('Amadeus API keys not configured, returning fallback data');
      return this.getFallbackHotels(cityCode);
    }

    try {
      const token = await this.getToken();
      const response = await axios.get(
        `${this.baseUrl}/shopping/hotel-offers`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            cityCode,
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity: 1,
            currency: 'EUR',
            sort: 'PRICE'
          }
        }
      );

      return response.data.data.map((offer: any) => {
        const hotel = offer.hotel;
        return {
          id: hotel.hotelId,
          name: hotel.name,
          city: cityCode,
          address: hotel.address?.lines?.join(', ') || '',
          rating: hotel.rating || 3,
          price: offer.offers[0].price.total,
          currency: offer.offers[0].price.currency,
          amenities: hotel.amenities || [],
          images: hotel.media?.map((m: any) => m.uri) || [],
          description: hotel.description?.text || 'Comfortable accommodation in a great location.'
        };
      });
    } catch (error) {
      console.error('Error searching hotels with Amadeus:', error);
      return this.getFallbackHotels(cityCode);
    }
  }

  async searchActivities(cityCode: string): Promise<Activity[]> {
    if (!this.apiKey || !this.apiSecret) {
      console.log('Amadeus API keys not configured, returning fallback data');
      return this.getFallbackActivities(cityCode);
    }

    try {
      const token = await this.getToken();
      const response = await axios.get(
        `${this.baseUrl}/shopping/activities`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            latitude: this.getCityCoordinates(cityCode).latitude,
            longitude: this.getCityCoordinates(cityCode).longitude,
            radius: 20
          }
        }
      );

      return response.data.data.map((activity: any) => ({
        id: activity.id,
        name: activity.name,
        city: cityCode,
        category: activity.categoryGroup || 'Sightseeing',
        price: activity.price.amount,
        currency: activity.price.currencyCode,
        rating: activity.rating || 4.0,
        duration: activity.minimumDuration || '2 hours',
        description: activity.shortDescription || activity.description || 'Exciting local activity',
        images: activity.pictures?.map((p: any) => p.url) || []
      }));
    } catch (error) {
      console.error('Error searching activities with Amadeus:', error);
      return this.getFallbackActivities(cityCode);
    }
  }

  // Dati di fallback per quando le API non sono disponibili
  private getFallbackFlights(origin: string, destination: string): Flight[] {
    return [
      {
        id: '1',
        origin,
        destination,
        departureDate: '2025-06-15T10:00:00',
        returnDate: '2025-06-22T18:30:00',
        airline: 'Alitalia',
        price: 199.99,
        currency: 'EUR',
        duration: '02:15',
        stops: 0
      },
      {
        id: '2',
        origin,
        destination,
        departureDate: '2025-06-15T15:30:00',
        returnDate: '2025-06-22T12:45:00',
        airline: 'Lufthansa',
        price: 229.99,
        currency: 'EUR',
        duration: '02:30',
        stops: 0
      },
      {
        id: '3',
        origin,
        destination,
        departureDate: '2025-06-15T07:15:00',
        returnDate: '2025-06-22T21:20:00',
        airline: 'KLM',
        price: 179.99,
        currency: 'EUR',
        duration: '02:00',
        stops: 0
      }
    ];
  }

  private getFallbackHotels(cityCode: string): Hotel[] {
    const cityData = this.getCityData(cityCode);
    return [
      {
        id: '1',
        name: `${cityData.name} Plaza Hotel`,
        city: cityData.name,
        address: `123 Main Street, ${cityData.name}`,
        rating: 4.5,
        price: 125.99,
        currency: 'EUR',
        amenities: ['Wi-Fi', 'Pool', 'Breakfast included', 'Fitness center'],
        images: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945',
          'https://images.unsplash.com/photo-1611892440504-42a792e24d32'
        ],
        description: 'Elegant hotel in the heart of the city with modern amenities and great service.'
      },
      {
        id: '2',
        name: `${cityData.hotelPrefix} Hostel`,
        city: cityData.name,
        address: `456 Party Street, ${cityData.name}`,
        rating: 4.0,
        price: 45.99,
        currency: 'EUR',
        amenities: ['Wi-Fi', 'Bar', 'Shared kitchen', 'Laundry'],
        images: [
          'https://images.unsplash.com/photo-1555854877-bab0e564b8d5',
          'https://images.unsplash.com/photo-1596276020587-8044fe049813'
        ],
        description: 'Budget-friendly hostel with a great social atmosphere, perfect for groups.'
      },
      {
        id: '3',
        name: `${cityData.luxuryHotel}`,
        city: cityData.name,
        address: `789 Luxury Avenue, ${cityData.name}`,
        rating: 4.8,
        price: 199.99,
        currency: 'EUR',
        amenities: ['Wi-Fi', 'Pool', 'Spa', 'Restaurant', 'Bar', 'Room service'],
        images: [
          'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa',
          'https://images.unsplash.com/photo-1615460549969-36fa19521a4f'
        ],
        description: 'Luxurious hotel with premium amenities and excellent service for a memorable stay.'
      }
    ];
  }

  private getFallbackActivities(cityCode: string): Activity[] {
    const cityData = this.getCityData(cityCode);

    return cityData.activities.map((activity, index) => ({
      id: (index + 1).toString(),
      name: activity.name,
      city: cityData.name,
      category: activity.category,
      price: activity.price,
      currency: 'EUR',
      rating: activity.rating,
      duration: activity.duration,
      description: activity.description,
      images: [activity.image]
    }));
  }

  // Helper per ottenere coordinate per una città
  private getCityCoordinates(cityCode: string): { latitude: number; longitude: number } {
    const coordinates: { [key: string]: { latitude: number; longitude: number } } = {
      'AMS': { latitude: 52.3676, longitude: 4.9041 },   // Amsterdam
      'PRG': { latitude: 50.0755, longitude: 14.4378 },  // Prague (Praga)
      'BUD': { latitude: 47.4979, longitude: 19.0402 },  // Budapest
      'BCN': { latitude: 41.3851, longitude: 2.1734 },   // Barcelona
      'BER': { latitude: 52.5200, longitude: 13.4050 },  // Berlin
      'MXP': { latitude: 45.6300, longitude: 8.7230 }    // Milan Malpensa (origine)
    };

    return coordinates[cityCode] || { latitude: 0, longitude: 0 };
  }

  // Helper per ottenere dati specifici di una città
  private getCityData(cityCode: string): any {
    const cities: { [key: string]: any } = {
      'AMS': {
        name: 'Amsterdam',
        hotelPrefix: 'Flying Pig',
        luxuryHotel: 'Hilton Amsterdam',
        activities: [
          {
            name: 'Tour Heineken Experience',
            category: 'Brewery',
            price: 21.99,
            rating: 4.5,
            duration: '1.5 hours',
            description: 'Visita alla famosa fabbrica di birra con degustazione inclusa',
            image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7'
          },
          {
            name: 'Giro in barca sui canali',
            category: 'Sightseeing',
            price: 35.99,
            rating: 4.7,
            duration: '2 hours',
            description: 'Tour privato in barca sui canali con birra inclusa',
            image: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4'
          },
          {
            name: 'Ingresso al Casino Holland',
            category: 'Nightlife',
            price: 15.99,
            rating: 4.0,
            duration: 'Full day',
            description: 'Una serata di divertimento al casino più famoso di Amsterdam',
            image: 'https://images.unsplash.com/photo-1529973625058-a665431328fb'
          }
        ]
      },
      'PRG': {
        name: 'Prague',
        hotelPrefix: 'Czech Inn',
        luxuryHotel: 'Hilton Prague Old Town',
        activities: [
          {
            name: 'Tour delle birrerie di Praga',
            category: 'Brewery',
            price: 29.99,
            rating: 4.6,
            duration: '3 hours',
            description: 'Visita a 3 birrerie storiche con degustazione inclusa',
            image: 'https://images.unsplash.com/photo-1600095760934-9e913f921dc6'
          },
          {
            name: 'Crociera sul fiume Moldava',
            category: 'Sightseeing',
            price: 45.99,
            rating: 4.5,
            duration: '2 hours',
            description: 'Tour serale con cena e bevande incluse',
            image: 'https://images.unsplash.com/photo-1541849546-216549ae216d'
          },
          {
            name: 'Ingresso al Casino Atrium',
            category: 'Nightlife',
            price: 20.99,
            rating: 4.1,
            duration: 'Evening',
            description: 'Una serata di divertimento nel più grande casino di Praga',
            image: 'https://images.unsplash.com/photo-1634553795936-440e6996b496'
          }
        ]
      },
      'BUD': {
        name: 'Budapest',
        hotelPrefix: 'Wombats City',
        luxuryHotel: 'Hotel Gellért Budapest',
        activities: [
          {
            name: 'Tour dei Ruin Bar',
            category: 'Nightlife',
            price: 25.99,
            rating: 4.8,
            duration: '4 hours',
            description: 'Visita guidata dei famosi bar ricavati da edifici abbandonati',
            image: 'https://images.unsplash.com/photo-1583165224510-7a3729d0dfa4'
          },
          {
            name: 'Terme Széchenyi',
            category: 'Wellness',
            price: 22.99,
            rating: 4.7,
            duration: 'Full day',
            description: 'Accesso giornaliero alle più grandi terme d\'Europa',
            image: 'https://images.unsplash.com/photo-1549475762-f55ae96177c0'
          },
          {
            name: 'Crociera sul Danubio',
            category: 'Sightseeing',
            price: 49.99,
            rating: 4.6,
            duration: '2.5 hours',
            description: 'Tour serale con cena e bevande incluse',
            image: 'https://images.unsplash.com/photo-1541849546-216549ae216d'
          }
        ]
      },
      'BCN': {
        name: 'Barcelona',
        hotelPrefix: 'Generator',
        luxuryHotel: 'W Barcelona',
        activities: [
          {
            name: 'Tour in barca con DJ',
            category: 'Nightlife',
            price: 65.99,
            rating: 4.7,
            duration: '3 hours',
            description: 'Festa in barca con musica dal vivo, drink inclusi e bagno nel Mediterraneo',
            image: 'https://images.unsplash.com/photo-1603568367331-62a0e08821a3'
          },
          {
            name: 'Tour dei bar di tapas',
            category: 'Food & Drink',
            price: 49.99,
            rating: 4.6,
            duration: '4 hours',
            description: 'Visita di 4 bar tradizionali con degustazione di tapas e vino',
            image: 'https://images.unsplash.com/photo-1607098665874-fd193397547b'
          },
          {
            name: 'Ingresso a Opium Barcelona',
            category: 'Nightlife',
            price: 30.99,
            rating: 4.5,
            duration: 'Evening',
            description: 'VIP pass per uno dei migliori club sulla spiaggia',
            image: 'https://images.unsplash.com/photo-1571156425562-365cb9b8ca86'
          }
        ]
      },
      'BER': {
        name: 'Berlin',
        hotelPrefix: 'Generator Berlin',
        luxuryHotel: 'Michelberger Hotel',
        activities: [
          {
            name: 'Tour dei club underground',
            category: 'Nightlife',
            price: 59.99,
            rating: 4.8,
            duration: '6 hours',
            description: 'Visita guidata ai migliori club tecno della città con ingresso saltafila',
            image: 'https://images.unsplash.com/photo-1571156425562-365cb9b8ca86'
          },
          {
            name: 'Tour delle birrerie di Berlino',
            category: 'Food & Drink',
            price: 42.99,
            rating: 4.6,
            duration: '4 hours',
            description: 'Visita di 4 birrerie tradizionali e artigianali con degustazioni',
            image: 'https://images.unsplash.com/photo-1600095760934-9e913f921dc6'
          },
          {
            name: 'Ingresso prioritario a Berghain',
            category: 'Nightlife',
            price: 25.99,
            rating: 4.7,
            duration: 'Evening',
            description: 'Ingresso VIP (non garantito) al club più esclusivo di Berlino',
            image: 'https://images.unsplash.com/photo-1642201725271-087fa8377e83'
          }
        ]
      }
    };

    return cities[cityCode] || cities['AMS'];
  }
}

/**
 * Google Places API Service
 * Documentation: https://developers.google.com/maps/documentation/places/web-service/overview
 */
class GooglePlacesApi {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  }

  async searchRestaurants(
    city: string,
    query: string = 'restaurants',
    type: string = 'restaurant'
  ): Promise<Restaurant[]> {
    if (!this.apiKey) {
      console.log('Google Places API key not configured, returning fallback data');
      return this.getFallbackRestaurants(city);
    }

    try {
      // First, geocode the city to get coordinates
      const geocodeResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: city,
            key: this.apiKey
          }
        }
      );

      const location = geocodeResponse.data.results[0].geometry.location;

      // Search for places
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
        {
          params: {
            location: `${location.lat},${location.lng}`,
            radius: 5000,
            type,
            keyword: query,
            key: this.apiKey
          }
        }
      );

      return await Promise.all(
        response.data.results.slice(0, 10).map(async (place: any) => {
          // Get place details for each restaurant
          const detailsResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/place/details/json`,
            {
              params: {
                place_id: place.place_id,
                fields: 'name,formatted_address,photos,price_level,rating,reviews,website',
                key: this.apiKey
              }
            }
          );

          const details = detailsResponse.data.result;
          const photos = details.photos || [];
          const photoReferences = photos.slice(0, 3).map((photo: any) => photo.photo_reference);
          const images = photoReferences.map((ref: string) => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${ref}&key=${this.apiKey}`
          );

          return {
            id: place.place_id,
            name: place.name,
            city,
            address: place.vicinity,
            cuisine: place.types.filter((t: string) => t !== 'restaurant' && t !== 'food').join(', '),
            price: place.price_level || 2,
            currency: 'EUR',
            rating: place.rating || 4.0,
            description: place.reviews?.[0]?.text || 'Popular local restaurant',
            images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5']
          };
        })
      );
    } catch (error) {
      console.error('Error searching restaurants with Google Places API:', error);
      return this.getFallbackRestaurants(city);
    }
  }

  // Dati di fallback per quando l'API non è disponibile
  private getFallbackRestaurants(city: string): Restaurant[] {
    const cityData = this.getCityRestaurantData(city);
    
    return cityData.map((restaurant, index) => ({
      id: `restaurant_${index + 1}`,
      name: restaurant.name,
      city,
      address: restaurant.address,
      cuisine: restaurant.cuisine,
      price: restaurant.price,
      currency: 'EUR',
      rating: restaurant.rating,
      description: restaurant.description,
      images: [restaurant.image]
    }));
  }

  private getCityRestaurantData(city: string): any[] {
    const cityRestaurants: { [key: string]: any[] } = {
      'Amsterdam': [
        {
          name: 'REM Eiland',
          address: 'Haparandadam 45, Amsterdam',
          cuisine: 'Dutch, International',
          price: 3,
          rating: 4.5,
          description: 'Ristorante unico su una ex piattaforma di trasmissione in mare',
          image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8'
        },
        {
          name: 'Foodhallen',
          address: 'Bellamyplein 51, Amsterdam',
          cuisine: 'International, Street Food',
          price: 2,
          rating: 4.6,
          description: 'Mercato gastronomico coperto con diverse opzioni culinarie',
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5'
        },
        {
          name: 'De Kas',
          address: 'Kamerlingh Onneslaan 3, Amsterdam',
          cuisine: 'Farm to Table, Dutch',
          price: 4,
          rating: 4.7,
          description: 'Ristorante in una serra con ingredienti coltivati sul posto',
          image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e'
        }
      ],
      'Prague': [
        {
          name: 'Lokál Dlouhááá',
          address: 'Dlouhá 33, Prague',
          cuisine: 'Czech, Beer Hall',
          price: 2,
          rating: 4.6,
          description: 'Ristorante tradizionale ceco con ottima birra locale',
          image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c'
        },
        {
          name: 'Café Savoy',
          address: 'Vítězná 124/5, Prague',
          cuisine: 'Czech, Cafe',
          price: 3,
          rating: 4.5,
          description: 'Elegante caffè con cucina tradizionale ceca',
          image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de'
        },
        {
          name: 'U Fleků',
          address: 'Křemencova 11, Prague',
          cuisine: 'Czech, Brewery',
          price: 2,
          rating: 4.4,
          description: 'Storica birreria con cucina tradizionale ceca',
          image: 'https://images.unsplash.com/photo-1525268771113-32d9e9021a97'
        }
      ],
      'Budapest': [
        {
          name: 'Mazel Tov',
          address: 'Akácfa u. 47, Budapest',
          cuisine: 'Middle Eastern, Mediterranean',
          price: 3,
          rating: 4.7,
          description: 'Ristorante alla moda nel quartiere ebraico',
          image: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d'
        },
        {
          name: 'Borkonyha Winekitchen',
          address: 'Sas u. 3, Budapest',
          cuisine: 'Hungarian, Contemporary',
          price: 4,
          rating: 4.8,
          description: 'Ristorante stellato Michelin con cucina ungherese moderna',
          image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de'
        },
        {
          name: 'For Sale Pub',
          address: 'Vámház krt. 2, Budapest',
          cuisine: 'Hungarian, Pub',
          price: 2,
          rating: 4.3,
          description: 'Pub eccentrico con cucina tradizionale ungherese',
          image: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521'
        }
      ],
      'Barcelona': [
        {
          name: 'El Nacional',
          address: 'Passeig de Gràcia, 24, Barcelona',
          cuisine: 'Spanish, Catalan',
          price: 3,
          rating: 4.6,
          description: 'Complesso gastronomico con 4 ristoranti e 4 bar specializzati',
          image: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d'
        },
        {
          name: 'La Boqueria Market',
          address: 'La Rambla, 91, Barcelona',
          cuisine: 'Spanish, Market',
          price: 2,
          rating: 4.7,
          description: 'Mercato storico con bar e ristoranti che servono tapas e piatti locali',
          image: 'https://images.unsplash.com/photo-1616784567774-537991b1454a'
        },
        {
          name: 'Disfrutar',
          address: 'Carrer de Villarroel, 163, Barcelona',
          cuisine: 'Mediterranean, Avant-garde',
          price: 5,
          rating: 4.9,
          description: 'Ristorante stellato Michelin con cucina creativa e tecnica',
          image: 'https://images.unsplash.com/photo-1621916805571-901261b2c7e4'
        }
      ],
      'Berlin': [
        {
          name: 'BRLO Brwhouse',
          address: 'Schöneberger Str. 16, Berlin',
          cuisine: 'German, Brewery',
          price: 2,
          rating: 4.4,
          description: 'Birreria artigianale con ottimo cibo in container riciclati',
          image: 'https://images.unsplash.com/photo-1600095760934-9e913f921dc6'
        },
        {
          name: 'Markthalle Neun',
          address: 'Eisenbahnstraße 42/43, Berlin',
          cuisine: 'International, Market',
          price: 2,
          rating: 4.5,
          description: 'Mercato coperto con vari stand gastronomici e eventi',
          image: 'https://images.unsplash.com/photo-1615916130370-d115cf732473'
        },
        {
          name: 'Restaurant Tim Raue',
          address: 'Rudi-Dutschke-Straße 26, Berlin',
          cuisine: 'Asian, Fine Dining',
          price: 5,
          rating: 4.8,
          description: 'Ristorante stellato Michelin con influenze asiatiche',
          image: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d'
        }
      ]
    };

    const normalizedCity = Object.keys(cityRestaurants).find(
      key => key.toLowerCase() === city.toLowerCase()
    );

    return normalizedCity 
      ? cityRestaurants[normalizedCity] 
      : cityRestaurants['Amsterdam']; // Default fallback
  }
}

/**
 * Eventbrite API Service
 * Documentation: https://www.eventbrite.com/platform/api
 */
class EventbriteApi {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.EVENTBRITE_API_KEY || '';
  }

  async searchEvents(
    city: string,
    startDate: string,
    endDate: string,
    category: string = 'nightlife'
  ): Promise<Event[]> {
    if (!this.apiKey) {
      console.log('Eventbrite API key not configured, returning fallback data');
      return this.getFallbackEvents(city);
    }

    try {
      // Search for events
      const response = await axios.get(
        `https://www.eventbriteapi.com/v3/events/search/`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          },
          params: {
            'location.address': city,
            'start_date.range_start': startDate,
            'start_date.range_end': endDate,
            categories: this.getCategoryId(category),
            expand: 'venue,ticket_classes',
            sort_by: 'date'
          }
        }
      );

      return response.data.events.map((event: any) => ({
        id: event.id,
        name: event.name.text,
        city,
        venue: event.venue?.name || 'Venue TBA',
        date: event.start.local,
        category: category,
        price: event.ticket_classes?.[0]?.cost?.value || 0,
        currency: event.ticket_classes?.[0]?.cost?.currency || 'EUR',
        description: event.description.text || 'Exciting local event',
        images: [event.logo?.url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87']
      }));
    } catch (error) {
      console.error('Error searching events with Eventbrite API:', error);
      return this.getFallbackEvents(city);
    }
  }

  // Helper per ottenere l'ID della categoria
  private getCategoryId(category: string): string {
    const categories: { [key: string]: string } = {
      'nightlife': '103',
      'music': '103',
      'food': '110',
      'drinks': '110',
      'arts': '105',
      'entertainment': '104'
    };

    return categories[category.toLowerCase()] || '103';
  }

  // Dati di fallback per quando l'API non è disponibile
  private getFallbackEvents(city: string): Event[] {
    const cityData = this.getCityEventData(city);
    
    return cityData.map((event, index) => ({
      id: `event_${index + 1}`,
      name: event.name,
      city,
      venue: event.venue,
      date: event.date,
      category: event.category,
      price: event.price,
      currency: 'EUR',
      description: event.description,
      images: [event.image]
    }));
  }

  private getCityEventData(city: string): any[] {
    const cityEvents: { [key: string]: any[] } = {
      'Amsterdam': [
        {
          name: 'Amsterdam Dance Event',
          venue: 'Various Venues',
          date: '2025-06-15T22:00:00',
          category: 'Nightlife',
          price: 55.99,
          description: 'Il più grande festival di musica elettronica al mondo con DJ di fama mondiale',
          image: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1'
        },
        {
          name: 'Club Night at Shelter',
          venue: 'Shelter Amsterdam',
          date: '2025-06-16T23:30:00',
          category: 'Nightlife',
          price: 25.99,
          description: 'Notte di musica techno e house in uno dei club più rinomati di Amsterdam',
          image: 'https://images.unsplash.com/photo-1571156425562-365cb9b8ca86'
        },
        {
          name: 'Pub Crawl Red Light District',
          venue: 'Meeting Point Dam Square',
          date: '2025-06-17T21:00:00',
          category: 'Nightlife',
          price: 29.99,
          description: 'Tour dei migliori pub e bar nel famoso quartiere a luci rosse',
          image: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa'
        }
      ],
      'Prague': [
        {
          name: 'Karlovy Lazne Club Night',
          venue: 'Karlovy Lazne',
          date: '2025-06-15T22:30:00',
          category: 'Nightlife',
          price: 20.99,
          description: 'Serata nel più grande club di Praga con 5 piani di musica diversa',
          image: 'https://images.unsplash.com/photo-1571156425562-365cb9b8ca86'
        },
        {
          name: 'Prague Pub Crawl',
          venue: 'Old Town Square',
          date: '2025-06-16T21:00:00',
          category: 'Nightlife',
          price: 25.99,
          description: 'Tour guidato dei migliori pub della città con drink inclusi',
          image: 'https://images.unsplash.com/photo-1534157258714-42d7ف06a01f10'
        },
        {
          name: 'Jazz Night at Reduta',
          venue: 'Reduta Jazz Club',
          date: '2025-06-17T20:00:00',
          category: 'Music',
          price: 35.99,
          description: 'Serata di jazz dal vivo in uno dei locali storici di Praga',
          image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34'
        }
      ],
      'Budapest': [
        {
          name: 'Sparty at Széchenyi',
          venue: 'Széchenyi Thermal Bath',
          date: '2025-06-15T22:00:00',
          category: 'Nightlife',
          price: 45.99,
          description: 'Festa notturna nelle famose terme di Budapest con DJ e spettacoli di luci',
          image: 'https://images.unsplash.com/photo-1549475762-f55ae96177c0'
        },
        {
          name: 'Ruin Bar Tour',
          venue: 'Szimpla Kert',
          date: '2025-06-16T21:00:00',
          category: 'Nightlife',
          price: 29.99,
          description: 'Tour dei famosi ruin bar con guida locale e drink inclusi',
          image: 'https://images.unsplash.com/photo-1583165224510-7a3729d0dfa4'
        },
        {
          name: 'Danube River Party Cruise',
          venue: 'Dock 8A, Danube River',
          date: '2025-06-17T21:30:00',
          category: 'Nightlife',
          price: 39.99,
          description: 'Festa in barca sul Danubio con drink inclusi e vista panoramica della città illuminata',
          image: 'https://images.unsplash.com/photo-1541849546-216549ae216d'
        }
      ],
      'Barcelona': [
        {
          name: 'Beach Club Party at Opium',
          venue: 'Opium Barcelona',
          date: '2025-06-15T23:30:00',
          category: 'Nightlife',
          price: 35.99,
          description: 'Festa in uno dei migliori beach club di Barcellona con DJ internazionali',
          image: 'https://images.unsplash.com/photo-1571156425562-365cb9b8ca86'
        },
        {
          name: 'Boat Party Barcelona',
          venue: 'Port Olímpic',
          date: '2025-06-16T16:00:00',
          category: 'Nightlife',
          price: 69.99,
          description: 'Crociera festiva nel Mediterraneo con open bar e DJ set',
          image: 'https://images.unsplash.com/photo-1603568367331-62a0e08821a3'
        },
        {
          name: 'Flamenco & Tapas Night',
          venue: 'Palacio del Flamenco',
          date: '2025-06-17T20:00:00',
          category: 'Entertainment',
          price: 59.99,
          description: 'Spettacolo di flamenco autentico con cena e vino inclusi',
          image: 'https://images.unsplash.com/photo-1573676048035-9c2a72b92de0'
        }
      ],
      'Berlin': [
        {
          name: 'Berghain Sunday',
          venue: 'Berghain',
          date: '2025-06-15T00:00:00',
          category: 'Nightlife',
          price: 22.99,
          description: 'Serata nel leggendario club Berghain, famoso per la sua selettività e musica techno',
          image: 'https://images.unsplash.com/photo-1642201725271-087fa8377e83'
        },
        {
          name: 'Underground Club Tour',
          venue: 'Various Locations',
          date: '2025-06-16T22:00:00',
          category: 'Nightlife',
          price: 49.99,
          description: 'Tour dei club underground di Berlino con ingresso garantito',
          image: 'https://images.unsplash.com/photo-1571156425562-365cb9b8ca86'
        },
        {
          name: 'Techno History Tour',
          venue: 'Start: Alexanderplatz',
          date: '2025-06-17T18:00:00',
          category: 'Entertainment',
          price: 29.99,
          description: 'Tour guidato della storia della musica techno a Berlino con visite ai luoghi iconici',
          image: 'https://images.unsplash.com/photo-1501377404496-276baf8ccc0a'
        }
      ]
    };

    const normalizedCity = Object.keys(cityEvents).find(
      key => key.toLowerCase() === city.toLowerCase()
    );

    return normalizedCity 
      ? cityEvents[normalizedCity] 
      : cityEvents['Amsterdam']; // Default fallback
  }
}

// Servizio principale che integra tutte le API
export class TravelAPI {
  private amadeus: AmadeusApi;
  private googlePlaces: GooglePlacesApi;
  private eventbrite: EventbriteApi;

  constructor() {
    this.amadeus = new AmadeusApi();
    this.googlePlaces = new GooglePlacesApi();
    this.eventbrite = new EventbriteApi();
  }

  // Mappa dei codici città
  private getCityCode(city: string): string {
    const cityCodes: { [key: string]: string } = {
      'amsterdam': 'AMS',
      'prague': 'PRG',
      'budapest': 'BUD',
      'barcelona': 'BCN',
      'berlin': 'BER'
    };

    return cityCodes[city.toLowerCase()] || 'AMS';
  }

  async getFlights(
    origin: string = 'MXP', // Default Milano Malpensa
    destination: string, 
    departureDate: string, 
    returnDate: string, 
    adults: number = 1
  ): Promise<Flight[]> {
    const destCode = this.getCityCode(destination);
    return this.amadeus.searchFlights(origin, destCode, departureDate, returnDate, adults);
  }

  async getHotels(
    city: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number = 1
  ): Promise<Hotel[]> {
    const cityCode = this.getCityCode(city);
    return this.amadeus.searchHotels(cityCode, checkInDate, checkOutDate, adults);
  }

  async getActivities(city: string): Promise<Activity[]> {
    const cityCode = this.getCityCode(city);
    return this.amadeus.searchActivities(cityCode);
  }

  async getRestaurants(city: string, cuisine: string = ''): Promise<Restaurant[]> {
    let query = 'restaurants';
    if (cuisine) {
      query += ` ${cuisine}`;
    }
    return this.googlePlaces.searchRestaurants(city, query);
  }

  async getEvents(
    city: string,
    startDate: string,
    endDate: string,
    category: string = 'nightlife'
  ): Promise<Event[]> {
    return this.eventbrite.searchEvents(city, startDate, endDate, category);
  }

  // Metodo utility per convertire il formato delle date
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// Esporta un'istanza del servizio
export const travelAPI = new TravelAPI();