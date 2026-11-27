/goal

**Objetivo**

Implementar a ideia 1 (@adriano_viana). Ao entregar uma minuta, revisão ou análise de peça, mostrar o que foi conferido, o que ficou sem conferência e quais premissas foram adotadas. Destacar até três pontos das duas últimas listas com maior consequência se estiverem errados.

Em `origin/main`, `/revisar` já classifica achados por gravidade, `/nova-peca` já lista campos a preencher e citações não verificadas, e `/mapa-de-teses` já aponta o que falta conferir. `checar-peca.js` distingue citações com fonte das conferidas no original. Falta reunir essas informações com as premissas e priorizar as incertezas na entrega. É uma melhoria útil nos fluxos atuais, com escopo restrito ao corpo das skills.

**Escopo de arquivos**

- Criar `skills/revisar/references/entrega.md` com o formato comum e exemplos sintéticos.
- Referenciar o formato no passo de entrega de `skills/revisar/SKILL.md`, `skills/nova-peca/SKILL.md`, `skills/mapa-de-teses/SKILL.md` e `skills/advogado-do-diabo/SKILL.md`, preservando as saídas específicas de cada fluxo.
- Pelos arquivos informados, nenhum conflito inevitável com #15, #16, #17 ou #18. O fluxo de citações usa a integração existente. Registre a mudança no corpo do PR para evitar sobreposição no `CHANGELOG.md` com #18.

**Restrições**

- Preservar o frontmatter e o tamanho das descrições sempre carregadas. Carregar a referência na etapa de entrega. Manter os checks, os marcadores e as regras de versionamento existentes.
- Usar as evidências da tarefa atual. Dados de cliente ficam no caso correspondente, com os marcadores de anonimização aplicáveis. Sem persistência do resumo em memória automática, `MEMORIA/` ou `CLAUDE.md` global.
- Sem novas dependências, comandos, hooks ou permissões. Compatível com Windows, macOS e Linux. Rede ou nuvem somente mediante pedido explícito do usuário. Nunca sugerir `--dangerously-skip-permissions` ou `bypassPermissions`.

**Critérios de pronto**

- Os quatro fluxos terminam com as três listas. Cada conferência indica brevemente o que foi checado e a fonte ou o teste usado. Cada pendência explica o que faltou, e cada premissa identifica o que foi adotado provisoriamente. Lista vazia é indicada explicitamente. Citação com fonte só conta como conferida no original se essa conferência ocorreu.
- Marcar nas próprias listas até três itens distintos de “Não consegui conferir” e “Assumi”, combinadas, em ordem de impacto provável. Dar a consequência concreta e o próximo passo de validação de cada destaque. Se houver menos de três, destacar apenas os existentes. Preservar `[PREENCHER]`, `[NÃO VERIFICADO]` e as saídas atuais.
- Validar com exemplos sintéticos de minuta, revisão e análise, incluindo uma lista vazia, mais de três candidatos a destaque e uma citação com fonte ainda pendente de conferência no original.
- Passar `node ferramentas/sincronizar-bootstrap.js --verificar`, `node testes/rodar-testes.js` e as etapas de `testes` e `testes-fuso` em `.github/workflows/release.yml`, incluindo bootstrap Bash, instalador silencioso + doutor e bootstrap no Windows PowerShell 5.1. Conferir os resultados por plataforma, inclusive nos jobs tolerantes a erro.
- Abrir o PR contra `main` somente com `gh`, com título e corpo em pt-BR. Registrar testes, resultados de CI e sobreposições encontradas. Sem merge, tag ou release.