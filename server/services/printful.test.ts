import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelOrder, createOrder, getShippingRates, PrintfulOrderNotCancellableError } from "./printful";

const originalApiKey = process.env.PRINTFUL_API_KEY;

beforeEach(() => {
  process.env.PRINTFUL_API_KEY = "printful-test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalApiKey === undefined) delete process.env.PRINTFUL_API_KEY;
  else process.env.PRINTFUL_API_KEY = originalApiKey;
});

describe("Printful shipping integration", () => {
  it("requests current rates in the checkout currency", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: [{
        id: "STANDARD",
        name: "Flat Rate",
        rate: "6.50",
        currency: "EUR",
        minDeliveryDays: 4,
        maxDeliveryDays: 7,
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const rates = await getShippingRates(
      "IT",
      [{ variant_id: 123, quantity: 2 }],
      "EUR",
    );

    expect(rates[0]).toMatchObject({ id: "STANDARD", rate: "6.50" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toEqual({
      recipient: { country_code: "IT" },
      items: [{ variant_id: 123, quantity: 2 }],
      currency: "EUR",
    });
  });

  it("uses the paid shipping method for the idempotent order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: { id: 42, status: "draft" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await createOrder(
      {
        name: "Buyer",
        address1: "Via Roma 1",
        city: "Roma",
        country_code: "IT",
        zip: "00100",
      },
      [{ sync_variant_id: 123, quantity: 1 }],
      true,
      "123e4567e89b42d3a456426614174000",
      "STANDARD",
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      "/orders?confirm=false&update_existing=true",
    );
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toMatchObject({
      external_id: "123e4567e89b42d3a456426614174000",
      shipping: "STANDARD",
    });
  });

  it("refuses to cancel an order already in production", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: { id: 42, status: "inprocess" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(cancelOrder(42)).rejects.toBeInstanceOf(
      PrintfulOrderNotCancellableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cancels a Printful draft before refunding the customer", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: { id: 42, status: "draft" },
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: { id: 42, status: "canceled" },
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(cancelOrder(42)).resolves.toMatchObject({ status: "canceled" });
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });
});
