import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnv } from "@/lib/config/env";

import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let pool: Pool | undefined;
let database: Database | undefined;

/**
 * Lazily created so that importing this module (for example during a build)
 * does not require a live database connection.
 */
export function getDb(): Database {
  if (!database) {
    const { DATABASE_URL } = getServerEnv();

    pool = new Pool({ connectionString: DATABASE_URL, max: 10 });
    database = drizzle(pool, { schema });
  }

  return database;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  database = undefined;
}

export { schema };
