---
name: Claude Code orchestrator
description: >-
  Use when doing coding work in Guilherme's GitHub repos (guifleischfresser):
  run coding CLIs (Claude Code, Codex, Antigravity) on the box, judge the
  results, open a PR, never merge without his word.
---
# Coding CLI orchestrator

The bot is the manager. It writes prompts, judges the results and keeps only what's good. The CLIs write the code:
- `claude` is Claude Code, on Claude Pro;
- `codex` is the Codex CLI, on ChatGPT;
- `agy` is the Antigravity CLI, on Google, and replaces the Gemini CLI, which is retired.

Never use a Cursor cloud agent for this user's code. The bot that owns the repo does the work itself and never hands it to another bot.

## Before starting
1. **Model:** in Claude, follow the "Regra de modelo atual" section of `/home/box/shared/life-running-memory.md`.
2. **Quota:** make a tiny call to each CLI (`claude -p "ok"`, `codex exec "ok"`, `agy -p "ok"`). Use the ones that answer. If all three are at their limit, don't start and tell him in one line when they come back. **Never** use paid extra usage, API keys or top-ups.
3. **Life only:** read `/home/box/shared/life-running-memory.md` and `life-pr-checklist`. Search `life-log-arquivo.md` with `rg` only when you need an old fact.

## Running: one attempt per task, different tasks in parallel
1. If the repo or goal is unclear, confirm in one line. Otherwise decide and go.
2. Write the prompt to a file: goal, files to avoid (locked screens), build, lint and tests must pass, **never** run `gh pr merge`.
3. **One attempt per task.** Never run parallel attempts of the same task (Guilherme, 2026-11-11). Parallelism is only between **different** tasks: e.g. two PRs on different things at the same time, each in its own worktree from fresh `origin/main` (`/workspace/<repo>-<slug>`) and its own CLI, chosen so they don't touch the same files or screens and can't conflict. Run in the background, logging to `/tmp/<slug>-<cli>.log`. At most one Claude session at a time; Codex and agy may run alongside it.
4. **Judge each result strictly:**
   - Did build, lint and tests pass?
   - Open the diff. Does it do what was asked? Does it stay in scope?
   - No slop: no placeholders, no dead code, no files outside the scope.
   - If the UI changed, take screenshots.
5. If a result fails any of those, send the same CLI (or another one) a follow-up prompt with what went wrong, at most 2 rounds. If it still fails, drop it, remove the worktree and report what's blocking.
6. Open the PR with `gh` and a pt-BR description, mentioning which CLI wrote it.
7. If the quota runs out midway, move to another CLI. If all three run out, save the branch, the prompt and where it stopped, then warn him.

## Verify before reporting
- The CI checks on the PR (`gh pr checks`) are green, or say clearly what is red.
- Report in short Portuguese: the PR link, what changed, and what's missing.

## After the merge (only with his word)
- Delete the worktree with `git worktree remove <path>`, unless it has uncommitted or unpushed changes.
- Update the open PRs and locked screens in `life-running-memory.md`.

## Legal repos
- `guifleischfresser/assistente-juridico-claude` (public mod, MIT) and `guifleischfresser/wrapadv`.
- Same flow.
- In WrapAdv, the code must never leave `[PREENCHER]` in a draft. It looks up the case data and asks for what's missing.
- Release or tag only on his word.

## Rules
- Never print secrets.
- Never merge without his explicit word.
- Conflicts and red CI on your own PRs you fix yourself.
