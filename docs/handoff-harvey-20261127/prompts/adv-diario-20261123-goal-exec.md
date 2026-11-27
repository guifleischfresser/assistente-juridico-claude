/goal

**Objetivo**  
Implemente apenas o item 1, pedido prioritário do Guilherme. Proteja a correspondência da anonimização em um cofre local por caso, restaure dados reais exclusivamente na exportação para Word e descarte o cofre e os históricos locais vinculados quando o advogado encerrar o caso ou solicitar o descarte. Feche os dois pontos de exposição atuais do §17 (`tabela.json` e `*-dados-reais.md`) e preserve o registro de saída do §20.

**Escopo de arquivos**

- Crie `scripts/lib/cofre.js` para criptografia, chaves e migração. Em `scripts/lib/anonimizar.js`, limite o diff às funções de persistência e descoberta, preservando a API e os detectores. Em `scripts/anonimizar.js`, substitua `reverter` por orientação para exportar, sem gerar arquivo, e exponha a migração local.
- Em `scripts/exportar-docx.js`, implemente restauração explícita em memória. Confira os consumidores em `scripts/checar-peca.js`, `scripts/agentes.js` e nas skills que ainda orientam a usar `reverter`.
- Adicione `encerrar` e `descartar` a `scripts/processo.js`, reutilizando `scripts/lib/casos.js` e isolando a exclusão em módulo próprio. O CLI atual não tem comando de encerramento. Proteja o acesso às chaves e aos Word restaurados na `guarda-sigilo.js`, reaproveitando as guardas existentes.
- Atualize README, ARQUITETURA §§17/19/20, CHANGELOG, corpos/referências das skills existentes e `testes/rodar-testes.js`.
- #16 tem sobreposição inevitável nos dois arquivos `anonimizar.js`. Concentre os pontos de integração no armazenamento e nos subcomandos. Com #15 não há conflito inevitável identificado. Preserve os contratos usados pelos hooks e trate a memória no exportador, sem editar os arquivos de #15. Não mexa nos PRs abertos.

**Restrições**

- Node puro, Windows/macOS/Linux. Use AES-256-GCM com nonce aleatório por gravação, formato versionado e chave aleatória por caso fora dele e do escritório, sob o diretório local de configuração do Claude. Sem `.env`. Restrinja o acesso à chave ao usuário onde a plataforma permitir e mantenha-a fora das ferramentas do modelo.
- Sem rede/nuvem no recurso, permissões amplas, `--dangerously-skip-permissions` ou `bypassPermissions`. Mantenha o contexto fixo das skills em até 3.869 caracteres. Nenhum dado restaurado em stdout, erros, memória de estilo, snapshots ou temporários em claro.

**Critérios de pronto**

- Migração idempotente preserva IDs, variantes e metadados. Só remove o legado depois de gravar e validar o cofre. Chave ausente, adulteração, falha parcial e concorrência não causam sobrescrita nem perda silenciosa. Oriente a revisão local de `*-dados-reais.md` antigos e suas versões.
- Word restaurado sai direto da peça com marcadores, no caso correto e mediante opção explícita. Preserve as checagens de citações e texto oculto. Erro de cofre ou marcador órfão bloqueia a restauração mesmo com `--forcar`. Preserve a exportação forçada com marcadores grifados no fluxo sem restauração.
- `encerrar` e `descartar` exigem confirmação e removem cofre, chave, legado e somente históricos inequivocamente atribuídos ao caso em `CLAUDE_CONFIG_DIR/projects`. Valide caminhos reais e vínculos de sessão, inclusive quando o projeto é compartilhado. Preserve sessões ativas, mistas ou ambíguas e informe pendências. Teste casos com prefixos parecidos e links/junções. Registre data, ação e resultado sem nomes, caminhos ou conteúdo. Documente os limites para backups e dados já enviados.
- Teste com dados sintéticos. Passe a suíte normal e com fuso/relógio falso, a verificação e as simulações do bootstrap e o fluxo PowerShell 5.1 do CI. Ao final, abra PR em pt-BR só com `gh`, sem merge, tag ou release.

Instruções de execução (do orquestrador):
- Trabalhe no worktree atual (branch codex/diario-20261123, a partir de origin/main). Implemente, rode node testes/rodar-testes.js e o que o CI roda (leia .github/workflows) e corrija até tudo passar.
- Antes de terminar, faça uma revisão crítica do próprio diff (escopo, código morto, placeholders, vazamento de dado real em stdout/erros) e corrija.
- Faça commits locais com mensagens em pt-BR. NÃO faça push nem abra PR: o orquestrador faz isso depois de conferir. Nunca merge, tag ou release.
- Testes nunca devem tocar o ~/.claude real: use diretórios temporários e CLAUDE_CONFIG_DIR/HOME falsos.
- No fim, responda com um resumo curto: o que fez, arquivos, resultado dos testes (números), limitações e conflitos esperados com #16.