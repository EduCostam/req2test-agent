import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ajv } from 'ajv';
import pino from 'pino';
import { Writable } from 'node:stream';
import { buildApp } from '../apps/api/src/app.js';
import { configuration } from '../apps/api/src/config.js';
import { dependencies } from './helpers.js';
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
async function setup(script: Parameters<typeof dependencies>[0] = ['valid']) {
  const deps = await dependencies(script); const app = await buildApp(deps); apps.push(app); return { app, deps };
}
describe('HTTP contract', () => {
  it('registers resource cleanup before readiness', async () => {
    const cleanup = vi.fn(async () => {});
    const app = await buildApp(await dependencies(), false, cleanup);
    await app.close(); expect(cleanup).toHaveBeenCalledOnce();
  });
  it('serves health, web UI and validated JSON with request/run IDs', async () => {
    const { app } = await setup();
    expect((await app.inject('/health')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/')).body).toContain('Assistente de QA');
    const result = await app.inject({ method: 'POST', url: '/v1/ask', payload: { question: 'Como testar?' } });
    expect(result.statusCode).toBe(200); expect(result.headers['x-request-id']).toBeTruthy(); expect(result.headers['x-run-id']).toBeTruthy();
    const spec = (await app.inject('/openapi.json')).json();
    expect(spec.paths['/v1/ask/stream'].post.responses['200'].content['text/event-stream']).toBeDefined();
    const schema = spec.paths['/v1/ask'].post.responses['200'].content['application/json'].schema;
    const validate = new Ajv().compile(schema); expect(validate(result.json())).toBe(true);
    expect(validate({ ...result.json(), confidence: 2 })).toBe(false);
    const requestSchema = spec.paths['/v1/ask'].post.requestBody.content['application/json'].schema;
    expect(new Ajv().validate(requestSchema, { question: 'q' })).toBe(true);
    expect(new Ajv().validate(requestSchema, { question: '' })).toBe(false);
  });
  it.each([{}, { question: '' }, { question: '   ' }, { question: 42 }, { question: 'a'.repeat(8001) }, { question: 'q', extra: true }])('rejects invalid input before calling LLM: %j', async payload => {
    const { app, deps } = await setup();
    const result = await app.inject({ method: 'POST', url: '/v1/ask', payload });
    expect(result.statusCode).toBe(400); expect(result.json().error.requestId).toBeTruthy(); expect(deps.store.calls.size).toBe(0);
  });
  it('bounds body size and standardizes 404 and malformed JSON', async () => {
    const { app } = await setup();
    const large = await app.inject({ method: 'POST', url: '/v1/ask', payload: { question: 'a'.repeat(40000) } });
    expect(large.statusCode).toBe(413); expect(large.json().error.code).toBe('INVALID_REQUEST');
    expect((await app.inject('/missing')).json().error.code).toBe('NOT_FOUND');
    const invalid = await app.inject({ method: 'POST', url: '/v1/ask', headers: { 'content-type': 'application/json' }, payload: '{' });
    expect(invalid.statusCode).toBe(400);
  });
  it.each([['invalid', 502], ['timeout', 504], ['error', 502]] as const)('maps %s to HTTP %i', async (step, code) => {
    const { app } = await setup([step, step, step]);
    const result = await app.inject({ method: 'POST', url: '/v1/ask', payload: { question: 'q' } });
    expect(result.statusCode).toBe(code); expect(result.json().error.requestId).toBeTruthy();
  });
  it('reports unavailable database and sanitizes unexpected errors', async () => {
    const { app, deps } = await setup();
    vi.spyOn(deps.store, 'health').mockRejectedValue(new Error('secret'));
    expect((await app.inject('/health')).statusCode).toBe(503);
    vi.spyOn(deps.store, 'createRun').mockRejectedValue(new Error('secret'));
    const response = await app.inject({ method: 'POST', url: '/v1/ask', payload: { question: 'q' } });
    expect(response.statusCode).toBe(500); expect(response.body).not.toContain('secret');
  });
  it('streams status and a final validated result, without token events', async () => {
    const { app } = await setup(['invalid', 'valid']);
    const result = await app.inject({ method: 'POST', url: '/v1/ask/stream', payload: { question: 'q' } });
    expect(result.headers['content-type']).toContain('text/event-stream');
    expect(result.body).toContain('event: status'); expect(result.body).toContain('event: result');
    expect(result.body).not.toContain('event: token'); expect(result.body).not.toContain('"confidence":2');
  });
  it('emits an error event after SSE headers, and rejects bad input before headers', async () => {
    const { app } = await setup(['invalid', 'invalid', 'invalid']);
    const result = await app.inject({ method: 'POST', url: '/v1/ask/stream', payload: { question: 'q' } });
    expect(result.statusCode).toBe(200); expect(result.body).toContain('event: error'); expect(result.body).not.toContain('event: result');
    expect(result.body).toContain('INVALID_LLM_OUTPUT');
    expect((await app.inject({ method: 'POST', url: '/v1/ask/stream', payload: { question: ' ' } })).statusCode).toBe(400);
  });
  it('does not log questions, secret headers, query strings or malicious request IDs', async () => {
    let logs = '';
    const destination = new Writable({ write(chunk, _encoding, callback) { logs += String(chunk); callback(); } });
    const app = await buildApp(await dependencies(), pino(destination)); apps.push(app);
    await app.inject({ method: 'POST', url: '/v1/ask?email=alice@example.com', headers: { authorization: 'Bearer secret-token', 'x-request-id': 'alice@example.com' }, payload: { question: 'Meu CPF 123.456.789-00' } });
    expect(logs).toContain('requestId'); expect(logs).toContain('promptHash');
    expect(logs).not.toMatch(/alice|123\.456|secret-token/);
  });
});
describe('environment configuration', () => {
  const base = { DATABASE_URL: 'postgres://localhost/qa' };
  it('defaults to fake and rejects invalid configuration', () => {
    expect(configuration(base).client.isSimulated).toBe(true);
    expect(() => configuration({})).toThrow('Invalid environment');
    expect(() => configuration({ ...base, LLM_TIMEOUT_MS: '0' })).toThrow();
  });
  it('requires prices and credentials for a real adapter', () => {
    expect(() => configuration({ ...base, LLM_PROVIDER: 'compatible' })).toThrow('requires');
    const env = { ...base, LLM_PROVIDER: 'compatible', LLM_BASE_URL: 'https://example.invalid/v1', LLM_API_KEY: 'secret', LLM_MODEL: 'model',
      LLM_INPUT_USD_PER_MILLION: '1', LLM_OUTPUT_USD_PER_MILLION: '2', LLM_CACHED_USD_PER_MILLION: '0' };
    expect(configuration(env).client.isSimulated).toBe(false);
    expect(() => configuration({ ...env, LLM_INPUT_USD_PER_MILLION: '-1' })).toThrow('Invalid prices');
  });
});
