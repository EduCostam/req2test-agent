import { describe, it, expect, vi } from 'vitest';
import { costUsd, simulatedPrices } from '../packages/llm/src/cost.js';
import { FakeLLMClient } from '../packages/llm/src/fake.js';
import { CompatibleLLMClient } from '../packages/llm/src/compatible.js';
import { completeWithTimeout } from '../packages/llm/src/timeout.js';
import type { CompleteInput } from '../packages/llm/src/types.js';
const input: CompleteInput = { system: 'system', messages: [{ role: 'user', content: 'q' }], maxTokens: 10, temperature: 0, timeoutMs: 10 };
describe('cost', () => {
  it('discounts cached tokens, without double counting', () => {
    expect(costUsd('fake-qa-v1', { inputTokens: 1000, outputTokens: 100, cachedTokens: 200 }, simulatedPrices)).toBe(0.00105);
    expect(costUsd('fake-qa-v1', { inputTokens: 0, outputTokens: 0 }, simulatedPrices)).toBe(0);
  });
  it.each([{ inputTokens: -1, outputTokens: 0 }, { inputTokens: 1, outputTokens: 0, cachedTokens: 2 },
    { inputTokens: 1.5, outputTokens: 0 }, { inputTokens: NaN, outputTokens: 0 }])('rejects malformed usage', usage => {
    expect(() => costUsd('fake-qa-v1', usage, simulatedPrices)).toThrow('Invalid usage');
  });
  it('requires prices', () => {
    expect(() => costUsd('missing', { inputTokens: 1, outputTokens: 1 }, simulatedPrices)).toThrow();
    expect(() => costUsd('bad', { inputTokens: 1, outputTokens: 1 }, { bad: { input: -1, output: 1, cached: 0 } })).toThrow();
  });
});
describe('fake reproducibility', () => {
  it('fails approximately 15% of first attempts, repairs and ignores ordering', async () => {
    const a = new FakeLLMClient(42), b = new FakeLLMClient(42), c = new FakeLLMClient(43);
    let invalid = 0, changed = 0;
    const answers: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const request = { ...input, messages: [{ role: 'user' as const, content: `question-${i}` }] };
      const result = await a.complete(request); answers.push(result.text);
      if (JSON.parse(result.text).confidence === 2) invalid++;
      if ((await c.complete(request)).text !== result.text) changed++;
    }
    for (let i = 999; i >= 0; i--) expect((await b.complete({ ...input, messages: [{ role: 'user', content: `question-${i}` }] })).text).toBe(answers[i]);
    expect(invalid / 1000).toBeGreaterThan(0.12); expect(invalid / 1000).toBeLessThan(0.18); expect(changed).toBeGreaterThan(0);
    expect(JSON.parse((await a.complete({ ...input, messages: [...input.messages, { role: 'user', content: 'repair' }] })).text).confidence).toBeLessThanOrEqual(1);
    await a.complete({ ...input, messages: [] });
  });
  it('honors already aborted signal in scripted timeout', async () => {
    await expect(new FakeLLMClient(1, ['timeout']).complete({ ...input, signal: AbortSignal.abort() })).rejects.toThrow('Aborted');
  });
  it('enforces timeout even when provider ignores AbortSignal', async () => {
    await expect(completeWithTimeout({ isSimulated: true, model: 'hang', complete: () => new Promise(() => {}) }, input)).rejects.toThrow('LLM timeout');
  });
});
describe('compatible adapter with injected transport, no network', () => {
  const payload = { choices: [{ message: { content: '{}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
  it('sends schema, tools and signal; maps response usage', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
    const client = new CompatibleLLMClient('configured-model', 'https://example.invalid/v1/', 'secret', transport);
    const result = await client.complete({ ...input, schema: { type: 'object' }, tools: [{ type: 'function' }] });
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5, cachedTokens: 0 });
    expect(result.model).toBe('configured-model'); expect(client.isSimulated).toBe(false);
    const [url, options] = transport.mock.calls[0]!;
    expect(url).toBe('https://example.invalid/v1/chat/completions');
    expect(JSON.parse(options!.body as string).response_format.json_schema.strict).toBe(true);
    expect(options!.signal).toBeInstanceOf(AbortSignal);
  });
  it('maps cached tokens and tools without a schema', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...payload,
      choices: [{ message: { content: '{}', tool_calls: [{ id: 't1' }] } }],
      usage: { ...payload.usage, prompt_tokens_details: { cached_tokens: 3 } } })));
    const client = new CompatibleLLMClient('model', 'https://example.invalid', 'secret', transport);
    const result = await client.complete({ ...input, signal: new AbortController().signal });
    expect(result.usage.cachedTokens).toBe(3); expect(result.toolCalls).toHaveLength(1);
  });
  it('rejects insecure URL and hides provider error body', async () => {
    expect(() => new CompatibleLLMClient('model', 'http://example.invalid', 'secret')).toThrow('HTTPS');
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('sensitive data', { status: 429 }));
    await expect(new CompatibleLLMClient('model', 'https://example.invalid', 'secret', transport).complete(input)).rejects.toThrow('Provider HTTP 429');
  });
  it('rejects missing usage and malformed response', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"choices":[]}'));
    await expect(new CompatibleLLMClient('model', 'https://example.invalid', 'secret', transport).complete(input)).rejects.toThrow();
  });
});
