export interface Message { role: 'user' | 'assistant'; content: string }
export interface CompleteInput {
  system: string; messages: Message[]; schema?: Record<string, unknown>;
  tools?: unknown[]; maxTokens: number; temperature: number; timeoutMs: number;
  signal?: AbortSignal;
}
export interface Usage { inputTokens: number; outputTokens: number; cachedTokens?: number }
export interface Completion {
  text: string; toolCalls: unknown[]; usage: Usage; latencyMs: number; model: string;
}
export type StreamChunk = { type: 'token'; text: string } | { type: 'done'; completion: Completion };
export interface LLMClient {
  readonly isSimulated: boolean;
  readonly model: string;
  complete(input: CompleteInput): Promise<Completion>;
  stream?(input: CompleteInput): AsyncIterable<StreamChunk>;
}
