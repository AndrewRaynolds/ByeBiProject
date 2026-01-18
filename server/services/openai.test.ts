import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI before importing the module
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn()
        }
      };
    }
  };
});

// Mock external dependencies
vi.mock('./amadeus-flights', () => ({
  searchFlights: vi.fn()
}));

vi.mock('./amadeus-hotels', () => ({
  searchHotels: vi.fn()
}));

vi.mock('./cityMapping', () => ({
  cityToIata: vi.fn((city: string) => {
    const mapping: Record<string, string> = {
      'Rome': 'ROM',
      'Barcelona': 'BCN',
      'Milan': 'MIL',
      'Ibiza': 'IBZ',
      'Prague': 'PRG'
    };
    return mapping[city] || null;
  }),
  iataToCity: vi.fn((iata: string) => {
    const mapping: Record<string, string> = {
      'ROM': 'Rome',
      'BCN': 'Barcelona',
      'MIL': 'Milan',
      'IBZ': 'Ibiza',
      'PRG': 'Prague'
    };
    return mapping[iata] || null;
  })
}));

// Import after mocks are set up
import { executeToolCall } from './openai';

describe('executeToolCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('set_destination tool', () => {
    it('returns success with the destination city', async () => {
      const result = await executeToolCall('set_destination', { city: 'Barcelona' }, {});
      expect(result).toEqual({ success: true, destination: 'Barcelona' });
    });

    it('handles empty city gracefully', async () => {
      const result = await executeToolCall('set_destination', { city: '' }, {});
      expect(result).toEqual({ success: true, destination: '' });
    });
  });

  describe('set_origin tool', () => {
    it('returns success with the origin city', async () => {
      const result = await executeToolCall('set_origin', { city: 'Rome' }, {});
      expect(result).toEqual({ success: true, origin: 'Rome' });
    });

    it('handles different cities', async () => {
      const result = await executeToolCall('set_origin', { city: 'Milan' }, {});
      expect(result).toEqual({ success: true, origin: 'Milan' });
    });
  });

  describe('set_dates tool', () => {
    it('returns success with departure and return dates', async () => {
      const result = await executeToolCall('set_dates', {
        departure_date: '2025-06-15',
        return_date: '2025-06-20'
      }, {});
      expect(result).toEqual({
        success: true,
        departure_date: '2025-06-15',
        return_date: '2025-06-20'
      });
    });

    it('handles dates close together', async () => {
      const result = await executeToolCall('set_dates', {
        departure_date: '2025-07-01',
        return_date: '2025-07-02'
      }, {});
      expect(result).toEqual({
        success: true,
        departure_date: '2025-07-01',
        return_date: '2025-07-02'
      });
    });
  });

  describe('set_participants tool', () => {
    it('returns success with participant count', async () => {
      const result = await executeToolCall('set_participants', { count: 5 }, {});
      expect(result).toEqual({ success: true, participants: 5 });
    });

    it('handles single participant', async () => {
      const result = await executeToolCall('set_participants', { count: 1 }, {});
      expect(result).toEqual({ success: true, participants: 1 });
    });

    it('handles large groups', async () => {
      const result = await executeToolCall('set_participants', { count: 20 }, {});
      expect(result).toEqual({ success: true, participants: 20 });
    });
  });

  describe('search_flights tool', () => {
    it('calls Amadeus API with correct IATA codes and generates checkoutUrl', async () => {
      const { searchFlights } = await import('./amadeus-flights');
      vi.mocked(searchFlights).mockResolvedValue([
        {
          id: '1',
          price: 150,
          currency: 'EUR',
          outbound: [{
            departure: { iataCode: 'ROM', at: '2025-06-15T10:00:00' },
            arrival: { iataCode: 'BCN', at: '2025-06-15T12:30:00' },
            carrierCode: 'IB',
            carrierName: 'Iberia',
            flightNumber: '123',
            duration: 'PT2H30M'
          }],
          inbound: [{
            departure: { iataCode: 'BCN', at: '2025-06-20T18:00:00' },
            arrival: { iataCode: 'ROM', at: '2025-06-20T20:30:00' },
            carrierCode: 'IB',
            carrierName: 'Iberia',
            flightNumber: '456',
            duration: 'PT2H30M'
          }],
          airlines: ['Iberia'],
          totalDuration: 'PT2H30M',
          stops: 0
        }
      ]);

      const result = await executeToolCall('search_flights', {
        origin: 'Rome',
        destination: 'Barcelona',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 5
      }, {});

      expect(searchFlights).toHaveBeenCalledWith({
        originCode: 'ROM',
        destinationCode: 'BCN',
        departureDate: '2025-06-15',
        returnDate: '2025-06-20',
        adults: 5,
        currency: 'EUR'
      });

      expect(result.flights).toHaveLength(1);
      const flight = (result.flights as any[])[0];
      expect(flight.airline).toBe('Iberia');
      expect(flight.price).toBe(150);
      // Verify checkoutUrl is generated with correct format
      expect(flight.checkoutUrl).toContain('https://www.aviasales.com/search/ROM1506BCN2006');
      expect(flight.checkoutUrl).toContain('5'); // passengers
    });

    it('handles multiple flight results', async () => {
      const { searchFlights } = await import('./amadeus-flights');
      vi.mocked(searchFlights).mockResolvedValue([
        {
          id: '1', price: 150, currency: 'EUR',
          outbound: [{ departure: { iataCode: 'ROM', at: '2025-06-15T10:00:00' }, arrival: { iataCode: 'BCN', at: '2025-06-15T12:30:00' }, carrierCode: 'IB', flightNumber: '123', duration: 'PT2H30M' }],
          inbound: [{ departure: { iataCode: 'BCN', at: '2025-06-20T18:00:00' }, arrival: { iataCode: 'ROM', at: '2025-06-20T20:30:00' }, carrierCode: 'IB', flightNumber: '456', duration: 'PT2H30M' }],
          airlines: ['Iberia'], totalDuration: 'PT2H30M', stops: 0
        },
        {
          id: '2', price: 180, currency: 'EUR',
          outbound: [{ departure: { iataCode: 'ROM', at: '2025-06-15T14:00:00' }, arrival: { iataCode: 'BCN', at: '2025-06-15T16:30:00' }, carrierCode: 'VY', flightNumber: '789', duration: 'PT2H30M' }],
          inbound: [{ departure: { iataCode: 'BCN', at: '2025-06-20T20:00:00' }, arrival: { iataCode: 'ROM', at: '2025-06-20T22:30:00' }, carrierCode: 'VY', flightNumber: '012', duration: 'PT2H30M' }],
          airlines: ['Vueling'], totalDuration: 'PT2H30M', stops: 0
        },
        {
          id: '3', price: 200, currency: 'EUR',
          outbound: [{ departure: { iataCode: 'ROM', at: '2025-06-15T08:00:00' }, arrival: { iataCode: 'BCN', at: '2025-06-15T10:30:00' }, carrierCode: 'AZ', flightNumber: '345', duration: 'PT2H30M' }],
          inbound: [{ departure: { iataCode: 'BCN', at: '2025-06-20T16:00:00' }, arrival: { iataCode: 'ROM', at: '2025-06-20T18:30:00' }, carrierCode: 'AZ', flightNumber: '678', duration: 'PT2H30M' }],
          airlines: ['ITA Airways'], totalDuration: 'PT2H30M', stops: 0
        }
      ]);

      const result = await executeToolCall('search_flights', {
        origin: 'Rome',
        destination: 'Barcelona',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 2
      }, {});

      expect(result.flights).toHaveLength(3);
    });

    it('handles empty flight results', async () => {
      const { searchFlights } = await import('./amadeus-flights');
      vi.mocked(searchFlights).mockResolvedValue([]);

      const result = await executeToolCall('search_flights', {
        origin: 'Rome',
        destination: 'Barcelona',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 2
      }, {});

      expect(result.flights).toEqual([]);
    });

    it('handles API errors gracefully', async () => {
      const { searchFlights } = await import('./amadeus-flights');
      vi.mocked(searchFlights).mockRejectedValue(new Error('API Error'));

      const result = await executeToolCall('search_flights', {
        origin: 'Rome',
        destination: 'Barcelona',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 2
      }, {});

      expect(result.error).toBeDefined();
      expect(result.flights).toEqual([]);
    });

    it('uses city substring for unknown cities', async () => {
      const { searchFlights } = await import('./amadeus-flights');
      vi.mocked(searchFlights).mockResolvedValue([]);

      await executeToolCall('search_flights', {
        origin: 'UnknownCity',
        destination: 'AnotherCity',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 2
      }, {});

      expect(searchFlights).toHaveBeenCalledWith({
        originCode: 'UNK',
        destinationCode: 'ANO',
        departureDate: '2025-06-15',
        returnDate: '2025-06-20',
        adults: 2,
        currency: 'EUR'
      });
    });

    it('extracts IATA code from parentheses format like "Fiumicino (FCO)"', async () => {
      const { searchFlights } = await import('./amadeus-flights');
      vi.mocked(searchFlights).mockResolvedValue([]);

      await executeToolCall('search_flights', {
        origin: 'Fiumicino (FCO)',
        destination: 'Barcelona (BCN)',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 3
      }, {});

      expect(searchFlights).toHaveBeenCalledWith({
        originCode: 'FCO',
        destinationCode: 'BCN',
        departureDate: '2025-06-15',
        returnDate: '2025-06-20',
        adults: 3,
        currency: 'EUR'
      });
    });
  });

  describe('search_hotels tool', () => {
    it('calls amadeus API with correct parameters', async () => {
      const { searchHotels } = await import('./amadeus-hotels');
      vi.mocked(searchHotels).mockResolvedValue([
        {
          hotelId: 'H1',
          name: 'Test Hotel',
          stars: '4',
          priceTotal: 150,
          currency: 'EUR',
          offerId: 'OFF1',
          bookingFlow: 'IN_APP',
          paymentPolicy: 'PAY_AT_HOTEL',
          checkInDate: '2025-06-15',
          checkOutDate: '2025-06-20',
          roomDescription: 'Standard Room'
        }
      ]);

      const result = await executeToolCall('search_hotels', {
        destination: 'Barcelona',
        check_in_date: '2025-06-15',
        check_out_date: '2025-06-20',
        guests: 2
      }, {});

      expect(searchHotels).toHaveBeenCalledWith({
        cityCode: 'BCN',
        checkInDate: '2025-06-15',
        checkOutDate: '2025-06-20',
        adults: 2,
        currency: 'EUR'
      });

      expect(result.hotels).toHaveLength(1);
      expect((result.hotels as any[])[0].name).toBe('Test Hotel');
      expect((result.hotels as any[])[0].priceTotal).toBe(150);
    });

    it('handles multiple hotel results and limits to 5', async () => {
      const { searchHotels } = await import('./amadeus-hotels');
      const mockHotels = Array.from({ length: 10 }, (_, i) => ({
        hotelId: `H${i + 1}`,
        name: `Hotel ${i + 1}`,
        stars: '3',
        priceTotal: 100 + i * 10,
        currency: 'EUR',
        offerId: `OFF${i + 1}`,
        bookingFlow: 'IN_APP' as const,
        paymentPolicy: 'PAY_NOW',
        checkInDate: '2025-06-15',
        checkOutDate: '2025-06-20'
      }));
      vi.mocked(searchHotels).mockResolvedValue(mockHotels);

      const result = await executeToolCall('search_hotels', {
        destination: 'Barcelona',
        check_in_date: '2025-06-15',
        check_out_date: '2025-06-20',
        guests: 4
      }, {});

      expect(result.hotels).toHaveLength(5);
    });

    it('handles empty hotel results', async () => {
      const { searchHotels } = await import('./amadeus-hotels');
      vi.mocked(searchHotels).mockResolvedValue([]);

      const result = await executeToolCall('search_hotels', {
        destination: 'Barcelona',
        check_in_date: '2025-06-15',
        check_out_date: '2025-06-20',
        guests: 2
      }, {});

      expect(result.hotels).toEqual([]);
    });

    it('handles API errors gracefully', async () => {
      const { searchHotels } = await import('./amadeus-hotels');
      vi.mocked(searchHotels).mockRejectedValue(new Error('API Error'));

      const result = await executeToolCall('search_hotels', {
        destination: 'Barcelona',
        check_in_date: '2025-06-15',
        check_out_date: '2025-06-20',
        guests: 2
      }, {});

      expect(result.error).toBeDefined();
      expect(result.hotels).toEqual([]);
    });

    it('uses city substring for unknown cities', async () => {
      const { searchHotels } = await import('./amadeus-hotels');
      vi.mocked(searchHotels).mockResolvedValue([]);

      await executeToolCall('search_hotels', {
        destination: 'UnknownCity',
        check_in_date: '2025-06-15',
        check_out_date: '2025-06-20',
        guests: 2
      }, {});

      expect(searchHotels).toHaveBeenCalledWith({
        cityCode: 'UNK',
        checkInDate: '2025-06-15',
        checkOutDate: '2025-06-20',
        adults: 2,
        currency: 'EUR'
      });
    });

    it('defaults to 2 guests when guests is not a number', async () => {
      const { searchHotels } = await import('./amadeus-hotels');
      vi.mocked(searchHotels).mockResolvedValue([]);

      await executeToolCall('search_hotels', {
        destination: 'Barcelona',
        check_in_date: '2025-06-15',
        check_out_date: '2025-06-20',
        guests: null
      }, {});

      expect(searchHotels).toHaveBeenCalledWith({
        cityCode: 'BCN',
        checkInDate: '2025-06-15',
        checkOutDate: '2025-06-20',
        adults: 2,
        currency: 'EUR'
      });
    });
  });

  describe('select_flight tool', () => {
    it('returns success with selected flight number', async () => {
      const result = await executeToolCall('select_flight', { flight_number: 2 }, {});
      expect(result).toEqual({ success: true, selected_flight: 2 });
    });

    it('handles first flight selection', async () => {
      const result = await executeToolCall('select_flight', { flight_number: 1 }, {});
      expect(result).toEqual({ success: true, selected_flight: 1 });
    });
  });

  describe('unlock_checkout tool', () => {
    it('returns success with checkout unlocked', async () => {
      const result = await executeToolCall('unlock_checkout', {}, {});
      expect(result).toEqual({ success: true, checkout_unlocked: true });
    });
  });

  describe('unknown tool', () => {
    it('returns error for unknown tool name', async () => {
      const result = await executeToolCall('unknown_tool', {}, {});
      expect(result).toEqual({ error: 'Unknown tool: unknown_tool' });
    });

    it('returns error for empty tool name', async () => {
      const result = await executeToolCall('', {}, {});
      expect(result).toEqual({ error: 'Unknown tool: ' });
    });
  });
});
