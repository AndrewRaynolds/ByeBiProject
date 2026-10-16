/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HeroSection from "./HeroSection";
import HeroSectionBride from "./HeroSectionBride";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { consumeJsonSse } from "@/lib/sse";
import { trackProductEvent } from "@/lib/track";
import { savePlannerDraft } from "@/lib/plannerStorage";
import { createPlannerDraft, PLANNER_STORAGE_KEY } from "@shared/plannerSchemas";
import { handlePlannerAction } from "../../../server/services/plannerSuggestions";
import itCopy from "@/locales/it.json";
import enCopy from "@/locales/en.json";
import esCopy from "@/locales/es.json";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("wouter", async () => ({ ...await vi.importActual("wouter"), useLocation: () => ["/", navigate] }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/sse", () => ({ consumeJsonSse: vi.fn() }));
vi.mock("@/lib/track", () => ({ trackProductEvent: vi.fn() }));

function show(brand: "byebro" | "byebride") {
  return render(<LanguageProvider>{brand === "byebro" ? <HeroSection /> : <HeroSectionBride />}</LanguageProvider>);
}

describe.each(["byebro", "byebride"] as const)("%s home entry", brand => {
  beforeEach(() => {
    localStorage.clear(); localStorage.setItem("byebi_locale", "it"); window.history.replaceState(null, "", "/");
    vi.resetAllMocks();
    vi.mocked(apiRequest).mockResolvedValue({} as Response);
    vi.mocked(consumeJsonSse).mockResolvedValue();
  });

  it.each(["", "   "])("opens the planner for a blank input %j without a message, network request or reset", input => {
    const draft = createPlannerDraft({ brand, origin: "Rome", participants: 6, budgetPerPerson: 650 });
    savePlannerDraft(localStorage, draft);
    const before = localStorage.getItem(PLANNER_STORAGE_KEY);
    show(brand);
    fireEvent.change(screen.getByLabelText("La tua idea di viaggio"), { target: { value: input } });
    fireEvent.click(screen.getByRole("button", { name: "Organizza il viaggio" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ispirami" })).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
    expect(trackProductEvent).not.toHaveBeenCalledWith("chat_started");
    expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBe(before);
    expect(localStorage.getItem("currentItinerary")).toBeNull();
  });

  it("does not replay the previous message when reopened with an empty input", async () => {
    show(brand);
    fireEvent.change(screen.getByLabelText("La tua idea di viaggio"), { target: { value: "  Partiamo da Roma  " } });
    fireEvent.click(screen.getByRole("button", { name: "Organizza il viaggio" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/chat/openai-stream", expect.objectContaining({ message: "Partiamo da Roma" }), expect.any(Object));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Organizza il viaggio" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it("resumes an existing complete draft without calling the chat", () => {
    savePlannerDraft(localStorage, createPlannerDraft({ brand, origin: "Rome", destination: "Ibiza", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6 }));
    show(brand); fireEvent.click(screen.getByRole("button", { name: "Organizza il viaggio" }));
    expect(screen.getByTestId("planner-review")).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
    expect(localStorage.getItem("currentItinerary")).toBeNull();
  });

  it("connects empty entry to inspiration, explicit choice, review and the options bridge", async () => {
    savePlannerDraft(localStorage, createPlannerDraft({ brand, origin: "Rome", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6 }));
    vi.mocked(apiRequest).mockImplementation(async (_method, _path, body) => ({ request: body }) as any);
    vi.mocked(consumeJsonSse).mockImplementation(async (response: any, handlers) => {
      const body = response.request;
      const result = handlePlannerAction(body.planner, body.plannerAction, body.locale);
      if (result.planner) handlers.onEvent({ tool_result: { name: "update_planner", result: { planner: result.planner } } });
      handlers.onEvent({ content: result.content }); handlers.onEvent({ suggestions: result.suggestions });
    });
    show(brand); fireEvent.click(screen.getByRole("button", { name: "Organizza il viaggio" }));
    fireEvent.click(screen.getByRole("button", { name: "Ispirami" }));
    fireEvent.click(await screen.findByRole("button", { name: /Scegli Barcellona/ }));
    expect(await screen.findByTestId("planner-review")).toBeInTheDocument();
    expect(localStorage.getItem("currentItinerary")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continua alle opzioni di viaggio" }));
    expect(navigate).toHaveBeenCalledWith("/checkout");
    expect(JSON.parse(localStorage.getItem("currentItinerary")!)).toMatchObject({ destination: "Barcelona", people: 6, budget: null });
    expect(vi.mocked(apiRequest).mock.calls.every(call => call[1] === "/api/chat/openai-stream")).toBe(true);
  });

  it.each([["it", itCopy], ["en", enCopy], ["es", esCopy]] as const)("offers the guided entry in %s", async (locale, copy) => {
    localStorage.setItem("byebi_locale", locale); show(brand);
    const key = brand === "byebro" ? "hero.bro.startChat" : "hero.bride.startChat";
    fireEvent.click(await screen.findByRole("button", { name: copy[key] }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
