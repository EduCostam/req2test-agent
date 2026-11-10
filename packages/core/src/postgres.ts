import type { Pool } from 'pg';
import type { Call, Run, Store } from './store.js';
export class PostgresStore implements Store {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}
  async createRun(run: Run) {
    await this.pool.query('INSERT INTO runs (id, request_id, prompt_id, prompt_version, prompt_hash, status) VALUES ($1,$2,$3,$4,$5,$6)',
      [run.id, run.requestId, run.prompt.id, run.prompt.version, run.prompt.hash, run.status]);
  }
  async finishRun(id: string, status: string) {
    await this.pool.query('UPDATE runs SET status=$2, finished_at=now() WHERE id=$1', [id, status]);
  }
  async saveCall(c: Call) {
    await this.pool.query(`INSERT INTO llm_calls
      (id,run_id,attempt,model,is_simulated,status,input_tokens,output_tokens,cached_tokens,cost_usd,latency_ms,prompt_version)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,prompt_version FROM runs WHERE id=$2
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,model=EXCLUDED.model,input_tokens=EXCLUDED.input_tokens,
      output_tokens=EXCLUDED.output_tokens,cached_tokens=EXCLUDED.cached_tokens,cost_usd=EXCLUDED.cost_usd,latency_ms=EXCLUDED.latency_ms`,
    [c.id,c.runId,c.attempt,c.model,c.isSimulated,c.status,c.inputTokens,c.outputTokens,c.cachedTokens,c.costUsd,c.latencyMs]);
  }
  async health() { await this.pool.query('SELECT 1'); }
}
