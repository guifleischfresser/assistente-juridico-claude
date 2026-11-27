/goal

**Objetivo**  
Implementar o candidato 2. Na pesquisa de jurisprudência, cada afirmação sobre o que um tribunal decidiu deve vir com um link direto ou caminho local que o advogado consiga abrir e uma frase literal do julgado que sustente a afirmação. A conferência atual já compara citações com o original, mas `julgados.js comparar` pode registrar `confere` quando a peça não tem trecho entre aspas. O fluxo de pesquisa precisa distinguir localizar o julgado de comprovar uma afirmação sobre ele.

**Escopo de arquivos**

- `skills/verificar-citacoes/SKILL.md` — no corpo da skill, oferecer um fluxo para pedidos de pesquisa sem peça e encaminhar para a mesma regra de evidência usada na conferência de uma peça. Preservar o frontmatter byte a byte.
- `skills/verificar-citacoes/references/conferencia-online.md` — detalhar o formato da resposta e os casos de evidência insuficiente. Corrigir a orientação que trata uma busca oficial sem resultado como prova de inexistência.
- `CHANGELOG.md` — acrescentar uma entrada curta em pt-BR.

**Restrições**

- Reusar a leitura local e o fluxo existente de `/verificar-citacoes` e `julgados.js`. Preservar CLI, registros, consulta de súmulas e regras de exportação. Sem skill, hook, dependência ou configuração nova. Manter o contexto fixo das skills em até 3.869 caracteres.
- Começar pelas fontes locais. Consultar rede ou nuvem somente com pedido explícito do advogado e respeitar `verificacaoOnline: "nunca"`, as permissões de domínio e a autorização distinta para busca aberta. Manter dados de clientes locais e por caso, sem copiá-los para a WIKI ou incluí-los em consultas. Nunca sugerir `--dangerously-skip-permissions` ou `bypassPermissions`.
- Preservar compatibilidade com Windows, macOS e Linux. Evitar todos os arquivos funcionais dos PRs #15, #16 e #17. A única sobreposição prevista é `CHANGELOG.md`, com possível conflito no bloco de alterações pendentes. Nenhum conflito textual é inevitável. `ARQUITETURA.md`, `README.md` e `testes/rodar-testes.js` ficam fora do escopo.

**Critérios de pronto**

- Em pesquisa sem peça e em conferência de peça, cada afirmação sustentada identifica o julgado, aponta a página específica ou o arquivo local acessível e traz a frase literal relevante. Qualquer interpretação da passagem aparece como interpretação.
- Se a fonte estiver inacessível, ilegível ou não sustentar a afirmação, responder “não achei fonte verificável para esta afirmação” e manter a pendência. Link presumido, resultado de busca e registro anterior de `confere` sem trecho são insuficientes. Usar `inexistente` só quando houver evidência positiva de que a referência é inválida.
- Validar com exemplos locais fictícios e sem rede que cubram fonte legível com trecho de apoio, julgado localizado sem apoio para a tese e fonte inacessível ou ilegível. Conferir o diff do frontmatter e rodar `node testes/rodar-testes.js`, `node ferramentas/sincronizar-bootstrap.js --verificar` e a simulação de bootstrap correspondente ao sistema. No PR, verificar os jobs `testes` e `testes-fuso` nos três sistemas, inclusive o instalador PowerShell 5.1 com `doutor` e as falhas que a matriz tolera.
- Ao final, publicar apenas a branch de trabalho e abrir o PR para `main` com `gh`, com título e descrição em pt-BR. Relatar validações e sobreposições no PR. Sem merge, tag ou release.

Branch já criada: codex/diario-20261124 (worktree atual, de origin/main). Nunca rode gh pr merge. Nunca use bypass de permissões.
