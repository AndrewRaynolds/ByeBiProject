import { lazy, Suspense, useEffect, useState } from "react";
import BrandSelection from "@/components/BrandSelection";
import RouteLoadingFallback from "@/components/RouteLoadingFallback";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import {
  LanguageProvider,
  useTranslation,
} from "@/contexts/LanguageContext";

const BrandedApp = lazy(() => import("@/BrandedApp"));

function DocumentMetadata({
  selectedBrand,
}: {
  selectedBrand: "byebro" | "byebride" | null;
}) {
  const { t } = useTranslation();
  const suffix =
    selectedBrand === "byebride"
      ? "Bride"
      : selectedBrand === "byebro"
        ? "Bro"
        : "Base";
  const title = t(`meta.title${suffix}`);
  const description = t(`meta.description${suffix}`);

  useEffect(() => {
    document.title = title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
  }, [description, title]);

  return null;
}

function getSavedBrand(): "byebro" | "byebride" | null {
  const savedBrand = localStorage.getItem("selectedBrand");
  return savedBrand === "byebro" || savedBrand === "byebride"
    ? savedBrand
    : null;
}

function App() {
  const [selectedBrand, setSelectedBrand] = useState<
    "byebro" | "byebride" | null
  >(getSavedBrand);

  const handleBrandSelection = (brand: "byebro" | "byebride") => {
    setSelectedBrand(brand);
    localStorage.setItem("selectedBrand", brand);
  };

  return (
    <LanguageProvider>
      <AppErrorBoundary>
        <DocumentMetadata selectedBrand={selectedBrand} />
        {!selectedBrand ? (
          <BrandSelection onSelectBrand={handleBrandSelection} />
        ) : (
          <Suspense fallback={<RouteLoadingFallback />}>
            <BrandedApp selectedBrand={selectedBrand} />
          </Suspense>
        )}
      </AppErrorBoundary>
    </LanguageProvider>
  );
}

export default App;
