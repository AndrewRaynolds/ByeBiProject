/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlannerDialog from "./PlannerDialog";
import PlannerPreferencesEditor from "./PlannerPreferencesEditor";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { savePlannerDraft } from "@/lib/plannerStorage";
import { createPlannerDraft, PLANNER_STORAGE_KEY, type PlannerBrand } from "@shared/plannerSchemas";
import { apiRequest } from "@/lib/queryClient";
import itCopy from "@/locales/it.json";
import enCopy from "@/locales/en.json";
import esCopy from "@/locales/es.json";

vi.mock("@/lib/track", () => ({ trackProductEvent: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn() }));

function seed(brand: PlannerBrand) {
  const draft = createPlannerDraft({ brand, origin: "Rome", destination: "Lisbon",
    startDate: "2099-10-10", endDate: "2099-10-13", participants: 6,
    budgetPerPerson: 700, preferenceArchetype: "custom", interests: ["museums"] });
  savePlannerDraft(localStorage, draft);
  return draft;
}
function saved() { return JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!); }
function open(brand: PlannerBrand) {
  render(<LanguageProvider><PlannerDialog brand={brand} open onOpenChange={vi.fn()} /></LanguageProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
}

describe("explicit editorial preferences", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it.each(["byebro", "byebride"] as const)("%s previews without mutation, then saves customized notes only", (brand) => {
    const before = seed(brand); open(brand);
    expect(screen.getByLabelText("Esplora una traccia")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Usa come base modificabile" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Esplora una traccia"), { target: { value: "team" } });
    expect(screen.getByLabelText("Preferenze del gruppo")).toHaveValue("museums");
    expect(saved()).toEqual(before);
    fireEvent.click(screen.getByRole("button", { name: "Usa come base modificabile" }));
    expect(screen.getByLabelText("Tipo di esperienza")).toHaveFocus();
    expect(screen.getByLabelText("Preferenze del gruppo")).toHaveValue(itCopy["planner.styles.team.notes"]);
    expect(saved()).toEqual(before);
    expect(screen.getByRole("button", { name: "Continua alle opzioni di viaggio" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Preferenze del gruppo"), { target: { value: "team games, museums" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));
    const after = saved();
    expect(after.preferences).toEqual({ archetype: "Complicità di gruppo", interests: ["team games", "museums"] });
    for (const key of ["brand", "partyType", "origin", "destination", "startDate", "endDate", "participants", "budgetPerPerson", "createdAt", "status"]) {
      expect(after[key]).toEqual(before[key as keyof typeof before]);
    }
    expect(localStorage.getItem("currentItinerary")).toBeNull();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("cancels an applied outline and reopens with the original custom notes", () => {
    const before = seed("byebro"); open("byebro");
    fireEvent.change(screen.getByLabelText("Esplora una traccia"), { target: { value: "tribute" } });
    fireEvent.click(screen.getByRole("button", { name: "Usa come base modificabile" }));
    fireEvent.click(screen.getByRole("button", { name: "Annulla modifiche" }));
    expect(saved()).toEqual(before);
    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    expect(screen.getByLabelText("Esplora una traccia")).toHaveValue("");
    expect(screen.getByLabelText("Preferenze del gruppo")).toHaveValue("museums");
  });

  it("allows removing every optional preference after applying an outline", () => {
    seed("byebride"); open("byebride");
    fireEvent.change(screen.getByLabelText("Esplora una traccia"), { target: { value: "discovery" } });
    fireEvent.click(screen.getByRole("button", { name: "Usa come base modificabile" }));
    fireEvent.change(screen.getByLabelText("Tipo di esperienza"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Preferenze del gruppo"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));
    expect(saved()).toMatchObject({ preferences: null, status: "review-ready", budgetPerPerson: 700 });
  });

  it("keeps an applied outline unsaved when essential review fields are invalid", () => {
    const before = seed("byebro"); open("byebro");
    fireEvent.change(screen.getByLabelText("Esplora una traccia"), { target: { value: "team" } });
    fireEvent.click(screen.getByRole("button", { name: "Usa come base modificabile" }));
    fireEvent.change(screen.getByLabelText("Partecipanti"), { target: { value: "0" } });
    fireEvent.submit(screen.getByTestId("planner-review"));
    expect(saved()).toEqual(before);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not carry unsaved fields into another brand's review", async () => {
    const bro = seed("byebro");
    const bride = seed("byebride");
    const { rerender } = render(<LanguageProvider><PlannerDialog brand="byebro" open onOpenChange={vi.fn()} /></LanguageProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    fireEvent.change(screen.getByLabelText("Esplora una traccia"), { target: { value: "team" } });
    fireEvent.click(screen.getByRole("button", { name: "Usa come base modificabile" }));
    rerender(<LanguageProvider><PlannerDialog brand="byebride" open onOpenChange={vi.fn()} /></LanguageProvider>);
    await screen.findByText("Planner ByeBride");
    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    expect(screen.getByLabelText("Esplora una traccia")).toHaveValue("");
    expect(screen.getByLabelText("Preferenze del gruppo")).toHaveValue("museums");
    expect(JSON.parse(localStorage.getItem(`${PLANNER_STORAGE_KEY}:byebro`)!)).toEqual(bro);
    expect(JSON.parse(localStorage.getItem(`${PLANNER_STORAGE_KEY}:byebride`)!)).toEqual(bride);
  });

  for (const [locale, copy] of [["it", itCopy], ["en", enCopy], ["es", esCopy]] as const) {
    it.each(["byebro", "byebride"] as const)(`${locale}: %s offers the same three editable outlines without a default`, async (brand) => {
      localStorage.setItem("byebi_locale", locale);
      render(<LanguageProvider><PlannerPreferencesEditor brand={brand} preferences={null} /></LanguageProvider>);
      const select = await screen.findByLabelText(copy["planner.styles.choose"]);
      expect(select).toHaveValue("");
      expect(screen.getByText(copy[`planner.styles.${brand}.intro`])).toBeInTheDocument();
      expect(screen.getAllByRole("option").map((o) => (o as HTMLOptionElement).value).sort()).toEqual(["", "discovery", "team", "tribute"]);
      for (const id of ["team", "tribute", "discovery"] as const) {
        fireEvent.change(select, { target: { value: id } });
        expect(screen.getByText(copy[`planner.styles.${id}.description`])).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: copy["planner.styles.apply"] }));
        expect(screen.getByLabelText(copy["planner.experienceType"])).toHaveValue(copy[`planner.styles.${id}.title`]);
        expect(screen.getByLabelText(copy["planner.interests"])).toHaveValue(copy[`planner.styles.${id}.notes`]);
      }
    });
  }
});
