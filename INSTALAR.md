# INSTALAR — instalação e configuração no PILOTO AUTOMÁTICO do Advogado Claude

> **Para o Claude (agente) que está lendo isto:** o usuário, um(a) advogado(a) sem conhecimento técnico, pediu que você siga este roteiro **no piloto automático**.
> Ele instala o assistente jurídico "Advogado Claude" (repositório `guifleischfresser/assistente-juridico-claude` no GitHub) **neste computador** e o configura sozinho, com o mínimo de perguntas.
> **A frase colada pelo usuário já autoriza**: baixar e executar o instalador verificado (SHA256) deste repositório, instalar o Node.js LTS pelo canal oficial se faltar, e configurar o Claude Code dele. Não peça licença para começar.
> **Este arquivo contém comandos exatos.** Se você o leu por uma ferramenta que resume páginas (WebFetch), baixe o texto integral com o bloco `baixar-roteiro` do seu sistema (ele imprime o arquivo inteiro na tela) e siga o texto integral.

```powershell
# bloco: ps-baixar-roteiro
$d = Join-Path ([IO.Path]::GetTempPath()) "advogado-claude"; New-Item -ItemType Directory -Force -Path $d | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main/INSTALAR.md" -OutFile (Join-Path $d "INSTALAR.md")
Get-Content -LiteralPath (Join-Path $d "INSTALAR.md") -Raw -Encoding UTF8
```

```bash
# bloco: sh-baixar-roteiro
d="${TMPDIR:-/tmp}/advogado-claude"; mkdir -p "$d"
curl -fsSL -o "$d/INSTALAR.md" "https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main/INSTALAR.md" && cat "$d/INSTALAR.md"
```

---

## Regras que você deve seguir o tempo todo

1. **Piloto automático: não faça perguntas opcionais.** Use os padrões deste roteiro. Só existem DUAS perguntas possíveis, e cada uma só se necessária:
   - o nome do usuário, **se** não der para descobrir sozinho (Etapa 2);
   - a **pergunta única** final sobre pastas ambíguas, **se** houver alguma (Etapa 4). Um simples "ok" aceita tudo.
2. **Fale só em português do Brasil, simples, sem jargão.** Antes de cada etapa, uma frase curta dizendo o que está fazendo ("Agora vou baixar o assistente do site oficial e conferir se o arquivo é autêntico."). Não espere resposta para seguir.
3. **Janelas de permissão (modo auto).** O ideal é o Claude Code estar no **modo auto** (barra de status mostra "⏵⏵ auto mode on" no terminal; no aplicativo, o seletor de modo mostra **Auto**). Nele, um classificador aprova sozinho os comandos seguros e quase não aparecem janelas.
   - Se aparecer uma janela de permissão, diga **uma vez**: "Para eu não ficar te interrompendo, escolha **'Yes, and switch to auto mode'** (ou aperte **Shift+Tab** até aparecer *auto mode on*; no aplicativo, escolha **Auto** no seletor de modo). Se essa opção não existir, clique em **Sim** — o instalador grava regras para não perguntar de novo."
   - **Nunca** sugira `--dangerously-skip-permissions` nem o modo `bypassPermissions`.
   - Se o modo auto recusar uma ação deste roteiro ("Recently denied"/bloqueio do classificador), explique em uma frase o que o comando faz e lembre que o usuário autorizou na frase inicial; o usuário pode aprovar pela janela. Não reescreva o comando para "passar" pelo bloqueio.
4. **Sigilo (inegociável).**
   - Nenhum documento, nome de cliente ou conteúdo de arquivo do usuário sai deste computador.
   - Os únicos acessos à internet deste roteiro são: o download do pacote em `github.com/guifleischfresser/assistente-juridico-claude` (com verificação SHA256) e o instalador oficial do Node.js (winget, Homebrew ou nodejs.org).
   - A varredura de pastas é local e lê **só nomes**. No chat, mostre **só pasta-mãe e contagens**; nunca nomes de subpastas ou arquivos (costumam ser nomes de clientes), nem procure por eles com outras ferramentas.
5. **Nunca apague, mova ou renomeie arquivos do usuário.** Pastas existentes são **apontadas**, nunca copiadas. A única cópia é a de até 10 peças para `ESCRITORIO/ESTILO/amostras` (cópia local, os originais não são tocados).
6. **Se o checksum não bater, PARE.** Explique: "O arquivo baixado não confere com a assinatura publicada; por segurança não vou instalar." Não tente outra fonte.
7. **Política da empresa bloqueou scripts** ("a execução de scripts foi desabilitada", Group Policy/AppLocker): **PARE**. Não contorne. Explique e sugira falar com o suporte de TI.
8. **Retomável e idempotente.** Se a conversa cair, a mesma frase recomeça da Etapa 0 e pula o que já foi feito. Rodar de novo não duplica nada.
9. **Use o shell que você tiver.** Windows: blocos `ps-*` na ferramenta PowerShell (se só houver Git Bash: `gitbash-*`/`sh-*`). Mac/Linux: `sh-*`. Cada bloco é independente: copie-o inteiro e troque só os valores em MAIÚSCULAS.
10. **Leia arquivos temporários pelo shell** (`Get-Content -Raw -Encoding UTF8 "<arquivo>"` ou `cat "<arquivo>"`), não pela ferramenta de leitura: assim não surgem janelas de "pasta fora do projeto".
11. **Sem `node` no PATH** (logo depois de instalar o Node): use o caminho completo (`& "$env:ProgramFiles\nodejs\node.exe"` no Windows, `/usr/local/bin/node` ou `/opt/homebrew/bin/node` no Mac).
12. **Atalhos.** `PE` = `node "$HOME/.claude/advogado/scripts/primeira-execucao.js"` e `DOUTOR` = `node "$HOME/.claude/advogado/scripts/doutor.js"`. Escreva exatamente assim (com `$HOME` e aspas): funciona no PowerShell e no Bash e casa com as regras de permissão que o instalador grava.

---

## Etapa 0 — Já existe instalação ou etapa em andamento?

Rode `PE estado`.
- **`MODO PLUGIN`** (o assistente veio pelo `/plugin install`): não baixe nada. Rode `PE instalar-plugin` e vá para a Etapa 2.
- **Comando não encontrado:** instalação nova. Vá para a Etapa 1.
- **Funcionou:** veja `PRÓXIMA ETAPA` e vá direto para ela, avisando "Vou continuar de onde paramos." (`instalacao`/`verificacao` = Etapa 1–3; `entrevista`/`registro`/`dossies` = Etapa 4; `estilo` = Etapa 5; `resumo` = Etapa 6). Se aparecer `TUDO CONCLUÍDO`, rode `DOUTOR` e mostre o resumo "como usar" da Etapa 6.

## Etapa 1 — Ambiente, Node.js, download verificado e instalação

Diga em 2–3 linhas: "Vou instalar seu assistente jurídico no piloto automático: baixo do site oficial, confiro a assinatura, instalo, testo e encontro sozinho suas pastas de peças, modelos e casos (só aponto para elas). Nada dos seus documentos sai do computador. Leva uns 3 minutos." **Não espere resposta.**

**1a. Ambiente.** Rode `ps-ambiente` (Windows) ou `sh-ambiente` (Mac/Linux/Git Bash).

```powershell
# bloco: ps-ambiente
"SO=" + [Environment]::OSVersion.VersionString
"POWERSHELL=" + $PSVersionTable.PSVersion.ToString()
"REMOTO=" + $env:CLAUDE_CODE_REMOTE
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node -and $env:ProgramFiles -and (Test-Path (Join-Path $env:ProgramFiles "nodejs\node.exe"))) { $node = Join-Path $env:ProgramFiles "nodejs\node.exe" }
"NODE=" + $(if ($node) { "$node " + (& $node -v) } else { "ausente" })
"GIT=" + $(if (Get-Command git -ErrorAction SilentlyContinue) { git --version } else { "ausente (opcional)" })
"WINGET=" + [bool](Get-Command winget -ErrorAction SilentlyContinue)
$v = Join-Path $HOME ".claude/advogado/versao.json"
"INSTALADO=" + $(if (Test-Path $v) { (Get-Content $v -Raw) -replace "\s+", " " } else { "nao" })
```

```bash
# bloco: sh-ambiente
echo "SO=$(uname -s) $(uname -r)"
echo "REMOTO=${CLAUDE_CODE_REMOTE:-}"
NODE_BIN="$(command -v node || true)"
for p in /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.local/node/bin/node"; do if [ -z "$NODE_BIN" ] && [ -x "$p" ]; then NODE_BIN="$p"; fi; done
if [ -n "$NODE_BIN" ]; then echo "NODE=$NODE_BIN $("$NODE_BIN" -v)"; else echo "NODE=ausente"; fi
echo "GIT=$(git --version 2>/dev/null || echo 'ausente (opcional)')"
echo "BREW=$(command -v brew || echo ausente)"
echo "INSTALADO=$(tr -s '[:space:]' ' ' < "$HOME/.claude/advogado/versao.json" 2>/dev/null || echo nao)"
```

- **Se `REMOTO=true`, PARE**: "Esta conversa está rodando num servidor da Anthropic, não no seu computador. Abra o Claude Code no seu computador (no aplicativo Claude, aba Code, ambiente **Local**) e cole a mesma frase de novo."
- **Pasta do escritório:** sempre o padrão `ESCRITORIO` na pasta do usuário (não pergunte).

**1b. Node.js (obrigatório, 18+), instalado sozinho se faltar.** Se `NODE=ausente` ou versão < 18, diga "Vou instalar o Node.js, um componente gratuito e oficial que faz as proteções funcionarem." e:
- **Windows com `WINGET=True`:** rode o bloco `ps-node`. Se o Windows abrir uma janela de permissão (UAC), diga ao usuário para clicar em **Sim**.
- **Mac com Homebrew (`BREW=` com caminho):** `brew install node`.
- **Mac sem Homebrew:** rode `sh-node-mac` (baixa o instalador oficial e confere o checksum); peça ao usuário para seguir a janela que abrir e avisar quando terminar.
- **Windows sem winget / Linux sem Node:** peça para instalar a versão **LTS** de https://nodejs.org/pt/download e avisar quando terminar (é a única situação em que você espera o usuário nesta etapa).

```powershell
# bloco: ps-node
winget install -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
$n = Join-Path $env:ProgramFiles "nodejs\node.exe"
"NODE=" + $(if (Test-Path $n) { "$n " + (& $n -v) } else { "falhou (codigo $LASTEXITCODE)" })
```

```bash
# bloco: sh-node-mac
set -e
d="${TMPDIR:-/tmp}/advogado-claude"; mkdir -p "$d"; cd "$d"
curl -fsSLO https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt
pkg="$(grep -o 'node-v[0-9.]*\.pkg' SHASUMS256.txt | head -1)"
curl -fsSLO "https://nodejs.org/dist/latest-v24.x/$pkg"
grep " $pkg\$" SHASUMS256.txt | shasum -a 256 -c -
open "$pkg"
```

Git é opcional. Não instale.

**1c. Baixar o pacote e conferir o SHA256.** O bloco lê `release/estavel.json` (versão fixada e hash esperado, versionados no repositório), baixa o pacote **pela tag exata** e só aceita se o SHA256 bater **com o hash fixado e com o `.sha256` publicado na release**.

```powershell
# bloco: ps-baixar
$ErrorActionPreference = "Stop"
$raw = "https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main"
$rel = "https://github.com/guifleischfresser/assistente-juridico-claude/releases/download"
$d = Join-Path ([IO.Path]::GetTempPath()) "advogado-claude"
New-Item -ItemType Directory -Force -Path $d | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$ProgressPreference = "SilentlyContinue"
$fj = Join-Path $d "estavel.json"
Invoke-WebRequest -UseBasicParsing -Uri "$raw/release/estavel.json" -OutFile $fj
$fx = Get-Content -LiteralPath $fj -Raw | ConvertFrom-Json
if ("$($fx.tag)" -notmatch '^v\d+\.\d+\.\d+$' -or "$($fx.sha256)" -notmatch '^[0-9a-f]{64}$' -or "$($fx.arquivo)" -notmatch '^[A-Za-z0-9._-]+\.zip$') { throw "estavel.json invalido. Download cancelado." }
$zip = Join-Path $d "advogado-claude-mod.zip"
Invoke-WebRequest -UseBasicParsing -Uri "$rel/$($fx.tag)/$($fx.arquivo)" -OutFile $zip
Invoke-WebRequest -UseBasicParsing -Uri "$rel/$($fx.tag)/$($fx.arquivo).sha256" -OutFile "$zip.sha256"
$publicado = ((Get-Content "$zip.sha256" -Raw).Trim() -split "\s+")[0].ToLower()
$fs = [IO.File]::OpenRead($zip); try { $obtido = -join ([Security.Cryptography.SHA256]::Create().ComputeHash($fs) | ForEach-Object { $_.ToString("x2") }) } finally { $fs.Dispose() }
if ($obtido -ne "$($fx.sha256)".ToLower() -or $obtido -ne $publicado) { Remove-Item -LiteralPath $zip -Force; throw "CHECKSUM DIFERENTE: fixado $($fx.sha256), publicado $publicado, obtido $obtido. Download descartado." }
"CHECKSUM OK $obtido ($($fx.tag))"
$pac = Join-Path $d "pacote"
if (Test-Path -LiteralPath $pac) { Remove-Item -LiteralPath $pac -Recurse -Force }
Expand-Archive -LiteralPath $zip -DestinationPath $pac -Force
try { Get-ChildItem -LiteralPath $pac -Recurse -File | Unblock-File -ErrorAction SilentlyContinue } catch { }
"PACOTE=" + (Join-Path $pac "advogado-claude-mod")
```

```bash
# bloco: sh-baixar
set -e
RAW="https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main"
REL="https://github.com/guifleischfresser/assistente-juridico-claude/releases/download"
d="${TMPDIR:-/tmp}/advogado-claude"; mkdir -p "$d"; cd "$d"
curl -fsSL -o estavel.json "$RAW/release/estavel.json"
campo() { tr -d '\r\n' < estavel.json | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"; }
TAG="$(campo tag)"; ARQ="$(campo arquivo)"; FIXADO="$(campo sha256 | tr 'A-F' 'a-f')"
if ! printf '%s' "$TAG" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' || ! printf '%s' "$FIXADO" | grep -Eq '^[0-9a-f]{64}$' || ! printf '%s' "$ARQ" | grep -Eq '^[A-Za-z0-9._-]+\.zip$'; then echo "estavel.json invalido. Download cancelado."; exit 1; fi
curl -fsSL -o advogado-claude-mod.zip "$REL/$TAG/$ARQ"
curl -fsSL -o advogado-claude-mod.zip.sha256 "$REL/$TAG/$ARQ.sha256"
publicado="$(awk '{print tolower($1)}' advogado-claude-mod.zip.sha256)"
if command -v shasum >/dev/null 2>&1; then obtido="$(shasum -a 256 advogado-claude-mod.zip | awk '{print tolower($1)}')"; else obtido="$(sha256sum advogado-claude-mod.zip | awk '{print tolower($1)}')"; fi
if [ "$obtido" != "$FIXADO" ] || [ "$obtido" != "$publicado" ]; then rm -f advogado-claude-mod.zip; echo "CHECKSUM DIFERENTE: fixado $FIXADO, publicado $publicado, obtido $obtido. Download descartado."; exit 1; fi
echo "CHECKSUM OK $obtido ($TAG)"
rm -rf pacote; mkdir pacote
if command -v unzip >/dev/null 2>&1; then unzip -q advogado-claude-mod.zip -d pacote
elif command -v ditto >/dev/null 2>&1; then ditto -x -k advogado-claude-mod.zip pacote
elif [ -x /c/Windows/System32/tar.exe ]; then /c/Windows/System32/tar.exe -xf advogado-claude-mod.zip -C pacote
else tar -xf advogado-claude-mod.zip -C pacote; fi
echo "PACOTE=$d/pacote/advogado-claude-mod"
```

Se o download falhar (sem internet, proxy ou antivírus), explique em linguagem simples e tente mais uma vez. Alternativa: o usuário baixa o `.zip` e o `.sha256` da versão indicada em `release/estavel.json` pela página de Releases e diz em que pasta salvou; faça as mesmas conferências de SHA256 sobre os arquivos locais.

> **Modo de teste (desenvolvedor):** se o usuário indicar explicitamente outra fonte (URL `http://localhost...` ou pasta local), troque apenas `$raw`/`$rel` (ou `RAW`/`REL`). As conferências de SHA256 continuam obrigatórias.

**1d. Instalar (silencioso, com atalho no Windows).** Diga: "Arquivo conferido. Instalando; nada dos seus documentos é alterado."

```powershell
# bloco: ps-instalar
$ps1 = Join-Path (Join-Path (Join-Path ([IO.Path]::GetTempPath()) "advogado-claude") (Join-Path "pacote" "advogado-claude-mod")) "instalar.ps1"
$psexe = (Get-Process -Id $PID).Path
& $psexe -NoProfile -ExecutionPolicy Bypass -File $ps1 -Silencioso -Atalho
"CODIGO=$LASTEXITCODE"
```

```bash
# bloco: sh-instalar
set -e
d="${TMPDIR:-/tmp}/advogado-claude"
bash "$d/pacote/advogado-claude-mod/instalar.sh" --silencioso
```

```bash
# bloco: gitbash-instalar   (Windows só com Bash/Git Bash; baixe antes com sh-baixar)
d="${TMPDIR:-/tmp}/advogado-claude"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$d/pacote/advogado-claude-mod/instalar.ps1")" -Silencioso -Atalho
```

- `-ExecutionPolicy Bypass` vale **só para este processo**; a política do Windows não é alterada. Bloqueio pela empresa: Regra 7 (pare).
- `CODIGO` diferente de 0: explique o erro em linguagem simples e rode `DOUTOR --consertar`.
- O instalador configura o Claude Code do usuário para as próximas conversas: **modo auto**, modelo **Opus 5.5** (`claude-opus-5-5`) com **esforço médio**, **memória automática** ligada e regras de permissão estreitas só para os scripts do assistente (guarda os valores anteriores para a desinstalação restaurar). As guardas de sigilo continuam valendo em qualquer modo.

Depois, rode `PE marcar instalacao`.

## Etapa 2 — Verificar e descobrir o nome (sem perguntar, se possível)

1. Rode `DOUTOR`. `RESULTADO: TUDO CERTO` → rode `PE marcar verificacao`. Problemas → `DOUTOR --consertar` uma vez e `DOUTOR` de novo; se persistir, explique o item ❌ em linguagem simples e pare (a mesma frase retoma depois).
2. Rode `PE nome-sugerido`.
   - `NOME=` preenchido: rode `PE definir-nome "<NOME>"` e guarde para o resumo final ("Vou te chamar de <NOME>; para mudar, é só dizer *me chame de ...*"). **Não pergunte.**
   - `NOME=` vazio: faça a **única** pergunta desta etapa: "Como você prefere ser chamado(a)? (ex.: Dra. Ana)". Com a resposta, `PE definir-nome "<resposta>"`. Enquanto espera, não há nada a fazer; depois siga direto.

Até o Claude Code recarregar as skills, quando este roteiro mandar seguir uma skill, leia `~/.claude/skills/<nome>/SKILL.md` pelo shell (Regra 10) e siga-o.

## Etapa 3 — (automática) Nada a perguntar

A antiga entrevista de 10 perguntas não existe mais: as preferências são aprendidas com o uso (skill `reflexao`). Siga para a Etapa 4.

## Etapa 4 — Descoberta autônoma das pastas

1. Diga: "Agora vou procurar sozinho, só pelos nomes, onde ficam suas peças, modelos e casos." Rode `PE autopiloto`.
   - Varre localmente Documentos, Área de Trabalho, Downloads, OneDrive, Google Drive e Dropbox (só nomes), dá uma nota a cada pasta e **registra sozinho** as de alta confiança (apontamento, sem copiar): peças já escritas, modelos, casos ativos e controles de prazo.
   - Cria sozinho um **dossiê** por pasta de caso encontrada e copia até 10 peças para `ESTILO/amostras` (cópia local).
   - Repita ao usuário só o resumo impresso (tipos, pasta-mãe e quantidades).
2. Se a saída tiver **PERGUNTA ÚNICA**, mostre-a **exatamente como impressa, numa única mensagem** e espere. Depois:
   - "ok" (ou "pode", "sim", "tudo certo") → `PE resolver ok`
   - mudanças ("G3 não", "o G2 sim") → `PE resolver G3=nao G2=sim` (grupos não citados ficam com a sugestão).
   - Se a saída disser "Nenhuma dúvida", não pergunte nada.
3. Se o script falhar, **não** faça varredura por conta própria: siga sem pastas registradas e diga que dá para apontar pastas depois ("minhas petições ficam em ...").
4. Rode `PE marcar registro` e `PE marcar dossies` (se já marcados, nada muda).

## Etapa 5 — Aprender o estilo (automático)

Se houver arquivos em `ESCRITORIO/ESTILO/amostras`, diga "Vou ler algumas peças suas para aprender seu jeito de escrever." e siga a skill `aprender-meu-estilo`; ao terminar, `PE marcar estilo`. Sem amostras: `PE marcar estilo "sem amostras"` (o estilo será aprendido com as edições do usuário nas peças).

## Etapa 6 — Resumo "como usar" e primeiro HANDOFF

1. Rode `PE concluir` (grava o primeiro HANDOFF e marca a configuração como concluída).
2. Mostre o resumo em até 10 linhas, incluindo: o nome usado (e que pode mudar), o que foi registrado (tipos e pasta-mãe), e:
   > "Pronto! Daqui para frente é só conversar comigo. Eu aprendo sozinho com o seu jeito de trabalhar: crio habilidades para tarefas repetidas e guardo suas preferências (tudo no seu computador; dados de clientes só ficam na pasta de cada caso). Feche e abra o Claude Code para ativar os atalhos, o modo auto e a barra de status. Na próxima vez, abra o Claude Code na pasta ESCRITORIO."
3. No Windows, lembre que o atalho **Escritorio Claude** na Área de Trabalho abre o assistente na pasta certa.
4. Se esta conversa não estava no modo auto, diga: "Na próxima conversa o modo auto já vem ligado. Se o seu plano ou a sua empresa não permitirem o modo auto, tudo funciona igual; só aparecem algumas janelas de permissão a mais."

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Muitas janelas de permissão | Shift+Tab até "auto mode on" (ou seletor **Auto** no aplicativo). Se o modo auto não aparecer, o plano/modelo/empresa não o libera; clique em **Sim** (as regras do instalador reduzem as próximas). |
| `node` não encontrado logo após instalar | Use o caminho completo (Regra 11). Depois de reabrir o Claude Code, `node` passa a funcionar. |
| "execução de scripts desabilitada" | Política da empresa: não contorne. Oriente procurar o TI. |
| CHECKSUM DIFERENTE | Pare. Não instale. Peça para tentar mais tarde. |
| Antivírus bloqueou | Os arquivos são scripts de texto abertos; sugira liberar a pasta temporária ou instalar manualmente pelo README. |
| Conversa caiu no meio | Cole a mesma frase de novo: a Etapa 0 retoma de onde parou. |
| Algo parou de funcionar depois | Digite `/consertar`. |
