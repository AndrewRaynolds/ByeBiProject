import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';

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
import { detectUserLanguage, enforceSelectedDestination, executeToolCall, getDeterministicPlannerFollowUp } from './openai';
import { createPlannerDraft } from '@shared/plannerSchemas';

describe('detectUserLanguage', () => {
  it.each([
    ['Voglio partire da Roma per sei persone', 'it'],
    ['Quiero salir de Madrid para seis personas', 'es'],
    ['I want to leave from London for six people', 'en'],
  ])('detects the current message language', (message, expected) => {
    expect(detectUserLanguage(message)).toBe(expected);
  });
});

describe('deterministic planner follow-up', () => {
  it.each([
    ['Voglio organizzare il viaggio', 'Quali sono le date di partenza e ritorno?'],
    ['I want to organize the trip', 'What are your departure and return dates?'],
    ['Quiero organizar el viaje', '¿Cuáles son las fechas de salida y regreso?'],
  ])('asks for missing dates in the user language', (message, expected) => {
    const planner = createPlannerDraft({
      brand: 'byebro', origin: 'Rome', destination: 'Ibiza', participants: 6,
      budgetPerPerson: 700, preferenceArchetype: 'nightlife',
    });
    expect(getDeterministicPlannerFollowUp(planner, message)).toBe(expected);
    expect(planner.status).toBe('draft');
  });

  it('asks for budget before preferences when both remain missing', () => {
    const planner = createPlannerDraft({
      brand: 'byebro', origin: 'Rome', destination: 'Ibiza', startDate: '2099-10-10',
      endDate: '2099-10-13', participants: 6,
    });
    expect(getDeterministicPlannerFollowUp(planner, 'Siamo pronti')).toBe('Qual è il budget per persona?');
  });

  it('asks for preferences when they are the last missing detail', () => {
    const planner = createPlannerDraft({
      brand: 'byebride', origin: 'Rome', destination: 'Ibiza', startDate: '2099-10-10',
      endDate: '2099-10-13', participants: 6, budgetPerPerson: 700,
    });
    expect(getDeterministicPlannerFollowUp(planner, 'Quiero seguir')).toBe('¿Qué tipo de experiencia o actividades prefiere el grupo?');
  });

  it('announces review only for a complete validated planner', () => {
    const planner = createPlannerDraft({
      brand: 'byebro', origin: 'Rome', destination: 'Ibiza', startDate: '2099-10-10',
      endDate: '2099-10-13', participants: 6, budgetPerPerson: 700, interests: ['food'],
    });
    expect(getDeterministicPlannerFollowUp(planner, 'All done')).toMatch(/travel brief is ready/i);
    expect(planner.status).toBe('review-ready');
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
    vi.stubEnv('AVIASALES_PARTNER_ID', 'byebi');
  });

  afterEach(() => vi.unstubAllEnvs());

  describe('update_planner tool', () => {
    it('returns a review-ready planner only when every required detail is explicit', async () => {
      const result = await executeToolCall('update_planner', {
        origin: 'Rome', destination: 'Ibiza', startDate: '2099-10-10', endDate: '2099-10-13',
        participants: 6, budgetPerPerson: 700, preferenceArchetype: 'nightlife', interests: ['music'],
      }, { partyType: 'bachelor', planner: createPlannerDraft({ brand: 'byebro' }) });
      expect(result).toMatchObject({ planner: { status: 'review-ready', budgetPerPerson: 700 }, missingFields: [] });
      expect(result).not.toHaveProperty('checkoutUrl');
    });

    it('preserves an incomplete draft and reports only missing fields', async () => {
      const result = await executeToolCall('update_planner', {
        origin: null, destination: 'Ibiza', startDate: null, endDate: null,
        participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null,
      }, { partyType: 'bachelorette', planner: createPlannerDraft({ brand: 'byebride' }) });
      expect(result).toMatchObject({ planner: { status: 'draft', budgetPerPerson: null, preferences: null } });
      expect(result.missingFields).toEqual(expect.arrayContaining(['origin', 'budgetPerPerson', 'preferences']));
    });

    it('keeps the planner brand authoritative over a mismatched legacy context value', async () => {
      const result = await executeToolCall('update_planner', {
        origin: null, destination: 'Ibiza', startDate: null, endDate: null,
        participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null,
      }, { partyType: 'bachelor', planner: createPlannerDraft({ brand: 'byebride' }) });
      expect(result).toMatchObject({ planner: { brand: 'byebride', partyType: 'bachelorette' } });
    });
  });

  describe('removed legacy tools', () => {
    it.each(['set_destination', 'set_origin', 'set_dates', 'set_participants', 'select_flight', 'unlock_checkout'])(
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

    it('keeps the real group size while limiting Aviasales checkout to 9 adults', async () => {
      const result = await executeToolCall('search_flights', {
        origin: 'Rome',
        destination: 'Barcelona',
        departure_date: '2026-10-10',
        return_date: '2026-10-13',
        passengers: 12,
      }, {});

      expect(result).toMatchObject({
        checkoutReady: true,
        groupSize: 12,
        checkoutAdults: 9,
        groupBookingRequired: true,
      });
      expect(result.checkoutUrl).toBe(
        'https://www.aviasales.com/search/ROM1010BCN13109?marker=byebi',
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
