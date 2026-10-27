import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { getEnv } from "../lib/config/env";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: pg.Pool | undefined;
}

function getPool(): pg.Pool {
  if (process.env.NODE_ENV === "production") {
    return new Pool({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
    });
  }

  if (!global.__dbPool) {
    global.__dbPool = new Pool({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
    });
  }

  return global.__dbPool;
}

export const pool = getPool();
export const db = drizzle(pool, { schema });
