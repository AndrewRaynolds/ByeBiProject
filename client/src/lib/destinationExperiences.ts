import type { Destination } from "@shared/schema";

const EXPERIENCE_MATCHES: Record<string, string[]> = {
  "The Ultimate BroNight": [
    "amsterdam", "berlin", "prague", "barcelona", "budapest", "london",
    "netherlands", "germany", "czech republic", "spain", "hungary", "united kingdom",
  ],
  "My Olympic Bro": [
    "barcelona", "bilbao", "munich", "london", "milan", "rome", "paris",
    "spain", "germany", "united kingdom", "italy", "france",
  ],
  "Chill and Feel the Bro": [
    "rome", "florence", "paris", "barcelona", "lisbon", "copenhagen", "vienna",
    "italy", "france", "spain", "portugal", "denmark", "austria",
  ],
  "The Wild Broventure": [
    "interlaken", "barcelona", "split", "ibiza", "mykonos", "berlin", "prague",
    "switzerland", "spain", "croatia", "greece", "germany", "czech republic",
  ],
};

const COUNTRY_CODES: Record<string, string> = {
  Netherlands: "NL",
  Germany: "DE",
  Spain: "ES",
  Italy: "IT",
  France: "FR",
  "United Kingdom": "GB",
  "Czech Republic": "CZ",
  Croatia: "HR",
  Poland: "PL",
  Belgium: "BE",
  Portugal: "PT",
  Greece: "GR",
  Sweden: "SE",
  Denmark: "DK",
  Austria: "AT",
  Hungary: "HU",
  Ireland: "IE",
  Switzerland: "CH",
};

export function getDestinationExperiences(destination: Destination): string[] {
  const destinationName = destination.name.toLowerCase();
  const destinationCountry = destination.country.toLowerCase();

  const matchingExperiences = Object.entries(EXPERIENCE_MATCHES)
    .filter(([, locations]) =>
      locations.some(
        (location) =>
          destinationName.includes(location) || destinationCountry.includes(location),
      ),
    )
    .map(([experienceName]) => experienceName);

  const preferredExperience =
    destinationName === "amsterdam"
      ? "The Ultimate BroNight"
      : destinationName === "bilbao"
        ? "My Olympic Bro"
        : destinationName === "paris"
          ? "Chill and Feel the Bro"
          : null;

  if (preferredExperience && !matchingExperiences.includes(preferredExperience)) {
    matchingExperiences.unshift(preferredExperience);
  }

  return matchingExperiences.slice(0, 2);
}

const BRIDE_EXPERIENCE_NAMES: Record<string, string> = {
  "The Ultimate BroNight": "The Ultimate BrideNight",
  "My Olympic Bro": "My Olympic Bride",
  "Chill and Feel the Bro": "Chill and Feel the Bride",
  "The Wild Broventure": "The Wild Brideventure",
};

export function adaptDestinationExperienceName(
  experienceName: string,
  brand: "byebro" | "byebride" | null,
): string {
  return brand === "byebride"
    ? BRIDE_EXPERIENCE_NAMES[experienceName] ?? experienceName
    : experienceName;
}

export function getDestinationCountryCode(country: string): string {
  return COUNTRY_CODES[country] || "EU";
}
