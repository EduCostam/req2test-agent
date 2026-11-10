# D1 — Custos por chamada

1. **O que é e como funciona.** A tabela de preços informa USD por milhão de tokens de entrada, saída e entrada em cache. A função subtrai cache da entrada normal antes de aplicar preços.
2. **Por que importa.** Uma tarefa válida pode conter reparos pagos. Custo por chamada é a base para custo por tarefa e orçamento posterior.
3. **Quando usar e evitar.** Use preços e usage conhecidos. Não extrapole valores do Fake para preço real; is_simulated impede misturar as categorias.
4. **Conexão com LLM e agente.** Cada retorno do LLM gera um registro de custo, mesmo quando o conteúdo é inválido. Timeout sem usage permanece desconhecido.
5. **Onde aparece.** [cost.ts](../../packages/llm/src/cost.ts), [llm_calls](../../db/migrations/001_initial.sql), [smoke](../../packages/evals/src/smoke.ts).
6. **Tecnologias e trade-offs.** Number arredondado a dez casas e numeric SQL são suficientes para este exercício; faturamento contábil rigoroso pode exigir aritmética decimal. Preços reais via ambiente evitam hardcode desatualizado.
7. **Erros e boas práticas.** Não cobre cache duas vezes. Não aceite modelo sem preço, quantidade negativa ou fração de token. Não confunda erro com custo zero.
8. **Como testar.** 1.000 tokens de entrada, 200 em cache e 100 de saída, com preços 1/0,25/2, custam USD 0,00105. O teste fixa esse exemplo calculado manualmente.
9. **Exercício e entendimento.** Consulte as duas chamadas de um reparo, some os custos e compare com o run no relatório. Explique por que remover a tentativa inválida subestima o gasto.
