import { describe, expect, it } from "vitest";
import { createChatCheckoutContext } from "./chatCheckout";

const validArguments = {
  origin: "Roma",
  destination: "Barcellona",
  departure_date: "2026-09-15",
  return_date: "2026-09-18",
  passengers: 6,
};

const validResult = {
  checkoutReady: true,
  checkoutUrl:
    "https://www.aviasales.com/search/ROM1509BCN18096?marker=685469",
};

describe("createChatCheckoutContext", () => {
  it("uses the checkout URL verified by the server", () => {
    expect(createChatCheckoutContext(validArguments, validResult)).toEqual({
      origin: "Roma",
      originCity: "Roma",
      destination: "Barcellona",
      startDate: "2026-09-15",
      endDate: "2026-09-18",
      people: 6,
      aviasalesCheckoutUrl: validResult.checkoutUrl,
      flightLabel: "Roma → Barcellona",
    });
  });

  it.each([
    [{ ...validArguments, passengers: 0 }, validResult],
    [{ ...validArguments, return_date: "2026-09-14" }, validResult],
    [validArguments, { error: "Unsupported destination" }],
    [validArguments, { ...validResult, checkoutUrl: "javascript:alert(1)" }],
  ])("rejects incomplete or unsafe checkout data", (args, result) => {
    expect(createChatCheckoutContext(args, result)).toBeNull();
  });
});
