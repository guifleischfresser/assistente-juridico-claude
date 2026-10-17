<!-- GERADO de INSTALAR.md por ferramentas/sincronizar-bootstrap.js. Não edite aqui. -->

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
