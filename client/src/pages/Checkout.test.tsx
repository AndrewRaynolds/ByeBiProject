/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout";

const { navigate, apiRequest, savePlannedTrip, plannedTripMatchesSavedTrip, authState, toast, invalidateQueries } = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiRequest: vi.fn(),
  savePlannedTrip: vi.fn(),
  plannedTripMatchesSavedTrip: vi.fn(),
  authState: { user: null as null | { id: string }, isAuthenticated: false },
  toast: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/checkout", navigate],
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest,
  queryClient: { invalidateQueries },
}));

vi.mock("@/lib/plannedTrip", () => ({ savePlannedTrip, plannedTripMatchesSavedTrip }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));
vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/GetYourGuideCta", () => ({
  GetYourGuideCta: () => <div>GetYourGuide Barcellona</div>,
}));
vi.mock("@/components/AffiliateNotice", () => ({
  AffiliateNotice: () => <div>Affiliate notice</div>,
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => ({
      "common.people": "persone",
      "common.passengers": "passeggeri",
      "checkout.largeGroupFlightNote": `Gruppo di ${values?.count} persone; massimo 9 adulti per ricerca.`,
      "checkout.loadingFlights": "Ricerca voli disponibili...",
      "checkout.flightUnavailable": "Ricerca voli temporaneamente non disponibile.",
      "checkout.goToAviasales": "Vai su Aviasales",
      "checkout.hotelLoadError": "Servizio hotel temporaneamente irraggiungibile.",
      "checkout.noHotels": "Hotel non disponibili",
      "checkout.retryHotelSearch": "Riprova la ricerca",
      "checkout.searchHotelsBooking": "Cerca hotel su Booking.com",
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

describe("Checkout fallback experience", () => {
  beforeEach(() => {
    navigate.mockClear();
    apiRequest.mockReset();
    savePlannedTrip.mockReset();
    plannedTripMatchesSavedTrip.mockReset();
    toast.mockReset();
    invalidateQueries.mockReset();
    authState.user = null;
    authState.isAuthenticated = false;
    localStorage.clear();
    localStorage.setItem("currentItinerary", JSON.stringify({
      origin: "Roma",
      destination: "Barcellona",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      people: 12,
      aviasalesCheckoutUrl: "https://www.aviasales.com/search/ROM2011BCN23119?marker=685469",
      flightLabel: "Roma → Barcellona",
    }));
    apiRequest.mockResolvedValue({
      json: async () => ({
        cityCode: "BCN",
        checkInDate: "2026-11-20",
        checkOutDate: "2026-11-23",
        adults: 12,
        currency: "EUR",
        hotelDataStatus: "unavailable",
        hotels: [],
      }),
    });
  });

  it("keeps the complete large-group checkout usable when hotel data is unavailable", async () => {
    render(<Checkout />);

    expect(await screen.findByText("Roma → Barcellona")).toBeInTheDocument();
    expect(screen.getByText("12 persone")).toBeInTheDocument();
    expect(screen.getByText(/massimo 9 adulti/)).toBeInTheDocument();
    expect(await screen.findByText("Servizio hotel temporaneamente irraggiungibile.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerca hotel su Booking.com" })).toBeInTheDocument();
    expect(screen.getByText("GetYourGuide Barcellona")).toBeInTheDocument();
  });

  it("recovers a fresh flight checkout link for a reopened saved trip", async () => {
    localStorage.setItem("currentItinerary", JSON.stringify({
      origin: "Roma",
      destination: "Barcellona",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      people: 8,
      partyType: "bachelorette",
      budget: 475,
      activities: ["Tapas tour"],
      aviasalesCheckoutUrl: "",
      flightLabel: "Roma → Barcellona",
    }));
    apiRequest.mockImplementation(async (_method: string, url: string) => ({
      json: async () => url.startsWith("/api/flights/search?") ? {
        checkoutUrl: "https://www.aviasales.com/search/ROM2011BCN23118?marker=685469",
        flightDataStatus: "unavailable",
      } : {
        cityCode: "BCN",
        checkInDate: "2026-11-20",
        checkOutDate: "2026-11-23",
        adults: 8,
        currency: "EUR",
        hotelDataStatus: "unavailable",
        hotels: [],
      },
    }));

    render(<Checkout />);

    const flightLink = await screen.findByRole("link", { name: "Vai su Aviasales" });
    expect(flightLink).toHaveAttribute(
      "href",
      "https://www.aviasales.com/search/ROM2011BCN23118?marker=685469",
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      expect.stringContaining("/api/flights/search?origin=Roma&destination=Barcellona"),
      undefined,
      expect.objectContaining({ timeoutMs: 30_000 }),
    );
  });

  it("keeps checkout usable when flight link recovery fails", async () => {
    localStorage.setItem("currentItinerary", JSON.stringify({
      origin: "Roma",
      destination: "Barcellona",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      people: 8,
      aviasalesCheckoutUrl: "",
      flightLabel: "Roma → Barcellona",
    }));
    apiRequest.mockImplementation(async (_method: string, url: string) => {
      if (url.startsWith("/api/flights/search?")) throw new Error("temporarily unavailable");
      return {
        json: async () => ({
          cityCode: "BCN",
          checkInDate: "2026-11-20",
          checkOutDate: "2026-11-23",
          adults: 8,
          currency: "EUR",
          hotelDataStatus: "unavailable",
          hotels: [],
        }),
      };
    });

    render(<Checkout />);

    expect(await screen.findByText("Ricerca voli temporaneamente non disponibile.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerca hotel su Booking.com" })).toBeInTheDocument();
    expect(screen.getByText("GetYourGuide Barcellona")).toBeInTheDocument();
  });

  it("does not save the trip until the user explicitly asks", async () => {
    render(<Checkout />);

    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    expect(savePlannedTrip).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Accedi per salvare" })).toBeInTheDocument();
  });

  it("keeps checkout context while sending an unauthenticated user to login", async () => {
    render(<Checkout />);

    fireEvent.click(await screen.findByRole("button", { name: "Accedi per salvare" }));

    expect(navigate).toHaveBeenCalledWith("/auth?next=/checkout");
    expect(localStorage.getItem("currentItinerary")).toContain("Barcellona");
    expect(savePlannedTrip).not.toHaveBeenCalled();
  });

  it("saves once and disables repeated clicks", async () => {
    authState.user = { id: "user-a" };
    authState.isAuthenticated = true;
    plannedTripMatchesSavedTrip.mockReturnValue(false);
    savePlannedTrip.mockResolvedValue({ created: true });
    apiRequest.mockImplementation(async (_method: string, url: string) => ({
      json: async () => url.startsWith("/api/trips/user/") ? [] : ({
        cityCode: "BCN",
        checkInDate: "2026-11-20",
        checkOutDate: "2026-11-23",
        adults: 12,
        currency: "EUR",
        hotelDataStatus: "unavailable",
        hotels: [],
      }),
    }));
    render(<Checkout />);

    const button = await screen.findByRole("button", { name: "Salva viaggio" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByRole("button", { name: "Viaggio salvato" })).toBeDisabled());
    expect(savePlannedTrip).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/trips/user/user-a"] });
  });

  it("shows an already-saved state after returning to checkout", async () => {
    authState.user = { id: "user-a" };
    authState.isAuthenticated = true;
    plannedTripMatchesSavedTrip.mockReturnValue(true);
    apiRequest.mockImplementation(async (_method: string, url: string) => ({
      json: async () => url.startsWith("/api/trips/user/") ? [{ id: 1 }] : ({
        cityCode: "BCN",
        checkInDate: "2026-11-20",
        checkOutDate: "2026-11-23",
        adults: 12,
        currency: "EUR",
        hotelDataStatus: "unavailable",
        hotels: [],
      }),
    }));
    render(<Checkout />);

    expect(await screen.findByRole("button", { name: "Già salvato" })).toBeDisabled();
    expect(savePlannedTrip).not.toHaveBeenCalled();
  });
});
