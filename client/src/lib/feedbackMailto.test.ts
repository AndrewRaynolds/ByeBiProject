import { describe, expect, it } from "vitest";
import { buildFeedbackMailto, sanitizeFeedbackPathname } from "./feedbackMailto";

describe("feedback mailto", () => {
  it("redacts private route identifiers and strips query/hash context", () => {
    expect(sanitizeFeedbackPathname("/trips/shared/super-secret-token?x=1"))
      .toBe("/trips/shared/:token");
    expect(sanitizeFeedbackPathname("/trips/123#section"))
      .toBe("/trips/:id");
    expect(sanitizeFeedbackPathname("/checkout?next=secret"))
      .toBe("/checkout");
  });

  it("includes only lightweight product context in the email draft", () => {
    const href = buildFeedbackMailto({
      email: "feedback@example.com",
      subject: "Feedback ByeBi",
      message: "Scrivi qui il tuo feedback.",
      brand: "byebro",
      locale: "it",
      pathname: "/checkout?token=secret",
    });

    const decoded = decodeURIComponent(href);
    expect(decoded).toContain("mailto:feedback@example.com");
    expect(decoded).toContain("Brand: byebro");
    expect(decoded).toContain("Locale: it");
    expect(decoded).toContain("Page: /checkout");
    expect(decoded).not.toContain("token=secret");
  });
});
