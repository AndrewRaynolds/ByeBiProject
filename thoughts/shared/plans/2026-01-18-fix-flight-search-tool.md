# Fix Flight Search Tool Implementation Plan

## Overview

The flight search tool (`search_flights`) is not returning flight results to the OpenAI model, causing it to say "no flights found" even though the Aviasales URL is generated correctly on the client side. This plan addresses the root cause and fixes the data flow.

## Current State Analysis

### The Issue

When a user asks to search for flights, two parallel processes happen:

1. **Server-side (OpenAI tool loop)**:
   - OpenAI calls `search_flights` tool
   - Server executes `executeToolCall("search_flights", ...)` in `openai.ts:430-468`
   - Returns result to OpenAI, which generates a response
   - **This is returning empty flights**

2. **Client-side (UI update)**:
   - Client receives `tool_call` event via SSE
   - `handleToolCall` in `ChatDialogCompact.tsx:613-658` calls `/api/flights/search` REST endpoint
   - Populates `flights` state and generates Aviasales URLs
   - **This works correctly**

### Key Discoveries

1. **Both implementations use the same API call** but the server-side `executeToolCall` returns empty flights
2. The Aviasales API (`api.travelpayouts.com/v1/prices/cheap`) returns data nested as `data.[DESTINATION_IATA].[index]`
3. **Critical**: The API returns empty data for past dates without errors
4. **Missing logging**: No debug output to see what the API actually returns during tool execution

### Root Cause Hypothesis

Most likely causes (in order of probability):

1. **Date format mismatch**: The model might pass dates in an unexpected format
2. **Empty API response**: The Aviasales API might return empty `data` object for certain date ranges
3. **Silent failure**: Errors in the transformation logic aren't surfaced properly

## Desired End State

After this fix:
- The OpenAI model receives flight data from `executeToolCall` and can present options to users
- Debug logging shows the API request/response for troubleshooting
- The model and client-side UI show consistent flight data
- Error cases are properly handled and logged

### Verification

1. Send a chat message like "Search flights from Rome to Barcelona for June 15-20, 2026 for 5 people"
2. OpenAI model should respond with flight options (not "no flights found")
3. Server logs should show the Aviasales API request and response
4. The same flights should appear in both the model's response and the client UI

## What We're NOT Doing

- Not changing the Aviasales API integration fundamentally
- Not modifying the client-side flight search logic (it works)
- Not adding new features to the flight search
- Not changing the OpenAI tool definitions

## Implementation Approach

Add debug logging first to confirm the issue, then fix the data transformation if needed.

---

## Phase 1: Add Debug Logging to executeToolCall

### Overview
Add comprehensive logging to understand what data flows through the `search_flights` tool execution.

### Changes Required:

#### 1. Add logging to search_flights tool execution
**File**: `server/services/openai.ts`
**Changes**: Add console.log statements to trace the data flow

```typescript
case "search_flights": {
  const { searchCheapestFlights } = await import("./aviasales");
  const { cityToIata } = await import("./cityMapping");

  const originCity = typeof args.origin === "string" ? args.origin : "";
  const destCity = typeof args.destination === "string" ? args.destination : "";
  const originIata = cityToIata(originCity) || originCity.substring(0, 3).toUpperCase();
  const destIata = cityToIata(destCity) || destCity.substring(0, 3).toUpperCase();

  console.log("🔍 search_flights tool called with:", {
    originCity,
    destCity,
    originIata,
    destIata,
    departure_date: args.departure_date,
    return_date: args.return_date,
    passengers: args.passengers
  });

  try {
    const flightData = await searchCheapestFlights({
      origin: originIata,
      destination: destIata,
      departDate: typeof args.departure_date === "string" ? args.departure_date : undefined,
      currency: "EUR"
    });

    console.log("📦 Aviasales API response:", JSON.stringify(flightData, null, 2));

    // Transform to user-friendly format
    const destCode = Object.keys(flightData.data || {})[0];
    console.log("🎯 Destination code from response:", destCode);

    const offersObj = flightData.data?.[destCode] || {};
    console.log("✈️ Offers object:", JSON.stringify(offersObj, null, 2));

    const flights = Object.values(offersObj as Record<string, unknown>)
      .slice(0, 5)
      .map((f: unknown) => {
        const flight = f as Record<string, unknown>;
        return {
          airline: flight.airline,
          price: flight.price,
          departure_at: flight.departure_at,
          return_at: flight.return_at,
          flight_number: flight.flight_number
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
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Server starts without errors: `npm run dev`

#### Manual Verification:
- [ ] Send a chat message to search for flights
- [ ] Check server console logs for the debug output
- [ ] Verify logs show: input args, API response, destination code, offers, transformed flights

**Implementation Note**: After completing this phase, run a test to see the actual data flowing through. The logs will reveal whether the API is returning empty data or if the transformation is failing. Pause here for manual testing before proceeding.

---

## Phase 2: Fix Data Transformation (if needed based on Phase 1 findings)

### Overview
Based on Phase 1 logging, fix any issues with the data transformation.

### Potential Fixes:

#### Scenario A: API returns data but transformation fails
**File**: `server/services/openai.ts`

If the logs show `flightData.data` has flights but they're not being extracted properly:

```typescript
// The API response structure is: { success: true, data: { "BCN": { "0": {...}, "1": {...} } } }
// We need to handle cases where destination key might differ from what we expect

const destCode = Object.keys(flightData.data || {})[0];
if (!destCode) {
  console.log("⚠️ No destination code found in API response");
  return { flights: [], origin: originIata, destination: destIata };
}
```

#### Scenario B: API returns empty data
If the API consistently returns `{ success: true, data: {} }`, we need to investigate:
- Check if dates are in the future
- Check if the IATA codes are valid
- Consider using a different API endpoint or parameters

#### Scenario C: IATA code conversion fails
If `cityToIata` returns null for valid cities, update the city mapping.

### Success Criteria:

#### Automated Verification:
- [ ] All existing tests pass: `npm test`
- [ ] TypeScript compiles: `npx tsc --noEmit`

#### Manual Verification:
- [ ] OpenAI model responds with flight options when asked to search
- [ ] Flight details (airline, departure, return times) are accurate
- [ ] Server logs show successful data transformation

**Implementation Note**: The specific fix depends on what Phase 1 reveals. Pause after Phase 1 to analyze the logs.

---

## Phase 3: Ensure Consistency Between Tool and REST Endpoint

### Overview
After fixing the tool, ensure the `executeToolCall` returns data in a format consistent with what the client expects.

### Changes Required:

#### 1. Add checkoutUrl to tool response (optional but helpful)
**File**: `server/services/openai.ts`

The client-side code generates checkoutUrls, but the model could also provide them:

```typescript
const flights = Object.values(offersObj as Record<string, unknown>)
  .slice(0, 5)
  .map((f: unknown, idx: number) => {
    const flight = f as Record<string, unknown>;
    const depDate = (flight.departure_at as string)?.slice(0, 10) || "";
    const retDate = (flight.return_at as string)?.slice(0, 10) || "";
    const depDay = depDate.slice(8, 10);
    const depMonth = depDate.slice(5, 7);
    const retDay = retDate.slice(8, 10);
    const retMonth = retDate.slice(5, 7);

    const numPassengers = typeof args.passengers === "number" ? args.passengers : 1;
    const checkoutUrl = `https://www.aviasales.com/search/${originIata}${depDay}${depMonth}${destIata}${retDay}${retMonth}${numPassengers}?marker=${process.env.AVIASALES_PARTNER_ID || "byebi"}`;

    return {
      airline: flight.airline,
      price: flight.price,
      departure_at: flight.departure_at,
      return_at: flight.return_at,
      flight_number: flight.flight_number,
      checkoutUrl
    };
  });
```

### Success Criteria:

#### Automated Verification:
- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles: `npx tsc --noEmit`

#### Manual Verification:
- [ ] Complete a full flight search conversation
- [ ] Verify the model can present flight options with booking links
- [ ] Verify checkout URLs work correctly

---

## Testing Strategy

### Unit Tests:
- Existing tests in `openai.test.ts` cover `executeToolCall`
- Tests mock the Aviasales API, so they pass even if the real API has issues
- Consider adding an integration test that uses the real API

### Integration Tests:
- Test the full flow: message → tool call → API call → response
- Check that tool results are properly sent back to OpenAI

### Manual Testing Steps:
1. Start the dev server: `npm run dev`
2. Open the chat dialog
3. Type: "I want to fly from Rome to Barcelona on June 15-20, 2026 with 5 friends"
4. Verify:
   - Server logs show API request/response
   - Model responds with flight options (not "no flights found")
   - Flight cards appear in the UI
   - Checkout URLs work

## References

- Aviasales API documentation: `server/services/aviasales.ts`
- Tool execution: `server/services/openai.ts:430-468`
- REST endpoint: `server/routes.ts:824-890`
- Client handling: `client/src/components/ChatDialogCompact.tsx:613-658`
- [Travelpayouts API Documentation](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API)
