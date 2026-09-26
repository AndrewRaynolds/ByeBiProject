import { describe, expect, it } from "vitest";
import itTranslations from "./it.json";
import enTranslations from "./en.json";
import esTranslations from "./es.json";

const locales = { it: itTranslations, en: enTranslations, es: esTranslations };
const requiredKeys = [
  "checkout.title",
  "checkout.flightOptions",
  "checkout.hotelOptions",
  "checkout.flightUnavailable",
  "checkout.noFlightsForDates",
  "checkout.hotelLoadError",
  "checkout.noHotelsForDates",
  "checkout.flightPriceScope",
  "checkout.hotelPriceScopeFullGroup",
  "checkout.hotelPriceScopePartialGroup",
  "checkout.aviasalesHandoffNote",
  "checkout.bookingHandoffNote",
  "checkout.activitiesHandoffNote",
  "checkout.selected",
  "checkout.selectionDisclaimer",
] as const;

describe("provider options translations", () => {
  it.each(Object.entries(locales))("covers primary provider states in %s", (_locale, translations) => {
    requiredKeys.forEach((key) => {
      expect(translations[key]).toEqual(expect.any(String));
      expect(translations[key].trim().length).toBeGreaterThan(0);
    });
  });
});
