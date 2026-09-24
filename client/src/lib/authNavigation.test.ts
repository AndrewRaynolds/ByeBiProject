import { describe, expect, it } from "vitest";
import { getSafePostAuthPath } from "./authNavigation";

describe("post-auth navigation", () => {
  it("returns an internal checkout path after an explicit save request", () => {
    expect(getSafePostAuthPath("?next=%2Fcheckout")).toBe("/checkout");
  });

  it.each([
    "",
    "?next=https%3A%2F%2Fevil.example",
    "?next=%2F%2Fevil.example",
  ])("rejects missing or external redirect targets", (search) => {
    expect(getSafePostAuthPath(search)).toBe("/");
  });
});
