import { pgTable, text, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { ledgerTransactions } from "./ledger";

export const LINK_TYPES = ["repayment", "reversal", "correction"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const transactionLinks = pgTable(
  "transaction_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromTransactionId: uuid("from_transaction_id")
      .notNull()
      .references(() => ledgerTransactions.id, { onDelete: "cascade" }),
    toTransactionId: uuid("to_transaction_id")
      .notNull()
      .references(() => ledgerTransactions.id, { onDelete: "cascade" }),
    linkType: text("link_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("transaction_links_unique").on(table.fromTransactionId, table.toTransactionId, table.linkType),
    index("transaction_links_to_transaction_id_idx").on(table.toTransactionId),
    index("transaction_links_user_id_idx").on(table.userId),
  ],
);

export type TransactionLink = typeof transactionLinks.$inferSelect;
export type NewTransactionLink = typeof transactionLinks.$inferInsert;
