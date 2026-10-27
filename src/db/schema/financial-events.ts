import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { ledgerTransactions } from "./ledger";

/**
 * Append-only, immutable record of accepted financial commands. The
 * `sequence` column is the server-controlled synchronization cursor.
 */
export const financialEvents = pgTable(
  "financial_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequence: bigserial("sequence", { mode: "number" }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id").references(
      () => ledgerTransactions.id,
      { onDelete: "restrict" },
    ),
    eventType: text("event_type").notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    deviceId: text("device_id"),
  },
  (table) => [
    uniqueIndex("financial_events_sequence_unique").on(table.sequence),
    uniqueIndex("financial_events_user_id_idempotency_key_unique").on(
      table.userId,
      table.idempotencyKey,
    ),
    index("financial_events_user_id_sequence_idx").on(
      table.userId,
      table.sequence,
    ),
    index("financial_events_transaction_id_idx").on(table.transactionId),
  ],
);

export type FinancialEventPayload = {
  transactionId: string;
  transactionType: string;
  amountMinor: string;
  currency: string;
  occurredAt: string;
};
