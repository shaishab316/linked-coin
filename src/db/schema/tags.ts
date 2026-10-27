import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

/**
 * Tag names keep their display casing; `normalizedName` provides
 * case-insensitive uniqueness per user and drives lookups.
 */
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    description: text("description"),
    parentId: uuid("parent_id").references((): AnyPgColumn => tags.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("tags_user_id_normalized_name_unique").on(
      table.userId,
      table.normalizedName,
    ),
    index("tags_user_id_parent_id_idx").on(table.userId, table.parentId),
    check("tags_name_not_blank_check", sql`length(btrim(${table.name})) > 0`),
  ],
);
