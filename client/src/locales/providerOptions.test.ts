import { describe, expect, it } from "vitest";
import itTranslations from "./it.json";
import enTranslations from "./en.json";
import esTranslations from "./es.json";

const locales = { it: itTranslations, en: enTranslations, es: esTranslations };
const requiredKeys = [
  "checkout.title",
  "checkout.subtitle",
  "checkout.flightOptions",
  "checkout.hotelOptions",
  "checkout.flightProviderNote",
  "checkout.flightUnavailable",
  "checkout.aviasalesHandoffNote",
  "checkout.hotelProviderNote",
  "checkout.bookingHandoffNote",
  "checkout.searchHotelsBooking",
  "checkout.activitiesHandoffNote",
] as const;

describe("travel handoff translations", () => {
  it.each(Object.entries(locales))("covers current external handoffs in %s", (_locale, translations) => {
    requiredKeys.forEach((key) => {
      expect(translations[key]).toEqual(expect.any(String));
      expect(translations[key].trim().length).toBeGreaterThan(0);
    });
  });

  it.each(Object.entries(locales))("does not present Amadeus as an active provider in %s", (_locale, translations) => {
    const checkoutCopy = Object.entries(translations)
      .filter(([key]) => key.startsWith("checkout."))
      .map(([, value]) => String(value))
      .join(" ");
    expect(checkoutCopy).not.toMatch(/Amadeus/i);
  });
});
