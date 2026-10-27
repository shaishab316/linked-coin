import { pgTable, text, timestamp, uuid, index, uniqueIndex, integer, jsonb, bigserial } from "drizzle-orm/pg-core";
import { users } from "./users";
import { ledgerTransactions } from "./ledger";

export const financialEvents = pgTable(
  "financial_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequence: bigserial("sequence", { mode: "bigint" }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id").references(() => ledgerTransactions.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    deviceId: text("device_id"),
  },
  (table) => [
    uniqueIndex("financial_events_sequence_unique").on(table.sequence),
    uniqueIndex("financial_events_user_id_idempotency_key_unique").on(table.userId, table.idempotencyKey),
    index("financial_events_user_id_sequence_idx").on(table.userId, table.sequence),
    index("financial_events_transaction_id_idx").on(table.transactionId),
  ],
);

export type FinancialEvent = typeof financialEvents.$inferSelect;
export type NewFinancialEvent = typeof financialEvents.$inferInsert;
