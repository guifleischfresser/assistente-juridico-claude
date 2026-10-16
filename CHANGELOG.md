# Changelog

## 0.2.0 — 2026-10-16
- Licença MIT (Copyright (c) 2026 Guilherme Fleischfresser).
- **Instalação autônoma com uma frase:**
  - `INSTALAR.md`, um roteiro executado pelo próprio Claude: detecta o sistema e os pré-requisitos (Node 18+, Git opcional, sessão local e não na nuvem);
  - baixa a release do GitHub com verificação SHA256 e instala no modo silencioso (`-ExecutionPolicy Bypass` só no processo);
  - verifica com o doutor;
  - conduz a entrevista, uma pergunta por vez.
  - O fluxo é retomável e idempotente.
- Skill `primeira-execucao`, gerada do INSTALAR.md, e script `primeira-execucao.js`:
  - estado retomável;
  - perguntas roteirizadas;
  - varredura local só por nomes, mostrando **só a pasta-mãe e contagens** (nunca nomes de subpastas/arquivos); registro por id de grupo (`--grupo G1`) e dossiês em lote sem listar nomes;
  - registro de pastas por apontamento (`mapa-de-pastas.md` + `additionalDirectories`);
  - cópia opcional só das amostras de estilo;
  - dossiês de casos ativos apontando para a pasta original;
  - primeiro HANDOFF.
- Doutor/reparo: `doutor.js` e a skill `/consertar`.
  - Verifica Node, hooks, caminhos, skills, settings, ESCRITORIO e estados corrompidos.
  - Faz testes funcionais (guarda de sigilo, statusline, .docx, prazos).
  - Repara a partir da cópia local do pacote (`~/.claude/advogado/pacote`), sem internet.
- Pastas originais do advogado são somente leitura: gravar nelas pede confirmação (guarda-escrita). `/preparar-autos` lê direto da pasta original do dossiê.
- Retenção: `cleanupPeriodDays = 14` quando o usuário não tem valor próprio; ao desinstalar, a chave é removida se fomos nós que a definimos.
- Hooks usam o caminho completo do Node quando `node` não está no PATH (instalação logo após o winget).
- `instalar.ps1 -Atalho`; `instalar.sh` encontra o Node em /opt/homebrew, /usr/local e ~/.local/node.
- Release:
  - `ferramentas/empacotar.js` (zip reprodutível sem compressão, permissões unix, nomes ASCII, SHA256);
  - **versão fixada**: `release/estavel.json` (tag + SHA256, fora do zip); o INSTALAR baixa pela tag exata e confere o hash fixado e o publicado; o CI falha se o zip reconstruído não bater;
  - `ferramentas/definir-repo.js`;
  - workflow do GitHub Actions (testes em 3 sistemas + release com atestado de procedência).
- Testes: suíte e2e com 98 verificações e `testes/simular-bootstrap.js`, que executa literalmente os blocos do INSTALAR.md (bash e PowerShell) contra uma release local.
- Correção: o validador de skills reprova YAML que o Claude Code descartaria.

## 0.1.0 — 2026-10-16
Primeira versão.
- Instaladores: Windows (`instalar.bat`/`.ps1`, compatível com PowerShell 5.1) e macOS (`instalar.command`/`.sh`); desinstaladores que preservam o ESCRITORIO.
- 16 skills de núcleo em pt-BR (casos, peças, revisão, advogado do diabo, verificação de citações, preparação dos autos, prazos, estilo, handoff, auto-skills, backup).
- Hooks: SessionStart, UserPromptSubmit (detector de tarefas repetidas), PreToolUse (guarda de sigilo e de escrita), PostToolUse (scanner de injeção, citações, uso de skills, aviso de contexto) e Stop (⚠️ HANDOFF AUTOMÁTICO em 75%).
- Statusline em pt-BR com caso, memória e próximo prazo.
- Ferramentas Node sem dependências: exportação .docx, checagem de peça, conversão dos autos, métricas de estilo, prazos em dias úteis (CPC 219/220/224) e ciclo de vida das auto-skills.
- Manifesto de plugin e de marketplace (modo secundário).
