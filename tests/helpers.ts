import { FakeLLMClient, type FakeStep } from '../packages/llm/src/fake.js';
import { MemoryStore } from '../packages/core/src/store.js';
import { loadPrompt } from '../packages/core/src/prompt.js';
import { simulatedPrices } from '../packages/llm/src/cost.js';
export async function dependencies(script: FakeStep[] = ['valid']) {
  return { client: new FakeLLMClient(42, script), store: new MemoryStore(),
    prompt: await loadPrompt('prompts/ask.md'), prices: simulatedPrices, timeoutMs: 20 };
}
