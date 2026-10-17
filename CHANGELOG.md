# Changelog

## 0.3.0 — 2026-10-17
**Recurso principal: harness engineering autônomo (skills E memórias, sem pedir aprovação).**
- Nova skill de núcleo `reflexao` (19 no núcleo) e script `memoria.js`:
  - `aprender-edicoes`: compara o rascunho do assistente com a versão final do advogado (.md ou .docx) e atualiza um bloco automático em `ESTILO/perfil-de-escrita.md` (filtro: só palavras comuns; nomes e números ficam fora);
  - `preferir`: memória de preferências e cuidados em `ESCRITORIO/MEMORIA/preferencias-e-cuidados.md`, com dedupe, confirmações e recusa de dados de clientes;
  - `manter`: auto-manutenção com backup e `MEMORIA/CHANGELOG.md` (CLAUDE.md curto, aponte-não-copie, poda após 120 dias, faxina de dados sensíveis na memória automática do Claude Code);
  - `reflexao`: parte determinística da rotina.
- Gatilhos automáticos: `Stop` (a cada ~30 ações ou após peça escrita), novo hook `SessionEnd` (pendência retomada no `SessionStart`) e handoff. Fotos de rascunho no PostToolUse e no `exportar-docx`; aprendizado antes de reeditar (PreToolUse).
- Guarda de escrita estendida a `ESCRITORIO/MEMORIA/`; dados de clientes só no DOSSIE.md do caso.
**Piloto automático da instalação.**
- `INSTALAR.md` reescrito: zero perguntas opcionais (sem licença, atalho sempre no Windows, Node instalado sozinho, amostras e dossiês automáticos). Só pergunta o nome se não conseguir inferir (`PE nome-sugerido`: git/conta do sistema) e faz no máximo **uma** pergunta final sobre pastas ambíguas (`PE autopiloto` + `PE resolver ok`).
- Classificação por pontuação das pastas encontradas (alta → registra sozinho; média → pergunta única; Downloads nunca é alta).
- Frase de instalação com autorização explícita para o download verificado e o Node LTS; README diz exatamente o que é preciso (só Claude Code instalado e com login).
**Modo auto, Opus 5.5, memória automática.**
- O instalador grava `permissions.defaultMode: "auto"`, `model: "claude-opus-5-5"`, `modelSettings` com esforço `medium` e `autoMemoryEnabled: true` (guarda os valores anteriores; reinstalar respeita mudanças do usuário; desinstalar restaura).
- Regras de permissão estreitas por script (Bash e PowerShell) no lugar da regra ampla `node *advogado/scripts/*`.
- Doutor: itens de modo auto, modelo/esforço, memória automática e hook SessionEnd.
- Testes: +25 na suíte (129) e simulação de piloto automático (bash e PowerShell) que termina com uma única resposta, "ok".

## 0.2.1 — 2026-10-16
Correções encontradas pelo CI na publicação da 0.2.0 (a 0.2.0 não chegou a ter Release):
- **Zip reprodutível em qualquer fuso horário:** a data DOS das entradas era calculada no fuso local, então o SHA256 gerado no Brasil diferia do gerado no CI (UTC). Agora usa UTC; teste novo compara builds em fusos diferentes.
- **Reparo no macOS:** com o HOME atrás de um symlink (ex.: `/var` → `/private/var`), o `/consertar` apagava a cópia local do pacote antes de reinstalar a partir dela. Agora compara caminhos reais; teste novo com HOME via symlink.
- **Windows PowerShell 5.1:** o bloco de download não depende mais de `Get-FileHash` (que some quando o PowerShell 5.1 é aberto a partir do PowerShell 7 com o `PSModulePath` herdado); o SHA256 é calculado com .NET.

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
- Testes: suíte e2e com 98 verificações (100 na 0.2.1) e `testes/simular-bootstrap.js`, que executa literalmente os blocos do INSTALAR.md (bash e PowerShell) contra uma release local.
- Correção: o validador de skills reprova YAML que o Claude Code descartaria.

## 0.1.0 — 2026-10-16
Primeira versão.
- Instaladores: Windows (`instalar.bat`/`.ps1`, compatível com PowerShell 5.1) e macOS (`instalar.command`/`.sh`); desinstaladores que preservam o ESCRITORIO.
- 16 skills de núcleo em pt-BR (casos, peças, revisão, advogado do diabo, verificação de citações, preparação dos autos, prazos, estilo, handoff, auto-skills, backup).
- Hooks: SessionStart, UserPromptSubmit (detector de tarefas repetidas), PreToolUse (guarda de sigilo e de escrita), PostToolUse (scanner de injeção, citações, uso de skills, aviso de contexto) e Stop (⚠️ HANDOFF AUTOMÁTICO em 75%).
- Statusline em pt-BR com caso, memória e próximo prazo.
- Ferramentas Node sem dependências: exportação .docx, checagem de peça, conversão dos autos, métricas de estilo, prazos em dias úteis (CPC 219/220/224) e ciclo de vida das auto-skills.
- Manifesto de plugin e de marketplace (modo secundário).
