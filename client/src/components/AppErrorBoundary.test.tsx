/**
 * @vitest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "./AppErrorBoundary";

const preventExpectedWindowError = (event: ErrorEvent) => {
  event.preventDefault();
};

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "errorBoundary.title": "Qualcosa è andato storto",
        "errorBoundary.description": "Impossibile mostrare la pagina",
        "errorBoundary.details": "Dettagli tecnici",
        "errorBoundary.retry": "Riprova",
        "errorBoundary.backHome": "Torna alla home",
      })[key] || key,
  }),
}));

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.addEventListener("error", preventExpectedWindowError);
  });

  afterEach(() => {
    window.removeEventListener("error", preventExpectedWindowError);
    vi.restoreAllMocks();
  });

  it("shows a recoverable fallback when a child crashes", () => {
    function CrashingChild(): React.ReactNode {
      throw new Error("render failed");
    }

    render(
      <AppErrorBoundary>
        <CrashingChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Qualcosa è andato storto" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riprova" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Torna alla home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("can retry rendering without reloading the page", () => {
    let shouldCrash = true;

    function RecoverableChild() {
      if (shouldCrash) throw new Error("temporary failure");
      return <p>Contenuto ripristinato</p>;
    }

    render(
      <AppErrorBoundary>
        <RecoverableChild />
      </AppErrorBoundary>,
    );

    shouldCrash = false;
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));

    expect(screen.getByText("Contenuto ripristinato")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
