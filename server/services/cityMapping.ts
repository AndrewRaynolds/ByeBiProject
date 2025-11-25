// Mappatura centralizzata città → codice IATA
// Unica fonte di verità per tutte le 10 destinazioni dell'app

export const CITY_TO_IATA: Record<string, string> = {
  // 1. Roma
  "roma": "ROM",
  "rome": "ROM",

  // 2. Ibiza
  "ibiza": "IBZ",

  // 3. Barcellona
  "barcellona": "BCN",
  "barcelona": "BCN",

  // 4. Praga
  "praga": "PRG",
  "prague": "PRG",

  // 5. Budapest
  "budapest": "BUD",

  // 6. Cracovia
  "cracovia": "KRK",
  "krakow": "KRK",
  "cracow": "KRK",

  // 7. Amsterdam
  "amsterdam": "AMS",

  // 8. Berlino
  "berlino": "BER",
  "berlin": "BER",

  // 9. Lisbona
  "lisbona": "LIS",
  "lisbon": "LIS",
  "lisboa": "LIS",

  // 10. Palma de Mallorca
  "palma de mallorca": "PMI",
  "palma": "PMI",
  "mallorca": "PMI",

  // Extra: Milano (per origine voli)
  "milano": "MIL",
  "milan": "MIL",

  // Extra: Parigi
  "parigi": "PAR",
  "paris": "PAR"
};

export function cityToIata(cityName: string | undefined | null): string | null {
  if (!cityName) return null;
  const normalized = cityName.toLowerCase().trim();
  return CITY_TO_IATA[normalized] || null;
}
