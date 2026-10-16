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

describe("OAuth-safe internal return paths", () => {
  it.each(["/foo/..//evil.example", "/\\evil.example", "/\nevil", "/auth", "/auth/callback?code=bad", "/foo/../auth/reset-password", "//evil.example", "https://evil.example", "javascript:alert(1)"])("rejects external, ambiguous or authentication-loop target %s", next => {
    expect(getSafePostAuthPath(`?next=${encodeURIComponent(next)}`)).toBe("/");
  });
  it("normalizes an internal path while preserving its own query and fragment", () => {
    expect(getSafePostAuthPath("?next="+encodeURIComponent("/trips/42?tab=expenses#notes"))).toBe("/trips/42?tab=expenses#notes");
  });
});
