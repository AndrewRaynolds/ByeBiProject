import { describe, expect, it } from "vitest";
import {
  getGetYourGuideCityLink,
  SUPPORTED_CITIES,
} from "./getyourguide";
import { isAllowedExternalUrl } from "./externalNavigation";

const currentDestinations = [
  "Roma",
  "Barcellona",
  "Ibiza",
  "Praga",
  "Budapest",
  "Cracovia",
  "Amsterdam",
  "Berlino",
  "Lisbona",
  "Palma de Mallorca",
];

describe("GetYourGuide affiliate coverage", () => {
  it.each(currentDestinations)("has a trusted partner link for %s", (city) => {
    const url = getGetYourGuideCityLink(city);
    expect(url).toMatch(/^https:\/\/gyg\.me\//);
    expect(isAllowedExternalUrl(url!)).toBe(true);
  });

  it("covers every currently supported destination", () => {
    expect(SUPPORTED_CITIES).toHaveLength(currentDestinations.length);
  });

  it("does not label an unverified generic search as affiliated", () => {
    expect(getGetYourGuideCityLink("Madrid")).toBeNull();
  });
});
