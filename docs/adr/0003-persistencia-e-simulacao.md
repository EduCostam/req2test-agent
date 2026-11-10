# ADR 0003 — Tentativas persistidas e custos identificados

## Contexto
Uma resposta final válida pode esconder duas chamadas inválidas e seus custos. Timeout não significa que o provedor deixou de cobrar.

## Decisão
Um run tem até três llm_calls, cada qual criada como running antes do acesso ao modelo e atualizada após retorno. `is_simulated`, modelo, tokens, custo, latência e versão do prompt ficam em cada chamada. Run registra id/versão/hash do prompt. Custo usa USD por milhão de tokens, desconta tokens em cache do preço normal e preserva dez casas decimais. Preços reais são obrigatórios via ambiente; fictícios têm configuração própria.

Migrations SQL versionadas têm checksum normalizado LF, transação e lock consultivo para evitar concorrência. O comando é explícito; o serviço migrate do Compose termina antes de iniciar a API. Perguntas/respostas não são gravadas. Store em memória existe apenas para testes e smoke.

## Alternativas
Gravar somente a resposta final perderia o custo de reparo. Gravar zero em timeout inventaria informação. ORM não é necessário para duas tabelas.

## Trade-offs
Não mantemos transação aberta durante a chamada remota. Se o processo morrer, um registro running pode ficar pendente até uma futura reconciliação. Metadados ajudam diagnóstico, mas não permitem reproduzir conteúdo privado. O teste de contrato SQL não substitui a integração com PostgreSQL: execute `pnpm test:postgres` localmente.
