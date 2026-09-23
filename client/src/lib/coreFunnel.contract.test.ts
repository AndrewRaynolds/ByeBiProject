import { describe, expect, it } from "vitest";
import {
  buildAviasalesUrl,
  getAviasalesAdultCount,
  isAviasalesCheckoutUrl,
} from "@shared/flightSchemas";
import { createChatCheckoutContext } from "./chatCheckout";
import { buildBookingSearchUrl, isMonetizedAviasalesUrl } from "./affiliateLinks";
import { getGetYourGuideCityLink } from "./getyourguide";
import { isAllowedExternalUrl } from "./externalNavigation";

const baseArguments = {
  origin: "Roma",
  destination: "Barcellona",
  departure_date: "2026-10-10",
  return_date: "2026-10-13",
};

describe("core travel funnel contract", () => {
  it.each([
    [1, 1],
    [9, 9],
    [10, 9],
    [50, 9],
  ])(
    "preserves a %i-person group while Aviasales searches for %i adults",
    (people, expectedAviasalesAdults) => {
      const checkoutAdults = getAviasalesAdultCount(people);
      expect(checkoutAdults).toBe(expectedAviasalesAdults);

      const aviasalesCheckoutUrl = buildAviasalesUrl({
        originIata: "ROM",
        destinationIata: "BCN",
        departDate: baseArguments.departure_date,
        returnDate: baseArguments.return_date,
        adults: checkoutAdults!,
        partnerId: "685469",
      });

      expect(aviasalesCheckoutUrl).not.toBeNull();
      expect(isAviasalesCheckoutUrl(aviasalesCheckoutUrl!)).toBe(true);
      expect(isMonetizedAviasalesUrl(aviasalesCheckoutUrl!)).toBe(true);

      const trip = createChatCheckoutContext(
        { ...baseArguments, passengers: people },
        {
          checkoutReady: true,
          checkoutUrl: aviasalesCheckoutUrl,
          checkoutAdults,
          groupBookingRequired: people > checkoutAdults!,
        },
      );

      expect(trip).toMatchObject({
        origin: "Roma",
        destination: "Barcellona",
        startDate: "2026-10-10",
        endDate: "2026-10-13",
        people,
        aviasalesCheckoutUrl,
      });

      const bookingUrl = new URL(buildBookingSearchUrl({
        destination: trip!.destination,
        checkInDate: trip!.startDate,
        checkOutDate: trip!.endDate,
        adults: trip!.people,
        affiliateId: "123456",
      }));

      expect(bookingUrl.hostname).toBe("www.booking.com");
      expect(bookingUrl.searchParams.get("ss")).toBe("Barcellona");
      expect(bookingUrl.searchParams.get("checkin")).toBe(trip!.startDate);
      expect(bookingUrl.searchParams.get("checkout")).toBe(trip!.endDate);
      expect(bookingUrl.searchParams.get("group_adults")).toBe(String(people));
      expect(bookingUrl.searchParams.get("aid")).toBe("123456");
      expect(isAllowedExternalUrl(bookingUrl.toString())).toBe(true);

      const activitiesUrl = getGetYourGuideCityLink(trip!.destination);
      expect(activitiesUrl).toMatch(/^https:\/\/gyg\.me\//);
      expect(isAllowedExternalUrl(activitiesUrl!)).toBe(true);
    },
  );

  it.each([
    [{ ...baseArguments, origin: "", passengers: 4 }, "https://www.aviasales.com/search/ROM1010BCN13104?marker=685469"],
    [{ ...baseArguments, return_date: "2026-10-09", passengers: 4 }, "https://www.aviasales.com/search/ROM1010BCN13104?marker=685469"],
    [{ ...baseArguments, passengers: 51 }, "https://www.aviasales.com/search/ROM1010BCN13109?marker=685469"],
    [{ ...baseArguments, passengers: 4 }, "https://example.com/search/ROM1010BCN13104?marker=685469"],
  ])("rejects unsafe or inconsistent chat-to-checkout data", (args, checkoutUrl) => {
    expect(createChatCheckoutContext(args, {
      checkoutReady: true,
      checkoutUrl,
    })).toBeNull();
  });
});
