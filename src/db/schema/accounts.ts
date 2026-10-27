import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "savings",
  "digital_wallet",
  "credit",
  "custom",
]);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    accountType: accountTypeEnum("account_type").notNull(),
    currency: text("currency").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    index("accounts_user_id_archived_at_idx").on(table.userId, table.archivedAt),
  ],
);
