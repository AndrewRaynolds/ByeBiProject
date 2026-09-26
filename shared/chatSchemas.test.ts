import { describe, expect, it } from "vitest";
import { chatStreamRequestSchema } from "./chatSchemas";
import { createPlannerDraft } from "./plannerSchemas";

const validRequest = {
  message: "Organizza un viaggio a Barcellona",
  selectedDestination: "Barcelona",
  tripDetails: {
    people: 4,
    days: 3,
    startDate: "2026-08-10",
    endDate: "2026-08-13",
    adventureType: "nightlife",
    interests: ["food", "music"],
    budget: "medio",
  },
  conversationHistory: [
    { role: "user", content: "Ciao" },
    { role: "assistant", content: "Ciao!" },
  ],
  partyType: "bachelor",
  originCity: "Roma",
};

describe("chatStreamRequestSchema", () => {
  it("accepts the current streaming payload", () => {
    expect(chatStreamRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("accepts the shared planner contract and rejects an unknown planner version", () => {
    const planner = createPlannerDraft({ brand: "byebro", destination: "Ibiza" });
    expect(chatStreamRequestSchema.safeParse({ message: "continua", planner }).success).toBe(true);
    expect(chatStreamRequestSchema.safeParse({ message: "continua", planner: { ...planner, version: 2 } }).success).toBe(false);
  });

  it("rejects a duplicated party type that conflicts with the authoritative planner", () => {
    const planner = createPlannerDraft({ brand: "byebride" });
    expect(chatStreamRequestSchema.safeParse({ message: "continua", planner }).success).toBe(true);
    expect(chatStreamRequestSchema.safeParse({
      message: "continua", planner, partyType: "bachelor",
    }).success).toBe(false);
    expect(chatStreamRequestSchema.safeParse({
      message: "continua", planner, partyType: "bachelorette",
    }).success).toBe(true);
  });


  it.each([
    { message: "" },
    { message: "x".repeat(2_001) },
    { partyType: "other" },
    { extra: "unexpected" },
    { conversationHistory: Array.from({ length: 21 }, () => ({ role: "user", content: "hi" })) },
    { flights: [] },
    { tripDetails: { ...validRequest.tripDetails, people: 51 } },
  ])("rejects unsafe or oversized chat input", (override) => {
    expect(chatStreamRequestSchema.safeParse({ ...validRequest, ...override }).success).toBe(false);
  });
});
