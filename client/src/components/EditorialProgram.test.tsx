/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorialProgram from "./EditorialProgram";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createPlannerDraft } from "@shared/plannerSchemas";
import { savePlannerDraft } from "@/lib/plannerStorage";
import { programStorageKey, readProgram } from "@/lib/programStorage";
import itCopy from "@/locales/it.json";
import enCopy from "@/locales/en.json";
import esCopy from "@/locales/es.json";

function planner(brand: "byebro" | "byebride" = "byebro") {
  return createPlannerDraft({ brand, origin: "Rome", destination: "Lisbon", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6 });
}
function mount(context = planner()) {
  savePlannerDraft(localStorage, context);
  const refresh = vi.fn(); const view = render(<LanguageProvider><EditorialProgram planner={context} onReloadPlanner={refresh} /></LanguageProvider>);
  fireEvent.click(screen.getByText(itCopy["program.open"]));
  return { context, refresh, ...view };
}
async function create() { fireEvent.click(await screen.findByRole("button", { name: itCopy["program.create"] })); await screen.findByText(itCopy["program.noItems"]); }
function add(title = "Our activity", date = "2099-10-11", slot = "afternoon") {
  fireEvent.change(screen.getByLabelText(itCopy["program.title"]), { target: { value: title } });
  fireEvent.change(screen.getByLabelText(itCopy["program.date"]), { target: { value: date } });
  fireEvent.change(screen.getByLabelText(itCopy["program.slot"]), { target: { value: slot } });
  fireEvent.click(screen.getByRole("button", { name: itCopy["program.add"] }));
}
describe("optional local program editor", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("navigator", { locks: { request: async (_name: string, _options: unknown, work: () => unknown) => work() } });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it("does not save on opening, explicitly adds/edits/removes and resumes after remount", async () => {
    const view = mount(); expect(localStorage.getItem(programStorageKey("byebro"))).toBeNull();
    await create(); add(); await screen.findByRole("heading", { name: "Our activity" });
    expect(readProgram(localStorage, view.context).program?.plannedItems).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: itCopy["program.edit"] }));
    fireEvent.change(screen.getByLabelText(itCopy["program.title"]), { target: { value: "Edited activity" } });
    fireEvent.click(screen.getByRole("button", { name: itCopy["program.saveItem"] }));
    await screen.findByRole("heading", { name: "Edited activity" });
    view.unmount(); mount(view.context); await screen.findByRole("heading", { name: "Edited activity" });
    fireEvent.click(screen.getByRole("button", { name: itCopy["program.remove"] }));
    await screen.findByText(itCopy["program.noItems"]);
  });
  it("offers trusted editorial ideas, but schedules only the explicit choice", async () => {
    const view = mount(); await create();
    expect(readProgram(localStorage, view.context).program?.ideas).toHaveLength(5);
    fireEvent.change(screen.getByLabelText(itCopy["program.inspiration"]), { target: { value: "neighborhood_walk" } });
    expect(readProgram(localStorage, view.context).program?.plannedItems).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(itCopy["program.date"]), { target: { value: "2099-10-11" } });
    fireEvent.change(screen.getByLabelText(itCopy["program.slot"]), { target: { value: "morning" } });
    fireEvent.click(screen.getByRole("button", { name: itCopy["program.add"] }));
    await screen.findByRole("heading", { name: itCopy["program.idea.neighborhood_walk"] });
    expect(readProgram(localStorage, view.context).program?.plannedItems[0]).toMatchObject({ feasibility: "not_checked", durationMinutes: null });
  });
  it("rejects an occupied slot, preserves saved data and lets the user correct the form", async () => {
    mount(); await create(); add("First"); await screen.findByRole("heading", { name: "First" });
    add("Second"); await screen.findByRole("alert");
    expect(screen.getByLabelText(itCopy["program.title"])).toHaveValue("Second");
    fireEvent.change(screen.getByLabelText(itCopy["program.slot"]), { target: { value: "evening" } });
    fireEvent.click(screen.getByRole("button", { name: itCopy["program.add"] }));
    await screen.findByRole("heading", { name: "Second" });
  });
  it("does not silently overwrite another tab and requires explicit reload", async () => {
    const view = mount(); await create(); const stored = readProgram(localStorage, view.context).program!;
    localStorage.setItem(programStorageKey("byebro"), JSON.stringify({ ...stored, revision: stored.revision + 1 }));
    add(); await screen.findByText(itCopy["program.conflict"]);
    expect(readProgram(localStorage, view.context).program?.plannedItems).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: itCopy["program.reload"] }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
  it("signals storage events without applying or discarding unsent edits automatically", async () => {
    mount(); await create();
    fireEvent.change(screen.getByLabelText(itCopy["program.title"]), { target: { value: "Unsent" } });
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: programStorageKey("byebro") })));
    expect(screen.getByRole("alert")).toHaveTextContent(itCopy["program.conflict"]);
    expect(screen.getByLabelText(itCopy["program.title"])).toHaveValue("Unsent");
    expect(screen.getByRole("button", { name: itCopy["program.add"] })).toBeDisabled();
  });
  it("requires explicit corrections after the dates change, preserving the item", async () => {
    const view = mount(); await create(); add(); await screen.findByRole("heading", { name: "Our activity" }); view.unmount();
    const changed = { ...view.context, startDate: "2099-10-15", endDate: "2099-10-18" };
    mount(changed); await screen.findByText(itCopy["program.reviewContext"]);
    fireEvent.change(screen.getByLabelText(itCopy["program.date"]), { target: { value: "2099-10-16" } });
    fireEvent.click(screen.getByRole("button", { name: itCopy["program.confirmContext"] }));
    await screen.findByRole("heading", { name: "Our activity" });
    expect(readProgram(localStorage, changed).program?.plannedItems[0].date).toBe("2099-10-16");
  });
  it("reports an unsupported browser without pretending to save", async () => {
    vi.stubGlobal("navigator", {}); mount(); fireEvent.click(await screen.findByRole("button", { name: itCopy["program.create"] }));
    await screen.findByText(itCopy["program.unsupported"]);
    expect(localStorage.getItem(programStorageKey("byebro"))).toBeNull();
  });
  it("does not report a successful save when the storage quota fails", async () => {
    mount();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(await screen.findByRole("button", { name: itCopy["program.create"] }));
    await screen.findByText(itCopy["program.storageError"]);
    expect(screen.queryByText(itCopy["program.saved"])).not.toBeInTheDocument();
  });
  it("refreshes editorial ideas without modifying chosen items or unsent custom text", async () => {
    const view = mount(); await create(); add(); await screen.findByRole("heading", { name: "Our activity" });
    const before = readProgram(localStorage, view.context).program!.plannedItems;
    fireEvent.change(screen.getByLabelText(itCopy["program.title"]), { target: { value: "Unsent new activity" } });
    fireEvent.click(screen.getByRole("button", { name: itCopy["program.refreshIdeas"] }));
    await waitFor(() => expect(readProgram(localStorage, view.context).program!.revision).toBe(4));
    expect(readProgram(localStorage, view.context).program!.plannedItems).toEqual(before);
    expect(screen.getByLabelText(itCopy["program.title"])).toHaveValue("Unsent new activity");
  });
  for (const [locale, copy] of [["it", itCopy], ["en", enCopy], ["es", esCopy]] as const) {
    it.each(["byebro", "byebride"] as const)(`${locale}: %s localizes the same five ideas and local-only scope`, async (brand) => {
      localStorage.setItem("byebi_locale", locale); const context = planner(brand); savePlannerDraft(localStorage, context);
      render(<LanguageProvider><EditorialProgram planner={context} onReloadPlanner={vi.fn()} /></LanguageProvider>);
      fireEvent.click(await screen.findByText(copy["program.open"]));
      fireEvent.click(await screen.findByRole("button", { name: copy["program.create"] }));
      const select = await screen.findByLabelText(copy["program.inspiration"]);
      expect(within(select).getAllByRole("option")).toHaveLength(6);
      expect(screen.getByText(copy["program.disclaimer"])).toBeInTheDocument();
    });
  }
});
