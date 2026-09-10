import { afterEach, describe, expect, it } from 'vitest';
import { createStorageFromEnvironment, MemStorage, summarizeAffiliateClicks } from './storage';

const originalPersistenceMode = process.env.CRITICAL_DATA_PERSISTENCE;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalPersistenceMode === undefined) {
    delete process.env.CRITICAL_DATA_PERSISTENCE;
  } else {
    process.env.CRITICAL_DATA_PERSISTENCE = originalPersistenceMode;
  }
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

describe('expense group ownership', () => {
  it('reports in-memory storage as healthy', async () => {
    const storage = new MemStorage();

    await expect(storage.healthCheck()).resolves.toBeUndefined();
  });

  it('closes in-memory storage safely', async () => {
    const storage = new MemStorage();

    await expect(storage.close()).resolves.toBeUndefined();
  });

  it('keeps the default Secret Blog stories in memory mode', async () => {
    const storage = new MemStorage();

    const posts = await storage.getAllBlogPosts();
    expect(posts).toHaveLength(3);
    expect(posts.map(post => post.location)).toEqual([
      'Roma',
      'Ibiza',
      'Cracovia',
    ]);
  });

  it('isolates groups between users', async () => {
    const storage = new MemStorage();
    const group = await storage.createExpenseGroup(
      {
        name: 'Weekend',
        description: 'Shared expenses',
        members: ['Alice', 'Bob'],
        currency: 'EUR',
      },
      'user-a',
    );

    await expect(storage.getAllExpenseGroups('user-a')).resolves.toEqual([group]);
    await expect(storage.getAllExpenseGroups('user-b')).resolves.toEqual([]);
    await expect(storage.isExpenseGroupOwner(group.id, 'user-a')).resolves.toBe(true);
    await expect(storage.isExpenseGroupOwner(group.id, 'user-b')).resolves.toBe(false);
  });

  it('filters owned groups by trip', async () => {
    const storage = new MemStorage();
    const tripOne = await storage.createExpenseGroup(
      { name: 'Trip one', members: ['Alice'], tripId: 10 },
      'user-a',
    );
    await storage.createExpenseGroup(
      { name: 'Trip two', members: ['Alice'], tripId: 20 },
      'user-a',
    );
    await storage.createExpenseGroup(
      { name: 'Other user', members: ['Mallory'], tripId: 10 },
      'user-b',
    );

    await expect(storage.getExpenseGroupsByTripId(10, 'user-a')).resolves.toEqual([
      tripOne,
    ]);
  });

  it('serializes equivalent trip plans into one dashboard record', async () => {
    const storage = new MemStorage();
    const basePlan = {
      userId: 'user-a',
      name: 'ByeBro · Barcelona',
      participants: 4,
      startDate: '2026-10-20',
      endDate: '2026-10-23',
      departureCity: 'Rome',
      destinations: ['Barcelona'],
      experienceType: 'bachelor',
      budget: 600,
      activities: [],
      specialRequests: null,
      includeMerch: false,
    };

    const results = await Promise.all([
      storage.createTripIfAbsent(basePlan),
      storage.createTripIfAbsent({ ...basePlan, departureCity: 'Italia' }),
      storage.createTripIfAbsent({ ...basePlan, departureCity: 'Roma' }),
    ]);

    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(new Set(results.map((result) => result.trip.id)).size).toBe(1);
    await expect(storage.getTripsByUserId('user-a')).resolves.toHaveLength(1);
  });

  it('records processed Stripe events idempotently', async () => {
    const storage = new MemStorage();

    await expect(storage.hasProcessedStripeEvent('evt_1')).resolves.toBe(false);
    await storage.markStripeEventProcessed('evt_1', 'cs_1');
    await storage.markStripeEventProcessed('evt_1', 'cs_1');
    await expect(storage.hasProcessedStripeEvent('evt_1')).resolves.toBe(true);
  });

  it('keeps merchandise orders scoped to their authenticated user', async () => {
    const storage = new MemStorage();
    const order = await storage.createMerchandiseOrder({
      id: '123e4567-e89b-42d3-a456-426614174000',
      userId: 'user-a',
      brand: 'byebro',
      amountTotal: 2500,
      currency: 'EUR',
      shippingCountry: 'IT',
      shippingMethod: 'STANDARD',
      shippingAmount: 500,
      legalVersion: '2026-08-04',
      termsAcceptedAt: new Date('2026-08-04T10:00:00Z'),
      items: [{
        productId: 1,
        variantId: 2,
        productName: 'T-shirt',
        variantName: 'Black / M',
        quantity: 1,
        unitAmount: 2500,
      }],
    });

    await expect(storage.getMerchandiseOrdersByUserId('user-a')).resolves.toEqual([order]);
    await expect(storage.getMerchandiseOrdersByUserId('user-b')).resolves.toEqual([]);
  });

  it('removes only unpaid merchandise orders that never reached Stripe', async () => {
    const storage = new MemStorage();
    const buildOrder = (id: string) => ({
      id,
      brand: 'byebro' as const,
      amountTotal: 2500,
      currency: 'EUR',
      shippingCountry: 'IT',
      shippingMethod: 'STANDARD',
      shippingAmount: 500,
      legalVersion: '2026-08-04',
      termsAcceptedAt: new Date('2026-08-04T10:00:00Z'),
      items: [{
        productId: 1,
        variantId: 2,
        productName: 'T-shirt',
        variantName: 'Black / M',
        quantity: 1,
        unitAmount: 2000,
      }],
    });
    const unattachedId = '123e4567-e89b-42d3-a456-426614174020';
    const attachedId = '123e4567-e89b-42d3-a456-426614174021';
    await storage.createMerchandiseOrder(buildOrder(unattachedId));
    await storage.createMerchandiseOrder(buildOrder(attachedId));
    await storage.attachStripeSessionToOrder(attachedId, 'cs_test_attached');

    await expect(storage.deleteUnattachedMerchandiseOrder(unattachedId)).resolves.toBe(true);
    await expect(storage.getMerchandiseOrderById(unattachedId)).resolves.toBeUndefined();
    await expect(storage.deleteUnattachedMerchandiseOrder(attachedId)).resolves.toBe(false);
    await expect(storage.getMerchandiseOrderById(attachedId)).resolves.toBeDefined();
  });

  it('claims a paid merchandise order only once while processing is fresh', async () => {
    const storage = new MemStorage();
    const orderId = '123e4567-e89b-42d3-a456-426614174001';
    await storage.createMerchandiseOrder({
      id: orderId,
      brand: 'byebride',
      amountTotal: 5000,
      currency: 'EUR',
      shippingCountry: 'IT',
      shippingMethod: 'STANDARD',
      shippingAmount: 500,
      legalVersion: '2026-08-04',
      termsAcceptedAt: new Date('2026-08-04T10:00:00Z'),
      items: [{
        productId: 1,
        variantId: 2,
        productName: 'T-shirt',
        variantName: 'White / M',
        quantity: 2,
        unitAmount: 2500,
      }],
    });
    await storage.attachStripeSessionToOrder(orderId, 'cs_test_order');

    const firstClaim = await storage.claimMerchandiseOrderForFulfillment(
      orderId,
      'cs_test_order',
      'evt_1',
      new Date(0),
    );
    const duplicateClaim = await storage.claimMerchandiseOrderForFulfillment(
      orderId,
      'cs_test_order',
      'evt_1',
      new Date(0),
    );

    expect(firstClaim?.fulfillmentStatus).toBe('processing');
    expect(duplicateClaim).toBeUndefined();
  });

  it('moves a merchandise order from payment to Printful submission', async () => {
    const storage = new MemStorage();
    const orderId = '123e4567-e89b-42d3-a456-426614174002';
    await storage.createMerchandiseOrder({
      id: orderId,
      brand: 'byebro',
      amountTotal: 2500,
      currency: 'EUR',
      shippingCountry: 'IT',
      shippingMethod: 'STANDARD',
      shippingAmount: 500,
      legalVersion: '2026-08-04',
      termsAcceptedAt: new Date('2026-08-04T10:00:00Z'),
      items: [{
        productId: 1,
        variantId: 2,
        productName: 'T-shirt',
        variantName: 'Black / M',
        quantity: 1,
        unitAmount: 2500,
      }],
    });
    await storage.attachStripeSessionToOrder(orderId, 'cs_test_order');
    await storage.claimMerchandiseOrderForFulfillment(
      orderId,
      'cs_test_order',
      'evt_1',
      new Date(0),
    );
    await storage.markMerchandiseOrderSubmitted(orderId, '42', 'draft');

    await expect(storage.getMerchandiseOrderById(orderId)).resolves.toMatchObject({
      paymentStatus: 'paid',
      fulfillmentStatus: 'submitted',
      printfulOrderId: '42',
      printfulStatus: 'draft',
    });
  });

  it('deduplicates and claims merchandise notifications only once', async () => {
    const storage = new MemStorage();
    const orderId = '123e4567-e89b-42d3-a456-426614174010';
    await storage.createMerchandiseOrder({
      id: orderId,
      customerEmail: 'buyer@example.com',
      brand: 'byebro',
      amountTotal: 2500,
      currency: 'EUR',
      shippingCountry: 'IT',
      shippingMethod: 'STANDARD',
      shippingAmount: 500,
      legalVersion: '2026-08-04',
      termsAcceptedAt: new Date('2026-08-04T10:00:00Z'),
      items: [{
        productId: 1,
        variantId: 2,
        productName: 'T-shirt',
        variantName: 'Black / M',
        quantity: 1,
        unitAmount: 2000,
      }],
    });

    await storage.enqueueMerchandiseNotification(orderId, 'payment_confirmed');
    await storage.enqueueMerchandiseNotification(orderId, 'payment_confirmed');
    const [notification] = await storage.getRetryableMerchandiseNotifications(
      new Date(Date.now() - 5 * 60_000),
    );

    expect(notification).toBeDefined();
    await expect(storage.claimMerchandiseNotification(
      notification.id,
      new Date(Date.now() - 5 * 60_000),
    )).resolves.toBe(true);
    await expect(storage.claimMerchandiseNotification(
      notification.id,
      new Date(Date.now() - 5 * 60_000),
    )).resolves.toBe(false);
    await storage.completeMerchandiseNotification(notification.id, {
      status: 'sent',
      providerMessageId: 'email_123',
    });
    await expect(storage.getMerchandiseNotificationsByOrderIds([orderId]))
      .resolves.toEqual([
        expect.objectContaining({
          orderId,
          type: 'payment_confirmed',
          status: 'sent',
          attempts: 1,
          providerMessageId: 'email_123',
        }),
      ]);
    await expect(storage.getMerchandiseNotificationsByOrderIds([
      '123e4567-e89b-42d3-a456-426614174099',
    ])).resolves.toEqual([]);
    await expect(storage.getRetryableMerchandiseNotifications(
      new Date(Date.now() - 5 * 60_000),
    )).resolves.toEqual([]);
  });

  it('allows admins to requeue only exhausted email deliveries', async () => {
    const storage = new MemStorage();
    const orderId = '123e4567-e89b-42d3-a456-426614174011';
    await storage.createMerchandiseOrder({
      id: orderId,
      customerEmail: 'buyer@example.com',
      brand: 'byebro',
      amountTotal: 2500,
      currency: 'EUR',
      shippingCountry: 'IT',
      shippingMethod: 'STANDARD',
      shippingAmount: 500,
      legalVersion: '2026-08-04',
      termsAcceptedAt: new Date('2026-08-04T10:00:00Z'),
      items: [{
        productId: 1,
        variantId: 2,
        productName: 'T-shirt',
        variantName: 'Black / M',
        quantity: 1,
        unitAmount: 2000,
      }],
    });
    await storage.enqueueMerchandiseNotification(orderId, 'order_attention');
    const [notification] = await storage.getRetryableMerchandiseNotifications(new Date(0));

    await expect(storage.retryFailedMerchandiseNotifications(orderId)).resolves.toBe(0);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(storage.claimMerchandiseNotification(
        notification.id,
        new Date(Date.now() + 1_000),
      )).resolves.toBe(true);
      await storage.completeMerchandiseNotification(notification.id, {
        status: 'failed',
        lastError: 'Provider unavailable',
      });
    }

    await expect(storage.retryFailedMerchandiseNotifications(orderId)).resolves.toBe(1);
    await expect(storage.getMerchandiseNotificationsByOrderIds([orderId]))
      .resolves.toEqual([
        expect.objectContaining({
          status: 'pending',
          attempts: 0,
          lastError: null,
        }),
      ]);
    await expect(storage.retryFailedMerchandiseNotifications(orderId)).resolves.toBe(0);
  });

  it('records privacy-preserving affiliate clicks in memory mode', async () => {
    const storage = new MemStorage();
    await storage.recordAffiliateClick({
      sessionId: '123e4567-e89b-42d3-a456-426614174000',
      provider: 'aviasales',
      placement: 'checkout_flight',
      brand: 'byebro',
      destination: 'Roma',
      monetized: true,
    });

    const summary = await storage.getAffiliateClickSummary(new Date(0), 30);
    expect(summary).toMatchObject({
      days: 30,
      totalClicks: 1,
      monetizedClicks: 1,
      providers: [{ key: 'aviasales', total: 1, monetized: 1 }],
    });
  });

  it('aggregates affiliate counts by provider and placement', () => {
    expect(summarizeAffiliateClicks([
      { provider: 'booking', placement: 'checkout_hotel', monetized: false, count: 2 },
      { provider: 'booking', placement: 'checkout_hotel', monetized: true, count: 3 },
      { provider: 'getyourguide', placement: 'experiences', monetized: true, count: 1 },
    ], 30)).toEqual({
      days: 30,
      totalClicks: 6,
      monetizedClicks: 4,
      providers: [
        { key: 'booking', total: 5, monetized: 3 },
        { key: 'getyourguide', total: 1, monetized: 1 },
      ],
      placements: [
        { key: 'checkout_hotel', total: 5, monetized: 3 },
        { key: 'experiences', total: 1, monetized: 1 },
      ],
    });
  });

  it('requires a database URL when database persistence is enabled', () => {
    process.env.CRITICAL_DATA_PERSISTENCE = 'database';
    delete process.env.DATABASE_URL;

    expect(() => createStorageFromEnvironment()).toThrow(
      'DATABASE_URL is required when CRITICAL_DATA_PERSISTENCE=database',
    );
  });

  it('refuses volatile persistence in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CRITICAL_DATA_PERSISTENCE = 'memory';

    expect(() => createStorageFromEnvironment()).toThrow(
      'CRITICAL_DATA_PERSISTENCE=database is required in production',
    );
  });
});
