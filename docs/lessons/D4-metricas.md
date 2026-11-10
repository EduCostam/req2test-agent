# D4 — Métricas de produto: limites do baseline

1. **O que é e como funciona.** Indicadores resumem eventos: válidos na primeira tentativa, reparados, falhas finais, tokens e custo total. Cada indicador precisa denominador e origem claros.
2. **Por que importa.** Apenas taxa de sucesso final pode esconder custo crescente de reparos. Em QA, isso equivale a observar somente o teste verde após várias tentativas.
3. **Quando usar e evitar.** Use o baseline para regressão operacional do Fake. Não use latência sintética para definir SLA nem custo fictício para orçamento comercial.
4. **Conexão com LLM e agente.** llm_calls permite agregar por run e modelo; is_simulated permite separar simulação de produção. Métricas de ferramentas e intervenção humana ainda não se aplicam.
5. **Onde aparece.** [definições](../metrics.md), [smoke](../../reports/smoke.json), [banco](../../db/migrations/001_initial.sql).
6. **Tecnologias e trade-offs.** Relatórios JSON/Markdown são auditáveis sem dashboard. Prometheus, Grafana e percentis reais ficam para fases posteriores.
7. **Erros e boas práticas.** Explicite chamadas com custo desconhecido antes de calcular média. Diferencie casos de chamadas: reparo aumenta chamadas, não o tamanho do dataset.
8. **Como testar.** A soma das três categorias deve ser 20. Calls deve refletir original mais reparos; custo total deve ser a soma de todos os casos, não só dos válidos de primeira.
9. **Exercício e entendimento.** Calcule manualmente taxa de reparo e validade final a partir do relatório. Explique por que 100% de validade final não equivale a 100% de acerto inicial ou sucesso da tarefa de QA.
