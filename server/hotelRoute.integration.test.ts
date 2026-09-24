import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./storage", () => ({
  storage: {},
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
}));

vi.mock("./zapier-integration", () => ({
  registerZapierRoutes: vi.fn(),
}));

vi.mock("./services/amadeus-hotels", () => ({
  searchHotels: vi.fn().mockRejectedValue(new Error("Amadeus unavailable")),
}));

describe("hotel search route fallback", () => {
  let baseUrl = "";
  let server: Awaited<ReturnType<typeof import("./routes").registerRoutes>>;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const { registerRoutes } = await import("./routes");
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it("returns HTTP 200 and preserves the requested Booking search context", async () => {
    const response = await fetch(
      `${baseUrl}/api/hotels/search?cityCode=BCN&checkInDate=2026-11-20&checkOutDate=2026-11-23&adults=12&currency=EUR`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      cityCode: "BCN",
      checkInDate: "2026-11-20",
      checkOutDate: "2026-11-23",
      adults: 12,
      currency: "EUR",
      hotelDataStatus: "unavailable",
      hotels: [],
    });
  });

  it("still rejects invalid hotel search input", async () => {
    const response = await fetch(
      `${baseUrl}/api/hotels/search?cityCode=Barcelona&checkInDate=2026-11-20&checkOutDate=2026-11-23&adults=12&currency=EUR`,
    );

    expect(response.status).toBe(400);
  });
});
