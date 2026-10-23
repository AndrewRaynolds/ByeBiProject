/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import TripPlanning from "./TripPlanning";
import { emptyTripPlanning, type TripPlanningSnapshot } from "@shared/tripPlanningSchemas";
import type { Trip } from "@shared/schema";
import translations from "@/locales/it.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import { ApiError } from "@/lib/queryClient";
const { request, auth } = vi.hoisted(() => ({ request: vi.fn(), auth: { id: "owner" } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: auth.id } }) }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: vi.fn() } } }));
vi.mock("@/lib/queryClient", async (original) => ({ ...await original<typeof import("@/lib/queryClient")>(), apiRequest: request }));
vi.mock("@/contexts/LanguageContext", () => ({ useTranslation: () => ({ locale: "it", t: (key: string, values?: Record<string, string | number>) => {
  const copy = (translations as Record<string, string>)[key] ?? key;
  return copy.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values?.[k] ?? k));
} }) }));
const trip: Trip = { id: 12, userId: "owner", name: "Trip", participants: 6, startDate: "2025-10-10", endDate: "2025-10-13", departureCity: "Rome", destinations: ["Lisbon"], experienceType: "bachelor", budget: 700, activities: null, specialRequests: null, includeMerch: false, createdAt: null };
let persisted: TripPlanningSnapshot; let cache: QueryClient;
function mount() {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={cache}><TripPlanning trip={trip} /></QueryClientProvider>);
}
const capInput = () => screen.getByLabelText(translations["hubPlanning.cap"]);
const saveButton = () => screen.getByRole("button", { name: translations["hubPlanning.save"] });
async function ready() { await screen.findByLabelText(translations["hubPlanning.cap"]); }
beforeEach(() => {
  auth.id = "owner"; localStorage.clear(); request.mockReset(); persisted = { revision: 0, contextRevision: "a".repeat(64), plan: emptyTripPlanning(trip) };
  request.mockImplementation(async (method: string, _url: string, body?: any) => {
    if (method === "PUT") persisted = { ...persisted, revision: persisted.revision + 1, plan: body.plan };
    return { json: async () => structuredClone(persisted) };
  });
});
afterEach(() => { cleanup(); cache?.clear(); });
describe("Trip Hub budget/program", () => {
  it("does not write on read, previews summaries, saves explicitly and reloads on another device", async () => {
    const view = mount(); await ready();
    expect(saveButton()).toBeDisabled(); expect(request.mock.calls.every(([method]) => method === "GET")).toBe(true);
    fireEvent.change(capInput(), { target: { value: "800" } });
    fireEvent.change(screen.getByLabelText(translations["allocation.category.food"]), { target: { value: "0" } });
    expect(screen.getByText(translations["hubPlanning.unsaved"])).toBeInTheDocument();
    fireEvent.click(saveButton()); await screen.findByText(translations["hubPlanning.saved"]);
    expect(request).toHaveBeenCalledWith("PUT", "/api/trips/12/planning", expect.objectContaining({ expectedRevision: 0, plan: expect.objectContaining({ budgetPerPerson: 800, allocations: expect.objectContaining({ food: 0, accommodation: null }) }) }));
    view.unmount(); cache.clear(); mount(); await ready(); expect(capInput()).toHaveValue(800);
  });
  it("adds, edits and removes scheduled items with day/slot validation before explicit save", async () => {
    mount(); await ready();
    const fill = (title: string) => {
      fireEvent.change(screen.getByLabelText(translations["program.title"]), { target: { value: title } });
      fireEvent.change(screen.getByLabelText(translations["program.date"]), { target: { value: trip.startDate } });
      fireEvent.change(screen.getByLabelText(translations["program.slot"]), { target: { value: "morning" } });
    };
    fill("Passeggiata"); fireEvent.click(screen.getByRole("button", { name: translations["program.add"] }));
    expect(screen.getByText(/Passeggiata/)).toBeInTheDocument();
    fill("Slot occupato"); fireEvent.click(screen.getByRole("button", { name: translations["program.add"] }));
    expect(screen.getByText(translations["program.invalidAction"])).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: translations["program.edit"] }));
    fireEvent.change(screen.getByLabelText(translations["program.title"]), { target: { value: "Pranzo" } });
    fireEvent.click(screen.getByRole("button", { name: translations["program.saveItem"] }));
    fireEvent.click(saveButton()); await screen.findByText(translations["hubPlanning.saved"]);
    expect(persisted.plan.plannedItems).toMatchObject([{ title: "Pranzo", slot: "morning", date: trip.startDate, userEdited: true }]);
    fireEvent.click(screen.getByRole("button", { name: translations["program.remove"] }));
    fireEvent.click(saveButton()); await waitFor(() => expect(persisted.plan.plannedItems).toHaveLength(0));
  });
  it("preserves unsaved edits on conflict, never retries a write, requires explicit reload", async () => {
    mount(); await ready(); fireEvent.change(capInput(), { target: { value: "900" } });
    request.mockRejectedValueOnce(new ApiError(409, "conflict"));
    fireEvent.click(saveButton()); await screen.findByText(translations["hubPlanning.conflict"]);
    expect(capInput()).toHaveValue(900); expect(saveButton()).toBeDisabled();
    expect(request.mock.calls.filter(([method]) => method === "PUT")).toHaveLength(1);
    persisted = { ...persisted, revision: 1, plan: { ...persisted.plan, budgetPerPerson: 850 } };
    fireEvent.click(screen.getByRole("button", { name: translations["hubPlanning.reload"] }));
    await screen.findByText(translations["hubPlanning.reloaded"]); expect(capInput()).toHaveValue(850);
    expect(saveButton()).toBeDisabled();
  });
  it("retains drafts on failed save and offers retry for failed initial read", async () => {
    request.mockRejectedValueOnce(new Error("offline")); mount();
    await screen.findByRole("alert"); fireEvent.click(screen.getByRole("button", { name: translations["hubPlanning.retry"] })); await ready();
    fireEvent.change(capInput(), { target: { value: "800" } }); request.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(saveButton()); await screen.findByRole("alert"); expect(capInput()).toHaveValue(800); expect(saveButton()).toBeDisabled();
  });
  it("hides private cached planning after switching accounts", async () => {
    const view = mount(); await ready(); auth.id = "other";
    view.rerender(<QueryClientProvider client={cache}><TripPlanning trip={trip} /></QueryClientProvider>);
    expect(screen.queryByLabelText(translations["hubPlanning.cap"])).not.toBeInTheDocument();
  });
  it.each([en, es])("has matching localized keys for the complete planning flow", (copy) => {
    const keys = Object.keys(translations).filter((key) => key.startsWith("hubPlanning."));
    for (const key of keys) expect((copy as Record<string, string>)[key]).toBeTruthy();
  });
  it("previews compatible local data, requires explicit use and save, and retains the original bytes", async () => {
    const original = JSON.stringify({ version: 1, kind: "budget_allocation", currency: "EUR", scope: "per_person_whole_trip", source: "user_input",
      sourcePlanner: { brand: "byebro", createdAt: "2025-01-01T00:00:00.000Z" }, revision: 1,
      basis: { origin: "Rome", destination: "Lisbon", startDate: trip.startDate, endDate: trip.endDate, participants: 6, budgetPerPerson: 700 },
      allocations: { ...persisted.plan.allocations, food: 150 } });
    localStorage.setItem("byebi:budgetAllocation:v1:byebro", original);
    mount(); await ready(); fireEvent.click(screen.getByRole("button", { name: translations["hubPlanning.previewImport"] }));
    await screen.findByRole("button", { name: translations["hubPlanning.useImport"] });
    expect(request.mock.calls.filter(([method]) => method === "PUT")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: translations["hubPlanning.useImport"] }));
    expect(screen.getByLabelText(translations["allocation.category.food"])).toHaveValue(150);
    expect(request.mock.calls.filter(([method]) => method === "PUT")).toHaveLength(0);
    fireEvent.click(saveButton()); await screen.findByText(translations["hubPlanning.saved"]);
    expect(localStorage.getItem("byebi:budgetAllocation:v1:byebro")).toBe(original);
    expect(screen.queryByRole("button", { name: translations["hubPlanning.previewImport"] })).not.toBeInTheDocument();
  });
  it("shows no compatible import without mutating storage or the database", async () => {
    localStorage.setItem("byebi:programDraft:v1:byebro", "broken"); mount(); await ready();
    fireEvent.click(screen.getByRole("button", { name: translations["hubPlanning.previewImport"] }));
    await screen.findByText(translations["hubPlanning.importUnavailable"]);
    expect(localStorage.getItem("byebi:programDraft:v1:byebro")).toBe("broken"); expect(saveButton()).toBeDisabled();
  });
  const aiProposal = { version: 1, items: [{ catalogId: "free_time", date: trip.endDate, slot: "evening" }] };
  const mockProposal = () => request.mockImplementation(async (method: string, _url: string, body?: any) => {
    if (method === "POST") return { json: async () => aiProposal };
    if (method === "PUT") persisted = { ...persisted, revision: persisted.revision + 1, plan: body.plan };
    return { json: async () => structuredClone(persisted) };
  });
  it("reviews AI ideas, confirms into unsaved changes and only persists on explicit save", async () => {
    persisted.plan.plannedItems = [{ id: "kept", ideaId: null, title: "Existing activity", date: trip.startDate, slot: "morning", durationMinutes: 30, provenance: { kind: "user" }, feasibility: "not_checked", userEdited: true }];
    mockProposal(); mount(); await ready();
    fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.generate"] }));
    await screen.findByRole("heading", { name: translations["aiProgram.review"] });
    expect(request.mock.calls.filter(([method]) => method === "PUT")).toHaveLength(0);
    expect(saveButton()).toBeDisabled(); expect(persisted.plan.plannedItems).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.accept"] }));
    expect(screen.getByText(/Existing activity/)).toBeInTheDocument();
    expect(request.mock.calls.filter(([method]) => method === "PUT")).toHaveLength(0);
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton()); await screen.findByText(translations["hubPlanning.saved"]);
    expect(persisted.plan.plannedItems).toHaveLength(2); expect(persisted.plan.plannedItems[0]).toMatchObject({ id: "kept", durationMinutes: 30, userEdited: true });
    expect(persisted.plan.plannedItems[1]).toMatchObject({ feasibility: "not_checked", durationMinutes: null });
  });
  it("discards a proposal and invalidates it after local changes without saving", async () => {
    mockProposal(); mount(); await ready();
    const generate = () => fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.generate"] }));
    generate(); await screen.findByRole("heading", { name: translations["aiProgram.review"] });
    fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.discard"] })); expect(saveButton()).toBeDisabled();
    generate(); await screen.findByRole("heading", { name: translations["aiProgram.review"] });
    fireEvent.change(capInput(), { target: { value: "850" } });
    expect(screen.queryByRole("button", { name: translations["aiProgram.accept"] })).not.toBeInTheDocument();
    expect(request.mock.calls.filter(([method]) => method === "PUT")).toHaveLength(0);
  });
  it("shows the AI data disclosure and distinct no-slot/rate-limit errors without losing edits", async () => {
    mount(); await ready();
    expect(screen.getByText(translations["aiProgram.dataUse"])).toBeInTheDocument();
    fireEvent.change(capInput(), { target: { value: "850" } });
    request.mockRejectedValueOnce(new ApiError(422, "NO_FREE_SLOTS"));
    fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.generate"] }));
    await screen.findByText(translations["aiProgram.noSlots"]);
    expect(capInput()).toHaveValue(850);
    expect(request.mock.calls.filter(([method]) => method === "PUT")).toHaveLength(0);
    request.mockRejectedValueOnce(new ApiError(429, "Too many requests"));
    fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.generate"] }));
    await screen.findByText(translations["aiProgram.rateLimit"]);
    expect(capInput()).toHaveValue(850);
    expect(saveButton()).toBeEnabled();
  });
  it("preserves unsaved edits on AI failure and requires reload after a conflict", async () => {
    mount(); await ready(); fireEvent.change(capInput(), { target: { value: "850" } });
    request.mockRejectedValueOnce(new Error("provider offline"));
    fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.generate"] }));
    await screen.findByText(translations["aiProgram.error"]); expect(capInput()).toHaveValue(850);
    expect(saveButton()).toBeEnabled();
    request.mockRejectedValueOnce(new ApiError(409, "conflict"));
    fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.generate"] }));
    await screen.findByText(translations["hubPlanning.conflict"]); expect(capInput()).toHaveValue(850); expect(saveButton()).toBeDisabled();
  });
  it("rejects invalid/overlapping AI proposals before offering confirmation", async () => {
    mount(); await ready();
    request.mockResolvedValueOnce({ json: async () => ({ ...aiProposal, items: [{ ...aiProposal.items[0], date: "2099-01-01" }] }) });
    fireEvent.click(screen.getByRole("button", { name: translations["aiProgram.generate"] }));
    await screen.findByText(translations["aiProgram.error"]);
    expect(screen.queryByRole("button", { name: translations["aiProgram.accept"] })).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });
  it.each([en, es])("localizes AI review and every destination interest reason", copy => {
    const keys = Object.keys(translations).filter(key => key.startsWith("aiProgram.") || key.startsWith("planner.interestReason."));
    for (const key of keys) expect((copy as Record<string, string>)[key]).toBeTruthy();
  });

});
