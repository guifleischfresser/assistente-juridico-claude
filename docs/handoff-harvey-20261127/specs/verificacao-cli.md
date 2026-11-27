# Escaninho: Fase 0, verificação do Claude Code CLI

- **Data:** 26/10/2026, 11h31–11h40 (horário de Brasília).
- **Máquina:** box Linux.
- **CLI:** `claude --version` → **2.1.309 (Claude Code)**, logado em conta claude.ai (plano Pro).
- **Ambiente de teste:** `/tmp/escaninho-fase0/`, com pastas e arquivos fictícios e nenhum dado de cliente. A árvore seguiu a do plano:
  - `raiz/CLAUDE.md`;
  - `raiz/trabalhista/CLAUDE.md`;
  - `raiz/trabalhista/fulano-teste-pf/0000001-00.2026.5.12.0001-teste/` com `CLAUDE.md`, `pecas/`, `documentos/` e `honorarios/`;
  - outro cliente em `raiz/trabalhista/beltrano-teste-pf/caso-x/documentos/segredo.txt`;
  - a ficha em `raiz/_cadastro/clientes/fulano-teste-pf/`;
  - `raiz/ESTILO/`.
- **Arquivos de sessão** ficaram fora da pasta do caso, em `/tmp/escaninho-fase0/sessoes/caso1/`: `settings.json` e `mcp.json`.
- **Modelo usado:** `--model haiku` em todos os testes de comportamento, com prompts mínimos. Foram cerca de 30 chamadas curtas.
- **Bypass:** nenhum teste usou `--dangerously-skip-permissions` nem `bypassPermissions`.
- **Limpeza:** os transcripts de teste foram apagados com `claude purge -y` (ver §12). Nada foi criado nem alterado em `claude-code-wrap` ou `assistente-juridico-claude`.

Peças auxiliares de teste, que existem só em `/tmp/escaninho-fase0/`:
- `perm-mcp-fake.js`: servidor MCP stdio com a ferramenta `aprovar`, no mesmo protocolo do `bin/permission-mcp.js` do wrap. Grava cada pedido em log e responde allow ou deny conforme a variável `FASE0_DECISION`. Faz o papel do "cartão".
- `guarda-caso.js`: protótipo do hook PreToolUse. Nega Read, Glob, Grep, Edit e Write em caminhos dentro da raiz que fiquem fora do caso, da ficha e de `ESTILO/`.

Comando-base dos testes, a partir da pasta do caso:
```
claude -p --model haiku --output-format stream-json --verbose \
  --permission-mode <modo> --strict-mcp-config \
  --mcp-config /tmp/escaninho-fase0/sessoes/caso1/mcp.json \
  --permission-prompt-tool mcp__esc__aprovar \
  --settings /tmp/escaninho-fase0/sessoes/caso1/settings.json
# prompt enviado por stdin
```

---

## Resumo

| # | Recurso | Status |
|---|---|---|
| 1 | `claude --version` / `claude auth status` | **OK** |
| 2 | `-p --output-format stream-json` (exige `--verbose`) | **OK** |
| 3 | `--input-format stream-json` (vários turnos no mesmo processo) | **OK** |
| 4 | `--permission-mode` (valores aceitos; `manual` × `default`) | **OK**, com correção ao plano |
| 5 | `--settings <arquivo>` fora da pasta do caso | **PARCIAL**: funciona, mas um arquivo inválido é **ignorado em silêncio** |
| 6 | `--add-dir` (ficha do cliente e `ESTILO/`) | **OK** |
| 7 | Regras por caminho (`Edit(…/pecas/**)`, deny de outro cliente) | **OK**, com ressalva sobre `ask` × `acceptEdits` |
| 8 | `--permission-prompt-tool` via MCP (cartões) | **OK** |
| 9 | `--mcp-config` + `--strict-mcp-config` | **OK**, e é **obrigatório** (ver achado) |
| 10 | Hook PreToolUse (`guarda-caso.js`) e hook que responde `ask` | **OK** |
| 11 | `--session-id` / `--resume` | **OK** |
| 12 | Transcripts em `~/.claude/projects/…` e descarte | **OK**: existe `claude purge` |
| 13 | CLAUDE.md em camadas e `--append-system-prompt` | **OK** |
| 14 | `--setting-sources` (ignorar `.claude/settings.json` do caso) | **OK** |
| 15 | Modo `plan` | **OK**, com ressalva de privacidade |
| 16 | Skills do mod no `-p` | **NÃO VERIFICADO** (o mod não está instalado no box) |
| 17 | Windows e macOS | **NÃO VERIFICADO** aqui (ver §17) |

---

## 1. Versão e login
- **Comandos:** `claude --version` e `claude auth status`. O segundo devolve JSON por padrão; `--text` dá a versão legível.
- **Resultado:** `2.1.309 (Claude Code)`. O `auth status` devolveu:
  ```
  {"loggedIn": true, "authMethod": "claude.ai", "apiProvider": "firstParty",
   "analyticsDisabled": false, "projectsDirectory": "/home/box/.claude/projects", ...}
  ```
- **Status:** OK.
- **Implicação:** a detecção de login deixa de depender de erro no stream. Basta rodar `claude auth status` e ler `loggedIn`. O campo `projectsDirectory` informa onde ficam os transcripts, e o app deve usá-lo em vez de montar o caminho `~/.claude/projects` na mão. `analyticsDisabled: false` mostra que a telemetria do CLI está ligada nesta máquina; o plano já prevê `DISABLE_TELEMETRY=1` no spawn. **Versão mínima proposta: 2.1.309.**

## 2. `-p` com `--output-format stream-json`
- **Comando:** `claude -p --model haiku --output-format stream-json` (sem `--verbose`).
- **Resultado:** `Error: When using --print, --output-format=stream-json requires --verbose`. Com `--verbose`, o stream sai normal: `system/init` (com `permissionMode`, `cwd`, `mcp_servers`, `tools`, `slash_commands`, `session_id`), depois `assistant`, `user` (tool_result) e `result` (com `permission_denials` e `session_id`).
- **Status:** OK.
- **Implicação:** `--verbose` é obrigatório, como o wrap já faz. O evento `init` serve para conferir o modo efetivo e os MCPs carregados (§9).

## 3. `--input-format stream-json`
- **Comando:** duas mensagens `{"type":"user","message":{"role":"user","content":"…"}}` enviadas por stdin no mesmo processo, com `--input-format stream-json --output-format stream-json --verbose`.
- **Resultado:** os dois turnos foram respondidos ("guardado" e "4242"), cada um com seu `init` e seu `result`, e o contexto foi mantido.
- **Status:** OK.
- **Implicação:** é opcional. O plano pode manter um processo por mensagem com `--resume`, como o wrap faz e é mais simples e robusto. Um processo vivo por conversa fica como otimização futura.

## 4. `--permission-mode`
- **Comandos:** `--permission-mode foo|default|manual|auto|acceptEdits|plan`.
- **Resultado:**
  - `foo` é recusado: `Allowed choices are acceptEdits, auto, bypassPermissions, manual, dontAsk, plan.`
  - **`manual` é aceito** e o `init` reporta `permissionMode: "default"`.
  - **`default` também é aceito** (alias que não aparece na ajuda) e reporta `"default"`.
  - `auto`, `acceptEdits` e `plan` são aceitos e reportados como tal.
- **Status:** OK.
- **Correção ao plano:** o plano (§8.3) dizia que o `manual` do wrap "provavelmente é um bug". **Não é.** Na 2.1.309, `manual` é o nome oficial do modo que pergunta antes de agir, e `default` virou alias escondido. O "PR separado no wrap para corrigir `manual`" deve ser **cancelado**. O Escaninho deve passar `manual` e conferir no `init` que veio `permissionMode: "default"`.

## 5. `--settings <arquivo>` por sessão, fora da pasta do caso
- **Comando:** `--settings /tmp/escaninho-fase0/sessoes/caso1/settings.json`, com `permissions.allow`, `ask` e `deny`, `hooks` e `env`.
- **Resultado:** o arquivo é aplicado. As regras, os hooks e o `env` funcionaram (o `env` do settings chegou ao processo do hook). Teste crítico: com um settings **inválido** (`"defaultMode": 123`), o CLI **ignorou o arquivo inteiro sem avisar**. O deny de `documentos/` sumiu e um Write em `documentos/inv.txt` passou, chegando ao MCP como pedido comum. A ajuda confirma: *"Settings files that fail validation are silently ignored in this mode"*.
- **Status:** PARCIAL. Funciona, mas falha aberta.
- **Mudanças no plano:**
  1. O app valida o `settings.json` gerado antes do spawn (esquema próprio e testes de contrato).
  2. **Sentinela obrigatória:** o settings da sessão inclui um hook `SessionStart` que avisa o app (ex.: POST para 127.0.0.1 com o token da execução). Se o aviso não chegar logo após o `init`, o app **mata o processo** e mostra erro, antes de qualquer ferramenta rodar. Testado: com o settings válido o hook disparou, e com o inválido não disparou.
  3. **Defesa em profundidade no MCP de aprovação:** o handler `aprovar` do app também recusa escrita fora de `pecas/`, `audiencias/`, `DOSSIE.md`, `HANDOFF.md`, `PRAZOS.md` e `autos-md/`, e leitura fora do caso, da ficha e de `ESTILO/`. Assim, mesmo sem o settings, nada passa sem a regra do app. A regra fica isolada e testável.

## 6. `--add-dir`
- **Comando:** o mesmo pedido de leitura da ficha e do `ESTILO/` (fora do cwd), (a) sem `--add-dir` e sem regra allow, (b) com `--add-dir <ficha> <ESTILO>`, (c) sem `--add-dir` e com `allow: Read(//<caminho>/**)`.
- **Resultado:** (a) as duas leituras viraram pedido ao MCP (cartão) e foram negadas; (b) e (c) leram sem pedir.
- **Status:** OK.
- **Implicação:** usar `--add-dir` para a ficha e o `ESTILO/`, como no plano. Como `--add-dir` também libera escrita sujeita às regras, é preciso manter `deny Edit/Write` explícito na ficha e em `ESTILO/amostras/**`.

## 7. Regras de permissão por caminho
- **Sintaxe testada:** caminho absoluto com `//`, por exemplo `Edit(//tmp/.../pecas/**)` e `Read(//tmp/.../beltrano-teste-pf/**)`.
- **Resultado:**
  - `deny Write/Edit(…/documentos/**)` bloqueou com `File is in a directory that is denied by your permission settings`, nos modos `default`, `acceptEdits` e `auto`.
  - `deny Read(…/beltrano-teste-pf/**)` bloqueou a leitura do outro cliente.
  - `ask Write(…/pecas/**)` gerou pedido ao MCP; com allow o arquivo foi criado, com deny não.
  - **Ressalva:** em `acceptEdits`, uma regra `ask` explícita **continua perguntando**. Sem a regra `ask`, o `acceptEdits` gravou em `pecas/` direto. Em `auto` foi igual: com `ask`, perguntou; sem `ask`, gravou sem perguntar.
- **Status:** OK.
- **Mudança no plano (§5.2):** as regras `ask` de `pecas/**` só podem ir para o settings no modo "Perguntar antes de alterar". Em "Aceitar edições nas peças" e em `auto`, o gerador **não** inclui `ask` para essas pastas e mantém todos os `deny`. É o mesmo ponto único de configuração do §18. O deny com caminho absoluto funciona para outro cliente, mas obrigaria a listar todos os irmãos. Por isso o isolamento continua com o hook (§10), e o deny explícito fica só como reforço para os irmãos conhecidos no índice.

## 8. `--permission-prompt-tool` via MCP (cartões)
- **Comando:** `--mcp-config mcp.json` (servidor `esc` → `node perm-mcp-fake.js`) e `--permission-prompt-tool mcp__esc__aprovar`.
- **Resultado:**
  - Cada pedido chega ao MCP como `{tool_name, input}`.
  - A resposta `{"behavior":"allow","updatedInput":…}` libera.
  - A resposta `{"behavior":"deny","message":"Negado pelo advogado (teste)"}` vira erro de ferramenta, com essa mensagem mostrada ao modelo, e aparece em `permission_denials` no `result`.
  - Também passam pelo MCP: leituras fora do cwd sem regra, `ask` vindo de hook (§10) e o `ExitPlanMode` do modo plan (§15).
- **Status:** OK.
- **Implicação:** o mecanismo do wrap (`bin/permission-mcp.js` com long-poll) serve como está, com a ferramenta renomeada para `esc`/`aprovar`. Existe também `--permission-prompts host|none`: com `none`, tudo o que perguntaria é negado automaticamente. Serve para o agente de estilo (§6.2 do plano), que não deve pedir nada.

## 9. `--mcp-config` e `--strict-mcp-config`
- **Resultado:** **sem** `--strict-mcp-config`, a sessão do caso carregou os conectores da conta claude.ai (**Gmail conectado**, Claude Docs e outros) e os MCPs de plugins (Slack, Figma, Notion…, que pediam autenticação). Ao todo, 62 ferramentas. **Com** `--strict-mcp-config`, só o `esc` foi carregado (`mcp=['esc:connected']`).
- **Status:** OK.
- **Mudança no plano (sigilo):** `--strict-mcp-config` passa a ser **obrigatório** em toda sessão de caso. Sem ele, o Claude teria ferramentas de envio (ex.: Gmail) dentro de um caso sigiloso. Um teste unitário garante a flag nos argumentos, e o app confere no `init` que `mcp_servers` contém só os esperados.

## 10. Hooks: PreToolUse (`guarda-caso.js`) e hook que responde `ask`
- **Comando:** hook em `settings.json` → `PreToolUse`, com matcher `Read|Glob|Grep|Edit|Write|MultiEdit|NotebookEdit|LS` e comando `node /tmp/escaninho-fase0/guarda-caso.js`. A raiz e as pastas permitidas vieram pelo `env` do settings.
- **Resultado:**
  - O hook recebeu `session_id`, `transcript_path`, `cwd`, `tool_name` e `tool_input`.
  - A leitura de `../../beltrano-teste-pf/caso-x/documentos/segredo.txt` foi **negada** com o motivo personalizado ("Escaninho: fora do caso aberto (…)").
  - A leitura de `documentos/doc.txt` do próprio caso passou.
  - Um segundo hook respondendo `permissionDecision: "ask"` (para `honorarios/`) **gerou pedido no MCP** (cartão), e a negativa funcionou.
- **Status:** OK.
- **Implicação:** o plano se confirma. O `guarda-caso.js` garante o isolamento entre clientes, e "honorários com confirmação" pode ser um hook `ask` ou uma regra `ask`. Lembrete do §5: os hooks moram no settings, então também somem se ele for inválido, e por isso a sentinela é necessária.

## 11. `--session-id` e `--resume`
- **Comandos:**
  - `--session-id <uuid>` + prompt "guarde JABUTICABA";
  - `--resume <uuid>`, a partir da pasta do caso;
  - `--resume <uuid>` a partir de **outro** cwd;
  - `--session-id <uuid já usado>`.
- **Resultado:**
  - O id escolhido pelo app foi usado.
  - Os dois `--resume` lembraram "JABUTICABA" e mantiveram o `--append-system-prompt` da primeira execução.
  - Reusar o id dá `Error: Session ID … is already in use.`
- **Status:** OK.
- **Implicação:**
  - O app pode **gerar o UUID da conversa** e passá-lo em `--session-id` no primeiro turno, sem esperar o `init`, e depois usar `--resume`.
  - O resume funciona de outro cwd, mas o app deve **sempre** retomar do cwd do caso, porque é o cwd que define CLAUDE.md, regras e transcript.
  - O `--append-system-prompt` fica gravado na sessão (`--system-prompt-snapshot on` é o padrão). Mudanças no estilo só valem numa conversa nova, e a interface precisa dizer isso.

## 12. Onde ficam os transcripts e como apagar
- **Resultado:** `~/.claude/projects/<cwd-codificado>/<session_id>.jsonl`, mais uma pasta `memory/` por projeto (memória automática). A codificação troca `/` e `.` por `-`, por exemplo `-tmp-escaninho-fase0-raiz-trabalhista-fulano-teste-pf-0000001-00-2026-5-12-0001-teste`. O CLI tem **`claude purge [path]`**, com `--dry-run`, `-y` e `-i`, que apaga transcripts, `memory/`, tarefas, histórico de arquivos e a entrada em `.claude.json`. Avisos do próprio purge:
  - `shell-snapshots/` não é por projeto;
  - `~/.claude/backups/` pode guardar a entrada em até 5 cópias antigas do `.claude.json`, que somem com a rotação.
- **Comandos:** `claude purge --dry-run <caso>` listou o item. `claude purge -y <caso>` e `claude purge -y /tmp/escaninho-fase0` limparam os testes (`Purged 1 item(s)`).
- **Status:** OK.
- **Mudança no plano (§7, descarte):** usar `claude purge -y <pasta do caso>` em vez de calcular e apagar `~/.claude/projects/...` na mão. Isso funciona igual nos 3 SOs. Também é preciso apagar os planos do modo plan (§15) e as conversas do app. A retenção de 30 dias continua via `cleanupPeriodDays`. Como o aviso sobre backups e shell-snapshots é residual, ele entra no texto do README.

## 13. CLAUDE.md em camadas e `--append-system-prompt`
- **Comando:** com o cwd no caso, perguntar "quais marcadores PALAVRA-… aparecem no seu CLAUDE.md". Depois, `--append-system-prompt "…termine com ASSINADO-ESCANINHO"`.
- **Resultado:** o Claude citou os três marcadores, da raiz, da área e do caso, nos modos `default`, `manual` e `auto`. O append também foi seguido.
- **Status:** OK.
- **Implicação:** o CLAUDE.md hierárquico funciona no `-p`, como o plano supõe. O teste não verificou o import `@ESTILO/perfil-de-escrita.md` dentro do CLAUDE.md, que fica para o primeiro teste da Fase 2. A alternativa já validada é o `--append-system-prompt`.

## 14. `--setting-sources`
- **Comando:** um `.claude/settings.json` "plantado" na pasta do caso, com hook `SessionStart` que grava "PROJETO-CARREGADO". Rodado sem e com `--setting-sources user`.
- **Resultado:** sem a flag, o settings do projeto foi carregado e o hook rodou. Com `--setting-sources user`, ele foi ignorado. O `--settings` da sessão continuou valendo.
- **Status:** OK.
- **Mudança no plano (segurança):** sessões de caso passam a usar `--setting-sources user`. Assim, um `.claude/settings.json` deixado na pasta do caso por um documento, um colega ou o próprio Claude não consegue afrouxar permissões nem rodar hooks. O `deny` de `.claude/**` continua como reforço.

## 15. Modo `plan`
- **Comando:** `--permission-mode plan` com o pedido "crie pecas/plano.md".
- **Resultado:**
  - O Claude **não** criou o arquivo no caso.
  - Gravou o plano em `~/.claude/plans/<nome>.md`, **fora do caso**.
  - Chamou `ExitPlanMode`, que chegou ao MCP como pedido de permissão e foi negado.
- **Status:** OK.
- **Implicação:**
  - O `ExitPlanMode` vira o cartão "Aprovar plano".
  - **Privacidade:** o plano, que pode conter dados do caso, fica em `~/.claude/plans/`, uma pasta que o `claude purge` **não** limpa. O app deve apagar os planos da sessão no descarte, guiado pelo `tool_use` do Write no stream, ou configurar um diretório de planos próprio se o CLI permitir. Isso fica para verificar na Fase 1.
  - O arquivo de teste foi apagado.

## 16. Skills do mod no `-p`
- **Resultado:** o mod `assistente-juridico-claude` não está instalado neste box: `~/.claude/advogado/` só tem estado e logs, e não há `~/.claude/skills/nova-peca`. O `init` listou as skills da conta claude.ai (`anthropic-skills:*`, inclusive `peticao-fleischfresser` e `checagem-jurisprudencia`) e as embutidas.
- **Status:** NÃO VERIFICADO.
- **Implicação:** verificar na primeira máquina do Guilherme com o mod instalado. O `init.slash_commands` deve conter `nova-peca`, `preparar-autos` etc., inclusive com `--setting-sources user`. As skills da conta claude.ai também entram nas sessões de caso, o que é aceitável, mas a lista de skills ativas aparece em Configurações.

## 17. O que não deu para verificar no Linux (Windows e macOS)
| Item | Risco | Como a Fase 1 cobre |
|---|---|---|
| Sintaxe de caminho nas regras no Windows (`//c/Users/...` ou `C:\…`) | Regra que não casa e deixa passar | Gerador de regras com testes de contrato para caminhos Windows. Como a falha seria aberta, o `guarda-caso.js` e o handler do MCP também validam (com `path.win32`) e são testados no CI em `windows-latest`. |
| Comando do hook no Windows (`node "C:\…\guarda-caso.js"`, espaços e acentos) | Hook não roda, e a sentinela pega | Sentinela `SessionStart` (§5), testes do gerador de comando com caminhos com espaço e acento no CI Windows. |
| Codificação de `~/.claude/projects` no Windows (`C--Users-...`) | Descarte incompleto | Usar `claude purge` (independe da codificação) e `projectsDirectory` do `auth status`. |
| `claude.cmd`/`claude.exe` no PATH, PowerShell 5.1 | CLI não encontrado | `src/which.js` do wrap, já testado no CI dos 3 SOs. |
| Abrir terminal nativo (wt/cmd, osascript, gnome-terminal) | Botão "Abrir no terminal" falha | Teste manual no roteiro de aceite da Fase 1, com o comando para copiar como alternativa. |
| Comportamento real do CLI nos 3 SOs | O CI não tem login no Claude, então só o Claude falso roda lá | Script `scripts/verificar-cli.js`, que repete esta Fase 0 em cerca de 10 chamadas curtas com haiku, roda na máquina do Guilherme (Windows ou Mac) antes do aceite da Fase 1 e gera um relatório como este. No CI, o Claude falso é estendido para reproduzir os formatos observados aqui (init, permission_denials, erro de sessão em uso, erro de `--verbose`). |

## 18. Desenho: ponto único do modo padrão de permissão (não implementado)
Atende o ajuste 1 da revisão. O padrão é "Perguntar antes de alterar", e o Guilherme pode trocar para `auto`.

**Fonte única**
- `src/permissoes/modos.js` exporta a tabela `MODOS`.
- Nenhum outro arquivo conhece nomes de modo do CLI:
```js
// esboço, não implementado
const MODOS = {
  perguntar:       { cli: 'manual',      initEsperado: 'default',     askEmPecas: true,  rotulo: 'Perguntar antes de alterar' },
  aceitarEdicoes:  { cli: 'acceptEdits', initEsperado: 'acceptEdits', askEmPecas: false, rotulo: 'Aceitar edições nas peças' },
  planejar:        { cli: 'plan',        initEsperado: 'plan',        askEmPecas: true,  rotulo: 'Só planejar' },
  automatico:      { cli: 'auto',        initEsperado: 'auto',        askEmPecas: false, rotulo: 'Automático (avançado)', aviso: true },
};
const MODO_PADRAO_DE_FABRICA = 'perguntar';
```
- **Não existe chave para bypass.** `montarArgs()` lança erro diante de qualquer valor fora da tabela, e um teste garante que `--dangerously-skip-permissions`, `bypassPermissions` e `--allow-dangerously-skip-permissions` nunca aparecem.

**Escolha do usuário**
- `~/.escaninho/config.json` → `"modoPadrao": "perguntar" | "aceitarEdicoes" | "planejar" | "automatico"`, editável em Configurações → Claude Code.
- `caso.json` → `claude.modo` pode sobrescrever o modo por caso.
- Ordem de resolução: caso → config → `MODO_PADRAO_DE_FABRICA`.
- Se o Guilherme escolher `auto` (pergunta B), basta trocar o `config.json` pela interface, sem refatorar. Mudar o padrão de fábrica do produto é uma linha.

**Quem consome a tabela**
1. `montarArgs()` → `--permission-mode <cli>`.
2. O gerador do `settings.json`: inclui `ask` para `pecas/**` e similares só quando `askEmPecas` é verdadeiro (achado do §7). Os `deny` são sempre iguais em todos os modos.
3. O runner: compara o `init.permissionMode` com `initEsperado` e aborta se divergir.
4. A interface: rótulos, aviso amarelo no modo automático e o chip de modo no cabeçalho da conversa.

---

## Mudanças no plano v1 decorrentes da Fase 0
1. **Modo "perguntar":** usar `--permission-mode manual` (nome oficial na 2.1.309; `default` é alias). **Cancelar** o "PR de correção do `manual`" no wrap, porque o wrap estava certo.
2. **`--strict-mcp-config` obrigatório** em sessões de caso, com conferência de `mcp_servers` no `init`. Sem ele, entram Gmail e outros conectores da conta.
3. **`--setting-sources user`** nas sessões de caso, para ignorar `.claude/settings*.json` dentro das pastas.
4. **Settings inválido falha aberto:** validação antes do spawn, sentinela `SessionStart` (o app aborta sem ela) e o handler do MCP `aprovar` aplicando a mesma política de caminhos.
5. **`ask` só no modo "perguntar":** em `acceptEdits` e `auto`, o gerador não inclui `ask` para `pecas/**`, senão continua perguntando.
6. **Descarte:** usar `claude purge -y <caso>`. Apagar também os planos em `~/.claude/plans/` gerados naquele caso e as conversas do app. Mencionar no README os resíduos em `backups/` e `shell-snapshots/`.
7. **Login e transcripts:** `claude auth status` (`loggedIn`, `projectsDirectory`) substitui a detecção por erro.
8. **Conversas:** o app gera o UUID (`--session-id`) e retoma com `--resume` sempre do cwd do caso. O system prompt anexado fica fixo na sessão, então mudanças de estilo valem em conversa nova.
9. **Agente de estilo (Fase 2):** usar também `--permission-prompts none` e `--no-session-persistence`, que dispensa transcript, porque o diretório temporário é apagado.
10. **Versão mínima do CLI: 2.1.309**, conferida na inicialização. O `scripts/verificar-cli.js` repete esta Fase 0 na primeira máquina Windows ou Mac.

## Pendências (não verificadas aqui)
- Skills do mod no `-p` com `--setting-sources user` (precisa do mod instalado).
- Import `@ESTILO/perfil-de-escrita.md` no CLAUDE.md da raiz.
- Diretório configurável para `~/.claude/plans`.
- Windows e macOS (§17).

---

## Adendo de 26/10/2026, 12h18–12h20: testes complementares para o plano v2
Mesmo ambiente fictício, haiku, sem bypass, com `--setting-sources user` e **sem** `--strict-mcp-config`.

**A. MCP sempre por cartão**
Pedido: chamar uma vez `mcp__claude_ai_Claude_Docs__guide` (só leitura), com resposta de cartão = negar.

| Settings | `auto` | `manual` |
|---|---|---|
| sem regra para MCP | **executou sem cartão** | cartão |
| `ask: ["mcp__*"]` | cartão | cartão |
| `ask: ["mcp__claude_ai_Claude_Docs"]` | cartão | cartão |
| hook PreToolUse com matcher `mcp__.*` → `ask` | cartão | cartão |

**Status:** OK. A regra `mcp__*` funciona como curinga, e o MCP de aprovação (`--permission-prompt-tool`) continuou funcionando com ela.

**Ainda falta verificar** (fica no `verificar-cli.js` da Fase 1): plugins com MCP próprio, os modos `acceptEdits` e `plan`, Windows e macOS.

**B. Outro caso: cartão ou inclusão explícita** (`guarda-caso-v2.js`, que lê uma lista `allowlist.json` a cada chamada)
- **Sem lista:** a leitura de um caso de outro cliente, de um terceiro cliente e de honorários gerou **3 cartões**.
- **Com o caso de Beltrano na lista** e `ask Read(//<raiz>/*/*/*/honorarios/**)`:
  - `documentos/segredo.txt` de Beltrano foi lido **sem cartão** (o hook respondeu `allow`);
  - o terceiro cliente gerou cartão;
  - os honorários de Beltrano geraram **cartão**: a regra `ask` venceu o `allow` do hook.
- **Status:** OK.
- **Observação:** o pedido que chega ao MCP traz `tool_name` e `input`, **sem** o motivo do hook. O texto do cartão precisa ser montado pelo app a partir do índice.

Os transcripts de teste foram apagados com `claude purge -y`.
