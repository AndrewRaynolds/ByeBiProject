/** @vitest-environment jsdom */
import { act, fireEvent, render as baseRender, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TripOptions from "./TripOptions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function render(ui: React.ReactElement) {
  return baseRender(<QueryClientProvider client={new QueryClient({defaultOptions: {mutations: {retry: false}}})}>{ui}</QueryClientProvider>);
}

const { apiRequest, invalidateQueries, data } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  invalidateQueries: vi.fn(),
  data: { options: [] as unknown[] },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: () => ({ data: data.options, error: null, isLoading: false }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest,
  queryClient: { invalidateQueries },
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, string>) => params ? `${key}: ${params.destination}` : key === "destinations.city.barcelona.name" ? "Barcellona" : key }),
}));

describe("TripOptions", () => {
  beforeEach(() => {
    data.options = [];
    apiRequest.mockReset();
    invalidateQueries.mockReset();
    invalidateQueries.mockResolvedValue(undefined);
  });

  it("previews a generic URL and saves only after explicit confirmation", async () => {
    apiRequest.mockImplementation(async (method: string, url: string) => ({
      json: async () => url.endsWith("/preview")
        ? {
            url: "https://example.com/hotel", title: "Example Hotel",
            source: "example.com", description: null, imageUrl: null, available: true,
          }
        : { id: 1 },
    }));

    render(<TripOptions tripId={12} />);
    fireEvent.click(screen.getByRole("button", { name: "tripOptions.add" }));
    fireEvent.change(screen.getByLabelText("tripOptions.url"), { target: { value: "https://example.com/hotel" } });
    fireEvent.paste(screen.getByLabelText("tripOptions.url"), { clipboardData: { getData: () => "https://example.com/hotel" } });

    await waitFor(() => expect(screen.getByLabelText("tripOptions.optionTitle")).toHaveValue("Example Hotel"));
    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/trips/12/options/preview", { url: "https://example.com/hotel" });
    expect(apiRequest).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("tripOptions.priceNote"), { target: { value: "€85 observed" } });
    fireEvent.change(screen.getByLabelText("tripOptions.imageUrl"), { target: { value: "https://example.com/custom-photo.jpg" } });
    fireEvent.click(screen.getByRole("button", { name: "tripOptions.save" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      "POST", "/api/trips/12/options",
      expect.objectContaining({
        category: "flight", url: "https://example.com/hotel",
        title: "Example Hotel", source: "example.com", priceNote: "€85 observed",
        imageUrl: "https://example.com/custom-photo.jpg",
      }),
    ));
  });

  it("lets the user open, edit and remove a saved candidate without claiming a booking", async () => {
    data.options = [{
      id: 9, category: "hotel", url: "https://example.com/hotel",
      title: "Example Hotel", source: "example.com", description: null,
      imageUrl: null, priceNote: null, notes: null, tripId: 12, createdAt: new Date(),
    }];
    apiRequest.mockResolvedValue({ json: async () => ({ id: 9 }) });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TripOptions tripId={12} />);
    expect(screen.getByText("tripOptions.considering")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "tripOptions.open" })).toHaveAttribute("href", "https://example.com/hotel");
    fireEvent.click(screen.getByRole("button", { name: "tripOptions.edit" }));
    expect(screen.getByLabelText("tripOptions.optionTitle")).toHaveValue("Example Hotel");
    fireEvent.click(screen.getByRole("button", { name: "tripOptions.cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "tripOptions.delete" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("DELETE", "/api/trips/12/options/9"));
    confirm.mockRestore();
  });
  it("uses the actual image when available and falls back to a labeled contextual cover", () => {
    data.options = [{
      id: 10, category: "hotel", url: "https://example.com/hotel",
      title: "Saved hotel", source: "example.com", description: null,
      imageUrl: "https://example.com/photo.jpg", priceNote: null, notes: null,
      tripId: 12, createdAt: new Date(),
    }];
    const { container } = render(<TripOptions tripId={12} />);
    const sourceImage = container.querySelector("img")!;
    expect(sourceImage).toHaveAttribute("src", "https://example.com/photo.jpg");
    expect(screen.queryByText("tripOptions.illustrativeImage")).not.toBeInTheDocument();
    fireEvent.error(sourceImage);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("tripOptions.illustrativeImage")).toBeVisible();
    // The fallback explains this specific saved candidate without pretending to be a photo of it.
    expect(screen.getAllByText("Saved hotel")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "tripOptions.open" })).toBeVisible();
  });

  it("uses an illustrative category/title cover instead of an unrelated stock photograph", () => {
    data.options = [{
      id: 11, category: "activities", url: "https://example.com/tour",
      title: "Kayak tour", source: "example.com", description: null,
      imageUrl: null, priceNote: null, notes: null, tripId: 12, createdAt: new Date(),
    }];
    const { container } = render(<TripOptions tripId={12} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getAllByText("Kayak tour")).toHaveLength(2);
    expect(screen.getByText("tripOptions.illustrativeImage")).toBeVisible();
    expect(screen.getByText("tripOptions.activities")).toBeVisible();
  });

  it("preserves manually edited fields while an automatic link preview is loading", async () => {
    let resolvePreview!: (response: { json: () => Promise<unknown> }) => void;
    apiRequest.mockImplementation(async (_method: string, url: string) => {
      if (url.endsWith("/preview")) {
        return await new Promise<{ json: () => Promise<unknown> }>((resolve) => {
          resolvePreview = resolve;
        });
      }
      return { json: async () => ({ id: 1 }) };
    });
    render(<TripOptions tripId={12} />);
    fireEvent.click(screen.getByRole("button", { name: "tripOptions.add" }));
    fireEvent.change(screen.getByLabelText("tripOptions.url"), { target: { value: "https://example.com/hotel" } });
    fireEvent.paste(screen.getByLabelText("tripOptions.url"), {
      clipboardData: { getData: () => "https://example.com/hotel" },
    });
    fireEvent.change(screen.getByLabelText("tripOptions.optionTitle"), { target: { value: "My chosen hotel" } });
    fireEvent.change(screen.getByLabelText("tripOptions.imageUrl"), { target: { value: "https://example.com/custom.jpg" } });
    await waitFor(() => expect(resolvePreview).toBeTypeOf("function"));
    resolvePreview({
      json: async () => ({
        url: "https://example.com/hotel", title: "Remote title",
        source: "example.com", description: "Suggested", imageUrl: "https://example.com/source.jpg", available: true,
      }),
    });
    await waitFor(() => expect(screen.getByLabelText("tripOptions.source")).toHaveValue("example.com"));
    expect(screen.getByLabelText("tripOptions.optionTitle")).toHaveValue("My chosen hotel");
    expect(screen.getByLabelText("tripOptions.imageUrl")).toHaveValue("https://example.com/custom.jpg");
    expect(screen.getByLabelText("tripOptions.description")).toHaveValue("Suggested");
  });

  it("shows readable input text and visible focus treatment in the add-link form", () => {
    render(<TripOptions tripId={12} />);
    fireEvent.click(screen.getByRole("button", { name: "tripOptions.add" }));
    for (const key of ["url", "optionTitle", "source", "description", "priceNote", "notes", "imageUrl"]) {
      const field = screen.getByLabelText(`tripOptions.${key}`);
      expect(field).toHaveClass("text-foreground");
      expect(field).toHaveClass("bg-background");
      expect(field).toHaveClass("focus-visible:ring-2");
      expect(field).toHaveClass("text-base");
    }
  });

  it.each(["before", "before-cleared", "during", "cleared"])("protects manual title %s the request using real mutation state", async (when) => {
    let resolve!: (value: unknown) => void;
    apiRequest.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<TripOptions tripId={12} />);
    fireEvent.click(screen.getByRole("button", {name: "tripOptions.add"}));
    const title = screen.getByLabelText("tripOptions.optionTitle");
    fireEvent.change(screen.getByLabelText("tripOptions.url"), {target: {value: "https://byebi.it/"}});
    if (when.startsWith("before")) fireEvent.change(title, {target: {value: "Manual"}});
    if (when === "before-cleared") fireEvent.change(title, {target: {value: ""}});
    fireEvent.click(screen.getByRole("button", {name: "tripOptions.getPreview"}));
    await waitFor(() => expect(screen.getByRole("button", {name: "tripOptions.loading"})).toBeDisabled());
    if (!when.startsWith("before")) fireEvent.change(title, {target: {value: "Manual"}});
    if (when === "cleared") fireEvent.change(title, {target: {value: ""}});
    await act(async () => resolve({json: async () => ({url: "https://byebi.it/", title: "Remote", source: "byebi.it", description: null, imageUrl: null, available: true})}));
    expect(title).toHaveValue(when.includes("cleared") ? "" : "Manual");
    expect(screen.getByLabelText("tripOptions.source")).toHaveValue("byebi.it");
  });

  it.each(["success", "error"])("ignores stale %s after URL A → B → A", async (outcome) => {
    let resolve!: (value: unknown) => void;
    let reject!: (error: Error) => void;
    apiRequest.mockReturnValue(new Promise((yes, no) => { resolve = yes; reject = no; }));
    render(<TripOptions tripId={12} />);
    fireEvent.click(screen.getByRole("button", {name: "tripOptions.add"}));
    const url = screen.getByLabelText("tripOptions.url");
    fireEvent.change(url, {target: {value: "https://byebi.it/"}});
    fireEvent.click(screen.getByRole("button", {name: "tripOptions.getPreview"}));
    fireEvent.change(url, {target: {value: "https://example.com/"}});
    fireEvent.change(url, {target: {value: "https://byebi.it/"}});
    await act(async () => {
      if (outcome === "error") reject(new Error("Unavailable"));
      else resolve({json: async () => ({url: "https://byebi.it/", title: "Stale", source: "byebi.it", description: null, imageUrl: null, available: false})});
    });
    expect(screen.getByLabelText("tripOptions.optionTitle")).toHaveValue("");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses the latest replacement paste and ignores older responses and cancelled drafts", async () => {
    const pending: ((value: unknown) => void)[] = [];
    apiRequest.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    render(<TripOptions tripId={12} />);
    fireEvent.click(screen.getByRole("button", {name: "tripOptions.add"}));
    const url = screen.getByLabelText("tripOptions.url");
    for (const link of ["https://example.com/a", "https://example.com/b"]) {
      fireEvent.paste(url, {clipboardData: {getData: () => link}});
    }
    expect(url).toHaveValue("https://example.com/b");
    const response = (suffix: string) => ({json: async () => ({url: `https://example.com/${suffix}`, title: suffix, source: "example.com", description: null, imageUrl: null, available: true})});
    await waitFor(() => expect(pending).toHaveLength(2));
    await act(async () => pending[1](response("b")));
    await act(async () => pending[0](response("a")));
    expect(screen.getByLabelText("tripOptions.optionTitle")).toHaveValue("b");
    fireEvent.paste(url, {clipboardData: {getData: () => "https://example.com/c"}});
    fireEvent.click(screen.getByRole("button", {name: "tripOptions.cancel"}));
    fireEvent.click(screen.getByRole("button", {name: "tripOptions.add"}));
    await waitFor(() => expect(pending).toHaveLength(3));
    await act(async () => pending[2](response("c")));
    expect(screen.getByLabelText("tripOptions.optionTitle")).toHaveValue("");
  });

  it.each([
    ["https://www.booking.com/searchresults.html?ss=Barcelona", "www.booking.com", ["Barcelona"], true],
    ["https://www.booking.com/searchresults.it.html?ss=Barcelona", "booking.com", ["Barcelona"], true],
    ["https://www.booking.com/hotel/es/example.html?ss=Barcelona", "www.booking.com", ["Barcelona"], false],
    ["https://www.booking.com/searchresults.html?ss=Madrid", "www.booking.com", ["Barcelona"], false],
    ["https://booking.com.evil.test/searchresults.html?ss=Barcelona", "www.booking.com", ["Barcelona"], false],
    ["https://www.booking.com/searchresults.html?ss=Barcelona", "Named property", ["Barcelona"], false],
    ["https://www.booking.com/searchresults.html?ss=Barcelona", "www.booking.com", [], false],
    ["https://www.booking.com/searchresults.html?ss=Barcelona&ss=Madrid", "www.booking.com", ["Barcelona"], false],
  ])("only contextualizes a verified Booking search %s (%s)", (url, title, destinations, contextual) => {
    data.options = [{id: 1, category: "hotel", url, title, source: "booking.com"}];
    render(<TripOptions tripId={12} destinations={destinations} />);
    expect(screen.getByRole("heading", {level: 3})).toHaveTextContent(contextual ? "tripOptions.accommodationIn: Barcellona" : title);
  });

});
