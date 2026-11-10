import Fastify, { LogController } from 'fastify';
import swagger from '@fastify/swagger';
import pino, { type Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { ask, AskError, type AskDependencies } from '../../../packages/core/src/ask.js';
import { AskInput, AskResponse, ErrorEnvelope, jsonSchema } from '../../../packages/core/src/schema.js';

export function safeLogger() {
  return pino({ level: 'info', redact: { paths: ['authorization', 'apiKey', 'password', 'req.headers.authorization'], censor: '[REDACTED]' } });
}
export function errorBody(error: unknown, requestId: string) {
  return { error: { code: error instanceof AskError ? error.code : 'INTERNAL_ERROR',
    message: error instanceof AskError ? error.message : 'Falha interna ao processar a solicitação.', requestId } };
}
export async function buildApp(deps: AskDependencies, logger: Logger | false = false, onClose?: () => Promise<void>) {
  const app = Fastify({ bodyLimit: 32768, logController: new LogController({ disableRequestLogging: true }),
    requestIdHeader: false, genReqId: () => randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, allErrors: false } },
    ...(logger ? { loggerInstance: logger } : { logger: false }),
  });
  await app.register(swagger, { openapi: { info: { title: 'req2test-agent', version: '0.1.0' } } });
  if (onClose) app.addHook('onClose', onClose);
  app.addHook('onResponse', async (request, reply) => {
    // Allowlist logging: no question, response, headers, query strings or raw errors.
    request.log.info({ requestId: request.id, route: request.routeOptions.url ?? 'unknown',
      statusCode: reply.statusCode, promptId: deps.prompt.id, promptVersion: deps.prompt.version, promptHash: deps.prompt.hash }, 'request completed');
  });
  app.setErrorHandler((error, request, reply) => {
    const code = (error as { statusCode?: number }).statusCode;
    const normalized = error instanceof AskError ? error : code && code >= 400 && code < 500
      ? new AskError('INVALID_REQUEST', code, 'Requisição inválida.') : error;
    reply.code(normalized instanceof AskError ? normalized.statusCode : 500).send(errorBody(normalized, request.id));
  });
  app.setNotFoundHandler((request, reply) => reply.code(404).send(errorBody(new AskError('NOT_FOUND', 404, 'Rota não encontrada.'), request.id)));
  const errors = Object.fromEntries([400, 413, 415, 500, 502, 504].map(code => [code, jsonSchema(ErrorEnvelope)]));
  app.get('/health', { schema: { response: { 200: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] }, 503: jsonSchema(ErrorEnvelope) } } }, async () => {
    try { await deps.store.health(); } catch { throw new AskError('DATABASE_UNAVAILABLE', 503, 'Banco indisponível.'); }
    return { status: 'ok' };
  });
  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());
  app.get('/', { schema: { hide: true } }, async (_request, reply) => reply.type('text/html').send(await readFile('apps/web/index.html', 'utf8')));
  app.post('/v1/ask', { schema: { body: jsonSchema(AskInput), response: { 200: jsonSchema(AskResponse), ...errors } } }, async (request, reply) => {
    const input = AskInput.safeParse(request.body);
    if (!input.success) throw new AskError('INVALID_REQUEST', 400, 'Pergunta inválida.');
    const result = await ask(input.data.question, request.id, deps);
    reply.header('x-request-id', request.id).header('x-run-id', result.runId);
    return result.response;
  });
  app.post('/v1/ask/stream', { schema: { body: jsonSchema(AskInput), response: {
    200: { description: 'SSE: status, result ou error; sem tokens parciais.', content: { 'text/event-stream': { schema: { type: 'string' } } } }, ...errors,
  } } }, async (request, reply) => {
    const input = AskInput.safeParse(request.body);
    if (!input.success) throw new AskError('INVALID_REQUEST', 400, 'Pergunta inválida.');
    const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    async function* events() {
      yield frame('status', { status: 'processing', requestId: request.id });
      try {
        const result = await ask(input.data!.question, request.id, deps);
        yield frame('result', { ...result.response, requestId: request.id, runId: result.runId });
      } catch (error) { yield frame('error', errorBody(error, request.id)); }
    }
    return reply.header('x-request-id', request.id).header('cache-control', 'no-cache')
      .header('x-accel-buffering', 'no').type('text/event-stream').send(Readable.from(events()));
  });
  await app.ready();
  return app;
}
