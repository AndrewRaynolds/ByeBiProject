// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedExternalUrl, openExternalUrl } from "./externalNavigation";

afterEach(() => vi.restoreAllMocks());

describe("external navigation", () => {
  it.each([
    "https://www.aviasales.com/search/example",
    "https://www.booking.com/searchresults.html?ss=Roma",
    "https://gyg.me/example",
    "https://www.getyourguide.com/s/?q=Roma",
    "https://www.google.com/maps/search/?api=1&query=Roma",
  ])("allows trusted provider URL %s", (url) => {
    expect(isAllowedExternalUrl(url)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "http://www.booking.com/searchresults.html",
    "https://booking.com.evil.example/search",
    "https://example.com",
  ])("blocks unsafe provider URL %s", (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });

  it("opens trusted URLs with opener isolation", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    expect(openExternalUrl("https://gyg.me/example")).toBe(true);
    expect(open).toHaveBeenCalledWith(
      "https://gyg.me/example",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
