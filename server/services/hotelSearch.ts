import type { HotelResult, HotelSearchQuery } from "@shared/hotelSchemas";
import { searchHotels } from "./amadeus-hotels";

export type HotelCheckoutSearchResult = HotelSearchQuery & {
  hotelDataStatus: "live" | "unavailable";
  hotels: HotelResult[];
};

type HotelSearchDependencies = {
  search?: (params: HotelSearchQuery) => Promise<HotelResult[]>;
  onProviderError?: (error: unknown) => void;
};

export async function searchHotelsForCheckout(
  input: HotelSearchQuery,
  dependencies: HotelSearchDependencies = {},
): Promise<HotelCheckoutSearchResult> {
  const baseResult = {
    cityCode: input.cityCode,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    adults: input.adults,
    currency: input.currency,
  };

  try {
    const hotels = await (dependencies.search ?? searchHotels)(input);
    return {
      ...baseResult,
      hotelDataStatus: "live",
      hotels,
    };
  } catch (error: unknown) {
    dependencies.onProviderError?.(error);
    return {
      ...baseResult,
      hotelDataStatus: "unavailable",
      hotels: [],
    };
  }
}
