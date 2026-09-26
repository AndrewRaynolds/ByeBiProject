import { describe, expect, it } from "vitest";
import { insertExpenseSchema } from "./schema";

const validExpense = {
  groupId: 1,
  description: "Cena",
  amount: 1250,
  paidBy: "Andrea",
  splitBetween: ["Andrea"],
  category: "food",
  date: "2026-09-26",
};

describe("expense schema", () => {
  it("accepts positive integer amounts in minor currency units", () => {
    expect(insertExpenseSchema.safeParse(validExpense).success).toBe(true);
    expect(insertExpenseSchema.safeParse({ ...validExpense, amount: 0 }).success).toBe(false);
    expect(insertExpenseSchema.safeParse({ ...validExpense, amount: -100 }).success).toBe(false);
    expect(insertExpenseSchema.safeParse({ ...validExpense, amount: 12.5 }).success).toBe(false);
  });
});
