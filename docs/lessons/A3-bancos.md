# A3 — Bancos de dados

1. **O que é e como funciona.** Um run representa a solicitação; llm_calls representa cada tentativa. Uma chave estrangeira liga as chamadas ao run e UNIQUE impede duas tentativas com o mesmo número.
2. **Por que importa.** A resposta final não conta quantas tentativas foram pagas. Persistência torna essa história operacional consultável.
3. **Quando usar e evitar.** Use PostgreSQL para integridade e consultas. MemoryStore é adequado somente para testes/evals isoladas; não sobrevive ao processo.
4. **Conexão com LLM e agente.** Antes de complete registramos running; depois registramos usage e validação. Não mantemos transação SQL aberta enquanto esperamos o modelo.
5. **Onde aparece.** [SQL inicial](../../db/migrations/001_initial.sql), [migrator](../../db/migrate.ts), [PostgresStore](../../packages/core/src/postgres.ts), [integração manual](../../scripts/check-postgres.ts).
6. **Tecnologias e trade-offs.** pg com parâmetros evita concatenar entradas em SQL. Migrations simples com hash, transação e lock são legíveis, mas exigem disciplina para nunca editar uma migration aplicada.
7. **Erros e boas práticas.** Não use zero para usage desconhecido. Falha abrupta pode deixar running; retomada durável não existe ainda. Não interprete um mock de query como prova de funcionamento de SQL real.
8. **Como testar.** Testes offline verificam parâmetros e controle de migrations. `pnpm test:postgres` executa migrations duas vezes e confirma duas chamadas persistidas; deve ser rodado localmente com o banco.
9. **Exercício e entendimento.** Execute o teste real e consulte run_id/attempt/status. Explique por que a chamada inválida continua tendo custo e por que ambas usam is_simulated=true.
