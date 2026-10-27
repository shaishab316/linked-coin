import { pgTable, text, timestamp, uuid, uniqueIndex, bigint } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const syncDevices = pgTable(
  "sync_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    deviceName: text("device_name"),
    lastSyncCursor: bigint("last_sync_cursor", { mode: "bigint" }).default(sql`0`).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sync_devices_user_device_idx").on(table.userId, table.deviceId),
  ],
);

export type SyncDevice = typeof syncDevices.$inferSelect;
export type NewSyncDevice = typeof syncDevices.$inferInsert;
