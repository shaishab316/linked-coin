import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { accounts } from "@/db/schema";

import type { CreateAccountInput } from "./validation";

export type AccountRecord = {
  id: string;
  name: string;
  accountType: (typeof accounts.$inferSelect)["accountType"];
  currency: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
};

const accountColumns = {
  id: accounts.id,
  name: accounts.name,
  accountType: accounts.accountType,
  currency: accounts.currency,
  description: accounts.description,
  createdAt: accounts.createdAt,
  archivedAt: accounts.archivedAt,
};

/**
 * Every account query takes the owning user id. Knowing an account UUID must
 * never be enough to read or modify it.
 */
export async function listAccountsForUser(
  db: Database,
  userId: string,
): Promise<AccountRecord[]> {
  return db
    .select(accountColumns)
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.archivedAt), asc(accounts.createdAt));
}

export async function getAccountForUser(
  db: Database,
  userId: string,
  accountId: string,
): Promise<AccountRecord | null> {
  const [account] = await db
    .select(accountColumns)
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  return account ?? null;
}

export async function createAccountForUser(
  db: Database,
  userId: string,
  input: CreateAccountInput,
): Promise<AccountRecord> {
  const [account] = await db
    .insert(accounts)
    .values({
      userId,
      name: input.name,
      accountType: input.accountType,
      currency: input.currency,
      description: input.description,
    })
    .returning(accountColumns);

  if (!account) {
    throw new Error("Account insert did not return a row");
  }

  return account;
}

/**
 * Archiving keeps every historical transaction; ownership is re-checked in
 * the UPDATE predicate rather than trusted from the request.
 */
export async function archiveAccountForUser(
  db: Database,
  userId: string,
  accountId: string,
): Promise<boolean> {
  return setAccountArchivedForUser(db, userId, accountId, true);
}

export async function setAccountArchivedForUser(
  db: Database,
  userId: string,
  accountId: string,
  archived: boolean,
): Promise<boolean> {
  const rows = await db
    .update(accounts)
    .set({
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .returning({ id: accounts.id });

  return rows.length > 0;
}

/** Type and currency stay immutable once the account is in the ledger. */
export async function updateAccountMetadataForUser(
  db: Database,
  userId: string,
  accountId: string,
  input: { name: string; description: string | null },
): Promise<boolean> {
  const rows = await db
    .update(accounts)
    .set({
      name: input.name,
      description: input.description,
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .returning({ id: accounts.id });

  return rows.length > 0;
}
