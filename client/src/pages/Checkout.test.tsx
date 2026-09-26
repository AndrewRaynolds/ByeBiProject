/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProviderSearchFingerprint, PROVIDER_SELECTION_STORAGE_KEY } from "@shared/providerSelectionSchemas";
import { saveProviderSelections } from "@/lib/providerSelections";
import Checkout from "./Checkout";

const { navigate, apiRequest, savePlannedTrip, plannedTripMatchesSavedTrip, authState, toast, invalidateQueries, trackAffiliateClick, openExternalUrl } = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiRequest: vi.fn(),
  savePlannedTrip: vi.fn(),
  plannedTripMatchesSavedTrip: vi.fn(),
  authState: { user: null as null | { id: string }, isAuthenticated: false },
  toast: vi.fn(),
  invalidateQueries: vi.fn(),
  trackAffiliateClick: vi.fn(),
  openExternalUrl: vi.fn(),
}));

vi.mock("wouter", () => ({ useLocation: () => ["/checkout", navigate] }));
vi.mock("@/lib/queryClient", () => ({ apiRequest, queryClient: { invalidateQueries } }));
vi.mock("@/lib/plannedTrip", () => ({ savePlannedTrip, plannedTripMatchesSavedTrip }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/track", () => ({ trackAffiliateClick, trackProductEvent: vi.fn() }));
vi.mock("@/lib/externalNavigation", () => ({ openExternalUrl }));
vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/GetYourGuideCta", () => ({ GetYourGuideCta: () => <div>GetYourGuide destination handoff</div> }));
vi.mock("@/components/AffiliateNotice", () => ({ AffiliateNotice: () => <div>Affiliate notice</div> }));
vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    locale: "it",
    t: (key: string, values?: Record<string, string | number>) => ({
      "common.people": "persone",
      "checkout.flight": "Volo",
      "checkout.hotel": "Hotel",
      "checkout.flightOptions": "Opzioni volo",
      "checkout.hotelOptions": "Opzioni hotel",
      "checkout.largeGroupFlightNote": `Gruppo di ${values?.count} persone; massimo 9 adulti per ricerca.`,
      "checkout.loadingFlights": "Ricerca voli disponibili...",
      "checkout.flightUnavailable": "Ricerca voli temporaneamente non disponibile.",
      "checkout.retryFlightSearch": "Riprova la ricerca voli",
      "checkout.compareOnAviasales": "Confronta su Aviasales",
      "checkout.flightPriceScope": `Totale per ${values?.count} passeggeri`,
      "checkout.directFlight": "Diretto",
      "checkout.flightStops": `${values?.count} scali`,
      "checkout.selected": "Selezionato in ByeBi",
      "checkout.selectOption": "Seleziona opzione",
      "checkout.loadingHotels": "Caricamento hotel...",
      "checkout.hotelLoadError": "Servizio hotel temporaneamente irraggiungibile.",
      "checkout.noHotelsForDates": "Nessun hotel per queste date.",
      "checkout.retryHotelSearch": "Riprova la ricerca",
      "checkout.searchHotelsBooking": "Cerca hotel su Booking.com",
      "checkout.hotelPriceScopeFullGroup": `Totale per l'intero gruppo di ${values?.count} adulti`,
      "checkout.hotelPriceScopePartialGroup": `Totale per ${values?.count} adulti, non per il gruppo`,
      "checkout.continueOnBooking": "Continua su Booking.com",
      "checkout.selectedOptions": "Opzioni selezionate",
      "checkout.deselectFlight": "Deseleziona volo",
      "checkout.deselectHotel": "Deseleziona hotel",
      "checkout.saveTripTitle": "Salva questa pianificazione",
      "checkout.saveTripDesc": "Nulla viene salvato automaticamente.",
      "checkout.signInToSave": "Accedi per salvare",
      "checkout.saveTrip": "Salva viaggio",
      "checkout.tripSaved": "Viaggio salvato",
      "checkout.tripAlreadySaved": "Già salvato",
      "chat.tripSaved": "Viaggio salvato",
      "chat.tripSavedDesc": "Disponibile nella Dashboard.",
      "chat.tripAlreadySaved": "Viaggio già salvato",
      "chat.tripAlreadySavedDesc": "Già presente nella Dashboard.",
    }[key] ?? key),
  }),
}));

const checkoutUrl = "https://www.aviasales.com/search/ROM2011BCN23119?marker=685469";
const segment = {
  departure: { iataCode: "FCO", at: "2026-11-20T10:00:00" },
  arrival: { iataCode: "BCN", at: "2026-11-20T12:00:00" },
  carrierCode: "VY",
  flightNumber: "6101",
  duration: "PT2H",
};
const flightsResponse = (live = true) => ({
  origin: "ROM",
  destination: "BCN",
  departDate: "2026-11-20",
  returnDate: "2026-11-23",
  passengers: 12,
  checkoutAdults: 9,
  groupBookingRequired: true,
  currency: "EUR",
  checkoutUrl,
  handoff: { provider: "aviasales", url: checkoutUrl, exactOffer: false },
  flightDataStatus: live ? "live" : "unavailable",
  fetchedAt: "2026-09-26T10:00:00.000Z",
  flights: live ? [
    { provider: "amadeus", offerId: "flight-a", airlines: ["Vueling"], outbound: [segment], price: 900, currency: "EUR", priceScope: "searched-passengers-total", quotedPassengers: 9, requestedPassengers: 12, totalDuration: "PT2H", stops: 0 },
    { provider: "amadeus", offerId: "flight-b", airlines: ["Iberia"], outbound: [segment], price: 950, currency: "EUR", priceScope: "searched-passengers-total", quotedPassengers: 9, requestedPassengers: 12, totalDuration: "PT2H", stops: 0 },
  ] : [],
});
const hotel = (offerId = "hotel-offer-a", name = "Hotel Test") => ({
  provider: "amadeus",
  hotelId: `id-${offerId}`,
  name,
  priceTotal: 420,
  currency: "EUR",
  priceScope: "quoted-occupancy-total-stay",
  quotedAdults: 2,
  requestedAdults: 12,
  offerId,
  bookingFlow: "REDIRECT",
  paymentPolicy: "PREPAY",
  checkInDate: "2026-11-20",
  checkOutDate: "2026-11-23",
  roomDescription: "Camera doppia",
});
const hotelsResponse = (live = true) => ({
  cityCode: "BCN",
  checkInDate: "2026-11-20",
  checkOutDate: "2026-11-23",
  adults: 12,
  currency: "EUR",
  hotelDataStatus: live ? "live" : "unavailable",
  fetchedAt: "2026-09-26T10:00:00.000Z",
  hotels: live ? [hotel(), hotel("hotel-offer-b", "Hotel Due")] : [],
});

function setDefaultApiResponses(flightLive = true, hotelLive = true) {
  apiRequest.mockImplementation(async (_method: string, url: string) => ({
    json: async () => url.startsWith("/api/flights/search?") ? flightsResponse(flightLive) : hotelsResponse(hotelLive),
  }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function seedProviderSelections(options: { flightId?: string; hotelOfferId?: string; hotelId?: string } = {}) {
  saveProviderSelections(localStorage, {
    searchFingerprint: createProviderSearchFingerprint({
      origin: "Roma",
      destination: "Barcellona",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      participants: 12,
    }),
    selectedFlight: {
      provider: "amadeus",
      offerId: options.flightId ?? "flight-a",
      airlineNames: ["Old Airline"],
      departureAt: "2026-11-20T08:00:00",
      arrivalAt: "2026-11-20T10:00:00",
      price: 100,
      currency: "EUR",
      priceScope: "searched-passengers-total",
      quotedPassengers: 9,
      externalHandoff: { provider: "aviasales", url: checkoutUrl, exactOffer: false },
    },
    selectedHotel: {
      provider: "amadeus",
      hotelId: options.hotelId ?? "id-hotel-offer-a",
      offerId: options.hotelOfferId ?? "hotel-offer-a",
      name: "Old Hotel",
      checkInDate: "2026-11-20",
      checkOutDate: "2026-11-23",
      priceTotal: 100,
      currency: "EUR",
      priceScope: "quoted-occupancy-total-stay",
      quotedAdults: 2,
      requestedAdults: 12,
    },
  });
}

describe("provider options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.isAuthenticated = false;
    localStorage.clear();
    localStorage.setItem("currentItinerary", JSON.stringify({ origin: "Roma", destination: "Barcellona", startDate: "2026-11-20", endDate: "2026-11-23", people: 12, aviasalesCheckoutUrl: checkoutUrl, flightLabel: "Roma → Barcellona" }));
    setDefaultApiResponses();
  });

  it("renders independent provider failures and keeps real handoffs usable", async () => {
    setDefaultApiResponses(false, false);
    render(<Checkout />);
    expect(await screen.findByText("Ricerca voli temporaneamente non disponibile.")).toBeInTheDocument();
    expect(await screen.findByText("Servizio hotel temporaneamente irraggiungibile.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Confronta su Aviasales" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerca hotel su Booking.com" })).toBeInTheDocument();
    expect(screen.getByText("GetYourGuide destination handoff")).toBeInTheDocument();
  });

  it("selects, changes, and deselects real flight and hotel offers without auth or save", async () => {
    render(<Checkout />);
    const flightA = await screen.findByTestId("flight-option-1");
    const flightB = screen.getByTestId("flight-option-2");
    fireEvent.click(flightA);
    expect(flightA).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(flightB);
    expect(flightB).toHaveAttribute("aria-pressed", "true");
    expect(flightA).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(flightB);
    expect(flightB).toHaveAttribute("aria-pressed", "false");

    const hotelA = screen.getByTestId("hotel-option-1");
    const hotelB = screen.getByTestId("hotel-option-2");
    fireEvent.click(hotelA);
    fireEvent.click(hotelB);
    expect(hotelB).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText(/non per il gruppo/).length).toBeGreaterThan(0);
    fireEvent.click(hotelB);
    expect(hotelB).toHaveAttribute("aria-pressed", "false");
    expect(savePlannedTrip).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(expect.stringContaining("/auth"));
  });

  it("restores matching selections after remount and invalidates stale search state", async () => {
    const first = render(<Checkout />);
    fireEvent.click(await screen.findByTestId("flight-option-1"));
    fireEvent.click(screen.getByTestId("hotel-option-1"));
    await waitFor(() => {
      expect(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)).toContain("flight-a");
      expect(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)).toContain("hotel-offer-a");
    });
    first.unmount();
    const secondRender = render(<Checkout />);
    expect(await screen.findByTestId("flight-option-1")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("hotel-option-1")).toHaveAttribute("aria-pressed", "true");

    const stored = localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)!;
    const stale = JSON.parse(stored);
    stale.searchFingerprint = "provider-search-v1:ffffffff";
    localStorage.setItem(PROVIDER_SELECTION_STORAGE_KEY, JSON.stringify(stale));
    secondRender.unmount();
    render(<Checkout />);
    expect(await screen.findByTestId("flight-option-1")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("hotel-option-1")).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)).toBeNull();
  });

  it("clears restored offers missing from successful live refreshes, including live-empty", async () => {
    seedProviderSelections({ flightId: "missing-flight", hotelOfferId: "missing-hotel", hotelId: "missing-id" });
    apiRequest.mockImplementation(async (_method: string, url: string) => ({
      json: async () => url.startsWith("/api/flights/search?")
        ? { ...flightsResponse(), flights: [] }
        : { ...hotelsResponse(), hotels: [] },
    }));

    render(<Checkout />);
    await waitFor(() => expect(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)).toBeNull());
    expect(screen.queryByTestId("selected-options-summary")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-book-hotel")).not.toBeInTheDocument();
  });

  it("refreshes restored selection metadata when the same provider identities return", async () => {
    seedProviderSelections();
    render(<Checkout />);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)!);
      expect(stored.selectedFlight).toMatchObject({ offerId: "flight-a", airlineNames: ["Vueling"], price: 900 });
      expect(stored.selectedHotel).toMatchObject({ offerId: "hotel-offer-a", name: "Hotel Test", priceTotal: 420 });
    });
    expect(screen.getByTestId("selected-options-summary")).toHaveTextContent("Vueling");
    expect(screen.getByTestId("selected-options-summary")).toHaveTextContent("Hotel Test");
    expect(screen.getByTestId("selected-options-summary")).not.toHaveTextContent("Old Airline");
  });

  it("retains selections on provider failure without presenting them as current or actionable", async () => {
    seedProviderSelections();
    setDefaultApiResponses(false, false);
    render(<Checkout />);

    expect(await screen.findByText("Ricerca voli temporaneamente non disponibile.")).toBeInTheDocument();
    expect(await screen.findByText("Servizio hotel temporaneamente irraggiungibile.")).toBeInTheDocument();
    expect(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)).toContain("Old Hotel");
    expect(screen.queryByTestId("selected-options-summary")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-book-hotel")).not.toBeInTheDocument();
  });

  it("keeps selections across preference-only changes but invalidates a material provider-search change", async () => {
    seedProviderSelections();
    localStorage.setItem("currentItinerary", JSON.stringify({ origin: "Roma", destination: "Barcellona", startDate: "2026-11-20", endDate: "2026-11-23", people: 12, activities: ["Museums"], aviasalesCheckoutUrl: checkoutUrl }));
    const first = render(<Checkout />);
    expect(await screen.findByTestId("flight-option-1")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("hotel-option-1")).toHaveAttribute("aria-pressed", "true");
    first.unmount();

    localStorage.setItem("currentItinerary", JSON.stringify({ origin: "Roma", destination: "Barcellona", startDate: "2026-11-20", endDate: "2026-11-23", people: 11, activities: ["Museums"], aviasalesCheckoutUrl: checkoutUrl }));
    const changedFlights = flightsResponse();
    changedFlights.passengers = 11;
    changedFlights.flights.forEach((offer) => { offer.requestedPassengers = 11; });
    const changedHotels = hotelsResponse();
    changedHotels.adults = 11;
    changedHotels.hotels.forEach((offer) => { offer.requestedAdults = 11; });
    apiRequest.mockImplementation(async (_method: string, url: string) => ({ json: async () => url.startsWith("/api/flights/search?") ? changedFlights : changedHotels }));
    render(<Checkout />);

    expect(await screen.findByTestId("flight-option-1")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("hotel-option-1")).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem(PROVIDER_SELECTION_STORAGE_KEY)).toBeNull();
  });

  it("prevents an older retry response from overwriting the newer request", async () => {
    const older = deferred<{ json: () => Promise<ReturnType<typeof flightsResponse>> }>();
    const newer = deferred<{ json: () => Promise<ReturnType<typeof flightsResponse>> }>();
    let flightCalls = 0;
    apiRequest.mockImplementation((_method: string, url: string) => {
      if (!url.startsWith("/api/flights/search?")) return Promise.resolve({ json: async () => hotelsResponse() });
      flightCalls += 1;
      if (flightCalls === 1) return Promise.reject(new Error("temporary"));
      return flightCalls === 2 ? older.promise : newer.promise;
    });
    render(<Checkout />);
    const retry = await screen.findByTestId("button-retry-flights");
    act(() => {
      retry.click();
      retry.click();
    });
    await waitFor(() => expect(flightCalls).toBe(3));

    const newestResponse = flightsResponse();
    newestResponse.flights = [newestResponse.flights[1]];
    newer.resolve({ json: async () => newestResponse });
    expect(await screen.findByText("Iberia")).toBeInTheDocument();

    const olderResponse = flightsResponse();
    olderResponse.flights = [olderResponse.flights[0]];
    older.resolve({ json: async () => olderResponse });
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText("Iberia")).toBeInTheDocument();
    expect(screen.queryByText("Vueling")).not.toBeInTheDocument();
  });

  it("aborts unmounted requests and does not apply their results after a context remount", async () => {
    const oldFlight = deferred<{ json: () => Promise<ReturnType<typeof flightsResponse>> }>();
    const oldHotel = deferred<{ json: () => Promise<ReturnType<typeof hotelsResponse>> }>();
    const signals: AbortSignal[] = [];
    apiRequest.mockImplementation((_method: string, url: string, _body: unknown, options: { signal: AbortSignal }) => {
      signals.push(options.signal);
      return url.startsWith("/api/flights/search?") ? oldFlight.promise : oldHotel.promise;
    });
    const first = render(<Checkout />);
    await waitFor(() => expect(signals).toHaveLength(2));
    first.unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);

    localStorage.setItem("currentItinerary", JSON.stringify({ origin: "Roma", destination: "Praga", startDate: "2026-11-20", endDate: "2026-11-23", people: 12, aviasalesCheckoutUrl: checkoutUrl }));
    const newFlights = flightsResponse();
    newFlights.flights = [{ ...newFlights.flights[1], offerId: "new-context-flight", airlines: ["New Context Air"] }];
    const newHotels = hotelsResponse();
    newHotels.cityCode = "PRG";
    newHotels.hotels = [{ ...newHotels.hotels[0], hotelId: "new-context-hotel", offerId: "new-context-offer", name: "New Context Hotel" }];
    apiRequest.mockImplementation(async (_method: string, url: string) => ({ json: async () => url.startsWith("/api/flights/search?") ? newFlights : newHotels }));
    render(<Checkout />);
    expect(await screen.findByText("New Context Air")).toBeInTheDocument();
    expect(await screen.findByText("New Context Hotel")).toBeInTheDocument();

    oldFlight.resolve({ json: async () => flightsResponse() });
    oldHotel.resolve({ json: async () => hotelsResponse() });
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText("New Context Air")).toBeInTheDocument();
    expect(screen.queryByText("Vueling")).not.toBeInTheDocument();
  });

  it("preserves the large group while explaining the Aviasales cap and hotel quote scope", async () => {
    render(<Checkout />);
    expect(await screen.findByText(/massimo 9 adulti/)).toBeInTheDocument();
    expect(screen.getByText("12 persone")).toBeInTheDocument();
    expect((await screen.findAllByText(/Totale per 2 adulti/)).length).toBeGreaterThan(0);
  });

  it("describes a one-to-two-person hotel quote as covering the whole group", async () => {
    localStorage.setItem("currentItinerary", JSON.stringify({ origin: "Roma", destination: "Barcellona", startDate: "2026-11-20", endDate: "2026-11-23", people: 2, aviasalesCheckoutUrl: checkoutUrl }));
    const smallFlights = flightsResponse();
    smallFlights.passengers = 2;
    smallFlights.checkoutAdults = 2;
    smallFlights.groupBookingRequired = false;
    smallFlights.flights.forEach((offer) => { offer.requestedPassengers = 2; offer.quotedPassengers = 2; });
    const smallHotels = hotelsResponse();
    smallHotels.adults = 2;
    smallHotels.hotels.forEach((offer) => { offer.requestedAdults = 2; offer.quotedAdults = 2; });
    apiRequest.mockImplementation(async (_method: string, url: string) => ({ json: async () => url.startsWith("/api/flights/search?") ? smallFlights : smallHotels }));

    render(<Checkout />);
    expect((await screen.findAllByText(/intero gruppo di 2 adulti/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/non per il gruppo/)).not.toBeInTheDocument();
  });

  it("tracks transparent provider handoffs without saving", async () => {
    render(<Checkout />);
    fireEvent.click(await screen.findByRole("link", { name: "Confronta su Aviasales" }));
    fireEvent.click(screen.getByTestId("hotel-option-1"));
    fireEvent.click(screen.getByRole("button", { name: "Continua su Booking.com" }));
    expect(trackAffiliateClick).toHaveBeenCalledTimes(2);
    expect(openExternalUrl).toHaveBeenCalledTimes(1);
    expect(savePlannedTrip).not.toHaveBeenCalled();
  });

  it("does not save until explicitly asked and keeps auth return compatibility", async () => {
    render(<Checkout />);
    const button = await screen.findByRole("button", { name: "Accedi per salvare" });
    expect(savePlannedTrip).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(navigate).toHaveBeenCalledWith("/auth?next=/checkout");
    expect(localStorage.getItem("currentItinerary")).toContain("Barcellona");
  });

  it("keeps explicit authenticated save functional and prevents repeats", async () => {
    authState.user = { id: "user-a" };
    authState.isAuthenticated = true;
    plannedTripMatchesSavedTrip.mockReturnValue(false);
    savePlannedTrip.mockResolvedValue({ created: true });
    apiRequest.mockImplementation(async (_method: string, url: string) => ({ json: async () => url.startsWith("/api/trips/user/") ? [] : url.startsWith("/api/flights/search?") ? flightsResponse() : hotelsResponse() }));
    render(<Checkout />);
    const button = await screen.findByRole("button", { name: "Salva viaggio" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("button", { name: "Viaggio salvato" })).toBeDisabled());
    expect(savePlannedTrip).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/trips/user/user-a"] });
  });
});
