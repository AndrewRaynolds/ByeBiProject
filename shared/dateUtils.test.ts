import { describe, it, expect } from 'vitest';
import {
  normalizeTripDate,
  normalizeFutureTripDate,
  calculateTripDays,
  isValidDateRange,
  formatDateIT,
  extractDateOnly,
  formatFlightDateTime,
  formatDateRangeIT,
} from './dateUtils';

describe('normalizeTripDate', () => {
  describe('ISO format (YYYY-MM-DD)', () => {
    it('returns valid ISO dates unchanged', () => {
      expect(normalizeTripDate('2026-01-20')).toBe('2026-01-20');
      expect(normalizeTripDate('2026-12-31')).toBe('2026-12-31');
    });

    it('rejects invalid ISO dates', () => {
      expect(normalizeTripDate('2026-13-01')).toBeNull(); // invalid month
      expect(normalizeTripDate('2026-01-32')).toBeNull(); // invalid day
      expect(normalizeTripDate('2026-02-30')).toBeNull(); // Feb 30 doesn't exist
    });

    it('handles leap years correctly', () => {
      expect(normalizeTripDate('2024-02-29')).toBe('2024-02-29'); // leap year
      expect(normalizeTripDate('2025-02-29')).toBeNull(); // not a leap year
      expect(normalizeTripDate('2028-02-29')).toBe('2028-02-29'); // leap year
    });
  });

  describe('European format (DD/MM/YYYY or DD-MM-YYYY)', () => {
    it('converts DD/MM/YYYY to ISO format', () => {
      expect(normalizeTripDate('20/01/2026')).toBe('2026-01-20');
      expect(normalizeTripDate('31/12/2026')).toBe('2026-12-31');
      expect(normalizeTripDate('1/1/2026')).toBe('2026-01-01');
    });

    it('converts DD-MM-YYYY to ISO format', () => {
      expect(normalizeTripDate('20-01-2026')).toBe('2026-01-20');
      expect(normalizeTripDate('31-12-2026')).toBe('2026-12-31');
    });

    it('rejects invalid European format dates', () => {
      expect(normalizeTripDate('32/01/2026')).toBeNull(); // invalid day
      expect(normalizeTripDate('01/13/2026')).toBeNull(); // invalid month
      expect(normalizeTripDate('29/02/2025')).toBeNull(); // not a leap year
    });
  });

  describe('short format (DD/MM or DD-MM)', () => {
    it('infers year for short format dates', () => {
      const result = normalizeTripDate('15/06');
      expect(result).toMatch(/^\d{4}-06-15$/);
    });

    it('converts DD-MM format', () => {
      const result = normalizeTripDate('15-06');
      expect(result).toMatch(/^\d{4}-06-15$/);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty/invalid input', () => {
      expect(normalizeTripDate('')).toBeNull();
      expect(normalizeTripDate('invalid')).toBeNull();
      expect(normalizeTripDate('abc/def/ghij')).toBeNull();
    });

    it('handles whitespace', () => {
      expect(normalizeTripDate('  2026-01-20  ')).toBe('2026-01-20');
      expect(normalizeTripDate('  20/01/2026  ')).toBe('2026-01-20');
    });

    it('rejects years outside valid range', () => {
      expect(normalizeTripDate('2023-01-20')).toBeNull(); // too old
      expect(normalizeTripDate('2101-01-20')).toBeNull(); // too far future
    });
  });
});

describe('normalizeFutureTripDate', () => {
  it('returns future dates unchanged', () => {
    expect(normalizeFutureTripDate('2099-12-31')).toBe('2099-12-31');
  });

  it('returns null for invalid dates', () => {
    expect(normalizeFutureTripDate('invalid')).toBeNull();
    expect(normalizeFutureTripDate('')).toBeNull();
  });
});

describe('calculateTripDays', () => {
  it('calculates days between dates correctly', () => {
    expect(calculateTripDays('2026-01-20', '2026-01-22')).toBe(2);
    expect(calculateTripDays('2026-01-01', '2026-01-31')).toBe(30);
    expect(calculateTripDays('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('handles month boundaries', () => {
    expect(calculateTripDays('2026-01-31', '2026-02-01')).toBe(1);
    expect(calculateTripDays('2026-03-31', '2026-04-02')).toBe(2);
  });

  it('handles year boundaries', () => {
    expect(calculateTripDays('2026-12-31', '2027-01-01')).toBe(1);
    expect(calculateTripDays('2026-12-25', '2027-01-05')).toBe(11);
  });

  it('handles leap years', () => {
    expect(calculateTripDays('2024-02-28', '2024-03-01')).toBe(2); // leap year
    expect(calculateTripDays('2025-02-28', '2025-03-01')).toBe(1); // not a leap year
  });

  it('returns 0 for invalid dates', () => {
    expect(calculateTripDays('invalid', '2026-01-22')).toBe(0);
    expect(calculateTripDays('2026-01-20', 'invalid')).toBe(0);
  });

  it('handles negative durations (returns 0)', () => {
    expect(calculateTripDays('2026-01-22', '2026-01-20')).toBe(0);
  });
});

describe('isValidDateRange', () => {
  it('returns true when end date is after start date', () => {
    expect(isValidDateRange('2026-01-20', '2026-01-22')).toBe(true);
    expect(isValidDateRange('2026-01-01', '2026-12-31')).toBe(true);
  });

  it('returns false when end date is before or equal to start date', () => {
    expect(isValidDateRange('2026-01-22', '2026-01-20')).toBe(false);
    expect(isValidDateRange('2026-01-20', '2026-01-20')).toBe(false);
  });

  it('returns false for invalid dates', () => {
    expect(isValidDateRange('invalid', '2026-01-22')).toBe(false);
    expect(isValidDateRange('2026-01-20', 'invalid')).toBe(false);
  });
});

describe('formatDateIT', () => {
  it('converts ISO to Italian format', () => {
    expect(formatDateIT('2026-01-20')).toBe('20/01/2026');
    expect(formatDateIT('2026-12-31')).toBe('31/12/2026');
    expect(formatDateIT('2026-05-05')).toBe('05/05/2026');
  });

  it('returns input unchanged for invalid format', () => {
    expect(formatDateIT('invalid')).toBe('invalid');
    expect(formatDateIT('20/01/2026')).toBe('20/01/2026'); // already Italian format
  });
});

describe('extractDateOnly', () => {
  it('extracts date from ISO datetime strings', () => {
    expect(extractDateOnly('2026-01-20T10:30:00')).toBe('2026-01-20');
    expect(extractDateOnly('2026-01-20T10:30:00+01:00')).toBe('2026-01-20');
    expect(extractDateOnly('2026-01-20T00:00:00Z')).toBe('2026-01-20');
  });

  it('handles date-only strings', () => {
    expect(extractDateOnly('2026-01-20')).toBe('2026-01-20');
  });

  it('returns empty string for empty input', () => {
    expect(extractDateOnly('')).toBe('');
  });
});

describe('formatFlightDateTime', () => {
  it('formats ISO datetime for display', () => {
    expect(formatFlightDateTime('2026-01-20T10:30:00')).toBe('20/01/2026 10:30');
    expect(formatFlightDateTime('2026-01-20T10:30:00+01:00')).toBe('20/01/2026 10:30');
    expect(formatFlightDateTime('2026-12-31T23:59:00')).toBe('31/12/2026 23:59');
  });

  it('returns empty string for empty input', () => {
    expect(formatFlightDateTime('')).toBe('');
  });
});

describe('formatDateRangeIT', () => {
  it('formats date range within same month', () => {
    expect(formatDateRangeIT('2026-01-10', '2026-01-15')).toBe('10-15 Gennaio 2026');
    expect(formatDateRangeIT('2026-06-01', '2026-06-30')).toBe('1-30 Giugno 2026');
  });

  it('formats date range across different months', () => {
    expect(formatDateRangeIT('2026-01-28', '2026-02-05')).toBe('28 Gennaio - 5 Febbraio 2026');
    expect(formatDateRangeIT('2026-12-28', '2027-01-03')).toBe('28 Dicembre - 3 Gennaio 2026');
  });

  it('returns empty string for empty input', () => {
    expect(formatDateRangeIT('', '')).toBe('');
    expect(formatDateRangeIT('2026-01-10', '')).toBe('');
    expect(formatDateRangeIT('', '2026-01-15')).toBe('');
  });

  it('uses correct Italian month names', () => {
    expect(formatDateRangeIT('2026-01-01', '2026-01-02')).toContain('Gennaio');
    expect(formatDateRangeIT('2026-02-01', '2026-02-02')).toContain('Febbraio');
    expect(formatDateRangeIT('2026-03-01', '2026-03-02')).toContain('Marzo');
    expect(formatDateRangeIT('2026-04-01', '2026-04-02')).toContain('Aprile');
    expect(formatDateRangeIT('2026-05-01', '2026-05-02')).toContain('Maggio');
    expect(formatDateRangeIT('2026-06-01', '2026-06-02')).toContain('Giugno');
    expect(formatDateRangeIT('2026-07-01', '2026-07-02')).toContain('Luglio');
    expect(formatDateRangeIT('2026-08-01', '2026-08-02')).toContain('Agosto');
    expect(formatDateRangeIT('2026-09-01', '2026-09-02')).toContain('Settembre');
    expect(formatDateRangeIT('2026-10-01', '2026-10-02')).toContain('Ottobre');
    expect(formatDateRangeIT('2026-11-01', '2026-11-02')).toContain('Novembre');
    expect(formatDateRangeIT('2026-12-01', '2026-12-02')).toContain('Dicembre');
  });
});
