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

  it("ignores preview images pointing at local network hosts", () => {
    const result = parseTripLinkHtml(
      '<meta property="og:title" content="Public hotel"><meta property="og:image" content="http://127.0.0.1/internal">',
      "https://example.com/hotel",
    );
    expect(result.imageUrl).toBeNull();
  });

  it("falls back to source hostname without inventing an offer", () => {
    const result = parseTripLinkHtml("<html><body>Offer without metadata</body></html>", "https://example.com/offer");
    expect(result).toMatchObject({
      title: "example.com", description: null, imageUrl: null, available: false,
    });
  });
});

describe("bounded metadata image alternatives", () => {
  it("tries another declared image when the preferred one is unusable", () => {
    const html = '<meta property="og:image:secure_url" content="http://127.0.0.1/private">' +
      '<meta property="og:image" content="data:image/png;base64,invalid">' +
      '<meta property="og:image" content=" /actual.jpg?size=large&amp;crop=wide ">';
    expect(parseTripLinkHtml(html, "https://example.com/hotel").imageUrl).toBe("https://example.com/actual.jpg?size=large&crop=wide");
  });
  it.each(["og:image:url", "twitter:image:src"])("supports the declared variant %s", key => {
    expect(parseTripLinkHtml(`<META CONTENT='//cdn.example.com/photo.jpg' PROPERTY='${key}'>`, "https://example.com/hotel").imageUrl).toBe("https://cdn.example.com/photo.jpg");
  });
  it("preserves preference for secure metadata, then OG, then Twitter", () => {
    const html = '<meta name="twitter:image" content="/twitter.jpg"><meta property="og:image" content="/og.jpg"><meta property="og:image:secure_url" content="https://cdn.example.com/secure.jpg">';
    expect(parseTripLinkHtml(html,"https://example.com/hotel").imageUrl).toBe("https://cdn.example.com/secure.jpg");
  });
  it.each(["javascript:alert(1)","file:///etc/passwd","http://localhost/image","http://169.254.169.254/image","https://user:secret@example.com/image","https://example.com:8443/image"])("skips prohibited image %s without losing a usable Twitter alternative", value => {
    expect(parseTripLinkHtml(`<meta property="og:image" content="${value}"><meta name="twitter:image" content="/usable.jpg">`,"https://example.com/hotel").imageUrl).toBe("https://example.com/usable.jpg");
  });
  it("bounds repeated metadata and ignores tags and titles beyond the prefix", () => {
    const invalid = '<meta property="og:image" content="data:invalid">'.repeat(8);
    expect(parseTripLinkHtml(invalid+'<meta property="og:image" content="/ninth.jpg">',"https://example.com/hotel").imageUrl).toBeNull();
    expect(parseTripLinkHtml(' '.repeat(262144)+'<title>Outside prefix</title><meta property="og:image" content="/outside.jpg">',"https://example.com/hotel")).toMatchObject({title:"example.com",imageUrl:null,available:false});
  });
  it("ignores hostile property names and preserves first textual metadata", () => {
    const html = '<meta property="toString" content="bad"><meta property="__proto__" content="bad"><meta property="constructor" content="bad">'+
      '<meta property="og:title" content="First"><meta property="og:title" content="Second"><meta name="twitter:image:src" content="/real.jpg">';
    expect(parseTripLinkHtml(html,"https://example.com/hotel")).toMatchObject({title:"First",imageUrl:"https://example.com/real.jpg"});
  });
});
