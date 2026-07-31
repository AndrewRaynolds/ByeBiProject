import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import RouteLoadingFallback from "@/components/RouteLoadingFallback";
import PerformanceOptimizer from "@/lib/performance-optimizer";

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const HomeBride = lazy(() => import("@/pages/HomeBride"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const SecretBlogPage = lazy(() => import("@/pages/SecretBlogPage"));
const SecretBlogPostPage = lazy(() => import("@/pages/SecretBlogPostPage"));
const MerchandisePage = lazy(() => import("@/pages/MerchandisePage"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const SplittaBroPage = lazy(() => import("@/pages/SplittaBroPage"));
const SplittaBridePage = lazy(() => import("@/pages/SplittaBridePage"));
const DestinationsPage = lazy(() => import("@/pages/DestinationsPage"));
const ExperiencesPage = lazy(() => import("@/pages/ExperiencesPage"));
const OneClickPackagePage = lazy(() => import("@/pages/OneClickPackagePage"));
const ZapierWebhooksPage = lazy(() => import("@/pages/ZapierWebhooksPage"));
const AuthPage = lazy(() => import("@/pages/auth-page"));

interface BrandedAppProps {
  selectedBrand: "byebro" | "byebride";
}

function Router({ selectedBrand }: BrandedAppProps) {
  const HomePage = selectedBrand === "byebride" ? HomeBride : Home;
  const SplittaPage =
    selectedBrand === "byebride" ? SplittaBridePage : SplittaBroPage;

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <Route path="/destinations" component={DestinationsPage} />
      <Route path="/experiences" component={ExperiencesPage} />
      <Route path="/secret-blog/:id" component={SecretBlogPostPage} />
      <Route path="/secret-blog" component={SecretBlogPage} />
      <Route path="/merchandise" component={MerchandisePage} />
      <Route path="/itinerary/:id">{() => <Redirect to="/checkout" />}</Route>
      <Route path="/itinerary">{() => <Redirect to="/checkout" />}</Route>
      <Route path="/checkout" component={Checkout} />
      <ProtectedRoute path="/splitta-bro" component={SplittaPage} />
      <ProtectedRoute path="/splitta-bride" component={SplittaPage} />
      <Route path="/one-click-package" component={OneClickPackagePage} />
      <ProtectedRoute path="/zapier-webhooks" component={ZapierWebhooksPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function BrandedApp({ selectedBrand }: BrandedAppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <PerformanceOptimizer />
          <Suspense fallback={<RouteLoadingFallback />}>
            <Router selectedBrand={selectedBrand} />
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
