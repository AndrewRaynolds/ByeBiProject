import { beforeEach, describe, expect, it, vi } from "vitest";

const { amadeusGet, amadeusTokenPost } = vi.hoisted(() => ({
  amadeusGet: vi.fn(),
  amadeusTokenPost: vi.fn(),
}));

vi.mock("./amadeusHttp", () => ({
  amadeusGet,
  amadeusTokenPost,
  amadeusBookingPost: vi.fn(),
}));

describe("Amadeus hotel inventory", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.AMADEUS_API_KEY_TEST = "test-key";
    process.env.AMADEUS_API_SECRET_TEST = "test-secret";
    amadeusGet.mockReset();
    amadeusTokenPost.mockReset();
    amadeusTokenPost.mockResolvedValue({ data: { access_token: "token", expires_in: 1800 } });
  });

  it("returns an empty list when Amadeus has no hotel IDs instead of synthetic inventory", async () => {
    amadeusGet.mockResolvedValueOnce({ data: { data: [] } });
    const { searchHotels } = await import("./amadeus-hotels");
    await expect(searchHotels({ cityCode: "BCN", checkInDate: "2026-11-20", checkOutDate: "2026-11-23", adults: 8, currency: "EUR" })).resolves.toEqual([]);
    expect(amadeusGet).toHaveBeenCalledTimes(1);
  });
});
