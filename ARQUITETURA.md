# ARQUITETURA — advogado-claude-mod v0.6.0

Documento técnico para o Guilherme. O README.md é o documento voltado ao advogado.

## 0. Base verificada (code.claude.com, out/2026)

Conferido na documentação oficial antes da implementação:

- **Hooks.**
  - Eventos usados: `SessionStart` (startup|resume|clear|compact), `UserPromptSubmit`, `PreToolUse` (`hookSpecificOutput.permissionDecision` allow/deny/ask), `PostToolUse` (`additionalContext`, até 10 mil caracteres) e `Stop` (`decision:"block"` + `reason`; `stop_hook_active` evita loop).
  - Os handlers usam a forma *exec* (`command` + `args`), que dispensa as regras de aspas do PowerShell.
  - Hooks são *fail-open* por padrão, e todos os scripts reforçam isso.
- **Statusline.** Recebe `context_window.used_percentage`; os hooks **não** recebem. Por isso a statusline grava `estado/contexto-<sessão>.json` e os hooks leem esse arquivo, com fallback para o `usage` do transcript JSONL.
- **Skills.**
  - Ficam em `~/.claude/skills/<nome>/SKILL.md`; os comandos foram fundidos às skills.
  - Frontmatter usado: `name`, `description`, `argument-hint`, `allowed-tools`, `disable-model-invocation`, `context: fork`, `agent` e `metadata`.
  - **O YAML inválido é descartado em silêncio.** O `claude plugin validate` (CLI 2.1.197) acusou isso em `argument-hint: [a | b]`. Agora todos os valores ficam entre aspas, e o validador do kit reprova esse padrão nas auto-skills.
- **Plugins.**
  - `.claude-plugin/plugin.json` e `hooks/hooks.json` (com o wrapper `hooks`), além de `skills/` e `output-styles/`.
  - O CLAUDE.md do plugin não é carregado, e o plugin não define statusline. Por isso o modo principal é o **instalador**.
- **Settings.** `language`, `effortLevel`, `theme`, `outputStyle`, `permissions.{allow,ask,deny,additionalDirectories}` e `statusLine`. Caminho absoluto em regra de permissão: `//c/...`.
- **Distribuição.** O Claude Code é distribuído como binário nativo e **não traz Node**. Os instaladores garantem o Node LTS ≥18 (winget `OpenJS.NodeJS.LTS` / brew).

## 1. Mapeamento da arquitetura "PROJETOS CLAUDE"

| Original | No mod |
|---|---|
| ESTRUTURA.md (mapa) | `ESCRITORIO/ESTRUTURA.md` |
| Pastas de maturidade | `CASOS/Em análise → Ativos → Arquivados` (fases do caso) |
| HANDOFF em dois lugares | `CASOS/<fase>/<caso>/HANDOFF.md` (por caso) + `ESCRITORIO/HANDOFFS/AAAA-MM-DD_HHMM_<caso>.md` (cronológico) |
| WIKI raw/pages/schema | `WIKI/raw` (imutável; o guard bloqueia a edição), `WIKI/paginas/{jurisprudencia,legislacao,doutrina}`, `WIKI/schema/SCHEMA.md` |
| CLAUDE.md em duas camadas ("apontar em vez de copiar") | O global (`~/.claude/CLAUDE.md`, bloco entre marcadores, ~28 linhas, hard limit de 80 imposto por hook) aponta para `ESCRITORIO/CLAUDE.md` (preferências/aprendizados) e este para o DOSSIE de cada caso |
| SessionStart | `sessao-inicio.js` |
| PreToolUse guards | `guarda-escrita.js` e `guarda-sigilo.js` |
| PostToolUse monitor de contexto e scanner de injeção | `pos-ferramenta.js` |
| Stop "⚠️ HANDOFF AUTOMÁTICO" em 75% | `gatilho-handoff.js` (`limiteContexto` configurável) |
| pt-BR, effort médio, tema escuro | `language`, `effortLevel: medium`, `theme: dark` (definidos só se ausentes) |
| Não portado | Atualização de grafo, limite por fase do projeto e checagem de atualização (dependeria de rede, o que viola o local-first) |

## 2. Camadas e locais

```
~/.claude/
├── CLAUDE.md                  bloco <!-- advogado-claude-mod:inicio/fim --> (mesclado; nunca sobrescreve o resto)
├── settings.json              mesclado: chaves só se ausentes; hooks do mod substituídos; os do usuário preservados
├── skills/<18 núcleo>/        + auto-* criadas pelo próprio assistente
├── output-styles/advogado.md
└── advogado/                  "base"
    ├── scripts/               hooks + CLIs (Node puro, zero npm)
    ├── modelo-escritorio/     template para recriar pastas faltantes
    ├── config.json            escritorio, nome, limiteContexto, limites de auto-skill, formatação
    ├── estado/ logs/          sessão, contexto %, cache de prazos, pedidos (só radicais)
    ├── habilidades/           registro.json, candidatas.json, CHANGELOG.md, rascunhos/, versoes/, _aposentadas/, changelog-harness.md
    ├── versoes-harness/       backups de CLAUDE.md/memória antes de cada edição
    └── pacote/                cópia do pacote instalado (reparo offline pelo doutor)
ESCRITORIO/                    dados do advogado (o desinstalador nunca toca)
```

O padrão é `%USERPROFILE%\ESCRITORIO`, e não Documentos, porque Documentos é frequentemente sincronizado com o OneDrive. O instalador avisa caso o caminho escolhido esteja em uma pasta de nuvem.

## 3. Hooks

| Evento | Script | Faz |
|---|---|---|
| SessionStart | sessao-inicio.js | Recria pastas faltantes. Injeta: versão, onboarding pendente, "próximos passos" do último handoff (≤7 dias), aviso pós-compactação, prazos ≤5 dias úteis, candidatas a skill e skills alteradas recentemente. No modo plugin, faz o bootstrap da base. |
| UserPromptSubmit | registro-pedidos.js | Detector de repetição. Guarda **só radicais** (descarta nomes próprios e números) e usa Jaccard ≥0,5 em 30 dias. Na 3ª ocorrência sem skill que cubra o pedido, cria uma candidata e aponta para `criar-skill-automatica`. |
| PreToolUse Write/Edit | guarda-escrita.js | Bloqueia: alterar amostras de estilo e WIKI/raw; escrever direto em skill viva auto-* ou de núcleo; PII forte em arquivos do harness; CLAUDE.md global >80 linhas; sobrescrever arquivo não lido. Pede confirmação em Arquivados. Faz **backup antes de toda alteração**. |
| PreToolUse Bash/PowerShell/Web/MCP | guarda-sigilo.js | **ask** em qualquer transferência para fora (curl POST/-F/-T, scp, rsync, rclone, git push, gh create, s3/gsutil/azcopy, Invoke-WebRequest -Body/-InFile, Send-MailMessage, requests.post, smtplib, fetch), em cópias para pastas de nuvem e em ferramentas MCP de envio/criação. **deny** em busca web contendo CPF/CNPJ/nº CNJ e em exclusão em massa no ESCRITORIO. |
| PostToolUse * | pos-ferramenta.js | Scanner de injeção em Read/WebFetch; checagem de citações a cada escrita de peça; validação automática de rascunho de skill; contador de uso; aviso único entre 65% e 75% de contexto. |
| Stop | gatilho-handoff.js | ≥ limite → `block` + "⚠️ HANDOFF AUTOMÁTICO…". Respeita `stop_hook_active` e só dispara de novo após mais 10 pontos. |
| statusLine | statusline.js | `⚖️ nome │ 📁 caso (fase) │ 🧠 memória X% ▓▓░ │ ⏰ prazo │ modelo` |

## 4. Auto-harness: skills criadas sem aprovação

O requisito era criar skills automaticamente, **sem aprovação**. A segurança vem de salvaguardas **impostas por código**, e não só pelo prompt:

1. **Gatilho.** O detector gera uma candidata, ou o próprio modelo percebe a repetição. A meta-skill `criar-skill-automatica` executa os passos 0–6.
2. **Rascunho obrigatório** em `habilidades/rascunhos/<nome>/`. O hook bloqueia a escrita direta em `~/.claude/skills/auto-*` e nas skills de núcleo.
3. **Validação** (`habilidades.js validar`):
   - nome `auto-<dir>` e `metadata.origem: automatica` + `motivo`;
   - seções obrigatórias "Quando usar", "Passos" e "Teste";
   - `allowed-tools` restrito a Read/Glob/Grep;
   - sem hooks, sem injeção `!`, sem comandos de rede e sem PII;
   - ≤300 linhas e YAML que o Claude Code aceite.
4. **Ensaio (dry-run).** `teste/resultado.md` deve terminar com `RESULTADO: APROVADO`; sem isso, a publicação é recusada.
5. **Publicação** (`publicar`), com as seguintes garantias:
   - nomes do núcleo são recusados;
   - limites de 3 skills por dia e 30 ativas;
   - backup da versão viva anterior em `versoes/`;
   - cópia sem a pasta de teste;
   - registro com `versao++` e status `experimental`;
   - **CHANGELOG** com o comando para desfazer;
   - aviso de uma linha ao usuário.
6. **Feedback.** `resultado ok|falha`: 5 sucessos sem falhas levam ao status `estavel`; **2 falhas → `_aposentadas` automaticamente**.
7. **Reversão.** `desfazer`, `aposentar`, `restaurar` e `historico`. Tudo também pela skill `/habilidades`.

Edições no CLAUDE.md, na memória e no perfil de escrita recebem backup em `versoes-harness/` e uma linha em `changelog-harness.md`.

## 5. Antialucinação e qualidade

- `lib/citacoes.js`:
  - reconhece REsp, AREsp, RE, ARE, HC, MS, ADI, ADPF, Apelação/Agravo, Súmula, Tema, Enunciado e OJ, além de Lei/Decreto/Resolução nº x/aaaa e "art. N do CPC/CC/CLT/CF…";
  - classifica cada citação como **verificada** (link http ou `[fonte: caminho existente]` a até 300 caracteres), **marcada** (`[NÃO VERIFICADO]`) ou **pendente**.
- Toda escrita de peça dispara a checagem (PostToolUse), e `checar-peca.js --marcar` faz backup e marca as citações.
- `exportar-docx.js` **recusa exportar** (exit 2) se houver jurisprudência pendente; para passar, use `--forcar`.
- `/advogado-do-diabo` roda em `context: fork`, em leitura, como a parte contrária.
- O checklist "cara de IA" procura expressões típicas, emojis, resíduos de markdown, placeholders e parágrafos longos demais em relação ao perfil.
- `estilo.js` extrai métricas reais das amostras para o `perfil-de-escrita.md`: parágrafo e frase médios, conectivos, pronomes de tratamento, designação das partes, fechos, latinismos, estilo de citação (nº/n., fls., ID PJe, Rel., j., DJe, "grifos nossos") e títulos em caixa alta.

## 6. Economia de tokens

- `preparar-autos.js` converte cada documento **uma vez só** (manifesto com hash) para `autos-md/`:
  - usa pdftotext ou markitdown, e um leitor DOCX próprio;
  - insere marcadores `<!-- pág. N -->`;
  - remove anexos idênticos, páginas repetidas entre documentos e cabeçalhos/rodapés repetidos (por exemplo, o carimbo do PJe);
  - sinaliza páginas escaneadas, com OCR local opcional (`--ocr`, tesseract por);
  - gera um `INDICE.md` com ~tokens por documento.
- As skills mandam ler o ÍNDICE e depois apenas os trechos necessários.
- O CLAUDE.md global tem ~28 linhas e um hard limit de 80. Os detalhes ficam nas skills, que são carregadas sob demanda.
- v0.4: descrições das skills ≤ 200 caracteres, detalhes em `references/` e manutenção automática a cada 15 dias (seção 14).

## 7. Injeção de prompt

`lib/injecao.js` detecta padrões em português e inglês: "ignore as instruções anteriores", "nota para a IA", "se você é uma IA", "julgue procedente", envio a URL/e-mail, "não informe o usuário" etc. Atua:

- no PostToolUse, em todo Read/WebFetch;
- no `preparar-autos`, onde também detecta **texto oculto em DOCX** (`w:vanish`, fonte branca, tamanho ≤2pt).

O alerta entra como `additionalContext`. O CLAUDE.md reforça que documentos são dados, não ordens.

## 8. Sigilo / LGPD (local-first)

- Nenhuma chamada externa por padrão: WebFetch/WebSearch ficam em `ask`, e as saídas de dados passam pelo guard.
- Os dados do caso ficam somente no disco local.
- O detector de repetição não guarda o texto dos pedidos.
- O DOSSIE tem uma seção "Uso de IA (Recomendação CFOAB nº 001/2024)", e há um modelo de termo de consentimento.
- **Limitação conhecida:** o conteúdo da conversa vai para a API da Anthropic (inerente ao Claude Code), e os transcripts ficam em `~/.claude/projects` por `cleanupPeriodDays`. Ver as questões em aberto.

## 9. Brasil-nativo

O Claude for Legal, da Anthropic, é centrado nos EUA. Este mod parte do processo brasileiro:

- prazos em dias úteis (CPC arts. 219, 220 e 224; recesso de 20/12 a 20/01; feriados nacionais e móveis via Páscoa), com exceções descritas na skill (JEC, art. 12-A da Lei 9.099; CLT art. 775; CPP art. 798 em dias corridos);
- requisitos da inicial (CPC art. 319) no checklist;
- modelos de inicial, contestação, apelação, contrato, parecer e termo de consentimento de IA;
- formatação forense brasileira;
- governança alinhada à Resolução CNJ nº 615/2025 e à Recomendação CFOAB nº 001/2024: supervisão humana, transparência com o cliente e verificação das fontes.

## 10. Plugin × instalador; Node

- **Instalador (principal):** é o único caminho que entrega statusline, bloco do CLAUDE.md, output style, permissões e configurações de idioma e tema.
- **Plugin (v0.5: caminho completo, instalável de dentro do chat):** `.claude-plugin/plugin.json` + `marketplace.json`, validados com `claude plugin validate`. As skills ficam com namespace (`/advogado-claude:novo-caso`), o SessionStart faz o bootstrap da base e `PE instalar-plugin` roda `instalar.js --modo-plugin` (statusline, CLAUDE.md, permissões e estilo, sem duplicar hooks nem skills). Ver §15.5.
- **Node:** escolhido em vez de PowerShell/bash duplicados porque oferece um código só para Windows e macOS, JSON nativo e zero dependências npm. Zip, DOCX, leitura de DOCX e cálculo de prazos foram implementados à mão.

## 11. Testes realizados (Linux)

- `node testes/rodar-testes.js` → **100/100** (v0.2). Cobre:
  - instalação, idempotência e preservação das settings do usuário;
  - todos os hooks e guards;
  - injeção, inclusive texto oculto em DOCX;
  - fluxo de citações;
  - .docx validado com python-docx (margens 3/3/2);
  - detector de repetição;
  - ciclo de vida completo da auto-skill, incluindo YAML inválido;
  - statusline e handoff, com fallback para o transcript;
  - preparar-autos com PDF real (página repetida e carimbo removidos);
  - estilo, prazos e desinstalação.
- `instalar.ps1` executado de verdade sob **pwsh 7 no Linux**, em modo silencioso, com caminho contendo espaços. Os dois .ps1 passam no parser. Os arquivos .ps1 são ASCII, para compatibilidade com o PS 5.1.
- `instalar.sh` executado em modo silencioso; shellcheck limpo nos três scripts bash.
- `claude plugin validate`: plugin e marketplace aprovados.
- **v0.2:** `node testes/simular-bootstrap.js` → **29/29 em bash e 29/29 em PowerShell (pwsh 7)**. A simulação executa os blocos do INSTALAR.md contra uma release local:
  - ambiente, download e SHA256, instalação silenciosa e doutor;
  - entrevista interrompida e retomada, varredura, registro, amostras, estilo, dossiês e `/preparar-autos` lendo da pasta original;
  - conclusão, re-execução idempotente, `/consertar`, varredura sem nomes (sigilo) e recusa de download com hash fixado ou publicado adulterado ou estavel.json malformado.
- **Não testado:** Windows real com PS 5.1, macOS real e sessão real do Claude Code com os hooks disparando (falta autenticação no ambiente de testes).

## 12. v0.2: instalação autônoma ("cole uma frase")

### Fluxo
O advogado cola **uma frase** no Claude Code (CLI ou aba Code do Claude Desktop, ambiente Local), pedindo para ler `INSTALAR.md` no GitHub. O arquivo é um **roteiro escrito para o Claude executar**:

| Etapa | O que acontece | Marca no estado |
|---|---|---|
| 0 | `PE estado`: se já instalado, retoma da etapa pendente | — |
| 1 | Blocos `ps-ambiente`/`sh-ambiente`: sistema, PowerShell, Node, Git (opcional), winget/brew, `CLAUDE_CODE_REMOTE` (**para** se for sessão na nuvem). Explica o plano e pede consentimento e nome, uma pergunta por vez | — |
| 2 | Node LTS se faltar (winget / brew / .pkg oficial com SHASUMS256); leitura de `release/estavel.json` (raw, `main`), download de `releases/download/<tag>/advogado-claude-mod-v<ver>.zip` + `.sha256` pela tag exata; o hash precisa bater com o fixado **e** com o publicado (**aborta e apaga** se diferir); extração; `instalar.ps1 -Silencioso` via `(Get-Process -Id $PID).Path -ExecutionPolicy Bypass` (só no processo) ou `instalar.sh --silencioso` | `instalacao` |
| 3 | `doutor.js` → `--consertar` se preciso | `verificacao` |
| 4 | Entrevista roteirizada (`proxima-pergunta`/`responder`, 10 perguntas), `varrer` (local, só nomes; mostra só pasta-mãe + contagens com ids `G1…`), `registrar <tipo> --grupo Gn` (caminho real resolvido do estado local) | `entrevista`, `registro` |
| 5 | `copiar-amostras` (só estilo, com consentimento) → skill aprender-meu-estilo; `subpastas` → `dossie` por caso ativo confirmado | `estilo`, `dossies` |
| 6 | `concluir`: primeiro HANDOFF em `HANDOFFS/AAAA-MM-DD_HHMM_primeira-execucao.md`, `onboardingConcluido=true`, resumo "como usar" | `resumo` |

### Decisões
- **Fonte única.** `skills/primeira-execucao/SKILL.md` é gerado de `INSTALAR.md` (`ferramentas/sincronizar-bootstrap.js`); o CI e a suíte falham se divergirem. O mesmo roteiro serve para instalar do zero e para retomar ou refazer depois da instalação.
- **Blocos independentes e testáveis.** Cada bloco tem um marcador `# bloco: <id>` e não depende de variáveis de outro bloco (o shell do Claude Code não preserva variáveis entre comandos). `testes/simular-bootstrap.js` extrai e executa **literalmente** esses blocos, em bash e PowerShell, contra uma release local servida por HTTP.
- **Compatibilidade com PS 5.1.**
  - Os blocos não usam `&&`.
  - TLS 1.2 é forçado, com `-UseBasicParsing` e `$ProgressPreference` silencioso (evita a lentidão do IWR).
  - `Expand-Archive` exige nomes ASCII no zip; o empacotador recusa nomes fora disso.
  - `Unblock-File` fica tolerante a erro.
  - `Join-Path` é aninhado, sem barras invertidas literais.
  - Os `.ps1` são ASCII.
  - A política de execução da empresa (GPO) **não** é contornada: o roteiro manda parar e procurar o TI.
- **Node recém-instalado.** O PATH da sessão do Claude Code não muda depois do winget. Por isso, o instalador grava nos hooks o **caminho completo** do Node quando `node` não está no PATH, e o doutor confere se os hooks executam.
- **Recarga.** Hooks e settings recarregam sozinhos no meio da sessão (documentado). Skills recarregam se `~/.claude/skills` já existia; se não, é preciso `/reload-skills`. Enquanto isso, o roteiro lê os SKILL.md diretamente.
- **Apontar, não copiar.** As pastas confirmadas vão para:
  - `config.json → pastasExternas` (fonte única);
  - `ESCRITORIO/mapa-de-pastas.md` (leitura humana);
  - `permissions.additionalDirectories`.
  A guarda de escrita pede confirmação (`ask`) para gravar nessas pastas. `/preparar-autos` lê a "Pasta original" do dossiê sem copiar. Só as amostras de estilo são copiadas (com consentimento, dedupe por hash e log de origem em `ESTILO/origem-das-amostras.txt`).
- **Privacidade na varredura.** A varredura lê só nomes e o resultado traz **só a pasta-mãe (raiz/1º nível) e contagens** (ex.: `[G2] Documentos/Clientes: 37 pastas`); nenhum nome de subpasta ou arquivo e nenhum caminho completo sai do script. Um 1º nível com cara de caso (" x ", nº CNJ, CPF/CNPJ) vira `(pasta de caso)`. Os caminhos reais ficam só no estado local; `registrar`, `copiar-amostras` e `dossies` aceitam `--grupo Gn`. Os dossiês podem ser criados em lote (`dossies --grupo`) sem listar nomes; listar (`subpastas`) só com permissão explícita, avisando que os nomes aparecerão na conversa. Respostas com CPF/CNPJ/nº de processo são recusadas. **Ressalva honesta:** tudo o que aparece no chat é processado pela API da Anthropic; por isso o desenho evita levar nomes ao chat.
- **Doutor (`/consertar`).** São 20+ verificações, incluindo testes funcionais sem rede. O reparo:
  - reinstala a partir de `~/.claude/advogado/pacote`, offline e com backup;
  - recria pastas que faltam;
  - re-sincroniza as pastas externas;
  - guarda de lado estados corrompidos.
  Ele nunca apaga nada do ESCRITORIO.
- **Retenção.** `cleanupPeriodDays = 14` (a documentação aceita mínimo 1; o padrão do Claude Code é 30), aplicado **só se ausente**. Os transcripts em `~/.claude/projects` guardam trechos lidos de documentos de clientes, e 14 dias cobrem `/resume` no dia a dia, porque a continuidade real fica nos dossiês e handoffs. A configuração é global, ou seja, vale também para outros projetos do usuário (documentado no README). Ao desinstalar, a chave é removida se foi o mod que a definiu.

### Release e segurança da cadeia
- **Empacotamento.** `ferramentas/empacotar.js` gera um zip reprodutível (lista do `git ls-files`, data fixa, ordem estável, entradas STORE sem compressão para não depender da versão do zlib, permissões unix 755 para `.sh`/`.command`; `.gitattributes` `* -text` evita conversão de fim de linha) com nomes fixos e versionados, `.sha256`, `SHA256SUMS.txt` e `NOTAS.md`.
- **Workflow** (`.github/workflows/release.yml`):
  - testes em ubuntu, windows (Windows PowerShell 5.1 real: `instalar.ps1` + doutor + simulação) e macos;
  - em tag `v*`: empacota (falha se tag ≠ VERSAO, se restarem marcadores, ou se o SHA256 reconstruído ≠ `release/estavel.json`), confere o SHA256, publica o atestado SLSA (`actions/attest-build-provenance`) e cria a Release com o `gh`.
- **Modelo de ameaça.** O SHA256 publicado ao lado do zip protege contra corrupção ou troca no transporte, mas não contra o comprometimento do repositório: quem altera `INSTALAR.md` controla o que o Claude executa. Mitigações: proteção de branch e tags, releases imutáveis e atestado de procedência (PUBLICAR.md).
- **Fixação de versão (pinning).** `empacotar.js --fixar` grava `release/estavel.json` (`versao`, `tag`, `arquivo`, `sha256`), que é versionado mas fica **fora do zip** — sem dependência circular. O INSTALAR.md lê esse arquivo, valida o formato, baixa pela **tag exata** e exige que o hash coincida com o fixado e com o `.sha256` da release. O CI reconstrói o zip na tag e falha se o hash não for idêntico ao fixado. Assim, trocar o asset da release (ou a release `latest`) não basta para entregar outro pacote; seria preciso alterar a `main`, o que a proteção de branch cobre.

## 13. v0.3: piloto automático, modo auto e harness engineering autônomo

### 13.1 Recurso principal: o assistente faz harness engineering sozinho
Cada instalação evolui para o advogado que a usa, **sem pedir aprovação** e sem tirar o advogado do controle (tudo local, versionado, com changelog e desfazer). São dois pilares:

**(a) Skills autônomas** (já existentes, agora com mais gatilhos):
- detector de tarefas repetidas (`UserPromptSubmit` → `candidatas.json`) → skill `criar-skill-automatica`;
- **reflexão** (novo): no `Stop` periódico, no `SessionEnd` (retomado no `SessionStart` seguinte) e em todo handoff, o Claude revisa o que aconteceu e publica skills a partir dos procedimentos repetidos;
- salvaguardas inalteradas: rascunho → `validar` (YAML, nome, rede, `allowed-tools`, sigilo) → ensaio → backup → publicar → changelog; limites/dia, teto de ativas, aposentadoria após 2 falhas, `desfazer`.

**(b) Memória autônoma em camadas** (onde cada coisa mora):

| Camada | Arquivo | Quem escreve | Dado de cliente? |
|---|---|---|---|
| Caso | `CASOS/<fase>/<caso>/DOSSIE.md` | Claude (skill `reflexao`, `handoff`) | **Sim — o único lugar** |
| Estilo (automático) | bloco `aprendizado-automatico` em `ESTILO/perfil-de-escrita.md` | `memoria.js aprender-edicoes` (determinístico) | Não (filtro) |
| Preferências e cuidados | `ESCRITORIO/MEMORIA/preferencias-e-cuidados.md` | `memoria.js preferir` (dedupe, confirmações) | Não (recusado) |
| Changelog / arquivo morto | `MEMORIA/CHANGELOG.md`, `MEMORIA/arquivo-morto.md` | `memoria.js` | Não |
| Instruções globais | `~/.claude/CLAUDE.md` (bloco do mod) | instalador; `manter` restaura | Não (guarda) |
| Memória automática do Claude Code | `~/.claude/projects/<proj>/memory/` (`autoMemoryEnabled: true`) | o próprio Claude Code | Não (guarda + faxina) |

**Aprendizado com as edições (diff rascunho × final).**
- `pos-ferramenta` fotografa cada peça escrita pelo assistente (`estado/rascunhos/<id>.txt`, `.md` em `PECAS/` ou `CASOS/**/pecas/`); `exportar-docx` fotografa o `.docx` gerado (o advogado costuma editar no Word).
- Antes de o assistente tocar de novo numa peça (`guarda-escrita`, PreToolUse), ao reexportar o .docx, e em toda reflexão, `aprender-edicoes` compara a foto com o arquivo atual.
- O diff é LCS por parágrafo e, dentro dos blocos alterados, LCS por palavra. Saem substituições 1↔1, palavras cortadas/acrescentadas e a variação do tamanho médio das frases.
- **Filtro de sigilo do diff:** só entram palavras minúsculas, sem dígitos, com 3+ letras e que **nunca** aparecem com inicial maiúscula fora de início de frase no texto (nomes próprios, números e partes ficam de fora). O acumulado fica em `estado/aprendizado-estilo.json`; uma regra só aparece no perfil depois de 2 ocorrências (substituição) ou 3 (corte/acréscimo).
- A versão do advogado vira a nova referência, e o bloco automático do perfil é regravado com backup.

**Auto-manutenção (`memoria.js manter`, no máximo 1×/20 h, ou `--forcar`).**
1. Backup (`~/.claude/advogado/backups/memoria/<carimbo>`, últimos 30).
2. CLAUDE.md global: o bloco do mod volta ao modelo do pacote; linhas extras viram itens de preferência (aponte, não copie); linhas com dado sensível são descartadas.
3. CLAUDE.md do ESCRITORIO: a seção "Aprendizados" migra para `MEMORIA/` e vira ponteiro.
4. Preferências: duplicatas fundidas (Jaccard ≥ 0,7); itens com 1 confirmação e mais de 120 dias → arquivo morto.
5. Memória automática do Claude Code: linhas com CPF/CNPJ/CNJ/RG/e-mail/telefone são substituídas por um aviso (com backup).
6. Tudo registrado em `MEMORIA/CHANGELOG.md`.

**Gatilhos da reflexão (hooks).**
- `Stop` (`gatilho-handoff.js`): além do handoff de 75%, bloqueia **uma vez** com "🧠 REFLEXÃO AUTOMÁTICA" quando há ≥ `limites.reflexaoACada` (30) usos de ferramenta desde a última, ou uma peça escrita e ≥ 8 usos. Roda antes a parte determinística (`memoria.reflexao`) e manda o Claude seguir a skill `reflexao`. Respeita `stop_hook_active` e não repete até novos N usos.
- `SessionEnd` (`memoria.js reflexao --automatica --fim`, timeout 30 s; a documentação dá orçamento de 1,5 s, elevado até 60 s pelo `timeout`): faz a parte determinística e, se houve trabalho, grava `reflexaoPendente`. O `SessionStart` seguinte injeta "🧠 REFLEXÃO PENDENTE" com os passos; `memoria.js reflexao` (manual) limpa a pendência.
- Handoff (75% ou `/handoff`): inclui a skill `reflexao`.

**Guardas.** `guarda-escrita` nega CPF/CNPJ/nº CNJ formatados em `CLAUDE.md`, skills, `*/memory/*`, `ESCRITORIO/MEMORIA/**` e `ESTILO/perfil-de-escrita.md`; `memoria.js preferir` recusa qualquer padrão de `acharSigilo` (inclui e-mail e telefone); a faxina pega o que escapar. Os gatilhos são todos *fail-open*: um erro de memória nunca trava o trabalho.

### 13.2 Piloto automático da instalação
- **Zero perguntas opcionais.** Sem pedido de licença (a frase colada autoriza download verificado + Node LTS), escritório no padrão, atalho sempre no Windows (`-Atalho`), Node instalado sozinho (`winget --silent` / `brew`), amostras de estilo copiadas sozinhas (até 10, cópia local), dossiês criados para cada subpasta de casos.
- **Nome:** `PE nome-sugerido` tenta `git config --global user.name`, depois o nome completo da conta (macOS `id -F`, Windows `[adsi]WinNT FullName`, Linux `getent passwd` GECOS), com validação; achou → `PE definir-nome` (atualiza `config.json` e a linha "Usuário:" do bloco do CLAUDE.md). Não achou → única pergunta.
- **Descoberta autônoma (`PE autopiloto`):** a mesma varredura local só de nomes; `classificar()` dá nível alta/média/baixa por categoria:
  - peças: alta com ≥5 docs com nome de peça, ou ≥3 e nome da pasta compatível; média com ≥2;
  - modelos: alta com ≥2 docs e nome compatível; média com ≥3;
  - casos: alta com ≥3 subpastas e nome compatível; média com ≥2;
  - prazos: alta só quando há arquivos com prazo/agenda/pauta/audiência no nome (registra esses arquivos, não a pasta);
  - qualquer coisa em Downloads cai de alta para média, e a sugestão padrão é "ignorar".
  Alta → registra (apontamento), cria dossiês e copia amostras. Média → entra na **pergunta única** (pasta-mãe + contagem + sugestão); `PE resolver ok` aplica as sugestões, `PE resolver G3=nao G5=sim` corrige. A privacidade da v0.2 se mantém: nenhum nome de subpasta/arquivo/caminho no chat.
- **Leitura de temporários pelo shell** (`Get-Content`/`cat`) em vez da ferramenta Read: evita o prompt de "leitura fora do diretório de trabalho" do modo auto.
- Mantidos: SHA256 fixado + publicado, parada em política de execução da empresa, retomável/idempotente.

### 13.3 Modo auto, modelo e permissões
- **Documentado (permission-modes, out/2026):** `permissions.defaultMode: "auto"` só vale em settings de usuário/gerenciadas (não de projeto); no terminal/VS Code, auto já é o modo inicial embutido desde a v2.1.283. Requer modelo suportado (API Anthropic: Opus 4.6+, Sonnet 4.6+, Haiku 5.5) e pode ser desligado pela organização (`disableAutoMode`); indisponível → a sessão abre em Manual. Shift+Tab alterna (status "⏵⏵ auto mode on"); prompts de Bash oferecem "Yes, and switch to auto mode" (os de PowerShell, não); o app Desktop lembra o modo escolhido no seletor.
- **O instalador grava (na primeira instalação ou com `--forcar`):** `permissions.defaultMode: "auto"`, `model: "claude-opus-5-5"` (Opus 5.5 é nome documentado; id completo `claude-opus-5-5`), `modelSettings["claude-opus-5-5"].effortLevel: "medium"` (o `effortLevel` de topo não vale para o Opus 5.5) e `autoMemoryEnabled: true`. Os valores anteriores ficam em `config.json → configAnterior`; reinstalar **não** sobrescreve escolhas posteriores do usuário (`pilotoAutomaticoAplicado`); desinstalar restaura só se o valor ainda for o do mod. Modelo/esforço valem a partir da próxima sessão (a documentação diz que essas chaves são lidas no início da sessão); permissões e hooks recarregam no meio da sessão.
- **Fallback sem modo auto: regras estreitas.** A regra ampla `Bash(node *advogado/scripts/*)` saiu (o curinga antes do caminho cobriria `../` e qualquer `.js`, e no modo auto regras amplas de interpretador são descartadas). Entraram regras exatas por script, para `Bash` e `PowerShell`, nas formas `$HOME/...` e `~/...`, por exemplo `Bash(node "$HOME/.claude/advogado/scripts/primeira-execucao.js" *)`. Regras estreitas sobrevivem ao modo auto e resolvem antes do classificador. O INSTALAR.md escreve `PE`/`DOUTOR` exatamente nessa forma.
- **Nunca** `bypassPermissions` nem `--dangerously-skip-permissions`; a suíte verifica que a palavra não aparece no settings.
- **Defesa em profundidade.** No modo auto, os hooks continuam rodando: `guarda-sigilo` (rede/upload com dados de cliente), `guarda-escrita` (fontes brutas, skills, memória global sem sigilo, ler antes de sobrescrever, versionamento) e regras `deny`/`ask` (as regras `ask` de WebFetch/WebSearch continuam perguntando).

**Aprovações que restam (realista):**

| Situação | Interações do advogado |
|---|---|
| Modo auto ligado, Node presente, nome no Git/conta, nenhuma pasta ambígua | **1** (colar a frase) |
| Idem, com pasta ambígua | **2** (colar + "ok") |
| Sem nome detectável | +1 (nome) |
| Windows sem Node | +1 (UAC do winget) |
| Classificador pede confirmação de algum passo | +1 (raro) |
| Sem modo auto (Manual) | +4 a 7 cliques em "Sim" na 1ª instalação (WebFetch do roteiro, PE estado, ambiente, Node, download, instalação); depois as regras estreitas cobrem os scripts |

### 13.4 Modelo de ameaça (adições da v0.3)
- **Autonomia de memória × injeção de prompt:** um documento malicioso poderia tentar plantar "preferências". As mitigações: preferências são frases curtas (≤ 300 caracteres), ficam num arquivo legível com changelog, só valem como preferência de trabalho (o CLAUDE.md manda tratar conteúdo de documento como dado), e o scanner de injeção do PostToolUse continua avisando. Skills autônomas continuam passando pelo validador (que reprova rede/upload).
- **Autorização na frase:** a frase autoriza só o que nomeia (instalador verificado deste repositório e Node LTS oficial); o roteiro manda parar em qualquer divergência de SHA256 e em bloqueio corporativo, e nunca reescrever comandos para contornar o classificador.

## 14. v0.4: manutenção das habilidades a cada 15 dias

### 14.1 Como as skills ocupam contexto (conferido em code.claude.com/docs/en/skills, out/2026)
- **Listagem (em toda conversa):** nome + `description` (+ `when_to_use`) de cada skill. Cada entrada é cortada em 1.536 caracteres (`skillListingMaxDescChars`). A listagem inteira tem orçamento de ~1% da janela de contexto (`skillListingBudgetFraction` / `SLASH_COMMAND_TOOL_CHAR_BUDGET`); quando estoura, o Claude Code descarta as descrições das skills menos usadas, e com elas as palavras-gatilho.
- **`disable-model-invocation: true`:** a descrição **não** entra no contexto; a skill só roda com `/nome`. Usado em `/backup`, `/habilidades` e `/manutencao`.
- **Corpo do SKILL.md:** só carrega quando a skill é invocada, mas depois **fica na conversa** nos turnos seguintes. Na compactação, os primeiros 5.000 tokens de cada skill invocada voltam, com orçamento total de 25.000 tokens.
- **Arquivos de apoio (`references/*.md`):** só entram quando o Claude os lê. A documentação recomenda SKILL.md com menos de 500 linhas e detalhes em arquivos separados.
- **Memória:** do `MEMORY.md` da memória automática só carregam as primeiras 200 linhas / 25 KB; o CLAUDE.md carrega inteiro (meta: < 200 linhas).

Por isso a economia é real em duas frentes: **descrições curtas** reduzem o custo fixo de toda conversa (e evitam que o Claude Code descarte gatilhos), e **divulgação progressiva** reduz o que entra e permanece na conversa quando a skill é usada.

### 14.2 Agendamento sem agendador do sistema
- `scripts/manutencao.js` guarda o estado em `~/.claude/advogado/estado/revisao-skills.json` (`ultima`, `proxima`, `ultimoResumo`, `resumoPendente`, `backup`, `relatorio`).
- O hook `SessionStart` (`sessao-inicio.js`) chama `aoIniciarSessao()` depois do onboarding e fora de `compact`. Na 1ª vez só marca a data de referência. Com **≥ 15 dias** desde a última, roda `revisar({automatica:true})` sem pedir aprovação, com uma trava de 10 minutos contra conversas simultâneas. O resumo é injetado uma única vez no contexto, para o assistente mostrar ao advogado em uma linha.
- Agendador do Windows/launchd: **não** usado. A manutenção só importa quando o Claude Code roda, e registrar tarefas exigiria caminho do Node, permissões e mais superfície de risco (fica no Roadmap).
- Manual: skill `/manutencao` (núcleo 20) → `medir`, `revisar`, `simular` (`revisar --simular`), `desfazer [carimbo]`, `estado`. O doutor mostra última/próxima manutenção.
- Os limites são ajustáveis em `config.json` → `manutencao` (padrão: intervalo 15 dias, descrição 200, corpo 2.500, sem uso 45 dias, semelhança 0,6, MEMORY.md 200 linhas/25 KB, CLAUDE.md 200 linhas, bloco do assistente 60, preferências 80).

### 14.3 O que a revisão faz (sempre: backup → ensaio → aplica ou reverte → changelog)
1. **Backup** em `~/.claude/advogado/backups/revisoes/<carimbo>/`: skills, `registro.json`, arquivos de memória tocados, e uma lista dos arquivos criados (o `desfazer` os remove).
2. **Medição** por skill: descrição (custo fixo, caracteres e ~tokens a 3,5 caracteres/token), corpo e `references/`. Total antes/depois no relatório.
3. **Aposentar** `auto-*` sem uso há 45+ dias (`ultimoUso` do registro). Conta uso pelo Skill tool (PostToolUse) e, a partir da v0.4, também pelo `/nome` digitado (UserPromptSubmit). A skill vai para `habilidades/_aposentadas/`, onde não carrega; volta com `/habilidades restaurar`. **Núcleo nunca é aposentado.**
4. **Mesclar** pares `auto-*` com semelhança de Jaccard ≥ 0,6 (nome + termos da descrição). A mais usada fica; o corpo da outra vira `references/variante-<nome>.md` com ponteiro em `## Variantes`; a outra é aposentada. Refinamento semântico do texto mesclado: `/manutencao` → skill criar-skill-automatica.
5. **Enxugar descrições** > 200 caracteres: tira parênteses, fica com a 1ª frase do "o que faz" e as cláusulas do "Use quando". A prioridade é a 1ª cláusula, depois o `/comando`, depois gatilhos entre aspas ou em MAIÚSCULAS (ex.: "⚠️ HANDOFF AUTOMÁTICO"); enumerações longas são cortadas nos primeiros itens.
6. **Divulgação progressiva** em corpos > 2.500 caracteres: move para `references/<seção>.md` seções de detalhe (exemplos, modelos, tabelas, checklists, variantes...) com ≥ 400 caracteres e deixa um ponteiro. Nunca move as seções iniciais, "Quando usar"/"Passos" das auto-* nem seções com regras de proteção (nunca, proibido, sigilo, LGPD, obrigatório). Skills geradas (`<!-- GERADO`) não são tocadas.
7. **Ensaio (dry-run)** de cada skill alterada, numa cópia temporária. Exige:
   - o validador passa, incluindo os links para `references/` e a ausência de rede também nos `references/` das auto-*;
   - o frontmatter não muda além da descrição;
   - a descrição não cresce, mantém o "Use quando" e todos os `/comandos`, e tem pelo menos 40 caracteres;
   - nenhuma linha do corpo se perde (toda linha original existe no SKILL.md ou em `references/`);
   - as linhas protegidas continuam no SKILL.md.

   Se falhar, a skill fica como estava e entra em "Revertidas" no relatório.
8. **Orçamentos** de CLAUDE.md e memória: roda `memoria.manter`, mede o CLAUDE.md global, o bloco do assistente e o do ESCRITORIO, e arquiva o excesso de preferências (> 80). Se o `MEMORY.md` passar de 200 linhas/25 KB, as linhas além da 150ª vão para `memory/arquivo-AAAA-MM-DD.md`, com ponteiro.
9. **Relatório** em `ESCRITORIO/MEMORIA/revisoes/AAAA-MM-DD.md` e linhas em `habilidades/CHANGELOG.md` e `MEMORIA/CHANGELOG.md`. Resumo de uma linha: "Manutenção feita: N skill(s) enxugada(s), M aposentada(s), contexto fixo das skills -X% (a → b caracteres)."

### 14.4 Enxugamento na origem (pacote v0.4) — medido com `manutencao.js medir --pasta skills`
| | v0.3.0 | v0.4.0 |
| :- | -: | -: |
| Contexto fixo (descrições listadas, toda conversa) | 5.853 caracteres (~1.672 tokens) | 3.517 caracteres (~1.005 tokens), **-40%** |
| Maior descrição | 583 (primeira-execucao) | 200 |
| Corpos das 19 skills da v0.3 (só quando usadas) | 50.472 caracteres | 37.304, **-26%** |
| `primeira-execucao` (SKILL.md) | 20.546 | 7.182 (+14.760 em `references/`) |

- As descrições do núcleo foram encurtadas na origem (mecanicamente, com revisão manual onde o resultado ficou truncado), preservando gatilhos como "⚠️ HANDOFF AUTOMÁTICO", "🧠 REFLEXÃO AUTOMÁTICA"/"REFLEXÃO PENDENTE", "tarefa repetida", ONBOARDING PENDENTE / PRIMEIRA EXECUÇÃO INCOMPLETA e os `/comandos`. Os corpos e o comportamento não mudaram.
- `ferramentas/sincronizar-bootstrap.js` agora gera `primeira-execucao` em partes: o SKILL.md fica com regras, Etapa 0 e índice, e `references/etapa-1-instalacao.md`, `etapas-2-a-6.md` e `problemas-comuns.md` guardam o resto. `--verificar` compara todos os arquivos e acusa sobras.
- Por isso, na máquina do advogado, a revisão quinzenal quase não mexe no núcleo: ela atua nas `auto-*` criadas com o uso. O instalador agora faz cópia limpa das skills do núcleo (backup → remove → copia), para não sobrar `references/` antigo.
- `/manutencao` tem `disable-model-invocation: true`, então não acrescenta custo fixo.

### 14.5 Testes (seção 12c da suíte)
- Viagem no tempo (`ADVOGADO_AGORA`): dia 0 só marca a referência; dia 14 não roda; dia 15 roda no SessionStart e injeta o resumo; a conversa seguinte não repete; dia 29 não roda de novo.
- Fixture com descrição longa, corpo grande, par duplicado, auto-* parada há 60 dias, skill com link quebrado (ensaio falha → revertida) e `MEMORY.md` com 260 linhas. Confere:
  - redução do contexto fixo;
  - descrição ≤ 200 com "Use quando" e `/comando`;
  - `references/` criadas com ponteiro, mantendo a regra "Nunca" no SKILL.md;
  - mesclagem e aposentadoria;
  - núcleo intacto;
  - relatório e changelogs gravados;
  - `--simular` não altera nada;
  - `desfazer` restaura tudo (inclusive remove o arquivo de memória criado).
- No pacote: todas as descrições listadas ≤ 200, contexto fixo ≤ 3.600, `primeira-execucao` < 8.000 e sincronizada; contagem de uso por `/nome`; regra de permissão estreita para `manutencao.js`; núcleo com 20 skills.

## 15. v0.5: sete recursos novos

Todos locais, em pt-BR e encaixados na arquitetura existente (skills/memória autônomas, reflexão, manutenção quinzenal, validador, salvaguardas `auto-*`). Descrições sempre carregadas continuam enxutas: **24 skills no núcleo, contexto fixo 3.496 caracteres** (era 3.517 na v0.4 com 20 skills), detalhes em `references/`. Para caber, as descrições do núcleo perderam o redundante "ou digitar /nome" (o `/nome` funciona sem estar na descrição).

### 15.1 Posse, procedência e mescla das `auto-*` (ideias do autoharness)
- **Regra dura de posse** (`lib/proveniencia.js` `ehNossa`): a automação só toca skills `auto-*` que ela mesma criou — registro com `origem: automatica` **e** `metadata.origem: automatica` no SKILL.md. `habilidades.js publicar` recusa sobrescrever uma `auto-*` que não é nossa; `manutencao.js` (aposentar, mesclar, enxugar) filtra por `podeMexer`. Na v0.4 o enxugamento também alcançava descrições do núcleo na máquina do advogado; agora não (o núcleo já vem enxuto da origem).
- **Ficha de procedência** por skill: `habilidades/proveniencia/<auto-nome>.jsonl` com eventos `criada`, `atualizada` (versão, motivo, candidata, linhas +/−), `contexto` (sessão, tipo de peça, impressão digital sha256 de 12 caracteres da peça/caso — nunca caminho nem nome de cliente), `usada-ok`, `falhou`, `aposentada`, `mesclada`/`absorvida` (quem absorveu quem), `enxugada`, `desfeita`, `restaurada`. Linha com CPF/CNPJ/CNJ/e-mail é recusada. Consulta: `/habilidades proveniencia <nome>`.
- **Mescla na criação:** `publicar` compara o rascunho com as `auto-*` nossas (Jaccard de termos ≥ 4 letras) e, com similaridade ≥ 0,5, recusa (código 4) pedindo para **atualizar** a parecida; `--nova` força quando for outro cenário. `habilidades.js semelhantes "<texto>"` mostra as candidatas. A manutenção quinzenal continua mesclando as que escaparem.

### 15.2 Mapa de teses da defesa (`/mapa-de-teses`, `scripts/mapa-teses.js`)
- `modelo <caso>` cria `<caso>/pecas/mapa-de-teses-AAAA-MM-DD.md` (quadro `| # | Pedido | Valor (R$) | Risco | Teses | Precedentes |` + detalhe por pedido).
- `validar`: risco ∈ {alto, médio, baixo}; todo precedente com `[A VERIFICAR]` **na mesma célula/linha** ou conferido no livro de julgados (`[CONFERIDO: fonte]`); divergente/inexistente reprova. Um link sozinho não basta.
- `marcar` (backup em `_versoes`), `totalizar` (soma por risco, CPC 25: provável/possível/remota; ilíquidos contados fora da soma) e `imprimir` (HTML A4 com marcas grifadas → PDF pelo navegador).
- O PostToolUse valida a cada gravação do mapa e avisa. O script nunca cria citações.

### 15.3 Conferência de julgados (`scripts/julgados.js`, `lib/julgados.js`)
- **Livro** `ESCRITORIO/WIKI/julgados-verificados.json` (só números públicos): `chave()` normaliza ("REsp n. 1.234.567/SP" → `RESP1234567SP`), status `confere | divergente | inexistente`, fonte (link ou `WIKI/raw/...`).
- `comparar`: normaliza tokens; substring literal → 1,0; senão alinhamento palavra a palavra em janelas ancoradas nos tokens raros (troca, acréscimo e — desde a leitura de página/PDF — omissão custam 1 cada; pular palavras do original só é livre antes do início e depois do fim do trecho); ≥ 0,97 = confere, e lista as palavras do trecho citado ausentes do original (`faltando`) e as do original que o trecho pulou (`omitidas`). `trechoCitado` pega aspas ou bloco `>` junto da citação.
- **Normalização tolerante à forma, nunca ao conteúdo** (`tokens()`): NFKC antes do NFD (ligaduras, larguras), sem hífen discricionário (U+00AD) e invisíveis (U+200B–U+200F, U+2060, U+FEFF, marcas de direção), nbsp e espaços especiais → espaço, aspas/travessões tipográficos separam palavras, º/ª/° como antes. Palavra hifenizada no fim da linha (`consti-\ntucional`) é reunida; como `guarda-\nchuva` é ambíguo, o original é comparado em três formas (hifenização reunida; mantida como separador; e, dos dois lados, todo hífen entre letras unido) e fica a melhor. Limiar e lista de palavras não mudaram; nada de similaridade por caracteres.
- **Leitura do original** (`lib/extrair.js`, `extrairTexto(arquivo)` síncrono, sem rede nem dependência): `.html/.htm` (página salva do site) — UTF-8, ou windows-1252/latin1 se o `meta charset` pedir ou se aparecer U+FFFD; remove comentários, `script/style/noscript/template/head`; **descarta elementos escondidos** (mesma detecção de `ocultoNoTexto` aplicada à tag de abertura: `display:none`, `hidden`, fonte branca/minúscula…; pilha de elementos com tags void e fechamentos implícitos de `p/li/td/tr`), devolvendo o descartado em `ocultos`/`textoOculto`; blocos viram quebra de linha, `td/th` espaço; entidades nomeadas (tabela embutida do latin-1 do pt-BR, aspas, travessões, `shy/zwj/zwnj`…) e numéricas (`&#225;`, `&#xE1;`, `&#150;` como windows-1252), com segunda passada para dupla codificação. `.pdf` — `pdftotext -layout` (ou markitdown), **sem OCR**; `limparPaginasPdf(pags)` (pura, testada sem Poppler) tira marcadores de página ("Página 3 de 10", "Pág. 3/10", "fls. 12", "- 3 -", "Num. 123 - Pág. 3", linha só com número) e cabeçalhos/rodapés que se repetem nas 3 primeiras/3 últimas linhas não vazias de ≥ 60% das páginas (dígitos normalizados, ≥ 2 páginas) e une as páginas com `\n` (a hifenização na troca de página é reunida pelos tokens). `.docx` — `docxTexto(arq, {semOcultos:true})`, sem os runs ocultos. `.txt/.md` — como antes (UTF-8, sem BOM). `pdfPaginas`, `docxTexto` e `tem` saíram do `preparar-autos.js` para este módulo (comportamento do preparar-autos igual).
- **Varredura do original** em todos os tipos (`analisarEntrada`/`detectarInjecao`/`detectarInvisiveis` sobre o HTML cru, o texto do PDF ou o XML do Word): `ocultos` e `injecao` viram uma linha "⚠️ … o assistente NÃO obedece" no `comparar`; nunca mudam o resultado. Trecho que só bate com o texto escondido não confere (o advogado é avisado para olhar a página de verdade). Páginas do PDF sem texto são contadas (`paginasSemTexto`); se divergente, o aviso diz que o trecho pode estar nelas.
- **`sem-texto`** (`STATUS_SEM_TEXTO`): html/pdf/docx com < 30 letras/dígitos depois da limpeza (txt/md: só se vazio), `motivo` ∈ `sem-texto-pagina | pdf-escaneado | sem-leitor-pdf | arquivo-vazio`. O `comparar` não diz confere nem divergente: mensagem simples com um passo (salvar como texto / página de novo; `preparar-autos --ocr` e comparar com `autos-md/`; instalar o Poppler), **código 4**, e grava `sem-texto` no livro só se não havia registro ou o anterior também era `sem-texto` (nunca rebaixa `confere`/`divergente`/`inexistente`). `registrar --status sem-texto` continua recusado. Em `lib/citacoes.js` vale como sem registro (`semTexto: true`, nem conferida nem problema; link ou `[fonte:]` na peça continuam contando como hoje); `checar-peca` e `exportar-docx` explicam o motivo na lista de pendentes; `mapa-teses marcar` põe `[A VERIFICAR]`.
- **Limites:** PDF escaneado exige OCR (`preparar-autos --ocr`, local); conteúdo escondido por classe CSS em folha de estilo (sem `style=` na tag) não é detectado; página que monta o texto só com programação do site cai em `sem-texto`.
- **Integração:** `lib/citacoes.js` passa a contar `confere` como verificada e marca `problema` em divergente/inexistente (mesmo com link); `checar-peca` mostra 🔴; `exportar-docx` recusa exportar (salvo `--forcar`); PostToolUse avisa; `/nova-peca` (fechamento) e `/mapa-de-teses` mandam conferir.
- **Rede só com permissão** (`guarda-sigilo.js`): todo `WebFetch`/`WebSearch` → `ask`, exceto domínios em `fontesAutorizadas` (sufixo exato; `stj.jus.br.golpe.com` continua perguntando) e o próprio repositório oficial do assistente (INSTALAR.md) e busca com `buscaWebAutorizada`. `julgados.js autorizar` também passa por `ask` (o advogado confirma na tela). `verificacaoOnline: "nunca"` → `deny`. Dados pessoais → `deny` como antes; número CNJ só passa se for de julgado registrado com `julgados.js pedir`.
- **Basanos** (cognitio.one) é citado só na documentação, como verificação externa opcional; não há integração.

### 15.4 Uma conversa por processo (`/processo`, `/cliente`, `scripts/processo.js`, `lib/casos.js`)
- `abrir <nome|número>`: acha o caso em `CASOS/*/*` (palavras sem acento ou número do processo no DOSSIE), imprime DOSSIE + HANDOFF + peças recentes e `CASO_ATIVO=<pasta>`.
- O PostToolUse vê essa linha e grava `estado/sessoes-casos.json` (`session_id → caso`); no `resume`, o SessionStart injeta "ESTA CONVERSA É DO PROCESSO X; só a memória dele". Gravar arquivo de outro caso na mesma conversa gera um aviso (uma vez por caso).
- `anotar` grava em "Notas da conversa" do DOSSIE (dado do cliente fica só lá). `/casos abrir` aponta para `/processo`.

### 15.5 Instalação pelo chat (plugin + marketplace)
- Conferido em code.claude.com (out/2026): `marketplace.json` com `name`, `owner`, `plugins[{name, source}]` (source relativo à raiz, sem `..`); id de instalação `plugin@marketplace`; `version` no `plugin.json` fixa a versão; CLAUDE.md da raiz do plugin **não** é carregado; `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_PLUGIN_DATA}` existem só nos hooks (não no Bash).
- Comandos: `/plugin marketplace add guifleischfresser/assistente-juridico-claude` → `/plugin install advogado-claude@advogado-claude-mod` → `/reload-plugins`.
- SessionStart em modo plugin grava `~/.claude/advogado/plugin.json` (raiz do plugin), injeta as regras do núcleo enquanto o bloco do CLAUDE.md não existe, avisa o prefixo `/advogado-claude:` e manda rodar `PE instalar-plugin` (INSTALAR Etapa 0 → "MODO PLUGIN").
- `instalar.js --modo-plugin`: não copia skills do núcleo (move cópias antigas para `habilidades/versoes/nucleo/`), não grava hooks no settings.json (remove os nossos antigos — senão cada guarda rodaria 2×), mantém CLAUDE.md, permissões estreitas, statusline e output style; `config.modoPlugin = true`.
- Doutor em modo plugin: confere `enabledPlugins["advogado-claude@advogado-claude-mod"]`, `hooks/hooks.json` e skills na raiz do plugin, e avisa hooks duplicados; o reparo usa `--modo-plugin`.

### 15.6 Erros a não repetir (ideia do repeat-mistake-guard; `lib/erros.js`, `scripts/erros.js`, `/erros`)
- `ESCRITORIO/MEMORIA/erros-a-nao-repetir.json`: `{licao, padrao, exemplo, certo, exceto, escopo, nivel, origem, correcoes, disparos}`.
- **Registro seguro:** padrão ≤ 200 caracteres, compila, sem quantificador aninhado nem 3× `.*`; precisa achar o `exemplo` e **não** acusar o `certo`; genérico demais é recusado; lição sem dados pessoais.
- **Escada:** 1ª correção = aviso (PostToolUse injeta "erro já corrigido apareceu de novo"); a mesma correção de novo (mesmo padrão ou lição parecida ≥ 0,6) = **bloqueio** (PreToolUse `deny` na guarda-escrita, para peças e `.md/.txt` do escritório). Fail-open: arquivo corrompido ou regex quebrada não trava nada; cache por mtime.
- **Gatilhos:** `registro-pedidos` detecta frases de correção ("tá errado", "de novo", "já falei", "tribunal errado", "nunca use"…) e orienta registrar; `memoria.aprenderEdicoes` registra como aviso a troca de palavra que o advogado faz pela 2ª vez.

### 15.7 Portabilidade (ideia do agent-kit; `scripts/agentes.js`)
- `gerar` escreve `ESCRITORIO/AGENTS.md` (bloco marcado; o resto do arquivo é do usuário) com as regras inegociáveis copiadas do template do CLAUDE.md, mais as conferências manuais que substituem os hooks (internet, `_versoes`, `checar-peca`, `erros.js testar`, `mapa-teses validar`, `processo.js`).
- Codex (conferido em developers.openai.com, out/2026): lê `~/.codex/AGENTS.md` e os AGENTS.md da raiz do git até a pasta atual (fora de git, só a pasta atual), limite de 32 KiB; skills em `.agents/skills`. Opt-in: `--skills` copia as skills para `ESCRITORIO/.agents/skills`; `--codex-global` grava bloco marcado em `~/.codex/AGENTS.md` (respeita `CODEX_HOME`). Cursor também lê AGENTS.md. O instalador gera o AGENTS.md; o doutor confere.

### 15.8 Palavra de conferência (canário)
- O bloco do CLAUDE.md global termina com "Palavra de conferência … **JABUTICABA**" (linha comum: comentários HTML podem ser ocultados do modelo). `doutor --canario` imprime a palavra esperada; `/consertar` pede ao modelo a palavra **antes** de ler arquivos e compara.

### 15.9 Testes (v0.5)
- Suíte: 218 testes (+66): posse (recusa sobrescrever `auto-*` do advogado), duplicata recusada, procedência sem dados do cliente, manutenção que não mexe no que não é dela; erros (padrão genérico/sem exemplo recusados, aviso → bloqueio com `deny`, fail-open, detector de correção); julgados (confere/divergente, checar-peca 🔴, exportação bloqueada, `ask` antes da rede, domínio parecido, CNJ liberado só com `pedir`, `nunca`); mapa (validar/marcar/totalizar/imprimir, aviso no PostToolUse); processo (abrir por nome/número, vínculo, retomada, aviso de outro caso, anotar); AGENTS.md e roteiro oficial do GitHub sem pergunta (gerar, preservar texto do usuário, `--skills`, `--codex-global` em `CODEX_HOME` temporário); canário; modo plugin (bootstrap pelo SessionStart, `PE estado`/`instalar-plugin`, sem hooks/skills duplicados, doutor).
- Simulações do bootstrap (bash e pwsh): 28 + 28. `claude plugin validate .` OK. shellcheck, actionlint e parser do PowerShell sem erros. CI: Ubuntu, macOS e Windows PowerShell 5.1.

## 16. Roadmap

1. Teste em uma máquina Windows real (PS 5.1, winget, SmartScreen, OneDrive).
2. Fontes verificáveis: MCPs locais de DataJud/CNJ e de jurisprudência dos tribunais, sempre com aprovação explícita (a v0.5 já confere julgados por WebFetch nos sites autorizados; falta busca estruturada por tribunal).
3. Anonimização opcional antes do envio (pseudonimizar partes no prompt).
4. Registro de consentimento do cliente por caso.
5. Canal de atualização opt-in, assinado.
6. Feriados estaduais e municipais e suspensões por tribunal.
7. Integração com o PJe (consulta de intimações) e opt-in para a nuvem do escritório.
8. Agendador do sistema opcional (Agendador de Tarefas do Windows / launchd) para a manutenção quinzenal rodar mesmo sem abrir o Claude Code — hoje desnecessário, pois ela só importa quando o Claude Code roda.
9. Manutenção usando `/skill-doctor` e o tamanho real da listagem reportado por `/context` quando houver saída legível por script.
10. Mapa de teses: importar valores direto do cálculo da inicial (planilha anexa) e exportar para .docx com tabela.
11. Erros a não repetir: sugerir o padrão automaticamente a partir do diff da correção (hoje o assistente escreve o regex e o validador confere).
12. Teste real do plugin num Claude Code limpo (Windows e Mac): `/plugin marketplace add` → `/plugin install` → primeira execução.
