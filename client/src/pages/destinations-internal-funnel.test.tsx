/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { Destination } from "@shared/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandProvider } from "@/contexts/BrandContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { getDestinationExperiences } from "@/lib/destinationExperiences";
import DestinationDetailPage from "./DestinationDetailPage";
import DestinationsPage from "./DestinationsPage";

const mocks = vi.hoisted(() => ({
  trackAffiliateClick: vi.fn(),
  openExternalUrl: vi.fn(),
}));

const destination: Destination = {
  id: 1,
  name: "Roma",
  country: "Italy",
  image: "https://example.com/rome.jpg",
  description: "Roma description",
  tags: ["History", "Culture"],
  rating: "4.8",
  reviewCount: 100,
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [destination], isLoading: false }),
}));

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return { ...actual, useParams: () => ({ id: "1" }) };
});

vi.mock("@/components/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/components/AffiliateNotice", () => ({
  AffiliateNotice: () => <p>Affiliate notice</p>,
}));
vi.mock("@/lib/track", () => ({ trackAffiliateClick: mocks.trackAffiliateClick }));
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
  });

  it("routes destination cards internally without affiliate tracking", () => {
    renderInItalian(<DestinationsPage />);

    const card = screen.getByTestId("card-destination-roma");
    expect(card).toHaveAttribute("href", "/destinations/1");
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

    fireEvent.click(screen.getByTestId("destination-getyourguide"));

    expect(mocks.trackAffiliateClick).toHaveBeenCalledWith({
      provider: "getyourguide",
      placement: "destinations",
      destination: "Roma",
      monetized: true,
    });
    expect(mocks.openExternalUrl).toHaveBeenCalledWith("https://gyg.me/JvxfvhRT");
  });

  it("preserves the existing destination-to-experience matching semantics", () => {
    expect(getDestinationExperiences(destination)).toEqual([
      "My Olympic Bro",
      "Chill and Feel the Bro",
    ]);
  });

  it("shows Bride experience names on a ByeBride destination detail", () => {
    localStorage.setItem("selectedBrand", "byebride");
    renderInItalian(<DestinationDetailPage />);

    expect(screen.getByText("My Olympic Bride")).toBeInTheDocument();
    expect(screen.getByText("Chill and Feel the Bride")).toBeInTheDocument();
    expect(screen.queryByText("My Olympic Bro")).not.toBeInTheDocument();
    expect(screen.queryByText("Chill and Feel the Bro")).not.toBeInTheDocument();
  });
});
