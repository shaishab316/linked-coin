import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  accounts,
  ledgerTransactions,
  ledgerEntries,
  financialEvents,
  type Account,
} from "../../db/schema";
import { AppError } from "../../lib/errors/app-error";
import { decimalStringToMinor } from "../../lib/money/money";
import {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "./validation";

export interface AccountWithBalance extends Account {
  balanceMinor: bigint;
}

export async function createAccount(
  userId: string,
  input: CreateAccountInput,
): Promise<AccountWithBalance> {
  const parsed = createAccountSchema.parse(input);
  const initialMinor = parsed.initialBalance ? decimalStringToMinor(parsed.initialBalance, parsed.currency) : 0n;

  return await db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accounts)
      .values({
        userId,
        name: parsed.name,
        accountType: parsed.accountType,
        currency: parsed.currency,
        description: parsed.description || null,
      })
      .returning();

    if (initialMinor > 0n) {
      const idempotencyKey = `opening_balance_${account.id}`;
      const now = new Date();

      const [transaction] = await tx
        .insert(ledgerTransactions)
        .values({
          userId,
          type: "adjustment",
          currency: parsed.currency,
          description: `Opening balance for ${parsed.name}`,
          amountMinor: initialMinor,
          occurredAt: now,
          idempotencyKey,
        })
        .returning();

      // Balanced entries: Debit Asset Account, Credit Equity
      await tx.insert(ledgerEntries).values([
        {
          transactionId: transaction.id,
          userId,
          accountId: account.id,
          direction: "debit",
          amountMinor: initialMinor,
          currency: parsed.currency,
        },
        {
          transactionId: transaction.id,
          userId,
          externalKind: "equity",
          direction: "credit",
          amountMinor: initialMinor,
          currency: parsed.currency,
        },
      ]);

      await tx.insert(financialEvents).values({
        userId,
        transactionId: transaction.id,
        eventType: "TRANSACTION_CREATED",
        payload: {
          transactionId: transaction.id,
          type: "adjustment",
          accountId: account.id,
          amountMinor: initialMinor.toString(),
          currency: parsed.currency,
        },
        occurredAt: now,
        idempotencyKey,
      });
    }

    return {
      ...account,
      balanceMinor: initialMinor,
    };
  });
}

export async function listAccounts(
  userId: string,
  includeArchived = false,
): Promise<AccountWithBalance[]> {
  const conditions = [eq(accounts.userId, userId)];
  if (!includeArchived) {
    conditions.push(isNull(accounts.archivedAt));
  }

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(and(...conditions))
    .orderBy(accounts.createdAt);

  if (userAccounts.length === 0) return [];

  // Calculate balances from ledger_entries
  const balances = await db
    .select({
      accountId: ledgerEntries.accountId,
      debitSum: sql<string>`coalesce(sum(case when direction = 'debit' then amount_minor else 0 end), 0)`,
      creditSum: sql<string>`coalesce(sum(case when direction = 'credit' then amount_minor else 0 end), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, userId))
    .groupBy(ledgerEntries.accountId);

  const balanceMap = new Map<string, bigint>();
  for (const b of balances) {
    if (b.accountId) {
      const debits = BigInt(b.debitSum || "0");
      const credits = BigInt(b.creditSum || "0");
      balanceMap.set(b.accountId, debits - credits);
    }
  }

  return userAccounts.map((acc) => {
    const rawBalance = balanceMap.get(acc.id) || 0n;
    // For credit accounts, balance is credits - debits
    const balanceMinor = acc.accountType === "credit" ? -rawBalance : rawBalance;
    return {
      ...acc,
      balanceMinor,
    };
  });
}

export async function getAccountById(
  userId: string,
  accountId: string,
): Promise<AccountWithBalance> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) {
    throw AppError.notFound("Account not found");
  }

  const [balanceRow] = await db
    .select({
      debitSum: sql<string>`coalesce(sum(case when direction = 'debit' then amount_minor else 0 end), 0)`,
      creditSum: sql<string>`coalesce(sum(case when direction = 'credit' then amount_minor else 0 end), 0)`,
    })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.userId, userId), eq(ledgerEntries.accountId, accountId)));

  const debits = BigInt(balanceRow?.debitSum || "0");
  const credits = BigInt(balanceRow?.creditSum || "0");
  const rawBalance = debits - credits;
  const balanceMinor = account.accountType === "credit" ? -rawBalance : rawBalance;

  return {
    ...account,
    balanceMinor,
  };
}

export async function updateAccount(
  userId: string,
  accountId: string,
  input: UpdateAccountInput,
): Promise<Account> {
  const parsed = updateAccountSchema.parse(input);

  const [updated] = await db
    .update(accounts)
    .set({
      name: parsed.name,
      description: parsed.description || null,
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Account not found");
  }

  return updated;
}

export async function archiveAccount(userId: string, accountId: string): Promise<Account> {
  const [updated] = await db
    .update(accounts)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Account not found");
  }

  return updated;
}

export async function restoreAccount(userId: string, accountId: string): Promise<Account> {
  const [updated] = await db
    .update(accounts)
    .set({
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Account not found");
  }

  return updated;
}
