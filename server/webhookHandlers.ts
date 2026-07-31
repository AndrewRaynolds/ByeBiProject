import Stripe from 'stripe';
import { z } from 'zod';
import { getStripeSecretKey, getStripeSync } from './stripeClient';
import { createOrder } from './services/printful';
import { storage } from './storage';

const printfulItemsSchema = z.array(
  z.object({
    sync_variant_id: z.number().int().positive(),
    quantity: z.number().int().min(1).max(10),
  }).strict(),
).min(1).max(20);

export class WebhookHandlers {
  private static processingEventIds = new Set<string>();

  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(await getStripeSecretKey(), {
        apiVersion: '2025-08-27.basil' as any,
      });
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      await this.processStripeEvent(event);
      return;
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  private static async processStripeEvent(event: Stripe.Event): Promise<void> {
    if (event.type !== 'checkout.session.completed') {
      return;
    }
    if (
      await storage.hasProcessedStripeEvent(event.id) ||
      this.processingEventIds.has(event.id)
    ) {
      return;
    }
    this.processingEventIds.add(event.id);

    try {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== 'paid') {
        return;
      }

      const printfulItemsRaw = session.metadata?.printful_items;
      if (!printfulItemsRaw) {
        console.warn('Stripe checkout completed without printful_items metadata');
        return;
      }

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

    const sessionWithShipping = session as Stripe.Checkout.Session & {
      shipping_details?: ShippingDetailsLike;
      collected_information?: {
        shipping_details?: ShippingDetailsLike;
      };
    };
      const shipping =
        sessionWithShipping.collected_information?.shipping_details ||
        sessionWithShipping.shipping_details;
      const address = shipping?.address;
      if (!shipping?.name || !address?.line1 || !address?.city || !address?.country || !address?.postal_code) {
        console.warn('Stripe checkout completed without a complete shipping address');
        return;
      }

      let parsedItems: unknown;
      try {
        parsedItems = JSON.parse(printfulItemsRaw);
      } catch {
        throw new Error('Stripe checkout metadata contains invalid JSON');
      }
      const items = printfulItemsSchema.parse(parsedItems);
      const confirmOrder = process.env.PRINTFUL_CONFIRM_ORDERS === 'true';

      await createOrder(
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
        items,
        !confirmOrder,
        `stripe-${session.id}`,
      );
      await storage.markStripeEventProcessed(event.id, session.id);
    } finally {
      this.processingEventIds.delete(event.id);
    }
  }
}
