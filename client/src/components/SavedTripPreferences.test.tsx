/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SavedTripPreferences from "./SavedTripPreferences";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import itCopy from "@/locales/it.json";
import enCopy from "@/locales/en.json";
import esCopy from "@/locales/es.json";
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn(), queryClient: { invalidateQueries: vi.fn() } }));
const revision = "a".repeat(64); const nextRevision = "b".repeat(64);
const response = (notes: string[] | null, rev = revision) => ({ json: async () => ({ notes, revision: rev }) } as Response);
function mount(notes: string[] = ["new"], ownerId = "owner") {
  return render(<LanguageProvider><SavedTripPreferences tripId={7} ownerId={ownerId} notes={notes} /></LanguageProvider>);
}
describe("saved preference confirmation", () => {
  beforeEach(() => {
    localStorage.clear(); vi.clearAllMocks();
    vi.mocked(queryClient.invalidateQueries).mockResolvedValue();
    vi.mocked(apiRequest).mockResolvedValue(response(["old"]));
  });
  it("shows both versions and writes only after explicit confirmation, then refreshes affected caches", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(response(["old"])).mockResolvedValueOnce(response(["new"], nextRevision));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: itCopy["savedPreferences.update"] }));
    expect(await screen.findByText(itCopy["savedPreferences.updated"])).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith("PATCH", "/api/trips/7/preferences", { notes: ["new"], expectedRevision: revision }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/trips/user/owner"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/trips/7"] });
    const predicate = vi.mocked(queryClient.invalidateQueries).mock.calls.find(([options]) => options && "predicate" in options)?.[0]?.predicate;
    expect(predicate?.({ queryKey: ["/api/shared-trips/token"] } as never)).toBe(true);
    expect(predicate?.({ queryKey: ["/unrelated"] } as never)).toBe(false);
  });
  it("does not save or clear automatically; removal uses an explicit labelled action", async () => {
    mount([]);
    const button = await screen.findByRole("button", { name: itCopy["savedPreferences.remove"] });
    expect(screen.getByText("old")).toBeInTheDocument();
    expect(screen.getByText(itCopy["savedPreferences.empty"])).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    vi.mocked(apiRequest).mockResolvedValueOnce(response([], nextRevision));
    fireEvent.click(button);
    await screen.findByText(itCopy["savedPreferences.updated"]);
    expect(apiRequest).toHaveBeenLastCalledWith("PATCH", "/api/trips/7/preferences", { notes: [], expectedRevision: revision }, expect.anything());
  });
  it("reloads a conflict without retrying the write until another explicit confirmation", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(response(["old"]))
      .mockRejectedValueOnce({ status: 409 }).mockResolvedValueOnce(response(["elsewhere"], nextRevision))
      .mockResolvedValueOnce(response(["new"], "c".repeat(64)));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: itCopy["savedPreferences.update"] }));
    await screen.findByText("elsewhere");
    expect(screen.getByText(itCopy["savedPreferences.conflict"])).toBeInTheDocument();
    expect(vi.mocked(apiRequest).mock.calls.filter(([method]) => method === "PATCH")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: itCopy["savedPreferences.update"] }));
    await screen.findByText(itCopy["savedPreferences.updated"]);
    expect(apiRequest).toHaveBeenLastCalledWith("PATCH", "/api/trips/7/preferences", { notes: ["new"], expectedRevision: nextRevision }, expect.anything());
  });
  it("keeps failed or malformed acknowledgements from appearing successful and allows a retry", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(response(["old"]))
      .mockResolvedValueOnce(response(["wrong"], nextRevision)).mockResolvedValueOnce(response(["new"], nextRevision));
    mount(); fireEvent.click(await screen.findByRole("button", { name: itCopy["savedPreferences.update"] }));
    await screen.findByRole("alert");
    expect(screen.queryByText(itCopy["savedPreferences.updated"])).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: itCopy["savedPreferences.update"] }));
    await screen.findByText(itCopy["savedPreferences.updated"]);
  });
  it("allows retrying an unavailable read without offering a write", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response(["old"]));
    mount(); await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: itCopy["savedPreferences.update"] })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: itCopy["savedPreferences.reload"] }));
    await screen.findByRole("button", { name: itCopy["savedPreferences.update"] });
  });
  it("does not write unchanged notes, including null legacy versus an empty draft", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(response(null)); mount([]);
    await screen.findByText(itCopy["savedPreferences.aligned"]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: itCopy["savedPreferences.remove"] })).not.toBeInTheDocument();
  });
  it("preserves legacy notes on read and blocks new notes outside the write limits", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(response(["x".repeat(150)])); mount(Array(21).fill("new"));
    await screen.findByText("x".repeat(150));
    expect(screen.getByRole("button", { name: itCopy["savedPreferences.update"] })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(itCopy["savedPreferences.invalid"]);
  });
  it("blocks double clicks and ignores a late write after account replacement", async () => {
    let resolve!: (value: Response) => void;
    vi.mocked(apiRequest).mockResolvedValueOnce(response(["old"]))
      .mockImplementationOnce(() => new Promise((done) => { resolve = done; }))
      .mockResolvedValueOnce(response(["other owner"]));
    const view = mount();
    const button = await screen.findByRole("button", { name: itCopy["savedPreferences.update"] });
    fireEvent.click(button); fireEvent.click(button);
    expect(vi.mocked(apiRequest).mock.calls.filter(([method]) => method === "PATCH")).toHaveLength(1);
    view.rerender(<LanguageProvider><SavedTripPreferences key="other" tripId={8} ownerId="other" notes={["other draft"]} /></LanguageProvider>);
    await screen.findByText("other owner");
    await act(async () => resolve(response(["new"], nextRevision)));
    expect(screen.queryByText(itCopy["savedPreferences.updated"])).not.toBeInTheDocument();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
  it.each([["it", itCopy], ["en", enCopy], ["es", esCopy]] as const)("%s localizes comparison, deletion and shared-link disclosure", async (locale, copy) => {
    localStorage.setItem("byebi_locale", locale); mount([]);
    await screen.findByRole("button", { name: copy["savedPreferences.remove"] });
    expect(screen.getByText(copy["savedPreferences.saved"])).toBeInTheDocument();
    expect(screen.getByText(copy["savedPreferences.removeHelp"])).toBeInTheDocument();
  });
});
