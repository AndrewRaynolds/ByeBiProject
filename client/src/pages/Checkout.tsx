import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { plannedTripMatchesSavedTrip, savePlannedTrip } from "@/lib/plannedTrip";
import { loadProviderSearchContext, type ProviderSearchContext } from "@/lib/providerSearchContext";
import { loadProviderSelections, saveProviderSelections } from "@/lib/providerSelections";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackAffiliateClick, trackProductEvent } from "@/lib/track";
import type { TripContext } from "@/lib/tripContext";
import { getCityCode } from "@shared/cityMapping";
import { calculateTripDays } from "@shared/dateUtils";
import { flightCheckoutSearchResponseSchema, type FlightCheckoutOffer } from "@shared/flightSchemas";
import { hotelSearchResponseSchema, type HotelResult } from "@shared/hotelSchemas";
import type { SelectedFlight, SelectedHotel } from "@shared/providerSelectionSchemas";
import type { Trip } from "@shared/schema";

type ProviderState = "loading" | "live" | "empty" | "error" | "unsupported";

function toSelectedFlight(offer: FlightCheckoutOffer, handoffUrl: string): SelectedFlight {
  const first = offer.outbound[0];
  const last = offer.outbound[offer.outbound.length - 1];
  return {
    provider: "amadeus",
    offerId: offer.offerId,
    airlineNames: offer.airlines,
    departureAt: first.departure.at,
    arrivalAt: last.arrival.at,
    ...(offer.inbound?.[0]?.departure.at ? { returnDepartureAt: offer.inbound[0].departure.at } : {}),
    price: offer.price,
    currency: offer.currency,
    priceScope: "searched-passengers-total",
    quotedPassengers: offer.quotedPassengers,
    externalHandoff: { provider: "aviasales", url: handoffUrl, exactOffer: false },
  };
}

function toSelectedHotel(hotel: HotelResult): SelectedHotel {
  return {
    provider: "amadeus",
    hotelId: hotel.hotelId,
    offerId: hotel.offerId,
    name: hotel.name,
    checkInDate: hotel.checkInDate,
    checkOutDate: hotel.checkOutDate,
    priceTotal: hotel.priceTotal,
    currency: hotel.currency,
    priceScope: "quoted-occupancy-total-stay",
    quotedAdults: hotel.quotedAdults,
    requestedAdults: hotel.requestedAdults,
  };
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { locale, t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const flightRequest = useRef<AbortController | null>(null);
  const hotelRequest = useRef<AbortController | null>(null);
  const flightRequestGeneration = useRef(0);
  const hotelRequestGeneration = useRef(0);
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [searchContext, setSearchContext] = useState<ProviderSearchContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flightState, setFlightState] = useState<ProviderState>("loading");
  const [hotelState, setHotelState] = useState<ProviderState>("loading");
  const [flights, setFlights] = useState<FlightCheckoutOffer[]>([]);
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [flightCheckoutUrl, setFlightCheckoutUrl] = useState("");
  const [selectedFlight, setSelectedFlight] = useState<SelectedFlight | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<SelectedHotel | null>(null);
  const [selectionsReady, setSelectionsReady] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripSaveStatus, setTripSaveStatus] = useState<"idle" | "saved" | "existing">("idle");
  const [checkingSavedTrip, setCheckingSavedTrip] = useState(false);

  const fetchFlights = useCallback(async (context: ProviderSearchContext) => {
    flightRequest.current?.abort();
    const controller = new AbortController();
    const requestGeneration = ++flightRequestGeneration.current;
    flightRequest.current = controller;
    setFlightState("loading");
    setFlights([]);
    try {
      const params = new URLSearchParams({ origin: context.origin, destination: context.destination, departDate: context.startDate, returnDate: context.endDate, passengers: String(context.participants), currency: "EUR" });
      const response = await apiRequest("GET", `/api/flights/search?${params}`, undefined, { signal: controller.signal, timeoutMs: 30_000 });
      const parsed = flightCheckoutSearchResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Invalid flight response");
      if (controller.signal.aborted || requestGeneration !== flightRequestGeneration.current) return;
      setFlightCheckoutUrl(parsed.data.handoff.url);
      setFlights(parsed.data.flights);
      if (parsed.data.flightDataStatus === "live") {
        setSelectedFlight((current) => {
          if (!current) return null;
          const matchingOffer = parsed.data.flights.find((offer) =>
            offer.provider === current.provider && offer.offerId === current.offerId,
          );
          return matchingOffer ? toSelectedFlight(matchingOffer, parsed.data.handoff.url) : null;
        });
      }
      setFlightState(parsed.data.flightDataStatus === "unavailable" ? "error" : parsed.data.flights.length ? "live" : "empty");
    } catch (error: unknown) {
      if (controller.signal.aborted || requestGeneration !== flightRequestGeneration.current) return;
      if (import.meta.env.DEV) console.error("Flight search error:", error);
      setFlightState("error");
    }
  }, []);

  const fetchHotels = useCallback(async (context: ProviderSearchContext) => {
    hotelRequest.current?.abort();
    const controller = new AbortController();
    const requestGeneration = ++hotelRequestGeneration.current;
    hotelRequest.current = controller;
    setHotelState("loading");
    setHotels([]);
    const cityCode = getCityCode(context.destination);
    if (!cityCode) {
      setHotelState("unsupported");
      return;
    }
    try {
      const params = new URLSearchParams({ cityCode, checkInDate: context.startDate, checkOutDate: context.endDate, adults: String(context.participants), currency: "EUR" });
      const response = await apiRequest("GET", `/api/hotels/search?${params}`, undefined, { signal: controller.signal, timeoutMs: 30_000 });
      const parsed = hotelSearchResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Invalid hotel response");
      if (controller.signal.aborted || requestGeneration !== hotelRequestGeneration.current) return;
      setHotels(parsed.data.hotels.slice(0, 5));
      if (parsed.data.hotelDataStatus === "live") {
        setSelectedHotel((current) => {
          if (!current) return null;
          const matchingOffer = parsed.data.hotels.find((hotel) =>
            hotel.provider === current.provider &&
            hotel.hotelId === current.hotelId &&
            hotel.offerId === current.offerId,
          );
          return matchingOffer ? toSelectedHotel(matchingOffer) : null;
        });
      }
      setHotelState(parsed.data.hotelDataStatus === "unavailable" ? "error" : parsed.data.hotels.length ? "live" : "empty");
    } catch (error: unknown) {
      if (controller.signal.aborted || requestGeneration !== hotelRequestGeneration.current) return;
      if (import.meta.env.DEV) console.error("Hotel search error:", error);
      setHotelState("error");
    }
  }, []);

  useEffect(() => {
    const loaded = loadProviderSearchContext(localStorage);
    if (!loaded) {
      setLocation("/");
      setIsLoading(false);
      return;
    }
    setTripContext(loaded.legacyTripContext);
    setSearchContext(loaded.searchContext);
    setFlightCheckoutUrl(loaded.legacyTripContext.aviasalesCheckoutUrl);
    const restored = loadProviderSelections(localStorage, loaded.searchContext.fingerprint);
    setSelectedFlight(restored?.selectedFlight ?? null);
    setSelectedHotel(restored?.selectedHotel ?? null);
    setSelectionsReady(true);
    trackProductEvent("checkout_viewed");
    void fetchFlights(loaded.searchContext);
    void fetchHotels(loaded.searchContext);
    setIsLoading(false);
    return () => {
      flightRequestGeneration.current += 1;
      hotelRequestGeneration.current += 1;
      flightRequest.current?.abort();
      hotelRequest.current?.abort();
    };
  }, [fetchFlights, fetchHotels, setLocation]);

  useEffect(() => {
    if (!searchContext || !selectionsReady) return;
    saveProviderSelections(localStorage, {
      searchFingerprint: searchContext.fingerprint,
      ...(selectedFlight ? { selectedFlight } : {}),
      ...(selectedHotel ? { selectedHotel } : {}),
    });
  }, [searchContext, selectedFlight, selectedHotel, selectionsReady]);

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
        if (!cancelled && trips.some((trip) => plannedTripMatchesSavedTrip(tripContext, trip))) setTripSaveStatus("existing");
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setCheckingSavedTrip(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, tripContext, user?.id]);

  const formatPrice = (amount: number, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  const formatDateTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  const openBookingSearch = (placement: "checkout_hotel" | "checkout_hotel_fallback", hotel?: SelectedHotel) => {
    if (!searchContext) return;
    const url = buildBookingSearchUrl({ ...(hotel ? { hotelName: hotel.name } : {}), destination: searchContext.destination, checkInDate: searchContext.startDate, checkOutDate: searchContext.endDate, adults: searchContext.participants });
    trackAffiliateClick({ provider: "booking", placement, destination: searchContext.destination, monetized: hasBookingAffiliateId() });
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
      toast({ title: t(created ? "chat.tripSaved" : "chat.tripAlreadySaved"), description: t(created ? "chat.tripSavedDesc" : "chat.tripAlreadySavedDesc") });
    } catch {
      toast({ title: t("chat.tripSaveError"), description: t("chat.tripSaveErrorDesc"), variant: "destructive" });
    } finally {
      setSavingTrip(false);
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background">{t("common.loading")}</div>;
  if (!tripContext || !searchContext) {
    return <div className="min-h-screen bg-background"><Header /><main id="main-content" tabIndex={-1} className="product-container py-16"><Card><CardHeader><CardTitle>{t("checkout.missingData")}</CardTitle></CardHeader><CardContent><p className="mb-6 text-muted-foreground">{t("checkout.missingDataDesc")}</p><Button onClick={() => setLocation("/")}>{t("itinerary.backToChatbot")}</Button></CardContent></Card></main></div>;
  }

  const tripDays = calculateTripDays(searchContext.startDate, searchContext.endDate);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const formattedDates = `${dateFormatter.format(new Date(`${searchContext.startDate}T00:00:00Z`))} – ${dateFormatter.format(new Date(`${searchContext.endDate}T00:00:00Z`))}`;
  const aviasalesIsMonetized = isMonetizedAviasalesUrl(flightCheckoutUrl);
  const currentSelectedFlight = flightState === "live" ? selectedFlight : null;
  const currentSelectedHotel = hotelState === "live" ? selectedHotel : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" tabIndex={-1} className="product-container space-y-6 py-8 sm:py-12">
        <section aria-labelledby="travel-options-title" className="space-y-4">
          <div><h1 id="travel-options-title" className="font-display text-3xl font-bold sm:text-4xl">{t("checkout.title")}</h1><p className="mt-2 text-muted-foreground">{t("checkout.subtitle")}</p></div>
          <Card><CardHeader><CardTitle className="text-xl">{t("checkout.travelBrief")}</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-3"><p className="flex items-center gap-2"><MapPin aria-hidden="true" />{searchContext.origin} → {searchContext.destination}</p><p className="flex items-center gap-2"><Calendar aria-hidden="true" />{formattedDates}</p><p className="flex items-center gap-2"><Users aria-hidden="true" />{searchContext.participants} {t("common.people")}</p></CardContent></Card>
        </section>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-3 text-xl"><Plane aria-hidden="true" />{t("checkout.flightOptions")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("checkout.flightProviderNote")}</p>
            {searchContext.participants > 9 && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" data-testid="flight-large-group-note">{t("checkout.largeGroupFlightNote", { count: searchContext.participants })}</p>}
            {flightState === "loading" && <ProviderLoading label={t("checkout.loadingFlights")} />}
            {flightState === "error" && <ProviderMessage text={t("checkout.flightUnavailable")}><Button variant="outline" onClick={() => void fetchFlights(searchContext)} data-testid="button-retry-flights"><RefreshCw />{t("checkout.retryFlightSearch")}</Button></ProviderMessage>}
            {flightState === "empty" && <ProviderMessage text={t("checkout.noFlightsForDates")} />}
            {flightState === "live" && <div className="space-y-3">
              {flights.map((flight, index) => {
                const selected = selectedFlight?.offerId === flight.offerId;
                const first = flight.outbound[0];
                const last = flight.outbound[flight.outbound.length - 1];
                return <button type="button" key={flight.offerId} aria-pressed={selected} onClick={() => setSelectedFlight(selected ? null : toSelectedFlight(flight, flightCheckoutUrl))} className={`w-full rounded-lg border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong"}`} data-testid={`flight-option-${index + 1}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold">{flight.airlines.join(", ")}</p><p className="mt-1 text-sm text-muted-foreground">{first.departure.iataCode} {formatDateTime(first.departure.at)} → {last.arrival.iataCode} {formatDateTime(last.arrival.at)}</p><p className="mt-1 text-sm">{flight.stops === 0 ? t("checkout.directFlight") : t("checkout.flightStops", { count: flight.stops })} · {flight.totalDuration}</p></div><div className="sm:text-right"><p className="text-lg font-bold">{formatPrice(flight.price, flight.currency)}</p><p className="text-xs text-muted-foreground">{t("checkout.flightPriceScope", { count: flight.quotedPassengers })}</p><p className="mt-1 text-sm font-medium">{selected ? t("checkout.selected") : t("checkout.selectOption")}</p></div></div>
                </button>;
              })}
            </div>}
            {flightCheckoutUrl && <div className="space-y-3 border-t pt-4"><p className="text-sm text-muted-foreground">{t("checkout.aviasalesHandoffNote")}</p>{aviasalesIsMonetized && <AffiliateNotice showText={false} />}<Button asChild variant="external" className="h-auto min-h-11 w-full whitespace-normal"><a href={flightCheckoutUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackAffiliateClick({ provider: "aviasales", placement: "checkout_flight", destination: searchContext.destination, monetized: aviasalesIsMonetized })}>{t("checkout.compareOnAviasales")}<ExternalLink /></a></Button></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-3 text-xl"><Hotel aria-hidden="true" />{t("checkout.hotelOptions")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("checkout.hotelProviderNote")}</p>
            {hotelState === "loading" && <ProviderLoading label={t("checkout.loadingHotels")} />}
            {hotelState === "unsupported" && <HotelFallback text={t("checkout.unsupportedDest", { destination: searchContext.destination })} onOpen={() => openBookingSearch("checkout_hotel_fallback")} t={t} />}
            {hotelState === "error" && <HotelFallback text={t("checkout.hotelLoadError")} onRetry={() => void fetchHotels(searchContext)} onOpen={() => openBookingSearch("checkout_hotel_fallback")} t={t} />}
            {hotelState === "empty" && <HotelFallback text={t("checkout.noHotelsForDates")} onOpen={() => openBookingSearch("checkout_hotel_fallback")} t={t} />}
            {hotelState === "live" && <div className="space-y-3">
              {hotels.map((hotel, index) => {
                const selected = selectedHotel?.offerId === hotel.offerId;
                return <button type="button" key={hotel.offerId} aria-pressed={selected} onClick={() => setSelectedHotel(selected ? null : toSelectedHotel(hotel))} className={`w-full rounded-lg border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong"}`} data-testid={`hotel-option-${index + 1}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold">{hotel.name}</p><p className="mt-1 text-sm text-muted-foreground">{hotel.roomDescription || t("common.standardRoom")}</p><p className="mt-1 text-xs text-muted-foreground">{hotel.checkInDate} → {hotel.checkOutDate}</p></div><div className="sm:text-right"><p className="text-lg font-bold">{formatPrice(hotel.priceTotal, hotel.currency)}</p><p className="max-w-xs text-xs text-muted-foreground">{t(hotel.requestedAdults === hotel.quotedAdults ? "checkout.hotelPriceScopeFullGroup" : "checkout.hotelPriceScopePartialGroup", { count: hotel.quotedAdults, nights: tripDays })}</p><p className="mt-1 text-sm font-medium">{selected ? t("checkout.selected") : t("checkout.selectOption")}</p></div></div>
                </button>;
              })}
            </div>}
            {currentSelectedHotel && <div className="space-y-3 border-t pt-4"><p className="text-sm text-muted-foreground">{t("checkout.bookingHandoffNote")}</p><Button className="h-auto min-h-11 w-full whitespace-normal" variant="external" onClick={() => openBookingSearch("checkout_hotel", currentSelectedHotel)} data-testid="button-book-hotel">{t("checkout.continueOnBooking")}<ExternalLink /></Button>{hasBookingAffiliateId() && <AffiliateNotice showText={false} />}</div>}
          </CardContent>
        </Card>

        <section aria-labelledby="activities-title" className="space-y-3"><div><h2 id="activities-title" className="font-display text-2xl font-semibold">{t("checkout.activitiesTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("checkout.activitiesHandoffNote")}</p></div><GetYourGuideCta destinationCity={searchContext.destination} placement="checkout" /></section>

        {(currentSelectedFlight || currentSelectedHotel) && <Card data-testid="selected-options-summary"><CardHeader><CardTitle className="text-xl">{t("checkout.selectedOptions")}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{currentSelectedFlight && <SelectionRow label={t("checkout.flight")} value={`${currentSelectedFlight.airlineNames.join(", ")} · ${formatPrice(currentSelectedFlight.price, currentSelectedFlight.currency)}`} onRemove={() => setSelectedFlight(null)} removeLabel={t("checkout.deselectFlight")} />}{currentSelectedHotel && <SelectionRow label={t("checkout.hotel")} value={`${currentSelectedHotel.name} · ${formatPrice(currentSelectedHotel.priceTotal, currentSelectedHotel.currency)}`} onRemove={() => setSelectedHotel(null)} removeLabel={t("checkout.deselectHotel")} />}<p className="text-muted-foreground">{t("checkout.selectionDisclaimer")}</p></CardContent></Card>}

        <Card><CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{t("checkout.saveTripTitle")}</p><p className="mt-1 text-sm text-muted-foreground">{t("checkout.saveTripDesc")}</p></div><Button onClick={handleSaveTrip} disabled={savingTrip || checkingSavedTrip || tripSaveStatus !== "idle"} className="min-h-11 w-full shrink-0 md:w-auto" data-testid="button-save-trip">{savingTrip ? <Loader2 className="animate-spin" /> : tripSaveStatus !== "idle" ? <CheckCircle2 /> : <Save />}{tripSaveStatus === "saved" ? t("checkout.tripSaved") : tripSaveStatus === "existing" ? t("checkout.tripAlreadySaved") : isAuthenticated ? t("checkout.saveTrip") : t("checkout.signInToSave")}</Button></CardContent></Card>
        <Button size="lg" variant="outline" className="w-full" onClick={() => setLocation("/")} data-testid="button-back-home">{t("checkout.backToHome")}</Button>
      </main>
    </div>
  );
}

function ProviderLoading({ label }: { label: string }) {
  return <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status"><Loader2 className="animate-spin" />{label}</div>;
}

function ProviderMessage({ text, children }: { text: string; children?: ReactNode }) {
  return <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-4"><p className="flex items-start gap-2 text-sm" role="status"><AlertCircle className="mt-0.5 shrink-0" />{text}</p>{children}</div>;
}

function HotelFallback({ text, onRetry, onOpen, t }: { text: string; onRetry?: () => void; onOpen: () => void; t: (key: string, params?: Record<string, string | number>) => string }) {
  return <ProviderMessage text={text}><div className="flex flex-col gap-2 sm:flex-row">{onRetry && <Button variant="outline" onClick={onRetry} data-testid="button-retry-hotels"><RefreshCw />{t("checkout.retryHotelSearch")}</Button>}<Button variant="external" onClick={onOpen} data-testid="button-search-hotels-booking">{t("checkout.searchHotelsBooking")}<ExternalLink /></Button></div>{hasBookingAffiliateId() && <AffiliateNotice showText={false} />}</ProviderMessage>;
}

function SelectionRow({ label, value, onRemove, removeLabel }: { label: string; value: string; onRemove: () => void; removeLabel: string }) {
  return <div className="flex flex-col gap-2 rounded-lg bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between"><p><span className="font-semibold">{label}:</span> {value}</p><Button variant="quiet" size="sm" onClick={onRemove}>{removeLabel}</Button></div>;
}
