# D3 — Evals reproduzíveis, antes dos judges

1. **O que é e como funciona.** Um dataset JSONL versionado percorre a API com Fake. O avaliador classifica cada caso por número de tentativas e resultado final validado.
2. **Por que importa.** Um relatório agregado com casos identificados permite comparar versões sem depender de impressões da conversa.
3. **Quando usar e evitar.** Use smoke determinístico para regressões do fluxo. LLM-as-a-Judge só faz sentido quando houver rubrica e calibração; não existe nesta fase.
4. **Conexão com LLM e agente.** Seed e hash da pergunta controlam as falhas iniciais. Scripts dos testes forçam falhas permanentes e timeouts que o smoke padrão não provoca.
5. **Onde aparece.** [dataset](../../data/evals/smoke.jsonl), [avaliador](../../packages/evals/src/smoke.ts), [relatório](../../reports/smoke.md).
6. **Tecnologias e trade-offs.** JSONL é simples de revisar. 20 casos são baratos, mas pequenos e não representativos de toda a prática de QA. Escolher seed para exercitar falhas é configuração de teste, não avaliação de inteligência.
7. **Erros e boas práticas.** Não regenere dados até esconder erros. Registre mudança de seed. Nunca habilite provedor real por ambiente dentro do smoke; ele instancia Fake diretamente.
8. **Como testar.** `pnpm eval:smoke` sobrescreve relatórios reproduzíveis e falha se validade final cair abaixo de 95%. Confira resultados por id, não só o percentual.
9. **Exercício e entendimento.** Troque FAKE_SEED temporariamente e observe a quantidade de reparos. Volte a 10 e regenere o baseline. Explique por que pequenas amostras variam mesmo com limiar de 15%.
