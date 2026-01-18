# Replace Aviasales API with Amadeus Flight Offers Search

## Overview

Replace the cache-based Travelpayouts/Aviasales Data API (`/v1/prices/cheap`) with the real-time Amadeus Flight Offers Search API (`/v2/shopping/flight-offers`). The current API returns empty data for future dates because it only serves cached prices from recent user searches. Amadeus provides real-time flight data for any date range.

## Current State Analysis

### The Problem
- Travelpayouts `/v1/prices/cheap` is **cache-based** - only returns data from recent Aviasales website searches
- Returns empty `{ data: {} }` for dates far in the future (e.g., May 2026)
- Users see "no flights found" even though flights exist

### Current Architecture
```
User → Chat → OpenAI Tool (search_flights) → aviasales.ts → Travelpayouts API
                    ↓
              routes.ts (/api/flights/search) → aviasales.ts → Travelpayouts API
                    ↓
              Client displays results + Aviasales checkout URL
```

### Key Files
- `server/services/aviasales.ts` - Current API integration (lines 15-54)
- `server/services/openai.ts` - Tool execution (lines 430-518)
- `server/routes.ts` - REST endpoint (lines 824-915)
- `client/src/lib/aviasales.ts` - URL builder for checkout links

## Desired End State

After this change:
- Flight searches return real-time data for **any future date**
- Same authentication pattern as existing `amadeus-hotels.ts`
- Aviasales checkout URLs still work (they're just deep links to the booking site)
- OpenAI model receives actual flight options to present to users

### Verification
1. Search for flights to a date 6+ months in the future
2. API returns flight options with prices
3. OpenAI model presents flight choices to user
4. Checkout URL redirects to Aviasales booking page

## What We're NOT Doing

- Not changing the Aviasales checkout URL generation (it works)
- Not modifying the client-side flight display components
- Not adding flight booking (redirect to Aviasales for booking)
- Not changing the tool definition schema in OpenAI

## Known Limitations

Amadeus Self-Service API does **not** return:
- American Airlines, Delta, British Airways
- Low-cost carriers (Ryanair, EasyJet, etc.)

This is a trade-off: real-time data for any date vs. broader airline coverage.

---

## Phase 1: Create `amadeus-flights.ts` Service

### Overview
Create a new flight search service using Amadeus Flight Offers Search API, following the same patterns as `amadeus-hotels.ts`.

### Changes Required:

#### 1. Create new service file
**File**: `server/services/amadeus-flights.ts`

```typescript
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

// Reuse token cache from amadeus-hotels or create shared module
const isProd = process.env.NODE_ENV === "production";
const useAmadeusLive = process.env.AMADEUS_ENV === "production";

const AMADEUS_API_KEY = useAmadeusLive
  ? process.env.AMADEUS_API_KEY_LIVE
  : process.env.AMADEUS_API_KEY_TEST;

const AMADEUS_API_SECRET = useAmadeusLive
  ? process.env.AMADEUS_API_SECRET_LIVE
  : process.env.AMADEUS_API_SECRET_TEST;

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
      max: 10, // Limit results
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

    return offers.map((offer: any) => transformFlightOffer(offer, dictionaries, currency));
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
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] File exists at `server/services/amadeus-flights.ts`

#### Manual Verification:
- [ ] N/A for this phase (tested in Phase 2)

---

## Phase 2: Update Server Routes

### Overview
Update the `/api/flights/search` REST endpoint to use the new Amadeus service.

### Changes Required:

#### 1. Update routes.ts
**File**: `server/routes.ts`
**Lines**: 824-915 (replace the existing `/api/flights/search` handler)

```typescript
// Replace import at top of file
// OLD: import { searchCheapestFlights } from "./services/aviasales";
// NEW: import { searchFlights } from "./services/amadeus-flights";

app.get("/api/flights/search", async (req: Request, res: Response) => {
  try {
    const { origin, destination, departDate, returnDate, passengers } = req.query;

    console.log("🔍 /api/flights/search called with:", {
      origin,
      destination,
      departDate,
      returnDate,
      passengers,
    });

    // Helper to extract IATA code
    const extractIata = (input: string): string => {
      const parenMatch = input.match(/\(([A-Z]{3})\)/i);
      if (parenMatch) return parenMatch[1].toUpperCase();

      const { cityToIata } = require("./services/cityMapping");
      const mapped = cityToIata(input);
      if (mapped) return mapped;

      if (/^[A-Z]{3}$/i.test(input.trim())) return input.trim().toUpperCase();

      return input.substring(0, 3).toUpperCase();
    };

    const originIata = extractIata(String(origin || ""));
    const destIata = extractIata(String(destination || ""));

    console.log("✈️ Resolved IATA codes:", { originIata, destIata });

    const { searchFlights } = await import("./services/amadeus-flights");

    const flights = await searchFlights({
      originCode: originIata,
      destinationCode: destIata,
      departureDate: String(departDate || ""),
      returnDate: returnDate ? String(returnDate) : undefined,
      adults: Number(passengers) || 1,
      currency: "EUR",
    });

    // Transform to match expected client format + add Aviasales checkout URLs
    const numPassengers = Number(passengers) || 1;
    const transformedFlights = flights.map((f, idx) => {
      // Build Aviasales checkout URL from flight dates
      const depDate = f.outbound[0]?.departure.at?.slice(0, 10) || String(departDate);
      const retDate = f.inbound?.[0]?.departure.at?.slice(0, 10) || String(returnDate) || depDate;
      const depDay = depDate.slice(8, 10);
      const depMonth = depDate.slice(5, 7);
      const retDay = retDate.slice(8, 10);
      const retMonth = retDate.slice(5, 7);

      const checkoutUrl = `https://www.aviasales.com/search/${originIata}${depDay}${depMonth}${destIata}${retDay}${retMonth}${numPassengers}?marker=${process.env.AVIASALES_PARTNER_ID || "byebi"}`;

      return {
        id: f.id,
        airline: f.airlines.join(", "),
        price: f.price,
        currency: f.currency,
        departure_at: f.outbound[0]?.departure.at,
        return_at: f.inbound?.[0]?.departure.at,
        stops: f.stops,
        duration: f.totalDuration,
        checkoutUrl,
      };
    });

    console.log("✅ Returning", transformedFlights.length, "flights");

    return res.json({
      flights: transformedFlights,
      origin: originIata,
      destination: destIata,
    });
  } catch (err: any) {
    console.error("Flight search error:", err.message);
    return res.status(500).json({
      error: "Flight search failed",
      details: err.message,
      flights: [],
    });
  }
});
```

#### 2. Remove old aviasales import
**File**: `server/routes.ts`
**Line**: 16

Remove or comment out:
```typescript
// import { searchCheapestFlights } from "./services/aviasales";
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Server starts: `npm run dev`

#### Manual Verification:
- [ ] Call `/api/flights/search?origin=Rome&destination=Barcelona&departDate=2026-06-15&returnDate=2026-06-20&passengers=4`
- [ ] Response contains flights with prices
- [ ] Each flight has a valid `checkoutUrl`

**Implementation Note**: Test the REST endpoint manually before proceeding to Phase 3.

---

## Phase 3: Update OpenAI Tool Execution

### Overview
Update the `search_flights` tool in `openai.ts` to use the new Amadeus service.

### Changes Required:

#### 1. Update search_flights case
**File**: `server/services/openai.ts`
**Lines**: 430-518 (replace the existing case)

```typescript
case "search_flights": {
  const { searchFlights } = await import("./amadeus-flights");
  const { cityToIata } = await import("./cityMapping");

  // Helper to extract IATA code from strings like "Fiumicino (FCO)"
  const extractIata = (input: string): string => {
    const parenMatch = input.match(/\(([A-Z]{3})\)/i);
    if (parenMatch) return parenMatch[1].toUpperCase();
    const mapped = cityToIata(input);
    if (mapped) return mapped;
    if (/^[A-Z]{3}$/i.test(input.trim())) return input.trim().toUpperCase();
    return input.substring(0, 3).toUpperCase();
  };

  const originCity = typeof args.origin === "string" ? args.origin : "";
  const destCity = typeof args.destination === "string" ? args.destination : "";
  const originIata = extractIata(originCity);
  const destIata = extractIata(destCity);
  const numPassengers = typeof args.passengers === "number" ? args.passengers : 1;
  const departureDate = typeof args.departure_date === "string" ? args.departure_date : "";
  const returnDate = typeof args.return_date === "string" ? args.return_date : undefined;

  console.log("🔍 search_flights tool called with:", {
    originCity,
    destCity,
    originIata,
    destIata,
    departure_date: departureDate,
    return_date: returnDate,
    passengers: numPassengers,
  });

  try {
    const flightResults = await searchFlights({
      originCode: originIata,
      destinationCode: destIata,
      departureDate,
      returnDate,
      adults: numPassengers,
      currency: "EUR",
    });

    console.log("📦 Amadeus returned", flightResults.length, "flights");

    // Transform to simplified format for OpenAI + add checkout URLs
    const flights = flightResults.slice(0, 5).map((f) => {
      const depDate = f.outbound[0]?.departure.at?.slice(0, 10) || departureDate;
      const retDate = f.inbound?.[0]?.departure.at?.slice(0, 10) || returnDate || depDate;
      const depDay = depDate.slice(8, 10);
      const depMonth = depDate.slice(5, 7);
      const retDay = retDate.slice(8, 10);
      const retMonth = retDate.slice(5, 7);

      const checkoutUrl = `https://www.aviasales.com/search/${originIata}${depDay}${depMonth}${destIata}${retDay}${retMonth}${numPassengers}?marker=${process.env.AVIASALES_PARTNER_ID || "byebi"}`;

      return {
        airline: f.airlines.join(", "),
        price: f.price,
        currency: f.currency,
        departure_at: f.outbound[0]?.departure.at,
        return_at: f.inbound?.[0]?.departure.at,
        stops: f.stops,
        duration: f.totalDuration,
        checkoutUrl,
      };
    });

    console.log("✅ Transformed flights:", JSON.stringify(flights, null, 2));

    return { flights, origin: originIata, destination: destIata };
  } catch (error) {
    console.error("❌ Flight search error:", error);
    return { error: "Failed to search flights. Please try again.", flights: [] };
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Tests pass: `npm test`

#### Manual Verification:
- [ ] Start chat and ask: "Search flights from Rome to Barcelona for June 15-20, 2026 for 4 people"
- [ ] OpenAI model responds with flight options (not "no flights found")
- [ ] Flight cards appear in UI with prices and checkout links

**Implementation Note**: Full end-to-end test with the chat interface.

---

## Phase 4: Update Tests

### Overview
Update the test mocks to use the new Amadeus service.

### Changes Required:

#### 1. Update mocks in openai.test.ts
**File**: `server/services/openai.test.ts`

Replace the aviasales mock with amadeus-flights mock:

```typescript
// Replace this mock:
vi.mock('./aviasales', () => ({
  searchCheapestFlights: vi.fn()
}));

// With:
vi.mock('./amadeus-flights', () => ({
  searchFlights: vi.fn()
}));
```

Update the test cases to use the new mock:

```typescript
describe('search_flights tool', () => {
  it('calls Amadeus API with correct IATA codes and generates checkoutUrl', async () => {
    const { searchFlights } = await import('./amadeus-flights');
    vi.mocked(searchFlights).mockResolvedValue([
      {
        id: '1',
        price: 150,
        currency: 'EUR',
        outbound: [{
          departure: { iataCode: 'ROM', at: '2025-06-15T10:00:00' },
          arrival: { iataCode: 'BCN', at: '2025-06-15T12:30:00' },
          carrierCode: 'IB',
          carrierName: 'Iberia',
          flightNumber: '123',
          duration: 'PT2H30M'
        }],
        inbound: [{
          departure: { iataCode: 'BCN', at: '2025-06-20T18:00:00' },
          arrival: { iataCode: 'ROM', at: '2025-06-20T20:30:00' },
          carrierCode: 'IB',
          carrierName: 'Iberia',
          flightNumber: '456',
          duration: 'PT2H30M'
        }],
        airlines: ['Iberia'],
        totalDuration: 'PT2H30M',
        stops: 0
      }
    ]);

    const result = await executeToolCall('search_flights', {
      origin: 'Rome',
      destination: 'Barcelona',
      departure_date: '2025-06-15',
      return_date: '2025-06-20',
      passengers: 5
    }, {});

    expect(searchFlights).toHaveBeenCalledWith({
      originCode: 'ROM',
      destinationCode: 'BCN',
      departureDate: '2025-06-15',
      returnDate: '2025-06-20',
      adults: 5,
      currency: 'EUR'
    });

    expect(result.flights).toHaveLength(1);
    const flight = (result.flights as any[])[0];
    expect(flight.airline).toBe('Iberia');
    expect(flight.price).toBe(150);
    expect(flight.checkoutUrl).toContain('https://www.aviasales.com/search/ROM1506BCN2006');
    expect(flight.checkoutUrl).toContain('5'); // passengers
  });

  // ... update other test cases similarly
});
```

### Success Criteria:

#### Automated Verification:
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npx tsc --noEmit`

#### Manual Verification:
- [ ] N/A

---

## Testing Strategy

### Unit Tests
- Mock `searchFlights` function
- Test IATA extraction for various formats
- Test checkout URL generation
- Test error handling

### Integration Tests
- Test REST endpoint with real Amadeus test API
- Verify response format matches client expectations

### Manual Testing Steps
1. Start dev server: `npm run dev`
2. Open chat dialog
3. Type: "I want to fly from Rome to Barcelona on June 15-20, 2026 with 4 friends"
4. Verify:
   - Server logs show Amadeus API request/response
   - Model responds with flight options
   - Flight cards appear in UI
   - Checkout URLs work (redirect to Aviasales)

## Migration Notes

- The old `aviasales.ts` can be kept temporarily for reference
- Client-side `aviasales.ts` URL builder remains unchanged
- Environment variables remain the same (Amadeus credentials already configured)

## References

- [Amadeus Flight Offers Search API](https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search)
- Existing implementation: `server/services/amadeus-hotels.ts`
- Current Aviasales implementation: `server/services/aviasales.ts`
