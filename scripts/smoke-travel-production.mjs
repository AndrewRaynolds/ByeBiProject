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

async function get(path) {
  const url = new URL(path, baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ByeBi-travel-handoff-smoke-test" },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`${url.pathname} returned HTTP ${response.status}: ${body.slice(0, 300)}`);
    }

    return { response, body, url };
  } finally {
    clearTimeout(timeout);
  }
}

async function getJson(path, params) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ByeBi-travel-handoff-smoke-test" },
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

async function checkTravelOptionsPage() {
  const { response, body, url } = await get("/checkout");
  if (!response.headers.get("content-type")?.includes("text/html")) {
    throw new Error("Travel Options route did not return HTML");
  }
  if (!body.toLowerCase().includes("byebi")) {
    throw new Error("Travel Options route did not return the ByeBi application shell");
  }
  console.log(`PASS ${url.pathname}: application shell reachable`);
}

const departDate = futureDate(45);
const returnDate = futureDate(48);

async function checkFlightHandoff(passengers) {
  const handoff = await getJson("/api/flights/search", {
    origin: "Rome",
    destination: "Barcelona",
    departDate,
    returnDate,
    passengers,
    currency: "EUR",
  });
  const expectedCheckoutAdults = Math.min(passengers, 9);

  if (
    handoff.origin !== "ROM" ||
    handoff.destination !== "BCN" ||
    handoff.departDate !== departDate ||
    handoff.returnDate !== returnDate ||
    handoff.passengers !== passengers ||
    handoff.checkoutAdults !== expectedCheckoutAdults ||
    handoff.groupBookingRequired !== (passengers > expectedCheckoutAdults) ||
    typeof handoff.checkoutUrl !== "string" ||
    handoff.handoff?.provider !== "aviasales" ||
    handoff.handoff?.url !== handoff.checkoutUrl ||
    handoff.handoff?.exactOffer !== false
  ) {
    throw new Error(
      `Flight handoff returned an invalid contract for ${passengers} passenger(s)`,
    );
  }

  const checkout = new URL(handoff.checkoutUrl);
  if (
    checkout.protocol !== "https:" ||
    checkout.hostname !== "www.aviasales.com" ||
    !checkout.pathname.startsWith("/search/") ||
    !checkout.searchParams.get("marker")
  ) {
    throw new Error("Flight handoff returned an invalid Aviasales URL");
  }

  if ("flights" in handoff || "flightDataStatus" in handoff) {
    throw new Error("Flight handoff unexpectedly exposed retired live-inventory fields");
  }

  console.log(
    `PASS flights (${passengers} passengers): Aviasales handoff contract valid`,
  );
}

await checkTravelOptionsPage();
await checkFlightHandoff(2);
await checkFlightHandoff(12);

console.log(
  `Travel handoff smoke passed for ${baseUrl}. Booking.com and GetYourGuide remain client-generated external handoffs covered by repository tests.`,
);
