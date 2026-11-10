# ADR 0004 — Antecipar a integração contínua

## Contexto
Após validar a Fase 1 localmente, o usuário pediu GitHub Actions para deixar de executar todas as verificações manualmente. Essa autorização antecipa a CI originalmente prevista para a Fase 5, sem iniciar as outras funcionalidades dessa fase.

## Decisão
Executar checks em Node 20 e 24 em cada push na main, pull request e acionamento manual. Um job separado constrói as imagens e inicia o Compose com volume novo, aguarda readiness TCP e saúde da API, verifica HTTP JSON/SSE e executa o teste de integração PostgreSQL. DATABASE_URL é definida no job, eliminando a configuração manual que causou erro no terminal. Somente FakeLLMClient, sem chaves de API. Relatórios e logs são artifacts por 14 dias; falhas bloqueiam o sucesso do job.

## Alternativas e trade-offs
Somente testes com mocks seriam mais rápidos, mas não detectariam a corrida de inicialização do banco observada localmente. O teste com Compose custa alguns minutos e valida a mesma composição usada pelo usuário. Node 20 testa o mínimo declarado, Node 24 a versão recomendada. A CI usa runners descartáveis; a remoção de volumes só ocorre neles.

## Escopo
Esta entrega automatiza CI e build. Deploy contínuo (CD) exige escolher destino e credenciais; não há publicação de aplicação ou imagem neste workflow. Proteção de branch é uma configuração separada: checks vermelhos não impedem por si só um push direto à main.

Referências: [setup-node](https://github.com/actions/setup-node), [Compose up --wait](https://docs.docker.com/reference/cli/docker/compose/up/).
