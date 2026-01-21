export interface CityDefinition {
  canonical: string;
  iata: string;
  aliases: string[];
}

export const SUPPORTED_DESTINATIONS: CityDefinition[] = [
  { canonical: "Rome", iata: "ROM", aliases: ["roma", "rome"] },
  { canonical: "Ibiza", iata: "IBZ", aliases: ["ibiza"] },
  { canonical: "Barcelona", iata: "BCN", aliases: ["barcellona", "barcelona"] },
  { canonical: "Prague", iata: "PRG", aliases: ["praga", "prague"] },
  { canonical: "Budapest", iata: "BUD", aliases: ["budapest"] },
  { canonical: "Krakow", iata: "KRK", aliases: ["cracovia", "krakow", "kraków", "cracow"] },
  { canonical: "Amsterdam", iata: "AMS", aliases: ["amsterdam"] },
  { canonical: "Berlin", iata: "BER", aliases: ["berlino", "berlin"] },
  { canonical: "Lisbon", iata: "LIS", aliases: ["lisbona", "lisbon", "lisboa"] },
  { canonical: "Palma de Mallorca", iata: "PMI", aliases: ["palma de mallorca", "palma", "mallorca", "maiorca"] },
];

function normalizeCity(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s+/g, ' ');
}

export function getCityCode(destination: string): string | null {
  const normalized = normalizeCity(destination);
  
  for (const city of SUPPORTED_DESTINATIONS) {
    if (city.aliases.includes(normalized)) {
      return city.iata;
    }
  }
  
  return null;
}

export function getCanonicalCityName(destination: string): string | null {
  const normalized = normalizeCity(destination);
  
  for (const city of SUPPORTED_DESTINATIONS) {
    if (city.aliases.includes(normalized)) {
      return city.canonical;
    }
  }
  
  return null;
}

export function isSupportedDestination(destination: string): boolean {
  return getCityCode(destination) !== null;
}
