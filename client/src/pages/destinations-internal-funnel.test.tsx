/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { Destination } from "@shared/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandProvider } from "@/contexts/BrandContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import {
  destinationMatchesIntent,
  getDestinationExperiences,
} from "@/lib/destinationExperiences";
import DestinationDetailPage from "./DestinationDetailPage";
import DestinationsPage from "./DestinationsPage";

const mocks = vi.hoisted(() => ({
  trackAffiliateClick: vi.fn(),
  openExternalUrl: vi.fn(),
  destinations: [] as Destination[],
  destinationId: "1",
  trackProductEvent: vi.fn(),
  queryState: {
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
}));

function makeDestination(id: number, name: string, country: string): Destination {
  return {
    id,
    name,
    country,
    image: `https://example.com/${name.toLowerCase()}.jpg`,
    description: `${name} description`,
    tags: ["Group trip"],
    rating: "4.8",
    reviewCount: 100,
  };
}

const destination = makeDestination(1, "Roma", "Italy");
const destinationFixtures = [
  makeDestination(3, "Amsterdam", "Netherlands"),
  destination,
  makeDestination(2, "Paris", "France"),
  makeDestination(4, "Interlaken", "Switzerland"),
];

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.destinations, ...mocks.queryState }),
}));

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return { ...actual, useParams: () => ({ id: mocks.destinationId }) };
});

vi.mock("@/components/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/components/AffiliateNotice", () => ({
  AffiliateNotice: () => <p>Affiliate notice</p>,
}));
vi.mock("@/lib/track", () => ({ trackAffiliateClick: mocks.trackAffiliateClick, trackProductEvent: mocks.trackProductEvent }));
vi.mock("@/lib/externalNavigation", () => ({ openExternalUrl: mocks.openExternalUrl }));

function renderInItalian(component: React.ReactNode) {
  localStorage.setItem("byebi_locale", "it");
  return render(
    <LanguageProvider>
      <BrandProvider>{component}</BrandProvider>
    </LanguageProvider>,
  );
}

describe("destinations internal funnel", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("selectedBrand", "byebro");
    window.history.replaceState(null, "", "/destinations");
    mocks.trackAffiliateClick.mockClear();
    mocks.openExternalUrl.mockClear();
    mocks.trackProductEvent.mockClear();
    mocks.destinations = [...destinationFixtures];
    mocks.destinationId = "1";
    mocks.queryState.isLoading = false;
    mocks.queryState.isError = false;
    mocks.queryState.isFetching = false;
    mocks.queryState.refetch.mockClear();
  });

  it("routes destination cards internally without affiliate tracking", () => {
    renderInItalian(<DestinationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Vita notturna" }));
    const card = screen.getByTestId("card-destination-amsterdam");
    expect(card).toHaveAttribute("href", "/destinations/3");
    fireEvent.click(card);

    expect(mocks.trackAffiliateClick).not.toHaveBeenCalled();

    expect(mocks.openExternalUrl).not.toHaveBeenCalled();
  });

  it("keeps AI primary and tracks GetYourGuide only from the secondary action", () => {
    renderInItalian(<DestinationDetailPage />);

    expect(screen.getByTestId("destination-plan-with-ai")).toHaveAttribute(
      "href",
      "/?planDestination=Roma",
    );
    expect(mocks.trackAffiliateClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("destination-plan-with-ai"));
    expect(mocks.trackProductEvent).toHaveBeenCalledWith("destination_ai_handoff", { dedupe: false });

    fireEvent.click(screen.getByTestId("destination-getyourguide"));

    expect(mocks.trackAffiliateClick).toHaveBeenCalledWith({
      provider: "getyourguide",
      placement: "destinations",
      destination: "Roma",
      monetized: true,
    });
    expect(mocks.openExternalUrl).toHaveBeenCalledWith("https://gyg.me/JvxfvhRT");
  });

  it("shows an internal Experiences deep link only for supported cities", () => {
    const { unmount } = renderInItalian(<DestinationDetailPage />);

    expect(screen.getByTestId("destination-experiences-link")).toHaveAttribute(
      "href",
      "/experiences?city=rome",
    );
    expect(screen.getByTestId("destination-experiences-link")).toHaveTextContent(
      "Esplora le esperienze a Roma",
    );
    fireEvent.click(screen.getByTestId("destination-experiences-link"));
    expect(mocks.trackProductEvent).toHaveBeenCalledWith("destination_experiences_opened", { dedupe: false });

    unmount();
    mocks.destinationId = "2";
    renderInItalian(<DestinationDetailPage />);

    expect(screen.queryByTestId("destination-experiences-link")).not.toBeInTheDocument();
  });

  it("preserves the existing destination-to-experience matching semantics", () => {
    expect(getDestinationExperiences(destination)).toEqual([
      "My Olympic Bro",
      "Chill and Feel the Bro",
    ]);
    expect(destinationMatchesIntent(destination, "sport")).toBe(true);
    expect(destinationMatchesIntent(destination, "nightlife")).toBe(false);
  });

  it("starts with all destinations and filters without changing API order", () => {
    renderInItalian(<DestinationsPage />);

    expect(
      screen.getAllByTestId(/^card-destination-/).map((card) => card.dataset.testid),
    ).toEqual([
      "card-destination-amsterdam",
      "card-destination-roma",
      "card-destination-paris",
      "card-destination-interlaken",
    ]);
    expect(screen.getByText("Destinazioni trovate: 4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sport" }));

    expect(
      screen.getAllByTestId(/^card-destination-/).map((card) => card.dataset.testid),
    ).toEqual(["card-destination-roma", "card-destination-paris"]);
    expect(screen.getByText("Destinazioni trovate: 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sport" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Relax" }));
    expect(
      screen.getAllByTestId(/^card-destination-/).map((card) => card.dataset.testid),
    ).toEqual(["card-destination-roma", "card-destination-paris"]);

    fireEvent.click(screen.getByRole("button", { name: "Vita notturna" }));
    expect(screen.getByTestId("card-destination-amsterdam")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^card-destination-/)).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Avventura" }));
    expect(screen.getByTestId("card-destination-interlaken")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^card-destination-/)).toHaveLength(1);
  });

  it("restores all destinations when Tutte is selected", () => {
    renderInItalian(<DestinationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Avventura" }));
    expect(screen.getAllByTestId(/^card-destination-/)).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Tutte" }));

    expect(screen.getAllByTestId(/^card-destination-/)).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Tutte" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps Bride experience names after filtering the ByeBride destination list", () => {
    localStorage.setItem("selectedBrand", "byebride");
    renderInItalian(<DestinationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Avventura" }));

    expect(screen.getByText("L'avventura selvaggia delle amiche")).toBeInTheDocument();
    expect(screen.queryByText("La Bro-avventura selvaggia")).not.toBeInTheDocument();
  });

  it("shows an empty state and resets to all destinations", () => {
    mocks.destinations = [destinationFixtures[0]];
    renderInItalian(<DestinationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sport" }));

    expect(screen.getByText("Nessuna destinazione trovata")).toBeInTheDocument();
    expect(screen.queryByTestId("card-destination-amsterdam")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mostra tutte" }));

    expect(screen.getByTestId("card-destination-amsterdam")).toBeInTheDocument();
    expect(screen.getByText("Destinazioni trovate: 1")).toBeInTheDocument();
  });

  it("shows Bride experience names on a ByeBride destination detail", () => {
    localStorage.setItem("selectedBrand", "byebride");
    renderInItalian(<DestinationDetailPage />);

    expect(screen.getByText("Le Olimpiadi delle amiche")).toBeInTheDocument();
    expect(screen.getByText("Relax tra amiche")).toBeInTheDocument();
    expect(screen.queryByText("Le Olimpiadi dei Bro")).not.toBeInTheDocument();
    expect(screen.queryByText("Relax da Bro")).not.toBeInTheDocument();
  });

  it("distinguishes loading, API error with retry, empty API data, and not found", () => {
    mocks.queryState.isLoading = true;
    let view = renderInItalian(<DestinationsPage />);
    expect(screen.getByRole("status", { name: "Caricamento..." })).toBeInTheDocument();

    view.unmount();
    mocks.queryState.isLoading = false;
    mocks.queryState.isError = true;
    view = renderInItalian(<DestinationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    expect(mocks.queryState.refetch).toHaveBeenCalledOnce();

    view.unmount();
    mocks.queryState.isError = false;
    mocks.destinations = [];
    view = renderInItalian(<DestinationsPage />);
    expect(screen.getByText("Le destinazioni non sono ancora disponibili")).toBeInTheDocument();

    view.unmount();
    mocks.destinations = [...destinationFixtures];
    mocks.destinationId = "999";
    renderInItalian(<DestinationDetailPage />);
    expect(screen.getByRole("heading", { name: "Destinazione non trovata" })).toBeInTheDocument();
  });
});
