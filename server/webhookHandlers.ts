import Stripe from 'stripe';
import { getStripeSecretKey, getStripeSync } from './stripeClient';
import { createOrder } from './services/printful';

export class WebhookHandlers {
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

    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== 'paid') {
      return;
    }

    const printfulItemsRaw = session.metadata?.printful_items;
    if (!printfulItemsRaw) {
      console.warn('Stripe checkout completed without printful_items metadata');
      return;
    }

    const shipping = session.shipping_details;
    const address = shipping?.address;
    if (!shipping?.name || !address?.line1 || !address?.city || !address?.country || !address?.postal_code) {
      console.warn('Stripe checkout completed without a complete shipping address');
      return;
    }

    const items = JSON.parse(printfulItemsRaw);
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
      !confirmOrder
    );
  }
}
