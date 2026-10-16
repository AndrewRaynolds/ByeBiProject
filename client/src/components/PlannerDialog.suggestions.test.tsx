/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlannerDialog from "./PlannerDialog";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { consumeJsonSse } from "@/lib/sse";
import { savePlannerDraft } from "@/lib/plannerStorage";
import { createPlannerDraft, PLANNER_STORAGE_KEY } from "@shared/plannerSchemas";
import { buildDestinationSuggestions, handlePlannerAction } from "../../../server/services/plannerSuggestions";
import itCopy from "@/locales/it.json";
import enCopy from "@/locales/en.json";
import esCopy from "@/locales/es.json";

vi.mock("@/lib/track", () => ({ trackProductEvent: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/sse", () => ({ consumeJsonSse: vi.fn() }));

function renderDialog(brand: "byebro" | "byebride" = "byebro") {
  return render(<LanguageProvider><PlannerDialog brand={brand} open onOpenChange={vi.fn()} /></LanguageProvider>);
}
function mockActions() {
  vi.mocked(apiRequest).mockImplementation(async (_method, _path, body) => ({ request: body }) as any);
  vi.mocked(consumeJsonSse).mockImplementation(async (response: any, handlers) => {
    const request = response.request;
    const result = handlePlannerAction(request.planner, request.plannerAction, request.locale);
    if (result.planner) handlers.onEvent({ tool_result: { name: "update_planner", result: { planner: result.planner } } });
    handlers.onEvent({ content: result.content });
    handlers.onEvent({ suggestions: result.suggestions });
  });
}

describe("explicit planner destination choices", () => {
  beforeEach(() => {
    localStorage.clear(); localStorage.setItem("byebi_locale", "it");
    vi.resetAllMocks(); mockActions();
  });

  it.each(["byebro", "byebride"] as const)("offers and rotates ideas for %s without selecting or saving them", async brand => {
    const planner = createPlannerDraft({ brand, origin: "Rome", participants: 6 });
    savePlannerDraft(localStorage, planner);
    const before = localStorage.getItem(PLANNER_STORAGE_KEY);
    renderDialog(brand);
    expect(apiRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ispirami" }));
    expect(await screen.findByRole("button", { name: /Scegli Barcellona/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Scegli Budapest/ })).toBeInTheDocument();
    expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBe(before);
    fireEvent.click(screen.getByRole("button", { name: "Altre idee" }));
    expect(await screen.findByRole("button", { name: /Scegli Lisbona/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Scegli Barcellona/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBe(before);
    fireEvent.click(screen.getByRole("button", { name: /Scegli Lisbona/ }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!)).toMatchObject({ destination: { canonical: "Lisbon" }, participants: 6, budgetPerPerson: null, preferences: null }));
    expect(screen.queryByRole("button", { name: "Altre idee" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveFocus();
    expect(vi.mocked(apiRequest).mock.calls.every(call => call[1] === "/api/chat/openai-stream")).toBe(true);
  });

  it("completes the brief and focuses review only after choosing the last missing field", async () => {
    savePlannerDraft(localStorage, createPlannerDraft({ brand: "byebro", origin: "Rome", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6 }));
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Ispirami" }));
    fireEvent.click(await screen.findByRole("button", { name: /Scegli Barcellona/ }));
    expect(await screen.findByTestId("planner-review")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: itCopy["planner.reviewTitle"] })).toHaveFocus();
    expect(localStorage.getItem("currentItinerary")).toBeNull();
  });

  it("ignores packets for another draft or brand, and invalid catalog payloads", async () => {
    vi.mocked(consumeJsonSse).mockImplementation(async (response: any, handlers) => {
      const packet = buildDestinationSuggestions(response.request.planner);
      handlers.onEvent({ suggestions: { ...packet, brand: "byebride" } });
      handlers.onEvent({ suggestions: { ...packet, plannerCreatedAt: "2000-01-01T00:00:00.000Z" } });
      handlers.onEvent({ suggestions: { ...packet, plannerUpdatedAt: "2000-01-01T00:00:00.000Z" } });
      handlers.onEvent({ suggestions: { ...packet, destinationIds: ["evil"] } });
    });
    renderDialog(); fireEvent.click(screen.getByRole("button", { name: "Ispirami" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ispirami" })).toBeEnabled());
    expect(screen.queryByRole("button", { name: /Scegli Barcellona/ })).not.toBeInTheDocument();
  });

  it("discards stale packets after New trip and blocks duplicate requests while pending", async () => {
    let deliver!: () => void;
    vi.mocked(consumeJsonSse).mockImplementation((response: any, handlers) => new Promise(resolve => {
      deliver = () => { handlers.onEvent({ suggestions: buildDestinationSuggestions(response.request.planner) }); resolve(); };
    }));
    renderDialog();
    const inspire = screen.getByRole("button", { name: "Ispirami" });
    fireEvent.click(inspire); fireEvent.click(inspire);
    await waitFor(() => expect(consumeJsonSse).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Nuovo viaggio" }));
    await act(async () => deliver());
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /Scegli Barcellona/ })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)!).destination).toBeNull();
  });

  it("changes brands without accepting a pending response into the other draft", async () => {
    let deliver!: () => void;
    vi.mocked(consumeJsonSse).mockImplementation((response: any, handlers) => new Promise(resolve => {
      deliver = () => { handlers.onEvent({ suggestions: buildDestinationSuggestions(response.request.planner) }); resolve(); };
    }));
    const view = renderDialog(); fireEvent.click(screen.getByRole("button", { name: "Ispirami" }));
    await waitFor(() => expect(consumeJsonSse).toHaveBeenCalledTimes(1));
    view.rerender(<LanguageProvider><PlannerDialog brand="byebride" open onOpenChange={vi.fn()} /></LanguageProvider>);
    await act(async () => deliver());
    expect(screen.getByText("Planner ByeBride")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Scegli Barcellona/ })).not.toBeInTheDocument();
  });

  it("preserves the draft and free-text input when an action fails", async () => {
    const planner = createPlannerDraft({ brand: "byebro", origin: "Rome", participants: 6 });
    savePlannerDraft(localStorage, planner);
    const before = localStorage.getItem(PLANNER_STORAGE_KEY);
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("unavailable"));
    renderDialog();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Preferisco un'altra città" } });
    fireEvent.click(screen.getByRole("button", { name: "Ispirami" }));
    expect(await screen.findByText(itCopy["chat.genericError"])).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("Preferisco un'altra città");
    expect(screen.getByRole("button", { name: "Ispirami" })).toBeEnabled();
    expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBe(before);
  });

  it.each([["it", itCopy], ["en", enCopy], ["es", esCopy]] as const)("localizes the actions and all editorial reasons in %s", async (locale, copy) => {
    localStorage.setItem("byebi_locale", locale); renderDialog();
    fireEvent.click(await screen.findByRole("button", { name: copy["planner.inspireMe"] }));
    expect(await screen.findByRole("button", { name: new RegExp(copy["destinations.city.barcelona.name"]) })).toBeInTheDocument();
    for (const id of ["barcelona", "budapest", "lisbon", "prague", "rome", "amsterdam"] as const) expect(copy[`planner.ideaReason.${id}`]).toBeTruthy();
  });
});
