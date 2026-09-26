import { describe, expect, it, vi } from "vitest";
import {
  getAmadeusRuntimeDiagnostics,
  logAmadeusRuntimeDiagnostics,
  resolveAmadeusConfig,
  resolveAmadeusEnvironment,
} from "./amadeusConfig";

describe("Amadeus runtime configuration", () => {
  it.each(["production", "prod", "live"])("selects the live endpoint for %s", (value) => {
    expect(resolveAmadeusEnvironment({ AMADEUS_ENV: value })).toBe("production");
  });

  it("defaults production runtimes to live and local runtimes to test", () => {
    expect(resolveAmadeusEnvironment({ NODE_ENV: "production" })).toBe("production");
    expect(resolveAmadeusEnvironment({ NODE_ENV: "development" })).toBe("test");
  });

  it("prefers environment-specific credentials and supports the legacy pair", () => {
    expect(resolveAmadeusConfig({
      AMADEUS_ENV: "production",
      AMADEUS_API_KEY_LIVE: "live-key",
      AMADEUS_API_SECRET_LIVE: "live-secret",
      AMADEUS_API_KEY: "legacy-key",
      AMADEUS_API_SECRET: "legacy-secret",
    })).toMatchObject({ environment: "production", credentialSource: "live", apiKey: "live-key" });
    expect(resolveAmadeusConfig({
      AMADEUS_ENV: "production",
      AMADEUS_API_KEY: "legacy-key",
      AMADEUS_API_SECRET: "legacy-secret",
    })).toMatchObject({ environment: "production", credentialSource: "legacy", apiKey: "legacy-key" });
  });

  it("reports presence without logging credential values", () => {
    const env = {
      AMADEUS_ENV: "production",
      AMADEUS_API_KEY_LIVE: "do-not-log-key",
      AMADEUS_API_SECRET_LIVE: "do-not-log-secret",
    };
    expect(getAmadeusRuntimeDiagnostics(env)).toMatchObject({
      environment: "production", credentialSource: "live", credentialsPresent: true,
      liveKeyPresent: true, liveSecretPresent: true,
    });
    const logger = vi.fn();
    logAmadeusRuntimeDiagnostics(env, logger);
    const serialized = JSON.stringify(logger.mock.calls);
    expect(serialized).not.toContain("do-not-log-key");
    expect(serialized).not.toContain("do-not-log-secret");
  });
});
