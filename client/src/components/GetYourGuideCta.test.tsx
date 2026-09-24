/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GetYourGuideCta } from "./GetYourGuideCta";

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "gyg.title": "Cose da fare a Barcellona",
      "gyg.subtitle": "Scopri tour e attività",
      "gyg.cta": "Vedi esperienze su GetYourGuide",
    }[key] ?? key),
  }),
}));
vi.mock("@/lib/track", () => ({ trackAffiliateClick: vi.fn() }));
vi.mock("@/lib/externalNavigation", () => ({ openExternalUrl: vi.fn() }));
vi.mock("@/components/AffiliateNotice", () => ({
  AffiliateNotice: () => <div>Affiliato</div>,
}));

describe("GetYourGuide mobile CTA", () => {
  it("can wrap inside a narrow checkout card without forcing horizontal overflow", () => {
    render(<GetYourGuideCta destinationCity="Barcellona" placement="checkout" />);

    const button = screen.getByRole("button", { name: /GetYourGuide/i });
    expect(button).toHaveClass("w-full", "whitespace-normal", "min-h-11");
    expect(button.parentElement).toHaveClass("min-w-0");
  });
});
