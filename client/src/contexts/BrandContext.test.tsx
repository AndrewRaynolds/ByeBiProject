/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BrandProvider, initializeBrandTheme, useBrand } from "./BrandContext";

describe("BrandProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.brand;
  });

  it("loads the compatible selectedBrand key and exposes it centrally", () => {
    localStorage.setItem("selectedBrand", "byebride");
    const { result } = renderHook(() => useBrand(), { wrapper: BrandProvider });

    expect(result.current.brand).toBe("byebride");
    expect(document.documentElement.dataset.brand).toBe("byebride");
  });

  it("applies a stored ByeBride theme synchronously during bootstrap", () => {
    localStorage.setItem("selectedBrand", "byebride");

    const initializedBrand = initializeBrandTheme();

    expect(initializedBrand).toBe("byebride");
    expect(document.documentElement.dataset.brand).toBe("byebride");
  });

  it("persists selection, updates the theme attribute, and can clear it", () => {
    const { result } = renderHook(() => useBrand(), { wrapper: BrandProvider });

    act(() => result.current.selectBrand("byebro"));
    expect(localStorage.getItem("selectedBrand")).toBe("byebro");
    expect(document.documentElement.dataset.brand).toBe("byebro");

    act(() => result.current.clearBrand());
    expect(localStorage.getItem("selectedBrand")).toBeNull();
    expect(document.documentElement.dataset.brand).toBeUndefined();
  });
});
