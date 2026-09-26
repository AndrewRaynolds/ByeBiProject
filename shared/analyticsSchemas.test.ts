import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  affiliateClickEventSchema,
  coreProductEventNames,
  discoveryEventNames,
  productEventNames,
  productEventSchema,
  productFunnelEventOrder,
} from "./analyticsSchemas";

const validEvent = {
  sessionId: "123e4567-e89b-42d3-a456-426614174000",
  provider: "aviasales",
  placement: "checkout_flight",
  brand: "byebro",
  destination: "Roma",
  monetized: true,
};

describe("affiliate click event schema", () => {
  it("accepts the privacy-preserving event contract", () => {
    expect(affiliateClickEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it("rejects arbitrary metadata and personal data fields", () => {
    expect(affiliateClickEventSchema.safeParse({
      ...validEvent,
      email: "traveler@example.com",
    }).success).toBe(false);
  });

  it("rejects unsupported providers and invalid session ids", () => {
    expect(affiliateClickEventSchema.safeParse({
      ...validEvent,
      provider: "unknown",
      sessionId: "not-a-uuid",
    }).success).toBe(false);
  });
});

describe("product event schema", () => {
  it("accepts only the allowlisted, anonymous product event fields", () => {
    expect(productEventSchema.safeParse({
      sessionId: validEvent.sessionId,
      eventName: "trip_saved",
      brand: "byebro",
    }).success).toBe(true);

    expect(productEventSchema.safeParse({
      sessionId: validEvent.sessionId,
      eventName: "trip_saved",
      brand: "byebro",
      email: "traveler@example.com",
    }).success).toBe(false);
  });

  it("rejects unrecognized event names", () => {
    expect(productEventSchema.safeParse({
      sessionId: validEvent.sessionId,
      eventName: "chat_message",
      brand: "byebro",
    }).success).toBe(false);
  });

  it("uses signup_submitted instead of signup_completed", () => {
    expect(productEventSchema.safeParse({
      sessionId: validEvent.sessionId,
      eventName: "signup_submitted",
      brand: "byebro",
    }).success).toBe(true);

    expect(productEventSchema.safeParse({
      sessionId: validEvent.sessionId,
      eventName: "signup_completed",
      brand: "byebro",
    }).success).toBe(false);
  });

  it("accepts allowlisted discovery events without arbitrary payloads", () => {
    expect(productEventSchema.safeParse({
      sessionId: validEvent.sessionId,
      eventName: "experiences_ai_handoff",
      brand: "byebride",
    }).success).toBe(true);
    expect(productEventSchema.safeParse({
      sessionId: validEvent.sessionId,
      eventName: "experience_item_clicked",
      brand: "byebro",
      url: "https://example.com/private-payload",
    }).success).toBe(false);
  });

  it("keeps discovery events outside the linear product funnel", () => {
    expect(productFunnelEventOrder).toEqual([
      ...coreProductEventNames.slice(0, 8),
      "provider_click",
      coreProductEventNames[8],
    ]);
    expect(productFunnelEventOrder).not.toEqual(expect.arrayContaining(discoveryEventNames));
  });

  it("keeps the database event constraint aligned with the shared allowlist", () => {
    const migration = readFileSync(
      new URL("../supabase/migrations/20260926120000_allow_discovery_product_events.sql", import.meta.url),
      "utf8",
    );
    const checkValues = migration
      .match(/CHECK\s*\(event_name\s+IN\s*\(([\s\S]*?)\)\)/i)?.[1]
      .match(/'([^']+)'/g)
      ?.map((value) => value.slice(1, -1));

    expect(checkValues).toEqual([...productEventNames]);
  });
});
