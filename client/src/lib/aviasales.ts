/**
 * Aviasales URL Builder - Single source of truth for generating Aviasales booking links
 * NEVER uses Date() constructor to avoid timezone issues
 * All dates must be in YYYY-MM-DD format
 */

export interface AviasalesUrlParams {
  originIata: string;
  destinationIata: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD (optional for one-way)
  adults?: number;
  currency?: string;
  locale?: string;
}

const AVIASALES_PARTNER_ID = 'byebi';

/**
 * Validates that a date string is in YYYY-MM-DD format
 */
function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateStr);
}

/**
 * Extracts day and month from YYYY-MM-DD string
 * Returns { day: "DD", month: "MM" } or null if invalid
 */
function extractDayMonth(dateStr: string): { day: string; month: string } | null {
  if (!isValidDateFormat(dateStr)) {
    console.warn(`⚠️ Invalid date format for Aviasales URL: ${dateStr}`);
    return null;
  }
  
  const parts = dateStr.split('-');
  return {
    month: parts[1], // Already "MM"
    day: parts[2]    // Already "DD"
  };
}

/**
 * Builds Aviasales search URL with correct date formatting
 * Format: https://www.aviasales.com/search/{origin}{depDay}{depMonth}{dest}{retDay}{retMonth}{adults}
 * 
 * @example
 * buildAviasalesUrl({
 *   originIata: 'FCO',
 *   destinationIata: 'BCN',
 *   departDate: '2025-12-19',
 *   returnDate: '2025-12-22',
 *   adults: 4
 * })
 * // Returns: https://www.aviasales.com/search/FCO1912BCN22124?marker=byebi
 */
export function buildAviasalesUrl(params: AviasalesUrlParams): string | null {
  const {
    originIata,
    destinationIata,
    departDate,
    returnDate,
    adults = 1,
  } = params;

  console.log('🔗 Building Aviasales URL with params:', {
    originIata,
    destinationIata,
    departDate,
    returnDate,
    adults
  });

  if (!originIata || !destinationIata) {
    console.warn('⚠️ Missing origin or destination IATA code');
    return null;
  }

  const depParts = extractDayMonth(departDate);
  if (!depParts) {
    console.warn(`⚠️ Cannot build Aviasales URL: invalid departDate "${departDate}"`);
    return null;
  }

  let searchPath = `${originIata.toUpperCase()}${depParts.day}${depParts.month}${destinationIata.toUpperCase()}`;

  if (returnDate) {
    const retParts = extractDayMonth(returnDate);
    if (retParts) {
      searchPath += `${retParts.day}${retParts.month}`;
    }
  }

  searchPath += adults.toString();

  const url = `https://www.aviasales.com/search/${searchPath}?marker=${AVIASALES_PARTNER_ID}`;
  
  console.log('✅ Built Aviasales URL:', url);
  return url;
}

/**
 * City to IATA code mapping (for frontend use)
 */
const cityToIataMap: Record<string, string> = {
  // Italian airports
  'roma': 'FCO',
  'rome': 'FCO',
  'milano': 'MXP',
  'milan': 'MXP',
  'napoli': 'NAP',
  'naples': 'NAP',
  'venezia': 'VCE',
  'venice': 'VCE',
  'firenze': 'FLR',
  'florence': 'FLR',
  'bologna': 'BLQ',
  'torino': 'TRN',
  'turin': 'TRN',
  'palermo': 'PMO',
  'catania': 'CTA',
  'bari': 'BRI',
  'cagliari': 'CAG',
  'verona': 'VRN',
  'pisa': 'PSA',
  'bergamo': 'BGY',
  'genova': 'GOA',
  'genoa': 'GOA',
  'trieste': 'TRS',
  // European destinations
  'barcellona': 'BCN',
  'barcelona': 'BCN',
  'ibiza': 'IBZ',
  'amsterdam': 'AMS',
  'praga': 'PRG',
  'prague': 'PRG',
  'budapest': 'BUD',
  'berlino': 'BER',
  'berlin': 'BER',
  'lisbona': 'LIS',
  'lisbon': 'LIS',
  'cracovia': 'KRK',
  'krakow': 'KRK',
  'atene': 'ATH',
  'athens': 'ATH',
};

export function getCityIata(city: string): string | null {
  if (!city) return null;
  const normalized = city.toLowerCase().trim();
  
  // Return mapped IATA or fallback to first 3 letters uppercase
  if (cityToIataMap[normalized]) {
    return cityToIataMap[normalized];
  }
  
  // Fallback: use first 3 letters as IATA code (common pattern)
  if (city.length >= 3) {
    const fallback = city.substring(0, 3).toUpperCase();
    console.log(`⚠️ No IATA mapping for "${city}", using fallback: ${fallback}`);
    return fallback;
  }
  
  return null;
}
