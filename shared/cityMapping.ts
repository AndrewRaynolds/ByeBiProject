export const cityKeys = [
  "rome", "ibiza", "barcelona", "prague", "budapest", "krakow",
  "amsterdam", "berlin", "lisbon", "palma-de-mallorca",
] as const;

export type CityKey = (typeof cityKeys)[number];

export interface CityDefinition {
  key: CityKey;
  canonical: string;
  iata: string;
  aliases: readonly string[];
  translationKey: string;
  countryKey: string;
  countryCode: string;
  getYourGuideUrl: string;
}

export const CITY_REGISTRY: readonly CityDefinition[] = [
  { key: "rome", canonical: "Rome", iata: "ROM", aliases: ["roma", "rome"], translationKey: "rome", countryKey: "italy", countryCode: "IT", getYourGuideUrl: "https://gyg.me/JvxfvhRT" },
  { key: "ibiza", canonical: "Ibiza", iata: "IBZ", aliases: ["ibiza"], translationKey: "ibiza", countryKey: "spain", countryCode: "ES", getYourGuideUrl: "https://gyg.me/EavPKji2" },
  { key: "barcelona", canonical: "Barcelona", iata: "BCN", aliases: ["barcellona", "barcelona"], translationKey: "barcelona", countryKey: "spain", countryCode: "ES", getYourGuideUrl: "https://gyg.me/dL0Pwlqx" },
  { key: "prague", canonical: "Prague", iata: "PRG", aliases: ["praga", "prague"], translationKey: "prague", countryKey: "czechRepublic", countryCode: "CZ", getYourGuideUrl: "https://gyg.me/JHh2phID" },
  { key: "budapest", canonical: "Budapest", iata: "BUD", aliases: ["budapest"], translationKey: "budapest", countryKey: "hungary", countryCode: "HU", getYourGuideUrl: "https://gyg.me/fD74LpqV" },
  { key: "krakow", canonical: "Krakow", iata: "KRK", aliases: ["cracovia", "krakow", "kraków", "cracow"], translationKey: "krakow", countryKey: "poland", countryCode: "PL", getYourGuideUrl: "https://gyg.me/SzTVCadI" },
  { key: "amsterdam", canonical: "Amsterdam", iata: "AMS", aliases: ["amsterdam"], translationKey: "amsterdam", countryKey: "netherlands", countryCode: "NL", getYourGuideUrl: "https://gyg.me/cPRD7CEG" },
  { key: "berlin", canonical: "Berlin", iata: "BER", aliases: ["berlino", "berlin"], translationKey: "berlin", countryKey: "germany", countryCode: "DE", getYourGuideUrl: "https://gyg.me/TrvBd850" },
  { key: "lisbon", canonical: "Lisbon", iata: "LIS", aliases: ["lisbona", "lisbon", "lisboa"], translationKey: "lisbon", countryKey: "portugal", countryCode: "PT", getYourGuideUrl: "https://gyg.me/rZpPMi3h" },
  { key: "palma-de-mallorca", canonical: "Palma de Mallorca", iata: "PMI", aliases: ["palma de mallorca", "palma di mallorca", "palma di maiorca", "palma", "mallorca", "maiorca"], translationKey: "palma", countryKey: "spain", countryCode: "ES", getYourGuideUrl: "https://gyg.me/sXLoRnFc" },
];

// Backwards-compatible export for the existing travel consumers.
export const SUPPORTED_DESTINATIONS = CITY_REGISTRY;

function normalizeCity(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s+/g, ' ');
}

export function getCityCode(destination: string): string | null {
  return getCityDefinition(destination)?.iata ?? null;
}

export function getCanonicalCityName(destination: string): string | null {
  return getCityDefinition(destination)?.canonical ?? null;
}

export function getCityDefinition(destination: string | null | undefined): CityDefinition | null {
  if (!destination) return null;
  const normalized = normalizeCity(destination);
  return CITY_REGISTRY.find((city) => city.key === normalized || city.aliases.includes(normalized)) ?? null;
}

export function getCityDefinitionByKey(key: string | null | undefined): CityDefinition | null {
  if (!key) return null;
  return CITY_REGISTRY.find((city) => city.key === key) ?? null;
}

export function getCanonicalCityKey(destination: string | null | undefined): CityKey | null {
  return getCityDefinition(destination)?.key ?? null;
}

export function isSupportedDestination(destination: string): boolean {
  return getCityDefinition(destination) !== null;
}
