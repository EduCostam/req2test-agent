# B2 — System prompts versionados

1. **O que é e como funciona.** O loader lê Markdown com id e version no front matter, normaliza CRLF para LF e calcula SHA-256 do arquivo inteiro.
2. **Por que importa.** Alterar instruções muda comportamento; sem identidade do prompt não é possível associar regressão a uma versão.
3. **Quando usar e evitar.** Use instruções para orientar papel, formato e incerteza. Não use prompt como único mecanismo de validação ou autorização.
4. **Conexão com LLM e agente.** O system prompt acompanha cada tentativa. O reparo inclui a resposta anterior como mensagem assistant, não como instrução de sistema.
5. **Onde aparece.** [prompt](../../prompts/ask.md), [loader](../../packages/core/src/prompt.ts), [run](../../packages/core/src/ask.ts).
6. **Tecnologias e trade-offs.** Um parser pequeno aceita formato estrito id/version, evitando YAML completo e outra dependência. É menos flexível, mas a mensagem de erro deixa a exigência explícita.
7. **Erros e boas práticas.** Não altere prompt sem atualizar versão. Hash ainda detecta mudança acidental sem bump. Normalizar fim de linha mantém identidade entre Windows e Linux.
8. **Como testar.** O teste verifica igualdade LF/CRLF, mudança de hash ao alterar texto e rejeição de metadados ausentes. Cada run persiste id/version/hash.
9. **Exercício e entendimento.** Mude uma frase e compare hashes; depois troque apenas LF por CRLF. Explique por que somente a primeira operação deve mudar a identidade lógica do prompt.
