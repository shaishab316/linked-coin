import { pgTable, text, timestamp, uuid, index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { users } from "./users";

export const TAG_TYPES = ["transaction", "person", "account"] as const;
export type TagType = (typeof TAG_TYPES)[number];

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    tagType: text("tag_type").notNull().default("transaction"),
    description: text("description"),
    parentId: uuid("parent_id").references((): AnyPgColumn => tags.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("tags_user_id_normalized_name_type_unique").on(table.userId, table.normalizedName, table.tagType),
    index("tags_user_id_parent_id_idx").on(table.userId, table.parentId),
    index("tags_user_id_idx").on(table.userId),
    index("tags_user_id_tag_type_idx").on(table.userId, table.tagType),
  ],
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
