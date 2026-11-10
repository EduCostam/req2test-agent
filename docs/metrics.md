# Métricas da Fase 1

O script `pnpm eval:smoke` gera `reports/smoke.json` e `.md` a partir de 20 linhas versionadas. Sem rede, com FakeLLMClient e MemoryStore. Não mede relevância nem qualidade factual de um modelo real.

| Indicador | Cálculo | Meta |
|---|---|---|
| Válido na primeira tentativa | HTTP 200 e schema válido com uma chamada | Diagnóstico, sem gate |
| Válido após reparo | HTTP 200 e schema válido com duas ou três chamadas | Exercitar 3/20 casos com seed 10 |
| Falha final | Resposta final não válida ou HTTP diferente de 200 | Zero no smoke padrão; presente nos testes negativos |
| Validade final | (primeira válida + reparada) / total | >=95% |
| Tokens | Soma por chamada, incluindo respostas inválidas | Reportar, sem gate nesta fase |
| Custo simulado | Soma de custos de todas as chamadas | Separado de qualquer gasto real |
| Cobertura core/llm | V8: linhas, statements, funções, branches | >=80% |

Fórmula USD: `((inputTokens-cachedTokens)*inputPrice + cachedTokens*cachedPrice + outputTokens*outputPrice)/1_000_000`. Preços por milhão. No Fake, input/output são estimativas por caracteres e latência é sintética (1 ms). Não interpretar esses valores como benchmark. Em erros sem usage, banco mantém NULL e relatórios futuros devem contar chamadas com custo desconhecido.

Baseline e resultados reais desta execução estão em `reports/smoke.json` e `reports/phase1-validation.json`. Latência p50/p95/p99, custo de tarefa, qualidade de recuperação e judge pertencem às fases seguintes.
