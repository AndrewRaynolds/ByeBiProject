// Mappatura centralizzata città → codice IATA
// Unica fonte di verità per origini italiane e destinazioni europee

export const CITY_TO_IATA: Record<string, string> = {
  // ===== ORIGINI ITALIANE =====
  // Roma
  "roma": "ROM",
  "rome": "ROM",
  
  // Milano
  "milano": "MIL",
  "milan": "MIL",
  
  // Napoli
  "napoli": "NAP",
  "naples": "NAP",
  
  // Torino
  "torino": "TRN",
  "turin": "TRN",
  
  // Venezia
  "venezia": "VCE",
  "venice": "VCE",
  
  // Bologna
  "bologna": "BLQ",
  
  // Firenze
  "firenze": "FLR",
  "florence": "FLR",
  
  // Bari
  "bari": "BRI",
  
  // Catania
  "catania": "CTA",
  
  // Palermo
  "palermo": "PMO",
  
  // Verona
  "verona": "VRN",
  
  // Pisa
  "pisa": "PSA",
  
  // Genova
  "genova": "GOA",
  "genoa": "GOA",
  
  // Brindisi
  "brindisi": "BDS",
  
  // Olbia
  "olbia": "OLB",
  
  // Cagliari
  "cagliari": "CAG",
  
  // Alghero
  "alghero": "AHO",

  // ===== DESTINAZIONI EUROPEE (10 destinazioni app) =====
  // 1. Ibiza
  "ibiza": "IBZ",

  // 2. Barcellona
  "barcellona": "BCN",
  "barcelona": "BCN",

  // 3. Praga
  "praga": "PRG",
  "prague": "PRG",

  // 4. Budapest
  "budapest": "BUD",

  // 5. Cracovia
  "cracovia": "KRK",
  "krakow": "KRK",
  "cracow": "KRK",

  // 6. Amsterdam
  "amsterdam": "AMS",

  // 7. Berlino
  "berlino": "BER",
  "berlin": "BER",

  // 8. Lisbona
  "lisbona": "LIS",
  "lisbon": "LIS",
  "lisboa": "LIS",

  // 9. Palma de Mallorca
  "palma de mallorca": "PMI",
  "palma": "PMI",
  "mallorca": "PMI",

  // Extra: Parigi
  "parigi": "PAR",
  "paris": "PAR"
};

// Mappatura IATA → nome città (per display)
export const IATA_TO_CITY: Record<string, string> = {
  // Origini italiane
  "ROM": "Roma",
  "MIL": "Milano",
  "NAP": "Napoli",
  "TRN": "Torino",
  "VCE": "Venezia",
  "BLQ": "Bologna",
  "FLR": "Firenze",
  "BRI": "Bari",
  "CTA": "Catania",
  "PMO": "Palermo",
  "VRN": "Verona",
  "PSA": "Pisa",
  "GOA": "Genova",
  "BDS": "Brindisi",
  "OLB": "Olbia",
  "CAG": "Cagliari",
  "AHO": "Alghero",
  // Destinazioni
  "IBZ": "Ibiza",
  "BCN": "Barcellona",
  "PRG": "Praga",
  "BUD": "Budapest",
  "KRK": "Cracovia",
  "AMS": "Amsterdam",
  "BER": "Berlino",
  "LIS": "Lisbona",
  "PMI": "Palma de Mallorca",
  "PAR": "Parigi"
};

export function cityToIata(cityName: string | undefined | null): string | null {
  if (!cityName) return null;
  const normalized = cityName.toLowerCase().trim();
  return CITY_TO_IATA[normalized] || null;
}

export function iataToCity(iataCode: string | undefined | null): string {
  if (!iataCode) return "Roma";
  return IATA_TO_CITY[iataCode.toUpperCase()] || iataCode;
}
