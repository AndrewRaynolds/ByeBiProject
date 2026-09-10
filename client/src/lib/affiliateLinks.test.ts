import { describe, expect, it } from "vitest";
import {
  buildBookingSearchUrl,
  isMonetizedAviasalesUrl,
} from "./affiliateLinks";

describe("affiliate links", () => {
  it("builds a Booking search URL with an affiliate id", () => {
    const url = new URL(buildBookingSearchUrl({
      destination: "Roma",
      hotelName: "Hotel Test",
      checkInDate: "2026-09-10",
      checkOutDate: "2026-09-12",
      adults: 4,
      affiliateId: "123456",
    }));

    expect(url.origin).toBe("https://www.booking.com");
    expect(url.searchParams.get("ss")).toBe("Hotel Test Roma");
    expect(url.searchParams.get("checkin")).toBe("2026-09-10");
    expect(url.searchParams.get("checkout")).toBe("2026-09-12");
    expect(url.searchParams.get("group_adults")).toBe("4");
    expect(url.searchParams.get("aid")).toBe("123456");
  });

  it("omits an invalid Booking affiliate id", () => {
    const url = new URL(buildBookingSearchUrl({
      destination: "Roma",
      adults: 2,
      affiliateId: "invalid id",
    }));

    expect(url.searchParams.has("aid")).toBe(false);
  });

  it("recognizes only configured-looking Aviasales partner links", () => {
    expect(isMonetizedAviasalesUrl(
      "https://www.aviasales.com/search/MIL1009ROM12092?marker=685469",
    )).toBe(true);
    expect(isMonetizedAviasalesUrl(
      "https://www.aviasales.com/search/MIL1009ROM12092?marker=byebi",
    )).toBe(false);
    expect(isMonetizedAviasalesUrl("https://example.com/?marker=685469")).toBe(false);
  });
});
