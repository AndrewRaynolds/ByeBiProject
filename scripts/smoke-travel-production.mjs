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

const flights = await getJson("/api/flights/search", {
  origin: "Rome",
  destination: "Barcelona",
  departDate,
  returnDate,
  passengers: 2,
  currency: "EUR",
});

if (
  flights.origin !== "ROM" ||
  flights.destination !== "BCN" ||
  flights.departDate !== departDate ||
  flights.returnDate !== returnDate ||
  flights.passengers !== 2 ||
  flights.checkoutAdults !== 2 ||
  flights.groupBookingRequired !== false ||
  !Array.isArray(flights.flights)
) {
  throw new Error("Flight endpoint returned an invalid funnel contract");
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

console.log(`PASS flights: ${flights.flights.length} result(s), checkout contract valid`);

const hotels = await getJson("/api/hotels/search", {
  cityCode: "BCN",
  checkInDate: departDate,
  checkOutDate: returnDate,
  adults: 2,
  currency: "EUR",
});

if (
  hotels.cityCode !== "BCN" ||
  hotels.checkInDate !== departDate ||
  hotels.checkOutDate !== returnDate ||
  hotels.adults !== 2 ||
  hotels.currency !== "EUR" ||
  !Array.isArray(hotels.hotels)
) {
  throw new Error("Hotel endpoint returned an invalid funnel contract");
}

console.log(`PASS hotels: ${hotels.hotels.length} result(s), search contract valid`);
console.log(`Travel funnel smoke test passed for ${baseUrl}`);
