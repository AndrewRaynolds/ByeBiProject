import type { Destination } from "@shared/schema";

type Translate = (key: string, params?: Record<string, string | number>) => string;

const DESTINATION_KEYS: Record<string, string> = {
  Roma: "rome",
  Ibiza: "ibiza",
  Barcellona: "barcelona",
  Praga: "prague",
  Budapest: "budapest",
  Cracovia: "krakow",
  Amsterdam: "amsterdam",
  Berlino: "berlin",
  Lisbona: "lisbon",
  "Palma de Mallorca": "palma",
};

const COUNTRY_KEYS: Record<string, string> = {
  Italy: "italy",
  Spain: "spain",
  "Czech Republic": "czechRepublic",
  Hungary: "hungary",
  Poland: "poland",
  Netherlands: "netherlands",
  Germany: "germany",
  Portugal: "portugal",
};

export function localizeDestination(destination: Destination, t: Translate): Destination {
  const destinationKey = DESTINATION_KEYS[destination.name];
  const countryKey = COUNTRY_KEYS[destination.country];

  if (!destinationKey) return destination;

  return {
    ...destination,
    name: t(`destinations.city.${destinationKey}.name`),
    country: countryKey ? t(`destinations.country.${countryKey}`) : destination.country,
    description: t(`destinations.city.${destinationKey}.description`),
    tags: destination.tags?.map((_, index) =>
      t(`destinations.city.${destinationKey}.tag${index + 1}`),
    ) ?? null,
  };
}
