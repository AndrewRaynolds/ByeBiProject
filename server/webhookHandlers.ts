import Stripe from "stripe";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getStripeSecretKey, getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { cancelOrder, createOrder } from "./services/printful";
import { storage } from "./storage";
import { queueMerchandiseNotification } from "./services/transactionalEmail";

const orderIdSchema = z.string().uuid();

type ShippingDetailsLike = {
  name?: string | null;
  address?: {
    line1?: string | null;
    city?: string | null;
    country?: string | null;
    postal_code?: string | null;
    state?: string | null;
  } | null;
};

export class MerchandiseOrderRetryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "MerchandiseOrderRetryError";
  }
}

export class WebhookHandlers {
  private static processingEventIds = new Set<string>();

  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Received type: " + typeof payload + ". " +
        "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(await getStripeSecretKey(), {
        apiVersion: "2025-08-27.basil" as any,
      });
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
      await this.processStripeEvent(event);
      return;
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  static async processStripeEvent(event: Stripe.Event): Promise<void> {
    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.expired") return;
    if (
      await storage.hasProcessedStripeEvent(event.id) ||
      this.processingEventIds.has(event.id)
    ) return;

    this.processingEventIds.add(event.id);
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      if (event.type === "checkout.session.expired") {
        const orderId = orderIdSchema.parse(
          session.client_reference_id || session.metadata?.byebi_order_id,
        );
        await storage.markMerchandiseOrderExpired(orderId, session.id);
        await storage.markStripeEventProcessed(event.id, session.id);
        return;
      }
      if (session.payment_status !== "paid") return;

      await this.processPaidCheckoutSession(session, event.id);
    } finally {
      this.processingEventIds.delete(event.id);
    }
  }

  static async retryMerchandiseOrder(orderId: string): Promise<void> {
    const parsedOrderId = orderIdSchema.safeParse(orderId);
    if (!parsedOrderId.success) {
      throw new MerchandiseOrderRetryError("Invalid merchandise order ID", 400);
    }
    const order = await storage.getMerchandiseOrderById(parsedOrderId.data);
    if (!order) throw new MerchandiseOrderRetryError("Merchandise order not found", 404);
    if (order.fulfillmentStatus !== "fulfillment_failed") {
      throw new MerchandiseOrderRetryError("Only failed fulfillment orders can be retried", 409);
    }
    if (!order.stripeSessionId || order.paymentStatus !== "paid") {
      throw new MerchandiseOrderRetryError("The order does not have a verified payment", 409);
    }

    const processingKey = `order_${order.id}`;
    if (this.processingEventIds.has(processingKey)) {
      throw new MerchandiseOrderRetryError("The order retry is already processing", 409);
    }
    const retryId = `manual_${randomUUID().replaceAll("-", "")}`;
    this.processingEventIds.add(processingKey);
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      await this.processPaidCheckoutSession(session, retryId);
    } finally {
      this.processingEventIds.delete(processingKey);
    }
  }

  static async refundMerchandiseOrder(orderId: string): Promise<void> {
    const parsedOrderId = orderIdSchema.safeParse(orderId);
    if (!parsedOrderId.success) {
      throw new MerchandiseOrderRetryError("Invalid merchandise order ID", 400);
    }
    const order = await storage.getMerchandiseOrderById(parsedOrderId.data);
    if (!order) throw new MerchandiseOrderRetryError("Merchandise order not found", 404);
    if (
      order.paymentStatus !== "paid" ||
      order.fulfillmentStatus !== "submitted" ||
      !order.printfulOrderId ||
      !order.stripeSessionId
    ) {
      throw new MerchandiseOrderRetryError("This order is not eligible for an automatic refund", 409);
    }
    const printfulOrderId = Number(order.printfulOrderId);
    if (!Number.isSafeInteger(printfulOrderId) || printfulOrderId <= 0) {
      throw new MerchandiseOrderRetryError("Invalid Printful order reference", 409);
    }

    const processingKey = `refund_${order.id}`;
    if (this.processingEventIds.has(processingKey)) {
      throw new MerchandiseOrderRetryError("The refund is already processing", 409);
    }
    this.processingEventIds.add(processingKey);
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
      if (!paymentIntentId || session.payment_status !== "paid") {
        throw new MerchandiseOrderRetryError("The Stripe payment cannot be refunded", 409);
      }

      await cancelOrder(printfulOrderId);
      const refund = await stripe.refunds.create(
        { payment_intent: paymentIntentId },
        { idempotencyKey: `byebi-refund-${order.id}` },
      );
      await storage.markMerchandiseOrderRefunded(order.id, refund.id, true);
      await queueMerchandiseNotification(order.id, "order_refunded");
    } finally {
      this.processingEventIds.delete(processingKey);
    }
  }

  private static async processPaidCheckoutSession(
    session: Stripe.Checkout.Session,
    eventId: string,
  ): Promise<void> {
    if (session.payment_status !== "paid") {
      throw new MerchandiseOrderRetryError("Stripe payment is not complete", 409);
    }

    const parsedOrderId = orderIdSchema.safeParse(
        session.client_reference_id || session.metadata?.byebi_order_id,
    );
    if (!parsedOrderId.success) {
      throw new Error("Stripe checkout completed without a valid ByeBi order ID");
    }

      const order = await storage.getMerchandiseOrderByIdAndSession(
        parsedOrderId.data,
        session.id,
      );
      if (!order) {
        throw new Error("Stripe checkout does not match a merchandise order");
      }

      const verifiedEmail = z.string().trim().email().max(320)
        .safeParse(session.customer_details?.email);
      if (verifiedEmail.success) {
        await storage.setMerchandiseOrderCustomerEmail(order.id, verifiedEmail.data);
      }

      if (
        session.amount_total !== order.amountTotal ||
        session.currency?.toUpperCase() !== order.currency
      ) {
        await storage.markMerchandiseOrderFailure(order.id, "payment_mismatch", true);
        await queueMerchandiseNotification(order.id, "order_attention");
        await storage.markStripeEventProcessed(eventId, session.id);
        return;
      }

      const sessionWithShipping = session as Stripe.Checkout.Session & {
        shipping_details?: ShippingDetailsLike;
        collected_information?: { shipping_details?: ShippingDetailsLike };
      };
      const shipping =
        sessionWithShipping.collected_information?.shipping_details ||
        sessionWithShipping.shipping_details;
      const address = shipping?.address;
      if (
        !shipping?.name || !address?.line1 || !address.city ||
        !address.country || !address.postal_code
      ) {
        await storage.markMerchandiseOrderFailure(order.id, "shipping_address_missing", true);
        await queueMerchandiseNotification(order.id, "order_attention");
        await storage.markStripeEventProcessed(eventId, session.id);
        return;
      }
      if (address.country.toUpperCase() !== order.shippingCountry) {
        await storage.markMerchandiseOrderFailure(order.id, "shipping_country_mismatch", true);
        await queueMerchandiseNotification(order.id, "order_attention");
        await storage.markStripeEventProcessed(eventId, session.id);
        return;
      }

      const claimed = await storage.claimMerchandiseOrderForFulfillment(
        order.id,
        session.id,
        eventId,
        new Date(Date.now() - 5 * 60_000),
      );
      if (!claimed) {
        const current = await storage.getMerchandiseOrderById(order.id);
        if (current?.fulfillmentStatus === "submitted" || current?.fulfillmentStatus === "manual_review") {
          await storage.markStripeEventProcessed(eventId, session.id);
        }
        return;
      }

      try {
        await queueMerchandiseNotification(order.id, "payment_confirmed");
        const confirmOrder = process.env.PRINTFUL_CONFIRM_ORDERS === "true";
        const printfulOrder = await createOrder(
          {
            name: shipping.name,
            address1: address.line1,
            city: address.city,
            state_code: address.state || undefined,
            country_code: address.country,
            zip: address.postal_code,
            email: session.customer_details?.email || undefined,
            phone: session.customer_details?.phone || undefined,
          },
          claimed.items.map((item) => ({
            sync_variant_id: item.variantId,
            quantity: item.quantity,
          })),
          !confirmOrder,
          order.id.replaceAll("-", ""),
          claimed.shippingMethod,
        );
        await storage.markMerchandiseOrderSubmitted(
          order.id,
          String(printfulOrder.id),
          printfulOrder.status,
        );
        await queueMerchandiseNotification(order.id, "order_submitted");
        await storage.markStripeEventProcessed(eventId, session.id);
      } catch (error) {
        await storage.markMerchandiseOrderFailure(order.id, "printful_submission_failed");
        await queueMerchandiseNotification(order.id, "order_attention");
        throw error;
      }
  }
}
