import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    timezone: text("timezone").notNull().default("Asia/Dhaka"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
