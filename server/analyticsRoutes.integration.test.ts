import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getProductAnalyticsSummary, getUser, recordProductEvent } = vi.hoisted(() => ({
  getProductAnalyticsSummary: vi.fn(),
  getUser: vi.fn(),
  recordProductEvent: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: { getProductAnalyticsSummary, recordProductEvent },
}));

vi.mock("./supabase", () => ({
  supabase: { auth: { getUser } },
}));

vi.mock("./zapier-integration", () => ({ registerZapierRoutes: vi.fn() }));

describe("product analytics routes", () => {
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
    getProductAnalyticsSummary.mockReset();
    getUser.mockReset();
    recordProductEvent.mockReset();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it("accepts a strict anonymous product event", async () => {
    recordProductEvent.mockResolvedValue(undefined);
    const event = {
      sessionId: "123e4567-e89b-42d3-a456-426614174000",
      eventName: "checkout_viewed",
      brand: "byebro",
    };
    const response = await fetch(`${baseUrl}/api/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    expect(response.status).toBe(202);
    expect(recordProductEvent).toHaveBeenCalledWith(event);
  });

  it("rejects personal or arbitrary fields", async () => {
    const response = await fetch(`${baseUrl}/api/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "123e4567-e89b-42d3-a456-426614174000",
        eventName: "checkout_viewed",
        brand: "byebro",
        email: "traveler@example.com",
      }),
    });

    expect(response.status).toBe(400);
    expect(recordProductEvent).not.toHaveBeenCalled();
  });

  it("allows only admins to read a 7 or 30 day summary", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "admin", app_metadata: { role: "admin" } } },
      error: null,
    });
    getProductAnalyticsSummary.mockResolvedValue({ days: 7, funnel: [], providers: [] });

    const response = await fetch(`${baseUrl}/api/admin/product-analytics-summary?days=7`, {
      headers: { Authorization: "Bearer admin-token" },
    });

    expect(response.status).toBe(200);
    expect(getProductAnalyticsSummary).toHaveBeenCalledWith(expect.any(Date), 7);
  });
});
