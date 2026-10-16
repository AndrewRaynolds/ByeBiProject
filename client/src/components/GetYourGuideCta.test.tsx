/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GetYourGuideCta } from "./GetYourGuideCta";
import { trackAffiliateClick } from "@/lib/track";
import { openExternalUrl } from "@/lib/externalNavigation";

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "gyg.title": "Cose da fare a Barcellona",
      "gyg.subtitle": "Apri la pagina della destinazione su GetYourGuide.",
      "gyg.cta": "Esplora attività su GetYourGuide",
    }[key] ?? key),
  }),
}));
vi.mock("@/lib/track", () => ({ trackAffiliateClick: vi.fn() }));
vi.mock("@/lib/externalNavigation", () => ({ openExternalUrl: vi.fn() }));
vi.mock("@/components/AffiliateNotice", () => ({
  AffiliateNotice: () => <div>Affiliato</div>,
}));

describe("GetYourGuide mobile CTA", () => {
  it("keeps the destination handoff and referral event explicit without treating the click as a booking", () => {
    render(<GetYourGuideCta destinationCity="Barcellona" placement="checkout" />);
    fireEvent.click(screen.getByRole("button", { name: "Esplora attività su GetYourGuide" }));
    expect(trackAffiliateClick).toHaveBeenCalledWith({ provider: "getyourguide", placement: "checkout_experiences", destination: "Barcellona", monetized: true });
    expect(openExternalUrl).toHaveBeenCalledWith("https://gyg.me/dL0Pwlqx");
    expect(screen.queryByText(/prenotazione confermata/i)).not.toBeInTheDocument();
  });
  it("can wrap inside a narrow checkout card without forcing horizontal overflow", () => {
    render(<GetYourGuideCta destinationCity="Barcellona" placement="checkout" />);

    const button = screen.getByRole("button", { name: /GetYourGuide/i });
    expect(button).toHaveClass("w-full", "whitespace-normal", "min-h-11");
    expect(button.parentElement).toHaveClass("min-w-0");
  });
});
