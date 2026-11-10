import assert from 'node:assert/strict';
import pg from 'pg';
import { migrate } from '../db/migrate.js';
import { PostgresStore } from '../packages/core/src/postgres.js';
import { FakeLLMClient } from '../packages/llm/src/fake.js';
import { simulatedPrices } from '../packages/llm/src/cost.js';
import { loadPrompt } from '../packages/core/src/prompt.js';
import { ask } from '../packages/core/src/ask.js';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required; use the local Compose database');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
try {
  await migrate(pool); await migrate(pool); // Re-running migrations must be safe.
  const result = await ask('Como testar persistência?', 'postgres-manual-check', { client: new FakeLLMClient(42, ['invalid', 'valid']),
    store: new PostgresStore(pool), prices: simulatedPrices, prompt: await loadPrompt('prompts/ask.md'), timeoutMs: 1000 });
  const calls = await pool.query('SELECT * FROM llm_calls WHERE run_id=$1 ORDER BY attempt', [result.runId]);
  assert.equal(calls.rows.length, 2);
  assert.deepEqual(calls.rows.map(r => r.status), ['invalid_output', 'valid']);
  for (const call of calls.rows) { assert.equal(call.is_simulated, true); assert.ok(call.input_tokens > 0); assert.ok(Number(call.cost_usd) > 0); }
  const run = await pool.query('SELECT status, prompt_hash FROM runs WHERE id=$1', [result.runId]);
  assert.equal(run.rows[0].status, 'completed'); assert.equal(run.rows[0].prompt_hash.length, 64);
  console.log(JSON.stringify({ postgres: 'passed', migrations: 'idempotent', runId: result.runId, calls: 2 }));
} finally { await pool.end(); }
