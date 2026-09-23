import { describe, expect, it, vi } from "vitest";
import { searchFlightsForCheckout } from "./flightSearch";

const input = {
  originIata: "ROM",
  destinationIata: "BCN",
  departDate: "2026-11-20",
  returnDate: "2026-11-23",
  passengers: 12,
  checkoutAdults: 9,
  currency: "EUR",
  partnerId: "685469",
};

describe("searchFlightsForCheckout", () => {
  it("keeps checkout available when Amadeus is unavailable", async () => {
    const providerError = new Error("provider gone");
    const onProviderError = vi.fn();

    const result = await searchFlightsForCheckout(input, {
      search: vi.fn().mockRejectedValue(providerError),
      onProviderError,
    });

    expect(result).toMatchObject({
      origin: "ROM",
      destination: "BCN",
      passengers: 12,
      checkoutAdults: 9,
      groupBookingRequired: true,
      flightDataStatus: "unavailable",
      flights: [],
    });
    expect(result?.checkoutUrl).toContain("https://www.aviasales.com/search/ROM2011BCN23119");
    expect(onProviderError).toHaveBeenCalledWith(providerError);
  });

  it("adds the same Aviasales checkout URL to live offers", async () => {
    const result = await searchFlightsForCheckout(input, {
      search: vi.fn().mockResolvedValue([
        {
          id: "offer-1",
          price: 199.5,
          currency: "EUR",
          outbound: [{
            departure: { iataCode: "FCO", at: "2026-11-20T10:00:00" },
            arrival: { iataCode: "BCN", at: "2026-11-20T12:00:00" },
            carrierCode: "VY",
            flightNumber: "6101",
            duration: "PT2H",
          }],
          inbound: [{
            departure: { iataCode: "BCN", at: "2026-11-23T18:00:00" },
            arrival: { iataCode: "FCO", at: "2026-11-23T20:00:00" },
            carrierCode: "VY",
            flightNumber: "6102",
            duration: "PT2H",
          }],
          airlines: ["Vueling"],
          totalDuration: "PT2H",
          stops: 0,
        },
      ]),
    });

    expect(result?.flightDataStatus).toBe("live");
    expect(result?.flights).toHaveLength(1);
    expect(result?.flights[0]?.checkoutUrl).toBe(result?.checkoutUrl);
  });

  it("rejects an invalid partner identifier instead of emitting an unsafe URL", async () => {
    await expect(searchFlightsForCheckout({
      ...input,
      partnerId: "bad partner id",
    }, {
      search: vi.fn(),
    })).resolves.toBeNull();
  });
});
