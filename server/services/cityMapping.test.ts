import { describe, it, expect } from 'vitest';
import {
  cityToIata,
  iataToCity,
  getAllCities,
  getAllIataCodes,
  CITY_TO_IATA,
  IATA_TO_CITY,
} from './cityMapping';

describe('cityToIata', () => {
  describe('Italian city names', () => {
    it('maps Italian city names to IATA codes', () => {
      expect(cityToIata('roma')).toBe('ROM');
      expect(cityToIata('milano')).toBe('MIL');
      expect(cityToIata('napoli')).toBe('NAP');
      expect(cityToIata('venezia')).toBe('VCE');
      expect(cityToIata('firenze')).toBe('FLR');
      expect(cityToIata('torino')).toBe('TRN');
      expect(cityToIata('bologna')).toBe('BLQ');
    });
  });

  describe('English city names', () => {
    it('maps English city names to IATA codes', () => {
      expect(cityToIata('rome')).toBe('ROM');
      expect(cityToIata('milan')).toBe('MIL');
      expect(cityToIata('naples')).toBe('NAP');
      expect(cityToIata('venice')).toBe('VCE');
      expect(cityToIata('florence')).toBe('FLR');
      expect(cityToIata('turin')).toBe('TRN');
    });
  });

  describe('European cities', () => {
    it('maps major European cities', () => {
      expect(cityToIata('parigi')).toBe('PAR');
      expect(cityToIata('paris')).toBe('PAR');
      expect(cityToIata('londra')).toBe('LON');
      expect(cityToIata('london')).toBe('LON');
      expect(cityToIata('berlino')).toBe('BER');
      expect(cityToIata('berlin')).toBe('BER');
      expect(cityToIata('madrid')).toBe('MAD');
      expect(cityToIata('barcellona')).toBe('BCN');
      expect(cityToIata('barcelona')).toBe('BCN');
      expect(cityToIata('amsterdam')).toBe('AMS');
      expect(cityToIata('praga')).toBe('PRG');
      expect(cityToIata('prague')).toBe('PRG');
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase input', () => {
      expect(cityToIata('ROMA')).toBe('ROM');
      expect(cityToIata('MILAN')).toBe('MIL');
      expect(cityToIata('PARIS')).toBe('PAR');
    });

    it('handles mixed case input', () => {
      expect(cityToIata('Roma')).toBe('ROM');
      expect(cityToIata('MiLaN')).toBe('MIL');
      expect(cityToIata('PaRiS')).toBe('PAR');
    });
  });

  describe('whitespace handling', () => {
    it('trims whitespace from input', () => {
      expect(cityToIata('  roma  ')).toBe('ROM');
      expect(cityToIata('  paris ')).toBe('PAR');
      expect(cityToIata('london  ')).toBe('LON');
    });
  });

  describe('null/undefined handling', () => {
    it('returns null for null/undefined input', () => {
      expect(cityToIata(null)).toBeNull();
      expect(cityToIata(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(cityToIata('')).toBeNull();
    });

    it('returns null for unknown cities', () => {
      expect(cityToIata('unknowncity')).toBeNull();
      expect(cityToIata('xyz')).toBeNull();
    });
  });

  describe('airport-specific codes', () => {
    it('maps specific airport names', () => {
      expect(cityToIata('fiumicino')).toBe('FCO');
      expect(cityToIata('ciampino')).toBe('CIA');
      expect(cityToIata('malpensa')).toBe('MXP');
      expect(cityToIata('linate')).toBe('LIN');
      expect(cityToIata('bergamo')).toBe('BGY');
      expect(cityToIata('orio al serio')).toBe('BGY');
    });
  });
});

describe('iataToCity', () => {
  describe('Italian cities', () => {
    it('maps IATA codes to city names', () => {
      expect(iataToCity('ROM')).toBe('Roma');
      expect(iataToCity('MIL')).toBe('Milano');
      expect(iataToCity('NAP')).toBe('Napoli');
      expect(iataToCity('VCE')).toBe('Venezia');
      expect(iataToCity('FLR')).toBe('Firenze');
    });
  });

  describe('European cities', () => {
    it('maps IATA codes for European cities', () => {
      expect(iataToCity('PAR')).toBe('Paris');
      expect(iataToCity('LON')).toBe('London');
      expect(iataToCity('BER')).toBe('Berlin');
      expect(iataToCity('MAD')).toBe('Madrid');
      expect(iataToCity('BCN')).toBe('Barcelona');
      expect(iataToCity('AMS')).toBe('Amsterdam');
    });
  });

  describe('case handling', () => {
    it('normalizes lowercase input to uppercase', () => {
      expect(iataToCity('rom')).toBe('Roma');
      expect(iataToCity('par')).toBe('Paris');
      expect(iataToCity('lon')).toBe('London');
    });

    it('handles mixed case input', () => {
      expect(iataToCity('RoM')).toBe('Roma');
      expect(iataToCity('pAr')).toBe('Paris');
    });
  });

  describe('null/undefined handling', () => {
    it('returns "Unknown" for null/undefined input', () => {
      expect(iataToCity(null)).toBe('Unknown');
      expect(iataToCity(undefined)).toBe('Unknown');
    });

    it('returns the code itself for unknown IATA codes', () => {
      expect(iataToCity('XYZ')).toBe('XYZ');
      expect(iataToCity('ABC')).toBe('ABC');
    });
  });
});

describe('getAllCities', () => {
  it('returns an array of city names', () => {
    const cities = getAllCities();
    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
  });

  it('returns sorted city names', () => {
    const cities = getAllCities();
    const sortedCities = [...cities].sort();
    expect(cities).toEqual(sortedCities);
  });

  it('contains major cities', () => {
    const cities = getAllCities();
    expect(cities).toContain('Roma');
    expect(cities).toContain('Milano');
    expect(cities).toContain('Paris');
    expect(cities).toContain('London');
    expect(cities).toContain('Berlin');
  });

  it('returns unique values only', () => {
    const cities = getAllCities();
    const uniqueCities = [...new Set(cities)];
    expect(cities.length).toBe(uniqueCities.length);
  });
});

describe('getAllIataCodes', () => {
  it('returns an array of IATA codes', () => {
    const codes = getAllIataCodes();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(0);
  });

  it('contains major airport codes', () => {
    const codes = getAllIataCodes();
    expect(codes).toContain('ROM');
    expect(codes).toContain('MIL');
    expect(codes).toContain('PAR');
    expect(codes).toContain('LON');
    expect(codes).toContain('BER');
    expect(codes).toContain('BCN');
    expect(codes).toContain('AMS');
  });

  it('returns unique codes only', () => {
    const codes = getAllIataCodes();
    const uniqueCodes = [...new Set(codes)];
    expect(codes.length).toBe(uniqueCodes.length);
  });

  it('all codes are 3 characters', () => {
    const codes = getAllIataCodes();
    codes.forEach(code => {
      expect(code.length).toBe(3);
    });
  });
});

describe('mapping consistency', () => {
  it('every IATA code in IATA_TO_CITY exists in CITY_TO_IATA values', () => {
    const iataCodes = Object.keys(IATA_TO_CITY);
    const cityToIataValues = Object.values(CITY_TO_IATA);

    iataCodes.forEach(code => {
      expect(cityToIataValues).toContain(code);
    });
  });

  it('getAllCities returns values from IATA_TO_CITY', () => {
    const cities = getAllCities();
    const iataToValues = Object.values(IATA_TO_CITY);

    cities.forEach(city => {
      expect(iataToValues).toContain(city);
    });
  });

  it('getAllIataCodes returns keys from IATA_TO_CITY', () => {
    const codes = getAllIataCodes();
    const iataToKeys = Object.keys(IATA_TO_CITY);

    expect(codes.length).toBe(iataToKeys.length);
    codes.forEach(code => {
      expect(iataToKeys).toContain(code);
    });
  });
});
