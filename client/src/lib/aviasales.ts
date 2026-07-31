export { buildAviasalesUrl, type AviasalesUrlParams } from '@shared/flightSchemas';

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
