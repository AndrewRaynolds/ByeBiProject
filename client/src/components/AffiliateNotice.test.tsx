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
  it("keeps the disclosure without an affiliate badge", () => {
    render(<AffiliateNotice variant="light" />);
    expect(screen.queryByText("Affiliato")).not.toBeInTheDocument();
    expect(screen.getByText(/Potremmo ricevere una commissione/)).toBeInTheDocument();
  });
});
