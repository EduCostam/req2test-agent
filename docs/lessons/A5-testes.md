# A5 — Testes e base para CI/CD

1. **O que é e como funciona.** Testes unitários verificam cálculo e reparo; testes da API usam inject; contrato compara a resposta ao OpenAPI. Typecheck e lint verificam propriedades diferentes dos testes.
2. **Por que importa.** Um modelo probabilístico não deve tornar o teste do seu controle de fluxo probabilístico. Fake permite repetir falhas específicas.
3. **Quando usar e evitar.** Use Fake para lógica e erros; use banco real para SQL. Não use LLM pago para assert determinístico de resposta exata.
4. **Conexão com LLM e agente.** Timeout, JSON ruim e chamadas não permitidas são entradas adversas que o serviço precisa tratar independentemente da inteligência do modelo.
5. **Onde aparece.** [core.test.ts](../../tests/core.test.ts), [api.test.ts](../../tests/api.test.ts), [bloqueio de rede](../../tests/offline.ts), [Vitest](../../vitest.config.ts).
6. **Tecnologias e trade-offs.** Vitest/V8 medem linhas, branches, statements e funções com gate >=80% em core/llm. Cobertura mede execução, não qualidade das asserções. CI/CD completo é Fase 5.
7. **Erros e boas práticas.** Evite mocks que sempre retornam sucesso. Não inclua pacotes vazios para melhorar percentuais. Bloqueie fetch e sockets externos nos testes.
8. **Como testar.** `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm eval:smoke` e `pnpm build`. Docker/SQL real são uma verificação adicional documentada.
9. **Exercício e entendimento.** Altere temporariamente o limite de reparo para quatro chamadas. O teste de três falhas deve falhar. Reverta e confirme recuperação do teste; explique que regressão ele protege.
