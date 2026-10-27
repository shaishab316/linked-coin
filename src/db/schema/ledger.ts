import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { users } from "./auth";
import { people } from "./people";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
  "loan_given",
  "loan_received",
  "repayment_received",
  "repayment_made",
  "adjustment",
  "reversal",
]);

export const ledgerEntryDirectionEnum = pgEnum("ledger_entry_direction", [
  "debit",
  "credit",
]);

/**
 * Nominal ledger targets for effects that do not touch an owned account or a
 * person: income, expense, and opening-balance equity.
 */
export const externalLedgerKindEnum = pgEnum("external_ledger_kind", [
  "income",
  "expense",
  "equity",
]);

export const ledgerTransactions = pgTable(
  "ledger_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    description: text("description").notNull(),
    notes: text("notes"),
    currency: text("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    personId: uuid("person_id").references(() => people.id, {
      onDelete: "restrict",
    }),
    reversesTransactionId: uuid("reverses_transaction_id").references(
      (): AnyPgColumn => ledgerTransactions.id,
      { onDelete: "restrict" },
    ),
    reversedByTransactionId: uuid("reversed_by_transaction_id").references(
      (): AnyPgColumn => ledgerTransactions.id,
      { onDelete: "restrict" },
    ),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    // Client- or form-generated; makes retries idempotent per user.
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("ledger_transactions_user_id_idempotency_key_unique").on(
      table.userId,
      table.idempotencyKey,
    ),
    index("ledger_transactions_user_id_occurred_at_idx").on(
      table.userId,
      table.occurredAt,
      table.id,
    ),
    index("ledger_transactions_user_id_type_idx").on(table.userId, table.type),
    index("ledger_transactions_user_id_person_id_idx").on(
      table.userId,
      table.personId,
    ),
    check(
      "ledger_transactions_amount_positive_check",
      sql`${table.amountMinor} > 0`,
    ),
    check(
      "ledger_transactions_currency_format_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
  ],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => ledgerTransactions.id, { onDelete: "cascade" }),
    // Denormalized owner so every balance query can be scoped in one index.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    personId: uuid("person_id").references(() => people.id, {
      onDelete: "restrict",
    }),
    externalKind: externalLedgerKindEnum("external_kind"),
    direction: ledgerEntryDirectionEnum("direction").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ledger_entries_transaction_id_idx").on(table.transactionId),
    index("ledger_entries_user_id_account_id_idx").on(
      table.userId,
      table.accountId,
    ),
    index("ledger_entries_user_id_person_id_idx").on(
      table.userId,
      table.personId,
    ),
    check(
      "ledger_entries_single_target_check",
      sql`num_nonnulls(${table.accountId}, ${table.personId}, ${table.externalKind}) = 1`,
    ),
    check(
      "ledger_entries_amount_positive_check",
      sql`${table.amountMinor} > 0`,
    ),
    check(
      "ledger_entries_currency_format_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
  ],
);
