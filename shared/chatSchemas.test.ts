import { describe, expect, it } from "vitest";
import { chatStreamRequestSchema } from "./chatSchemas";

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

