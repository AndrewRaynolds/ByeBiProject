/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SplittaBro } from "./SplittaBro";
import { SplittaBride } from "./SplittaBride";

const { apiRequest, navigate, toast } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  navigate: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({ apiRequest, queryClient: { invalidateQueries: vi.fn() } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("wouter", () => ({ useLocation: () => [window.location.pathname, navigate] }));
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
    navigate.mockReset();
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

  it.each([SplittaBro, SplittaBride])('requires confirmation and removes the selected group after success', async (Component) => {
    apiRequest.mockReset();
    apiRequest.mockImplementation(async (method: string, url: string) => {
      if (method === 'DELETE') return new Response(null, { status: 204 });
      return new Response(JSON.stringify(url === '/api/expense-groups' ? [{
        id: 44, tripId: 12, name: 'Weekend', members: ['Andrea'], totalAmount: 0, currency: 'EUR',
      }] : []), { status: 200 });
    });
    render(<Component />);
    fireEvent.click(await screen.findByTestId('button-delete-group'));
    expect(apiRequest).not.toHaveBeenCalledWith('DELETE', expect.any(String));
    fireEvent.click(screen.getByRole('button', { name: 'splittabro.deleteGroupCancel' }));
    expect(screen.getByTestId('button-delete-group')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-delete-group'));
    fireEvent.click(screen.getByRole('button', { name: 'splittabro.deleteGroupConfirm' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('DELETE', '/api/expense-groups/44'));
    await waitFor(() => expect(screen.queryByTestId('button-delete-group')).not.toBeInTheDocument());
  });

  it('retains the group and reports a deletion failure', async () => {
    apiRequest.mockReset();
    apiRequest.mockImplementation(async (method: string, url: string) => {
      if (method === 'DELETE') throw new Error('unavailable');
      return new Response(JSON.stringify(url === '/api/expense-groups' ? [{
        id: 44, tripId: 12, name: 'Weekend', members: ['Andrea'], totalAmount: 0, currency: 'EUR',
      }] : []), { status: 200 });
    });
    render(<SplittaBro />);
    fireEvent.click(await screen.findByTestId('button-delete-group'));
    fireEvent.click(screen.getByRole('button', { name: 'splittabro.deleteGroupConfirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('splittabro.deleteGroupError');
    expect(screen.getByTestId('button-delete-group')).toBeInTheDocument();
  });

  it("renders persisted group totals as cents, not euros", async () => {
    apiRequest.mockReset();
    apiRequest
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 44,
        tripId: 12,
        name: "Weekend a Barcellona",
        members: ["Andrea"],
        totalAmount: 12345,
        currency: "EUR",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));

    render(<SplittaBro />);

    expect(await screen.findByText(/123,45/)).toBeInTheDocument();
    expect(screen.queryByText(/12\.345,00/)).not.toBeInTheDocument();
  });

  it("returns to the linked Trip Hub from an existing expense group", async () => {
    apiRequest.mockReset();
    apiRequest
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 44,
        tripId: 12,
        name: "Weekend a Barcellona",
        members: ["Andrea"],
        totalAmount: 12345,
        currency: "EUR",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));

    render(<SplittaBro />);

    const backToTrip = await screen.findByTestId("button-back-to-trip");
    fireEvent.click(backToTrip);

    expect(navigate).toHaveBeenCalledWith("/trips/12");
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
