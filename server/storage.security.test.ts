import { afterEach, describe, expect, it } from 'vitest';
import { createStorageFromEnvironment, MemStorage } from './storage';

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

  it('records processed Stripe events idempotently', async () => {
    const storage = new MemStorage();

    await expect(storage.hasProcessedStripeEvent('evt_1')).resolves.toBe(false);
    await storage.markStripeEventProcessed('evt_1', 'cs_1');
    await storage.markStripeEventProcessed('evt_1', 'cs_1');
    await expect(storage.hasProcessedStripeEvent('evt_1')).resolves.toBe(true);
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
