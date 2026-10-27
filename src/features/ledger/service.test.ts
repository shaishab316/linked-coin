import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../../db";
import { users, accounts, people, ledgerTransactions } from "../../db/schema";
import { createTransaction, reverseTransaction, getTransactionById } from "./service";
import { hashPassword } from "../../lib/auth/password";

describe("Double-entry Ledger Service Integration", () => {
  let testUserId: string;
  let cashAccountId: string;
  let bankAccountId: string;
  let friendId: string;

  beforeAll(async () => {
    // Setup test user
    const [user] = await db
      .insert(users)
      .values({
        username: `test_ledger_${Date.now()}`,
        passwordHash: await hashPassword("ValidPassword123!"),
      })
      .returning();
    testUserId = user.id;

    // Setup Cash Account
    const [cash] = await db
      .insert(accounts)
      .values({
        userId: testUserId,
        name: "Test Cash",
        accountType: "cash",
        currency: "BDT",
      })
      .returning();
    cashAccountId = cash.id;

    // Setup Bank Account
    const [bank] = await db
      .insert(accounts)
      .values({
        userId: testUserId,
        name: "Test Bank",
        accountType: "bank",
        currency: "BDT",
      })
      .returning();
    bankAccountId = bank.id;

    // Setup Friend
    const [friend] = await db
      .insert(people)
      .values({
        userId: testUserId,
        name: "Rahim",
      })
      .returning();
    friendId = friend.id;
  });

  it("records income and creates balanced debit (account) and credit (external income)", async () => {
    const tx = await createTransaction(testUserId, {
      type: "income",
      amount: "5000",
      currency: "BDT",
      description: "Monthly Salary",
      destinationAccountId: bankAccountId,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `test_income_${Date.now()}`,
    });

    expect(tx.id).toBeDefined();
    expect(tx.amountMinor).toBe(500000n);
    expect(tx.entries).toHaveLength(2);

    const debitLeg = tx.entries.find((e) => e.direction === "debit");
    const creditLeg = tx.entries.find((e) => e.direction === "credit");

    expect(debitLeg?.accountId).toBe(bankAccountId);
    expect(creditLeg?.externalKind).toBe("income");
    expect(debitLeg?.amountMinor).toBe(500000n);
    expect(creditLeg?.amountMinor).toBe(500000n);
  });

  it("records an expense with balanced credit (account) and debit (external expense)", async () => {
    const tx = await createTransaction(testUserId, {
      type: "expense",
      amount: "350.50",
      currency: "BDT",
      description: "Groceries",
      sourceAccountId: cashAccountId,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `test_expense_${Date.now()}`,
    });

    expect(tx.id).toBeDefined();
    expect(tx.amountMinor).toBe(35050n);

    const debitLeg = tx.entries.find((e) => e.direction === "debit");
    const creditLeg = tx.entries.find((e) => e.direction === "credit");

    expect(creditLeg?.accountId).toBe(cashAccountId);
    expect(debitLeg?.externalKind).toBe("expense");
  });

  it("records atomic transfers between two owned accounts", async () => {
    const tx = await createTransaction(testUserId, {
      type: "transfer",
      amount: "1000",
      currency: "BDT",
      description: "ATM Cash Withdrawal",
      sourceAccountId: bankAccountId,
      destinationAccountId: cashAccountId,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `test_transfer_${Date.now()}`,
    });

    expect(tx.entries).toHaveLength(2);
    const debitLeg = tx.entries.find((e) => e.direction === "debit");
    const creditLeg = tx.entries.find((e) => e.direction === "credit");

    expect(debitLeg?.accountId).toBe(cashAccountId); // Cash increases
    expect(creditLeg?.accountId).toBe(bankAccountId); // Bank decreases
  });

  it("enforces idempotency and returns identical transaction without duplication", async () => {
    const idempotencyKey = `idemp_test_${Date.now()}`;
    const tx1 = await createTransaction(testUserId, {
      type: "expense",
      amount: "100",
      currency: "BDT",
      description: "Snack",
      sourceAccountId: cashAccountId,
      occurredAt: new Date().toISOString(),
      idempotencyKey,
    });

    const tx2 = await createTransaction(testUserId, {
      type: "expense",
      amount: "100",
      currency: "BDT",
      description: "Snack",
      sourceAccountId: cashAccountId,
      occurredAt: new Date().toISOString(),
      idempotencyKey,
    });

    expect(tx1.id).toBe(tx2.id);
  });

  it("reverses a transaction by creating a linked compensating event and preserving original", async () => {
    const original = await createTransaction(testUserId, {
      type: "expense",
      amount: "200",
      currency: "BDT",
      description: "Wrong Expense",
      sourceAccountId: cashAccountId,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `wrong_exp_${Date.now()}`,
    });

    const reversal = await reverseTransaction(testUserId, original.id, {
      reason: "Accidental double entry",
    });

    expect(reversal.type).toBe("reversal");
    expect(reversal.reversesTransactionId).toBe(original.id);

    // Verify original transaction is updated with reversedAt but not deleted
    const updatedOriginal = await getTransactionById(testUserId, original.id);
    expect(updatedOriginal.reversedAt).not.toBeNull();
    expect(updatedOriginal.reversedByTransactionId).toBe(reversal.id);
  });

  it("records loan given and partial repayment, rejecting overpayment", async () => {
    // Lend 1000 to Rahim
    const loan = await createTransaction(testUserId, {
      type: "loan_given",
      amount: "1000",
      currency: "BDT",
      description: "Loan to Rahim",
      sourceAccountId: cashAccountId,
      personId: friendId,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `loan_${Date.now()}`,
    });

    // Partial repayment of 400
    const repayment = await createTransaction(testUserId, {
      type: "repayment_received",
      amount: "400",
      currency: "BDT",
      description: "Partial repayment from Rahim",
      destinationAccountId: cashAccountId,
      personId: friendId,
      linkedTransactionId: loan.id,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `repay_1_${Date.now()}`,
    });

    expect(repayment.amountMinor).toBe(40000n);

    // Try repaying 700 (which exceeds remaining 600) -> should fail
    await expect(
      createTransaction(testUserId, {
        type: "repayment_received",
        amount: "700",
        currency: "BDT",
        description: "Overpayment",
        destinationAccountId: cashAccountId,
        personId: friendId,
        linkedTransactionId: loan.id,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `repay_over_${Date.now()}`,
      }),
    ).rejects.toThrow(/exceeds outstanding balance/i);
  });
});
