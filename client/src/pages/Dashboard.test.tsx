/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const { apiRequest, authState, invalidateQueries, navigate, queryKeys, toast } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  authState: { isAdmin: false },
  invalidateQueries: vi.fn(),
  navigate: vi.fn(),
  queryKeys: [] as string[],
  toast: vi.fn(),
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
  activities: ["Tapas tour", "Kart", "Beach club"],
  specialRequests: null,
  includeMerch: false,
  createdAt: new Date("2026-09-01T10:00:00Z"),
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    queryKeys.push(queryKey[0]);
    if (queryKey[0].startsWith("/api/trips/user/")) {
      return { data: [trip], isLoading: false, error: null };
    }
    if (queryKey[0].startsWith("/api/admin/product-analytics-summary")) {
      return {
        data: {
          days: queryKey[0].endsWith("=7") ? 7 : 30,
          funnel: [
            { eventName: "home_view", count: 12, previousStepRate: null },
            { eventName: "chat_started", count: 6, previousStepRate: 50 },
          ],
          providers: [{ key: "aviasales", total: 3, monetized: 3 }],
        },
        isLoading: false,
      };
    }
    return { data: [], isLoading: false, isFetching: false, error: null, refetch: vi.fn() };
  },
  useMutation: (options: {
    mutationFn: (value: never) => Promise<unknown>;
    onSuccess?: () => Promise<void> | void;
    onError?: () => void;
  }) => ({
    mutate: async (value: never) => {
      try {
        await options.mutationFn(value);
        await options.onSuccess?.();
      } catch {
        options.onError?.();
      }
    },
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/dashboard", navigate],
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest,
  queryClient: { invalidateQueries },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user-a", firstName: "Andrea", isAdmin: authState.isAdmin },
    isAuthenticated: true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/Footer", () => ({ default: () => <div>Footer</div> }));

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => ({
      "dashboard.welcome": `Ciao, ${values?.name}!`,
      "dashboard.subtitle": "Gestisci i tuoi viaggi e preferenze.",
      "dashboard.account": "Account",
      "dashboard.accountDesc": "I tuoi viaggi e dettagli salvati.",
      "dashboard.myTrips": "I miei viaggi",
      "dashboard.myMerchandise": "Il mio merchandise",
      "dashboard.experienceType.bachelor": "Addio al celibato",
      "dashboard.destinations": "Destinazioni",
      "dashboard.departure": "Partenza",
      "dashboard.activities": "Attività",
      "dashboard.participants": "Partecipanti",
      "dashboard.moreActivities": `+ altre ${values?.count}`,
      "dashboard.openTripHub": "Apri viaggio",
      "dashboard.deleteTrip": "Elimina",
      "dashboard.deleteConfirmTitle": "Eliminare questo viaggio?",
      "dashboard.deleteConfirmDesc": `Il viaggio “${values?.name}” verrà eliminato definitivamente dalla Dashboard.`,
      "dashboard.deleteCancel": "Annulla",
      "dashboard.deleteConfirm": "Elimina viaggio",
      "dashboard.deleteSuccess": "Viaggio eliminato",
      "dashboard.deleteSuccessDesc": "Il viaggio è stato rimosso dalla Dashboard.",
      "dashboard.productAnalytics": "Funnel prodotto",
      "dashboard.productFunnel": "Funnel prodotto",
      "dashboard.anonymousSessions": "Sessioni anonime",
      "dashboard.analyticsPeriod": "Periodo analytics",
      "dashboard.lastDays": `Ultimi ${values?.days} giorni`,
      "dashboard.funnelSteps": "Passaggi del funnel",
      "dashboard.funnelStart": "Inizio funnel",
      "dashboard.fromPreviousStep": `${values?.rate}% dal passaggio precedente`,
      "dashboard.analyticsEvent.home_view": "Home visualizzata",
      "dashboard.analyticsEvent.chat_started": "Chat iniziata",
      "dashboard.clicksByProvider": "Clic per servizio",
      "dashboard.providerClicksDescription": "Clic effettivi",
      "dashboard.clicks": "clic",
    }[key] ?? key),
  }),
}));

describe("Dashboard trips", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue(new Response(null, { status: 204 }));
    invalidateQueries.mockReset();
    invalidateQueries.mockResolvedValue(undefined);
    toast.mockReset();
    navigate.mockReset();
    authState.isAdmin = false;
    queryKeys.length = 0;
    localStorage.clear();
  });

  it("shows the anonymous product funnel and switches between 30 and 7 days", async () => {
    authState.isAdmin = true;
    render(<Dashboard />);

    const analyticsTab = screen.getByRole("tab", { name: "Funnel prodotto" });
    fireEvent.mouseDown(analyticsTab, { button: 0, ctrlKey: false });
    fireEvent.click(analyticsTab);
    expect((await screen.findByText("Home visualizzata")).parentElement).toHaveTextContent("12");
    expect(screen.getByText("Chat iniziata").parentElement).toHaveTextContent("50% dal passaggio precedente");
    expect(screen.getByText(/Aviasales/i).parentElement).toHaveTextContent("3 clic");

    fireEvent.click(screen.getByRole("button", { name: "Ultimi 7 giorni" }));
    expect(queryKeys).toContain("/api/admin/product-analytics-summary?days=7");
  });

  it("shows saved planning details without presenting the default budget", () => {
    render(<Dashboard />);

    expect(screen.getByText("Weekend a Barcellona")).toBeInTheDocument();
    expect(screen.getByText("Partecipanti:").parentElement).toHaveTextContent("Partecipanti: 8");
    expect(screen.getByText("Partenza:").parentElement).toHaveTextContent("Partenza: Roma");
    expect(screen.getByText("Destinazioni:").parentElement).toHaveTextContent("Destinazioni: Barcellona");
    expect(screen.getByText("Attività:").parentElement).toHaveTextContent("Tapas tour, Kart + altre 1");
    expect(screen.queryByText(/€\s*600/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Budget/i)).not.toBeInTheDocument();
  });

  it("opens the dedicated Trip Hub from the saved-trip card", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Apri viaggio" }));

    expect(localStorage.getItem("currentItinerary")).toBeNull();
    expect(navigate).toHaveBeenCalledWith("/trips/12");
  });

  it("asks for confirmation, deletes the trip and invalidates its query", async () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/Weekend a Barcellona.*eliminato definitivamente/)).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Elimina viaggio" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("DELETE", "/api/trips/12");
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["/api/trips/user/user-a"],
      });
    });
    expect(toast).toHaveBeenCalledWith({
      title: "Viaggio eliminato",
      description: "Il viaggio è stato rimosso dalla Dashboard.",
    });
  });
});
