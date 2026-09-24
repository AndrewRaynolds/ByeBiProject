/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout";

const { navigate, apiRequest, savePlannedTrip } = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiRequest: vi.fn(),
  savePlannedTrip: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/checkout", navigate],
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest,
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/lib/plannedTrip", () => ({ savePlannedTrip }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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
      "checkout.hotelLoadError": "Servizio hotel temporaneamente irraggiungibile.",
      "checkout.noHotels": "Hotel non disponibili",
      "checkout.retryHotelSearch": "Riprova la ricerca",
      "checkout.searchHotelsBooking": "Cerca hotel su Booking.com",
      "checkout.saveTripTitle": "Salva questa pianificazione",
      "checkout.saveTripDesc": "Nulla viene salvato automaticamente.",
      "checkout.signInToSave": "Accedi per salvare",
    }[key] ?? key),
  }),
}));

describe("Checkout fallback experience", () => {
  beforeEach(() => {
    navigate.mockClear();
    apiRequest.mockReset();
    savePlannedTrip.mockReset();
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

  it("does not save the trip until the user explicitly asks", async () => {
    render(<Checkout />);

    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    expect(savePlannedTrip).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Accedi per salvare" })).toBeInTheDocument();
  });
});
