import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  getTripForUser: vi.fn(),
  getTripOrganizationStatusForUser: vi.fn(),
  upsertTripOrganizationStatusForUser: vi.fn(),
}));
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("./storage", () => ({ storage: storageMocks }));
vi.mock("./supabase", () => ({ supabase: { auth: { getUser } } }));
vi.mock("./zapier-integration", () => ({ registerZapierRoutes: vi.fn() }));

describe("trip organization status routes", () => {
  let baseUrl = "";
  let server: Awaited<ReturnType<typeof import("./routes").registerRoutes>>;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const { registerRoutes } = await import("./routes");
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockImplementation(async (token: string) => ({
      data: { user: token === "token-a" ? { id: "user-a" } : { id: "user-b" } },
      error: null,
    }));
    storageMocks.getTripForUser.mockImplementation(async (_tripId: number, ownerId: string) =>
      ownerId === "user-a" ? { id: 12, userId: "user-a" } : undefined,
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  });

  it("requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/trips/12/organization-status`);

    expect(response.status).toBe(401);
    expect(storageMocks.getTripForUser).not.toHaveBeenCalled();
  });

  it("returns a non-persisted pending default for an owned trip without status", async () => {
    storageMocks.getTripOrganizationStatusForUser.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/trips/12/organization-status`, {
      headers: { Authorization: "Bearer token-a" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: { flight: "pending", hotel: "pending", activities: "pending" },
      persisted: false,
    });
    expect(storageMocks.getTripOrganizationStatusForUser).toHaveBeenCalledWith(12, "user-a");
  });

  it("returns persisted organization state for the owner", async () => {
    storageMocks.getTripOrganizationStatusForUser.mockResolvedValue({
      flight: "done",
      hotel: "pending",
      activities: "done",
    });

    const response = await fetch(`${baseUrl}/api/trips/12/organization-status`, {
      headers: { Authorization: "Bearer token-a" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: { flight: "done", hotel: "pending", activities: "done" },
      persisted: true,
    });
  });

  it("does not expose another user's trip status", async () => {
    const response = await fetch(`${baseUrl}/api/trips/12/organization-status`, {
      headers: { Authorization: "Bearer token-b" },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Trip not found" });
    expect(storageMocks.getTripOrganizationStatusForUser).not.toHaveBeenCalled();
  });

  it("validates the full manual status contract before updating", async () => {
    const response = await fetch(`${baseUrl}/api/trips/12/organization-status`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        flight: "booked",
        hotel: "pending",
        activities: "done",
      }),
    });

    expect(response.status).toBe(400);
    expect(storageMocks.upsertTripOrganizationStatusForUser).not.toHaveBeenCalled();
  });

  it("persists an owner-scoped manual status update", async () => {
    const status = { flight: "done", hotel: "pending", activities: "done" };
    storageMocks.upsertTripOrganizationStatusForUser.mockResolvedValue(status);

    const response = await fetch(`${baseUrl}/api/trips/12/organization-status`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(status),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status, persisted: true });
    expect(storageMocks.upsertTripOrganizationStatusForUser).toHaveBeenCalledWith(
      12,
      "user-a",
      status,
    );
  });

  it("returns the same not-found response when update ownership fails", async () => {
    storageMocks.upsertTripOrganizationStatusForUser.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/trips/12/organization-status`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-b",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ flight: "done", hotel: "pending", activities: "pending" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Trip not found" });
  });
});
