import { z } from 'zod';
import { FakeLLMClient } from '../../../packages/llm/src/fake.js';
import { CompatibleLLMClient } from '../../../packages/llm/src/compatible.js';
import { simulatedPrices, type Prices } from '../../../packages/llm/src/cost.js';
const Environment = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000), HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().url(), LLM_PROVIDER: z.enum(['fake', 'compatible']).default('fake'),
  FAKE_SEED: z.coerce.number().int().default(10), LLM_TIMEOUT_MS: z.coerce.number().int().min(1).max(120000).default(5000),
});
export function configuration(env: NodeJS.ProcessEnv = process.env) {
  const result = Environment.safeParse(env);
  if (!result.success) throw new Error('Invalid environment configuration; see .env.example');
  const config = result.data;
  if (config.LLM_PROVIDER === 'fake') return { config, client: new FakeLLMClient(config.FAKE_SEED), prices: simulatedPrices };
  const required = ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_INPUT_USD_PER_MILLION', 'LLM_OUTPUT_USD_PER_MILLION', 'LLM_CACHED_USD_PER_MILLION'] as const;
  if (required.some(key => !env[key]?.trim())) throw new Error('Real provider requires URL, key, model and explicit prices');
  const price = { input: Number(env.LLM_INPUT_USD_PER_MILLION), output: Number(env.LLM_OUTPUT_USD_PER_MILLION), cached: Number(env.LLM_CACHED_USD_PER_MILLION) };
  if (Object.values(price).some(n => !Number.isFinite(n) || n < 0)) throw new Error('Invalid prices');
  const model = env.LLM_MODEL!;
  const prices: Prices = { [model]: price };
  return { config, client: new CompatibleLLMClient(model, env.LLM_BASE_URL!, env.LLM_API_KEY!), prices };
}
