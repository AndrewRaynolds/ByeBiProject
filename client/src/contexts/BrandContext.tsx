import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Brand = "byebro" | "byebride";

interface BrandContextValue {
  brand: Brand | null;
  selectBrand: (brand: Brand) => void;
  clearBrand: () => void;
}

const BrandContext = createContext<BrandContextValue | null>(null);

export function readStoredBrand(): Brand | null {
  const savedBrand = localStorage.getItem("selectedBrand");
  return savedBrand === "byebro" || savedBrand === "byebride" ? savedBrand : null;
}

export function applyBrandTheme(brand: Brand | null) {
  if (brand) {
    document.documentElement.dataset.brand = brand;
  } else {
    delete document.documentElement.dataset.brand;
  }
}

export function initializeBrandTheme(): Brand | null {
  const storedBrand = readStoredBrand();
  applyBrandTheme(storedBrand);
  return storedBrand;
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<Brand | null>(initializeBrandTheme);

  const selectBrand = useCallback((nextBrand: Brand) => {
    localStorage.setItem("selectedBrand", nextBrand);
    applyBrandTheme(nextBrand);
    setBrand(nextBrand);
  }, []);

  const clearBrand = useCallback(() => {
    localStorage.removeItem("selectedBrand");
    applyBrandTheme(null);
    setBrand(null);
  }, []);

  const value = useMemo(
    () => ({ brand, selectBrand, clearBrand }),
    [brand, clearBrand, selectBrand],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
