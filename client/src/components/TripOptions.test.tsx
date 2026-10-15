/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TripOptions from "./TripOptions";

const { apiRequest, invalidateQueries, data } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  invalidateQueries: vi.fn(),
  data: { options: [] as unknown[] },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: data.options, error: null, isLoading: false }),
  useMutation: (options: {
    mutationFn: (value: unknown) => Promise<unknown>;
    onSuccess?: (value: unknown, variables: unknown) => void;
    onError?: (error: unknown, variables: unknown) => void;
  }) => ({
    mutate: (value: unknown) => {
      void options.mutationFn(value)
        .then((result) => options.onSuccess?.(result, value))
        .catch((error) => options.onError?.(error, value));
    },
    isPending: false,
  }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest,
  queryClient: { invalidateQueries },
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

});
