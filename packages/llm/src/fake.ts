import { createHash } from 'node:crypto';
import type { CompleteInput, Completion, LLMClient } from './types.js';

export type FakeStep = 'valid' | 'invalid' | 'timeout' | 'error';
export class FakeLLMClient implements LLMClient {
  readonly isSimulated = true;
  readonly model = 'fake-qa-v1';
  private cursor = 0;
  constructor(readonly seed = 10, private readonly script: FakeStep[] = []) {}
  async complete(input: CompleteInput): Promise<Completion> {
    const question = input.messages[0]?.content ?? '';
    const bucket = createHash('sha256').update(`${this.seed}:${question}`).digest().readUInt32BE(0) % 100;
    // Hash per question: concurrency/order never changes which first attempts fail.
    const step = this.script[this.cursor++] ?? (input.messages.length === 1 && bucket < 15 ? 'invalid' : 'valid');
    if (step === 'error') throw new Error('Simulated provider failure');
    if (step === 'timeout') return new Promise((_resolve, reject) => {
      const abort = () => reject(new Error('Aborted'));
      if (input.signal?.aborted) abort();
      else input.signal?.addEventListener('abort', abort, { once: true });
    });
    const text = step === 'invalid' ? '{"answer":42,"confidence":2}' : JSON.stringify({
      answer: 'Resposta simulada: cubra o caminho feliz, valores limite e entradas inválidas; confronte os resultados com os requisitos.',
      confidence: 0.5, assumptions: ['Simulação determinística; não representa análise de um modelo real.'], sources: [],
    });
    return { text, toolCalls: [], model: this.model, latencyMs: 1,
      usage: { inputTokens: Math.ceil((input.system.length + input.messages.map(m => m.content).join('').length) / 4),
        outputTokens: Math.ceil(text.length / 4), cachedTokens: 0 } };
  }
}
