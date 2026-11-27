# Rotinas do Harvey (pausadas em 27/11/2026, America/Sao_Paulo)

As duas rotinas do Grok Bot que rodavam no box foram pausadas em 27/11/2026. Não reativar, não mergear e não abrir release sem a palavra explícita do Guilherme.

Horário habitual: de madrugada (a rotina de código por volta das 3h30, America/Sao_Paulo), para não competir com o Claudeo. Quando a cota do Grok Bot ou do Claude Pro acaba, a rotina não roda e o pedido fica para a janela seguinte.

## 1. Monitor X: IA agêntica na advocacia BR

- Identificador: `monitor-x-ia-e-claude-code-na-advocacia-br`
- Função: buscar posts públicos no X sobre IA na advocacia brasileira e sobre mods/plugins do Claude Code; entregar no chat no máximo 5 itens úteis (link + o que é + por que importa). Dia fraco: uma linha. Nada relevante: silêncio.
- Fatos de posts devem ser apresentados como “segundo o post”, nunca como fato confirmado.
- Estado e histórico no box:
  - `/workspace/mapa-x/monitor/seen_ids.json` — IDs já vistos, para não repetir.
  - `/workspace/mapa-x/monitor/log.md` — log completo das rodadas.
  - Cópias destes arquivos estão em `../mapa-x/monitor/` nesta pasta de handoff.
- A skill que rege o formato é `x-digest` (`../skills/x-digest/SKILL.md`; original em `/home/box/agent-data/workflows/x-digest/SKILL.md`).
- Contas sugeridas para a watchlist, ainda sem resposta do Guilherme: `@juslogica`, `@felvieira_dev`, `@hallucin8d`, `@marcusaraujobhz`, `@figueirego`, `@diegohfontes`.

## 2. Prompt diário de código: assistente jurídico

- Identificador: `prompt-di-rio-de-c-digo-assistente-jur-dico`
- Função: a cada madrugada, mandar um `/goal` curto a um CLI de código (Claude Code, Codex ou Antigravity, conforme cota) no repo `guifleischfresser/assistente-juridico-claude`, abrir PR com testes passando e não mergear.
- Fluxo típico (modo de código definido em 07/11/2026): gravar o pedido do dia em `/workspace/prompts/adv-diario-YYYYMMDD-pedido.md`, pedir ao CLI que escolha uma ideia e devolva um `/goal`, e em seguida executar esse `/goal` (arquivos `*-goal.md` e `*-goal-exec.md`).
- Regras: uma tentativa por tarefa; worktree limpa a partir de `origin/main`; nunca `--dangerously-skip-permissions` nem API paga; merge, tag e release só com a palavra do Guilherme.
- A skill que rege a orquestração é `claude-code-orchestrator` (`../skills/claude-code-orchestrator/SKILL.md`; original em `/home/box/agent-data/workflows/claude-code-orchestrator/SKILL.md`).
- Histórico recente desta rotina: PRs #15 a #19 (ainda abertos). Os prompts de cada dia estão em `../prompts/`.

## Observações

- A rotina de código dos dias 18 a 23/11 não rodou em alguns intervalos por cota do Grok Bot ou do Claude Pro; o PR da LGPD (#17) e os seguintes saíram quando a cota voltou, já com o Codex, porque o login do Claude Code no box tinha expirado.
- Esta pausa de 27/11 é administrativa (handoff). Não apagar o estado do monitor (`seen_ids.json`, `log.md`).
