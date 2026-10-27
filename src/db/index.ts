import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { getEnv } from "../lib/config/env";
import { getMemoryDatabase } from "./memory-db";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: pg.Pool | undefined;
}

const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

function getPool(): pg.Pool {
  if (isTestEnv) {
    return getMemoryDatabase().pool;
  }

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
export const db = isTestEnv ? getMemoryDatabase().db : drizzle(pool, { schema });
