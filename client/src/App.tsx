import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import HomeBride from "@/pages/HomeBride";
import Dashboard from "@/pages/Dashboard";
import SecretBlogPage from "@/pages/SecretBlogPage";
import MerchandisePage from "@/pages/MerchandisePage";
import ItineraryPage from "@/pages/ItineraryPage";
import ItineraryPreviewPage from "@/pages/ItineraryPreviewPage";
import Itinerary from "@/pages/Itinerary";
import Checkout from "@/pages/Checkout";
import SplittaBroPage from "@/pages/SplittaBroPage";
import SplittaBridePage from "@/pages/SplittaBridePage";
import DestinationsPage from "@/pages/DestinationsPage";
import ExperiencesPage from "@/pages/ExperiencesPage";
import OneClickPackagePage from "@/pages/OneClickPackagePage";
import ZapierWebhooksPage from "@/pages/ZapierWebhooksPage";
import KiwiTestPage from "@/pages/KiwiTestPage";
import ApiTestPage from "@/pages/ApiTestPage";
import ImageTestPage from "@/pages/ImageTestPage";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { lazy, Suspense, useState, useEffect } from "react";
import PerformanceOptimizer from "@/lib/performance-optimizer";
import BrandSelection from "@/components/BrandSelection";

function Router() {
  const [selectedBrand, setSelectedBrand] = useState<'byebro' | 'byebride' | null>(null);

  useEffect(() => {
    const savedBrand = localStorage.getItem('selectedBrand') as 'byebro' | 'byebride' | null;
    if (savedBrand) {
      setSelectedBrand(savedBrand);
    }
  }, []);

  const handleBrandSelection = (brand: 'byebro' | 'byebride') => {
    setSelectedBrand(brand);
    localStorage.setItem('selectedBrand', brand);
  };

  if (!selectedBrand) {
    return <BrandSelection onSelectBrand={handleBrandSelection} />;
  }

  const HomePage = selectedBrand === 'byebride' ? HomeBride : Home;
  const SplittaPage = selectedBrand === 'byebride' ? SplittaBridePage : SplittaBroPage;

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <Route path="/destinations" component={DestinationsPage} />
      <Route path="/experiences" component={ExperiencesPage} />
      <ProtectedRoute path="/secret-blog" component={SecretBlogPage} />
      <Route path="/merchandise" component={MerchandisePage} />
      <Route path="/itinerary" component={Itinerary} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/itinerary/preview" component={ItineraryPreviewPage} />
      <ProtectedRoute path="/itinerary/:id" component={ItineraryPage} />
      <Route path="/splitta-bro" component={SplittaPage} />
      <Route path="/splitta-bride" component={SplittaPage} />
      <Route path="/one-click-package" component={OneClickPackagePage} />
      <Route path="/kiwi-test" component={KiwiTestPage} />
      <Route path="/api-test" component={ApiTestPage} />
      <Route path="/image-test" component={ImageTestPage} />
      <Route path="/zapier-webhooks" component={ZapierWebhooksPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          {/* Aggiungiamo l'ottimizzatore di performance globale */}
          <PerformanceOptimizer />
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-pulse text-xl font-semibold">Caricamento...</div>
            </div>
          }>
            <Router />
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
