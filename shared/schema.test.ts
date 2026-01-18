import { describe, it, expect } from 'vitest';
import {
  insertUserSchema,
  insertTripSchema,
  insertExpenseSchema,
  insertExpenseGroupSchema,
} from './schema';

describe('insertUserSchema', () => {
  describe('valid data', () => {
    it('accepts valid user data', () => {
      const validUser = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = insertUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('accepts user without optional fields', () => {
      const minimalUser = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      };
      const result = insertUserSchema.safeParse(minimalUser);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('rejects user without username', () => {
      const invalidUser = {
        password: 'password123',
        email: 'test@example.com',
      };
      const result = insertUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('rejects user without password', () => {
      const invalidUser = {
        username: 'testuser',
        email: 'test@example.com',
      };
      const result = insertUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('rejects user without email', () => {
      const invalidUser = {
        username: 'testuser',
        password: 'password123',
      };
      const result = insertUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });
});

describe('insertTripSchema', () => {
  const validTrip = {
    userId: 1,
    name: 'Summer Vacation',
    participants: 4,
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    departureCity: 'Roma',
    destinations: ['Barcelona', 'Madrid'],
    experienceType: 'adventure',
    budget: 2000,
    activities: ['hiking', 'sightseeing'],
    specialRequests: 'Vegetarian meals',
    includeMerch: true,
  };

  describe('valid data', () => {
    it('accepts valid trip data', () => {
      const result = insertTripSchema.safeParse(validTrip);
      expect(result.success).toBe(true);
    });

    it('accepts trip without optional fields', () => {
      const minimalTrip = {
        userId: 1,
        name: 'Summer Vacation',
        participants: 4,
        startDate: '2026-07-01',
        endDate: '2026-07-15',
        departureCity: 'Roma',
        experienceType: 'adventure',
        budget: 2000,
      };
      const result = insertTripSchema.safeParse(minimalTrip);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('rejects trip without name', () => {
      const invalidTrip = { ...validTrip, name: undefined };
      const result = insertTripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it('rejects trip without participants', () => {
      const invalidTrip = { ...validTrip, participants: undefined };
      const result = insertTripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it('rejects trip with invalid participants type', () => {
      const invalidTrip = { ...validTrip, participants: 'four' };
      const result = insertTripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it('rejects trip without budget', () => {
      const invalidTrip = { ...validTrip, budget: undefined };
      const result = insertTripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it('rejects trip with invalid budget type', () => {
      const invalidTrip = { ...validTrip, budget: '2000' };
      const result = insertTripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });
  });
});

describe('insertExpenseGroupSchema', () => {
  describe('valid data', () => {
    it('accepts valid expense group data', () => {
      const validGroup = {
        name: 'Trip to Barcelona',
        description: 'Expenses for summer trip',
        members: ['Alice', 'Bob', 'Charlie'],
        currency: 'EUR',
      };
      const result = insertExpenseGroupSchema.safeParse(validGroup);
      expect(result.success).toBe(true);
    });

    it('accepts group without optional fields', () => {
      const minimalGroup = {
        name: 'Trip Expenses',
        members: ['Alice', 'Bob'],
      };
      const result = insertExpenseGroupSchema.safeParse(minimalGroup);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('rejects group without name', () => {
      const invalidGroup = {
        members: ['Alice', 'Bob'],
      };
      const result = insertExpenseGroupSchema.safeParse(invalidGroup);
      expect(result.success).toBe(false);
    });

    it('rejects group without members', () => {
      const invalidGroup = {
        name: 'Trip Expenses',
      };
      const result = insertExpenseGroupSchema.safeParse(invalidGroup);
      expect(result.success).toBe(false);
    });
  });
});

describe('insertExpenseSchema', () => {
  const validExpense = {
    groupId: 1,
    description: 'Dinner at restaurant',
    amount: 120,
    paidBy: 'Alice',
    splitBetween: ['Alice', 'Bob', 'Charlie'],
    category: 'food',
    date: '2026-07-05',
  };

  describe('valid data', () => {
    it('accepts valid expense data', () => {
      const result = insertExpenseSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('rejects expense without groupId', () => {
      const invalidExpense = { ...validExpense, groupId: undefined };
      const result = insertExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('rejects expense without description', () => {
      const invalidExpense = { ...validExpense, description: undefined };
      const result = insertExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('rejects expense without amount', () => {
      const invalidExpense = { ...validExpense, amount: undefined };
      const result = insertExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('rejects expense with invalid amount type', () => {
      const invalidExpense = { ...validExpense, amount: '120' };
      const result = insertExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('rejects expense without paidBy', () => {
      const invalidExpense = { ...validExpense, paidBy: undefined };
      const result = insertExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('rejects expense without splitBetween', () => {
      const invalidExpense = { ...validExpense, splitBetween: undefined };
      const result = insertExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('rejects expense without category', () => {
      const invalidExpense = { ...validExpense, category: undefined };
      const result = insertExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('rejects expense without date', () => {
      const invalidExpense = { ...validExpense, date: undefined };
      const result = insertExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });
  });
});
