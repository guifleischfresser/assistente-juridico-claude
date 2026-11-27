# Handoff — Harvey (IA Jurídica do Guilherme)

Data: 27/11/2026 (America/Sao_Paulo)

## 1. Contexto e papel
O Harvey cuida da IA jurídica do Guilherme Cordeiro Fleischfresser:
- Evolução do mod **assistente-juridico-claude** (`guifleischfresser/assistente-juridico-claude`).
- Evolução do app **WrapAdv** (`guifleischfresser/wrapadv`).
- Monitoramento do X sobre IA na advocacia BR e mods do Claude Code.
- Não faz código do Life (responsabilidade do Claudeo) nem parecer/pesquisa fora do jurídico.

### Regras fixas do Guilherme
- **PRs e releases:** só abrir PR com testes passando; **merge, tag e release só com aprovação explícita do Guilherme**.
- **CLIs e custos:** programar usando apenas cotas incluídas nos planos dele — Claude Code CLI (Claude Pro), Codex CLI (ChatGPT) e Antigravity CLI (`agy`, conta Google gratuita). **Nunca usar API paga, top-up ou uso extra.** Gemini CLI foi aposentado.
- **Segurança:** nunca usar `--dangerously-skip-permissions` ou `bypassPermissions`; nunca expor segredos; nada sai para terceiros sem aprovação dele.
- **WrapAdv (`CLAUDE.md`):** nunca deixar `[PREENCHER]` nem opções A/B numa peça; buscar os dados do caso antes e perguntar ao advogado em bate-volta o que faltar. Outras pastas de casos não têm bloqueio rígido: o Claude pede autorização antes de olhar outro caso, salvo quando o advogado pede expressamente. Documentos originais, provas e decisões judiciais ficam protegidos contra alteração.
- **LGPD (mod):** anonimização totalmente local (regras determinísticas primeiro: CPF, CNPJ, OAB, RG, telefone, e-mail, CEP, número de processo + dicionário de nomes; segunda passada opcional com modelo pequeno local via Ollama, sem nada sair da máquina; se Ollama não existir, regras com aviso e prévia `simular`). Cofre local criptografado por caso (não `.env`), dado real restaurado só na exportação para Word, e descarte do cofre e históricos de sessão ao fechar o caso com registro.

---

## 2. Estado atual dos repositórios e PRs

### `guifleischfresser/assistente-juridico-claude`
- **Última release / tag:** `v0.8.0` (28/10/2026). PRs #7 a #14 já foram mergeados na `main` (HEAD `aea40a8`, 518 testes verdes), sem nova tag/release.
- **PRs abertos (5 PRs aguardando revisão/merge do Guilherme):**
  1. **PR #15** (`claude/diario-20261117`) — *Integridade do núcleo: aviso local quando um arquivo do assistente é mexido*
     - URL: https://github.com/guifleischfresser/assistente-juridico-claude/pull/15
     - CI: **todo verde** (Ubuntu, Windows, macOS — `testes` e `testes-fuso`).
     - Escopo: manifesto SHA-256 local em `~/.claude/advogado/integridade.json`, `scripts/integridade.js conferir/aceitar --confirmo`, aviso no SessionStart, linha no doutor, `/consertar` reinstala do pacote local com backup, guarda impede o Claude de editar o manifesto.
  2. **PR #16** (`claude/diario-20261118`) — *Anonimização: segunda passada local com Ollama (`--ia-local`, opt-in)*
     - URL: https://github.com/guifleischfresser/assistente-juridico-claude/pull/16
     - CI: **todo verde** (Ubuntu, Windows, macOS — `testes` e `testes-fuso`).
     - Escopo: segunda passada local opcional com Ollama (`localhost`/loopback apenas).
  3. **PR #17** (`codex/diario-20261123`) — *LGPD: cofre cifrado por caso, dado real só no Word e descarte do caso*
     - URL: https://github.com/guifleischfresser/assistente-juridico-claude/pull/17
     - CI: Ubuntu e macOS verdes; **falha em `testes (windows-latest)` e `testes-fuso (windows-latest)`** (falha no runner do PowerShell 5.1 / `Expand-Archive`/`ExtractToDirectory`).
  4. **PR #18** (`codex/diario-20261124`) — *Exige fonte e trecho literal na pesquisa de jurisprudência*
     - URL: https://github.com/guifleischfresser/assistente-juridico-claude/pull/18
     - CI: Ubuntu, macOS e `testes-fuso (windows-latest)` verdes; **falha em `testes (windows-latest)`** (mesmo erro do PowerShell 5.1 no bootstrap).
     - Escopo: `/verificar-citacoes` exige link/arquivo local + frase literal; sem isso responde "não achei fonte verificável" e marca pendente. Só skill + CHANGELOG.
  5. **PR #19** (`codex/diario-20261125`) — *Entrega mostra o que foi conferido, o que ficou pendente e o que foi assumido*
     - URL: https://github.com/guifleischfresser/assistente-juridico-claude/pull/19
     - CI: Ubuntu, macOS e `testes-fuso (windows-latest)` verdes; **falha em `testes (windows-latest)`** (mesmo erro do PowerShell 5.1).
     - Escopo: `/revisar`, `/nova-peca`, `/mapa-de-teses` e `/advogado-do-diabo` terminam com listas Conferi / Não consegui conferir / Assumi + até 3 prioridades.

*Nota de conflitos:* PRs #15 a #19 tendem a conflitar em `CHANGELOG`, `ARQUITETURA`, `README` e suíte de testes; resolver em ordem (#15 -> #19) ao mergear.

### `guifleischfresser/wrapadv`
- **PRs abertos:** nenhum.
- **Último merge:** PR #2 (`feat/demo-pasta-raiz`, merge commit `1ecd5e2` em 16/11/2026), CI verde em Ubuntu/macOS/Windows × Node 20 e 22.
- **Sem releases/tags** publicadas ainda.

---

## 3. Arquivos e pastas principais no box
- `/workspace/advogado-claude-repo` — clone principal do `assistente-juridico-claude` (atualmente na branch `claude/diario-20261118`).
- `/workspace/advogado-claude-20261123`, `20261124`, `20261125` — worktrees/checkouts das rodadas diárias recentes.
- `/workspace/wrapadv` — clone principal do `wrapadv` (branch `claude/fase1-wrapadv`).
- `/workspace/wt-wrapadv-demo` — worktree da branch `feat/demo-pasta-raiz` (PR #2 já mergeado).
- `/workspace/mapa-x/monitor/seen_ids.json` e `/workspace/mapa-x/monitor/log.md` — estado e histórico do monitor do X.
- Skills usadas: `claude-code-orchestrator` e `x-digest`.

---

## 4. Rotinas (Grok Bot)
Ambas as rotinas do Harvey foram pausadas em 27/11/2026:
- `Monitor X: IA agêntica na advocacia BR` (`monitor-x-ia-e-claude-code-na-advocacia-br`)
- `Prompt diário de código: assistente jurídico` (`prompt-di-rio-de-c-digo-assistente-jur-dico`)

---

## 5. Pendências e itens aguardando decisão do Guilherme
1. **Login do Claude Code CLI no box:** expirado (`loggedIn: false`); precisa rodar `claude auth login` caso volte a usar o Claude CLI no box. (Nos últimos dias o Codex CLI cobriu as rotinas.)
2. **Revisão e merge dos PRs #15 a #19** do `assistente-juridico-claude` (e decisão se gera nova tag/release depois de `v0.8.0`).
3. **Correção do CI no Windows (`windows-latest`):** investigar e abrir PR para corrigir a falha do bootstrap no PowerShell 5.1 (`Expand-Archive`/`ExtractToDirectory`) que afeta os PRs #17, #18 e #19.
4. **Conferência da lista de 16 súmulas do PR #12 (já mergeado):** foi montada de memória pelo Claude, sem internet; vale revisar antes de um release oficial.
5. **Duas pequenas lacunas no WrapAdv (do PR #2):**
   - Deixar a lista de perguntas ao advogado explicitamente numerada no `CLAUDE.md`.
   - Adicionar a exceção explícita para quando o advogado pedir para olhar outro caso.
6. **Achados recentes do Monitor X para aproveitar nos próximos PRs:**
   - Testar se avisos de hooks `PostToolUse` com exit 0 chegam ao Claude ou somem no log de debug (relato `@kurenn`).
   - Configurar `engines["claude-code"]` no `plugin.json` e conferir permissões `Skill(nome)` no allow (Claude Code 2.1.323 / 2.1.325).
   - Avaliar integração MCP com DataJud/CNJ (`MCP Jurídico Brasil`) e Jusratio.
   - Conferir a Resolução OAB 16/2026 (ler texto oficial antes de assumir).
7. **Contas sugeridas para o monitor X (sem resposta ainda):** `@juslogica`, `@felvieira_dev`, `@hallucin8d`, `@marcusaraujobhz`, `@figueirego`, `@diegohfontes`.
8. **Gemini CLI:** aposentado, ainda instalado no box; desinstalar só se o Guilherme quiser.

---

## 6. Próximos passos para continuar em outra sessão (ex.: claude.ai/code)
1. Clonar/abrir `guifleischfresser/assistente-juridico-claude` e `guifleischfresser/wrapadv`.
2. Corrigir o teste/bootstrap no PowerShell 5.1 (`windows-latest`) e revalidar os PRs #17, #18 e #19.
3. Com o OK do Guilherme, revisar/mergear os PRs #15 a #19 em ordem, revisar a lista de 16 súmulas do #12 e decidir pela release `v0.9.0`.
4. No `wrapadv`, aplicar os 2 ajustes pendentes no `CLAUDE.md` (perguntas numeradas e exceção para olhar outro caso quando pedido).
