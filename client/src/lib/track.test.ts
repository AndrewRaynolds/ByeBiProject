// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { trackAffiliateClick, trackProductEvent } from "./track";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("affiliate click tracking", () => {
  it("sends only the allowlisted first-party event fields", () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("selectedBrand", "byebride");

    trackAffiliateClick({
      provider: "getyourguide",
      placement: "experiences",
      destination: "Roma",
      monetized: true,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analytics/affiliate-clicks");
    expect(options.keepalive).toBe(true);
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      provider: "getyourguide",
      placement: "experiences",
      destination: "Roma",
      brand: "byebride",
      monetized: true,
    });
    expect(body.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.keys(body).sort()).toEqual([
      "brand",
      "destination",
      "monetized",
      "placement",
      "provider",
      "sessionId",
    ]);
  });

  it("uses the same anonymous browser-session id and deduplicates product steps", () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal("fetch", fetchMock);

    trackProductEvent("home_view");
    trackProductEvent("home_view");
    trackAffiliateClick({
      provider: "booking",
      placement: "checkout_hotel",
      monetized: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const productBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const affiliateBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/analytics/events");
    expect(productBody).toEqual({
      sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      eventName: "home_view",
      brand: "byebro",
    });
    expect(affiliateBody.sessionId).toBe(productBody.sessionId);
  });
});
