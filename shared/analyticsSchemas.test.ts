import { describe, expect, it } from "vitest";
import { affiliateClickEventSchema } from "./analyticsSchemas";

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
