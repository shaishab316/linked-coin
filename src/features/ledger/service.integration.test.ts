import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  accounts,
  financialEvents,
  ledgerEntries,
  ledgerTransactions,
  transactionLinks,
} from "@/db/schema";
import { createAccountForUser } from "@/features/accounts/service";
import { registerUser } from "@/features/auth/service";
import { createPersonForUser } from "@/features/people/service";
import { createTagForUser } from "@/features/tags/service";
import {
  createTestContext,
  hasTestDatabase,
  type TestContext,
} from "../../../tests/helpers/database";

import {
  getAccountBalances,
  getMonthlyCashFlow,
  getPersonBalances,
} from "./queries";
import { postLedgerCommand, reverseLedgerTransaction } from "./service";
import type { LedgerCommandInput } from "./validation";

const baseAmount = {
  description: "Test transaction",
  notes: null,
  currency: "BDT",
  amount: "500",
  occurredAt: new Date(),
  tagIds: [] as string[],
};

function errorChainMessages(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;

  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }

  return messages.join(" | ");
}

async function captureError(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return errorChainMessages(error);
  }

  throw new Error("Expected the operation to fail, but it succeeded");
}

function command(fields: Record<string, unknown> & { type: string }) {
  return {
    ...baseAmount,
    idempotencyKey: crypto.randomUUID(),
    ...fields,
  } as LedgerCommandInput;
}

describe.skipIf(!hasTestDatabase)("ledger commands (PostgreSQL)", () => {
  let context: TestContext;
  let userId: string;
  let cashAccountId: string;
  let bankAccountId: string;

  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await context.reset();

    const user = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });
    userId = user.id;

    const cash = await createAccountForUser(context.db, userId, {
      name: "Cash",
      accountType: "cash",
      currency: "BDT",
      description: null,
    });
    const bank = await createAccountForUser(context.db, userId, {
      name: "Bank",
      accountType: "bank",
      currency: "BDT",
      description: null,
    });

    cashAccountId = cash.id;
    bankAccountId = bank.id;
  });

  afterAll(async () => {
    await context.close();
  });

  async function balanceOf(accountId: string): Promise<bigint> {
    const balances = await getAccountBalances(context.db, userId);
    return balances.get(accountId) ?? 0n;
  }

  it("records income as a balanced debit to the account", async () => {
    const result = await postLedgerCommand(
      context.db,
      userId,
      command({ type: "income", accountId: cashAccountId, amount: "1000" }),
    );

    const entries = await context.db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.transactionId, result.transactionId));

    expect(entries).toHaveLength(2);
    expect(await balanceOf(cashAccountId)).toBe(100_000n);

    const incomeTotal = entries
      .filter((entry) => entry.externalKind === "income")
      .reduce((sum, entry) => sum + entry.amountMinor, 0n);
    expect(incomeTotal).toBe(100_000n);
  });

  it("reduces the account balance for an expense", async () => {
    await postLedgerCommand(
      context.db,
      userId,
      command({ type: "income", accountId: cashAccountId, amount: "1000" }),
    );
    await postLedgerCommand(
      context.db,
      userId,
      command({ type: "expense", accountId: cashAccountId, amount: "250.50" }),
    );

    expect(await balanceOf(cashAccountId)).toBe(74_950n);
  });

  it("moves money between accounts with one atomic transfer", async () => {
    await postLedgerCommand(
      context.db,
      userId,
      command({ type: "income", accountId: cashAccountId, amount: "1000" }),
    );

    await postLedgerCommand(
      context.db,
      userId,
      command({
        type: "transfer",
        fromAccountId: cashAccountId,
        toAccountId: bankAccountId,
        amount: "400",
      }),
    );

    expect(await balanceOf(cashAccountId)).toBe(60_000n);
    expect(await balanceOf(bankAccountId)).toBe(40_000n);

    const flow = await getMonthlyCashFlow(context.db, userId);
    const current = flow.at(-1);
    expect(current?.incomeMinor).toBe(100_000n);
    expect(current?.expenseMinor).toBe(0n);
  });

  it("rejects transfers between accounts in different currencies", async () => {
    const usd = await createAccountForUser(context.db, userId, {
      name: "USD savings",
      accountType: "savings",
      currency: "USD",
      description: null,
    });

    await expect(
      postLedgerCommand(
        context.db,
        userId,
        command({
          type: "transfer",
          fromAccountId: cashAccountId,
          toAccountId: usd.id,
          amount: "10",
        }),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("tracks a loan as a receivable and a partial repayment", async () => {
    const friend = await createPersonForUser(context.db, userId, {
      name: "Rahim",
      contact: null,
      notes: null,
    });

    await postLedgerCommand(
      context.db,
      userId,
      command({ type: "income", accountId: cashAccountId, amount: "5000" }),
    );
    const loan = await postLedgerCommand(
      context.db,
      userId,
      command({
        type: "loan_given",
        accountId: cashAccountId,
        personId: friend.id,
        amount: "1000",
        description: "Lent to Rahim",
      }),
    );

    expect(await balanceOf(cashAccountId)).toBe(400_000n);

    let personBalances = await getPersonBalances(context.db, userId);
    expect(personBalances).toEqual([
      { personId: friend.id, currency: "BDT", netMinor: 100_000n },
    ]);

    await postLedgerCommand(
      context.db,
      userId,
      command({
        type: "repayment_received",
        accountId: cashAccountId,
        personId: friend.id,
        amount: "400",
        loanTransactionId: loan.transactionId,
      }),
    );

    expect(await balanceOf(cashAccountId)).toBe(440_000n);

    personBalances = await getPersonBalances(context.db, userId);
    expect(personBalances[0]?.netMinor).toBe(60_000n);

    const links = await context.db.select().from(transactionLinks);
    expect(links).toHaveLength(1);
    expect(links[0]?.linkType).toBe("repayment");
  });

  it("rejects a repayment larger than the outstanding loan", async () => {
    const friend = await createPersonForUser(context.db, userId, {
      name: "Rahim",
      contact: null,
      notes: null,
    });

    await postLedgerCommand(
      context.db,
      userId,
      command({ type: "income", accountId: cashAccountId, amount: "5000" }),
    );
    const loan = await postLedgerCommand(
      context.db,
      userId,
      command({
        type: "loan_given",
        accountId: cashAccountId,
        personId: friend.id,
        amount: "1000",
      }),
    );

    await expect(
      postLedgerCommand(
        context.db,
        userId,
        command({
          type: "repayment_received",
          accountId: cashAccountId,
          personId: friend.id,
          amount: "1200",
          loanTransactionId: loan.transactionId,
        }),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("is idempotent for repeated idempotency keys", async () => {
    const idempotencyKey = crypto.randomUUID();
    const payload = command({
      type: "expense",
      accountId: cashAccountId,
      amount: "100",
      idempotencyKey,
    });

    const first = await postLedgerCommand(context.db, userId, payload);
    const second = await postLedgerCommand(context.db, userId, payload);

    expect(second.idempotent).toBe(true);
    expect(second.transactionId).toBe(first.transactionId);
    expect(await balanceOf(cashAccountId)).toBe(-10_000n);

    const events = await context.db.select().from(financialEvents);
    expect(events).toHaveLength(1);
  });

  it("reverses a transaction with compensating entries and keeps the original", async () => {
    const expense = await postLedgerCommand(
      context.db,
      userId,
      command({ type: "expense", accountId: cashAccountId, amount: "300" }),
    );

    expect(await balanceOf(cashAccountId)).toBe(-30_000n);

    const reversal = await reverseLedgerTransaction(context.db, userId, {
      transactionId: expense.transactionId,
      idempotencyKey: crypto.randomUUID(),
      reason: "Entered twice",
    });

    expect(await balanceOf(cashAccountId)).toBe(0n);

    const [original] = await context.db
      .select()
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.id, expense.transactionId));

    expect(original?.reversedAt).toBeInstanceOf(Date);
    expect(original?.reversedByTransactionId).toBe(reversal.transactionId);

    const [reversalRow] = await context.db
      .select()
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.id, reversal.transactionId));
    expect(reversalRow?.type).toBe("reversal");
    expect(reversalRow?.reversesTransactionId).toBe(expense.transactionId);

    await expect(
      reverseLedgerTransaction(context.db, userId, {
        transactionId: expense.transactionId,
        idempotencyKey: crypto.randomUUID(),
        reason: null,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(
      reverseLedgerTransaction(context.db, userId, {
        transactionId: reversal.transactionId,
        idempotencyKey: crypto.randomUUID(),
        reason: null,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("refuses accounts, people, and tags owned by another user", async () => {
    const other = await registerUser(context.db, {
      username: "grace",
      password: "correct-horse",
    });
    const otherAccount = await createAccountForUser(context.db, other.id, {
      name: "Grace cash",
      accountType: "cash",
      currency: "BDT",
      description: null,
    });
    const otherPerson = await createPersonForUser(context.db, other.id, {
      name: "Grace friend",
      contact: null,
      notes: null,
    });
    const otherTag = await createTagForUser(context.db, other.id, {
      name: "Private",
      description: null,
      parentId: null,
    });

    await expect(
      postLedgerCommand(
        context.db,
        userId,
        command({ type: "income", accountId: otherAccount.id }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      postLedgerCommand(
        context.db,
        userId,
        command({
          type: "loan_given",
          accountId: cashAccountId,
          personId: otherPerson.id,
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      postLedgerCommand(
        context.db,
        userId,
        command({
          type: "expense",
          accountId: cashAccountId,
          tagIds: [otherTag.id],
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses archived accounts", async () => {
    await context.db
      .update(accounts)
      .set({ archivedAt: new Date() })
      .where(eq(accounts.id, cashAccountId));

    await expect(
      postLedgerCommand(
        context.db,
        userId,
        command({ type: "income", accountId: cashAccountId }),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects unbalanced entries at the database level", async () => {
    const message = await captureError(
      context.db.transaction(async (tx) => {
        const [transaction] = await tx
          .insert(ledgerTransactions)
          .values({
            userId,
            type: "expense",
            occurredAt: new Date(),
            description: "Unbalanced",
            currency: "BDT",
            amountMinor: 10_000n,
            idempotencyKey: crypto.randomUUID(),
          })
          .returning({ id: ledgerTransactions.id });

        await tx.insert(ledgerEntries).values([
          {
            transactionId: transaction!.id,
            userId,
            accountId: cashAccountId,
            direction: "debit",
            amountMinor: 10_000n,
            currency: "BDT",
          },
          {
            transactionId: transaction!.id,
            userId,
            accountId: cashAccountId,
            direction: "credit",
            amountMinor: 9_999n,
            currency: "BDT",
          },
        ]);
      }),
    );

    expect(message).toMatch(/unbalanced/i);
  });

  it("rejects entries in a different currency than their transaction", async () => {
    const message = await captureError(
      context.db.transaction(async (tx) => {
        const [transaction] = await tx
          .insert(ledgerTransactions)
          .values({
            userId,
            type: "expense",
            occurredAt: new Date(),
            description: "Wrong currency",
            currency: "BDT",
            amountMinor: 10_000n,
            idempotencyKey: crypto.randomUUID(),
          })
          .returning({ id: ledgerTransactions.id });

        await tx.insert(ledgerEntries).values([
          {
            transactionId: transaction!.id,
            userId,
            accountId: cashAccountId,
            direction: "debit",
            amountMinor: 10_000n,
            currency: "USD",
          },
          {
            transactionId: transaction!.id,
            userId,
            accountId: cashAccountId,
            direction: "credit",
            amountMinor: 10_000n,
            currency: "USD",
          },
        ]);
      }),
    );

    expect(message).toMatch(/currency/i);
  });

  it("keeps financial events append-only", async () => {
    await postLedgerCommand(
      context.db,
      userId,
      command({ type: "income", accountId: cashAccountId }),
    );

    const message = await captureError(
      context.db.update(financialEvents).set({ eventType: "tampered" }),
    );

    expect(message).toMatch(/append-only/i);
  });
});
