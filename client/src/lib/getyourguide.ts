import { CITY_REGISTRY, getCityDefinition } from "@shared/cityMapping";

/**
 * Get GetYourGuide affiliate link for a city
 * Supports IT/EN city names with normalization
 * 
 * @param destinationCity - City name in IT or EN
 * @returns Affiliate URL or null if not supported
 */
export function getGetYourGuideCityLink(destinationCity: string | null | undefined): string | null {
  return getCityDefinition(destinationCity)?.getYourGuideUrl ?? null;
}

/**
 * List of supported cities for display purposes
 */
export const SUPPORTED_CITIES = CITY_REGISTRY.map((city) => city.key);
