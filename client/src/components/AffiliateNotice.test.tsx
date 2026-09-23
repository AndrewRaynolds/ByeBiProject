/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AffiliateNotice } from "./AffiliateNotice";

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "affiliateNotice.badge": "Affiliato",
      "affiliateNotice.text": "Potremmo ricevere una commissione, senza costi aggiuntivi per te.",
    })[key] ?? key,
  }),
}));

describe("AffiliateNotice", () => {
  it("can keep the affiliate badge without the checkout disclosure sentence", () => {
    render(<AffiliateNotice showText={false} />);

    expect(screen.getByText("Affiliato")).toBeInTheDocument();
    expect(screen.queryByText(/Potremmo ricevere una commissione/)).not.toBeInTheDocument();
  });
});
