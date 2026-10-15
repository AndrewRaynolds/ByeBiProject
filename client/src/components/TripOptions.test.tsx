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
    onSuccess?: (value: unknown) => void;
    onError?: (value: unknown) => void;
  }) => ({
    mutate: (value: unknown) => {
      void options.mutationFn(value)
        .then((result) => options.onSuccess?.(result))
        .catch((error) => options.onError?.(error));
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
    fireEvent.click(screen.getByRole("button", { name: "tripOptions.save" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      "POST", "/api/trips/12/options",
      expect.objectContaining({
        category: "flight", url: "https://example.com/hotel",
        title: "Example Hotel", source: "example.com", priceNote: "€85 observed",
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
});
