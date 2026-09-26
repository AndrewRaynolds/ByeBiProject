import type { Destination } from "@shared/schema";
import { getCityDefinition } from "@shared/cityMapping";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function localizeDestination(destination: Destination, t: Translate): Destination {
  const city = getCityDefinition(destination.name);
  if (!city) return destination;

  return {
    ...destination,
    name: t(`destinations.city.${city.translationKey}.name`),
    country: t(`destinations.country.${city.countryKey}`),
    description: t(`destinations.city.${city.translationKey}.description`),
    tags: destination.tags?.map((_, index) =>
      t(`destinations.city.${city.translationKey}.tag${index + 1}`),
    ) ?? null,
  };
}
