# C1 — Arquitetura de agentes: primeiro degrau

1. **O que é e como funciona.** A Fase 1 separa transporte HTTP, serviço ask, interface LLMClient e Store. É um workflow de geração/reparo, ainda não um agente que escolhe ferramentas.
2. **Por que importa.** Interfaces permitem trocar Fake por provedor real e memória por PostgreSQL sem espalhar detalhes de protocolo pelas rotas.
3. **Quando usar e evitar.** Use uma chamada simples quando resolve a tarefa. Só introduza loop autônomo e ferramentas quando a tarefa exigir e houver controles verificáveis.
4. **Conexão com LLM e agente.** O LLM fornece texto; código decide se é válido, repara ou falha. Na Fase 3, decisões de ferramentas serão mediadas por policy engine.
5. **Onde aparece.** [arquitetura](../architecture.md), [ask](../../packages/core/src/ask.ts), [LLMClient](../../packages/llm/src/types.ts), [Store](../../packages/core/src/store.ts).
6. **Tecnologias e trade-offs.** Injeção por objeto de dependências evita container de DI. Código próprio tem poucas camadas, mas obriga contratos e falhas a serem tratados explicitamente.
7. **Erros e boas práticas.** Não chame um reparo de schema de raciocínio autônomo. Não implemente fases futuras só para preencher pastas. Mantenha UI sem acesso às credenciais.
8. **Como testar.** Substitua client e store por implementações controladas. Falha de qualquer fronteira deve ter resultado testável sem rede.
9. **Exercício e entendimento.** Desenhe o caminho de um timeout até o HTTP 504. Identifique onde ocorre cancelamento, onde ficam os metadados e por que a rota não conhece o formato do provedor.
