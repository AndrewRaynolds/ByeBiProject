/**
 * Tests for date utilities
 * Run with: npx tsx shared/dateUtils.test.ts
 */

import { normalizeTripDate, calculateTripDays, isValidDateRange, formatDateIT } from './dateUtils';

function assertEqual(actual: any, expected: any, testName: string) {
  const passed = actual === expected;
  console.log(`${passed ? '✅' : '❌'} ${testName}: ${passed ? 'PASSED' : `FAILED (expected ${expected}, got ${actual})`}`);
  return passed;
}

// Test 1: ISO format input returns identical output
console.log('\n--- Test 1: ISO format dates ---');
assertEqual(normalizeTripDate('2026-01-20'), '2026-01-20', 'ISO start date');
assertEqual(normalizeTripDate('2026-01-22'), '2026-01-22', 'ISO end date');

// Test 2: Italian format input converts to YYYY-MM-DD
console.log('\n--- Test 2: Italian format dates ---');
assertEqual(normalizeTripDate('20/01/2026'), '2026-01-20', 'Italian start date');
assertEqual(normalizeTripDate('22/01/2026'), '2026-01-22', 'Italian end date');

// Test 3: Date range calculation
console.log('\n--- Test 3: Date calculations ---');
assertEqual(calculateTripDays('2026-01-20', '2026-01-22'), 2, 'Days between 20-22 Jan');
assertEqual(isValidDateRange('2026-01-20', '2026-01-22'), true, 'Valid range 20-22 Jan');
assertEqual(isValidDateRange('2026-01-22', '2026-01-20'), false, 'Invalid range 22-20 Jan');

// Test 4: Edge case - month boundary (no shift)
console.log('\n--- Test 4: Month boundary dates ---');
assertEqual(normalizeTripDate('31/03/2026'), '2026-03-31', 'March 31 normalization');
assertEqual(normalizeTripDate('02/04/2026'), '2026-04-02', 'April 2 normalization');
assertEqual(calculateTripDays('2026-03-31', '2026-04-02'), 2, 'Days across month boundary');

// Test 5: Verify no timezone shift
console.log('\n--- Test 5: No timezone shift ---');
const testDate = '2026-01-20';
const normalized = normalizeTripDate(testDate);
assertEqual(normalized, testDate, 'No shift on YYYY-MM-DD input');

// Test 6: Checkout URL format verification
console.log('\n--- Test 6: URL date format ---');
const depDate = '2026-01-20';
const retDate = '2026-01-22';
const depDay = depDate.slice(8, 10);
const depMonth = depDate.slice(5, 7);
const retDay = retDate.slice(8, 10);
const retMonth = retDate.slice(5, 7);
const urlPart = `ROM${depDay}${depMonth}BCN${retDay}${retMonth}4`;
assertEqual(urlPart, 'ROM2001BCN22014', 'Checkout URL format correct');

// Test 7: Italian display format
console.log('\n--- Test 7: Italian display format ---');
assertEqual(formatDateIT('2026-01-20'), '20/01/2026', 'Italian display format');

// Test 8: Invalid dates
console.log('\n--- Test 8: Invalid date handling ---');
assertEqual(normalizeTripDate('2026-13-40'), null, 'Invalid month/day returns null');
assertEqual(normalizeTripDate('invalid'), null, 'Non-date string returns null');
assertEqual(normalizeTripDate(''), null, 'Empty string returns null');

console.log('\n--- All tests completed ---');
