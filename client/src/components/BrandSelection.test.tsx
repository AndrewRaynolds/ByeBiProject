/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BrandSelection from "./BrandSelection";

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string) => ({ "brand.bro.accessibleLabel": "Scegli ByeBro per organizzare un addio al celibato", "brand.bride.accessibleLabel": "Scegli ByeBride per organizzare un addio al nubilato" }[key] ?? key),
  }),
}));

describe("BrandSelection", () => {
  it("exposes both brand choices as accessible buttons", () => {
    render(<BrandSelection onSelectBrand={vi.fn()} />);

    expect(
      screen.getByRole("button", {
        name: "Scegli ByeBro per organizzare un addio al celibato",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Scegli ByeBride per organizzare un addio al nubilato",
      }),
    ).toBeInTheDocument();
  });

  it("selects the requested brand", () => {
    const onSelectBrand = vi.fn();
    render(<BrandSelection onSelectBrand={onSelectBrand} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Scegli ByeBride per organizzare un addio al nubilato",
      }),
    );

    expect(onSelectBrand).toHaveBeenCalledWith("byebride");
  });
});
