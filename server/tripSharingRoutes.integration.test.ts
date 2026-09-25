import { createHash } from "node:crypto";
import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  getTripForUser: vi.fn(),
  getActiveTripInviteForUser: vi.fn(),
  rotateTripInviteForUser: vi.fn(),
  revokeTripInviteForUser: vi.fn(),
  getSharedTripByTokenHash: vi.fn(),
}));
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("./storage", () => ({ storage: storageMocks }));
vi.mock("./supabase", () => ({ supabase: { auth: { getUser } } }));
vi.mock("./zapier-integration", () => ({ registerZapierRoutes: vi.fn() }));

describe("trip sharing routes", () => {
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
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("creates an unpredictable token for the owner and persists only its hash", async () => {
    storageMocks.rotateTripInviteForUser.mockImplementation(async (_tripId, _ownerId, tokenHash) => ({
      id: "invite-id", tripId: 12, ownerId: "user-a", tokenHash, createdAt: new Date(), revokedAt: null,
    }));

    const response = await fetch(`${baseUrl}/api/trips/12/invite`, {
      method: "POST",
      headers: { Authorization: "Bearer token-a" },
    });
    const body = await response.json() as { token: string };

    expect(response.status).toBe(201);
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(storageMocks.rotateTripInviteForUser).toHaveBeenCalledWith(
      12,
      "user-a",
      createHash("sha256").update(body.token).digest("hex"),
    );
    expect(storageMocks.rotateTripInviteForUser.mock.calls[0][2]).not.toBe(body.token);
  });

  it("uses the same neutral response for missing and non-owned trips", async () => {
    storageMocks.rotateTripInviteForUser.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/trips/12/invite`, {
      method: "POST",
      headers: { Authorization: "Bearer token-b" },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Trip not found" });
  });

  it("rotates an active link to a different raw token", async () => {
    storageMocks.rotateTripInviteForUser.mockImplementation(async (_tripId, _ownerId, tokenHash) => ({
      id: "invite-id", tripId: 12, ownerId: "user-a", tokenHash, createdAt: new Date(), revokedAt: null,
    }));
    const options = { method: "POST", headers: { Authorization: "Bearer token-a" } };
    const first = await (await fetch(`${baseUrl}/api/trips/12/invite`, options)).json() as { token: string };
    const second = await (await fetch(`${baseUrl}/api/trips/12/invite`, options)).json() as { token: string };
    expect(second.token).not.toBe(first.token);
  });

  it("reports only active state and revokes through the owner scope", async () => {
    storageMocks.getTripForUser.mockResolvedValue({ id: 12, userId: "user-a" });
    storageMocks.getActiveTripInviteForUser.mockResolvedValue({ id: "invite-id" });
    storageMocks.revokeTripInviteForUser.mockResolvedValue(true);

    const statusResponse = await fetch(`${baseUrl}/api/trips/12/invite`, {
      headers: { Authorization: "Bearer token-a" },
    });
    expect(await statusResponse.json()).toEqual({ active: true });

    const revokeResponse = await fetch(`${baseUrl}/api/trips/12/invite`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-a" },
    });
    expect(revokeResponse.status).toBe(204);
    expect(storageMocks.revokeTripInviteForUser).toHaveBeenCalledWith(12, "user-a");
  });

  it("does not reveal whether a non-owned trip exists on status or revoke", async () => {
    storageMocks.getTripForUser.mockResolvedValue(undefined);
    for (const method of ["GET", "DELETE"]) {
      const response = await fetch(`${baseUrl}/api/trips/12/invite`, {
        method,
        headers: { Authorization: "Bearer token-b" },
      });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: "Trip not found" });
    }
    expect(storageMocks.revokeTripInviteForUser).not.toHaveBeenCalled();
  });

  it("resolves an active token to the limited public DTO", async () => {
    const token = "A".repeat(43);
    storageMocks.getSharedTripByTokenHash.mockResolvedValue({
      destinations: ["Barcelona"], departureCity: "Roma",
      startDate: "2026-11-20", endDate: "2026-11-23", participants: 8,
      experienceType: "bachelor", activities: ["Kart"],
    });

    const response = await fetch(`${baseUrl}/api/shared-trips/${token}`);
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(storageMocks.getSharedTripByTokenHash).toHaveBeenCalledWith(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("name");
    expect(body).not.toHaveProperty("specialRequests");
    expect(body).not.toHaveProperty("budget");
  });

  it("returns the same neutral 404 for malformed, unknown, and revoked tokens", async () => {
    storageMocks.getSharedTripByTokenHash.mockResolvedValue(undefined);
    for (const token of ["invalid", "B".repeat(43), "C".repeat(43)]) {
      const response = await fetch(`${baseUrl}/api/shared-trips/${token}`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: "Shared trip not found" });
    }
  });
});
