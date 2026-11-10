# D2 — Qualidade: contrato não é verdade

1. **O que é e como funciona.** Qualidade tem dimensões distintas: formato válido, correção factual, utilidade e rastreabilidade. Esta fase mede principalmente validade estrutural e controle de falhas.
2. **Por que importa.** Um JSON perfeitamente válido pode trazer uma resposta errada. Como em QA, o oráculo precisa corresponder à propriedade que se pretende provar.
3. **Quando usar e evitar.** Use gates de schema para integração confiável. Não use 100% no Fake como evidência de precisão de IA.
4. **Conexão com LLM e agente.** Sem RAG, sources vazio evita falsas citações. Não comprova que answer esteja correto. Futuras evals adicionarão fontes esperadas e rubricas.
5. **Onde aparece.** [schema](../../packages/core/src/schema.ts), [smoke report](../../reports/smoke.json), [métricas](../metrics.md).
6. **Tecnologias e trade-offs.** Validação determinística é barata e reprodutível. Avaliação semântica precisa dataset e julgamento mais rico, fora desta fase.
7. **Erros e boas práticas.** Não confunda confidence com probabilidade calibrada. Separe taxa inicial da taxa após reparo para enxergar fragilidade escondida.
8. **Como testar.** Verifique que o smoke tem 20 casos, reparos reais no Fake e relatório de falhas. Testes negativos cobrem casos que devem continuar falhando.
9. **Exercício e entendimento.** Crie uma resposta de schema válido mas tecnicamente falsa. Explique por que passa nesta fase e qual dado/oráculo seria necessário para detectá-la na Fase 5.
