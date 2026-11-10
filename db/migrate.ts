import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
export async function migrate(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7319201)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, hash text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const name of (await readdir('db/migrations')).filter(n => n.endsWith('.sql')).sort()) {
      const sql = (await readFile(`db/migrations/${name}`, 'utf8')).replace(/\r\n/g, '\n');
      const hash = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query<{ hash: string }>('SELECT hash FROM schema_migrations WHERE name=$1', [name]);
      if (existing.rows[0]) {
        if (existing.rows[0].hash !== hash) throw new Error('Applied migration was modified');
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name,hash) VALUES ($1,$2)', [name, hash]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
  try { await migrate(pool); } finally { await pool.end(); }
}
