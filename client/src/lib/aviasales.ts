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
 * City to IATA code mapping (synced with server/services/cityMapping.ts)
 * This is a subset for frontend use - the server has the authoritative mapping
 */
const cityToIataMap: Record<string, string> = {
  // ===== ITALY =====
  "roma": "ROM",
  "rome": "ROM",
  "milano": "MIL",
  "milan": "MIL",
  "malpensa": "MXP",  // Milan Malpensa airport
  "linate": "LIN",    // Milan Linate airport
  "fiumicino": "FCO", // Rome Fiumicino airport
  "napoli": "NAP",
  "naples": "NAP",
  "torino": "TRN",
  "turin": "TRN",
  "venezia": "VCE",
  "venice": "VCE",
  "bologna": "BLQ",
  "firenze": "FLR",
  "florence": "FLR",
  "bari": "BRI",
  "catania": "CTA",
  "palermo": "PMO",
  "verona": "VRN",
  "pisa": "PSA",
  "bergamo": "BGY",
  "genova": "GOA",
  "genoa": "GOA",
  "brindisi": "BDS",
  "olbia": "OLB",
  "cagliari": "CAG",
  "alghero": "AHO",
  "trieste": "TRS",

  // ===== SPAIN =====
  "madrid": "MAD",
  "barcellona": "BCN",
  "barcelona": "BCN",
  "ibiza": "IBZ",
  "palma de mallorca": "PMI",
  "palma": "PMI",
  "mallorca": "PMI",
  "valencia": "VLC",
  "siviglia": "SVQ",
  "seville": "SVQ",
  "malaga": "AGP",
  "bilbao": "BIO",
  "alicante": "ALC",
  "tenerife": "TFS",

  // ===== FRANCE =====
  "parigi": "PAR",
  "paris": "PAR",
  "nizza": "NCE",
  "nice": "NCE",
  "lione": "LYS",
  "lyon": "LYS",
  "marsiglia": "MRS",
  "marseille": "MRS",

  // ===== GERMANY =====
  "berlino": "BER",
  "berlin": "BER",
  "monaco di baviera": "MUC",
  "munich": "MUC",
  "munchen": "MUC",
  "francoforte": "FRA",
  "frankfurt": "FRA",
  "amburgo": "HAM",
  "hamburg": "HAM",

  // ===== UNITED KINGDOM =====
  "londra": "LON",
  "london": "LON",
  "manchester": "MAN",
  "edimburgo": "EDI",
  "edinburgh": "EDI",

  // ===== NETHERLANDS =====
  "amsterdam": "AMS",

  // ===== PORTUGAL =====
  "lisbona": "LIS",
  "lisbon": "LIS",
  "lisboa": "LIS",
  "porto": "OPO",

  // ===== POLAND =====
  "varsavia": "WAW",
  "warsaw": "WAW",
  "cracovia": "KRK",
  "krakow": "KRK",
  "cracow": "KRK",

  // ===== CZECH REPUBLIC =====
  "praga": "PRG",
  "prague": "PRG",

  // ===== HUNGARY =====
  "budapest": "BUD",

  // ===== AUSTRIA =====
  "vienna": "VIE",
  "wien": "VIE",

  // ===== SWITZERLAND =====
  "zurigo": "ZRH",
  "zurich": "ZRH",
  "ginevra": "GVA",
  "geneva": "GVA",

  // ===== IRELAND =====
  "dublino": "DUB",
  "dublin": "DUB",

  // ===== SCANDINAVIA =====
  "copenaghen": "CPH",
  "copenhagen": "CPH",
  "stoccolma": "ARN",
  "stockholm": "ARN",

  // ===== GREECE =====
  "atene": "ATH",
  "athens": "ATH",
  "santorini": "JTR",
  "mykonos": "JMK",

  // ===== CROATIA =====
  "dubrovnik": "DBV",
  "spalato": "SPU",
  "split": "SPU",
};

/**
 * Extract IATA code from city string
 * Handles formats like "Malpensa (MXP)", "Milano", "MXP", etc.
 */
export function getCityIata(city: string): string | null {
  if (!city) return null;
  
  // Check if the string contains an IATA code in parentheses, e.g., "Malpensa (MXP)"
  const parenMatch = city.match(/\(([A-Z]{3})\)/);
  if (parenMatch) {
    return parenMatch[1];
  }
  
  // Check if it's already a 3-letter IATA code
  if (/^[A-Z]{3}$/.test(city.trim())) {
    return city.trim();
  }
  
  // Normalize and look up in mapping
  const normalized = city.toLowerCase().trim();
  if (cityToIataMap[normalized]) {
    return cityToIataMap[normalized];
  }
  
  // Try removing parenthetical content and look up again
  const withoutParens = city.replace(/\s*\([^)]*\)\s*/g, '').toLowerCase().trim();
  if (cityToIataMap[withoutParens]) {
    return cityToIataMap[withoutParens];
  }
  
  console.warn(`⚠️ No IATA mapping found for "${city}"`);
  return null;
}
