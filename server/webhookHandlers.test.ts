import { beforeEach, describe, expect, it, vi } from "vitest";

const { cancelOrderMock, createOrderMock, queueNotificationMock, refundMock, retrieveSessionMock, storageMock } = vi.hoisted(() => ({
  cancelOrderMock: vi.fn(),
  createOrderMock: vi.fn(),
  queueNotificationMock: vi.fn(),
  refundMock: vi.fn(),
  retrieveSessionMock: vi.fn(),
  storageMock: {
    hasProcessedStripeEvent: vi.fn(),
    markStripeEventProcessed: vi.fn(),
    getMerchandiseOrderByIdAndSession: vi.fn(),
    getMerchandiseOrderById: vi.fn(),
    claimMerchandiseOrderForFulfillment: vi.fn(),
    markMerchandiseOrderFailure: vi.fn(),
    markMerchandiseOrderSubmitted: vi.fn(),
    markMerchandiseOrderExpired: vi.fn(),
    markMerchandiseOrderRefunded: vi.fn(),
    setMerchandiseOrderCustomerEmail: vi.fn(),
  },
}));

vi.mock("./services/printful", () => ({
  cancelOrder: cancelOrderMock,
  createOrder: createOrderMock,
}));
vi.mock("./storage", () => ({ storage: storageMock }));
vi.mock("./services/transactionalEmail", () => ({
  queueMerchandiseNotification: queueNotificationMock,
}));
vi.mock("./stripeClient", () => ({
  getStripeSecretKey: vi.fn(),
  getStripeSync: vi.fn(),
  getUncachableStripeClient: vi.fn(async () => ({
    checkout: { sessions: { retrieve: retrieveSessionMock } },
    refunds: { create: refundMock },
  })),
}));

import { WebhookHandlers } from "./webhookHandlers";

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const order = {
  id: orderId,
  userId: "user-a",
  brand: "byebro",
  stripeSessionId: "cs_test_order",
  stripeEventId: null,
  paymentStatus: "pending",
  fulfillmentStatus: "pending_payment",
  amountTotal: 2500,
  currency: "EUR",
  shippingCountry: "IT",
  shippingMethod: "STANDARD",
  shippingAmount: 500,
  items: [{
    productId: 1,
    variantId: 22,
    productName: "T-shirt",
    variantName: "Black / M",
    quantity: 1,
    unitAmount: 2500,
  }],
  printfulOrderId: null,
  printfulStatus: null,
  stripeRefundId: null,
  failureCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function checkoutEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_order",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_order",
        payment_status: "paid",
        amount_total: 2500,
        currency: "eur",
        client_reference_id: orderId,
        metadata: { byebi_order_id: orderId },
        customer_details: { email: "buyer@example.com", phone: null },
        payment_intent: "pi_order",
        collected_information: {
          shipping_details: {
            name: "Buyer",
            address: {
              line1: "Via Roma 1",
              city: "Roma",
              country: "IT",
              postal_code: "00100",
              state: "RM",
            },
          },
        },
        ...overrides,
      },
    },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  storageMock.hasProcessedStripeEvent.mockResolvedValue(false);
  storageMock.getMerchandiseOrderByIdAndSession.mockResolvedValue(order);
  storageMock.getMerchandiseOrderById.mockResolvedValue(order);
  storageMock.claimMerchandiseOrderForFulfillment.mockResolvedValue({
    ...order,
    paymentStatus: "paid",
    fulfillmentStatus: "processing",
  });
  createOrderMock.mockResolvedValue({ id: 42, status: "draft" });
  cancelOrderMock.mockResolvedValue({ id: 42, status: "canceled" });
  refundMock.mockResolvedValue({ id: "re_order" });
  retrieveSessionMock.mockResolvedValue(checkoutEvent().data.object);
});

describe("merchandise Stripe webhook", () => {
  it("submits only the server-stored items to Printful", async () => {
    await WebhookHandlers.processStripeEvent(checkoutEvent());

    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Buyer", country_code: "IT" }),
      [{ sync_variant_id: 22, quantity: 1 }],
      true,
      "123e4567e89b42d3a456426614174000",
      "STANDARD",
    );
    expect(storageMock.markMerchandiseOrderSubmitted)
      .toHaveBeenCalledWith(orderId, "42", "draft");
    expect(storageMock.markStripeEventProcessed)
      .toHaveBeenCalledWith("evt_order", "cs_test_order");
    expect(storageMock.setMerchandiseOrderCustomerEmail)
      .toHaveBeenCalledWith(orderId, "buyer@example.com");
    expect(queueNotificationMock).toHaveBeenCalledWith(orderId, "payment_confirmed");
    expect(queueNotificationMock).toHaveBeenCalledWith(orderId, "order_submitted");
  });

  it("sends mismatched payments to manual review", async () => {
    await WebhookHandlers.processStripeEvent(checkoutEvent({ amount_total: 1 }));

    expect(storageMock.markMerchandiseOrderFailure)
      .toHaveBeenCalledWith(orderId, "payment_mismatch", true);
    expect(createOrderMock).not.toHaveBeenCalled();
    expect(storageMock.markStripeEventProcessed).toHaveBeenCalled();
  });

  it("records a retryable failure when Printful submission fails", async () => {
    createOrderMock.mockRejectedValue(new Error("Printful unavailable"));

    await expect(WebhookHandlers.processStripeEvent(checkoutEvent()))
      .rejects.toThrow("Printful unavailable");
    expect(storageMock.markMerchandiseOrderFailure)
      .toHaveBeenCalledWith(orderId, "printful_submission_failed");
    expect(storageMock.markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("revalidates Stripe before an admin retry", async () => {
    storageMock.getMerchandiseOrderById.mockResolvedValue({
      ...order,
      paymentStatus: "paid",
      fulfillmentStatus: "fulfillment_failed",
    });

    await WebhookHandlers.retryMerchandiseOrder(orderId);

    expect(retrieveSessionMock).toHaveBeenCalledWith("cs_test_order");
    expect(createOrderMock).toHaveBeenCalledTimes(1);
    expect(storageMock.markMerchandiseOrderSubmitted)
      .toHaveBeenCalledWith(orderId, "42", "draft");
  });

  it("refuses to retry an order requiring manual review", async () => {
    storageMock.getMerchandiseOrderById.mockResolvedValue({
      ...order,
      paymentStatus: "paid",
      fulfillmentStatus: "manual_review",
    });

    await expect(WebhookHandlers.retryMerchandiseOrder(orderId))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(retrieveSessionMock).not.toHaveBeenCalled();
  });

  it("closes an expired unpaid checkout", async () => {
    const event = checkoutEvent();
    event.type = "checkout.session.expired";

    await WebhookHandlers.processStripeEvent(event);

    expect(storageMock.markMerchandiseOrderExpired)
      .toHaveBeenCalledWith(orderId, "cs_test_order");
    expect(storageMock.markStripeEventProcessed)
      .toHaveBeenCalledWith("evt_order", "cs_test_order");
  });

  it("cancels Printful before issuing an idempotent Stripe refund", async () => {
    storageMock.getMerchandiseOrderById.mockResolvedValue({
      ...order,
      paymentStatus: "paid",
      fulfillmentStatus: "submitted",
      printfulOrderId: "42",
      printfulStatus: "draft",
    });

    await WebhookHandlers.refundMerchandiseOrder(orderId);

    expect(cancelOrderMock).toHaveBeenCalledWith(42);
    expect(refundMock).toHaveBeenCalledWith(
      { payment_intent: "pi_order" },
      { idempotencyKey: `byebi-refund-${orderId}` },
    );
    expect(storageMock.markMerchandiseOrderRefunded)
      .toHaveBeenCalledWith(orderId, "re_order", true);
    expect(queueNotificationMock).toHaveBeenCalledWith(orderId, "order_refunded");
    expect(cancelOrderMock.mock.invocationCallOrder[0])
      .toBeLessThan(refundMock.mock.invocationCallOrder[0]);
  });

  it("finishes a refund after Printful already reported the order as cancelled", async () => {
    storageMock.getMerchandiseOrderById.mockResolvedValue({
      ...order,
      paymentStatus: "paid",
      fulfillmentStatus: "cancelled",
      printfulOrderId: "42",
      printfulStatus: "canceled",
    });

    await WebhookHandlers.refundMerchandiseOrder(orderId);

    expect(cancelOrderMock).toHaveBeenCalledWith(42);
    expect(refundMock).toHaveBeenCalledWith(
      { payment_intent: "pi_order" },
      { idempotencyKey: `byebi-refund-${orderId}` },
    );
    expect(storageMock.markMerchandiseOrderRefunded)
      .toHaveBeenCalledWith(orderId, "re_order", true);
  });

  it("does not refund a cancelled order that Printful has not confirmed as cancelled", async () => {
    storageMock.getMerchandiseOrderById.mockResolvedValue({
      ...order,
      paymentStatus: "paid",
      fulfillmentStatus: "cancelled",
      printfulOrderId: "42",
      printfulStatus: "pending",
    });

    await expect(WebhookHandlers.refundMerchandiseOrder(orderId))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(cancelOrderMock).not.toHaveBeenCalled();
    expect(refundMock).not.toHaveBeenCalled();
  });
});
