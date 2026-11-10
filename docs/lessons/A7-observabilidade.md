# A7 — Logs e início da observabilidade

1. **O que é e como funciona.** Logs Pino são objetos JSON, com requestId, rota, status e identidade do prompt. Banco registra detalhes por chamada. Ainda não há traces distribuídos.
2. **Por que importa.** Logs permitem ligar uma resposta HTTP ao código e prompt usados sem depender de mensagens livres e difíceis de consultar.
3. **Quando usar e evitar.** Use metadados operacionais. Evite texto de pergunta, resposta, query string, cabeçalhos e erros crus que possam conter segredos ou dados pessoais.
4. **Conexão com LLM e agente.** Uma versão de prompt pode causar aumento de reparos; hash ajuda distinguir o conteúdo exato usado.
5. **Onde aparece.** [safeLogger e onResponse](../../apps/api/src/app.ts), [persistência](../../packages/core/src/postgres.ts), [teste de vazamento](../../tests/api.test.ts).
6. **Tecnologias e trade-offs.** Pino e campos permitidos são simples. Redação de campos sensíveis é defesa adicional. OTel, métricas exportadas e dashboards chegam na Fase 4.
7. **Erros e boas práticas.** requestId vindo do cliente pode conter dados pessoais; geramos UUID interno. Não considere latência sintética do Fake um sinal de performance real.
8. **Como testar.** O teste captura logs e verifica ausência de e-mail, CPF e segredo. Localmente, examine `docker compose logs api` e consulte runs pelo requestId.
9. **Exercício e entendimento.** Envie uma pergunta com um e-mail fictício e cabeçalho Authorization fictício. Procure ambos nos logs e explique por que a exclusão de conteúdo é mais robusta do que tentar reconhecer todos os formatos de dado pessoal.
