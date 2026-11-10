# A1 — Backend e APIs

1. **O que é e como funciona.** Fastify recebe HTTP, valida o body e chama um serviço separado da rota. O contrato distingue uma resposta de sucesso de um envelope de erro com requestId.
2. **Por que importa.** O backend controla credenciais, limites, validação e persistência. Uma chamada direta do navegador ao provedor perderia esses controles e poderia expor a chave.
3. **Quando usar e evitar.** JSON serve requisições curtas; SSE comunica andamento. Não há razão para WebSocket bidirecional nesta fase.
4. **Conexão com LLM e agente.** A rota recebe texto, mas só devolve AskResponse após a validação. O loop atual é de reparo, ainda não de ferramentas.
5. **Onde aparece.** [app.ts](../../apps/api/src/app.ts), [schema.ts](../../packages/core/src/schema.ts), [testes da API](../../tests/api.test.ts).
6. **Tecnologias e trade-offs.** Fastify fornece inject e schemas; Zod gera JSON Schema; Swagger expõe OpenAPI. SSE entrega resultado inteiro para não exibir saída inválida.
7. **Erros e boas práticas.** Não confunda HTTP 200 de SSE com sucesso da operação: leia o evento final. Não reflita mensagens cruas do provedor. Limite caracteres e bytes, pois são medidas diferentes.
8. **Como testar.** `pnpm test` valida body, códigos HTTP, contrato publicado e SSE sem rede. O health local consulta o banco real.
9. **Exercício e entendimento.** Envie pergunta vazia, válida e de 8.001 caracteres. Explique por que duas são rejeitadas antes de chamar o LLM; confirme que não criam llm_calls.
