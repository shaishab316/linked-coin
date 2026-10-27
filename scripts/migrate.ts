import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });

  console.log('Connecting to PostgreSQL...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure __drizzle_migrations exists
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS drizzle;
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    const existingMigrations = await client.query(
      'SELECT * FROM drizzle.__drizzle_migrations',
    );
    const existingHashes = new Set(
      existingMigrations.rows.map((r) => r.created_at?.toString()),
    );

    const migrationsDir = path.resolve(process.cwd(), 'src/db/migrations');
    const journalPath = path.join(migrationsDir, 'meta', '_journal.json');
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

    for (const entry of journal.entries) {
      const createdAtStr = entry.when.toString();
      if (existingHashes.has(createdAtStr)) {
        console.log(`Migration ${entry.tag} already applied, skipping.`);
        continue;
      }

      const sqlFile = path.join(migrationsDir, `${entry.tag}.sql`);
      if (!fs.existsSync(sqlFile)) {
        throw new Error(`Migration file not found: ${sqlFile}`);
      }

      console.log(`Applying migration ${entry.tag}...`);
      const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
      const statements = sqlContent.split('--> statement-breakpoint');

      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed) {
          await client.query(trimmed);
        }
      }

      const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');
      await client.query(
        'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [hash, entry.when],
      );
      console.log(`Migration ${entry.tag} applied successfully.`);
    }

    await client.query('COMMIT');
    console.log('All migrations applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
