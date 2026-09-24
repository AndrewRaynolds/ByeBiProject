/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TripHub from "./TripHub";
import { getTripBookingStatusKey } from "@/lib/tripBookingStatus";

const { navigate, queryData } = vi.hoisted(() => ({
  navigate: vi.fn(),
  queryData: new Map<string, unknown>(),
}));

const trip = {
  id: 12,
  userId: "user-a",
  name: "Weekend a Barcellona",
  participants: 8,
  startDate: "2026-11-20",
  endDate: "2026-11-23",
  departureCity: "Roma",
  destinations: ["Barcellona"],
  experienceType: "bachelor",
  budget: 600,
  activities: ["Tapas tour", "Kart"],
  specialRequests: null,
  includeMerch: false,
  createdAt: new Date("2026-09-01T10:00:00Z"),
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey, enabled = true }: { queryKey: string[]; enabled?: boolean }) => ({
    data: enabled ? queryData.get(queryKey[0]) : undefined,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: "12" }),
  useLocation: () => ["/trips/12", navigate],
}));

vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/Footer", () => ({ default: () => <div>Footer</div> }));
vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => ({
      "tripHub.backToDashboard": "Torna alla Dashboard",
      "tripHub.eyebrow": "Il tuo Trip Hub",
      "tripHub.destination": "Destinazione",
      "tripHub.departure": "Partenza",
      "tripHub.dates": "Date",
      "tripHub.participants": "Partecipanti",
      "tripHub.experience": "Esperienza",
      "tripHub.savedActivities": "Attività salvate",
      "tripHub.flight": "Volo",
      "tripHub.hotel": "Hotel",
      "tripHub.activities": "Attività",
      "tripHub.flightDesc": "Voli",
      "tripHub.hotelDesc": "Hotel",
      "tripHub.activitiesDesc": "Attività",
      "tripHub.flightCta": "Vai ai voli",
      "tripHub.hotelCta": "Vai agli hotel",
      "tripHub.activitiesCta": "Vai alle attività",
      "tripHub.toBook": "Da prenotare",
      "tripHub.done": "Fatto",
      "tripHub.toggleStatus": `Cambia stato di ${values?.section}`,
      "tripHub.expensesTitle": "Spese del gruppo",
      "tripHub.expensesDesc": "Gestisci spese",
      "tripHub.openExpenses": "Apri SplittaBro",
      "tripHub.startExpenses": "Avvia SplittaBro",
      "tripHub.continueCheckout": "Apri / continua checkout",
      "dashboard.experienceType.bachelor": "Addio al celibato",
    }[key] ?? key),
  }),
}));

describe("TripHub", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("selectedBrand", "byebro");
    navigate.mockReset();
    queryData.clear();
    queryData.set("/api/trips/12", trip);
    queryData.set("/api/trips/12/expense-groups", []);
  });

  it("rebuilds the saved-trip checkout context before opening checkout", () => {
    render(<TripHub />);

    fireEvent.click(screen.getByRole("button", { name: "Apri / continua checkout" }));

    expect(JSON.parse(localStorage.getItem("currentItinerary") ?? "null")).toMatchObject({
      origin: "Roma",
      destination: "Barcellona",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      people: 8,
      activities: ["Tapas tour", "Kart"],
      aviasalesCheckoutUrl: "",
    });
    expect(navigate).toHaveBeenCalledWith("/checkout");
  });

  it("persists booking status per trip on this device", () => {
    render(<TripHub />);

    fireEvent.click(screen.getByRole("button", { name: "Cambia stato di Volo" }));

    expect(screen.getByText("Fatto")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(getTripBookingStatusKey(12)) ?? "null")).toEqual({
      flight: "done",
      hotel: "pending",
      activities: "pending",
    });
  });

  it("opens an existing linked expense group", () => {
    queryData.set("/api/trips/12/expense-groups", [{ id: 44, tripId: 12 }]);
    render(<TripHub />);

    fireEvent.click(screen.getByRole("button", { name: "Apri SplittaBro" }));

    expect(navigate).toHaveBeenCalledWith("/splitta-bro?groupId=44");
  });

  it("starts the existing SplittaBro creation flow linked to the trip", () => {
    render(<TripHub />);

    fireEvent.click(screen.getByRole("button", { name: "Avvia SplittaBro" }));

    expect(navigate).toHaveBeenCalledWith(
      "/splitta-bro?tripId=12&tripName=Weekend+a+Barcellona",
    );
  });
});
