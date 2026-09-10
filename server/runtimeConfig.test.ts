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
  MERCHANDISE_SALES_MODE: "live",
  STRIPE_SECRET_KEY: "sk_live_placeholder",
  STRIPE_PUBLISHABLE_KEY: "pk_live_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
  PRINTFUL_API_KEY: "printful-key-placeholder",
  PRINTFUL_CONFIRM_ORDERS: "true",
  PRINTFUL_WEBHOOK_SECRET: "printful-webhook-secret-at-least-32-characters",
  AVIASALES_PARTNER_ID: "partner_123",
  AMADEUS_ENV: "production",
  AMADEUS_API_KEY_LIVE: "amadeus-live-key-placeholder",
  AMADEUS_API_SECRET_LIVE: "amadeus-live-secret-placeholder",
  VITE_SELLER_LEGAL_NAME: "ByeBi Test Seller",
  VITE_SELLER_CONTACT_EMAIL: "seller@example.com",
  VITE_SELLER_LEGAL_ADDRESS: "Test address 1, Rome",
  VITE_SELLER_COUNTRY: "Italy",
  TRANSACTIONAL_EMAIL_MODE: "live",
  RESEND_API_KEY: "re_placeholder",
  TRANSACTIONAL_EMAIL_FROM: "ByeBi <orders@updates.example.com>",
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
      /APP_BASE_URL is required; DATABASE_URL is required; SUPABASE_URL is required; SUPABASE_SERVICE_ROLE_KEY is required; OPENAI_API_KEY is required; STRIPE_SECRET_KEY is required; STRIPE_PUBLISHABLE_KEY is required; STRIPE_WEBHOOK_SECRET is required; PRINTFUL_API_KEY is required; PRINTFUL_WEBHOOK_SECRET is required; AVIASALES_PARTNER_ID is required; AMADEUS_API_KEY_LIVE is required; AMADEUS_API_SECRET_LIVE is required; MERCHANDISE_SALES_MODE is required; CRITICAL_DATA_PERSISTENCE must be database; AMADEUS_ENV must be production/,
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

  it("requires HTTPS for the public production URL", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        APP_BASE_URL: "http://byebi.example.com",
      }),
    ).toThrow("APP_BASE_URL must be an absolute HTTPS URL");
  });

  it("requires the live Amadeus environment in production", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        AMADEUS_ENV: "test",
      }),
    ).toThrow("AMADEUS_ENV must be production");
  });

  it("rejects invalid Aviasales partner identifiers", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        AVIASALES_PARTNER_ID: "partner id with spaces",
      }),
    ).toThrow("AVIASALES_PARTNER_ID has an invalid format");
  });

  it("rejects invalid Booking.com affiliate identifiers when configured", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        VITE_BOOKING_AFFILIATE_ID: "invalid id",
      }),
    ).toThrow("VITE_BOOKING_AFFILIATE_ID has an invalid format");
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

  it("requires a strong Printful webhook token", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        PRINTFUL_WEBHOOK_SECRET: "too-short",
      }),
    ).toThrow("PRINTFUL_WEBHOOK_SECRET must be at least 32 characters");
  });

  it("allows Stripe test keys only when production sales stay in test mode", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        MERCHANDISE_SALES_MODE: "test",
        STRIPE_SECRET_KEY: "sk_test_placeholder",
        STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
        VITE_SELLER_LEGAL_NAME: "",
        VITE_SELLER_CONTACT_EMAIL: "",
        VITE_SELLER_LEGAL_ADDRESS: "",
        VITE_SELLER_COUNTRY: "",
      }),
    ).not.toThrow();
  });

  it("blocks live sales when seller details are incomplete", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        VITE_SELLER_LEGAL_NAME: "",
        VITE_SELLER_CONTACT_EMAIL: "not-an-email",
        VITE_SELLER_LEGAL_ADDRESS: "",
        VITE_SELLER_COUNTRY: "",
      }),
    ).toThrow(
      /VITE_SELLER_LEGAL_NAME is required in live sales mode; VITE_SELLER_LEGAL_ADDRESS is required in live sales mode; VITE_SELLER_COUNTRY is required in live sales mode; VITE_SELLER_CONTACT_EMAIL must be a valid email address/,
    );
  });

  it("rejects live Stripe keys in test sales mode", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        MERCHANDISE_SALES_MODE: "test",
      }),
    ).toThrow(/Stripe test key in test sales mode/);
  });

  it("requires live transactional email before enabling live sales", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        TRANSACTIONAL_EMAIL_MODE: "disabled",
      }),
    ).toThrow("TRANSACTIONAL_EMAIL_MODE must be live when merchandise sales are live");
  });

  it("does not allow paid live orders to remain Printful drafts", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        PRINTFUL_CONFIRM_ORDERS: "false",
      }),
    ).toThrow("PRINTFUL_CONFIRM_ORDERS must be true in live sales mode");
  });

  it("requires a safe recipient when testing transactional email", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...validProductionEnvironment,
        MERCHANDISE_SALES_MODE: "test",
        STRIPE_SECRET_KEY: "sk_test_placeholder",
        STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
        TRANSACTIONAL_EMAIL_MODE: "test",
        TRANSACTIONAL_EMAIL_TEST_RECIPIENT: "",
      }),
    ).toThrow("TRANSACTIONAL_EMAIL_TEST_RECIPIENT is required in test email mode");
  });
});
