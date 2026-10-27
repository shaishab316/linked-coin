import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import type { Database } from "@/db";
import * as schema from "@/db/schema";

/**
 * Integration tests run against a real PostgreSQL database. SQLite is not a
 * substitute for PostgreSQL-specific behavior such as enums and constraints.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export const hasTestDatabase = Boolean(TEST_DATABASE_URL);

export type TestContext = {
  db: Database;
  reset: () => Promise<void>;
  close: () => Promise<void>;
};

export async function createTestContext(): Promise<TestContext> {
  if (!TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is required for integration tests");
  }

  const pool = new Pool({ connectionString: TEST_DATABASE_URL, max: 1 });
  const db = drizzle(pool, { schema }) as unknown as Database;

  await migrate(db, { migrationsFolder: "src/db/migrations" });

  return {
    db,
    reset: async () => {
      await db.execute(
        sql`truncate table "sessions", "accounts", "users" restart identity cascade`,
      );
    },
    close: async () => {
      await pool.end();
    },
  };
}
