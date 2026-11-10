import { it, expect, vi } from 'vitest';
import type pg from 'pg';
import { migrate } from '../db/migrate.js';
it('applies SQL once, then validates checksum with transaction and lock', async () => {
  let savedHash: string | undefined;
  const query = vi.fn(async (sql: string, args?: unknown[]) => {
    if (sql.startsWith('SELECT hash')) return { rows: savedHash ? [{ hash: savedHash }] : [] };
    if (sql.startsWith('INSERT INTO schema_migrations')) savedHash = String(args![1]);
    return { rows: [] };
  });
  const release = vi.fn();
  const pool = { connect: async () => ({ query, release }) } as unknown as pg.Pool;
  await migrate(pool); await migrate(pool);
  expect(query.mock.calls.filter(c => c[0].startsWith('CREATE TABLE runs'))).toHaveLength(1);
  expect(query.mock.calls.filter(c => c[0] === 'COMMIT')).toHaveLength(2);
  expect(query.mock.calls.some(c => c[0].includes('pg_advisory_xact_lock'))).toBe(true);
  expect(release).toHaveBeenCalledTimes(2);
  savedHash = 'changed';
  await expect(migrate(pool)).rejects.toThrow('modified');
  expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(release).toHaveBeenCalledTimes(3);
});
it('rolls back and releases the connection on SQL failure', async () => {
  const query = vi.fn(async (sql: string) => { if (sql.startsWith('CREATE TABLE IF')) throw new Error('SQL failure'); return { rows: [] }; });
  const release = vi.fn();
  await expect(migrate({ connect: async () => ({ query, release }) } as unknown as pg.Pool)).rejects.toThrow('SQL failure');
  expect(query).toHaveBeenLastCalledWith('ROLLBACK'); expect(release).toHaveBeenCalledOnce();
});
