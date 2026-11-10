# B3 — Saídas estruturadas e reparo

1. **O que é e como funciona.** JSON.parse verifica sintaxe; Zod verifica formato, tipos e limites. AskResponse exige answer, confidence 0..1, assumptions e sources.
2. **Por que importa.** Um texto plausível não é um contrato consumível com segurança. Mesmo structured output do provedor precisa ser validado no backend.
3. **Quando usar e evitar.** Use schema quando código consome a resposta. Não trate validação estrutural como prova de verdade factual.
4. **Conexão com LLM e agente.** Saída inválida dispara até dois reparos; fonte não existente nesta fase e tool calls são também rejeitados. Após o limite, retorna erro controlado.
5. **Onde aparece.** [schema](../../packages/core/src/schema.ts), [loop](../../packages/core/src/ask.ts), [casos negativos](../../tests/core.test.ts).
6. **Tecnologias e trade-offs.** Zod produz JSON Schema compartilhado com HTTP e provedor. Reparar pode recuperar uma execução, mas aumenta latência e custo.
7. **Erros e boas práticas.** Não remova campos inválidos silenciosamente para fingir sucesso. Não transmita texto não validado como resultado final. Confidence continua não calibrado.
8. **Como testar.** Script Fake `invalid, valid` testa um reparo; `invalid, invalid, valid` testa dois; três inválidos testam falha. Há casos de JSON sintaticamente ruim e sources inventadas.
9. **Exercício e entendimento.** Retorne confidence=2 ou answer numérico no Fake. Identifique a validação que falha e confirme que chamadas inválidas ficam registradas com custo.
