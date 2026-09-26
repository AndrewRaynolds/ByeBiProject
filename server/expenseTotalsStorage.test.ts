import { describe, expect, it } from "vitest";
import { MemStorage } from "./storage";

describe("Splitta expense totals", () => {
  it("keeps expense-group totalAmount in cents across create, update, and delete", async () => {
    const storage = new MemStorage();
    const group = await storage.createExpenseGroup({
      name: "Weekend",
      description: null,
      members: ["Andrea", "Luca"],
      currency: "EUR",
      tripId: null,
    }, "user-a");

    const first = await storage.createExpense({
      groupId: group.id,
      description: "Cena",
      amount: 10_50,
      paidBy: "Andrea",
      splitBetween: ["Andrea", "Luca"],
      category: "food",
      date: "2026-09-26",
    });
    const second = await storage.createExpense({
      groupId: group.id,
      description: "Taxi",
      amount: 2_50,
      paidBy: "Luca",
      splitBetween: ["Andrea", "Luca"],
      category: "transport",
      date: "2026-09-26",
    });

    expect((await storage.getExpenseGroup(group.id))?.totalAmount).toBe(13_00);

    await storage.updateExpense(first.id, { amount: 5_00 });
    expect((await storage.getExpenseGroup(group.id))?.totalAmount).toBe(7_50);

    expect(await storage.deleteExpense(second.id)).toBe(true);
    expect((await storage.getExpenseGroup(group.id))?.totalAmount).toBe(5_00);
  });
});
