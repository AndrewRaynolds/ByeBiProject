import { describe, expect, it, vi } from "vitest";
import { searchHotelsForCheckout } from "./hotelSearch";

const input = {
  cityCode: "BCN",
  checkInDate: "2026-11-20",
  checkOutDate: "2026-11-23",
  adults: 12,
  currency: "EUR",
};

describe("searchHotelsForCheckout", () => {
  it("keeps the Booking fallback contract available when Amadeus fails", async () => {
    const providerError = new Error("provider gone");
    const onProviderError = vi.fn();

    const result = await searchHotelsForCheckout(input, {
      search: vi.fn().mockRejectedValue(providerError),
      onProviderError,
    });

    expect(result).toEqual({
      ...input,
      hotelDataStatus: "unavailable",
      fetchedAt: expect.any(String),
      hotels: [],
    });
    expect(onProviderError).toHaveBeenCalledWith(providerError);
  });

  it("returns real provider results without changing the requested group", async () => {
    const hotel = {
      provider: "amadeus" as const,
      hotelId: "HOTEL-1",
      name: "Hotel Test",
      stars: "4",
      priceTotal: 320,
      currency: "EUR",
      priceScope: "quoted-occupancy-total-stay" as const,
      quotedAdults: 2,
      requestedAdults: 12,
      offerId: "OFFER-1",
      bookingFlow: "REDIRECT" as const,
      paymentPolicy: "PREPAY" as const,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
    };

    const result = await searchHotelsForCheckout(input, {
      search: vi.fn().mockResolvedValue([hotel]),
    });

    expect(result).toEqual({
      ...input,
      hotelDataStatus: "live",
      fetchedAt: expect.any(String),
      hotels: [hotel],
    });
  });

  it("orders hotels by total price with deterministic tie-breakers", async () => {
    const hotel = (hotelId: string, name: string, priceTotal: number) => ({
      provider: "amadeus" as const,
      hotelId,
      name,
      stars: "4",
      priceTotal,
      currency: "EUR",
      priceScope: "quoted-occupancy-total-stay" as const,
      quotedAdults: 2,
      requestedAdults: 12,
      offerId: `OFFER-${hotelId}`,
      bookingFlow: "REDIRECT" as const,
      paymentPolicy: "PREPAY" as const,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
    });
    const result = await searchHotelsForCheckout(input, {
      search: vi.fn().mockResolvedValue([
        hotel("3", "Costoso", 500),
        hotel("2", "Zeta", 250),
        hotel("1", "Alfa", 250),
      ]),
    });

    expect(result.hotels.map(({ hotelId }) => hotelId)).toEqual(["1", "2", "3"]);
  });
});
