# ADR 0001 — Base TypeScript sem framework de IA

## Contexto
Precisamos aprender o caminho HTTP → LLM → validação → persistência com testes offline e poucas abstrações.

## Decisão
Node >=20, ESM, TypeScript strict e pnpm workspaces; Node 24 é a versão recomendada e testada. Manifests delimitam apps/api, core, llm e evals. Dependências ficam na raiz nesta fase, com imports relativos; os pacotes ainda não são distribuídos independentemente. Versões diretas e lockfile são fixados.

Fastify cuida de HTTP e injeção em testes; @fastify/swagger publica o contrato. Zod valida saída e gera JSON Schema para entrada/OpenAPI, evitando schemas divergentes. Pino gera logs estruturados. `pg` executa SQL parametrizado sem ORM. `fetch`, crypto, streams e AbortController nativos evitam dependências extras. TypeScript/tsx compilam/executam; ESLint + typescript-eslint verificam o código; Vitest + coverage-v8 testam e medem cobertura; Ajv verifica respostas contra o contrato publicado. @types/node e @types/pg são apenas tipos.

## Alternativas
Express exigiria montagem extra de contrato e injeção. ORM reduziria SQL explícito, mas esconderia o exercício de persistência. Frameworks de IA não trazem benefício para três chamadas limitadas.

## Trade-offs
Imports relativos e dependências na raiz facilitam leitura, mas requerem reorganização se os pacotes forem publicados separadamente. ESLint 9 e Vitest 3 foram escolhidos pela compatibilidade com a linha Node 20; o registry marca ESLint 9 como deprecated. Atualização de ferramentas fica condicionada a revisar a matriz de Node, não ignorar o aviso. As versões efetivas estão no lockfile.

Referência: [conversão nativa de JSON Schema no Zod](https://zod.dev/json-schema).
