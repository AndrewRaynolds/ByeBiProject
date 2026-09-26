/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import Header from "./Header";
import { BrandProvider } from "@/contexts/BrandContext";
import { LanguageProvider, type Locale } from "@/contexts/LanguageContext";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import itLocale from "@/locales/it.json";

const authState = vi.hoisted(() => ({ user: null as null | { username: string } }));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: authState.user,
    logoutMutation: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/use-optimized-scroll", () => ({
  useOptimizedScroll: () => ({ isScrolled: false }),
}));

vi.mock("@/lib/sellerConfig", () => ({
  sellerConfig: { contactEmail: "feedback@example.com" },
}));

function renderHeader(locale: Locale = "it", brand: "byebro" | "byebride" = "byebro") {
  localStorage.setItem("selectedBrand", brand);
  localStorage.setItem("byebi_locale", locale);
  const location = memoryLocation({ path: "/destinations" });
  return render(
    <Router hook={location.hook}>
      <LanguageProvider>
        <BrandProvider><Header /></BrandProvider>
      </LanguageProvider>
    </Router>,
  );
}

describe("Header navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    authState.user = null;
  });

  it("uses the brand token in shared markup without brand-specific color utilities", () => {
    renderHeader("it", "byebride");
    const logo = screen.getByRole("link", { name: "ByeBride" });

    expect(logo.querySelector("span")).toHaveClass("text-primary");
    expect(document.documentElement.dataset.brand).toBe("byebride");
  });

  it("shows the product hierarchy on desktop and mobile", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "Organizza viaggio" })).toHaveAttribute("href", "/");

    fireEvent.click(screen.getByRole("button", { name: "Apri menu di navigazione" }));

    expect(screen.getAllByRole("link", { name: "Organizza viaggio" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Destinazioni" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Esperienze" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Secret Blog" })).toBeInTheDocument();
  });

  it("closes the mobile menu when its trigger is clicked again", () => {
    renderHeader();
    const openButton = screen.getByRole("button", { name: "Apri menu di navigazione" });

    fireEvent.mouseDown(openButton);
    fireEvent.click(openButton);
    const closeButton = screen.getByRole("button", { name: "Chiudi menu di navigazione" });
    expect(screen.getByRole("navigation", { name: "Navigazione mobile" })).toBeInTheDocument();

    fireEvent.mouseDown(closeButton);
    fireEvent.click(closeButton);

    expect(screen.queryByRole("navigation", { name: "Navigazione mobile" })).not.toBeInTheDocument();
  });

  it("closes the mobile menu on an outside click", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Apri menu di navigazione" }));
    expect(screen.getByRole("navigation", { name: "Navigazione mobile" })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("navigation", { name: "Navigazione mobile" })).not.toBeInTheDocument();
  });

  it("offers contextual beta feedback without leaking URL query data", () => {
    window.history.replaceState({}, "", "/checkout?token=should-not-leak");
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: "Apri menu di navigazione" }));

    const feedback = screen.getByRole("link", { name: "Invia feedback" });
    expect(feedback).toHaveAttribute("href", expect.stringContaining("mailto:feedback@example.com"));
    expect(decodeURIComponent(feedback.getAttribute("href") || "")).toContain("Page: /checkout");
    expect(feedback.getAttribute("href")).not.toContain("should-not-leak");
  });

  it("exposes My trips for authenticated users", async () => {
    authState.user = { username: "andrea" };
    renderHeader("en");

    expect(await screen.findByRole("link", { name: "My trips" })).toHaveAttribute("href", "/dashboard");
  });

  it("keeps the new navigation labels aligned across IT, EN, and ES", () => {
    expect([itLocale["header.planTrip"], en["header.planTrip"], es["header.planTrip"]]).toEqual([
      "Organizza viaggio", "Plan a trip", "Organiza tu viaje",
    ]);
    expect([itLocale["header.myTrips"], en["header.myTrips"], es["header.myTrips"]]).toEqual([
      "I miei viaggi", "My trips", "Mis viajes",
    ]);
  });
});
