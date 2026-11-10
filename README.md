# req2test-agent

Fase 1: API de QA com resposta estruturada, Fake determinístico, reparo limitado, metadados PostgreSQL e smoke offline. **Docker e PostgreSQL real ainda precisam de validação local pelo usuário.**

## OBRIGATÓRIO

Node >=20 (recomendado/testado 24, conforme `.nvmrc`) e pnpm 10.28.0. Execute comandos na raiz do repositório. Para o ambiente completo, Docker Engine/Desktop com Compose.

```powershell
corepack enable
corepack prepare pnpm@10.28.0 --activate
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm eval:smoke
pnpm build
```

Se Corepack não estiver instalado, use `npx --yes pnpm@10.28.0` no lugar de `pnpm`. Os testes bloqueiam sockets externos e fetch; o adaptador real usa transporte injetado nos testes. Não é necessária chave de API. Os relatórios ficam em `reports/`.

### Subir e validar Docker localmente (PowerShell)

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps -a
Invoke-RestMethod http://localhost:3000/health
$body = @{ question = 'Como testar campos obrigatórios?' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/v1/ask -ContentType 'application/json' -Body $body
docker compose logs --tail 100 migrate api
docker compose exec postgres psql -U qa -d qa_agent -c "SELECT status, count(*) FROM runs GROUP BY status;"
docker compose exec postgres psql -U qa -d qa_agent -c "SELECT attempt,status,is_simulated,input_tokens,output_tokens,cost_usd,prompt_version FROM llm_calls ORDER BY created_at DESC LIMIT 10;"
```

O health check esperado é `{"status":"ok"}`. Aguarde a API ficar healthy em `docker compose ps`; `migrate` deve terminar com código 0. Abra http://localhost:3000 para a UI. Se falhar, examine os logs; não há resultado de execução Docker atribuído ao agente.

Teste SSE sem problemas de escape do PowerShell:

```powershell
curl.exe -N -H "Content-Type: application/json" --data-binary '{"question":"Como testar uma API?"}' http://localhost:3000/v1/ask/stream
```

Em Windows PowerShell 5.1, prefira `Invoke-WebRequest -Method Post -Uri http://localhost:3000/v1/ask/stream -ContentType 'application/json' -Body $body` para inspecionar o corpo SSE completo. Espere `event: status`, depois `event: result`; erros depois dos headers chegam como `event: error` com HTTP 200.

Valide migrations idempotentes e persistência real (insere um run identificado `postgres-manual-check`):

```powershell
$env:DATABASE_URL = 'postgres://qa:qa_local_only@localhost:5432/qa_agent'
pnpm test:postgres
docker compose down
```

`down` mantém o volume. Credenciais do Compose são somente para desenvolvimento local. Os testes offline não substituem esse teste real.

### API sem container (banco local necessário)

```powershell
$env:DATABASE_URL = 'postgres://qa:qa_local_only@localhost:5432/qa_agent'
pnpm db:migrate
pnpm dev
```

As variáveis não são carregadas automaticamente de `.env`; `.env.example` é referência. Configure-as no terminal ou use o suporte `--env-file` do Node compatível com sua versão. O Compose usa configuração explícita e roda Fake.

| Variável | Padrão/uso |
|---|---|
| DATABASE_URL | Obrigatória para API e migrations |
| HOST / PORT | 127.0.0.1 / 3000; Compose usa 0.0.0.0 dentro do container |
| LLM_PROVIDER | fake; compatible apenas se configurado explicitamente |
| FAKE_SEED | 10: provoca 3/20 saídas iniciais inválidas no smoke |
| LLM_TIMEOUT_MS | 5000 por chamada (máximo 120000) |
| LLM_BASE_URL / LLM_API_KEY / LLM_MODEL | Obrigatórias somente para compatible; URL HTTPS |
| LLM_INPUT_USD_PER_MILLION / LLM_OUTPUT_USD_PER_MILLION / LLM_CACHED_USD_PER_MILLION | Preços explícitos obrigatórios para compatible |

Rotas: `GET /health`, `GET /openapi.json`, `POST /v1/ask`, `POST /v1/ask/stream`, `GET /`. Body: `{"question":"..."}`. Resposta JSON: `answer`, `confidence`, `assumptions`, `sources`. Erro: `{"error":{"code":"...","message":"...","requestId":"..."}}`. HTTP 400 entrada inválida, 413 body grande, 502 erro/saída inválida do LLM, 504 timeout, 503 banco indisponível no health, 500 falha interna. `x-request-id` e `x-run-id` identificam respostas JSON bem-sucedidas.

## RECOMENDADO

Leia [arquitetura](docs/architecture.md), [suposições](docs/assumptions.md), [ADRs](docs/adr/0001-stack-e-workspaces.md), [lições](docs/lessons/README.md) e [métricas](docs/metrics.md). Compare os relatórios regenerados com os versionados. Teste dois reparos e falha final em `tests/core.test.ts`. Não use o resultado do Fake como evidência de qualidade de um LLM.

## OPCIONAL

O adaptador HTTPS aceita protocolo chat-completions com schema estruturado, mas não foi validado com um provedor real. Para usá-lo, defina todas as variáveis `LLM_*` e rode a API fora do Compose padrão. Consulte preços e compatibilidade do provedor antes de configurar. Nunca use chave real em testes ou CI. Frameworks de IA, Redis, ferramentas e deploy não fazem parte desta entrega.

## Fases seguintes

A Fase 1 é a única implementada. Fase 2 (RAG), 3 (agente), 4 (produção) e 5 (evals/CI/deploy) só serão iniciadas mediante pedido. Nenhum comando destas fases existe ainda.
