import type { CompleteInput, Completion, LLMClient } from './types.js';
export class LLMTimeoutError extends Error {}
export async function completeWithTimeout(client: LLMClient, input: CompleteInput): Promise<Completion> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      client.complete({ ...input, signal: controller.signal }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new LLMTimeoutError('LLM timeout'));
          controller.abort();
        }, input.timeoutMs);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
