/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LegalDocumentPage, { legalDocumentContent } from "./LegalDocumentPage";

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

const localeState = vi.hoisted(() => ({ locale: "it" }));
vi.mock("@/contexts/LanguageContext", () => ({ useTranslation: () => localeState }));
vi.mock("./Header", () => ({ default: () => null }));
vi.mock("./Footer", () => ({ default: () => null }));
vi.mock("@/lib/sellerConfig", () => ({
  sellerConfig: {
    legalName: "Private owner name", legalAddress: "Private home address", country: "IT",
    vatId: "private-tax-id", contactEmail: "contact@example.test",
  },
  isSellerConfigComplete: true,
}));

describe("public legal contact", () => {
  it.each(["it", "en", "es"])("shows only the configured contact email in %s privacy and terms", (locale) => {
    localeState.locale = locale;
    for (const document of ["privacy", "terms"] as const) {
      const view = render(React.createElement(LegalDocumentPage, { document }));
      expect(screen.getByText("contact@example.test")).toBeInTheDocument();
      expect(view.container).not.toHaveTextContent("Private owner name");
      expect(view.container).not.toHaveTextContent("Private home address");
      expect(view.container).not.toHaveTextContent("private-tax-id");
      view.unmount();
    }
  });
});
