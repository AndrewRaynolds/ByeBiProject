import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, Calendar, CheckCircle2, ExternalLink, Hotel, Loader2, MapPin, Plane, RefreshCw, Save, Users } from "lucide-react";
import Header from "@/components/Header";
import { AffiliateNotice } from "@/components/AffiliateNotice";
import { GetYourGuideCta } from "@/components/GetYourGuideCta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { buildBookingSearchUrl, hasBookingAffiliateId, isMonetizedAviasalesUrl } from "@/lib/affiliateLinks";
import { openExternalUrl } from "@/lib/externalNavigation";
import { buildPlannedTripPayload, plannedTripMatchesSavedTrip, savePlannedTrip } from "@/lib/plannedTrip";
import { loadProviderSearchContext, type ProviderSearchContext } from "@/lib/providerSearchContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackAffiliateClick, trackProductEvent } from "@/lib/track";
import type { TripContext } from "@/lib/tripContext";
import { flightHandoffResponseSchema, isAviasalesCheckoutUrl } from "@shared/flightSchemas";
import type { Trip } from "@shared/schema";

type FlightHandoffState = "loading" | "ready" | "error";

const RETIRED_PROVIDER_SELECTION_STORAGE_KEY = "byebi:providerSelections:v1";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { locale, t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const flightRequest = useRef<AbortController | null>(null);
  const flightRequestGeneration = useRef(0);
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [searchContext, setSearchContext] = useState<ProviderSearchContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flightHandoffState, setFlightHandoffState] = useState<FlightHandoffState>("loading");
  const [flightHandoffUrl, setFlightHandoffUrl] = useState("");
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripSaveStatus, setTripSaveStatus] = useState<"idle" | "saved" | "existing">("idle");
  const [checkingSavedTrip, setCheckingSavedTrip] = useState(false);

  const fetchFlightHandoff = useCallback(async (context: ProviderSearchContext, fallbackUrl = "") => {
    flightRequest.current?.abort();
    const controller = new AbortController();
    const generation = ++flightRequestGeneration.current;
    flightRequest.current = controller;
    setFlightHandoffState("loading");

    try {
      const params = new URLSearchParams({
        origin: context.origin,
        destination: context.destination,
        departDate: context.startDate,
        returnDate: context.endDate,
        passengers: String(context.participants),
      });
      const response = await apiRequest(
        "GET",
        `/api/flights/search?${params}`,
        undefined,
        { signal: controller.signal, timeoutMs: 10_000 },
      );
      const parsed = flightHandoffResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Invalid flight handoff response");
      if (controller.signal.aborted || generation !== flightRequestGeneration.current) return;
      setFlightHandoffUrl(parsed.data.handoff.url);
      setFlightHandoffState("ready");
    } catch (error: unknown) {
      if (controller.signal.aborted || generation !== flightRequestGeneration.current) return;
      if (fallbackUrl && isAviasalesCheckoutUrl(fallbackUrl)) {
        setFlightHandoffUrl(fallbackUrl);
        setFlightHandoffState("ready");
        return;
      }
      if (import.meta.env.DEV) console.error("Flight handoff error:", error);
      setFlightHandoffUrl("");
      setFlightHandoffState("error");
    }
  }, []);

  useEffect(() => {
    const loaded = loadProviderSearchContext(localStorage);
    if (!loaded) {
      setLocation("/");
      setIsLoading(false);
      return;
    }

    localStorage.removeItem(RETIRED_PROVIDER_SELECTION_STORAGE_KEY);
    localStorage.removeItem("selectedFlight");
    setTripContext(loaded.legacyTripContext);
    setSearchContext(loaded.searchContext);
    trackProductEvent("checkout_viewed");
    void fetchFlightHandoff(
      loaded.searchContext,
      loaded.legacyTripContext.aviasalesCheckoutUrl,
    );
    setIsLoading(false);

    return () => {
      flightRequestGeneration.current += 1;
      flightRequest.current?.abort();
    };
  }, [fetchFlightHandoff, setLocation]);

  useEffect(() => {
    if (!tripContext || !isAuthenticated || !user?.id) {
      setTripSaveStatus("idle");
      return;
    }

    let cancelled = false;
    setCheckingSavedTrip(true);
    apiRequest("GET", `/api/trips/user/${user.id}`)
      .then((response) => response.json() as Promise<Trip[]>)
      .then((trips) => {
        if (!cancelled && trips.some((trip) => plannedTripMatchesSavedTrip(tripContext, trip))) {
          setTripSaveStatus("existing");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCheckingSavedTrip(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, tripContext, user?.id]);

  const openBookingSearch = () => {
    if (!searchContext) return;
    const url = buildBookingSearchUrl({
      destination: searchContext.destination,
      checkInDate: searchContext.startDate,
      checkOutDate: searchContext.endDate,
      adults: searchContext.participants,
    });
    trackAffiliateClick({
      provider: "booking",
      placement: "checkout_hotel",
      destination: searchContext.destination,
      monetized: hasBookingAffiliateId(),
    });
    openExternalUrl(url);
  };

  const handleSaveTrip = async () => {
    if (!tripContext) return;
    if (!isAuthenticated || !user?.id) {
      setLocation("/auth?next=/checkout");
      return;
    }

    setSavingTrip(true);
    try {
      const { created } = await savePlannedTrip(tripContext);
      if (created) trackProductEvent("trip_saved");
      await queryClient.invalidateQueries({ queryKey: [`/api/trips/user/${user.id}`] });
      setTripSaveStatus(created ? "saved" : "existing");
      toast({
        title: t(created ? "chat.tripSaved" : "chat.tripAlreadySaved"),
        description: t(created ? "chat.tripSavedDesc" : "chat.tripAlreadySavedDesc"),
      });
    } catch {
      toast({
        title: t("chat.tripSaveError"),
        description: t("chat.tripSaveErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setSavingTrip(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">{t("common.loading")}</div>;
  }

  if (!tripContext || !searchContext) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" tabIndex={-1} className="product-container py-16">
          <Card>
            <CardHeader><CardTitle>{t("checkout.missingData")}</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">{t("checkout.missingDataDesc")}</p>
              <Button onClick={() => setLocation("/")}>{t("itinerary.backToChatbot")}</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const formattedDates = `${dateFormatter.format(new Date(`${searchContext.startDate}T00:00:00Z`))} – ${dateFormatter.format(new Date(`${searchContext.endDate}T00:00:00Z`))}`;
  const aviasalesIsMonetized = isMonetizedAviasalesUrl(flightHandoffUrl);
  const plannedTripPayload = buildPlannedTripPayload(tripContext);
  const formattedBudget = plannedTripPayload
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(plannedTripPayload.budget)
    : t("checkout.notSpecified");
  const preferencesText = searchContext.preferences.length > 0
    ? searchContext.preferences.join(", ")
    : t("checkout.notSpecified");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" tabIndex={-1} className="product-container space-y-6 py-8 sm:py-12">
        <section aria-labelledby="travel-options-title" className="space-y-4">
          <div>
            <h1 id="travel-options-title" className="font-display text-3xl font-bold sm:text-4xl">{t("checkout.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("checkout.subtitle")}</p>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-xl">{t("checkout.travelBrief")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <p className="flex items-center gap-2"><MapPin aria-hidden="true" />{searchContext.origin} → {searchContext.destination}</p>
              <p className="flex items-center gap-2"><Calendar aria-hidden="true" />{formattedDates}</p>
              <p className="flex items-center gap-2"><Users aria-hidden="true" />{searchContext.participants} {t("common.people")}</p>
              <div>
                <p className="text-xs text-muted-foreground">{t("checkout.budgetPerPerson")}</p>
                <p className="mt-1 font-medium" data-testid="travel-brief-budget">{formattedBudget}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("checkout.preferences")}</p>
                <p className="mt-1 font-medium" data-testid="travel-brief-preferences">{preferencesText}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-3 text-xl"><Plane aria-hidden="true" />{t("checkout.flightOptions")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("checkout.flightProviderNote")}</p>
            {searchContext.participants > 9 && (
              <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" data-testid="flight-large-group-note">
                {t("checkout.largeGroupFlightNote", { count: searchContext.participants })}
              </p>
            )}
            {flightHandoffState === "loading" && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" />{t("checkout.loadingFlights")}
              </div>
            )}
            {flightHandoffState === "error" && (
              <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
                <p className="flex items-start gap-2 text-sm" role="status">
                  <AlertCircle className="mt-0.5 shrink-0" />{t("checkout.flightUnavailable")}
                </p>
                <Button variant="outline" onClick={() => void fetchFlightHandoff(searchContext)} data-testid="button-retry-flights">
                  <RefreshCw />{t("checkout.retryFlightSearch")}
                </Button>
              </div>
            )}
            {flightHandoffState === "ready" && flightHandoffUrl && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("checkout.aviasalesHandoffNote")}</p>
                {aviasalesIsMonetized && <AffiliateNotice showText={false} />}
                <Button asChild variant="external" className="h-auto min-h-11 w-full whitespace-normal">
                  <a
                    href={flightHandoffUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackAffiliateClick({
                      provider: "aviasales",
                      placement: "checkout_flight",
                      destination: searchContext.destination,
                      monetized: aviasalesIsMonetized,
                    })}
                  >
                    {t("checkout.compareOnAviasales")}<ExternalLink />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-3 text-xl"><Hotel aria-hidden="true" />{t("checkout.hotelOptions")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("checkout.hotelProviderNote")}</p>
            <p className="text-sm text-muted-foreground">{t("checkout.bookingHandoffNote")}</p>
            <Button
              className="h-auto min-h-11 w-full whitespace-normal"
              variant="external"
              onClick={openBookingSearch}
              data-testid="button-search-hotels-booking"
            >
              {t("checkout.searchHotelsBooking")}<ExternalLink />
            </Button>
            {hasBookingAffiliateId() && <AffiliateNotice showText={false} />}
          </CardContent>
        </Card>

        <section aria-labelledby="activities-title" className="space-y-3">
          <div>
            <h2 id="activities-title" className="font-display text-2xl font-semibold">{t("checkout.activitiesTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("checkout.activitiesHandoffNote")}</p>
          </div>
          <GetYourGuideCta destinationCity={searchContext.destination} placement="checkout" />
        </section>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{t("checkout.saveTripTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(plannedTripPayload ? "checkout.saveTripDesc" : "checkout.saveTripIncomplete")}
              </p>
            </div>
            <Button
              onClick={handleSaveTrip}
              disabled={!plannedTripPayload || savingTrip || checkingSavedTrip || tripSaveStatus !== "idle"}
              className="min-h-11 w-full shrink-0 md:w-auto"
              data-testid="button-save-trip"
            >
              {savingTrip ? <Loader2 className="animate-spin" /> : tripSaveStatus !== "idle" ? <CheckCircle2 /> : <Save />}
              {!plannedTripPayload
                ? t("checkout.completePlanToSave")
                : tripSaveStatus === "saved"
                  ? t("checkout.tripSaved")
                  : tripSaveStatus === "existing"
                    ? t("checkout.tripAlreadySaved")
                    : isAuthenticated
                      ? t("checkout.saveTrip")
                      : t("checkout.signInToSave")}
            </Button>
          </CardContent>
        </Card>

        <Button size="lg" variant="outline" className="w-full" onClick={() => setLocation("/")} data-testid="button-back-home">
          {t("checkout.backToHome")}
        </Button>
      </main>
    </div>
  );
}
