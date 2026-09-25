/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Header from "./Header";
import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import { LanguageProvider } from "@/contexts/LanguageContext";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import itTranslations from "@/locales/it.json";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: null,
    logoutMutation: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/use-optimized-scroll", () => ({
  useOptimizedScroll: () => ({ isScrolled: false }),
}));

vi.mock("@/lib/performance", () => ({
  throttle: (callback: (...args: unknown[]) => unknown) => callback,
}));

vi.mock("./ChatDialogCompact", () => ({
  default: ({ open, initialMessage }: { open: boolean; initialMessage?: string }) =>
    open ? <div data-testid="chat-dialog-message">{initialMessage}</div> : null,
}));

function renderInItalian(component: React.ReactNode) {
  localStorage.setItem("byebi_locale", "it");
  return render(<LanguageProvider>{component}</LanguageProvider>);
}

describe("homepage clarity", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("selectedBrand", "byebro");
    window.history.replaceState(null, "", "/");
  });

  it("keeps both brand slogans and describes the complete product in every locale", () => {
    const translations = [
      {
        values: itTranslations,
        cta: "Inizia con l'AI",
        steps: [
          "Raccontaci il viaggio",
          "Confronta voli, hotel e attività",
          "Salva e organizza il gruppo",
        ],
      },
      {
        values: en,
        cta: "Start with AI",
        steps: [
          "Tell us about the trip",
          "Compare flights, hotels and activities",
          "Save and organize the group",
        ],
      },
      {
        values: es,
        cta: "Empieza con IA",
        steps: [
          "Cuéntanos el viaje",
          "Compara vuelos, hoteles y actividades",
          "Guarda y organiza el grupo",
        ],
      },
    ];

    for (const { values: locale, cta, steps } of translations) {
      expect(locale["hero.bro.title"]).toBe("One more Night, no more rights!");
      expect(locale["hero.bride.title"]).toBe("Last Fling Before The Ring! 💍");
      expect(locale["hero.bride.subtitle"]).toBe(locale["hero.bro.subtitle"]);
      expect(locale["hero.bro.startChat"]).toBe(cta);
      expect(locale["hero.bride.startChat"]).toBe(cta);
      expect([
        locale["howItWorks.step1.title"],
        locale["howItWorks.step2.title"],
        locale["howItWorks.step3.title"],
      ]).toEqual(steps);

      for (const subtitle of [locale["hero.bro.subtitle"], locale["hero.bride.subtitle"]]) {
        expect(subtitle).toMatch(/AI|IA/);
        expect(subtitle).toMatch(/voli|flights|vuelos/i);
        expect(subtitle).toMatch(/hotel/i);
        expect(subtitle).toMatch(/attività|activities|actividades/i);
        expect(subtitle).toMatch(/spese|expenses|gastos/i);
        expect(subtitle).not.toMatch(/miglior prezzo|best price|mejor precio/i);
      }
    }
  });

  it("uses the explicit AI CTA without changing the existing chat action", () => {
    renderInItalian(<HeroSection />);

    fireEvent.change(screen.getByTestId("input-hero-chat"), {
      target: { value: "Roma a ottobre" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Inizia con l'AI" }));

    expect(screen.getByTestId("chat-dialog-message")).toHaveTextContent("Roma a ottobre");
  });

  it("exposes the real three-step flow at the anchored section", () => {
    renderInItalian(<HowItWorks brand="bro" />);

    expect(document.getElementById("how-it-works")).toBeInTheDocument();
    expect(screen.getByText("Raccontaci il viaggio")).toBeInTheDocument();
    expect(screen.getByText("Confronta voli, hotel e attività")).toBeInTheDocument();
    expect(screen.getByText("Salva e organizza il gruppo")).toBeInTheDocument();
    expect(screen.getByText(/senza registrarti/i)).toBeInTheDocument();
    expect(screen.getByText(/Trip Hub.*partner/i)).toBeInTheDocument();
  });

  it("links both desktop and mobile navigation to the home section", () => {
    window.history.replaceState(null, "", "/destinations");
    renderInItalian(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Apri menu di navigazione" }));

    const links = screen.getAllByRole("link", { name: "Come Funziona" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/#how-it-works");
    }
  });
});
