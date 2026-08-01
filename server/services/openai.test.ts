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
  }),
  resolveIataCode: vi.fn((value: string) => {
    const parenthesized = value.match(/\(([A-Z]{3})\)/i)?.[1];
    if (parenthesized) return parenthesized.toUpperCase();
    if (/^[A-Z]{3}$/i.test(value.trim())) return value.trim().toUpperCase();
    const mapping: Record<string, string> = {
      'Rome': 'ROM',
      'Barcelona': 'BCN',
      'Milan': 'MIL',
      'Ibiza': 'IBZ',
      'Prague': 'PRG'
    };
    return mapping[value] || null;
  }),
}));

// Import after mocks are set up
import { detectUserLanguage, enforceSelectedDestination, executeToolCall } from './openai';

describe('detectUserLanguage', () => {
  it.each([
    ['Voglio partire da Roma per sei persone', 'it'],
    ['Quiero salir de Madrid para seis personas', 'es'],
    ['I want to leave from London for six people', 'en'],
  ])('detects the current message language', (message, expected) => {
    expect(detectUserLanguage(message)).toBe(expected);
  });
});

describe('enforceSelectedDestination', () => {
  it('keeps the destination selected by the user instead of a model replacement', () => {
    expect(enforceSelectedDestination({
      name: 'search_flights',
      arguments: { origin: 'Milan', destination: 'Amsterdam' },
    }, { selectedDestination: 'Rome' })).toEqual({
      name: 'search_flights',
      arguments: { origin: 'Milan', destination: 'Rome' },
    });
  });
});

describe('executeToolCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('removed legacy tools', () => {
    it.each(['set_destination', 'set_origin', 'set_dates', 'set_participants'])(
      'rejects the obsolete %s tool',
      async (name) => {
        await expect(executeToolCall(name, {}, {})).resolves.toEqual({
          error: `Unknown tool: ${name}`,
        });
      },
    );
  });

  describe('search_flights tool', () => {
    it('uses the destination already selected in the chat context', async () => {
      const result = await executeToolCall('search_flights', {
        origin: 'Milan',
        destination: 'Amsterdam',
        departure_date: '2026-09-10',
        return_date: '2026-09-12',
        passengers: 6,
      }, { selectedDestination: 'Rome' });

      expect(result).toMatchObject({
        checkoutReady: true,
        origin: 'MIL',
        destination: 'ROM',
      });
      expect(result.checkoutUrl).toContain('MIL1009ROM12096');
    });

    it('generates a checkout URL with mapped IATA codes', async () => {
      const result = await executeToolCall('search_flights', {
        origin: 'Rome',
        destination: 'Barcelona',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 5
      }, {});

      expect(result).toMatchObject({
        checkoutReady: true,
        origin: 'ROM',
        destination: 'BCN',
      });
      expect(result.checkoutUrl).toBe(
        'https://www.aviasales.com/search/ROM1506BCN20065?marker=byebi',
      );
    });

    it('rejects unknown cities instead of inventing IATA codes', async () => {
      const result = await executeToolCall('search_flights', {
        origin: 'UnknownCity',
        destination: 'AnotherCity',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 2
      }, {});

      expect(result).toEqual({ error: 'Unsupported origin or destination' });
    });

    it('extracts IATA code from parentheses format like "Fiumicino (FCO)"', async () => {
      const result = await executeToolCall('search_flights', {
        origin: 'Fiumicino (FCO)',
        destination: 'Barcelona (BCN)',
        departure_date: '2025-06-15',
        return_date: '2025-06-20',
        passengers: 3
      }, {});

      expect(result).toMatchObject({
        origin: 'FCO',
        destination: 'BCN',
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
