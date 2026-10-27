import { pgTable, uuid, primaryKey, index } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { tags } from "./tags";

export const accountTags = pgTable(
  "account_tags",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.tagId] }),
    index("account_tags_tag_id_idx").on(table.tagId),
  ],
);

export type AccountTag = typeof accountTags.$inferSelect;
export type NewAccountTag = typeof accountTags.$inferInsert;
