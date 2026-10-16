import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlannerDraft } from "@shared/plannerSchemas";

const { createTripIfAbsent, stream } = vi.hoisted(() => ({ createTripIfAbsent: vi.fn(), stream: vi.fn() }));
vi.mock("./storage", () => ({ storage: { createTripIfAbsent } }));
vi.mock("./supabase", () => ({ supabase: { auth: { getUser: vi.fn() } } }));
vi.mock("./zapier-integration", () => ({ registerZapierRoutes: vi.fn() }));
vi.mock("./services/openai", () => ({ streamOpenAIChatCompletionWithTools: stream }));

describe("destination actions over the chat SSE endpoint", () => {
  let server: Awaited<ReturnType<typeof import("./routes").registerRoutes>>;
  let baseUrl: string;
  beforeAll(async () => {
    const app = express(); app.use(express.json());
    server = await (await import("./routes")).registerRoutes(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(() => { vi.stubEnv("OPENAI_API_KEY", ""); stream.mockReset(); createTripIfAbsent.mockClear(); });
  afterAll(async () => {
    vi.unstubAllEnvs();
    if (server?.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  const post = (body: unknown) => fetch(`${baseUrl}/api/chat/openai-stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const events = (body: string) => body.split("\n").filter(line => line.startsWith("data: ")).map(line => JSON.parse(line.slice(6)));

  it("offers ideas without OpenAI credentials, saving or model calls", async () => {
    const response = await post({ message: "Ispirami", locale: "it", planner: createPlannerDraft({ brand: "byebro", origin: "Roma" }), plannerAction: { type: "suggest_destinations", seenIds: [] } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const data = events(await response.text());
    expect(data.some(event => event.suggestions?.destinationIds.join() === "barcelona,budapest")).toBe(true);
    expect(data.some(event => event.tool_result)).toBe(false);
    expect(data.at(-1)).toEqual({ done: true });
    expect(stream).not.toHaveBeenCalled(); expect(createTripIfAbsent).not.toHaveBeenCalled();
  });

  it("returns a validated destination-only update for an explicit choice", async () => {
    const planner = createPlannerDraft({ brand: "byebride", origin: "Rome", participants: 6, budgetPerPerson: 650 });
    const response = await post({ message: "Elegir Lisboa", locale: "es", planner, plannerAction: { type: "choose_destination", destinationId: "lisbon" } });
    const data = events(await response.text());
    expect(data[0]).toMatchObject({ tool_result: { name: "update_planner", result: { planner: { destination: { canonical: "Lisbon" }, brand: "byebride", participants: 6, budgetPerPerson: 650, status: "draft" } } } });
    expect(data.some(event => event.suggestions?.destinationIds.length === 0)).toBe(true);
    expect(stream).not.toHaveBeenCalled(); expect(createTripIfAbsent).not.toHaveBeenCalled();
  });

  it.each(["rome", "unknown", "https://evil.example"])("rejects a same-origin or unsupported choice %s before streaming", async (destinationId) => {
    const response = await post({ message: "Scegli", planner: createPlannerDraft({ brand: "byebro", origin: "Roma" }), plannerAction: { type: "choose_destination", destinationId } });
    expect(response.status).toBe(400);
    expect(stream).not.toHaveBeenCalled();
  });

  it("preserves the existing unavailable response for ordinary chat without credentials", async () => {
    expect((await post({ message: "Ciao" })).status).toBe(503);
  });

  it("appends ideas after an ordinary validated chat response without selecting a destination", async () => {
    vi.stubEnv("OPENAI_API_KEY", "local-test-placeholder");
    const planner = createPlannerDraft({ brand: "byebro", origin: "Rome" });
    stream.mockImplementation(async function* () { yield { type: "tool_result", name: "update_planner", result: { planner } }; yield { type: "content", content: "Quale meta preferisci?" }; });
    const response = await post({ message: "Partiamo da Roma", planner });
    const data = events(await response.text());
    expect(data.some(event => event.suggestions?.destinationIds.length === 2)).toBe(true);
    expect(data[0].tool_result.result.planner.destination).toBeNull();
    expect(createTripIfAbsent).not.toHaveBeenCalled();
  });
});
