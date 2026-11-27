## O que muda (LGPD: o Claude não guarda dado real do cliente)

Pedido do Guilherme (17/11): a correspondência da anonimização sai do `tabela.json` em texto puro e vai para um **cofre local cifrado por caso**; o dado real só volta **no Word**; e encerrar/descartar o caso apaga o cofre e os históricos do Claude daquele caso, com registro.

- **Cofre por caso** (`scripts/lib/cofre.js`): AES-256-GCM (crypto nativo do Node), nonce aleatório por gravação, chave aleatória por caso **fora** da pasta do caso e do escritório (modo 0600 onde o sistema permite), ID persistente no cabeçalho (copiar a pasta para backup/OneDrive/outro volume continua funcionando com a mesma chave). Trava recuperável e gravação retomável. Sem `.env`.
- **Migração** `anonimizar.js migrar <caso>`: idempotente; só remove o `tabela.json` depois de gravar e validar o cofre; orienta revisar os `*-dados-reais.md` antigos.
- **Word restaurado** `exportar-docx.js <peça.md> --restaurar`: restaura em memória, grava `-restaurado.docx` por temporário 0600 + rename atômico; sem arquivo intermediário em claro. Recusa (código 2) peça de outro caso (vínculo da minuta com o cofre), cofre inválido ou marcador órfão, mesmo com `--forcar`. Citações e súmulas são checadas no texto restaurado, sem imprimir dado real. `reverter` deixou de gravar `-dados-reais.md`.
- **Encerrar/descartar** `processo.js encerrar|descartar <caso>` (`scripts/lib/descarte.js`): com confirmação, remove cofre, chave e legado e só os históricos em `CLAUDE_CONFIG_DIR/projects` com prova de isolamento desde o início da sessão (SessionStart/SessionEnd gravam recibos locais). Conversas de diretórios compartilhados, ativas ou ambíguas são preservadas e listadas para apagar à mão. Registro com data, ação e resultado, sem nomes, caminhos ou conteúdo. Limites documentados (backups, Word já exportado, dados já enviados).
- Guardas: `guarda-sigilo` e `permissions.deny` bloqueiam leitura das chaves, do cofre e do Word restaurado.
- Docs: ARQUITETURA §§17/19/20, README, CHANGELOG, skills `/anonimizar`, `/processo`, `/formatar-peca`. Contexto fixo segue em 3.869.

Tudo local: nenhuma chamada de rede, nenhuma dependência nova, sem bypass de permissões.

## Testes
- `node testes/rodar-testes.js`: 551 ok, 0 falha (Linux), também com fuso de São Paulo e relógio falso; bootstrap Bash 28/28.
- Novos testes: cofre/migração/interrupção, cópia da pasta para outro lugar, minuta copiada de A para B recusada, descarte preservando conversa do escritório que cita A e B, DOCX atômico.

## Conflitos esperados
- **#16 (Ollama)**: sobreposição em `scripts/anonimizar.js` e `scripts/lib/anonimizar.js` (persistência e subcomandos). Quem entrar depois precisa de rebase.
- **#15**: toca `skills/ajuda/SKILL.md` (uma linha).

Escrito com o **Codex CLI** (o login do Claude Code no box expirou), revisado por uma segunda sessão do Codex com contexto limpo; 2 rodadas de correção. Sem merge, tag ou release.