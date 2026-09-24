const requestedBaseUrl = process.argv[2] || process.env.APP_BASE_URL;

if (!requestedBaseUrl) {
  console.error(
    "Usage: npm run smoke:travel:production -- https://your-production-domain.example",
  );
  process.exit(1);
}

let baseUrl;
try {
  const parsed = new URL(requestedBaseUrl);
  if (parsed.protocol !== "https:") throw new Error("HTTPS is required");
  baseUrl = parsed.origin;
} catch (error) {
  console.error(`Invalid production URL: ${error.message}`);
  process.exit(1);
}

function futureDate(daysFromNow) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + daysFromNow);
  return value.toISOString().slice(0, 10);
}

async function getJson(path, params) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ByeBi-travel-funnel-smoke-test" },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`${url.pathname} returned HTTP ${response.status}: ${body.slice(0, 300)}`);
    }
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error(`${url.pathname} did not return JSON`);
    }

    return JSON.parse(body);
  } finally {
    clearTimeout(timeout);
  }
}

const departDate = futureDate(45);
const returnDate = futureDate(48);

async function checkFlights(passengers) {
  const flights = await getJson("/api/flights/search", {
    origin: "Rome",
    destination: "Barcelona",
    departDate,
    returnDate,
    passengers,
    currency: "EUR",
  });
  const expectedCheckoutAdults = Math.min(passengers, 9);

  if (
    flights.origin !== "ROM" ||
    flights.destination !== "BCN" ||
    flights.departDate !== departDate ||
    flights.returnDate !== returnDate ||
    flights.passengers !== passengers ||
    flights.checkoutAdults !== expectedCheckoutAdults ||
    flights.groupBookingRequired !== (passengers > 9) ||
    !["live", "unavailable"].includes(flights.flightDataStatus) ||
    typeof flights.checkoutUrl !== "string" ||
    !Array.isArray(flights.flights)
  ) {
    throw new Error(`Flight endpoint returned an invalid funnel contract for ${passengers} passenger(s)`);
  }

  const primaryCheckout = new URL(flights.checkoutUrl);
  if (
    primaryCheckout.protocol !== "https:" ||
    primaryCheckout.hostname !== "www.aviasales.com" ||
    !primaryCheckout.pathname.startsWith("/search/") ||
    !primaryCheckout.searchParams.get("marker")
  ) {
    throw new Error("Flight endpoint returned an invalid primary Aviasales checkout URL");
  }

  for (const flight of flights.flights) {
    const checkout = new URL(flight.checkoutUrl);
    if (
      checkout.protocol !== "https:" ||
      checkout.hostname !== "www.aviasales.com" ||
      !checkout.pathname.startsWith("/search/") ||
      !checkout.searchParams.get("marker")
    ) {
      throw new Error("Flight endpoint returned an invalid Aviasales checkout URL");
    }
  }

  console.log(
    `PASS flights (${passengers} passengers): ${flights.flights.length} result(s), ${flights.flightDataStatus} data, checkout contract valid`,
  );
}

await checkFlights(2);
await checkFlights(12);

async function checkHotels(adults) {
  const hotels = await getJson("/api/hotels/search", {
    cityCode: "BCN",
    checkInDate: departDate,
    checkOutDate: returnDate,
    adults,
    currency: "EUR",
  });

  if (
    hotels.cityCode !== "BCN" ||
    hotels.checkInDate !== departDate ||
    hotels.checkOutDate !== returnDate ||
    hotels.adults !== adults ||
    hotels.currency !== "EUR" ||
    !["live", "unavailable"].includes(hotels.hotelDataStatus) ||
    !Array.isArray(hotels.hotels)
  ) {
    throw new Error(`Hotel endpoint returned an invalid funnel contract for ${adults} adult(s)`);
  }

  console.log(
    `PASS hotels (${adults} adults): ${hotels.hotels.length} result(s), ${hotels.hotelDataStatus} data, Booking fallback contract valid`,
  );
}

await checkHotels(2);
await checkHotels(12);
console.log(`Travel funnel smoke test passed for ${baseUrl}`);
