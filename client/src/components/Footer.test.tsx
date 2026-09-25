/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Footer from "./Footer";
import { BrandProvider } from "@/contexts/BrandContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

describe("Footer", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("selectedBrand", "byebride");
    localStorage.setItem("byebi_locale", "it");
  });

  it("uses the shared brand token and keeps the disclosure link discreet and neutral", () => {
    render(<LanguageProvider><BrandProvider><Footer /></BrandProvider></LanguageProvider>);

    expect(screen.getByRole("link", { name: "ByeBride" }).querySelector("span")).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: "Trasparenza commerciale" })).toHaveAttribute("href", "/affiliate-disclosure");
    expect(screen.queryByText(/affilia/i)).not.toBeInTheDocument();
  });
});
