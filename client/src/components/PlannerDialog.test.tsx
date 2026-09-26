/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlannerDialog from "./PlannerDialog";
import ChatDialogCompact from "./ChatDialogCompact";
import ChatDialogCompactBride from "./ChatDialogCompactBride";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createPlannerDraft, PLANNER_STORAGE_KEY } from "@shared/plannerSchemas";
const RETIRED_PROVIDER_SELECTION_STORAGE_KEY = "byebi:providerSelections:v1";
import { apiRequest } from "@/lib/queryClient";
import { consumeJsonSse } from "@/lib/sse";
import localeIt from "@/locales/it.json";
import localeEn from "@/locales/en.json";
import localeEs from "@/locales/es.json";

vi.mock("@/lib/track", () => ({ trackProductEvent: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/sse", () => ({ consumeJsonSse: vi.fn() }));

function renderPlanner(node: React.ReactNode) {
  return render(<LanguageProvider>{node}</LanguageProvider>);
}

function storeReady(brand: "byebro" | "byebride" = "byebro") {
  localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(createPlannerDraft({
    brand, origin: "Rome", destination: "Ibiza", startDate: "2099-10-10", endDate: "2099-10-13",
    participants: 6, budgetPerPerson: 700, preferenceArchetype: "nightlife", interests: ["music", "food"],
  })));
}

describe("PlannerDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("byebi_locale", "it");
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
  });

  it("uses the same review engine for ByeBro and ByeBride", () => {
    storeReady("byebro");
    const bro = renderPlanner(<ChatDialogCompact open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId("planner-review")).toBeInTheDocument();
    expect(screen.getByText("Planner ByeBro")).toBeInTheDocument();
    bro.unmount();

    localStorage.clear();
    storeReady("byebride");
    renderPlanner(<ChatDialogCompactBride open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId("planner-review")).toBeInTheDocument();
    expect(screen.getByText("Planner ByeBride")).toBeInTheDocument();
  });

  it("renders a provider-free review and edits essential fields", () => {
    storeReady();
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    expect(screen.getByText(/travel brief modificabile/i)).toBeInTheDocument();
    expect(screen.queryByText(/prezzo del volo|hotel disponibile/i)).not.toBeInTheDocument();
    expect(screen.getByText("700 €")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    fireEvent.change(screen.getByLabelText("Budget per persona"), { target: { value: "850" } });
    fireEvent.change(screen.getByLabelText("Preferenze del gruppo"), { target: { value: "music, spa" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));

    expect(screen.getByText("850 €")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!).budgetPerPerson).toBe(850);
  });

  it("cancels review edits and restores the last saved values", () => {
    storeReady();
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    fireEvent.change(screen.getByLabelText("Budget per persona"), { target: { value: "999" } });
    fireEvent.click(screen.getByRole("button", { name: "Annulla modifiche" }));

    expect(screen.getByText("700 €")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!).budgetPerPerson).toBe(700);
  });

  it("starts a visibly fresh trip and clears chat, bridge, and provider selections", () => {
    storeReady();
    localStorage.setItem("currentItinerary", JSON.stringify({ destination: "Ibiza" }));
    localStorage.setItem(RETIRED_PROVIDER_SELECTION_STORAGE_KEY, "old selections");
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Nuovo viaggio" }));

    expect(screen.queryByTestId("planner-review")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Scrivi il tuo messaggio..." })).toHaveValue("");
    expect(localStorage.getItem("currentItinerary")).toBeNull();
    expect(localStorage.getItem(RETIRED_PROVIDER_SELECTION_STORAGE_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!)).toMatchObject({ status: "draft", destination: null });
  });

  it("blocks provider handoff until visible budget and date edits are saved", () => {
    storeReady();
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    fireEvent.change(screen.getByLabelText("Budget per persona"), { target: { value: "925" } });
    fireEvent.change(screen.getByLabelText("Data di inizio"), { target: { value: "2099-10-11" } });

    const continueButton = screen.getByRole("button", { name: "Continua alle opzioni di viaggio" });
    expect(continueButton).toBeDisabled();
    fireEvent.click(continueButton);
    expect(localStorage.getItem("currentItinerary")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));
    fireEvent.click(screen.getByRole("button", { name: "Continua alle opzioni di viaggio" }));
    expect(JSON.parse(localStorage.getItem("currentItinerary")!)).toMatchObject({
      budget: 925, startDate: "2099-10-11",
    });
    expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!)).toMatchObject({
      budgetPerPerson: 925, startDate: "2099-10-11",
    });
  });

  it("creates the legacy bridge only after the explicit options CTA", () => {
    storeReady();
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    expect(localStorage.getItem("currentItinerary")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continua alle opzioni di viaggio" }));
    expect(JSON.parse(localStorage.getItem("currentItinerary")!)).toMatchObject({ budget: 700, activities: ["nightlife", "music", "food"] });
  });

  it("keeps an invalid review editable and exposes a localized accessible error", () => {
    storeReady();
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    fireEvent.change(screen.getByLabelText("Tipo di esperienza"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Preferenze del gruppo"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/campi essenziali/i);
    expect(screen.getByLabelText("Tipo di esperienza")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continua alle opzioni di viaggio" })).toBeDisabled();
  });

  it("keeps the collection view mobile-safe while required fields are missing", () => {
    renderPlanner(<PlannerDialog brand="byebride" open onOpenChange={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("w-[calc(100vw-1rem)]");
    expect(screen.queryByTestId("planner-review")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Scrivi il tuo messaggio..." })).toBeInTheDocument();
  });

  it("moves from collection to review only after a validated complete tool result", async () => {
    const ready = createPlannerDraft({
      brand: "byebro", origin: "Rome", destination: "Ibiza", startDate: "2099-10-10", endDate: "2099-10-13",
      participants: 6, budgetPerPerson: 700, preferenceArchetype: "nightlife", interests: ["music"],
    });
    vi.mocked(apiRequest).mockResolvedValue({} as Response);
    vi.mocked(consumeJsonSse).mockImplementation(async (_response, handlers) => {
      handlers.onEvent({ tool_result: { name: "update_planner", result: { planner: ready, missingFields: [] } } });
    });
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Siamo in sei, 700 euro a testa" } });
    fireEvent.click(screen.getByRole("button", { name: "Invia messaggio" }));

    await waitFor(() => expect(screen.getByTestId("planner-review")).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/chat/openai-stream", expect.objectContaining({
      planner: expect.objectContaining({ status: "draft", budgetPerPerson: null }),
    }), expect.any(Object));
  });

  it("edits every review field after completing the real chat flow", async () => {
    const ready = createPlannerDraft({
      brand: "byebro", origin: "Rome", destination: "Ibiza", startDate: "2099-10-10", endDate: "2099-10-13",
      participants: 6, budgetPerPerson: 700, preferenceArchetype: "nightlife", interests: ["music"],
    });
    vi.mocked(apiRequest).mockResolvedValue({} as Response);
    vi.mocked(consumeJsonSse).mockImplementation(async (_response, handlers) => {
      handlers.onEvent({ tool_result: { name: "update_planner", result: { planner: ready, missingFields: [] } } });
    });
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Completa il viaggio" } });
    fireEvent.click(screen.getByRole("button", { name: "Invia messaggio" }));
    await waitFor(() => expect(screen.getByTestId("planner-review")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    fireEvent.change(screen.getByLabelText("Città di partenza"), { target: { value: "Milan" } });
    fireEvent.change(screen.getByLabelText("Destinazione"), { target: { value: "Prague" } });
    fireEvent.change(screen.getByLabelText("Data di inizio"), { target: { value: "2099-11-10" } });
    fireEvent.change(screen.getByLabelText("Data di fine"), { target: { value: "2099-11-14" } });
    fireEvent.change(screen.getByLabelText("Partecipanti"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Budget per persona"), { target: { value: "900" } });
    fireEvent.change(screen.getByLabelText("Tipo di esperienza"), { target: { value: "culture" } });
    fireEvent.change(screen.getByLabelText("Preferenze del gruppo"), { target: { value: "food, museums" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));

    expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!)).toMatchObject({
      origin: { canonical: "Milan" }, destination: { canonical: "Prague" },
      startDate: "2099-11-10", endDate: "2099-11-14", participants: 8, budgetPerPerson: 900,
      preferences: { archetype: "culture", interests: ["food", "museums"] },
    });
  });

  it("ignores stale events and finalization after close and reopen", async () => {
    const staleReady = createPlannerDraft({
      brand: "byebro", origin: "Rome", destination: "Prague", startDate: "2099-10-10", endDate: "2099-10-13",
      participants: 6, budgetPerPerson: 700, preferenceArchetype: "nightlife",
    });
    const currentReady = createPlannerDraft({
      brand: "byebro", origin: "Rome", destination: "Ibiza", startDate: "2099-11-10", endDate: "2099-11-13",
      participants: 8, budgetPerPerson: 900, preferenceArchetype: "wellness",
    });
    const currentDraft = createPlannerDraft({ brand: "byebro", destination: "Barcelona" });
    const handlers: Array<{ onEvent: (event: any) => void }> = [];
    const completions = [deferred(), deferred()];
    vi.mocked(apiRequest).mockResolvedValue({} as Response);
    vi.mocked(consumeJsonSse).mockImplementation(async (_response, nextHandlers) => {
      const index = handlers.push(nextHandlers) - 1;
      await completions[index].promise;
    });

    const view = renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} initialMessage="request A" />);
    await waitFor(() => expect(handlers).toHaveLength(1));
    view.rerender(<LanguageProvider><PlannerDialog brand="byebro" open={false} onOpenChange={vi.fn()} initialMessage="request A" /></LanguageProvider>);
    view.rerender(<LanguageProvider><PlannerDialog brand="byebro" open onOpenChange={vi.fn()} initialMessage="request B" /></LanguageProvider>);
    await waitFor(() => expect(handlers).toHaveLength(2));

    act(() => handlers[1].onEvent({ tool_result: { name: "update_planner", result: { planner: currentDraft } } }));
    act(() => handlers[0].onEvent({ tool_result: { name: "update_planner", result: { planner: staleReady } } }));
    expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!)).toMatchObject({ destination: { canonical: "Barcelona" } });
    expect(screen.queryByTestId("planner-review")).not.toBeInTheDocument();

    await act(async () => completions[0].resolve());
    expect(screen.getByRole("status")).toHaveTextContent("Sto organizzando i dettagli…");

    act(() => handlers[1].onEvent({ tool_result: { name: "update_planner", result: { planner: currentReady } } }));
    await act(async () => completions[1].resolve());
    await waitFor(() => expect(screen.getByTestId("planner-review")).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!)).toMatchObject({
      destination: { canonical: "Ibiza" }, budgetPerPerson: 900,
    });
  });

  it("reloads the persisted planner after a simulated back/forward remount", () => {
    storeReady();
    const first = renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica dettagli" }));
    fireEvent.change(screen.getByLabelText("Budget per persona"), { target: { value: "875" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));
    first.unmount();

    window.history.pushState(null, "", "/checkout");
    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    renderPlanner(<PlannerDialog brand="byebro" open onOpenChange={vi.fn()} />);
    expect(screen.getByText("875 €")).toBeInTheDocument();
  });

  it("keeps every new planner label aligned in Italian, English and Spanish", () => {
    const keys = ["planner.reviewTitle", "planner.reviewDisclaimer", "planner.budgetPerPerson", "planner.continueOptions", "planner.thinking", "planner.newTrip", "planner.cancelEdit", "planner.errorStartDate"] as const;
    for (const key of keys) {
      expect(localeIt[key]).toBeTruthy();
      expect(localeEn[key]).toBeTruthy();
      expect(localeEs[key]).toBeTruthy();
    }
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
