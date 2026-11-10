import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { buildApp } from '../../../apps/api/src/app.js';
import { FakeLLMClient } from '../../llm/src/fake.js';
import { simulatedPrices } from '../../llm/src/cost.js';
import { MemoryStore } from '../../core/src/store.js';
import { loadPrompt } from '../../core/src/prompt.js';
import { AskResponse } from '../../core/src/schema.js';
// No configuration/provider factory here: smoke can never select a paid LLM.
globalThis.fetch = () => { throw new Error('Network forbidden in smoke eval'); };
const seed = Number(process.env.FAKE_SEED ?? 10);
if (!Number.isSafeInteger(seed)) throw new Error('Invalid seed');
const cases = (await readFile('data/evals/smoke.jsonl', 'utf8')).trim().split(/\r?\n/).map(line =>
  z.object({ id: z.string(), question: z.string() }).parse(JSON.parse(line)));
if (cases.length !== 20 || new Set(cases.map(c => c.id)).size !== 20) throw new Error('Expected 20 unique cases');
const store = new MemoryStore();
const prompt = await loadPrompt('prompts/ask.md');
const app = await buildApp({ client: new FakeLLMClient(seed), prices: simulatedPrices, store, prompt, timeoutMs: 1000 });
const results: { id: string; outcome: string; attempts: number; inputTokens: number; outputTokens: number; simulatedCostUsd: number }[] = [];
try {
  for (const item of cases) {
    const before = new Set(store.calls.keys());
    const response = await app.inject({ method: 'POST', url: '/v1/ask', payload: { question: item.question } });
    const calls = [...store.calls.values()].filter(call => !before.has(call.id));
    const valid = response.statusCode === 200 && AskResponse.safeParse(response.json()).success;
    results.push({ id: item.id, outcome: !valid ? 'final_failure' : calls.length === 1 ? 'first_attempt_valid' : 'valid_after_repair',
      attempts: calls.length, inputTokens: calls.reduce((sum, c) => sum + (c.inputTokens ?? 0), 0),
      outputTokens: calls.reduce((sum, c) => sum + (c.outputTokens ?? 0), 0),
      simulatedCostUsd: Number(calls.reduce((sum, c) => sum + (c.costUsd ?? 0), 0).toFixed(10)) });
  }
} finally { await app.close(); }
const count = (outcome: string) => results.filter(r => r.outcome === outcome).length;
const report = { suite: 'smoke', seed, isSimulated: true, persistence: 'memory (PostgreSQL not exercised)',
  prompt: { id: prompt.id, version: prompt.version, hash: prompt.hash }, total: cases.length,
  firstAttemptValid: count('first_attempt_valid'), validAfterRepair: count('valid_after_repair'), finalFailure: count('final_failure'),
  finalValidRate: (cases.length - count('final_failure')) / cases.length, calls: store.calls.size,
  inputTokens: results.reduce((sum, r) => sum + r.inputTokens, 0), outputTokens: results.reduce((sum, r) => sum + r.outputTokens, 0),
  simulatedCostUsd: Number(results.reduce((sum, r) => sum + r.simulatedCostUsd, 0).toFixed(10)), results };
await mkdir('reports', { recursive: true });
await writeFile('reports/smoke.json', JSON.stringify(report, null, 2) + '\n');
await writeFile('reports/smoke.md', `# Smoke — FakeLLMClient\n\nSeed: ${seed}. Persistência em memória; não verifica PostgreSQL nem qualidade de um LLM real.\n\n| Resultado | Casos |\n|---|---:|\n| Válido na primeira tentativa | ${report.firstAttemptValid} |\n| Válido após reparo | ${report.validAfterRepair} |\n| Falha final | ${report.finalFailure} |\n\nValidade final: ${report.finalValidRate * 100}%. Chamadas: ${report.calls}. Tokens de entrada/saída: ${report.inputTokens}/${report.outputTokens}. Custo simulado: USD ${report.simulatedCostUsd}.\n`);
console.log(JSON.stringify(report, null, 2));
if (report.finalValidRate < 0.95) process.exitCode = 1;
