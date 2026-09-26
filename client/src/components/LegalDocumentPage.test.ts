import { describe, expect, it } from "vitest";
import { legalDocumentContent } from "./LegalDocumentPage";

describe("legal travel-provider disclosure", () => {
  it.each(Object.entries(legalDocumentContent))(
    "names only the active travel handoff providers in %s",
    (_locale, documents) => {
      const privacyCopy = documents.privacy.sections
        .flatMap((section) => section.paragraphs)
        .join(" ");

      expect(privacyCopy).not.toMatch(/Amadeus/i);
      expect(privacyCopy).toContain("Aviasales");
      expect(privacyCopy).toContain("Booking.com");
      expect(privacyCopy).toContain("GetYourGuide");
    },
  );
});
