import { pgTable, text, timestamp, uuid, index, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { people } from "./people";

export const sharedPersonLinks = pgTable(
  "shared_person_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    label: text("label"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    accessCount: integer("access_count").default(0).notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shared_person_links_token_unique").on(table.token),
    index("shared_person_links_user_person_idx").on(table.userId, table.personId),
    index("shared_person_links_person_id_idx").on(table.personId),
  ],
);

export type SharedPersonLink = typeof sharedPersonLinks.$inferSelect;
export type NewSharedPersonLink = typeof sharedPersonLinks.$inferInsert;
