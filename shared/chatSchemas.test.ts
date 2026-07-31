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

  it("accepts a validated flight context", () => {
    expect(chatStreamRequestSchema.safeParse({
      ...validRequest,
      flights: [{
        airline: "Vueling",
        departure_at: "2026-08-10T10:00:00",
        return_at: "2026-08-13T18:00:00",
        flight_number: 6101,
        checkoutUrl: "https://www.aviasales.com/search/example",
      }],
    }).success).toBe(true);
  });

  it.each([
    { message: "" },
    { message: "x".repeat(2_001) },
    { partyType: "other" },
    { extra: "unexpected" },
    { conversationHistory: Array.from({ length: 21 }, () => ({ role: "user", content: "hi" })) },
    { flights: [{ airline: "Airline", checkoutUrl: "javascript:alert(1)" }] },
    { tripDetails: { ...validRequest.tripDetails, people: 51 } },
  ])("rejects unsafe or oversized chat input", (override) => {
    expect(chatStreamRequestSchema.safeParse({ ...validRequest, ...override }).success).toBe(false);
  });
});

