import { describe, expect, it } from "vitest";
import { adaptExperienceForBrand, localizeExperience } from "./ExperienceTypes";

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
  it("localizes known ByeBro and ByeBride seed cards in Italian and Spanish", () => {
    const seedExperience = {
      name: "The Wild Broventure",
      description: "One last wild adventure with your bros - outdoor activities, hiking, camping, and beers by the fire.",
    };
    const brideExperience = adaptExperienceForBrand(seedExperience, "bride");

    expect(localizeExperience(seedExperience, "it").name).toBe("La Bro-avventura selvaggia");
    expect(localizeExperience(brideExperience, "es").name).toBe("La aventura salvaje de las amigas");
  });

  it("keeps English and unrecognized API content unchanged", () => {
    const dynamicExperience = { name: "New experience", description: "Fresh API copy" };

    expect(localizeExperience(experience, "en")).toBe(experience);
    expect(localizeExperience(dynamicExperience, "it")).toBe(dynamicExperience);
  });
});
