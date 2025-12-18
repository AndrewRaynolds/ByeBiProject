/**
 * Date utilities for trip dates - NO timezone conversions
 * Treats dates as "date-only" strings without time or timezone
 */

/**
 * Gets current year/month/day without timezone issues
 */
function getCurrentDateParts(): { year: number; month: number; day: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  };
}

/**
 * Determines the appropriate year for a given month/day
 * If the date has already passed this year, use next year
 */
function inferFutureYear(month: number, day: number): number {
  const current = getCurrentDateParts();
  
  // If month/day is in the past this year, use next year
  if (month < current.month || (month === current.month && day < current.day)) {
    return current.year + 1;
  }
  return current.year;
}

/**
 * Normalizes a date input to YYYY-MM-DD format
 * Accepts: "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "DD/MM", "DD-MM"
 * For inputs without year, assigns future year automatically
 * User-provided years are respected and never modified
 * Returns: "YYYY-MM-DD" or null if invalid
 */
export function normalizeTripDate(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  
  // Already in YYYY-MM-DD format - respect user-provided year
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    
    if (isValidDateParts(year, month, day)) {
      return trimmed; // Respect user-provided year
    }
    return null;
  }

  // DD/MM/YYYY or DD-MM-YYYY format - respect user-provided year
  const euFullMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (euFullMatch) {
    const [, dayStr, monthStr, yearStr] = euFullMatch;
    const day = parseInt(dayStr);
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);
    
    if (isValidDateParts(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  // DD/MM or DD-MM format (no year) - infer future year
  const euShortMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (euShortMatch) {
    const [, dayStr, monthStr] = euShortMatch;
    const day = parseInt(dayStr);
    const month = parseInt(monthStr);
    const year = inferFutureYear(month, day);
    
    if (isValidDateParts(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

/**
 * Normalizes a date input ensuring it's in the future
 * If the date is in the past, adjusts to next occurrence
 * Use this when dates MUST be in the future (like trip booking)
 */
export function normalizeFutureTripDate(input: string): string | null {
  const normalized = normalizeTripDate(input);
  if (!normalized) return null;
  
  const year = parseInt(normalized.slice(0, 4));
  const month = parseInt(normalized.slice(5, 7));
  const day = parseInt(normalized.slice(8, 10));
  
  const current = getCurrentDateParts();
  
  // If date is in the past, adjust to next occurrence
  if (year < current.year || 
      (year === current.year && (month < current.month || (month === current.month && day < current.day)))) {
    const futureYear = inferFutureYear(month, day);
    return `${futureYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  return normalized;
}

/**
 * Validates date parts without creating Date objects
 */
function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 2024 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Leap year check
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const maxDay = isLeap ? 29 : 28;
    if (day > maxDay) return false;
  } else if (day > daysInMonth[month]) {
    return false;
  }

  return true;
}

/**
 * Calculates days between two YYYY-MM-DD date strings
 * Uses simple arithmetic, no Date objects
 */
export function calculateTripDays(startDate: string, endDate: string): number {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  
  if (!start || !end) return 0;
  
  // Convert to days since epoch using simple formula
  const startDays = toDaysSinceEpoch(start.year, start.month, start.day);
  const endDays = toDaysSinceEpoch(end.year, end.month, end.day);
  
  return Math.max(0, endDays - startDays);
}

/**
 * Parses YYYY-MM-DD string to parts object
 */
function parseDateString(dateStr: string): { year: number; month: number; day: number } | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  return {
    year: parseInt(match[1]),
    month: parseInt(match[2]),
    day: parseInt(match[3])
  };
}

/**
 * Converts date parts to days since a reference point
 * Simple algorithm that works for date comparisons
 */
function toDaysSinceEpoch(year: number, month: number, day: number): number {
  // Simplified calculation - works for comparison purposes
  let days = year * 365 + day;
  
  // Add days for each month
  const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  days += monthDays[month - 1];
  
  // Add leap year days
  const leapYears = Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400);
  days += leapYears;
  
  // If after Feb in a leap year, add 1
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (isLeap && month > 2) {
    days += 1;
  }
  
  return days;
}

/**
 * Validates that return date is after depart date
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  
  if (!start || !end) return false;
  
  const startDays = toDaysSinceEpoch(start.year, start.month, start.day);
  const endDays = toDaysSinceEpoch(end.year, end.month, end.day);
  
  return endDays > startDays;
}

/**
 * Formats date for display in Italian format
 * Input: YYYY-MM-DD, Output: DD/MM/YYYY
 */
export function formatDateIT(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateStr;
  
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Extracts date-only portion from ISO datetime string
 * Input: "2026-01-20T10:30:00" -> "2026-01-20"
 */
export function extractDateOnly(isoString: string): string {
  if (!isoString) return '';
  return isoString.slice(0, 10);
}

/**
 * Formats ISO datetime string for display without timezone shift
 * Extracts date and time parts directly from string
 * Input: "2026-01-20T10:30:00+01:00" -> "20/01/2026 10:30"
 */
export function formatFlightDateTime(isoString: string): string {
  if (!isoString) return '';
  
  // Extract date part (YYYY-MM-DD)
  const datePart = isoString.slice(0, 10);
  const timePart = isoString.slice(11, 16); // HH:MM
  
  // Parse date without Date object
  const year = datePart.slice(0, 4);
  const month = datePart.slice(5, 7);
  const day = datePart.slice(8, 10);
  
  return `${day}/${month}/${year} ${timePart}`;
}

/**
 * Formats date range for display
 * Input: "2026-01-10", "2026-01-15" -> "10-15 Gennaio 2026"
 */
export function formatDateRangeIT(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  
  const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  
  const startDay = parseInt(startDate.slice(8, 10));
  const startMonth = parseInt(startDate.slice(5, 7)) - 1;
  const endDay = parseInt(endDate.slice(8, 10));
  const endMonth = parseInt(endDate.slice(5, 7)) - 1;
  const year = startDate.slice(0, 4);
  
  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${months[startMonth]} ${year}`;
  }
  return `${startDay} ${months[startMonth]} - ${endDay} ${months[endMonth]} ${year}`;
}
