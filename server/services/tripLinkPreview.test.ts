import { describe, expect, it } from "vitest";
import { isPublicPreviewIpv4, parseTripLinkHtml, previewTripLink } from "./tripLinkPreview";

describe("trip link previews", () => {
  it("rejects private or non-public IPs", () => {
    for (const ip of ["127.0.0.1", "10.2.4.1", "169.254.169.254", "192.168.1.1", "100.64.1.1", "203.0.113.1", "::1"]) {
      expect(isPublicPreviewIpv4(ip)).toBe(false);
    }
    expect(isPublicPreviewIpv4("8.8.8.8")).toBe(true);
  });

  it("does not fetch internal hosts or loopback addresses", async () => {
    await expect(previewTripLink("http://127.0.0.1")).rejects.toThrow();
    await expect(previewTripLink("http://localhost")).rejects.toThrow();
    await expect(previewTripLink("file:///etc/passwd")).rejects.toThrow();
    await expect(previewTripLink("https://user:pass@example.com")).rejects.toThrow();
    await expect(previewTripLink("https://example.com:8443")).rejects.toThrow();
  });

  it("extracts only available page metadata and resolves relative images", () => {
    const result = parseTripLinkHtml(
      '<html><head><meta property="og:title" content="Nice &amp; Quiet Hotel" />' +
      '<meta name="description" content="Close to the beach" />' +
      '<meta property="og:image" content="/photo.jpg"></head></html>',
      "https://example.com/hotel",
    );
    expect(result).toMatchObject({
      title: "Nice & Quiet Hotel",
      source: "example.com",
      description: "Close to the beach",
      imageUrl: "https://example.com/photo.jpg",
      available: true,
    });
    expect(result).not.toHaveProperty("price");
  });

  it("falls back to source hostname without inventing an offer", () => {
    const result = parseTripLinkHtml("<html><body>Offer without metadata</body></html>", "https://example.com/offer");
    expect(result).toMatchObject({
      title: "example.com", description: null, imageUrl: null, available: false,
    });
  });
});
