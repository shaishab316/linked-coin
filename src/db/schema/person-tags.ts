import { pgTable, uuid, primaryKey, index } from "drizzle-orm/pg-core";
import { people } from "./people";
import { tags } from "./tags";

export const personTags = pgTable(
  "person_tags",
  {
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.personId, table.tagId] }),
    index("person_tags_tag_id_idx").on(table.tagId),
  ],
);

export type PersonTag = typeof personTags.$inferSelect;
export type NewPersonTag = typeof personTags.$inferInsert;
