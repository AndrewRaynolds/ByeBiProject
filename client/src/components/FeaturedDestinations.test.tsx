/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
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

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [destination], isLoading: false, error: null }),
}));

describe("FeaturedDestinations", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("byebi_locale", "it");
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
