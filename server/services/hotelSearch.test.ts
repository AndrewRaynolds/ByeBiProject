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
      hotels: [],
    });
    expect(onProviderError).toHaveBeenCalledWith(providerError);
  });

  it("returns real provider results without changing the requested group", async () => {
    const hotel = {
      hotelId: "HOTEL-1",
      name: "Hotel Test",
      stars: "4",
      priceTotal: 320,
      currency: "EUR",
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
      hotels: [hotel],
    });
  });
});
