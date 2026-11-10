/* global fetch, AbortSignal, console */
import assert from 'node:assert/strict';
import { z } from 'zod';

// A real HTTP check against the local container, always using FakeLLMClient.
const base = 'http://127.0.0.1:3000';
const answer = z.object({ answer: z.string().min(1), confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()), sources: z.array(z.string()).length(0) });
const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(10000) });
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: 'ok' });
const options = () => ({ method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ question: 'Como testar paginação de resultados?' }), signal: AbortSignal.timeout(20000) });
const json = await fetch(`${base}/v1/ask`, options());
assert.equal(json.status, 200);
assert.ok(json.headers.get('x-run-id'));
answer.parse(await json.json());
const sse = await fetch(`${base}/v1/ask/stream`, options());
assert.equal(sse.status, 200);
assert.ok(sse.headers.get('content-type')?.includes('text/event-stream'));
const text = await sse.text();
assert.ok(text.includes('event: status\n'));
assert.ok(!text.includes('event: error\n'));
const result = text.split('\n\n').find(frame => frame.startsWith('event: result\n'));
assert.ok(result, 'SSE must include a final result');
answer.parse(JSON.parse(result.split('\ndata: ')[1]));
console.log(JSON.stringify({ health: 'passed', json: 'passed', sse: 'passed' }));
