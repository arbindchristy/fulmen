import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDatabasePool } from './client.js';
import { loadEnv } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations(): Promise<void> {
  const env = loadEnv();
  const pool = createDatabasePool(env.databaseUrl);
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  let inTransaction = false;

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of migrationFiles) {
      const existing = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [file],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      inTransaction = true;
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      inTransaction = false;

      console.log(`Applied migration ${file}`);
    }
  } catch (error) {
    if (inTransaction) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
