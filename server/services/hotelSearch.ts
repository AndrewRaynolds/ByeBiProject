import {
  hotelSearchResponseSchema,
  type HotelResult,
  type HotelSearchQuery,
} from "@shared/hotelSchemas";
import { searchHotels } from "./amadeus-hotels";

export type HotelCheckoutSearchResult = HotelSearchQuery & {
  hotelDataStatus: "live" | "unavailable";
  fetchedAt: string;
  hotels: HotelResult[];
};

type HotelSearchDependencies = {
  search?: (params: HotelSearchQuery) => Promise<HotelResult[]>;
  onProviderError?: (error: unknown) => void;
};

export function compareCheckoutHotels(a: HotelResult, b: HotelResult): number {
  return a.priceTotal - b.priceTotal
    || a.name.localeCompare(b.name)
    || a.hotelId.localeCompare(b.hotelId);
}

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
    return hotelSearchResponseSchema.parse({
      ...baseResult,
      hotelDataStatus: "live",
      fetchedAt: new Date().toISOString(),
      hotels: [...hotels].sort(compareCheckoutHotels),
    });
  } catch (error: unknown) {
    dependencies.onProviderError?.(error);
    return hotelSearchResponseSchema.parse({
      ...baseResult,
      hotelDataStatus: "unavailable",
      fetchedAt: new Date().toISOString(),
      hotels: [],
    });
  }
}
