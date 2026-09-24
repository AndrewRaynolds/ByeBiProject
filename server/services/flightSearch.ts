import { buildAviasalesUrl } from "@shared/flightSchemas";
import {
  searchFlights,
  type FlightResult,
  type FlightSearchParams,
} from "./amadeus-flights";

export type CheckoutFlight = {
  flightId: string;
  airline: string;
  price: number;
  currency: string;
  departureAt?: string;
  returnAt?: string;
  stops: number;
  duration: string;
  direct: boolean;
  bookingFlow: "REDIRECT";
  checkoutUrl: string;
};

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

export type FlightCheckoutSearchResult = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers: number;
  checkoutAdults: number;
  groupBookingRequired: boolean;
  currency: string;
  checkoutUrl: string;
  flightDataStatus: "live" | "unavailable";
  flights: CheckoutFlight[];
};

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

    const flights = [...flightResults].sort(compareCheckoutFlights).slice(0, 5).map((flight, index) => ({
      flightId: `flight-${index + 1}`,
      airline: flight.airlines.join(", "),
      price: flight.price,
      currency: flight.currency,
      departureAt: flight.outbound[0]?.departure.at,
      returnAt: flight.inbound?.[0]?.departure.at,
      stops: flight.stops,
      duration: flight.totalDuration,
      direct: flight.stops === 0,
      bookingFlow: "REDIRECT" as const,
      checkoutUrl,
    }));

    return {
      ...baseResult,
      flightDataStatus: "live",
      flights,
    };
  } catch (error: unknown) {
    dependencies.onProviderError?.(error);
    return {
      ...baseResult,
      flightDataStatus: "unavailable",
      flights: [],
    };
  }
}
