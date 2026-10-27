# Changelog

## Não lançado
- **Conferência de julgados lê página salva do site, PDF e Word** (`scripts/lib/extrair.js`): `julgados.js comparar --original` deixa de dar "divergente" por causa de menus, programação do site, `&nbsp;`/`&aacute;`, acentos em latin1, quebras e hifenização de linha, números de página e cabeçalhos repetidos do PDF. Usa só o texto visível: trecho escondido na página (ou em Word) não conta e gera aviso; instruções para IA no original geram aviso e nunca são obedecidas.
  - Comparação tolerante à forma (NFKC, hífen discricionário, invisíveis, espaços especiais, palavra hifenizada no fim da linha), com o mesmo limiar de 0,97 e a mesma lista de palavras. A palavra do original **omitida** no trecho agora também conta como diferença e é mostrada.
  - Arquivo sem texto legível (PDF escaneado, página vazia ou só com a programação do site, sem leitor de PDF) vira **`sem-texto`**: nem confere nem diverge, código 4, um passo simples para o advogado; fica pendente na checagem, na exportação para Word e no mapa de teses, e nunca rebaixa um registro anterior.
  - `pdfPaginas`/`docxTexto` saíram do `preparar-autos.js` para o lib (mesmo comportamento).
- Testes: 270 na suíte (+22), com página de tribunal em UTF-8/latin1 e PDF gerados no próprio teste (PDF real só com o Poppler instalado).

## 0.6.0 — 2026-10-23
**Foco: o assistente nunca falha em silêncio, nunca esconde texto em peça e fala a língua do advogado.**
1. **Diagnóstico no início de cada conversa** (`scripts/lib/diagnostico.js`, compartilhado pelo hook `SessionStart` e pelo `doutor`, para não divergirem):
   - **modo automático**: `permissions.defaultMode` (usuário → projeto → local) e o modo da sessão; só "Manual" gera aviso (plano/aceitar edições escolhidos na hora, não). Se o auto já está configurado mas a sessão abriu em Manual (plano/empresa não libera), o aviso sai no máximo 1x por dia; `config.avisos.modoAuto: false` silencia;
   - **pastas registradas**: ESCRITORIO, pastas externas do mapa e a "Pasta original" dos casos importados (pelo nome amigável, sem caminho cru);
   - **acessos que o instalador grava**: `additionalDirectories` (escritório e pastas externas), regras de `permissions.allow`, hooks (ou plugin ativo) e o bloco do `CLAUDE.md` global.
   - O aviso vai **no topo** do contexto, como "⚠️ AVISO PARA O ADVOGADO" (causa + 1 passo), com o detalhe técnico separado e marcado para não ser repetido ao advogado.
   - Doutor: mesmas checagens, mensagens coloquiais (ids internos mantidos; detalhe em `tecnico` no `--json`). `--consertar` agora devolve o modo auto como padrão (com backup; nunca `bypassPermissions`) e, para pasta que mudou de lugar, pede ao advogado onde ela está (skill `/consertar` reconecta com `PE remover` + `PE registrar`).
2. **Anti-texto-oculto e scan de injeção** (centralizado em `scripts/lib/injecao.js`):
   - **Nunca inserir**: a guarda de escrita nega (antes de qualquer "pergunta") gravar peça/documento do escritório com caracteres de largura zero/direção, fonte branca ou quase branca, fonte ≤ 2 pt, `vanish`/`specVanish`/`webHidden` ou CSS que esconde (`display:none`, `visibility:hidden`, `opacity:0`). A exportação para Word recusa com código 3 — **nem `--forcar` libera** — e confere também o XML gerado. `checar-peca` mostra 🔴 Texto escondido.
   - **Escanear o que chega**: `preparar-autos` detecta texto oculto em DOCX, HTML que esconde texto e caracteres invisíveis em qualquer formato (e os tira do texto convertido); o PostToolUse faz o mesmo em leituras e páginas web. A detecção de injeção ignora caracteres invisíveis usados para quebrar palavras ("ig<U+200B>nore") e ganhou frases em português ("esqueça todas as instruções", "novas instruções:", "não obedeça o pedido do usuário"). Sempre **avisa sem obedecer**.
3. **Sobreposição de habilidades na manutenção de 15 dias**: a mescla automática continua só entre `auto-*` criadas pelo assistente. Pares parecidos que envolvem o **núcleo** ou skills **do advogado** vão apenas para o relatório ("Atalhos parecidos — anotei, mas NÃO mexi neles") e para a linha de resumo; núcleo × núcleo não entra. Funciona também no modo plugin.
4. **Regra de linguagem para advogados iniciantes em IA**: o que o advogado lê (avisos do início da conversa, doutor, perguntas das guardas, relatórios) fala da rotina dele e dá o conserto em um passo, sem jargão (settings, hook, permissão, JSON, caminho…). Aplicada ao `CLAUDE.md` global, às regras do modo plugin, ao `AGENTS.md`, ao estilo de resposta "Advogado", ao `INSTALAR.md`/`primeira-execucao` e às skills `consertar` (com `references/avisos.md`), `manutencao`, `reflexao` e `boas-vindas`.
- Testes: 248 na suíte (+30), com sandbox próprio: modo auto desligado, sessão em Manual (1x/dia), pasta registrada e pasta de caso sumidas, acessos apagados por "atualização", conserto pelo doutor, bloqueio de texto oculto na gravação e na exportação, scan dos autos/leitura/web e relatório de sobreposição sem mexer em núcleo nem em skill do advogado.

## 0.5.0 — 2026-10-20
**Sete recursos novos, todos locais e em pt-BR.** Núcleo com 24 skills e contexto fixo de 3.496 caracteres (menor que o da v0.4, com 20 skills).
1. **Posse, procedência e mescla das habilidades automáticas** (ideias do autoharness).
   - Regra dura: a automação só cria, altera, mescla ou aposenta `auto-*` criadas por ela (registro + `metadata.origem: automatica`). Núcleo e skills do advogado nunca são tocados; a manutenção não enxuga mais descrições do núcleo na máquina do advogado.
   - Ficha por skill (`habilidades/proveniencia/*.jsonl`): criação, edições (linhas +/−), sessão e tipo de peça (só impressão digital, sem dados do cliente), usos, falhas, mesclas (quem absorveu quem), aposentadoria. Comando: `/habilidades proveniencia <nome>`.
   - `publicar` recusa duplicata de `auto-*` parecida (código 4) e pede para atualizar a existente; `--nova` força. Novo `habilidades.js semelhantes`.
2. **Mapa de teses da defesa** (`/mapa-de-teses`, `mapa-teses.js modelo|validar|marcar|totalizar|imprimir`): quadro por pedido (valor, risco alto/médio/baixo, teses, precedentes) na pasta do caso, soma por risco (provável/possível/remota) e versão para imprimir. Todo precedente fica `[A VERIFICAR]` até ser conferido.
3. **Conferência de julgados** (`julgados.js`): existe? o trecho entre aspas bate com o original (mostra as palavras que divergem)? Livro em `WIKI/julgados-verificados.json`. Integrado ao verificador de citações, ao `checar-peca` (🔴), à exportação para Word (bloqueia divergentes), ao fechamento da `/nova-peca` e ao mapa de teses.
   - **Internet só com permissão:** toda busca/acesso web pergunta antes, exceto os sites que o advogado autorizou (`julgados.js autorizar`, que também pede confirmação). `verificacaoOnline: "nunca"` desliga. Número CNJ só sai se for de julgado pedido para conferência.
   - Basanos (cognitio.one) mencionado só na documentação, como ferramenta externa opcional.
4. **Uma conversa por processo** (`/processo`, `/cliente`, `processo.js abrir|anotar|listar|atual`): carrega só o dossiê e o handoff do caso, vincula a conversa ao processo (retomada lembra), avisa ao mexer em outro caso e grava anotações só no DOSSIE do caso.
5. **Instalação pelo chat (plugin):** `/plugin marketplace add guifleischfresser/assistente-juridico-claude` e `/plugin install advogado-claude@advogado-claude-mod`. Novo `instalar.js --modo-plugin` e `PE instalar-plugin` (sem hooks nem skills duplicados); SessionStart registra a raiz do plugin, injeta as regras do núcleo até a configuração terminar e avisa o prefixo `/advogado-claude:`. Doutor entende o modo plugin. O caminho do INSTALAR.md continua igual.
6. **Erros a não repetir** (ideia do repeat-mistake-guard; `/erros`, `erros.js`): a correção do advogado vira um check com exemplo real; na 2ª vez, a peça com aquele erro é bloqueada na gravação (PreToolUse `deny`); antes disso, aviso no PostToolUse. Detector de frases de correção no pedido; trocas de palavra repetidas nas edições entram como aviso. Rápido e fail-open.
7. **Portabilidade** (ideia do agent-kit; `agentes.js gerar [--skills] [--codex-global]`): `ESCRITORIO/AGENTS.md` com as mesmas regras do CLAUDE.md para Codex e Cursor, com as conferências manuais no lugar dos hooks. Gerado pelo instalador; o doutor confere.
- **Palavra de conferência:** o CLAUDE.md global tem uma palavra-canário; `doutor --canario` e `/consertar` confirmam que as instruções globais foram carregadas.
- Descrições do núcleo sem o redundante "ou digitar /nome". Regras de permissão estreitas para os scripts novos. Validador: regras das `auto-*` mantidas; núcleo com 24 nomes reservados.
- Testes: 218 na suíte (+66), simulações bash/pwsh 28+28, `claude plugin validate` OK.

## 0.4.0 — 2026-10-17
**Recurso principal: manutenção das habilidades a cada 15 dias, sozinha, para gastar menos contexto.**
- Novo `scripts/manutencao.js` e skill de núcleo `/manutencao` (20 no núcleo; `disable-model-invocation`, sem custo fixo): `medir`, `revisar`, `simular`, `desfazer`, `estado`.
- Agendamento sem agendador do sistema: o `SessionStart` confere a data e, com ≥ 15 dias, roda a revisão sem pedir aprovação. Na 1ª vez só marca a referência; uma trava evita execução dupla. O resumo aparece em uma linha ("Manutenção feita: …"). O agendador do Windows/launchd ficou no Roadmap.
- A revisão faz backup, ensaio (dry-run) de cada mudança, changelog e permite desfazer tudo. Ela:
  - mede o custo de contexto por skill;
  - encurta descrições para ≤ 200 caracteres, mantendo "Use quando", `/comandos` e gatilhos;
  - move detalhes para `references/*.md` (divulgação progressiva);
  - mescla `auto-*` duplicadas e aposenta `auto-*` sem uso há 45+ dias;
  - confere os orçamentos de CLAUDE.md, preferências e `MEMORY.md` (200 linhas/25 KB);
  - grava o relatório em `ESCRITORIO/MEMORIA/revisoes/AAAA-MM-DD.md`.
- Regras de carregamento conferidas na documentação atual do Claude Code (listagem de descrições em toda conversa, com corte em 1.536 caracteres e orçamento de ~1% da janela; corpo só ao invocar, e fica na conversa; `references/` só quando lidos). Detalhes em ARQUITETURA §14.
- **Pacote enxugado na origem:** contexto fixo das skills 5.853 → 3.517 caracteres (**-40%**, ~1.672 → ~1.005 tokens). Corpos das skills da v0.3 50.472 → 37.304 caracteres (-26%). `primeira-execucao` passou de 20.546 para 7.182 caracteres, com as etapas em `references/` (gerado por `sincronizar-bootstrap.js`, que verifica todos os arquivos).
- O uso de `/nome` digitado agora conta no registro das habilidades (aposentadoria confiável). Validador: links para `references/` precisam existir; `references/` de `auto-*` também não podem ter comandos de rede.
- Instalador: cópia limpa das skills do núcleo (backup → remove → copia); regra de permissão estreita para `manutencao.js`. Doutor: mostra última/próxima manutenção.
- `criar-skill-automatica` orienta descrição ≤ 200 caracteres e detalhes em `references/`.
- Testes: +23 na suíte (152), com viagem no tempo (14 dias não roda, 15 dias roda), redução de contexto, mesclagem, aposentadoria, reversão no ensaio, orçamento do `MEMORY.md` e desfazer completo.

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
