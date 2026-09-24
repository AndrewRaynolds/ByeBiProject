import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { deleteTripForUser, getUser } = vi.hoisted(() => ({
  deleteTripForUser: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: { deleteTripForUser },
}));

vi.mock("./supabase", () => ({
  supabase: { auth: { getUser } },
}));

vi.mock("./zapier-integration", () => ({
  registerZapierRoutes: vi.fn(),
}));

describe("DELETE /api/trips/:tripId", () => {
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
    deleteTripForUser.mockReset();
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

  it("requires authentication", async () => {
    const response = await fetch(`${baseUrl}/api/trips/12`, { method: "DELETE" });

    expect(response.status).toBe(401);
    expect(deleteTripForUser).not.toHaveBeenCalled();
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
