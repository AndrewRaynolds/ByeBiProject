import { describe, expect, it } from "vitest";
import { chooseStripeWebhookSecret, getManagedStripeWebhookUrl } from "./stripeClient";

describe("managed Stripe webhook URL", () => {
  it("uses APP_BASE_URL only for a production Replit deployment", () => {
    expect(getManagedStripeWebhookUrl({
      NODE_ENV: "production",
      REPLIT_DEPLOYMENT: "1",
      APP_BASE_URL: "https://byebi.it",
    })).toBe("https://byebi.it/api/stripe/webhook");
  });

  it.each([
    {
      NODE_ENV: "development",
      REPLIT_DEPLOYMENT: undefined,
      APP_BASE_URL: "https://byebi.it",
      REPLIT_DOMAINS: "preview.picard.replit.dev",
    },
    {
      NODE_ENV: "production",
      REPLIT_DEPLOYMENT: undefined,
      APP_BASE_URL: "https://byebi.it",
    },
    {
      NODE_ENV: "production",
      REPLIT_DEPLOYMENT: "1",
      APP_BASE_URL: "http://byebi.it",
    },
    {
      NODE_ENV: "production",
      REPLIT_DEPLOYMENT: "1",
      APP_BASE_URL: undefined,
    },
  ])("does not manage the webhook for unsafe or non-production environments", (env) => {
    expect(getManagedStripeWebhookUrl(env)).toBeNull();
  });

  it("ignores temporary Replit domains when the public base URL is configured", () => {
    expect(getManagedStripeWebhookUrl({
      NODE_ENV: "production",
      REPLIT_DEPLOYMENT: "1",
      APP_BASE_URL: "https://byebi.it",
      REPLIT_DOMAINS: "temporary.picard.replit.dev",
    })).toBe("https://byebi.it/api/stripe/webhook");
  });
});


describe("Stripe webhook secret selection", () => {
  it("prefers the secret stored for the active managed webhook", () => {
    expect(chooseStripeWebhookSecret("whsec_managed", "whsec_configured")).toBe("whsec_managed");
  });

  it("falls back to the configured secret outside managed deployments", () => {
    expect(chooseStripeWebhookSecret(null, "whsec_configured")).toBe("whsec_configured");
  });

  it("returns null when no signing secret is available", () => {
    expect(chooseStripeWebhookSecret(undefined, undefined)).toBeNull();
  });
});
