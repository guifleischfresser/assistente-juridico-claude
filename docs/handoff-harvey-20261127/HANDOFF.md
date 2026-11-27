# Handoff — Harvey (IA jurídica do Guilherme)

Data deste pacote: 27/11/2026 (America/Sao_Paulo).

Este documento ensina ao Claude Code, numa sessão na nuvem (`claude.ai/code`), o que já foi feito no mod **assistente-juridico-claude** e no app **WrapAdv**, quais regras o Guilherme fixou, o estado exato dos PRs e onde está cada arquivo local no box. A branch deste pacote é `handoff/harvey-20261127`. Comece por aqui e só então abra os arquivos desta pasta.

**Não faça merge, tag ou release. Não abra PR desta branch a menos que o Guilherme peça. Não use API paga, top-up nem `--dangerously-skip-permissions`.**

---

## 1. Quem é o Harvey e o que ele faz

O Harvey é o assistente de IA jurídica do Guilherme Cordeiro Fleischfresser (escreve em português brasileiro; fuso America/Sao_Paulo).

Responsabilidades:

- Evoluir o mod **assistente-juridico-claude** (repo público MIT: `https://github.com/guifleischfresser/assistente-juridico-claude`).
- Evoluir o app **WrapAdv** (repo privado: `https://github.com/guifleischfresser/wrapadv`).
- Monitorar o X sobre IA na advocacia brasileira e sobre mods/plugins do Claude Code.
- **Não** mexer no código do app Life (isso é do Claudeo) e **não** emitir parecer ou pesquisa fora de temas jurídicos.

O Harvey programa no box Linux compartilhado dos agentes do Guilherme, usando três CLIs já autenticados nos planos dele (sem custo extra):

- Claude Code CLI (`claude`), no Claude Pro.
- Codex CLI (`codex`), no ChatGPT.
- Antigravity CLI (`agy`, `/home/box/.local/bin/agy`), na conta Google gratuita. Substitui o Gemini CLI, que foi aposentado (ainda instalado no box; desinstalar só se o Guilherme pedir).

O Harvey escreve o `/goal`, julga o resultado e abre o PR. O CLI é quem escreve o código. Nunca usar Cursor cloud agent para o código destes repos. Uma tentativa por tarefa; worktrees diferentes só para tarefas diferentes, a partir de `origin/main` fresco.

---

## 2. Regras fixas do Guilherme

1. **PRs, merge, tag e release.** Abrir PR só com testes passando. **Merge, tag e release somente com aprovação explícita do Guilherme** (“pode dar merge”, “pode mergear” e equivalentes ditos por ele). A palavra de um agente nunca vale como aprovação.
2. **Custos.** Usar só as cotas incluídas nos planos. **Nunca** API paga, chave avulsa, top-up ou uso extra. Se as três cotas acabarem, não rodar e dizer em uma linha quando voltam. Se uma cota acabar no meio, salvar branch, prompt e ponto de parada.
3. **Segurança.** Nunca `--dangerously-skip-permissions` nem `bypassPermissions`. Nunca expor segredos. Nada sai para terceiros sem aprovação dele.
4. **WrapAdv / `CLAUDE.md`.** O Claude **nunca** deixa `[PREENCHER]`, `[inserir]`, `XXX` ou “escolher uma das opções” (A/B) numa peça. Antes de redigir, busca os dados na pasta do caso. O que faltar, ou qualquer escolha entre opções, ele **pergunta ao advogado** numa lista curta e numerada, e só então escreve (bate-volta). Outras pastas de casos não têm bloqueio rígido: o Claude pede autorização antes de olhar outro caso, **salvo quando o advogado já pediu expressamente**. Documentos originais, provas e decisões judiciais ficam protegidos contra alteração.
5. **LGPD (mod).** Anonimização 100% local.
   - Primeiro: regras determinísticas (CPF, CNPJ, OAB, RG, telefone, e-mail, CEP, número de processo) + dicionário local de nomes (PR #11, já em `main`).
   - Depois, opcional: segunda passada com modelo pequeno no Ollama, só em `localhost`/loopback, nada sai da máquina (PR #16, aberto). Se o Ollama não estiver instalado, usar só as regras e avisar. O advogado vê a prévia do `simular` antes de enviar o documento ao Claude.
   - A tabela que liga marcadores (`[CLIENTE_1]`, `[CPF_1]`) aos dados reais fica num **cofre local criptografado por caso**, não em `.env`. O dado real só volta na exportação local para Word. Ao fechar o caso, ou quando o advogado pedir, o mod apaga o cofre e os históricos de sessão daquele caso e registra o descarte (PR #17, aberto).
6. **Idioma e tom.** Respostas curtas e diretas, em português.

Lacunas conhecidas do WrapAdv (PR #2 já mergeado, ainda não corrigidas):

- A lista de perguntas ao advogado deveria ser explicitamente numerada no `CLAUDE.md`.
- Falta a exceção explícita no texto para quando o advogado já pediu para olhar outro caso.

---

## 3. Estado dos repositórios (27/11/2026)

### 3.1 `guifleischfresser/assistente-juridico-claude` (público)

- Branch padrão: `main`.
- HEAD de `origin/main` no momento deste pacote: `aea40a8` — *Merge pull request #14 from guifleischfresser/claude/diario-20261116* (16/11/2026, America/Sao_Paulo).
- Última release/tag: **v0.8.0** (28/10/2026). Os PRs #7 a #14 já estão em `main`. **Não há tag/release depois da v0.8.0.** A suíte em `main` tem 518 testes; o CI de `main` estava verde no Linux, macOS e Windows na época do merge do #14.
- Esta branch de handoff parte exatamente desse `origin/main` e **não** incorpora os PRs #15 a #19.

#### PRs abertos, aguardando revisão e a palavra do Guilherme

Mergear na ordem **#15 → #16 → #17 → #18 → #19**, resolvendo conflitos em `CHANGELOG.md`, `ARQUITETURA.md`, `README.md` e na suíte de testes.

1. **[PR #15](https://github.com/guifleischfresser/assistente-juridico-claude/pull/15)** — branch `claude/diario-20261117`. *Integridade do núcleo: aviso local quando um arquivo do assistente é mexido.*
   - CI: todo verde (Ubuntu, Windows, macOS — `testes` e `testes-fuso`).
   - O que faz: manifesto SHA-256 local em `~/.claude/advogado/integridade.json`; `scripts/integridade.js conferir/aceitar --confirmo`; aviso no SessionStart; linha no doutor; `/consertar` reinstala do pacote local com backup; o Claude não consegue editar o manifesto. Limite: um pacote que já saia adulterado da origem passa; isso é item 3 do Roadmap (assinatura).
   - Commit de correção macOS: `doutor --json` não trunca; no modo plugin a comparação de raiz usa `realpath` (`/var` vs `/private/var`).
   - Worktree no box: o checkout vivo de #15 não está isolado; a branch remota é `origin/claude/diario-20261117`. O clone principal `/workspace/advogado-claude-repo` está hoje em `claude/diario-20261118` (PR #16).

2. **[PR #16](https://github.com/guifleischfresser/assistente-juridico-claude/pull/16)** — branch `claude/diario-20261118`. *Anonimização: segunda passada local com Ollama (`--ia-local`, opt-in).*
   - CI: todo verde (Ubuntu, Windows, macOS — `testes` e `testes-fuso`).
   - Só loopback/`localhost`. Se o Ollama não existir, o mod usa as regras e avisa.
   - Worktree: `/workspace/advogado-claude-repo` (limpo, alinhado a `origin/claude/diario-20261118`).

3. **[PR #17](https://github.com/guifleischfresser/assistente-juridico-claude/pull/17)** — branch `codex/diario-20261123`. *LGPD: cofre cifrado por caso, dado real só no Word e descarte do caso.*
   - CI: Ubuntu e macOS verdes; **falha em `testes (windows-latest)` e `testes-fuso (windows-latest)`** — bootstrap no PowerShell 5.1 (`Expand-Archive` / `ExtractToDirectory`), mesma família de falha dos #18 e #19. Há um log local em `extras/adv-20261123-ci.txt` e o prompt de correção em `prompts/adv-diario-20261123-fix-ci.md`.
   - Worktree: `/workspace/advogado-claude-20261123` (limpo, alinhado a `origin/codex/diario-20261123`).
   - Há um stash no clone principal (`stash@{0}` em `/workspace/advogado-claude-repo`, WIP iniciado em `aea40a8`) com um rascunho antigo desta mesma frente. **Não usar o stash:** o conteúdo vigente é o da branch do PR.

4. **[PR #18](https://github.com/guifleischfresser/assistente-juridico-claude/pull/18)** — branch `codex/diario-20261124`. *Exige fonte e trecho literal na pesquisa de jurisprudência.*
   - CI: Ubuntu, macOS e `testes-fuso (windows-latest)` verdes; **falha em `testes (windows-latest)`** (mesmo erro de bootstrap no PowerShell 5.1). O PR só muda skill + CHANGELOG, então a falha parece do runner, não deste diff.
   - Comportamento: `/verificar-citacoes` exige link ou arquivo local e a frase literal que sustenta cada afirmação; sem isso responde “não achei fonte verificável” e deixa pendente. Busca sem resultado **não** marca o julgado como inexistente.
   - Escrito pelo Codex (login do Claude Code no box já estava expirado).
   - Worktree: `/workspace/advogado-claude-20261124`. Atenção: o HEAD local dessa worktree ficou em `aea40a8` (aponta para `origin/main`), com 3 arquivos modificados e não commitados. Esse diff **já está** em `origin/codex/diario-20261124`. Não é trabalho inédito; não commitar por cima. Para trabalhar no PR, fazer checkout de `origin/codex/diario-20261124`.

5. **[PR #19](https://github.com/guifleischfresser/assistente-juridico-claude/pull/19)** — branch `codex/diario-20261125`. *Entrega mostra o que foi conferido, o que ficou pendente e o que foi assumido.*
   - CI: Ubuntu, macOS e `testes-fuso (windows-latest)` verdes; **falha em `testes (windows-latest)`** (mesmo erro do PowerShell 5.1).
   - `/revisar`, `/nova-peca`, `/mapa-de-teses` e `/advogado-do-diabo` terminam com as listas Conferi / Não consegui conferir / Assumi, e até 3 prioridades (risco + próximo passo), no espírito do que o @adriano_viana descreveu. Só o corpo das skills muda; o contexto fixo não cresce. Escrito pelo Codex.
   - Worktree: `/workspace/advogado-claude-20261125` (limpo, alinhado a `origin/codex/diario-20261125`).

PRs #7 a #14 (já em `main`, sem tag nova): dicionário de nomes e anonimização (#11), súmulas canceladas (#12), trilha do que já foi lido no caso (#13), auditoria de skill de terceiro antes de instalar (#14), entre outros. A lista local de 16 súmulas do #12 foi montada de memória, sem internet; **vale conferir antes de um release**.

### 3.2 `guifleischfresser/wrapadv` (privado)

- PRs abertos: nenhum.
- `origin/main` está em `1ecd5e2` (*Merge pull request #2 from guifleischfresser/feat/demo-pasta-raiz*, 16/11/2026). CI verde no Ubuntu, macOS e Windows × Node 20 e 22.
- Sem releases/tags.
- **Não havia alteração local não commitada nem não enviada** em 27/11/2026. Por isso **não** foi criada branch `handoff/harvey-20261127` neste repo.
- A branch remota `origin/claude/fase1-wrapadv` (HEAD `40cc26e`) está **25 commits à frente de `origin/main`** e já está no GitHub. É a Fase 1 completa (UI, ícone, atalho na área de trabalho, lançadores, verificar-cli, permissões, etc.). O `main` recebeu só a “porta da base da Fase 1 **sem atalhos**” + modo demo + a regra de buscar dados e perguntar antes de redigir (`5e241fa`). Esses 25 commits **não** foram mergeados. Não abrir PR nem mergear isso sem a palavra do Guilherme.
- Worktrees no box:
  - `/workspace/wrapadv` — `claude/fase1-wrapadv`, limpo, alinhado à origin.
  - `/workspace/wt-wrapadv-demo` — `feat/demo-pasta-raiz`, limpo, alinhado à origin (já mergeada em `main`). O `main` local deste worktree está atrás de `origin/main` (só o ponteiro local desatualizado).

### 3.3 Outro repo relacionado

- `/workspace/claude-code-wrap` — `guifleischfresser/claude-code-wrap`, branch `feat/v0.1-mvp` (`430b050`). É o wrap genérico do Claude Code do qual o WrapAdv reaproveitou módulos. Não faz parte deste pacote; o caminho fica listado na seção 6.

---

## 4. Pendências (aguardando o Guilherme ou o próximo CLI)

1. **Login do Claude Code CLI no box.** Em 27/11/2026: `claude auth status` → `loggedIn: false`, `authMethod: none`, `loginExpiresAt: null`. Versão instalada: 2.1.322. Alguém precisa rodar `claude auth login` no box. Enquanto isso, usar Codex ou Antigravity, se houver cota. Existe a flag `claude --cloud [description|session_id|url]` para sessão na nuvem, mas **não funciona sem login**.
2. Revisão e merge dos PRs #15 a #19, nesta ordem, e decisão sobre tag/release depois da v0.8.0 (sugestão histórica: v0.9.0, só com a palavra dele).
3. Correção do CI no `windows-latest` (PowerShell 5.1, `Expand-Archive` / `ExtractToDirectory`), que afeta #17, #18 e #19. Abrir PR só disso, se o Guilherme quiser.
4. Conferir as 16 súmulas do PR #12 antes de um release oficial.
5. Dois ajustes no `CLAUDE.md` do WrapAdv (lista numerada de perguntas; exceção explícita para olhar outro caso quando o advogado já pediu).
6. Destino da branch `claude/fase1-wrapadv` (25 commits com atalho, ícone e UI que não estão em `main`).
7. Achados do Monitor X ainda não implementados:
   - Testar se avisos de hooks `PostToolUse` com exit 0 chegam ao Claude ou somem no log de debug (relato do @kurenn / plugin roundhouse 1.1.1).
   - Declarar `engines["claude-code"]` no `plugin.json` e conferir permissões `Skill(nome)` no allow (Claude Code 2.1.323 / 2.1.325).
   - Avaliar MCP Jurídico Brasil (DataJud/CNJ, prazos em dias úteis) e Jusratio, sempre local e com autorização.
   - Ler o texto oficial da Resolução OAB 16/2026 antes de assumir o conteúdo (um post de conta pequena atribuiu a ela TAC, supervisão humana e sigilo).
8. Watchlist do X ainda sem resposta: `@juslogica`, `@felvieira_dev`, `@hallucin8d`, `@marcusaraujobhz`, `@figueirego`, `@diegohfontes`.
9. Gemini CLI aposentado, ainda instalado; desinstalar só se ele quiser.
10. As duas rotinas do Harvey foram **pausadas em 27/11/2026**. Ver `rotinas/RESUMO.md`.

---

## 5. O que este pacote contém (nesta branch)

Tudo abaixo está em `docs/handoff-harvey-20261127/`. Cópias sanitizadas: dos dumps do mapa do X (JSON e os `.txt` das rodadas) foram removidos campos de paginação da API (`next_token` e equivalentes) e redigidos e-mails que apareciam em bios públicas de perfis do X. Não há tokens, chaves, cookies, IDs internos de agentes nem dados do app Life.

| Pasta / arquivo | Origem no box | O que é |
|---|---|---|
| `HANDOFF.md` | (este arquivo) | Documento mestre. |
| `README.md` | — | Índice curto. |
| `prompts/` | `/workspace/prompts/` (só jurídico) | Pedidos, `/goal` e execuções das rotinas de 10 a 25/11/2026, mais o prompt do `CLAUDE.md` do WrapAdv. 35 arquivos. |
| `mapa-x/` | `/workspace/mapa-x/` | Monitor do X (log, IDs, scripts, rodadas), mapa de casos, dumps públicos e sumários. |
| `skills/claude-code-orchestrator/SKILL.md` | `/home/box/agent-data/workflows/claude-code-orchestrator/SKILL.md` | Como orquestrar Claude/Codex/agy, cotas, PRs, regras do WrapAdv. (Cópia idêntica também existia em `/home/box/sand-data/workflows/…`.) |
| `skills/x-digest/SKILL.md` | `/home/box/agent-data/workflows/x-digest/SKILL.md` | Formato do digest do X (janela, teto de 5 itens, silêncio se não houver novidade). |
| `rotinas/RESUMO.md` | — | As duas rotinas pausadas. |
| `specs/` | `/workspace/specs/` | Planos do WrapAdv (então “Escaninho”/“Casos”), verificação do CLI, pesquisa Claude for Legal, parecer sobre marco de data centers (tema público, sem dados de cliente). |
| `extras/handoff-harvey-20261127-original.md` | `/workspace/handoff-harvey-20261127.md` | Rascunho original do handoff no box. Este `HANDOFF.md` é a versão completa. |
| `extras/adv-20261123-ci.txt` | `/workspace/adv-20261123-ci.txt` | Log do CI Windows que falhou no #17. |
| `extras/adv-calendario-meta/` | `/workspace/adv-calendario-meta/` | Prompt, texto de PR e medições de contexto do calendário forense (sem arquivos `pid`/`run`). |

### Prompts incluídos

Todos os `adv-diario-*` e `wrapadv-claudemd-perguntar.md`. Foram **deixados de fora** de propósito, por serem do app Life: `f13.md`, `f13-body.md`, `f13-r1.md`, `f20.md`, `f20-body.md`, `f20-pr.md`, `f20-r1.md`, e as pastas `/workspace/prompts-20261122`, `/workspace/prompts-20261123`, `/workspace/prompts-20261125`.

---

## 6. Mapa completo dos arquivos locais no box

Caminhos absolutos, como estavam em 27/11/2026. Os clones e worktrees **não** foram copiados para esta branch (já estão no GitHub, salvo o que se indica). Esta lista existe para o Claude na nuvem saber o que há no box e onde.

### 6.1 Documento e prompts

- `/workspace/handoff-harvey-20261127.md` — rascunho original do handoff (copiado em `extras/`).
- `/workspace/prompts/` — ver seção 5. Jurídico copiado; F13/F20 (Life) não.
- `/workspace/prompts/wrapadv-claudemd-perguntar.md` — prompt que gerou o commit `5e241fa` do PR #2 do WrapAdv.

### 6.2 Monitor do X

- `/workspace/mapa-x/mapa-casos-ia-advocacia.md` — mapa qualitativo dos casos de uso.
- `/workspace/mapa-x/proc.py` — script de processamento.
- `/workspace/mapa-x/monitor/log.md` — histórico das rodadas do monitor.
- `/workspace/mapa-x/monitor/seen_ids.json` — IDs já processados.
- `/workspace/mapa-x/monitor/parse.py` — parser.
- `/workspace/mapa-x/monitor/run_tmp.json` — buffer temporário da coleta.
- `/workspace/mapa-x/monitor/r1111/`, `r1112/`, `r1113/`, `r1116/` — saídas brutas de rodadas específicas.
- `/workspace/mapa-x/raw/` — dumps JSON de buscas públicas no X (nesta branch, sem `next_token`).
- `/workspace/mapa-x/sum/` — sumários em texto das mesmas buscas.

### 6.3 Skills do Harvey no box

- `/home/box/agent-data/workflows/claude-code-orchestrator/SKILL.md`
- `/home/box/agent-data/workflows/x-digest/SKILL.md`
- Cópias idênticas: `/home/box/sand-data/workflows/claude-code-orchestrator/SKILL.md` e `.../x-digest/SKILL.md`.

A skill de orquestração cita caminhos do Life (`/home/box/shared/life-running-memory.md`). Isso vale para o bot quando ele também toca o Life; **o Harvey não deve ler nem alterar esses arquivos, nem o código do Life.**

### 6.4 Clones e worktrees do assistente-juridico-claude

| Caminho | Branch | HEAD (resumo) | Estado local |
|---|---|---|---|
| `/workspace/advogado-claude-repo` | `claude/diario-20261118` (PR #16) | `cc87207` | Limpo; tem `stash@{0}` antigo do #17, não usar |
| `/workspace/wt-handoff-harvey-20261127` | `handoff/harvey-20261127` (este pacote) | parte de `aea40a8` + estes docs | worktree deste handoff |
| `/workspace/advogado-claude-20261123` | `codex/diario-20261123` (PR #17) | `49f7412` | Limpo |
| `/workspace/advogado-claude-20261124` | `codex/diario-20261124` (PR #18) | local em `aea40a8`, dirty em 3 arquivos **já presentes** em `origin/codex/diario-20261124` | Não commitar; usar a origin |
| `/workspace/advogado-claude-20261125` | `codex/diario-20261125` (PR #19) | `98934bf` | Limpo |
| `/workspace/wt-merge-ajc` | `claude/diario-20261111` | `8a88476` | Limpo (já mergeado, PR #11) |
| `/workspace/wt-merge-ajc12` | `claude/diario-20261112` | `ea6702d` | Limpo (já mergeado, PR #12) |
| `/workspace/wt-merge-ajc13` | `claude/diario-20261113` | `ed80fe0` | Limpo (já mergeado, PR #13) |
| `/workspace/adv-anonimizar` | `claude/release-v0.8.0` | `923519f` | Limpo |
| `/workspace/adv-calendario` | `claude/calendario-forense-v070` | `a19d37a` | Limpo |
| `/workspace/adv-consentimento` | `claude/consentimento-lgpd` | `2bb49f5` | Limpo |
| `/workspace/adv-erros-sugerir` | `claude/erros-sugerir` | `8012a1b` | Limpo |
| `/workspace/adv-importar-valores` | `feat/importar-valores-planilha` | `1f5d2df` | Limpo |
| `/workspace/adv-julgados-html-pdf` | `claude/julgados-html-pdf` | `468d827` | Limpo |
| `/workspace/wt-mapa-docx` | `feat/mapa-teses-exportar-docx` | `96e35d6` | Limpo |
| `/workspace/assistente-juridico-claude` | `claude/calendario-fuso-local` | `ad04e4e` | Limpo; clone mais antigo, `main` local atrás da origin |

Outros, sem git de trabalho:

- `/workspace/adv-calendario-meta/` — medições e prompt do calendário (copiados em `extras/`; `pid` e `run` ficaram de fora).
- `/workspace/advogado-claude-mod/` e os zips `/workspace/advogado-claude-mod-v0.*.zip` (+ `.sha256`) — pacotes de release antigos. **Não** entraram neste pacote (binários já versionados/lançados; não são contexto de código).
- `/workspace/adv-20261123-ci.txt` — copiado em `extras/`.

### 6.5 WrapAdv e afins

| Caminho | Branch / conteúdo | Estado |
|---|---|---|
| `/workspace/wrapadv` | `claude/fase1-wrapadv` @ `40cc26e` | Limpo; 25 commits já no GitHub que **não** estão em `main` |
| `/workspace/wt-wrapadv-demo` | `feat/demo-pasta-raiz` @ `5e241fa` | Limpo; já mergeado em `origin/main` |
| `/workspace/wrapadv-prints/` | Capturas da UI (01 a 07), dados fictícios | Só no box; não copiadas para este repo **público** (o app é privado) |
| `/workspace/wrapadv-icone/` | Arquivos de ícone | Idem |
| `/workspace/claude-code-wrap` | `feat/v0.1-mvp` @ `430b050` | Limpo; repo separado |
| `/workspace/specs/` | Planos e pesquisa do app (copiados em `specs/`) | — |

### 6.6 O que foi conscientemente deixado de fora deste repositório público

- Qualquer pasta ou prompt do **Life**, inclusive `/workspace/Life*`, `/workspace/prompts/f13*`, `/workspace/prompts/f20*`, `/workspace/prompts-20261122` (e 23, 25), `/home/box/shared/life-*`.
- `/workspace/whatsapp-monitor/` — não é trabalho jurídico e cita webhook; risco de segredo.
- Segredos e infraestrutura do box (`/home/box/agent-data/box-secrets.json`, cookies, etc.).
- IDs internos de agentes, lojas e máquinas.
- Binários/zips de release do mod.
- O stash local do PR #17 e o dirty residual da worktree do PR #18 (já estão, ou foram superados, no GitHub).
- Capturas e ícones do WrapAdv (repo privado).
- Código-fonte completo dos clones (já no GitHub).

---

## 7. Como continuar numa sessão `claude.ai/code`

1. Clonar ou abrir `guifleischfresser/assistente-juridico-claude` e fazer checkout de `handoff/harvey-20261127` **só para ler este pacote**. Trabalho de código novo deve sair de um worktree limpo de `origin/main`, ou da branch do PR correspondente.
2. Se for mexer no WrapAdv, clonar o repo **privado** `guifleischfresser/wrapadv`. Lembrar que `origin/claude/fase1-wrapadv` tem 25 commits que não estão em `main`.
3. Prioridade técnica natural, se o Guilherme autorizar: (a) corrigir o bootstrap do CI no Windows; (b) mergear #15 a #19 na ordem, conferindo as 16 súmulas do #12; (c) os dois ajustes do `CLAUDE.md` no WrapAdv; (d) decidir o destino da Fase 1 completa.
4. Conferir cota antes de rodar CLI. No box, o Claude Code está deslogado; na sessão nuvem, use a autenticação do próprio `claude.ai`.
5. Continuar em português, curto e direto, e perguntar ao Guilherme antes de qualquer merge, tag, release ou envio a terceiros.

---

## 8. Arquitetura em uma página (mod + WrapAdv)

- **Mod (`assistente-juridico-claude`).** Plugin/skills para o Claude Code no computador do advogado: peças, mapa de teses, prazos e calendário forense, conferência de citações e súmulas, anonimização, consentimento, trilha do que já foi lido no caso, auditoria de skill de terceiro, integridade do núcleo (PR #15). Tudo local, Node puro, sem rede obrigatória nas funções de sigilo. Contexto fixo das descrições de skills é um orçamento rígido (em `main`, 3.869 caracteres). Testes em Ubuntu, macOS e Windows, inclusive com `TZ=America/Sao_Paulo`.
- **WrapAdv.** App local (HTML/JS + servidor só em `127.0.0.1`) que navega pasta raiz → área → cliente → caso e abre o Claude Code já dentro do caso, com `CLAUDE.md`, permissões (nunca bypass por padrão) e o estilo do escritório. Reaproveita ideias do `claude-code-wrap`. Modo demo com casos fictícios, somente leitura. A regra de não deixar `[PREENCHER]` e perguntar antes de redigir está no `CLAUDE.md` gerado (commit `5e241fa`).
- **Separação de dados.** Dado de cliente não vai para memória global do Claude. O que é do processo fica na pasta do caso. Cofre de anonimização por caso, fora de `.env` (PR #17).

Mais detalhes de arquitetura do mod: `ARQUITETURA.md` na raiz deste repositório (`main`). Planos históricos do app: `specs/casos-plano-v2.md` e `specs/verificacao-cli.md` neste pacote.
