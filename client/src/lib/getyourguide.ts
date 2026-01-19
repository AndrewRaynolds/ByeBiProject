/**
 * GetYourGuide affiliate links mapping
 * Uses canonical keys for supported destinations
 */
const GYG_LINKS: Record<string, string> = {
  "rome": "https://gyg.me/JvxfvhRT",
  "barcelona": "https://gyg.me/dL0Pwlqx",
  "ibiza": "https://gyg.me/EavPKji2",
  "prague": "https://gyg.me/JHh2phID",
  "budapest": "https://gyg.me/fD74LpqV",
  "krakow": "https://gyg.me/SzTVCadI",
  "amsterdam": "https://gyg.me/cPRD7CEG",
  "berlin": "https://gyg.me/TrvBd850",
  "lisbon": "https://gyg.me/rZpPMi3h",
  "palma-de-mallorca": "https://gyg.me/sXLoRnFc",
};

/**
 * IT/EN synonyms mapping to canonical keys
 */
const CITY_SYNONYMS: Record<string, string> = {
  "roma": "rome",
  "rome": "rome",
  "barcellona": "barcelona",
  "barcelona": "barcelona",
  "ibiza": "ibiza",
  "praga": "prague",
  "prague": "prague",
  "budapest": "budapest",
  "cracovia": "krakow",
  "krakow": "krakow",
  "amsterdam": "amsterdam",
  "berlino": "berlin",
  "berlin": "berlin",
  "lisbona": "lisbon",
  "lisbon": "lisbon",
  "palma": "palma-de-mallorca",
  "palma de mallorca": "palma-de-mallorca",
  "palma di maiorca": "palma-de-mallorca",
  "mallorca": "palma-de-mallorca",
  "maiorca": "palma-de-mallorca",
};

/**
 * Get GetYourGuide affiliate link for a city
 * Supports IT/EN city names with normalization
 * 
 * @param destinationCity - City name in IT or EN
 * @returns Affiliate URL or null if not supported
 */
export function getGetYourGuideCityLink(destinationCity: string | null | undefined): string | null {
  if (!destinationCity) {
    return null;
  }

  const normalized = destinationCity.trim().toLowerCase();
  const canonicalKey = CITY_SYNONYMS[normalized];

  if (!canonicalKey) {
    return null;
  }

  return GYG_LINKS[canonicalKey] || null;
}

/**
 * List of supported cities for display purposes
 */
export const SUPPORTED_CITIES = Object.keys(GYG_LINKS);
