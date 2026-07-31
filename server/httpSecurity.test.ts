import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./httpSecurity";

describe("HTTP security policy", () => {
  it("keeps CSP disabled for the Vite development server", () => {
    expect(
      buildContentSecurityPolicy(
        "development",
        "https://project.supabase.co",
      ),
    ).toBe(false);
  });

  it("blocks third-party scripts in production", () => {
    const policy = buildContentSecurityPolicy(
      "production",
      "https://project.supabase.co",
    );

    expect(policy).not.toBe(false);
    if (policy === false) return;

    expect(policy.directives.scriptSrc).toEqual(["'self'"]);
    expect(policy.directives.objectSrc).toEqual(["'none'"]);
    expect(policy.directives.frameAncestors).toEqual(["'none'"]);
  });

  it("allows the configured Supabase origin without opening connect-src", () => {
    const policy = buildContentSecurityPolicy(
      "production",
      "https://auth.example.com/path",
    );

    expect(policy).not.toBe(false);
    if (policy === false) return;

    expect(policy.directives.connectSrc).toContain("https://auth.example.com");
    expect(policy.directives.connectSrc).not.toContain("https:");
  });

  it("ignores malformed Supabase URLs", () => {
    const policy = buildContentSecurityPolicy("production", "not a URL");

    expect(policy).not.toBe(false);
    if (policy === false) return;

    expect(policy.directives.connectSrc).toEqual([
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
    ]);
  });
});
