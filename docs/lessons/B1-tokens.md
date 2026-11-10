# B1 — Tokens e limites de contexto

1. **O que é e como funciona.** Tokens são unidades do modelo, não caracteres. complete recebe maxTokens; o provedor retorna inputTokens/outputTokens e, quando disponível, cachedTokens.
2. **Por que importa.** Mais contexto custa dinheiro e tempo. Reparos reenviam contexto e resposta inválida, aumentando o consumo total.
3. **Quando usar e evitar.** Use usage do provedor para custo real. Caracteres/4 é apenas estimativa do Fake, inadequada para faturamento ou garantia de janela de contexto.
4. **Conexão com LLM e agente.** A Fase 1 limita pergunta, resposta e número de tentativas. Orçamento total de tokens e gestão de histórico serão expandidos nas fases seguintes.
5. **Onde aparece.** [contrato](../../packages/llm/src/types.ts), [Fake](../../packages/llm/src/fake.ts), [ask](../../packages/core/src/ask.ts).
6. **Tecnologias e trade-offs.** O provedor decide tokenização. Um teto de 2.048 tokens solicitado por chamada é simples, mas não é medição exata do contexto e pode gerar resposta truncada.
7. **Erros e boas práticas.** Não some cachedTokens novamente a inputTokens: cache é subconjunto. Reparo não garante sucesso; após duas tentativas adicionais a execução falha explicitamente.
8. **Como testar.** Verifique o relatório smoke e o cálculo de cache em llm.test.ts. Testes com saída inválida devem contabilizar todas as chamadas.
9. **Exercício e entendimento.** Compare tokens entre um caso válido direto e um reparado. Explique quais partes extras entraram no contexto e por que limitar apenas maxTokens de saída não limita o gasto total.
