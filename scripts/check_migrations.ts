import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://linked_coin:linked_coin_dev@localhost:55432/linked_coin",
  });
  const res = await pool.query("SELECT * FROM drizzle.__drizzle_migrations");
  console.log("Recorded migrations:", res.rows);
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log("Public tables:", tables.rows.map(r => r.table_name));
  await pool.end();
}

main();
