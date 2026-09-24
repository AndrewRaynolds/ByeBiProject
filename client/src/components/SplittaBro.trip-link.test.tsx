/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SplittaBro } from "./SplittaBro";

const { apiRequest, toast } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({ apiRequest }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("wouter", () => ({ useLocation: () => [window.location.pathname, vi.fn()] }));
vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    locale: "it",
    t: (key: string) => key,
  }),
}));

describe("SplittaBro trip link", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/splitta-bro?tripId=12&tripName=Weekend+a+Barcellona");
    apiRequest.mockReset();
    toast.mockReset();
    apiRequest
      .mockResolvedValueOnce(new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 44,
        tripId: 12,
        name: "Weekend a Barcellona",
        members: ["Andrea"],
        totalAmount: 0,
        currency: "EUR",
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }));
  });

  it("prefills the existing group flow and associates the new group with the trip", async () => {
    render(<SplittaBro />);

    expect(await screen.findByTestId("input-group-name")).toHaveValue("Weekend a Barcellona");
    fireEvent.change(screen.getByTestId("input-member-name"), { target: { value: "Andrea" } });
    fireEvent.click(screen.getByTestId("button-add-member"));
    fireEvent.click(screen.getByTestId("button-submit-group"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenLastCalledWith("POST", "/api/expense-groups", {
        tripId: 12,
        name: "Weekend a Barcellona",
        description: "splittabro.linkedTripDescription",
        members: ["Andrea"],
        currency: "EUR",
      });
    });
  });
});
