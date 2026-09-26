import { describe, expect, it } from "vitest";
import {
  buildProtectedRouteAuthPath,
  getSafePostAuthPath,
} from "./authNavigation";

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

  it("builds a protected-route login URL that preserves an internal destination", () => {
    const authPath = buildProtectedRouteAuthPath("/trips/42?tab=expenses");

    expect(authPath).toBe("/auth?next=%2Ftrips%2F42%3Ftab%3Dexpenses");
    expect(getSafePostAuthPath(authPath.slice("/auth".length))).toBe(
      "/trips/42?tab=expenses",
    );
  });

  it("falls back to home for an unsafe protected-route destination", () => {
    expect(buildProtectedRouteAuthPath("//evil.example")).toBe(
      "/auth?next=%2F",
    );
  });
});
