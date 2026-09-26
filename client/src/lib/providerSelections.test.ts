/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { PROVIDER_SELECTION_STORAGE_KEY } from "@shared/providerSelectionSchemas";
import { loadProviderSelections, saveProviderSelections } from "./providerSelections";

describe("provider selection persistence", () => {
  beforeEach(() => localStorage.clear());

  it("restores only the matching search fingerprint", () => {
    saveProviderSelections(localStorage, { searchFingerprint: "provider-search-v1:1234abcd", selectedHotel: {
      provider: "amadeus",
      hotelId: "H1",
      offerId: "O1",
      name: "Hotel",
      checkInDate: "2026-11-20",
      checkOutDate: "2026-11-23",
      priceTotal: 300,
      currency: "EUR",
      priceScope: "quoted-occupancy-total-stay",
      quotedAdults: 2,
      requestedAdults: 8,
    } });
    expect(loadProviderSelections(localStorage, "provider-search-v1:1234abcd")?.selectedHotel?.offerId).toBe("O1");
    expect(loadProviderSelections(localStorage, "provider-search-v1:ffffffff")).toBeNull();
    expect(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)).toBeNull();
  });

  it.each(["not json", JSON.stringify({ version: 99 })])("fails safely for corrupt or unknown state", (value) => {
    localStorage.setItem(PROVIDER_SELECTION_STORAGE_KEY, value);
    expect(loadProviderSelections(localStorage, "provider-search-v1:1234abcd")).toBeNull();
    expect(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)).toBeNull();
  });
});
