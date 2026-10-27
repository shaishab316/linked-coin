import { pgTable, text, timestamp, uuid, index, uniqueIndex, bigint, type AnyPgColumn } from "drizzle-orm/pg-core";
import { users } from "./users";
import { accounts } from "./accounts";
import { people } from "./people";

export const TRANSACTION_TYPES = [
  "income",
  "expense",
  "transfer",
  "loan_given",
  "loan_received",
  "repayment_received",
  "repayment_made",
  "adjustment",
  "reversal",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const EXTERNAL_LEDGER_KINDS = ["income", "expense", "equity"] as const;
export type ExternalLedgerKind = (typeof EXTERNAL_LEDGER_KINDS)[number];

export const ENTRY_DIRECTIONS = ["debit", "credit"] as const;
export type EntryDirection = (typeof ENTRY_DIRECTIONS)[number];

export const ledgerTransactions = pgTable(
  "ledger_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    description: text("description").notNull(),
    notes: text("notes"),
    currency: text("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
    reversesTransactionId: uuid("reverses_transaction_id").references(
      (): AnyPgColumn => ledgerTransactions.id,
      { onDelete: "restrict" },
    ),
    reversedByTransactionId: uuid("reversed_by_transaction_id").references(
      (): AnyPgColumn => ledgerTransactions.id,
      { onDelete: "restrict" },
    ),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ledger_transactions_user_id_idempotency_key_unique").on(table.userId, table.idempotencyKey),
    index("ledger_transactions_user_id_occurred_at_idx").on(table.userId, table.occurredAt, table.id),
    index("ledger_transactions_user_id_type_idx").on(table.userId, table.type),
    index("ledger_transactions_user_id_person_id_idx").on(table.userId, table.personId),
  ],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => ledgerTransactions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "restrict" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
    externalKind: text("external_kind"), // 'income' | 'expense' | 'equity'
    direction: text("direction").notNull(), // 'debit' | 'credit'
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ledger_entries_transaction_id_idx").on(table.transactionId),
    index("ledger_entries_user_id_account_id_idx").on(table.userId, table.accountId),
    index("ledger_entries_user_id_person_id_idx").on(table.userId, table.personId),
  ],
);

export type LedgerTransaction = typeof ledgerTransactions.$inferSelect;
export type NewLedgerTransaction = typeof ledgerTransactions.$inferInsert;

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
