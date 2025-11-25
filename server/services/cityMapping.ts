export const CITY_TO_IATA: Record<string, string> = {
  "roma": "ROM",
  "rome": "ROM",

  "milano": "MIL",
  "milan": "MIL",

  "barcellona": "BCN",
  "barcelona": "BCN",

  "parigi": "PAR",
  "paris": "PAR",

  "praga": "PRG",
  "prague": "PRG",

  "budapest": "BUD",

  "cracovia": "KRK",
  "krakow": "KRK",

  "amsterdam": "AMS",

  "berlino": "BER",
  "berlin": "BER",

  "lisbona": "LIS",
  "lisbon": "LIS",

  "palma de mallorca": "PMI",
  "palma": "PMI",
  "mallorca": "PMI",

  "ibiza": "IBZ"
};

export function cityToIata(cityName: string | undefined | null): string | null {
  if (!cityName) return null;
  const normalized = cityName.toLowerCase().trim();
  return CITY_TO_IATA[normalized] || null;
}
