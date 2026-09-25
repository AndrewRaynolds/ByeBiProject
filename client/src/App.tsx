import { lazy, Suspense, useEffect } from "react";
import BrandSelection from "@/components/BrandSelection";
import RouteLoadingFallback from "@/components/RouteLoadingFallback";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import {
  LanguageProvider,
  useTranslation,
} from "@/contexts/LanguageContext";
import { BrandProvider, useBrand } from "@/contexts/BrandContext";

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

function AppContent() {
  const { brand, selectBrand } = useBrand();

  return (
    <AppErrorBoundary>
      <DocumentMetadata selectedBrand={brand} />
      {!brand ? (
        <BrandSelection onSelectBrand={selectBrand} />
      ) : (
        <Suspense fallback={<RouteLoadingFallback />}>
          <BrandedApp selectedBrand={brand} />
        </Suspense>
      )}
    </AppErrorBoundary>
  );
}

function App() {
  return (
    <LanguageProvider>
      <BrandProvider>
        <AppContent />
      </BrandProvider>
    </LanguageProvider>
  );
}

export default App;
