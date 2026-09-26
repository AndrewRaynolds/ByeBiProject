import { describe, expect, it } from "vitest";
import {
  getAllCityExperiences,
  localizeCityExperienceItem,
} from "./cityExperiences";
import {
  getLocalizedExperienceCopy,
  LOCALIZED_EXPERIENCE_COPY_COUNT,
} from "./cityExperienceCopy";

describe("city experience localization", () => {
  const cities = getAllCityExperiences();
  const items = cities.flatMap((city) => city.items.map((item) => ({ city, item })));

  it("provides specific EN and ES copy for every catalog item", () => {
    expect(LOCALIZED_EXPERIENCE_COPY_COUNT).toBe(items.length);

    for (const { city, item } of items) {
      for (const locale of ["en", "es"] as const) {
        const copy = getLocalizedExperienceCopy(city.cityKey, item.category, item.name, locale);
        expect(copy.description, `${locale} description for ${city.cityKey}/${item.name}`).toBeTruthy();

        if (item.category === "activities") {
          expect(copy.name, `${locale} activity name for ${city.cityKey}/${item.name}`).toBeTruthy();
        } else {
          expect(copy.name, `${locale} venue name for ${city.cityKey}/${item.name}`).toBeUndefined();
        }
      }
    }
  });

  it("preserves Italian data and all non-copy fields", () => {
    const city = cities[0];
    const item = city.items[0];

    expect(localizeCityExperienceItem(city.cityKey, item, "it")).toEqual(item);

    const localized = localizeCityExperienceItem(city.cityKey, item, "en");
    const { name: _localizedName, description: _localizedDescription, ...localizedOperationalData } = localized;
    const { name: _name, description: _description, ...operationalData } = item;
    expect(localizedOperationalData).toEqual(operationalData);
  });
});
