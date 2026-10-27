import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { ledgerTransactions } from "./ledger";

export const transactionLinkTypeEnum = pgEnum("transaction_link_type", [
  "repayment",
  "reversal",
  "correction",
]);

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
    linkType: transactionLinkTypeEnum("link_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("transaction_links_unique").on(
      table.fromTransactionId,
      table.toTransactionId,
      table.linkType,
    ),
    index("transaction_links_to_transaction_id_idx").on(
      table.toTransactionId,
    ),
    index("transaction_links_user_id_idx").on(table.userId),
  ],
);
