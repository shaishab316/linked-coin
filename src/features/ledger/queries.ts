import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db";

import { formatMoney } from "@/lib/money/money";

import {
  accounts,
  ledgerEntries,
  ledgerTransactions,
  people,
  tags,
  transactionLinks,
  transactionTags,
} from "@/db/schema";

export const TRANSACTION_PAGE_SIZE = 20;

export type TransactionListItem = {
  id: string;
  type: (typeof ledgerTransactions.$inferSelect)["type"];
  occurredAt: Date;
  description: string;
  currency: string;
  amountMinor: bigint;
  reversedAt: Date | null;
  personName: string | null;
  accountNames: string[];
  tagNames: string[];
};

export type TransactionDetail = TransactionListItem & {
  notes: string | null;
  reversedByTransactionId: string | null;
  reversesTransactionId: string | null;
  entries: Array<{
    id: string;
    direction: "debit" | "credit";
    amountMinor: bigint;
    currency: string;
    accountName: string | null;
    personName: string | null;
    externalKind: string | null;
  }>;
  linkedTransactions: Array<{
    id: string;
    linkType: "repayment" | "reversal" | "correction";
    description: string;
    amountMinor: bigint;
    currency: string;
    occurredAt: Date;
  }>;
};

async function decorateTransactions<
  T extends { id: string },
>(
  db: Database,
  userId: string,
  rows: T[],
): Promise<Array<T & Pick<TransactionListItem, "accountNames" | "personName" | "tagNames">>> {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);

  const [entryRows, tagRows] = await Promise.all([
    db
      .select({
        transactionId: ledgerEntries.transactionId,
        accountName: accounts.name,
        personName: people.name,
      })
      .from(ledgerEntries)
      .leftJoin(accounts, eq(accounts.id, ledgerEntries.accountId))
      .leftJoin(people, eq(people.id, ledgerEntries.personId))
      .where(
        and(
          eq(ledgerEntries.userId, userId),
          inArray(ledgerEntries.transactionId, ids),
        ),
      ),
    db
      .select({
        transactionId: transactionTags.transactionId,
        name: tags.name,
      })
      .from(transactionTags)
      .innerJoin(tags, eq(tags.id, transactionTags.tagId))
      .where(
        and(eq(tags.userId, userId), inArray(transactionTags.transactionId, ids)),
      ),
  ]);

  const accountNames = new Map<string, string[]>();
  const personNames = new Map<string, string>();
  const tagNames = new Map<string, string[]>();

  for (const entry of entryRows) {
    if (entry.accountName) {
      const existing = accountNames.get(entry.transactionId) ?? [];
      if (!existing.includes(entry.accountName)) {
        existing.push(entry.accountName);
      }
      accountNames.set(entry.transactionId, existing);
    }

    if (entry.personName) {
      personNames.set(entry.transactionId, entry.personName);
    }
  }

  for (const tag of tagRows) {
    const existing = tagNames.get(tag.transactionId) ?? [];
    existing.push(tag.name);
    tagNames.set(tag.transactionId, existing);
  }

  return rows.map((row) => ({
    ...row,
    accountNames: accountNames.get(row.id) ?? [],
    personName: personNames.get(row.id) ?? null,
    tagNames: tagNames.get(row.id) ?? [],
  }));
}

export async function listTransactionsForUser(
  db: Database,
  userId: string,
  options: {
    page?: number;
    pageSize?: number;
    type?: string;
    personId?: string;
  } = {},
): Promise<{ items: TransactionListItem[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(options.pageSize ?? TRANSACTION_PAGE_SIZE, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const where = and(
    eq(ledgerTransactions.userId, userId),
    options.type
      ? sql`${ledgerTransactions.type}::text = ${options.type}`
      : undefined,
    options.personId
      ? eq(ledgerTransactions.personId, options.personId)
      : undefined,
  );

  const [countRow] = await db
    .select({ total: sql<string>`count(*)` })
    .from(ledgerTransactions)
    .where(where);

  const rows = await db
    .select({
      id: ledgerTransactions.id,
      type: ledgerTransactions.type,
      occurredAt: ledgerTransactions.occurredAt,
      description: ledgerTransactions.description,
      currency: ledgerTransactions.currency,
      amountMinor: ledgerTransactions.amountMinor,
      reversedAt: ledgerTransactions.reversedAt,
    })
    .from(ledgerTransactions)
    .where(where)
    .orderBy(desc(ledgerTransactions.occurredAt), desc(ledgerTransactions.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    items: await decorateTransactions(db, userId, rows),
    total: Number(countRow?.total ?? "0"),
    page,
    pageSize,
  };
}

export async function getTransactionForUser(
  db: Database,
  userId: string,
  transactionId: string,
): Promise<TransactionDetail | null> {
  const [row] = await db
    .select({
      id: ledgerTransactions.id,
      type: ledgerTransactions.type,
      occurredAt: ledgerTransactions.occurredAt,
      description: ledgerTransactions.description,
      notes: ledgerTransactions.notes,
      currency: ledgerTransactions.currency,
      amountMinor: ledgerTransactions.amountMinor,
      reversedAt: ledgerTransactions.reversedAt,
      reversedByTransactionId: ledgerTransactions.reversedByTransactionId,
      reversesTransactionId: ledgerTransactions.reversesTransactionId,
      personId: ledgerTransactions.personId,
    })
    .from(ledgerTransactions)
    .where(
      and(
        eq(ledgerTransactions.id, transactionId),
        eq(ledgerTransactions.userId, userId),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const [decorated] = await decorateTransactions(db, userId, [row]);

  if (!decorated) {
    throw new Error("Failed to decorate transaction");
  }

  const [entryRows, links] = await Promise.all([
    db
      .select({
        id: ledgerEntries.id,
        direction: ledgerEntries.direction,
        amountMinor: ledgerEntries.amountMinor,
        currency: ledgerEntries.currency,
        accountName: accounts.name,
        personName: people.name,
        externalKind: ledgerEntries.externalKind,
      })
      .from(ledgerEntries)
      .leftJoin(accounts, eq(accounts.id, ledgerEntries.accountId))
      .leftJoin(people, eq(people.id, ledgerEntries.personId))
      .where(
        and(
          eq(ledgerEntries.userId, userId),
          eq(ledgerEntries.transactionId, transactionId),
        ),
      )
      .orderBy(asc(ledgerEntries.direction)),
    db
      .select({
        fromTransactionId: transactionLinks.fromTransactionId,
        toTransactionId: transactionLinks.toTransactionId,
        linkType: transactionLinks.linkType,
      })
      .from(transactionLinks)
      .where(
        and(
          eq(transactionLinks.userId, userId),
          sql`(${transactionLinks.fromTransactionId} = ${transactionId} or ${transactionLinks.toTransactionId} = ${transactionId})`,
        ),
      ),
  ]);

  const otherIds = links.map((link) =>
    link.fromTransactionId === transactionId
      ? link.toTransactionId
      : link.fromTransactionId,
  );

  const linkedRows =
    otherIds.length === 0
      ? []
      : await db
          .select({
            id: ledgerTransactions.id,
            description: ledgerTransactions.description,
            amountMinor: ledgerTransactions.amountMinor,
            currency: ledgerTransactions.currency,
            occurredAt: ledgerTransactions.occurredAt,
          })
          .from(ledgerTransactions)
          .where(
            and(
              eq(ledgerTransactions.userId, userId),
              inArray(ledgerTransactions.id, otherIds),
            ),
          );

  return {
    ...decorated,
    notes: row.notes,
    entries: entryRows,
    linkedTransactions: linkedRows.map((linked) => {
      const link = links.find(
        (candidate) =>
          candidate.fromTransactionId === linked.id ||
          candidate.toTransactionId === linked.id,
      );

      return { ...linked, linkType: link?.linkType ?? "correction" };
    }),
  };
}

/**
 * Signed (debit-positive) balances per account. Credit accounts report a
 * liability as a negative signed balance.
 */
export async function getAccountBalances(
  db: Database,
  userId: string,
): Promise<Map<string, bigint>> {
  const rows = await db
    .select({
      accountId: ledgerEntries.accountId,
      signed: sql<string>`sum(case when ${ledgerEntries.direction} = 'debit' then ${ledgerEntries.amountMinor} else -${ledgerEntries.amountMinor} end)`,
    })
    .from(ledgerEntries)
    .where(
      and(eq(ledgerEntries.userId, userId), isNotNull(ledgerEntries.accountId)),
    )
    .groupBy(ledgerEntries.accountId);

  const balances = new Map<string, bigint>();

  for (const row of rows) {
    if (row.accountId) {
      balances.set(row.accountId, BigInt(row.signed));
    }
  }

  return balances;
}

export type PersonBalance = {
  personId: string;
  currency: string;
  /** Positive: the person owes the user. Negative: the user owes the person. */
  netMinor: bigint;
};

export async function getPersonBalances(
  db: Database,
  userId: string,
): Promise<PersonBalance[]> {
  const rows = await db
    .select({
      personId: ledgerEntries.personId,
      currency: ledgerEntries.currency,
      net: sql<string>`sum(case when ${ledgerEntries.direction} = 'debit' then ${ledgerEntries.amountMinor} else -${ledgerEntries.amountMinor} end)`,
    })
    .from(ledgerEntries)
    .where(
      and(eq(ledgerEntries.userId, userId), isNotNull(ledgerEntries.personId)),
    )
    .groupBy(ledgerEntries.personId, ledgerEntries.currency);

  return rows
    .filter((row): row is { personId: string; currency: string; net: string } =>
      Boolean(row.personId),
    )
    .map((row) => ({
      personId: row.personId,
      currency: row.currency,
      netMinor: BigInt(row.net),
    }));
}

export type MonthlyCashFlow = {
  month: string;
  currency: string;
  incomeMinor: bigint;
  expenseMinor: bigint;
};

export async function getMonthlyCashFlow(
  db: Database,
  userId: string,
  months = 6,
): Promise<MonthlyCashFlow[]> {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCMonth(since.getUTCMonth() - (months - 1));

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${ledgerTransactions.occurredAt}), 'YYYY-MM')`,
      currency: ledgerTransactions.currency,
      type: ledgerTransactions.type,
      total: sql<string>`sum(${ledgerTransactions.amountMinor})`,
    })
    .from(ledgerTransactions)
    .where(
      and(
        eq(ledgerTransactions.userId, userId),
        inArray(ledgerTransactions.type, ["income", "expense"]),
        isNull(ledgerTransactions.reversedAt),
        gte(ledgerTransactions.occurredAt, since),
      ),
    )
    .groupBy(
      sql`date_trunc('month', ${ledgerTransactions.occurredAt})`,
      ledgerTransactions.currency,
      ledgerTransactions.type,
    )
    .orderBy(sql`date_trunc('month', ${ledgerTransactions.occurredAt})`);

  const byKey = new Map<string, MonthlyCashFlow>();

  for (const row of rows) {
    const key = `${row.month}:${row.currency}`;
    const entry = byKey.get(key) ?? {
      month: row.month,
      currency: row.currency,
      incomeMinor: 0n,
      expenseMinor: 0n,
    };

    if (row.type === "income") {
      entry.incomeMinor += BigInt(row.total);
    } else {
      entry.expenseMinor += BigInt(row.total);
    }

    byKey.set(key, entry);
  }

  return [...byKey.values()].sort((a, b) =>
    a.month === b.month
      ? a.currency.localeCompare(b.currency)
      : a.month.localeCompare(b.month),
  );
}

export type LoanOption = {
  id: string;
  kind: "given" | "received";
  personId: string;
  personName: string;
  label: string;
};

export async function listOpenLoansForUser(
  db: Database,
  userId: string,
): Promise<LoanOption[]> {
  const rows = await db
    .select({
      id: ledgerTransactions.id,
      type: ledgerTransactions.type,
      personId: ledgerTransactions.personId,
      personName: people.name,
      description: ledgerTransactions.description,
      amountMinor: ledgerTransactions.amountMinor,
      currency: ledgerTransactions.currency,
      occurredAt: ledgerTransactions.occurredAt,
    })
    .from(ledgerTransactions)
    .innerJoin(people, eq(people.id, ledgerTransactions.personId))
    .where(
      and(
        eq(ledgerTransactions.userId, userId),
        inArray(ledgerTransactions.type, ["loan_given", "loan_received"]),
        isNull(ledgerTransactions.reversedAt),
      ),
    )
    .orderBy(desc(ledgerTransactions.occurredAt));

  return rows
    .filter(
      (row): row is typeof row & { personId: string; personName: string } =>
        Boolean(row.personId) && Boolean(row.personName),
    )
    .map((row) => ({
      id: row.id,
      kind: row.type === "loan_given" ? "given" : "received",
      personId: row.personId,
      personName: row.personName,
      label: `${row.personName} · ${formatMoney(row.amountMinor, row.currency)} · ${row.description}`,
    }));
}

export async function listTransactionsForAccount(
  db: Database,
  userId: string,
  accountId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<{ items: TransactionListItem[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(options.pageSize ?? TRANSACTION_PAGE_SIZE, 1), 100);
  const page = Math.max(options.page ?? 1, 1);

  const transactionIds = db
    .select({ id: ledgerEntries.transactionId })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.userId, userId),
        eq(ledgerEntries.accountId, accountId),
      ),
    );

  const where = and(
    eq(ledgerTransactions.userId, userId),
    inArray(ledgerTransactions.id, transactionIds),
  );

  const [countRow] = await db
    .select({ total: sql<string>`count(*)` })
    .from(ledgerTransactions)
    .where(where);

  const rows = await db
    .select({
      id: ledgerTransactions.id,
      type: ledgerTransactions.type,
      occurredAt: ledgerTransactions.occurredAt,
      description: ledgerTransactions.description,
      currency: ledgerTransactions.currency,
      amountMinor: ledgerTransactions.amountMinor,
      reversedAt: ledgerTransactions.reversedAt,
    })
    .from(ledgerTransactions)
    .where(where)
    .orderBy(desc(ledgerTransactions.occurredAt), desc(ledgerTransactions.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    items: await decorateTransactions(db, userId, rows),
    total: Number(countRow?.total ?? "0"),
    page,
    pageSize,
  };
}
