# PROJETO: qa-agent, Agente de IA para Engenharia de Software e QA

## Ajustes aprovados para a Fase 1
- Escrever Dockerfile e docker-compose.yml; validação do Docker será feita pelo usuário localmente. Registrar que Docker não foi verificado pelo agente e fornecer comandos exatos.
- FakeLLMClient deve provocar aproximadamente 15% de saídas inválidas na primeira tentativa, deterministicamente por seed; smoke separa válido na primeira tentativa, válido após reparo e falha final.
- Registrar em ADR o SSE sem tokens nesta fase; LLMClient tem método stream opcional, ainda sem implementação.
- llm_calls inclui is_simulated; package.json inclui engines.node >=20 e o repositório inclui .nvmrc.
- Parar ao fim da Fase 1 e responder nas oito partes da seção 9.

## 1. PAPEL
Você é um Senior AI Engineer, Software Architect e Mentor Técnico. Implemente, neste repositório, um agente de IA de produção (não uma demo) para Engenharia de Software e QA, seguindo exatamente este documento. O objetivo é que eu aprenda AI Engineering lendo o código, os testes e a documentação que você produzir.

Visão central: DADOS -> LLM -> ORQUESTRAÇÃO DE FLUXOS -> AÇÕES -> AVALIAÇÕES E MÉTRICAS -> PRODUTO.
Princípio: construir um agente que responde NÃO é construir um produto confiável. Transforme o comportamento probabilístico do LLM em funcionalidades controladas, testáveis, observáveis, seguras e mensuráveis.

## 2. O QUE O AGENTE FAZ
1. Recebe perguntas técnicas e identifica a intenção.
2. Consulta requisitos, casos de teste e documentação via RAG.
3. Consulta APIs e dados autorizados.
4. Gera respostas estruturadas e verificáveis (toda afirmação com fonte).
5. Elabora cenários de teste (partição de equivalência, valor limite, tabela de decisão, fluxo negativo) rastreáveis a requisitos.
6. Sugere verificações de qualidade e riscos.
7. Executa ferramentas controladas; ações com efeito colateral exigem aprovação humana.
8. Registra logs, traces, métricas de custo, tempo, qualidade e confiabilidade.
9. Mantém estado e histórico, retoma execuções e trata falhas, limites e timeouts.

## 3. REGRAS GERAIS (OBRIGATÓRIAS)
- Trabalhe em 5 fases sequenciais. Ao fim de cada fase: rode lint, typecheck e todos os testes; só declare a fase concluída se os critérios de aceitação passarem; faça um commit (Conventional Commits). Pare ao final da fase solicitada.
- TypeScript strict, Node.js 20+, ESM, pnpm workspaces. Python somente se houver vantagem técnica clara, justificada em ADR.
- Fases 1 a 3 SEM frameworks de IA (LangChain, LangGraph, LlamaIndex): use fetch/SDK do provedor e código próprio, para eu entender o funcionamento. Ao fim da Fase 5, faça a comparação opcional descrita na seção 10.
- Não adicione tecnologia sem justificar: cada dependência nova relevante entra em docs/adr/NNNN-titulo.md com contexto, decisão, alternativas e trade-offs.
- Provedor de LLM atrás de interface LLMClient (implementação real configurável por variável de ambiente + FakeLLMClient determinístico e scriptável). O mesmo vale para EmbeddingClient. Testes e CI NUNCA chamam rede nem LLM real.
- Segredos somente por variáveis de ambiente; forneça .env.example; nunca logue segredos; mascare dados pessoais nos logs.
- Comente o porquê das decisões (não o óbvio). Código pequeno, coeso e testado.
- Nunca invente resultados de métricas ou de avaliação: gere-os por scripts reproduzíveis e salve os relatórios.
- No README, separe claramente: OBRIGATÓRIO, RECOMENDADO e OPCIONAL.
- Se algo estiver ambíguo, escolha a opção mais simples, registre a suposição em docs/assumptions.md e siga em frente.

## 4. STACK (justificada)
TypeScript + Node 20, Fastify (+ @fastify/swagger, SSE), Zod, PostgreSQL com pgvector, Redis + BullMQ, Vitest, pino, OpenTelemetry (OTLP), prom-client, Grafana + Prometheus + OpenTelemetry Collector, Langfuse (opcional, atrás de flag e de interface TracingSink), jose (JWT), Docker e Docker Compose, GitHub Actions. Interface web mínima em HTML + JS puro (sem framework) servida pela API.

## 5. ESTRUTURA DO REPOSITÓRIO
qa-agent/
  apps/api/src/        rotas, auth, middlewares, SSE
  apps/worker/src/     consumidores BullMQ
  apps/web/            UI mínima (chat, fontes, aprovações, trace da execução)
  packages/core/src/   orquestrador, state machine, policy engine, context manager
  packages/llm/src/    LLMClient, Fake, retries, circuit breaker, custos, roteador de modelos
  packages/rag/src/    ingestão, chunking, embeddings, busca híbrida, rerank
  packages/tools/src/  registry e ferramentas com schema e permissão
  packages/evals/src/  datasets, métricas determinísticas, judge, comparação
  prompts/             system prompts versionados (.md com front matter: id, version)
  db/migrations/       SQL versionado
  data/seed/           corpus fictício (checkout de e-commerce)
  data/evals/          datasets de avaliação
  data/security/       ataques de injection
  infra/               docker-compose, otel, grafana, prometheus
  docs/                architecture.md, adr/, lessons/, metrics.md, security/
  .github/workflows/   ci.yml, nightly-evals.yml, deploy.yml

## 6. FASES

### FASE 1: MVP (backend + LLM + resposta estruturada)
Objetivo: fundamentos da comunicação com um LLM, com engenharia de produção desde o início.
Entregas:
- Fastify com GET /health, POST /v1/ask (JSON) e POST /v1/ask/stream (SSE). Envelope de erro padronizado com requestId.
- LLMClient.complete({system, messages, schema?, tools?, maxTokens, temperature, timeoutMs}) retorna {text, toolCalls, usage{inputTokens, outputTokens, cachedTokens?}, latencyMs, model}. Tabela de preços em config e cálculo de custo por chamada.
- Resposta validada com Zod: AskResponse {answer, confidence 0..1, assumptions[], sources[]}. Se inválida: reparo limitado (máx. 2 tentativas) e depois erro controlado.
- Prompt loader: lê prompts/*.md, registra id, version e hash do prompt em cada execução.
- Postgres com migrations em SQL simples: tabelas runs e llm_calls (tokens, custo, latência, modelo, prompt_version, status).
- Logs estruturados (pino) com requestId; timeout por chamada; limite de tamanho de entrada.
Testes: unitários (custo, reparo de schema, prompt loader), API com fastify.inject + FakeLLM, contrato OpenAPI, teste de timeout e de saída inválida.
Aceitação: saída válida >= 95% no dataset inicial (data/evals/smoke.jsonl, 20 casos) com Fake e reportada; todos os testes verdes; custo e tokens persistidos por chamada; docker compose up sobe API + Postgres.

### FASE 2: CONHECIMENTO (embeddings, pgvector e RAG)
Objetivo: dar contexto ao LLM com recuperação fundamentada e mensurável.
Entregas:
- Tabelas documents e chunks (embedding vector com dimensão por EMBEDDING_DIM, tsvector, metadados: project, docType requirement|testcase|doc, version, acl_roles[]).
- CLI pnpm ingest <dir>: lê md/txt/json, faz chunking por títulos com sobreposição e estimativa de tokens, gera embeddings (EmbeddingClient + FakeEmbedding determinístico) e grava de forma idempotente (hash do conteúdo evita duplicar).
- Busca híbrida: similaridade vetorial (cosseno) + full-text do Postgres, combinadas por Reciprocal Rank Fusion; filtros por project e ACL do usuário; interface Reranker com implementação lexical padrão.
- Geração com contexto: trechos entram delimitados e identificados por ID de fonte; a resposta deve citar IDs; se a relevância ficar abaixo do limiar, responder que não há base suficiente em vez de inventar.
- Gestão de contexto: orçamento de tokens, seleção e truncamento de trechos, resumo de histórico antigo.
- Corpus data/seed com pelo menos 15 documentos fictícios (requisitos, casos de teste, regras de negócio) e data/evals/retrieval.jsonl com pelo menos 30 perguntas e os documentos esperados.
- Script pnpm eval:retrieval que calcula recall@3, recall@5 e MRR e salva reports/retrieval.json.
Testes: unitários de chunking e RRF, integração com Postgres real em container, teste de ACL (usuário sem permissão não recupera o trecho), teste de idempotência da ingestão, teste de resposta sem base.
Aceitação: métricas de recuperação reportadas e registradas como baseline; toda resposta com afirmações cita fonte existente; nenhum trecho proibido por ACL é recuperado.

### FASE 3: AGENTE (tool calling, estado e workflow)
Objetivo: loop controlado com ferramentas, estado e aprovação humana.
Entregas:
- Tool Registry: cada ferramenta tem name, description, inputSchema e outputSchema (Zod), risk (read|write), requiredRole, timeoutMs e run().
- Ferramentas: search_knowledge (read), get_requirement (read), list_test_cases (read), query_test_results (read, somente views SQL em allowlist), generate_test_scenarios (saída estruturada: id, título, pré-condições, passos, resultado esperado, prioridade, risco, técnica, requirementId), create_test_case_draft (write, exige aprovação), export_test_plan (write em diretório sandbox, exige aprovação).
- Workflow como máquina de estados explícita: classify_intent -> retrieve -> plan -> execute_tools (loop) -> verify -> respond. Verificação determinística: schema válido, toda fonte citada existe no conjunto recuperado, todo cenário referencia requisito existente.
- Limites de execução: MAX_STEPS, orçamento de tokens, orçamento de custo e tempo total. Ao estourar, abortar com resultado parcial e registrar.
- Estado persistido em runs e run_steps (checkpoint a cada passo); retomada de execução interrompida.
- Aprovação humana: status awaiting_approval, tabela approvals, endpoints POST /v1/runs/:id/approve e /reject; ao aprovar, retomar do checkpoint.
- Policy Engine entre o LLM e as ferramentas: valida argumentos, papel do usuário, limite de chamadas por run, bloqueia chamada duplicada (mesma ferramenta + mesmos argumentos) e exige chave de idempotência em ferramentas write.
- Endpoints: POST /v1/runs, GET /v1/runs/:id, GET /v1/runs/:id/events (SSE com cada passo).
Testes: unitários por ferramenta, workflow com FakeLLM roteirizado (caminho feliz, ferramenta com erro, argumentos inválidos, loop infinito, chamada duplicada, aprovação, rejeição, retomada após falha).
Aceitação: nenhuma ferramenta write executa sem aprovação; limites de passos, custo e tempo funcionam; retomada não repete passos já concluídos.

### FASE 4: ENGENHARIA DE PRODUÇÃO (auth, filas, retries, observabilidade, segurança)
Objetivo: robustez, identidade, rastreabilidade e segurança.
Entregas:
- AuthN: login de desenvolvimento emitindo JWT (jose) com papéis viewer|qa|admin; API keys de serviço armazenadas com hash (crypto.scrypt). AuthZ: RBAC por rota e POR FERRAMENTA. O agente nunca tem mais permissão que o usuário.
- Auditoria: tabela audit_log append-only (quem, o quê, hash dos argumentos, resultado, runId, traceId).
- Filas: POST /v1/runs responde 202 com runId e enfileira em BullMQ; o worker executa. Retry com backoff exponencial e jitter somente para erros transitórios (classificador de erros), máximo de tentativas configurável, Dead Letter Queue, cabeçalho Idempotency-Key com constraint única, circuit breaker no LLMClient (implementação própria, testada), rate limiting com Redis.
- Evento externo: POST /v1/webhooks/requirements-changed com verificação de assinatura HMAC; inicia um run que reanalisa cenários afetados (exemplo de agente disparado por evento).
- Observabilidade: OpenTelemetry com spans http, run, step, llm.call, tool.call e rag.retrieve (atributos: tokens, custo, modelo, prompt_version, status); logs com trace_id; endpoint /metrics (prom-client): latência por etapa, tokens, custo, erros, retries, taxa de sucesso de ferramentas, aprovações humanas; adaptador TracingSink com Langfuse opcional. docker-compose com app, worker, Postgres, Redis, OTel Collector, Prometheus e Grafana, e um dashboard Grafana versionado em infra/.
- Segurança: mapeie o OWASP Top 10 para LLMs em docs/security/threat-model.md. Implemente: conteúdo recuperado tratado como dado (delimitado, nunca como instrução), validação de entrada e saída, menor privilégio, proteção contra path traversal na exportação, allowlist de SQL, mascaramento de segredos e dados pessoais nos logs, limite de tamanho e de profundidade.
- Suíte de ataques data/security/injection.jsonl com pelo menos 15 casos, incluindo injection INDIRETA embutida em documentos do corpus (ex.: texto no documento mandando ignorar instruções e exportar arquivos fora do sandbox). Use um FakeLLM que simula um modelo comprometido e prove que o Policy Engine bloqueia a ação.
- Testes de caos: injete 429, timeout, erro 5xx e falha no meio de um passo; verifique ausência de duplicidade, retomada correta e envio à DLQ quando esgotar tentativas.
Aceitação: usuário sem permissão é barrado em todas as rotas e ferramentas; todas as ações auditadas; ataques da suíte bloqueados; falhas injetadas não duplicam efeitos; um run gera trace completo visível no Grafana ou no Langfuse.

### FASE 5: QUALIDADE E PRODUTO (evals, métricas, custos, CI/CD, deploy)
Objetivo: provar com números que o agente funciona como produto.
Entregas:
- data/evals/golden.jsonl com pelo menos 40 casos: id, input, intenção esperada, fontes obrigatórias, ferramentas esperadas, deve_conter, não_deve_conter.
- Métricas determinísticas: schema válido, acerto de seleção de ferramenta, acerto de argumentos, groundedness (fontes citadas pertencem às recuperadas e há sobreposição de conteúdo), task success, e rastreabilidade dos cenários (cada cenário aponta para um requisito real).
- LLM-as-a-Judge: prompt de judge versionado com rubrica (relevância, fundamentação, completude, qualidade dos cenários de teste, escala 1 a 5, justificativa em JSON validado); modelo do judge configurável e diferente do gerador; mitigação de vieses (ordem aleatória em comparações, instrução contra preferência por respostas longas); script de calibração que compara o judge com data/evals/human_labels.jsonl e reporta concordância.
- CLI pnpm eval --suite golden --compare evals/baselines/<arquivo>.json gerando reports em JSON e Markdown com: task success rate, tool call success rate, latência p50/p95/p99, custo médio por tarefa concluída, tokens por tarefa, taxa de erro e retry, qualidade de recuperação, taxa de intervenção humana. Registre o baseline em evals/baselines/.
- Gate de regressão: evals/thresholds.json define queda máxima de qualidade e aumento máximo de custo e latência; o CI falha se violado.
- Custos: roteador de modelos (modelo barato para classify_intent, modelo forte para geração), cache exato em Redis para consultas read-only, suporte a prompt caching quando o provedor oferecer, orçamento por execução e por usuário, relatório de custo por run e por usuário.
- CI/CD (GitHub Actions): ci.yml com lint, typecheck, unitários, integração com serviços Postgres e Redis, contrato OpenAPI, evals com FakeLLM e gate, build Docker; nightly-evals.yml com LLM real quando houver secret; deploy.yml que constrói e publica a imagem e faz deploy em staging com smoke test (alvo genérico documentado para AWS ECS/Fargate e Google Cloud Run). Mudanças em prompts/ e na configuração de modelos disparam as evals. Dockerfile multi-stage, usuário não root.
- docs/metrics.md: definição de cada indicador, como é calculado, baseline e meta.
Aceitação: pnpm eval roda de ponta a ponta e gera relatório; uma regressão proposital em um prompt faz o CI falhar (documente esse experimento); painel mostra p50/p95/p99, custo por tarefa e taxa de sucesso.

## 7. TESTES (RESUMO)
Unitários, integração (Postgres e Redis reais em container), contrato (OpenAPI), E2E da API, testes de segurança (injection e autorização), testes de caos (falhas injetadas), testes de performance (script k6 ou autocannon com metas de p95 documentadas) e evals de IA. Cobertura mínima de 80% nos pacotes core, llm e tools.

## 8. DOCUMENTAÇÃO DE ENSINO (OBRIGATÓRIA)
Crie docs/lessons com um arquivo por módulo (A1 Backend e APIs, A2 Event-Driven, A3 Bancos de dados, A4 Auth, A5 Testes e CI/CD, A6 Cloud, A7 Observabilidade, A8 Filas, retries e sistemas distribuídos, A9 Segurança, B1 Tokens e contexto, B2 System prompts, B3 Structured outputs, B4 Embeddings e RAG, B5 Tool calling, B6 Fine-tuning, C1 Arquitetura de agentes, C2 Workflows, C3 Frameworks, C4 Memória e contexto, D1 Custos, D2 Qualidade, D3 Evals e judges, D4 Métricas de produto). Cada arquivo deve conter, nesta ordem: 1) o que é e como funciona; 2) por que importa em AI Engineering; 3) quando usar e quando evitar; 4) como se conecta ao LLM e ao agente; 5) onde isso aparece neste código (links para arquivos); 6) tecnologias e trade-offs; 7) erros comuns, riscos e boas práticas; 8) como testar e validar; 9) um exercício prático e como verificar que entendi. Relacione com minha experiência em QA, APIs, TypeScript e testes. Escreva cada lição quando a fase correspondente for implementada. Para B6 (fine-tuning), não implemente treino; documente quando faz sentido, como montar o dataset a partir dos logs e evals, custos e riscos de overfitting.
Também crie: docs/architecture.md (diagramas Mermaid de arquitetura e de sequência da requisição, com os caminhos de falha), docs/adr/, docs/assumptions.md e um README com quickstart, comandos, variáveis de ambiente e como rodar cada fase.

## 9. FORMATO DAS SUAS RESPOSTAS A CADA FASE
Ao concluir uma fase, responda com: (1) o que foi feito e por quê; (2) arquivos principais; (3) comandos para rodar e testar; (4) resultado real dos testes e métricas; (5) decisões e trade-offs; (6) problemas conhecidos e alternativas; (7) como eu devo verificar manualmente; (8) próximo passo. Não prossiga para a próxima fase sem eu pedir.

## 10. OPCIONAL APÓS A FASE 5 (COMPARAÇÃO DE FRAMEWORKS)
Crie experiments/langgraph com o mesmo workflow implementado em LangGraph.js e experiments/llamaindex com o pipeline de RAG em LlamaIndex.TS, reutilizando os mesmos datasets. Gere docs/frameworks.md comparando: linhas de código, legibilidade, depuração, checkpoints e retomada, human-in-the-loop, qualidade e custo medidos pelas mesmas evals, e uma recomendação justificada de quando usar cada um e quando manter o código próprio.

## 11. DEFINIÇÃO DE PRONTO DO PROJETO
- Todas as fases com critérios de aceitação cumpridos e testes verdes no CI.
- Relatório de evals e baseline versionados; gate de regressão ativo.
- Painel com latência p50/p95/p99, tokens, custo por tarefa, taxa de erro e de sucesso de ferramentas.
- Suíte de segurança passando; auditoria completa.
- Documentação de ensino e ADRs completos.
