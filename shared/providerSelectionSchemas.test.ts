import { describe, expect, it } from "vitest";
import {
  createProviderSearchFingerprint,
  providerSelectionSchema,
} from "./providerSelectionSchemas";

const search = {
  origin: "Roma",
  destination: "Barcellona",
  startDate: "2026-11-20",
  endDate: "2026-11-23",
  participants: 8,
  preferences: ["Nightlife", "Food"],
};

describe("provider selection contracts", () => {
  it("creates a deterministic provider fingerprint independent of whitespace and preferences", () => {
    expect(createProviderSearchFingerprint(search)).toBe(createProviderSearchFingerprint({
      ...search,
      origin: " roma ",
      preferences: ["Museums"],
    }));
  });

  it.each([
    { origin: "Milano" },
    { destination: "Praga" },
    { startDate: "2026-11-21" },
    { endDate: "2026-11-24" },
    { participants: 9 },
  ])("invalidates when material search input changes: %o", (change) => {
    expect(createProviderSearchFingerprint({ ...search, ...change })).not.toBe(
      createProviderSearchFingerprint(search),
    );
  });

  it("rejects unknown versions and raw extra provider data", () => {
    const base = {
      version: 1,
      searchFingerprint: createProviderSearchFingerprint(search),
      updatedAt: "2026-09-26T10:00:00.000Z",
    };
    expect(providerSelectionSchema.safeParse(base).success).toBe(true);
    expect(providerSelectionSchema.safeParse({ ...base, version: 2 }).success).toBe(false);
    expect(providerSelectionSchema.safeParse({ ...base, rawProviderPayload: {} }).success).toBe(false);
  });
});
