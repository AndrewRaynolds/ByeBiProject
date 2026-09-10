import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock, queueNotificationMock, storageMock } = vi.hoisted(() => ({
  getOrderMock: vi.fn(),
  queueNotificationMock: vi.fn(),
  storageMock: {
    getMerchandiseOrderByPrintfulOrderId: vi.fn(),
    updateMerchandiseOrderFromPrintful: vi.fn(),
  },
}));

vi.mock("./services/printful", () => ({ getOrder: getOrderMock }));
vi.mock("./storage", () => ({ storage: storageMock }));
vi.mock("./services/transactionalEmail", () => ({
  queueMerchandiseNotification: queueNotificationMock,
}));

import {
  isValidPrintfulWebhookToken,
  processPrintfulWebhook,
} from "./printfulWebhookHandlers";

const payload = {
  type: "package_shipped",
  created: 1_700_000_000,
  retries: 0,
  store: 12,
  data: { order: { id: 42 } },
};

beforeEach(() => {
  vi.clearAllMocks();
  storageMock.getMerchandiseOrderByPrintfulOrderId.mockResolvedValue({
    id: "123e4567-e89b-42d3-a456-426614174000",
  });
  getOrderMock.mockResolvedValue({
    id: 42,
    status: "fulfilled",
    shipments: [{
      carrier: "DHL",
      tracking_number: "TRACK123",
      tracking_url: "https://example-carrier.test/TRACK123",
      shipped_at: 1_700_000_000,
    }],
  });
});

describe("Printful webhook processing", () => {
  it("uses a constant-length digest to validate the configured token", () => {
    const secret = "a-secure-printful-webhook-token-123456";
    expect(isValidPrintfulWebhookToken(secret, secret)).toBe(true);
    expect(isValidPrintfulWebhookToken("wrong", secret)).toBe(false);
    expect(isValidPrintfulWebhookToken(secret, "short")).toBe(false);
  });

  it("re-fetches the trusted Printful order before saving tracking", async () => {
    await processPrintfulWebhook(payload);

    expect(getOrderMock).toHaveBeenCalledWith(42);
    expect(storageMock.updateMerchandiseOrderFromPrintful).toHaveBeenCalledWith(
      "123e4567-e89b-42d3-a456-426614174000",
      expect.objectContaining({
        printfulStatus: "fulfilled",
        fulfillmentStatus: "shipped",
        trackingNumber: "TRACK123",
        trackingUrl: "https://example-carrier.test/TRACK123",
        shippingCarrier: "DHL",
        shippedAt: new Date(1_700_000_000 * 1000),
      }),
    );
    expect(queueNotificationMock).toHaveBeenCalledWith(
      "123e4567-e89b-42d3-a456-426614174000",
      "order_shipped",
    );
  });

  it("does not expose a non-HTTPS tracking link", async () => {
    getOrderMock.mockResolvedValue({
      id: 42,
      status: "fulfilled",
      shipments: [{ tracking_url: "http://unsafe.test/TRACK123" }],
    });

    await processPrintfulWebhook(payload);

    expect(storageMock.updateMerchandiseOrderFromPrintful).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ trackingUrl: null }),
    );
  });

  it("marks returned packages for manual follow-up", async () => {
    await processPrintfulWebhook({ ...payload, type: "package_returned" });

    expect(storageMock.updateMerchandiseOrderFromPrintful).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fulfillmentStatus: "returned",
        failureCode: "package_returned",
      }),
    );
    expect(queueNotificationMock).toHaveBeenCalledWith(
      expect.any(String),
      "order_attention",
    );
  });

  it("marks failed Printful orders for manual review", async () => {
    getOrderMock.mockResolvedValue({ id: 42, status: "failed", shipments: [] });

    await processPrintfulWebhook({ ...payload, type: "order_failed" });

    expect(storageMock.updateMerchandiseOrderFromPrintful).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fulfillmentStatus: "manual_review",
        failureCode: "printful_failed",
      }),
    );
    expect(queueNotificationMock).toHaveBeenCalledWith(
      expect.any(String),
      "order_attention",
    );
  });

  it("restores a released Printful order to submitted", async () => {
    getOrderMock.mockResolvedValue({ id: 42, status: "draft", shipments: [] });

    await processPrintfulWebhook({ ...payload, type: "order_remove_hold" });

    expect(storageMock.updateMerchandiseOrderFromPrintful).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fulfillmentStatus: "submitted",
        failureCode: null,
      }),
    );
    expect(queueNotificationMock).not.toHaveBeenCalled();
  });

  it("marks cancelled Printful orders as cancelled", async () => {
    getOrderMock.mockResolvedValue({ id: 42, status: "canceled", shipments: [] });

    await processPrintfulWebhook({ ...payload, type: "order_canceled" });

    expect(storageMock.updateMerchandiseOrderFromPrintful).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fulfillmentStatus: "cancelled",
        failureCode: null,
      }),
    );
    expect(queueNotificationMock).toHaveBeenCalledWith(
      expect.any(String),
      "order_attention",
    );
  });

  it("ignores orders that do not belong to ByeBi", async () => {
    storageMock.getMerchandiseOrderByPrintfulOrderId.mockResolvedValue(null);

    await processPrintfulWebhook(payload);

    expect(storageMock.updateMerchandiseOrderFromPrintful).not.toHaveBeenCalled();
    expect(queueNotificationMock).not.toHaveBeenCalled();
  });
});
