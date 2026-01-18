// server/services/amadeus-flights.ts
import axios from "axios";

export type FlightSearchParams = {
  originCode: string;      // IATA code, e.g., "FCO"
  destinationCode: string; // IATA code, e.g., "BCN"
  departureDate: string;   // "2026-05-15"
  returnDate?: string;     // "2026-05-20" (optional for one-way)
  adults: number;          // 1-9
  currency?: string;       // "EUR"
};

export type FlightSegment = {
  departure: {
    iataCode: string;
    terminal?: string;
    at: string; // ISO datetime
  };
  arrival: {
    iataCode: string;
    terminal?: string;
    at: string;
  };
  carrierCode: string;
  carrierName?: string;
  flightNumber: string;
  duration: string; // e.g., "PT2H30M"
};

export type FlightResult = {
  id: string;
  price: number;
  currency: string;
  outbound: FlightSegment[];
  inbound?: FlightSegment[];
  airlines: string[];
  totalDuration: string;
  stops: number;
};

const isProd = process.env.NODE_ENV === "production";
const useAmadeusLive = process.env.AMADEUS_ENV === "production";

const AMADEUS_API_KEY = useAmadeusLive
  ? process.env.AMADEUS_API_KEY_LIVE
  : process.env.AMADEUS_API_KEY_TEST;

const AMADEUS_API_SECRET = useAmadeusLive
  ? process.env.AMADEUS_API_SECRET_LIVE
  : process.env.AMADEUS_API_SECRET_TEST;

if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
  console.error(
    `[Amadeus Flights] Missing credentials for ${useAmadeusLive ? "LIVE" : "TEST"} environment`
  );
}

const AMADEUS_BASE_URL = useAmadeusLive
  ? "https://api.amadeus.com"
  : "https://test.api.amadeus.com";

let tokenCache: { token: string | null; expiresAt: number } = {
  token: null,
  expiresAt: 0,
};

async function getAmadeusToken(): Promise<string> {
  if (tokenCache.token && tokenCache.expiresAt > Date.now() + 10_000) {
    return tokenCache.token;
  }

  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    throw new Error("Amadeus credentials are not configured");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: AMADEUS_API_KEY,
    client_secret: AMADEUS_API_SECRET,
  });

  const resp = await axios.post(
    `${AMADEUS_BASE_URL}/v1/security/oauth2/token`,
    body,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  tokenCache = {
    token: resp.data.access_token,
    expiresAt: Date.now() + (resp.data.expires_in - 60) * 1000,
  };

  return tokenCache.token!;
}

// Airline code to name mapping (common carriers)
const AIRLINE_NAMES: Record<string, string> = {
  "IB": "Iberia",
  "VY": "Vueling",
  "UX": "Air Europa",
  "AZ": "ITA Airways",
  "LH": "Lufthansa",
  "AF": "Air France",
  "KL": "KLM",
  "BA": "British Airways",
  "LX": "Swiss",
  "OS": "Austrian",
  "SN": "Brussels Airlines",
  "TP": "TAP Portugal",
  "TK": "Turkish Airlines",
  "EW": "Eurowings",
  "A3": "Aegean",
  "FR": "Ryanair",
  "U2": "easyJet",
  "W6": "Wizz Air",
};

export async function searchFlights(
  params: FlightSearchParams
): Promise<FlightResult[]> {
  const {
    originCode,
    destinationCode,
    departureDate,
    returnDate,
    adults,
    currency = "EUR",
  } = params;

  const token = await getAmadeusToken();

  console.log("🔍 Amadeus Flight Search request:", {
    originCode,
    destinationCode,
    departureDate,
    returnDate,
    adults,
  });

  try {
    const queryParams: Record<string, string | number> = {
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate,
      adults,
      currencyCode: currency,
      max: 50, // Request more to get variety after deduplication
    };

    if (returnDate) {
      queryParams.returnDate = returnDate;
    }

    const resp = await axios.get(
      `${AMADEUS_BASE_URL}/v2/shopping/flight-offers`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: queryParams,
      }
    );

    console.log("📦 Amadeus Flight Search response:", {
      status: resp.status,
      count: resp.data?.data?.length || 0,
    });

    const offers = resp.data?.data || [];
    const dictionaries = resp.data?.dictionaries || {};

    const allFlights = offers.map((offer: any) => transformFlightOffer(offer, dictionaries, currency));

    // Deduplicate flights - keep only one per airline/price/stops combination
    // This collapses multiple departure times into a single representative option
    const seen = new Set<string>();
    const uniqueFlights = allFlights.filter((f: FlightResult) => {
      const key = [
        f.airlines.sort().join(","),
        f.price.toFixed(2),
        f.stops
      ].join("|");

      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    console.log(`🔄 Deduplicated: ${allFlights.length} → ${uniqueFlights.length} flights`);

    return uniqueFlights;
  } catch (error: any) {
    console.error("❌ Amadeus Flight Search error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Return empty array on error (don't throw)
    return [];
  }
}

function transformFlightOffer(
  offer: any,
  dictionaries: any,
  currency: string
): FlightResult {
  const itineraries = offer.itineraries || [];
  const outboundItinerary = itineraries[0];
  const inboundItinerary = itineraries[1];

  const outboundSegments = (outboundItinerary?.segments || []).map((seg: any) =>
    transformSegment(seg, dictionaries)
  );
  const inboundSegments = inboundItinerary
    ? (inboundItinerary.segments || []).map((seg: any) =>
        transformSegment(seg, dictionaries)
      )
    : undefined;

  // Collect unique airline codes
  const airlineCodes = new Set<string>();
  outboundSegments.forEach((s: FlightSegment) => airlineCodes.add(s.carrierCode));
  if (inboundSegments) {
    inboundSegments.forEach((s: FlightSegment) => airlineCodes.add(s.carrierCode));
  }

  const airlines = Array.from(airlineCodes).map(
    (code) =>
      dictionaries?.carriers?.[code] ||
      AIRLINE_NAMES[code] ||
      code
  );

  return {
    id: offer.id,
    price: parseFloat(offer.price?.total || "0"),
    currency: offer.price?.currency || currency,
    outbound: outboundSegments,
    inbound: inboundSegments,
    airlines,
    totalDuration: outboundItinerary?.duration || "",
    stops: Math.max(0, outboundSegments.length - 1),
  };
}

function transformSegment(seg: any, dictionaries: any): FlightSegment {
  return {
    departure: {
      iataCode: seg.departure?.iataCode || "",
      terminal: seg.departure?.terminal,
      at: seg.departure?.at || "",
    },
    arrival: {
      iataCode: seg.arrival?.iataCode || "",
      terminal: seg.arrival?.terminal,
      at: seg.arrival?.at || "",
    },
    carrierCode: seg.carrierCode || "",
    carrierName:
      dictionaries?.carriers?.[seg.carrierCode] ||
      AIRLINE_NAMES[seg.carrierCode] ||
      seg.carrierCode,
    flightNumber: seg.number || "",
    duration: seg.duration || "",
  };
}
