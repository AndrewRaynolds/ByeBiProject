/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrandProvider } from "@/contexts/BrandContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ExperiencesPage from "./ExperiencesPage";

const mocks = vi.hoisted(() => ({
  openExternalUrl: vi.fn(),
  trackAffiliateClick: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/components/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/components/Newsletter", () => ({ default: () => <div /> }));
vi.mock("@/components/AffiliateNotice", () => ({
  AffiliateNotice: () => <p data-testid="affiliate-notice">Affiliate notice</p>,
}));
vi.mock("@/components/ExperienceTypes", () => ({
  default: ({ brand }: { brand: string }) => (
    <section data-testid="experience-types" data-brand={brand} />
  ),
}));
vi.mock("@/lib/externalNavigation", () => ({
  openExternalUrl: mocks.openExternalUrl,
}));
vi.mock("@/lib/track", () => ({
  trackAffiliateClick: mocks.trackAffiliateClick,
  trackEvent: mocks.trackEvent,
}));

function renderPage(brand: "byebro" | "byebride" = "byebro") {
  localStorage.setItem("selectedBrand", brand);
  localStorage.setItem("byebi_locale", "it");

  return render(
    <LanguageProvider>
      <BrandProvider>
        <ExperiencesPage />
      </BrandProvider>
    </LanguageProvider>,
  );
}

function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), {
    button: 0,
    ctrlKey: false,
  });
}

describe("experiences hub", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.openExternalUrl.mockClear();
    mocks.trackAffiliateClick.mockClear();
    mocks.trackEvent.mockClear();
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("preserves the selected city while switching to the correct category", () => {
    renderPage();

    expect(screen.getByText("Roscioli")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ibiza" }));
    selectTab("Bar");

    expect(screen.getByRole("button", { name: "Ibiza" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Bar a Ibiza" })).toBeInTheDocument();
    expect(screen.getByText("Lío Ibiza")).toBeInTheDocument();
    expect(screen.queryByText("Roscioli")).not.toBeInTheDocument();
  });

  it("keeps Maps URLs unchanged and reserves affiliate tracking for GYG items", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("button-open-experience-restaurants-0"));

    expect(mocks.openExternalUrl).toHaveBeenLastCalledWith(
      "https://www.google.com/maps/search/?api=1&query=Roscioli%20Roma",
    );
    expect(mocks.trackAffiliateClick).not.toHaveBeenCalled();

    selectTab("Attività");
    fireEvent.click(screen.getByTestId("button-open-experience-activities-0"));

    expect(mocks.trackAffiliateClick).toHaveBeenCalledWith({
      provider: "getyourguide",
      placement: "experiences",
      destination: "Roma",
      monetized: true,
    });
    expect(mocks.openExternalUrl).toHaveBeenLastCalledWith("https://gyg.me/JvxfvhRT");
  });

  it("uses the same city and category architecture for ByeBro and ByeBride", () => {
    const { unmount } = renderPage("byebro");
    const broCities = screen.getAllByRole("button", { pressed: false }).map((item) => item.textContent);
    const broCategories = screen.getAllByRole("tab").map((item) => item.textContent);
    expect(screen.getByTestId("experience-types")).toHaveAttribute("data-brand", "bro");

    unmount();
    renderPage("byebride");

    expect(screen.getByTestId("experience-types")).toHaveAttribute("data-brand", "bride");
    expect(screen.getAllByRole("button", { pressed: false }).map((item) => item.textContent)).toEqual(
      broCities,
    );
    expect(screen.getAllByRole("tab").map((item) => item.textContent)).toEqual(broCategories);
  });

  it("links the hub back into the internal destinations funnel", () => {
    renderPage();

    expect(screen.getByTestId("experiences-destinations-link")).toHaveAttribute(
      "href",
      "/destinations",
    );
  });
});
