import pg from 'pg';
import { configuration } from './config.js';
import { buildApp, safeLogger } from './app.js';
import { loadPrompt } from '../../../packages/core/src/prompt.js';
import { PostgresStore } from '../../../packages/core/src/postgres.js';
const logger = safeLogger();
async function main() {
  const { config, client, prices } = configuration();
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 3000, statement_timeout: 5000, max: 10 });
  try {
    const app = await buildApp({ client, prices, store: new PostgresStore(pool), prompt: await loadPrompt('prompts/ask.md'), timeoutMs: config.LLM_TIMEOUT_MS }, logger, async () => { await pool.end(); });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close(); });
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch { await pool.end(); throw new Error('Startup failed'); }
}
main().catch(() => { logger.error('Falha ao iniciar; confira configuração, migrations e disponibilidade do banco.'); process.exitCode = 1; });
