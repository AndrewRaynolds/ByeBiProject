/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TripHub from "./TripHub";
import { getLegacyTripOrganizationStatusKey } from "@/lib/tripOrganizationMigration";

const { navigate, queryData, apiRequest, setQueryData } = vi.hoisted(() => ({
  navigate: vi.fn(),
  queryData: new Map<string, unknown>(),
  apiRequest: vi.fn(),
  setQueryData: vi.fn(),
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
  useMutation: (options: {
    mutationFn: (value?: unknown) => Promise<unknown>;
    onSuccess?: (data: any) => void;
  }) => ({
    mutate: (value?: unknown) => {
      void options.mutationFn(value).then((data) => options.onSuccess?.(data));
    },
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest,
  queryClient: { setQueryData },
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
      "tripHub.organizationTitle": "Organizzazione del viaggio",
      "tripHub.organizationDesc": "Segna manualmente cosa avete già gestito.",
      "tripHub.organizationStatusNote": "Checklist personale salvata nel tuo viaggio; non conferma prenotazioni.",
      "tripHub.organizationError": "Checklist non disponibile.",
      "tripHub.flightDesc": "Apri le opzioni di viaggio per cercare voli su Aviasales.",
      "tripHub.hotelDesc": "Apri le opzioni di viaggio per cercare hotel su Booking.com.",
      "tripHub.activitiesDesc": "Apri le opzioni di viaggio per esplorare GetYourGuide.",
      "tripHub.toBook": "Da fare",
      "tripHub.done": "Fatto",
      "tripHub.toggleStatus": `Cambia stato di ${values?.section}`,
      "tripHub.expensesTitle": "Spese del gruppo",
      "tripHub.expensesDesc": "Gestisci spese",
      "tripHub.openExpenses": "Apri SplittaBro",
      "tripHub.startExpenses": "Avvia SplittaBro",
      "tripHub.continueCheckout": "Apri opzioni di viaggio",
      "tripHub.shareTitle": "Condividi viaggio",
      "tripHub.shareDesc": "Crea link",
      "tripHub.shareActive": "Link attivo",
      "tripHub.generateLink": "Genera link",
      "tripHub.rotateLink": "Genera nuovo link",
      "tripHub.revokeLink": "Revoca link",
      "tripHub.copyLink": "Copia link",
      "tripHub.copied": "Copiato",
      "tripHub.shareLinkLabel": "Link condivisibile",
      "tripHub.shareError": "Errore link",
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
    queryData.set("/api/trips/12/invite", { active: false });
    queryData.set("/api/trips/12/organization-status", {
      status: { flight: "pending", hotel: "pending", activities: "pending" },
      persisted: true,
    });
    apiRequest.mockReset();
    setQueryData.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn() },
    });
  });

  it("rebuilds the saved-trip checkout context before opening checkout", () => {
    render(<TripHub />);

    fireEvent.click(screen.getByRole("button", { name: "Apri opzioni di viaggio" }));

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

  it("persists manual organization progress through the owner-scoped API", async () => {
    apiRequest.mockImplementation(async (method: string, url: string, body?: unknown) => {
      if (method === "PUT" && url === "/api/trips/12/organization-status") {
        return { json: async () => ({ status: body, persisted: true }) };
      }
      throw new Error("Unexpected API call");
    });

    render(<TripHub />);

    expect(screen.getByRole("heading", { name: "Organizzazione del viaggio" })).toBeInTheDocument();
    expect(screen.getByText(/Checklist personale.*non conferma prenotazioni/i)).toBeInTheDocument();
    expect(screen.getAllByText("Da fare")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Cambia stato di Volo" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/trips/12/organization-status",
      { flight: "done", hotel: "pending", activities: "pending" },
    ));
    expect(setQueryData).toHaveBeenCalledWith(
      ["/api/trips/12/organization-status"],
      {
        status: { flight: "done", hotel: "pending", activities: "pending" },
        persisted: true,
      },
    );
  });

  it("migrates the retired local checklist once when no server state exists", async () => {
    queryData.set("/api/trips/12/organization-status", {
      status: { flight: "pending", hotel: "pending", activities: "pending" },
      persisted: false,
    });
    localStorage.setItem(
      getLegacyTripOrganizationStatusKey(12),
      JSON.stringify({ flight: "done", hotel: "pending", activities: "done" }),
    );
    apiRequest.mockImplementation(async (method: string, url: string, body?: unknown) => {
      if (method === "PUT" && url === "/api/trips/12/organization-status") {
        return { json: async () => ({ status: body, persisted: true }) };
      }
      throw new Error("Unexpected API call");
    });

    render(<TripHub />);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/trips/12/organization-status",
      { flight: "done", hotel: "pending", activities: "done" },
    ));
    await waitFor(() =>
      expect(localStorage.getItem(getLegacyTripOrganizationStatusKey(12))).toBeNull(),
    );
  });

  it("uses one clear travel-options handoff instead of per-section booking CTAs", () => {
    render(<TripHub />);

    expect(screen.getByRole("button", { name: "Apri opzioni di viaggio" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Vai ai voli|Vai agli hotel|Vai alle attività/ })).not.toBeInTheDocument();
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

  it("shows owner sharing actions and generates a fresh read-only link", async () => {
    apiRequest.mockResolvedValue({ json: async () => ({ token: "A".repeat(43) }) });
    render(<TripHub />);

    fireEvent.click(screen.getByRole("button", { name: "Genera link" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/api/trips/12/invite"));
    expect(await screen.findByLabelText("Link condivisibile")).toHaveTextContent(
      `/trips/shared/${"A".repeat(43)}`,
    );
  });

  it("shows revoke and rotation actions only when an invite is active", async () => {
    queryData.set("/api/trips/12/invite", { active: true });
    apiRequest.mockResolvedValue({});
    render(<TripHub />);

    expect(screen.getByRole("button", { name: "Genera nuovo link" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revoca link" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("DELETE", "/api/trips/12/invite"));
  });

  it("shows feedback when copying a generated invite fails", async () => {
    apiRequest.mockResolvedValue({ json: async () => ({ token: "A".repeat(43) }) });
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("clipboard denied"));
    render(<TripHub />);

    fireEvent.click(screen.getByRole("button", { name: "Genera link" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copia link" }));

    expect(await screen.findByText("Errore link")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copia link" })).toBeInTheDocument();
  });
});
