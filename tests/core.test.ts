import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ask } from '../packages/core/src/ask.js';
import { loadPrompt } from '../packages/core/src/prompt.js';
import { PostgresStore } from '../packages/core/src/postgres.js';
import { dependencies } from './helpers.js';

describe('controlled generation and persistence', () => {
  it('saves a valid run, prompt identity, usage and simulated cost', async () => {
    const deps = await dependencies();
    const result = await ask('Como testar limites?', 'request-1', deps);
    expect(result.attempts).toBe(1);
    expect(result.response.sources).toEqual([]);
    expect(deps.store.runs.get(result.runId)).toMatchObject({ status: 'completed', requestId: 'request-1', prompt: { version: '1.0.0' } });
    expect([...deps.store.calls.values()][0]).toMatchObject({ status: 'valid', isSimulated: true, model: 'fake-qa-v1' });
    expect([...deps.store.calls.values()][0]!.costUsd).toBeGreaterThan(0);
    await deps.store.health();
  });
  it.each([1, 2])('repairs %i invalid outputs and accounts for every attempt', async invalid => {
    const deps = await dependencies([...Array.from({ length: invalid }, () => 'invalid' as const), 'valid']);
    const events: string[] = [];
    const result = await ask('question', 'request', deps, status => events.push(status));
    expect(result.attempts).toBe(invalid + 1);
    expect(deps.store.calls.size).toBe(invalid + 1);
    expect([...deps.store.calls.values()].filter(c => c.status === 'invalid_output')).toHaveLength(invalid);
    expect(events[0]).toBe('generating'); expect(events[1]).toBe('repairing');
  });
  it('fails after exactly three calls', async () => {
    const deps = await dependencies(['invalid', 'invalid', 'invalid', 'valid']);
    await expect(ask('question', 'request', deps)).rejects.toMatchObject({ code: 'INVALID_LLM_OUTPUT', statusCode: 502 });
    expect(deps.store.calls.size).toBe(3);
    expect([...deps.store.runs.values()][0]!.status).toBe('failed');
  });
  it.each(['timeout', 'error'] as const)('persists %s without fabricating token usage', async step => {
    const deps = await dependencies([step]);
    await expect(ask('question', 'request', deps)).rejects.toMatchObject({ code: step === 'timeout' ? 'LLM_TIMEOUT' : 'LLM_ERROR' });
    const call = [...deps.store.calls.values()][0]!;
    expect(call.inputTokens).toBeNull(); expect(call.costUsd).toBeNull();
    expect(call.status).toBe(step === 'timeout' ? 'timeout' : 'provider_error');
    expect([...deps.store.runs.values()][0]!.status).toBe('failed');
  });
  it.each(['bad json', 'invented source', 'tool call'])('rejects %s before responding', async scenario => {
    const deps = await dependencies();
    const original = deps.client.complete.bind(deps.client);
    vi.spyOn(deps.client, 'complete').mockImplementation(async input => {
      const result = await original(input);
      if (scenario === 'bad json') result.text = 'not-json';
      if (scenario === 'invented source') result.text = JSON.stringify({ ...JSON.parse(result.text), sources: ['fake-doc'] });
      if (scenario === 'tool call') result.toolCalls = [{ name: 'delete' }];
      return result;
    });
    await expect(ask('question', 'request', deps)).rejects.toMatchObject({ code: 'INVALID_LLM_OUTPUT' });
  });
  it('propagates persistence failures instead of reporting success', async () => {
    const deps = await dependencies();
    vi.spyOn(deps.store, 'saveCall').mockRejectedValue(new Error('database down'));
    await expect(ask('question', 'request', deps)).rejects.toThrow('database down');
    expect([...deps.store.runs.values()][0]!.status).toBe('failed');
  });
});
describe('prompt loader', () => {
  it('normalizes CRLF, hashes content and requires metadata', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qa-prompts-'));
    try {
      const file = join(dir, 'ask.md');
      await writeFile(file, '---\nid: demo\nversion: 1.0\n---\nHello');
      const first = await loadPrompt(file);
      await writeFile(file, '---\r\nid: demo\r\nversion: 1.0\r\n---\r\nHello');
      expect(await loadPrompt(file)).toEqual(first);
      await writeFile(file, '---\nid: demo\nversion: 1.0\n---\nChanged');
      expect((await loadPrompt(file)).hash).not.toBe(first.hash);
      await writeFile(file, 'no metadata');
      await expect(loadPrompt(file)).rejects.toThrow('front matter');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
describe('Postgres query contract (not a real database integration test)', () => {
  it('parameterizes identifiers, records is_simulated and upserts calls', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const store = new PostgresStore({ query });
    const deps = await dependencies(['invalid', 'valid']);
    await ask('question', "request'; DROP TABLE runs;--", { ...deps, store });
    expect(query.mock.calls[0]![0]).not.toContain('DROP TABLE');
    expect(query.mock.calls[0]![1][1]).toContain('DROP TABLE');
    const insert = query.mock.calls.find(c => String(c[0]).includes('INSERT INTO llm_calls'))!;
    expect(insert[0]).toContain('is_simulated'); expect(insert[1][4]).toBe(true);
    expect(insert[0]).toContain('ON CONFLICT');
    await store.health(); expect(query).toHaveBeenLastCalledWith('SELECT 1');
  });
});
