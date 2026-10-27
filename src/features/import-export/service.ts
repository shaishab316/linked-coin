import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  accounts,
  people,
  tags,
  ledgerTransactions,
  ledgerEntries,
  financialEvents,
} from "../../db/schema";
import { searchTransactions } from "../query-builder/service";
import { createTransaction } from "../ledger/service";
import { minorToDecimalString, DEFAULT_CURRENCY } from "../../lib/money/money";
import { toIsoUtc } from "../../lib/dates/format";
import type { ValidatedQueryAst } from "../query-builder/validation";

/**
 * Escapes CSV values against formula injection (DDE attacks).
 * Values starting with =, +, -, @ are prepended with an apostrophe.
 */
export function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportTransactionsCsv(
  userId: string,
  ast: ValidatedQueryAst = {
    limit: 1000,
    offset: 0,
    sort: { field: "occurredAt", direction: "desc" },
  },
): Promise<string> {
  const result = await searchTransactions(userId, {
    ...ast,
    limit: 5000,
    offset: 0,
    sort: ast.sort || { field: "occurredAt", direction: "desc" },
  });

  const headers = [
    "ID",
    "Occurred At",
    "Type",
    "Description",
    "Currency",
    "Amount",
    "Tags",
    "Notes",
    "Status",
  ];

  const rows = result.items.map((tx) => [
    sanitizeCsvValue(tx.id),
    sanitizeCsvValue(tx.occurredAt.toISOString()),
    sanitizeCsvValue(tx.type),
    sanitizeCsvValue(tx.description),
    sanitizeCsvValue(tx.currency),
    sanitizeCsvValue(minorToDecimalString(tx.amountMinor, tx.currency)),
    sanitizeCsvValue(tx.tags.map((t) => t.name).join("; ")),
    sanitizeCsvValue(tx.notes || ""),
    sanitizeCsvValue(tx.reversedAt ? "Reversed" : "Completed"),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

export async function exportFullJsonBackup(userId: string): Promise<string> {
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const userPeople = await db.select().from(people).where(eq(people.userId, userId));
  const userTags = await db.select().from(tags).where(eq(tags.userId, userId));
  const userTransactions = await db
    .select()
    .from(ledgerTransactions)
    .where(eq(ledgerTransactions.userId, userId));
  const userEntries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.userId, userId));
  const userEvents = await db
    .select()
    .from(financialEvents)
    .where(eq(financialEvents.userId, userId));

  const backupData = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    accounts: userAccounts,
    people: userPeople,
    tags: userTags,
    transactions: userTransactions.map((tx) => ({
      ...tx,
      amountMinor: tx.amountMinor.toString(),
    })),
    entries: userEntries.map((e) => ({
      ...e,
      amountMinor: e.amountMinor.toString(),
    })),
    financialEvents: userEvents.map((ev) => ({
      ...ev,
      sequence: ev.sequence.toString(),
    })),
  };

  return JSON.stringify(backupData, null, 2);
}

export interface CsvImportRow {
  date: string;
  type: "income" | "expense" | "transfer";
  description: string;
  amount: string;
  currency?: string;
  accountId: string;
  destinationAccountId?: string;
  notes?: string;
}

export async function importTransactionsCsv(
  userId: string,
  rows: CsvImportRow[],
): Promise<{ importedCount: number; errors: Array<{ row: number; error: string }> }> {
  let importedCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const currency = row.currency || DEFAULT_CURRENCY;
      const idempotencyKey = `import_${userId}_${row.date}_${row.amount}_${i}_${crypto.randomUUID()}`;

      await createTransaction(userId, {
        type: row.type,
        amount: row.amount,
        currency,
        description: row.description,
        notes: row.notes,
        occurredAt: toIsoUtc(row.date),
        sourceAccountId: row.type === "expense" || row.type === "transfer" ? row.accountId : null,
        destinationAccountId:
          row.type === "income"
            ? row.accountId
            : row.type === "transfer"
              ? row.destinationAccountId || null
              : null,
        idempotencyKey,
      });

      importedCount++;
    } catch (err: any) {
      errors.push({
        row: i + 1,
        error: err?.message || "Failed to import row",
      });
    }
  }

  return { importedCount, errors };
}
