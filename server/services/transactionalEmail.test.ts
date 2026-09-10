import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { storageMock } = vi.hoisted(() => ({
  storageMock: {
    getMerchandiseOrderById: vi.fn(),
    enqueueMerchandiseNotification: vi.fn(),
    getRetryableMerchandiseNotifications: vi.fn(),
    claimMerchandiseNotification: vi.fn(),
    completeMerchandiseNotification: vi.fn(),
  },
}));

vi.mock("../storage", () => ({ storage: storageMock }));

import {
  buildMerchandiseEmail,
  drainMerchandiseNotifications,
  queueMerchandiseNotification,
} from "./transactionalEmail";

const order = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  userId: null,
  customerEmail: "buyer@example.com",
  brand: "byebro",
  stripeSessionId: "cs_test_order",
  stripeEventId: "evt_order",
  paymentStatus: "paid",
  fulfillmentStatus: "submitted",
  amountTotal: 3000,
  currency: "EUR",
  shippingCountry: "IT",
  shippingMethod: "STANDARD",
  shippingAmount: 500,
  items: [{
    productId: 1,
    variantId: 2,
    productName: "T-shirt <special>",
    variantName: "Black / M",
    quantity: 1,
    unitAmount: 2500,
  }],
  printfulOrderId: "42",
  printfulStatus: "draft",
  stripeRefundId: null,
  trackingNumber: null,
  trackingUrl: null,
  shippingCarrier: null,
  shippedAt: null,
  legalVersion: "2026-08-04",
  termsAcceptedAt: new Date(),
  failureCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TRANSACTIONAL_EMAIL_MODE = "test";
  process.env.RESEND_API_KEY = "re_test";
  process.env.TRANSACTIONAL_EMAIL_FROM = "ByeBi <orders@updates.example.com>";
  process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT = "safe-test@example.com";
  process.env.APP_BASE_URL = "https://byebi.it";
  storageMock.getMerchandiseOrderById.mockResolvedValue(order);
  storageMock.claimMerchandiseNotification.mockResolvedValue(true);
  storageMock.getRetryableMerchandiseNotifications.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TRANSACTIONAL_EMAIL_MODE;
  delete process.env.RESEND_API_KEY;
  delete process.env.TRANSACTIONAL_EMAIL_FROM;
  delete process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT;
});

describe("transactional merchandise email", () => {
  it("builds escaped order content without exposing internal failure details", () => {
    const email = buildMerchandiseEmail(order as any, "order_submitted");

    expect(email.subject).toContain("123E4567");
    expect(email.text).toContain("30,00 €");
    expect(email.html).toContain("T-shirt &lt;special&gt;");
    expect(email.html).not.toContain("failureCode");
  });

  it("does not queue messages while delivery is disabled", async () => {
    process.env.TRANSACTIONAL_EMAIL_MODE = "disabled";

    await queueMerchandiseNotification(order.id, "payment_confirmed");

    expect(storageMock.enqueueMerchandiseNotification).not.toHaveBeenCalled();
  });

  it("redirects test messages and records the provider result", async () => {
    storageMock.getRetryableMerchandiseNotifications.mockResolvedValue([{
      id: "notification-1",
      orderId: order.id,
      type: "payment_confirmed",
      status: "pending",
      attempts: 0,
      providerMessageId: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: "email_123" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await drainMerchandiseNotifications();

    const request = fetchMock.mock.calls[0];
    const payload = JSON.parse(request[1].body);
    expect(payload.to).toEqual(["safe-test@example.com"]);
    expect(payload.subject).toContain("[TEST per buyer@example.com]");
    expect(request[1].headers["Idempotency-Key"])
      .toBe(`byebi/payment_confirmed/${order.id}`);
    expect(storageMock.completeMerchandiseNotification).toHaveBeenCalledWith(
      "notification-1",
      { status: "sent", providerMessageId: "email_123" },
    );
  });

  it("keeps failed sends retryable without throwing into the order webhook", async () => {
    storageMock.getRetryableMerchandiseNotifications.mockResolvedValue([{
      id: "notification-1",
      orderId: order.id,
      type: "order_shipped",
      status: "pending",
      attempts: 0,
      providerMessageId: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(drainMerchandiseNotifications()).resolves.toBeUndefined();

    expect(storageMock.completeMerchandiseNotification).toHaveBeenCalledWith(
      "notification-1",
      expect.objectContaining({ status: "failed" }),
    );
  });
});
