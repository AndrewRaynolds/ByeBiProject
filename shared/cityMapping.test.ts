import { describe, expect, it } from "vitest";
import {
  CITY_REGISTRY,
  getCanonicalCityKey,
  getCityCode,
  getCityDefinitionByKey,
} from "./cityMapping";

describe("canonical city registry", () => {
  it("defines all ten cities once with travel, localization, and affiliate identity", () => {
    expect(CITY_REGISTRY).toHaveLength(10);
    expect(new Set(CITY_REGISTRY.map((city) => city.key)).size).toBe(10);
    expect(CITY_REGISTRY.every((city) => city.iata && city.translationKey && city.getYourGuideUrl)).toBe(true);
  });

  it("resolves localized aliases and canonical keys", () => {
    expect(getCanonicalCityKey("Roma")).toBe("rome");
    expect(getCanonicalCityKey("Palma di Maiorca")).toBe("palma-de-mallorca");
    expect(getCityCode("Lisbona")).toBe("LIS");
    expect(getCityDefinitionByKey("barcelona")?.getYourGuideUrl).toBe("https://gyg.me/dL0Pwlqx");
  });
});
