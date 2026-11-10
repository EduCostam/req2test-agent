import { z } from 'zod';
import type { CompleteInput, Completion, LLMClient } from './types.js';
const ProviderResponse = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string(), tool_calls: z.array(z.unknown()).optional() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative(),
    prompt_tokens_details: z.object({ cached_tokens: z.number().int().nonnegative() }).optional() }),
});
export class CompatibleLLMClient implements LLMClient {
  readonly isSimulated = false;
  constructor(readonly model: string, private readonly baseUrl: string, private readonly apiKey: string,
    private readonly transport: typeof fetch = fetch) {
    if (new URL(baseUrl).protocol !== 'https:') throw new Error('Provider URL must use HTTPS');
  }
  async complete(input: CompleteInput): Promise<Completion> {
    const start = performance.now();
    const response = await this.transport(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: input.signal ?? AbortSignal.timeout(input.timeoutMs),
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages: [{ role: 'system', content: input.system }, ...input.messages],
        max_tokens: input.maxTokens, temperature: input.temperature,
        ...(input.tools?.length ? { tools: input.tools } : {}),
        ...(input.schema ? { response_format: { type: 'json_schema', json_schema: { name: 'ask_response', strict: true, schema: input.schema } } } : {}),
      }),
    });
    // Never propagate response bodies: provider errors may contain user data or secrets.
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    const body = ProviderResponse.parse(await response.json());
    const message = body.choices[0]!.message;
    return { text: message.content, toolCalls: message.tool_calls ?? [], model: this.model,
      usage: { inputTokens: body.usage.prompt_tokens, outputTokens: body.usage.completion_tokens,
        cachedTokens: body.usage.prompt_tokens_details?.cached_tokens ?? 0 }, latencyMs: performance.now() - start };
  }
}
