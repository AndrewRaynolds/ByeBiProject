import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import SecretBlogPage from "@/pages/SecretBlogPage";
import MerchandisePage from "@/pages/MerchandisePage";
import ItineraryPage from "@/pages/ItineraryPage";
import ItineraryPreviewPage from "@/pages/ItineraryPreviewPage";
import SplittaBroPage from "@/pages/SplittaBroPage";
import DestinationsPage from "@/pages/DestinationsPage";
import ExperiencesPage from "@/pages/ExperiencesPage";
import OneClickPackagePage from "@/pages/OneClickPackagePage";
import ZapierWebhooksPage from "@/pages/ZapierWebhooksPage";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { lazy, Suspense } from "react";
import PerformanceOptimizer from "@/lib/performance-optimizer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <Route path="/destinations" component={DestinationsPage} />
      <Route path="/experiences" component={ExperiencesPage} />
      <ProtectedRoute path="/secret-blog" component={SecretBlogPage} />
      <Route path="/merchandise" component={MerchandisePage} />
      <Route path="/itinerary/preview" component={ItineraryPreviewPage} />
      <ProtectedRoute path="/itinerary/:id" component={ItineraryPage} />
      <Route path="/splitta-bro" component={SplittaBroPage} />
      <Route path="/splittabro/:tripId?" component={SplittaBroPage} />
      <Route path="/one-click-package" component={OneClickPackagePage} />
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
