import { z } from "zod";
import { createHash, timingSafeEqual } from "crypto";
import { getOrder } from "./services/printful";
import { storage } from "./storage";
import { queueMerchandiseNotification } from "./services/transactionalEmail";

const relevantEventTypes = [
  "package_shipped",
  "package_returned",
  "order_updated",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_remove_hold",
] as const;

const printfulWebhookSchema = z.object({
  type: z.enum(relevantEventTypes),
  created: z.number().int().positive(),
  retries: z.number().int().nonnegative(),
  store: z.number().int().positive(),
  data: z.object({
    order: z.object({ id: z.number().int().positive() }).passthrough(),
  }).passthrough(),
}).passthrough();

export function isValidPrintfulWebhookToken(
  candidate: unknown,
  expected = process.env.PRINTFUL_WEBHOOK_SECRET,
): boolean {
  if (typeof candidate !== "string" || !expected || expected.length < 32) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}

function safeTrackingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function mapFulfillmentStatus(printfulStatus: string, eventType: string) {
  if (eventType === "package_returned") {
    return { fulfillmentStatus: "returned", failureCode: "package_returned" };
  }
  if (["fulfilled", "partial"].includes(printfulStatus)) {
    return { fulfillmentStatus: "shipped", failureCode: null };
  }
  if (printfulStatus === "canceled") {
    return { fulfillmentStatus: "cancelled", failureCode: null };
  }
  if (["failed", "onhold"].includes(printfulStatus)) {
    return {
      fulfillmentStatus: "manual_review",
      failureCode: `printful_${printfulStatus}`,
    };
  }
  return { fulfillmentStatus: "submitted", failureCode: null };
}

export async function processPrintfulWebhook(payload: unknown): Promise<void> {
  const event = printfulWebhookSchema.parse(payload);
  const printfulOrder = await getOrder(event.data.order.id);
  const order = await storage.getMerchandiseOrderByPrintfulOrderId(
    String(printfulOrder.id),
  );
  if (!order) return;

  const shipment = printfulOrder.shipments
    ?.slice()
    .sort((left, right) =>
      (right.shipped_at || right.created || 0) -
      (left.shipped_at || left.created || 0),
    )[0];
  const mapped = mapFulfillmentStatus(printfulOrder.status, event.type);

  await storage.updateMerchandiseOrderFromPrintful(order.id, {
    printfulStatus: printfulOrder.status,
    fulfillmentStatus: mapped.fulfillmentStatus,
    failureCode: mapped.failureCode,
    trackingNumber: shipment?.tracking_number == null
      ? null
      : String(shipment.tracking_number).slice(0, 200),
    trackingUrl: safeTrackingUrl(shipment?.tracking_url),
    shippingCarrier: shipment?.carrier?.slice(0, 100) || null,
    shippedAt: shipment?.shipped_at
      ? new Date(shipment.shipped_at * 1000)
      : null,
  });

  if (mapped.fulfillmentStatus === "shipped") {
    await queueMerchandiseNotification(order.id, "order_shipped");
  } else if (["manual_review", "returned", "cancelled"].includes(mapped.fulfillmentStatus)) {
    await queueMerchandiseNotification(order.id, "order_attention");
  }
}
