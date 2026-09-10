// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { trackAffiliateClick } from "./track";

afterEach(() => {
  localStorage.clear();
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
});
