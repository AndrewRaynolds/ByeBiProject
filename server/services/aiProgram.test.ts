import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyTripPlanning } from "@shared/tripPlanningSchemas";
import type { Trip } from "@shared/schema";
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({ default: class { chat = { completions: { create } }; } }));
import { proposeAiProgram } from "./aiProgram";
const trip = { destinations: ["Lisbon"], startDate: "2099-10-10", endDate: "2099-10-13", participants: 12, budget: 500, name: "Private name", userId: "private-user", specialRequests: "relax" } as Trip;
const proposal = { version: 1, items: [{ catalogId: "free_time", date: trip.startDate, slot: "morning" }] };
beforeEach(() => { create.mockReset(); create.mockResolvedValue({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(proposal) } }] }); });
describe("AI program adapter", () => {
  it("requests constrained ideas, excludes identity and budget, forwards cancellation", async () => {
    const signal = new AbortController().signal;
    expect(await proposeAiProgram(trip, emptyTripPlanning(trip), signal)).toEqual(proposal);
    expect(create.mock.calls[0][1]).toEqual({ signal });
    const payload = create.mock.calls[0][0].messages[1].content;
    expect(JSON.parse(payload)).toMatchObject({ participants: 12 });
    expect(payload).not.toContain("private-user"); expect(payload).not.toContain("Private name"); expect(payload).not.toContain("500");
  });
  it.each(["refusal", "truncated", "invalid", "conflict", "provider failure"])("rejects %s without a substitute proposal", async kind => {
    const plan = emptyTripPlanning(trip);
    if (kind === "refusal") create.mockResolvedValue({ choices: [{ finish_reason: "stop", message: { content: null, refusal: "refused" } }] });
    if (kind === "truncated") create.mockResolvedValue({ choices: [{ finish_reason: "length", message: { content: JSON.stringify(proposal) } }] });
    if (kind === "invalid") create.mockResolvedValue({ choices: [{ finish_reason: "stop", message: { content: '{"version":1,"items":[]}' } }] });
    if (kind === "provider failure") create.mockRejectedValue(new Error("secret"));
    if (kind === "conflict") plan.plannedItems = [{ id: "existing", ideaId: null, title: "My walk", date: trip.startDate, slot: "morning", durationMinutes: null, provenance: { kind: "user" }, feasibility: "not_checked", userEdited: true }];
    await expect(proposeAiProgram(trip, plan)).rejects.toThrow();
  });
});
