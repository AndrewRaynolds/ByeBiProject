/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharedTrip from "./SharedTrip";

const { queryState, useQuery } = vi.hoisted(() => ({
  queryState: { data: undefined as unknown, error: null as unknown, isLoading: false },
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({ useQuery }));
vi.mock("wouter", () => ({ useParams: () => ({ token: "A".repeat(43) }) }));
vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/Footer", () => ({ default: () => <div>Footer</div> }));
vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "sharedTrip.readOnly": "Sola lettura",
      "sharedTrip.eyebrow": "Viaggio condiviso",
      "sharedTrip.notFoundTitle": "Viaggio non disponibile",
      "sharedTrip.notFoundDesc": "Link non valido",
      "sharedTrip.bookingStatusUnavailable": "Stati personali non inclusi",
      "tripHub.destination": "Destinazione",
      "tripHub.departure": "Partenza",
      "tripHub.dates": "Date",
      "tripHub.participants": "Partecipanti",
      "tripHub.experience": "Esperienza",
      "tripHub.savedActivities": "Attività salvate",
      "dashboard.experienceType.bachelor": "Addio al celibato",
    }[key] ?? key),
  }),
}));

describe("SharedTrip", () => {
  beforeEach(() => {
    useQuery.mockReset();
    useQuery.mockReturnValue(queryState);
    queryState.data = undefined;
    queryState.error = null;
    queryState.isLoading = false;
  });

  it("renders only the public trip fields in read-only mode", () => {
    queryState.data = {
      destinations: ["Barcellona"],
      departureCity: "Roma",
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      participants: 8,
      experienceType: "bachelor",
      activities: ["Kart"],
    };
    render(<SharedTrip />);

    expect(screen.getAllByText("Barcellona").length).toBeGreaterThan(0);
    expect(screen.getByText("Sola lettura")).toBeInTheDocument();
    expect(screen.getByText("Stati personali non inclusi")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Splitta/i)).not.toBeInTheDocument();
  });

  it("renders the neutral invalid-link state", () => {
    queryState.error = new Error("not found");
    render(<SharedTrip />);

    expect(screen.getByText("Viaggio non disponibile")).toBeInTheDocument();
    expect(screen.getByText("Link non valido")).toBeInTheDocument();
  });

  it("always rechecks a revocable shared trip when the page mounts", () => {
    render(<SharedTrip />);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [`/api/shared-trips/${"A".repeat(43)}`],
        staleTime: 0,
        refetchOnMount: "always",
      }),
    );
  });
});
