import { describe, expect, it } from "vitest";
import { adaptExperienceForBrand, localizeExperience } from "./ExperienceTypes";
import enLocale from "@/locales/en.json";
import itLocale from "@/locales/it.json";
import esLocale from "@/locales/es.json";

const experience = {
  name: "The Wild Broventure",
  description: "One last wild adventure with your bros.",
};

describe("ExperienceTypes brand copy", () => {
  it("removes Bro-specific copy from the ByeBride experience card", () => {
    expect(adaptExperienceForBrand(experience, "bride")).toEqual({
      name: "The Wild Brideventure",
      description: "One last wild adventure with your friends.",
    });
  });

  it("keeps the ByeBro copy unchanged", () => {
    expect(adaptExperienceForBrand(experience, "bro")).toBe(experience);
  });
});

describe("ExperienceTypes localized seed copy", () => {
  const seedExperience = {
    name: "The Wild Broventure",
    description: "One last wild adventure with your bros - outdoor activities, hiking, camping, and beers by the fire.",
  };
  const translate = (values: Record<string, string>) => (key: string) => values[key] ?? key;

  it("preserves canonical English API copy when the production translator is available", () => {
    expect(localizeExperience(seedExperience, "en", translate(enLocale))).toBe(seedExperience);
  });

  it("localizes canonical ByeBro and ByeBride seed cards in Italian and Spanish", () => {
    const brideExperience = adaptExperienceForBrand(seedExperience, "bride");

    expect(localizeExperience(seedExperience, "it", translate(itLocale))).toMatchObject({
      name: "La Bro-avventura selvaggia",
      description: "Un'ultima avventura sfrenata: attività all'aperto, trekking, campeggio e birre attorno al fuoco.",
    });
    expect(localizeExperience(brideExperience, "es", translate(esLocale))).toMatchObject({
      name: "La aventura salvaje de las amigas",
      description: "Una última aventura salvaje: actividades al aire libre, senderismo, acampada y cervezas junto al fuego.",
    });
  });

  it("keeps unrecognized API content unchanged", () => {
    const dynamicExperience = { name: "New experience", description: "Fresh API copy" };

    expect(localizeExperience(dynamicExperience, "it", translate(itLocale))).toBe(dynamicExperience);
  });
});
