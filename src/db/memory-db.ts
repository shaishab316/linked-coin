import { newDb, DataType } from "pg-mem";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import type pg from "pg";

export interface MemoryDatabaseResult {
  pool: pg.Pool;
  db: ReturnType<typeof drizzle<typeof schema>>;
  memDb: ReturnType<typeof newDb>;
}

let cachedMemoryDb: MemoryDatabaseResult | undefined;

export function createMemoryDatabase(): MemoryDatabaseResult {
  const memDb = newDb();

  // 1. Register gen_random_uuid()
  memDb.public.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.text,
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  // 2. Register num_nonnulls(...)
  memDb.public.registerFunction({
    name: "num_nonnulls",
    args: [DataType.text, DataType.text, DataType.text],
    returns: DataType.integer,
    implementation: (...args: unknown[]) => args.filter((a) => a !== null && a !== undefined).length,
  });

  // 3. Register to_char(...) for date formatting
  memDb.public.registerFunction({
    name: "to_char",
    args: [DataType.timestamp, DataType.text],
    returns: DataType.text,
    implementation: (val: unknown, fmt: string) => {
      const d = new Date(val as string | number | Date);
      if (isNaN(d.getTime())) return null;
      if (fmt === "YYYY-MM-DD") return d.toISOString().slice(0, 10);
      if (fmt === "YYYY-MM") return d.toISOString().slice(0, 7);
      if (fmt === "YYYY") return String(d.getUTCFullYear());
      return d.toISOString();
    },
  });

  // 4. Register date_trunc(...) for week / date grouping
  memDb.public.registerFunction({
    name: "date_trunc",
    args: [DataType.text, DataType.timestamp],
    returns: DataType.timestamp,
    implementation: (part: string, val: unknown) => {
      const d = new Date(val as string | number | Date);
      if (part === "week") {
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        mon.setUTCHours(0, 0, 0, 0);
        return mon.toISOString();
      }
      return d.toISOString();
    },
  });

  const migrationsDir = join(process.cwd(), "src/db/migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  const createdTables = new Set<string>();
  const createdIndexes = new Set<string>();

  for (const file of files) {
    const content = readFileSync(join(migrationsDir, file), "utf-8");
    const statements = content.split("--> statement-breakpoint");
    for (const statement of statements) {
      let trimmed = statement.trim();
      if (!trimmed) continue;

      // Skip plpgsql triggers, functions, and DO $$ blocks (pg-mem doesn't execute plpgsql)
      if (
        /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i.test(trimmed) ||
        /CREATE\s+(?:CONSTRAINT\s+)?TRIGGER/i.test(trimmed) ||
        /DROP\s+(?:CONSTRAINT\s+)?TRIGGER/i.test(trimmed) ||
        /DROP\s+FUNCTION/i.test(trimmed) ||
        /^DO\s+\$\$/i.test(trimmed)
      ) {
        continue;
      }

      // Skip ALTER TABLE ADD/DROP CONSTRAINT ... CHECK ...
      if (/ALTER\s+TABLE\s+.*(?:ADD|DROP)\s+CONSTRAINT\s+.*(?:CHECK|_check)/i.test(trimmed)) {
        continue;
      }

      // Check if table already created
      const tableMatch = trimmed.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?/i);
      if (tableMatch) {
        const tableName = tableMatch[1].toLowerCase();
        if (createdTables.has(tableName)) {
          continue;
        }
        createdTables.add(tableName);
      }

      // Check if index already created
      const indexMatch = trimmed.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?/i);
      if (indexMatch) {
        const indexName = indexMatch[1].toLowerCase();
        if (createdIndexes.has(indexName)) {
          continue;
        }
        createdIndexes.add(indexName);
      }

      // Filter out table CHECK constraints lines
      const lines = trimmed.split("\n");
      const filteredLines = lines.filter((line) => {
        const l = line.trim();
        return !(l.startsWith("CONSTRAINT") && l.includes("CHECK"));
      });
      trimmed = filteredLines.join("\n");

      // Clean trailing comma before closing parenthesis
      trimmed = trimmed.replace(/,\s*(\r?\n\s*\))/g, "$1");
      trimmed = trimmed.replace(/,\s*\)/g, ")");

      // Remove IF NOT EXISTS for pg-mem compatibility
      trimmed = trimmed.replace(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+/gi, "CREATE TABLE ");
      trimmed = trimmed.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+/gi, "CREATE $1INDEX ");

      if (!trimmed.trim()) continue;
      try {
        memDb.public.none(trimmed);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already exists") || msg.includes("does not exist")) {
          continue;
        }
        throw err;
      }
    }
  }

  const pgAdapter = memDb.adapters.createPg();

  const wrapQuery = (origQuery: any) => {
    return async function (this: any, query: any, ...args: any[]) {
      let isRowModeArray = false;
      if (typeof query === "object" && query !== null) {
        if ("types" in query) {
          delete (query as Record<string, unknown>).types;
        }
        if (query.rowMode === "array") {
          isRowModeArray = true;
          delete query.rowMode;
        }
      }
      const result = await origQuery.call(this, query, ...args);
      if (isRowModeArray && result && Array.isArray(result.rows)) {
        result.rows = result.rows.map((row: any) => {
          if (Array.isArray(row)) return row;
          if (typeof row === "object" && row !== null) {
            return Object.values(row);
          }
          return row;
        });
      }
      return result;
    };
  };

  pgAdapter.Client.prototype.query = wrapQuery(pgAdapter.Client.prototype.query);
  pgAdapter.Pool.prototype.query = wrapQuery(pgAdapter.Pool.prototype.query);

  const pool = new pgAdapter.Pool() as unknown as pg.Pool;
  const db = drizzle(pool, { schema });

  return { pool, db, memDb };
}

export function getMemoryDatabase(): MemoryDatabaseResult {
  if (!cachedMemoryDb) {
    cachedMemoryDb = createMemoryDatabase();
  }
  return cachedMemoryDb;
}
