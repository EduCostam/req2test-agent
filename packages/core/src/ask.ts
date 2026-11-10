import { randomUUID } from 'node:crypto';
import type { LLMClient, Message } from '../../llm/src/types.js';
import { costUsd, type Prices } from '../../llm/src/cost.js';
import { completeWithTimeout, LLMTimeoutError } from '../../llm/src/timeout.js';
import { AskResponse, jsonSchema } from './schema.js';
import type { Prompt } from './prompt.js';
import type { Call, Store } from './store.js';
export class AskError extends Error {
  constructor(readonly code: string, readonly statusCode: number, message: string) { super(message); }
}
export interface AskDependencies { client: LLMClient; store: Store; prompt: Prompt; prices: Prices; timeoutMs: number }
export interface AskResult { response: AskResponse; runId: string; attempts: number }
export async function ask(question: string, requestId: string, deps: AskDependencies,
  event: (status: string) => void = () => {}): Promise<AskResult> {
  const { client, store, prompt, prices, timeoutMs } = deps;
  const runId = randomUUID();
  await store.createRun({ id: runId, requestId, prompt, status: 'running' });
  const messages: Message[] = [{ role: 'user', content: question }];
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      event(attempt === 1 ? 'generating' : 'repairing');
      const call: Call = { id: randomUUID(), runId, attempt, model: client.model, isSimulated: client.isSimulated,
        status: 'running', inputTokens: null, outputTokens: null, cachedTokens: null, costUsd: null, latencyMs: null };
      await store.saveCall(call);
      const start = performance.now();
      let text: string;
      let hasTools: boolean;
      try {
        const result = await completeWithTimeout(client, { system: prompt.text, messages: [...messages],
          schema: jsonSchema(AskResponse), maxTokens: 2048, temperature: 0, timeoutMs });
        text = result.text;
        hasTools = result.toolCalls.length > 0;
        Object.assign(call, { model: result.model, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens,
          cachedTokens: result.usage.cachedTokens ?? 0, latencyMs: result.latencyMs });
        call.costUsd = costUsd(result.model, result.usage, prices);
      } catch (error) {
        call.status = error instanceof LLMTimeoutError ? 'timeout' : 'provider_error';
        call.latencyMs = performance.now() - start;
        await store.saveCall(call);
        throw new AskError(call.status === 'timeout' ? 'LLM_TIMEOUT' : 'LLM_ERROR', call.status === 'timeout' ? 504 : 502,
          call.status === 'timeout' ? 'Tempo limite do modelo excedido.' : 'Falha na chamada ao modelo.');
      }
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = undefined; }
      const validated = AskResponse.safeParse(parsed);
      // No retrieval exists in Phase 1; invented sources/tool calls must not be accepted.
      const valid = validated.success && validated.data.sources.length === 0 && !hasTools;
      call.status = valid ? 'valid' : 'invalid_output';
      await store.saveCall(call);
      if (valid && validated.success) {
        await store.finishRun(runId, 'completed');
        return { response: validated.data, runId, attempts: attempt };
      }
      messages.push({ role: 'assistant', content: text.slice(0, 16000) },
        { role: 'user', content: 'Repare a resposta anterior: retorne apenas JSON conforme o schema, sem ferramentas e com sources vazio. Não acrescente fatos.' });
    }
    throw new AskError('INVALID_LLM_OUTPUT', 502, 'Resposta inválida após duas tentativas de reparo.');
  } catch (error) {
    await store.finishRun(runId, 'failed');
    throw error;
  }
}
