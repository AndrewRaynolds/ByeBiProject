import {
  buildAviasalesUrl,
  flightCheckoutSearchResponseSchema,
  type FlightCheckoutSearchResponse,
} from "@shared/flightSchemas";
import {
  searchFlights,
  type FlightResult,
  type FlightSearchParams,
} from "./amadeus-flights";

export type FlightCheckoutSearchInput = {
  originIata: string;
  destinationIata: string;
  departDate: string;
  returnDate?: string;
  passengers: number;
  checkoutAdults: number;
  currency: string;
  partnerId: string;
};

export type FlightCheckoutSearchResult = FlightCheckoutSearchResponse;

type FlightSearchDependencies = {
  search?: (params: FlightSearchParams) => Promise<FlightResult[]>;
  onProviderError?: (error: unknown) => void;
};

function durationMinutes(duration: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(duration);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

export function compareCheckoutFlights(a: FlightResult, b: FlightResult): number {
  return a.price - b.price
    || a.stops - b.stops
    || durationMinutes(a.totalDuration) - durationMinutes(b.totalDuration)
    || a.airlines.join(", ").localeCompare(b.airlines.join(", "))
    || (a.outbound[0]?.departure.at ?? "").localeCompare(b.outbound[0]?.departure.at ?? "")
    || a.id.localeCompare(b.id);
}

export async function searchFlightsForCheckout(
  input: FlightCheckoutSearchInput,
  dependencies: FlightSearchDependencies = {},
): Promise<FlightCheckoutSearchResult | null> {
  const checkoutUrl = buildAviasalesUrl({
    originIata: input.originIata,
    destinationIata: input.destinationIata,
    departDate: input.departDate,
    returnDate: input.returnDate,
    adults: input.checkoutAdults,
    partnerId: input.partnerId,
  });
  if (!checkoutUrl) return null;

  const baseResult = {
    origin: input.originIata,
    destination: input.destinationIata,
    departDate: input.departDate,
    returnDate: input.returnDate,
    passengers: input.passengers,
    checkoutAdults: input.checkoutAdults,
    groupBookingRequired: input.passengers > input.checkoutAdults,
    currency: input.currency,
    checkoutUrl,
    handoff: {
      provider: "aviasales" as const,
      url: checkoutUrl,
      exactOffer: false as const,
    },
  };

  try {
    const flightResults = await (dependencies.search ?? searchFlights)({
      originCode: input.originIata,
      destinationCode: input.destinationIata,
      departureDate: input.departDate,
      returnDate: input.returnDate,
      adults: input.checkoutAdults,
      currency: input.currency,
    });

    const flights = [...flightResults].sort(compareCheckoutFlights).slice(0, 5).map((flight) => ({
      provider: "amadeus" as const,
      offerId: flight.id,
      airlines: flight.airlines,
      outbound: flight.outbound,
      inbound: flight.inbound,
      price: flight.price,
      currency: flight.currency,
      priceScope: "searched-passengers-total" as const,
      quotedPassengers: input.checkoutAdults,
      requestedPassengers: input.passengers,
      stops: flight.stops,
      totalDuration: flight.totalDuration,
    }));

    return flightCheckoutSearchResponseSchema.parse({
      ...baseResult,
      flightDataStatus: "live",
      fetchedAt: new Date().toISOString(),
      flights,
    });
  } catch (error: unknown) {
    dependencies.onProviderError?.(error);
    return flightCheckoutSearchResponseSchema.parse({
      ...baseResult,
      flightDataStatus: "unavailable",
      fetchedAt: new Date().toISOString(),
      flights: [],
    });
  }
}
