import axios from 'axios';

interface BookingHotelSearch {
  dest_id: string;
  checkin_date: string;
  checkout_date: string;
  adults_number: number;
  room_number: number;
  units: string;
  locale: string;
  currency: string;
}

interface BookingHotelResult {
  hotel_id: string;
  hotel_name: string;
  address: string;
  city: string;
  country_trans: string;
  min_total_price: number;
  currency: string;
  max_photo_url: string;
  review_score: number;
  review_score_word: string;
  review_nr: number;
  latitude: number;
  longitude: number;
  accommodation_type_name: string;
  class: number;
  urgency_message?: string;
  hotel_facilities: string[];
  url: string;
}

interface BookingDestination {
  dest_id: string;
  dest_type: string;
  label: string;
  name: string;
  city_name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export class BookingAPI {
  private apiKey: string;
  private baseUrl: string = 'https://booking-com.p.rapidapi.com/v1';

  constructor() {
    this.apiKey = process.env.BOOKING_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('BOOKING_API_KEY is required');
    }
  }

  private getHeaders() {
    return {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
      'Content-Type': 'application/json',
    };
  }

  // Cerca destinazioni per nome città
  async searchDestinations(query: string): Promise<BookingDestination[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/hotels/locations`, {
        headers: this.getHeaders(),
        params: {
          name: query,
          locale: 'en-gb',
        },
        timeout: 10000,
      });

      return response.data || [];
    } catch (error: any) {
      console.error('Booking destinations search error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Booking API key. Please check your BOOKING_API_KEY');
      }
      if (error.response?.status === 403) {
        throw new Error('Booking API access forbidden. Check your API permissions');
      }
      if (error.response?.status === 429) {
        throw new Error('Booking API rate limit exceeded. Please try again later');
      }
      
      throw new Error(`Booking API error: ${error.message}`);
    }
  }

  // Cerca hotel in una destinazione
  async searchHotels(params: BookingHotelSearch): Promise<BookingHotelResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/hotels/search`, {
        headers: this.getHeaders(),
        params: {
          dest_id: params.dest_id,
          order_by: 'popularity',
          filter_by_currency: params.currency,
          checkin_date: params.checkin_date,
          checkout_date: params.checkout_date,
          adults_number: params.adults_number,
          room_number: params.room_number,
          units: params.units,
          locale: params.locale,
          include_adjacency: true,
          page_number: 0,
          categories_filter_ids: 'class::2,class::3,class::4,class::5',
        },
        timeout: 15000,
      });

      if (!response.data.result || response.data.result.length === 0) {
        console.log('No hotels found from API, check search parameters');
        return [];
      }

      return response.data.result.map((hotel: any) => ({
        hotel_id: hotel.hotel_id,
        hotel_name: hotel.hotel_name,
        address: hotel.address,
        city: hotel.city,
        country_trans: hotel.country_trans,
        min_total_price: hotel.min_total_price,
        currency: hotel.currency,
        max_photo_url: hotel.max_photo_url,
        review_score: hotel.review_score,
        review_score_word: hotel.review_score_word,
        review_nr: hotel.review_nr,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        accommodation_type_name: hotel.accommodation_type_name,
        class: hotel.class,
        urgency_message: hotel.urgency_message,
        hotel_facilities: hotel.hotel_facilities || [],
        url: hotel.url,
      }));
    } catch (error: any) {
      console.error('Booking hotel search error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Booking API key. Please check your BOOKING_API_KEY');
      }
      if (error.response?.status === 403) {
        throw new Error('Booking API access forbidden. Check your API permissions');
      }
      if (error.response?.status === 429) {
        throw new Error('Booking API rate limit exceeded. Please try again later');
      }
      
      throw new Error(`Booking API error: ${error.message}`);
    }
  }

  // Test connessione API
  async testConnection(): Promise<boolean> {
    try {
      await this.searchDestinations('Rome');
      return true;
    } catch (error) {
      console.error('Booking API connection test failed:', error);
      return false;
    }
  }
}

export const bookingAPI = new BookingAPI();