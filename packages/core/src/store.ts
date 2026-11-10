import type { Prompt } from './prompt.js';
export interface Run { id: string; requestId: string; prompt: Prompt; status: string }
export interface Call {
  id: string; runId: string; attempt: number; model: string; isSimulated: boolean;
  status: string; inputTokens: number | null; outputTokens: number | null; cachedTokens: number | null;
  costUsd: number | null; latencyMs: number | null;
}
export interface Store {
  createRun(run: Run): Promise<void>;
  finishRun(id: string, status: string): Promise<void>;
  saveCall(call: Call): Promise<void>;
  health(): Promise<void>;
}
// Used only in isolated tests/evals; production always requires PostgreSQL.
export class MemoryStore implements Store {
  runs = new Map<string, Run>();
  calls = new Map<string, Call>();
  async createRun(run: Run) { this.runs.set(run.id, { ...run }); }
  async finishRun(id: string, status: string) { this.runs.get(id)!.status = status; }
  async saveCall(call: Call) { this.calls.set(call.id, { ...call }); }
  async health() { /* No external resource in isolated tests. */ }
}
