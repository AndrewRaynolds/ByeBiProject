/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { Destination } from "@shared/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import FeaturedDestinations from "./FeaturedDestinations";

const destination: Destination = {
  id: 7,
  name: "Roma",
  country: "Italy",
  image: "https://example.com/roma.jpg",
  description: "Roma description",
  tags: ["Culture"],
  rating: "4.8",
  reviewCount: 100,
};

const query = vi.hoisted(() => ({ data: [] as Destination[], isLoading: false, error: null as Error | null, isFetching: false, refetch: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => query }));

describe("FeaturedDestinations", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("byebi_locale", "it");
    query.data = [destination];
    query.isLoading = false;
    query.error = null;
    query.isFetching = false;
    query.refetch.mockClear();
  });

  it("separates homepage API errors from an empty response and supports retry", () => {
    query.error = new Error("offline");
    const view = render(<LanguageProvider><FeaturedDestinations /></LanguageProvider>);
    expect(screen.getByRole("alert")).toHaveTextContent("Errore nel caricamento");
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    expect(query.refetch).toHaveBeenCalledOnce();

    view.unmount();
    query.error = null;
    query.data = [];
    render(<LanguageProvider><FeaturedDestinations /></LanguageProvider>);
    expect(screen.getByText("Le destinazioni non sono ancora disponibili")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("links each featured card to its detail and keeps View all on the index", () => {
    render(
      <LanguageProvider>
        <FeaturedDestinations />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("featured-destination-7")).toHaveAttribute(
      "href",
      "/destinations/7",
    );
    expect(screen.getAllByRole("link", { name: "Vedi tutte le destinazioni" })).toHaveLength(2);
    screen.getAllByRole("link", { name: "Vedi tutte le destinazioni" }).forEach((link) => {
      expect(link).toHaveAttribute("href", "/destinations");
    });
  });
});
