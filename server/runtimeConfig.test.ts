import { describe, expect, it } from "vitest";
import { validateRuntimeEnvironment } from "./runtimeConfig";

const validProductionEnvironment = {
  NODE_ENV: "production",
  APP_BASE_URL: "https://byebi.example.com",
  DATABASE_URL: "postgresql://user:password@db.example.com:5432/byebi",
  CRITICAL_DATA_PERSISTENCE: "database",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-placeholder",
  OPENAI_API_KEY: "openai-key-placeholder",
  AVIASALES_PARTNER_ID: "partner_123",
  PORT: "5000",
  HOST: "0.0.0.0",
};

describe("runtime environment validation", () => {
  it("accepts a complete production environment", () => {
    expect(() =>
      validateRuntimeEnvironment(validProductionEnvironment),
    ).not.toThrow();
  });

  it("does not require production services during local development", () => {
    expect(() =>
      validateRuntimeEnvironment({ NODE_ENV: "development" }),
    ).not.toThrow();
  });

  it("reports all missing production variables together", () => {
    expect(() =>
      validateRuntimeEnvironment({ NODE_ENV: "production" }),
    ).toThrow(
      /APP_BASE_URL is required; DATABASE_URL is required; SUPABASE_URL is required; SUPABASE_SERVICE_ROLE_KEY is required; OPENAI_API_KEY is required; AVIASALES_PARTNER_ID is required; CRITICAL_DATA_PERSISTENCE must be database/,
    );
  });

  it("rejects non-PostgreSQL database URLs", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        DATABASE_URL: "https://db.example.com/byebi",
      }),
    ).toThrow("DATABASE_URL must be a PostgreSQL URL");
  });

  it("requires HTTPS for the production Supabase endpoint", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        SUPABASE_URL: "http://project.supabase.co",
      }),
    ).toThrow("SUPABASE_URL must be an HTTPS URL");
  });

  it("rejects invalid Aviasales partner identifiers", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        AVIASALES_PARTNER_ID: "partner id with spaces",
      }),
    ).toThrow("AVIASALES_PARTNER_ID has an invalid format");
  });

  it("rejects invalid ports and empty hosts", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        PORT: "70000",
        HOST: " ",
      }),
    ).toThrow(
      /PORT must be an integer between 1 and 65535; HOST cannot be empty/,
    );
  });
});
