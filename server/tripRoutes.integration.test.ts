import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { createTripIfAbsent, deleteTripForUser, getTripForUser, getUser } = vi.hoisted(() => ({
  createTripIfAbsent: vi.fn(),
  deleteTripForUser: vi.fn(),
  getTripForUser: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: { createTripIfAbsent, deleteTripForUser, getTripForUser },
}));

vi.mock("./supabase", () => ({
  supabase: { auth: { getUser } },
}));

vi.mock("./zapier-integration", () => ({
  registerZapierRoutes: vi.fn(),
}));

describe("owner-scoped /api/trips/:tripId routes", () => {
  let baseUrl = "";
  let server: Awaited<ReturnType<typeof import("./routes").registerRoutes>>;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const { registerRoutes } = await import("./routes");
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    createTripIfAbsent.mockReset();
    deleteTripForUser.mockReset();
    getTripForUser.mockReset();
    getUser.mockReset();
    getUser.mockImplementation(async (token: string) => ({
      data: { user: token === "token-a" ? { id: "user-a" } : null },
      error: token === "token-a" ? null : new Error("invalid token"),
    }));
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it("requires authentication before creating a saved trip", async () => {
    const response = await fetch(`${baseUrl}/api/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ByeBro · Barcelona",
        participants: 6,
        startDate: "2027-06-10",
        endDate: "2027-06-13",
        departureCity: "Rome",
        destinations: ["Barcelona"],
        experienceType: "bachelor",
        budget: 700,
        activities: ["nightlife"],
        specialRequests: null,
        includeMerch: false,
      }),
    });

    expect(response.status).toBe(401);
    expect(createTripIfAbsent).not.toHaveBeenCalled();
  });

  it("creates an explicitly saved trip for the authenticated user", async () => {
    const payload = {
      userId: "client-supplied-user",
      name: "ByeBro · Barcelona",
      participants: 6,
      startDate: "2027-06-10",
      endDate: "2027-06-13",
      departureCity: "Rome",
      destinations: ["Barcelona"],
      experienceType: "bachelor",
      budget: 700,
      activities: ["nightlife"],
      specialRequests: null,
      includeMerch: false,
    };
    createTripIfAbsent.mockResolvedValue({
      trip: { id: 21, ...payload, userId: "user-a" },
      created: true,
    });

    const response = await fetch(`${baseUrl}/api/trips`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    expect(createTripIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({ ...payload, userId: "user-a" }),
    );
  });

  it("returns the existing trip instead of creating a duplicate", async () => {
    const payload = {
      name: "ByeBro · Barcelona",
      participants: 6,
      startDate: "2027-06-10",
      endDate: "2027-06-13",
      departureCity: "Rome",
      destinations: ["Barcelona"],
      experienceType: "bachelor",
      budget: 700,
      activities: ["nightlife"],
      specialRequests: null,
      includeMerch: false,
    };
    createTripIfAbsent.mockResolvedValue({
      trip: { id: 21, ...payload, userId: "user-a" },
      created: false,
    });

    const response = await fetch(`${baseUrl}/api/trips`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    expect(createTripIfAbsent).toHaveBeenCalledTimes(1);
  });

  it("requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/trips/12`, { method: "DELETE" });

    expect(response.status).toBe(401);
    expect(deleteTripForUser).not.toHaveBeenCalled();
  });

  it("loads a trip only through the authenticated owner scope", async () => {
    getTripForUser.mockResolvedValue({ id: 12, userId: "user-a", name: "Barcelona" });

    const response = await fetch(`${baseUrl}/api/trips/12`, {
      headers: { Authorization: "Bearer token-a" },
    });

    expect(response.status).toBe(200);
    expect(getTripForUser).toHaveBeenCalledWith(12, "user-a");
    expect(await response.json()).toMatchObject({ id: 12, name: "Barcelona" });
  });

  it("does not distinguish a missing trip from a non-owned trip", async () => {
    getTripForUser.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/trips/12`, {
      headers: { Authorization: "Bearer token-a" },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Trip not found" });
  });

  it("rejects malformed trip IDs on the read path", async () => {
    const response = await fetch(`${baseUrl}/api/trips/nope`, {
      headers: { Authorization: "Bearer token-a" },
    });

    expect(response.status).toBe(400);
    expect(getTripForUser).not.toHaveBeenCalled();
  });

  it("deletes a trip only through the authenticated owner scope", async () => {
    deleteTripForUser.mockResolvedValue(true);

    const response = await fetch(`${baseUrl}/api/trips/12`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-a" },
    });

    expect(response.status).toBe(204);
    expect(deleteTripForUser).toHaveBeenCalledWith(12, "user-a");
  });

  it("returns the same not-found response for missing and non-owned trips", async () => {
    deleteTripForUser.mockResolvedValue(false);

    const response = await fetch(`${baseUrl}/api/trips/12`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-a" },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Trip not found" });
  });

  it("rejects malformed trip IDs without querying storage", async () => {
    const response = await fetch(`${baseUrl}/api/trips/not-a-number`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-a" },
    });

    expect(response.status).toBe(400);
    expect(deleteTripForUser).not.toHaveBeenCalled();
  });
});
