# ADR 0002 — SSE com resultado validado

## Contexto
O contrato `complete` devolve uma resposta inteira. Ela pode estar inválida e exigir até dois reparos. Exibir tokens imediatamente poderia expor conteúdo que depois seria rejeitado.

## Decisão
`POST /v1/ask/stream` transmite um evento `status` e depois `result` validado ou `error`. Não há eventos de token. `LLMClient.stream?` reserva um AsyncIterable de chunks `token` e `done`, sem implementação concreta nesta fase. O endpoint continua usando `complete`.

## Alternativas
Bufferizar um stream real teria complexidade adicional sem melhorar o tempo até a resposta validada. Exibir tokens provisórios exigiria protocolo de correção e UI que distingue conteúdo não validado. WebSocket não é necessário para um fluxo unidirecional.

## Trade-offs
O usuário percebe que o processamento começou, mas recebe a resposta inteira ao final. Após headers, erros não podem alterar o status HTTP: consumidores devem tratar `event: error`. Um POST SSE precisa de fetch/cliente HTTP; EventSource nativo só faz GET. A implementação usa Readable para backpressure do transporte. Desconexão não cancela imediatamente a chamada já iniciada; ela permanece limitada pelo timeout.

Referência: [streams no Fastify Reply](https://fastify.dev/docs/latest/Reference/Reply/).
