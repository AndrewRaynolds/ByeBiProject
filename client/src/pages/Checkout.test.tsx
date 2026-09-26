/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout";

const { navigate, apiRequest, buildPlannedTripPayload, savePlannedTrip, plannedTripMatchesSavedTrip, authState, toast, invalidateQueries, trackAffiliateClick, trackProductEvent, openExternalUrl } = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiRequest: vi.fn(),
  buildPlannedTripPayload: vi.fn(),
  savePlannedTrip: vi.fn(),
  plannedTripMatchesSavedTrip: vi.fn(),
  authState: { user: null as null | { id: string }, isAuthenticated: false },
  toast: vi.fn(),
  invalidateQueries: vi.fn(),
  trackAffiliateClick: vi.fn(),
  trackProductEvent: vi.fn(),
  openExternalUrl: vi.fn(),
}));

vi.mock("wouter", () => ({ useLocation: () => ["/checkout", navigate] }));
vi.mock("@/lib/queryClient", () => ({ apiRequest, queryClient: { invalidateQueries } }));
vi.mock("@/lib/plannedTrip", () => ({ buildPlannedTripPayload, savePlannedTrip, plannedTripMatchesSavedTrip }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/track", () => ({ trackAffiliateClick, trackProductEvent }));
vi.mock("@/lib/externalNavigation", () => ({ openExternalUrl }));
vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/GetYourGuideCta", () => ({ GetYourGuideCta: () => <div>GetYourGuide destination handoff</div> }));
vi.mock("@/components/AffiliateNotice", () => ({ AffiliateNotice: () => <div>Affiliate notice</div> }));

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    locale: "it",
    t: (key: string, values?: Record<string, string | number>) => ({
      "common.loading": "Caricamento...",
      "common.people": "persone",
      "checkout.title": "Opzioni di viaggio",
      "checkout.subtitle": "Continua sui siti dei partner per verificare prezzi e disponibilità.",
      "checkout.travelBrief": "Riepilogo del viaggio",
      "checkout.budgetPerPerson": "Budget per persona",
      "checkout.preferences": "Preferenze",
      "checkout.notSpecified": "Non specificato",
      "checkout.flightOptions": "Voli",
      "checkout.hotelOptions": "Hotel",
      "checkout.flightProviderNote": "ByeBi prepara la ricerca, mentre prezzi e disponibilità si verificano su Aviasales.",
      "checkout.largeGroupFlightNote": `Gruppo di ${values?.count} persone; massimo 9 adulti per ricerca.`,
      "checkout.loadingFlights": "Preparazione ricerca Aviasales...",
      "checkout.flightUnavailable": "Non riusciamo a preparare automaticamente la ricerca Aviasales.",
      "checkout.retryFlightSearch": "Riprova",
      "checkout.compareOnAviasales": "Confronta su Aviasales",
      "checkout.aviasalesHandoffNote": "Prezzi e disponibilità vengono confermati su Aviasales.",
      "checkout.hotelProviderNote": "ByeBi non mostra prezzi hotel live.",
      "checkout.bookingHandoffNote": "Prezzi e disponibilità vengono confermati su Booking.com.",
      "checkout.searchHotelsBooking": "Cerca hotel su Booking.com",
      "checkout.activitiesTitle": "Attività",
      "checkout.activitiesHandoffNote": "Esplora le attività su GetYourGuide.",
      "checkout.saveTripTitle": "Salva questa pianificazione",
      "checkout.saveTripDesc": "Nulla viene salvato automaticamente.",
      "checkout.saveTripIncomplete": "Completa o correggi i dati del viaggio prima di salvarlo.",
      "checkout.completePlanToSave": "Completa il piano per salvare",
      "checkout.signInToSave": "Accedi per salvare",
      "checkout.saveTrip": "Salva viaggio",
      "checkout.tripSaved": "Viaggio salvato",
      "checkout.tripAlreadySaved": "Già salvato",
      "checkout.backToHome": "Torna alla Home",
      "checkout.missingData": "Dati mancanti",
      "checkout.missingDataDesc": "Completa la pianificazione.",
      "itinerary.backToChatbot": "Torna al Chatbot",
      "chat.tripSaved": "Viaggio salvato",
      "chat.tripSavedDesc": "Disponibile nella Dashboard.",
      "chat.tripAlreadySaved": "Viaggio già salvato",
      "chat.tripAlreadySavedDesc": "Già presente nella Dashboard.",
      "chat.tripSaveError": "Errore",
      "chat.tripSaveErrorDesc": "Riprova.",
    }[key] ?? key),
  }),
}));

const checkoutUrl = "https://www.aviasales.com/search/ROM2011BCN23119?marker=685469";

function handoffResponse() {
  return {
    origin: "ROM",
    destination: "BCN",
    departDate: "2026-11-20",
    returnDate: "2026-11-23",
    passengers: 12,
    checkoutAdults: 9,
    groupBookingRequired: true,
    checkoutUrl,
    handoff: { provider: "aviasales", url: checkoutUrl, exactOffer: false },
  };
}

describe("travel handoffs", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("currentItinerary", JSON.stringify({
      origin: "Roma",
      destination: "Barcellona",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      people: 12,
      budget: 700,
      activities: ["nightlife"],
      aviasalesCheckoutUrl: "",
    }));
    localStorage.setItem("byebi:providerSelections:v1", JSON.stringify({ old: "amadeus-selection" }));

    authState.user = null;
    authState.isAuthenticated = false;
    navigate.mockReset();
    apiRequest.mockReset();
    savePlannedTrip.mockReset();
    plannedTripMatchesSavedTrip.mockReset();
    toast.mockReset();
    invalidateQueries.mockReset();
    trackAffiliateClick.mockReset();
    trackProductEvent.mockReset();
    openExternalUrl.mockReset();
    buildPlannedTripPayload.mockReset();
    buildPlannedTripPayload.mockReturnValue({ budget: 700 });

    apiRequest.mockImplementation(async (_method: string, url: string) => ({
      status: 200,
      json: async () => url.startsWith("/api/flights/search?") ? handoffResponse() : [],
    }));
  });

  it("renders partner handoffs without live inventory or Amadeus selections", async () => {
    render(<Checkout />);

    expect(await screen.findByRole("link", { name: "Confronta su Aviasales" })).toHaveAttribute("href", checkoutUrl);
    expect(screen.getByRole("button", { name: "Cerca hotel su Booking.com" })).toBeInTheDocument();
    expect(screen.getByText("GetYourGuide destination handoff")).toBeInTheDocument();
    expect(screen.getByText("Budget per persona")).toBeInTheDocument();
    expect(screen.getByTestId("travel-brief-budget")).toHaveTextContent("700");
    expect(screen.getByText("Preferenze")).toBeInTheDocument();
    expect(screen.getByTestId("travel-brief-preferences")).toHaveTextContent("nightlife");
    expect(screen.queryByText(/Amadeus/i)).not.toBeInTheDocument();
    expect(localStorage.getItem("byebi:providerSelections:v1")).toBeNull();

    expect(apiRequest.mock.calls.some((call) => String(call[1]).startsWith("/api/hotels/search"))).toBe(false);
  });

  it("preserves the real group size while explaining the Aviasales cap", async () => {
    render(<Checkout />);
    expect(await screen.findByTestId("flight-large-group-note")).toHaveTextContent("12 persone");
    expect(screen.getByText("12 persone")).toBeInTheDocument();
  });

  it("tracks Aviasales and opens Booking.com with the real group size", async () => {
    render(<Checkout />);

    fireEvent.click(await screen.findByRole("link", { name: "Confronta su Aviasales" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerca hotel su Booking.com" }));

    expect(trackAffiliateClick).toHaveBeenCalledWith(expect.objectContaining({ provider: "aviasales" }));
    expect(trackAffiliateClick).toHaveBeenCalledWith(expect.objectContaining({ provider: "booking" }));
    expect(openExternalUrl).toHaveBeenCalledTimes(1);

    const bookingUrl = new URL(openExternalUrl.mock.calls[0][0]);
    expect(bookingUrl.hostname).toBe("www.booking.com");
    expect(bookingUrl.searchParams.get("group_adults")).toBe("12");
    expect(bookingUrl.searchParams.get("checkin")).toBe("2026-11-20");
    expect(bookingUrl.searchParams.get("checkout")).toBe("2026-11-23");
  });

  it("blocks save when the trip no longer satisfies the explicit save contract", async () => {
    buildPlannedTripPayload.mockReturnValue(null);

    render(<Checkout />);

    const button = await screen.findByRole("button", { name: "Completa il piano per salvare" });
    expect(button).toBeDisabled();
    expect(screen.getByText("Completa o correggi i dati del viaggio prima di salvarlo.")).toBeInTheDocument();
    expect(savePlannedTrip).not.toHaveBeenCalled();
  });

  it("keeps save explicit and preserves auth return compatibility", async () => {
    render(<Checkout />);
    const button = await screen.findByRole("button", { name: "Accedi per salvare" });
    expect(savePlannedTrip).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(navigate).toHaveBeenCalledWith("/auth?next=/checkout");
    expect(trackProductEvent).toHaveBeenCalledWith("checkout_viewed");
    expect(trackProductEvent).not.toHaveBeenCalledWith("trip_saved");
  });

  it("keeps authenticated explicit save functional", async () => {
    authState.user = { id: "user-a" };
    authState.isAuthenticated = true;
    plannedTripMatchesSavedTrip.mockReturnValue(false);
    savePlannedTrip.mockResolvedValue({ created: true });

    render(<Checkout />);
    const button = await screen.findByRole("button", { name: "Salva viaggio" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByRole("button", { name: "Viaggio salvato" })).toBeDisabled());
    expect(savePlannedTrip).toHaveBeenCalledTimes(1);
    expect(trackProductEvent).toHaveBeenCalledWith("trip_saved");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/trips/user/user-a"] });
  });
});
