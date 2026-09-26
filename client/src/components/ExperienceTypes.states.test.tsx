/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Experience } from "@shared/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider, type Locale } from "@/contexts/LanguageContext";
import ExperienceTypes from "./ExperienceTypes";

const seed: Experience = {
  id: 1,
  name: "The Ultimate BroNight",
  description: "Epic club-hopping, exclusive nightclubs, casinos, and unforgettable alcohol-fueled adventures.",
  image: "https://example.com/night.jpg",
};
const query = vi.hoisted(() => ({ data: [] as Experience[], isLoading: false, error: null as Error | null, isFetching: false, refetch: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => query }));

function renderTypes(locale: Locale, brand: "bro" | "bride" = "bro") {
  localStorage.setItem("byebi_locale", locale);
  return render(<LanguageProvider><ExperienceTypes brand={brand} /></LanguageProvider>);
}

describe("ExperienceTypes resilient localized states", () => {
  beforeEach(() => {
    localStorage.clear();
    query.data = [seed];
    query.isLoading = false;
    query.error = null;
    query.isFetching = false;
    query.refetch.mockClear();
  });
  afterEach(() => cleanup());

  it.each([
    ["it", "bro", "La notte definitiva tra Bro"],
    ["en", "bro", "The Ultimate BroNight"],
    ["es", "bride", "La noche definitiva entre amigas"],
  ] as const)("renders %s critical copy for %s", async (locale, brand, label) => {
    renderTypes(locale, brand);
    expect(await screen.findByRole("heading", { name: label })).toBeInTheDocument();
  });

  it("distinguishes loading, error with retry, and an empty dataset", () => {
    query.isLoading = true;
    let view = renderTypes("it");
    expect(screen.getByRole("status", { name: "Caricamento..." })).toBeInTheDocument();

    view.unmount();
    query.isLoading = false;
    query.error = new Error("offline");
    view = renderTypes("it");
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    expect(query.refetch).toHaveBeenCalledOnce();

    view.unmount();
    query.error = null;
    query.data = [];
    renderTypes("it");
    expect(screen.getByText("Nessun archetipo di esperienza disponibile.")).toBeInTheDocument();
  });
});
