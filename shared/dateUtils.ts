/**
 * Date utilities for trip dates - NO timezone conversions
 * Treats dates as "date-only" strings without time or timezone
 */

/**
 * Normalizes a date input to YYYY-MM-DD format
 * Accepts: "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"
 * Returns: "YYYY-MM-DD" or null if invalid
 */
export function normalizeTripDate(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  
  // Already in YYYY-MM-DD format
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isValidDateParts(parseInt(year), parseInt(month), parseInt(day))) {
      return trimmed;
    }
    return null;
  }

  // DD/MM/YYYY or DD-MM-YYYY format
  const euMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (euMatch) {
    const [, dayStr, monthStr, year] = euMatch;
    const day = parseInt(dayStr);
    const month = parseInt(monthStr);
    const yearNum = parseInt(year);
    
    if (isValidDateParts(yearNum, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
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
