import { describe, expect, it } from "vitest";
import { adaptExperienceForBrand } from "./ExperienceTypes";

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
