---
name: primeira-execucao
description: "Instalação e configuração inicial autônoma do assistente jurídico: verifica o computador, baixa o pacote do GitHub com SHA256, instala em modo silencioso, roda o doutor e conduz a entrevista (uma pergunta por vez) para registrar onde ficam petições, modelos, casos, amostras de estilo e prazos, por apontamento. Retomável e idempotente. Use na primeira vez, quando o SessionStart indicar ONBOARDING PENDENTE ou PRIMEIRA EXECUÇÃO INCOMPLETA, quando o usuário quiser refazer a configuração ou digitar /primeira-execucao."
argument-hint: "[retomar | refazer]"
---

<!-- GERADO de INSTALAR.md por ferramentas/sincronizar-bootstrap.js. Não edite aqui. -->
> Se o assistente já está instalado, comece pela **Etapa 0** (ela pula o que já foi feito). Com o argumento `refazer`, rode antes `PE reiniciar`.
# INSTALAR — roteiro de instalação e configuração automática do Advogado Claude

> **Para o Claude (agente) que está lendo isto:** o usuário, um(a) advogado(a) sem conhecimento técnico, pediu que você siga este roteiro.
> Ele instala o assistente jurídico "Advogado Claude" (repositório `guifleischfresser/assistente-juridico-claude` no GitHub) **neste computador** e depois faz a configuração inicial conversando com o usuário.
> **Este arquivo contém comandos exatos.** Se você o leu por uma ferramenta que resume páginas (WebFetch), baixe o texto integral e leia-o com a ferramenta de leitura antes de continuar. Use o bloco `baixar-roteiro` do seu sistema (Windows ou Mac/Linux), logo abaixo.

```powershell
# bloco: ps-baixar-roteiro
$d = Join-Path ([IO.Path]::GetTempPath()) "advogado-claude"; New-Item -ItemType Directory -Force -Path $d | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main/INSTALAR.md" -OutFile (Join-Path $d "INSTALAR.md")
"ROTEIRO=" + (Join-Path $d "INSTALAR.md")
```

```bash
# bloco: sh-baixar-roteiro
d="${TMPDIR:-/tmp}/advogado-claude"; mkdir -p "$d"
curl -fsSL -o "$d/INSTALAR.md" "https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main/INSTALAR.md" && echo "ROTEIRO=$d/INSTALAR.md"
```

---

## Regras que você deve seguir o tempo todo

1. **Fale só em português do Brasil, simples, sem jargão técnico.** Explique cada passo em uma frase antes de executar, por exemplo: "Agora vou baixar o assistente do site oficial e conferir se o arquivo chegou íntegro."
2. **Faça uma pergunta por vez.** Espere a resposta antes de seguir. Quando houver opções, numere-as (ou use a ferramenta de perguntas, se existir).
3. **Avise sobre as janelas de permissão.** O Claude Code vai pedir autorização para cada comando. Diga uma vez: "Vou pedir sua autorização para alguns comandos; pode clicar em **Sim**. Eu explico cada um antes."
4. **Sigilo (inegociável).**
   - Nenhum documento, nome de cliente ou conteúdo de arquivo do usuário sai deste computador.
   - Os únicos acessos à internet permitidos neste roteiro são:
     - o download do pacote em `github.com/guifleischfresser/assistente-juridico-claude` (com verificação SHA256);
     - o instalador oficial do Node.js (winget, Homebrew ou nodejs.org), e só se o usuário concordar.
   - Ler as pastas do usuário é uma operação local. Mesmo assim, só leia **nomes** de arquivos durante a entrevista e só abra conteúdo com autorização.
5. **Nunca apague, mova ou renomeie arquivos do usuário.** As pastas existentes são apenas **apontadas**, nunca copiadas. A única cópia permitida é a das amostras de estilo, e só com autorização.
6. **Se o checksum não bater, PARE.** Apague o download e explique: "O arquivo baixado não confere com a assinatura publicada; por segurança não vou instalar." Não tente outra fonte.
7. **Retomável.** Se a conversa for interrompida, este roteiro recomeça da Etapa 0 e pula o que já foi feito. Rodar de novo não duplica nada.
8. **Use o shell que você tiver.**
   - No Windows, use os blocos `ps-*` na ferramenta PowerShell.
   - Se só houver Bash (Git Bash), use os blocos `gitbash-*`/`sh-*` indicados.
   - No Mac/Linux, use os blocos `sh-*`.
   - Cada bloco é independente: copie-o inteiro e troque apenas os valores em MAIÚSCULAS indicados.
9. **Sem `node` no PATH** (por exemplo, logo depois de instalar o Node): use o caminho completo encontrado na Etapa 1, como `& "C:\Program Files\nodejs\node.exe" ...` no Windows ou `/usr/local/bin/node ...` no Mac.
10. **Atalho de comando.** Abaixo, `PE` significa `node "$HOME/.claude/advogado/scripts/primeira-execucao.js"` e `DOUTOR` significa `node "$HOME/.claude/advogado/scripts/doutor.js"`. A forma `$HOME` funciona no PowerShell e no Bash.

---

## Etapa 0 — Já existe instalação ou etapa em andamento?

Rode `PE estado`.
- **Comando não encontrado:** é uma instalação nova. Vá para a Etapa 1.
- **Funcionou:** veja a linha `PRÓXIMA ETAPA`.
  - Se `instalacao` e `verificacao` já estão ✅, cumprimente o usuário ("Que bom te ver de novo! Vou continuar de onde paramos.") e vá direto para a etapa indicada (3 = entrevista, 4 = registro, 5 = estilo/dossiês, 6 = resumo).
  - Se aparecer `TUDO CONCLUÍDO`, diga que já está tudo pronto, ofereça rodar `DOUTOR` (verificação) e mostre o resumo "como usar" da Etapa 6.

## Etapa 1 — Conhecer o computador e explicar o plano

1. Descubra o sistema e os pré-requisitos com o bloco `ps-ambiente` (Windows) ou `sh-ambiente` (Mac/Linux/Git Bash).

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

2. **Se `REMOTO=true`, PARE.** A sessão está rodando num computador na nuvem, não no do usuário. Explique: "Esta conversa está rodando num servidor da Anthropic, não no seu computador. Para instalar, abra o Claude Code no seu computador. No aplicativo Claude Desktop, na aba Code, escolha o ambiente **Local**. Depois cole a mesma frase de novo."
3. **Explique o plano** em até 6 linhas, com estas ideias:
   > "Vou instalar seu assistente jurídico neste computador. São três partes:
   > (1) baixar o assistente do site oficial e conferir se o arquivo é autêntico;
   > (2) instalar e testar, o que leva cerca de 2 minutos;
   > (3) uma conversa rápida para eu descobrir onde ficam suas petições, modelos e casos. Eu só aponto para essas pastas; não movo nem copio nada.
   > Nada dos seus documentos sai do computador. Posso começar?"
4. Espere o "sim". Depois pergunte, **em outra mensagem**: "Como você prefere ser chamado(a)? (ex.: Dra. Ana, Dr. Paulo)". Guarde a resposta como NOME_DO_USUARIO.
5. **Pasta do escritório.** O padrão é `ESCRITORIO` dentro da pasta do usuário: `%USERPROFILE%\ESCRITORIO` no Windows, `~/ESCRITORIO` no Mac. Não pergunte, a menos que o usuário peça outra; nesse caso, use a opção `-Escritorio`/`--escritorio`. Desaconselhe pastas do OneDrive, Google Drive ou Dropbox por sigilo.

## Etapa 2 — Pré-requisitos, download verificado e instalação

**2a. Node.js (obrigatório, versão 18 ou superior).** Se `NODE=ausente` ou se a versão for menor que 18, explique: "Preciso instalar o Node.js, um componente gratuito e oficial que faz as proteções automáticas funcionarem. Posso instalar?". Com o "sim":
- **Windows com `WINGET=True`:** rode `winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements`. Pode aparecer uma janela do Windows pedindo permissão; diga ao usuário para clicar em **Sim**. Depois, use `& "$env:ProgramFiles\nodejs\node.exe"` no lugar de `node` até o fim desta conversa.
- **Windows sem winget:** peça ao usuário para baixar e instalar a versão **LTS** em https://nodejs.org/pt/download (botão "Windows Installer .msi"), clicando em Avançar até o fim. Espere ele confirmar.
- **Mac com Homebrew:** `brew install node`.
- **Mac sem Homebrew:** rode o bloco `sh-node-mac`, que baixa o instalador oficial e confere o checksum. Depois peça ao usuário para seguir a janela de instalação que abrir e avisar quando terminar.

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

**2b. Baixar o pacote e conferir o SHA256.** Diga: "Vou baixar o assistente do GitHub e conferir a assinatura digital (SHA256)."

O bloco lê `release/estavel.json` (versão fixada e hash esperado, versionado no repositório), baixa o pacote **pela tag exata** e só aceita se o SHA256 bater **com o hash fixado e com o `.sha256` publicado na release**.

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

Se o download falhar (sem internet, proxy ou antivírus), explique de forma simples e ofereça tentar de novo. Alternativa: o usuário abre a página de Releases do GitHub no navegador, baixa o `.zip` e o `.sha256` da versão indicada em `release/estavel.json` e diz em que pasta salvou. Nesse caso, faça as mesmas conferências de SHA256 (com o hash fixado e com o publicado) sobre os arquivos locais, pulando as linhas de download.

> **Modo de teste (desenvolvedor):** se o usuário indicar explicitamente outra fonte (URL `http://localhost...` ou pasta local), troque apenas os valores de `$raw`/`$rel` (ou `RAW`/`REL`). As conferências de SHA256 continuam obrigatórias.

**2c. Instalar no modo silencioso.** Diga: "Arquivo conferido. Agora vou instalar; isso não altera nada dos seus documentos." Troque NOME_DO_USUARIO, mantendo as aspas. No Windows, pergunte antes: "Quer um atalho 'Escritorio Claude' na Área de Trabalho?". Se a resposta for sim, acrescente `-Atalho`.

```powershell
# bloco: ps-instalar
$ps1 = Join-Path (Join-Path (Join-Path ([IO.Path]::GetTempPath()) "advogado-claude") (Join-Path "pacote" "advogado-claude-mod")) "instalar.ps1"
$psexe = (Get-Process -Id $PID).Path
& $psexe -NoProfile -ExecutionPolicy Bypass -File $ps1 -Silencioso -Nome "NOME_DO_USUARIO"
"CODIGO=$LASTEXITCODE"
```

```bash
# bloco: sh-instalar
set -e
d="${TMPDIR:-/tmp}/advogado-claude"
bash "$d/pacote/advogado-claude-mod/instalar.sh" --silencioso --nome "NOME_DO_USUARIO"
```

```bash
# bloco: gitbash-instalar   (Windows só com Bash/Git Bash; baixe antes com sh-baixar)
d="${TMPDIR:-/tmp}/advogado-claude"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$d/pacote/advogado-claude-mod/instalar.ps1")" -Silencioso -Nome "NOME_DO_USUARIO"
```

Sobre os blocos de instalação:
- `-ExecutionPolicy Bypass` vale **só para este processo**; a política do Windows não é alterada.
- Se aparecer "a execução de scripts foi desabilitada", a política foi imposta pela empresa (Group Policy). Não tente contornar: explique ao usuário e sugira falar com o suporte de TI.
- Se `CODIGO` for diferente de 0, mostre a mensagem de erro em linguagem simples e rode `DOUTOR --consertar`.

Depois de instalar com sucesso, rode `PE marcar instalacao`.

## Etapa 3 — Verificar (doutor)

Rode `DOUTOR`.
- `RESULTADO: TUDO CERTO`: diga "Instalei e testei: está tudo funcionando." e rode `PE marcar verificacao`.
- Se houver problemas: rode `DOUTOR --consertar` uma vez e depois `DOUTOR` de novo. Se ainda falhar, explique o item com ❌ em linguagem simples, sugira fechar e abrir o Claude Code, e pare aqui. A conversa pode ser retomada depois com a mesma frase.

Avise também: "Para os atalhos com barra (como /novo-caso) aparecerem, pode ser preciso digitar `/reload-skills` ou abrir o Claude Code de novo depois. Não precisa fazer isso agora; vou continuar a configuração."
Até lá, quando este roteiro mandar seguir uma skill, leia o arquivo `~/.claude/skills/<nome>/SKILL.md` com a ferramenta de leitura e siga-o.

## Etapa 4 — Entrevista: onde ficam as coisas do(a) advogado(a)

Diga: "Agora quero entender como você organiza seu trabalho. São umas 10 perguntas curtas, uma de cada vez. Se não souber alguma, é só dizer 'pular'."

Repita até a entrevista acabar:
1. Rode `PE proxima-pergunta`. Faça a pergunta mostrada, **reformulando com naturalidade**, e espere a resposta.
2. **Pergunta `varrer`, resposta sim:** rode `PE varrer`. É uma busca local que lê só nomes, em Documentos, Área de Trabalho, Downloads, OneDrive, Google Drive e Dropbox.
   - **Sigilo:** o resultado traz só a **pasta-mãe e contagens**, com um id por grupo (ex.: `[G2] Documentos/Clientes: 37 pastas`). Repita no chat **só isso**. Nunca liste nomes de subpastas ou de arquivos (costumam ser nomes de clientes), nem procure por eles com outras ferramentas.
   - Use esse resultado para **propor** respostas às perguntas seguintes ("Encontrei `Documentos/Peças` com 12 documentos que parecem peças. É lá que ficam suas petições?").
   - Se o script falhar, não faça varredura por conta própria: peça ao usuário para dizer onde ficam as pastas.
3. **Perguntas de caminho:** confirme com o usuário **cada** grupo/pasta antes de registrar. Pode haver mais de uma pasta por tipo; use o tipo indicado na pergunta.
   - Grupo encontrado pela varredura: `PE registrar <tipo> --grupo G2` (o caminho completo fica só no computador; não o repita no chat).
   - Pasta indicada pelo próprio usuário: `PE registrar <tipo> "<caminho>"`.
   - Se a pasta estiver no OneDrive, Drive ou Dropbox, explique que tudo bem: o assistente só lê, e o serviço de nuvem já é usado pelo escritório.
4. Grave a resposta com `PE responder <id> "<resumo curto>"`.
   - Só preferências e caminhos de pasta.
   - **Nunca** nomes de clientes, CPF ou números de processo; o script recusa.
5. **Amostras de estilo:** depois de registrar as amostras, pergunte: "Posso fazer uma **cópia** só dessas peças para a pasta de estilo do assistente? Os originais não serão tocados." Se o usuário concordar, rode `PE copiar-amostras --grupo G1` ou `PE copiar-amostras "<arquivo ou pasta>" ...` (máximo de 10 arquivos). Informe só a quantidade copiada.

Quando aparecer `FIM DA ENTREVISTA`, rode `PE marcar entrevista`. Depois resuma o que foi registrado **por tipo e pasta-mãe** (ex.: "Registrei: peças antigas em Documentos/Peças; casos em Documentos/Clientes"), sem nomes de subpastas ou arquivos, e rode `PE marcar registro`.

## Etapa 5 — Aprender o estilo e criar os dossiês

**Estilo.** Se houver amostras em `ESCRITORIO/ESTILO/amostras`, diga: "Vou ler suas peças para aprender seu jeito de escrever (vocabulário, conectivos, tamanho dos parágrafos, forma de citar)." Siga a skill `aprender-meu-estilo` (`~/.claude/skills/aprender-meu-estilo/SKILL.md`). Ao terminar, rode `PE marcar estilo`. Sem amostras, explique como colocá-las depois e marque mesmo assim, com uma nota: `PE marcar estilo "sem amostras"`.

**Dossiês.** Esta etapa só vale se a resposta da pergunta `dossies` foi sim e se há pasta de casos ativos registrada.
1. Pergunte: "Quer que eu crie uma ficha (dossiê) para **cada** pasta de cliente/caso dessa pasta? Os documentos não são copiados; a ficha só aponta para a pasta original."
2. Se sim, rode `PE dossies --grupo G2` (ou `PE dossies "<pasta de casos ativos>"` se o usuário indicou o caminho). O comando informa só quantos dossiês criou; repita apenas o número.
3. Se o usuário quiser escolher caso a caso, avise que os **nomes das pastas aparecerão nesta conversa** e peça permissão. Com permissão: `PE subpastas --grupo G2`, ele escolhe, e para cada caso rode `PE dossie "<nome legível do caso>" "<caminho da subpasta>"`. Sem permissão, fique com a opção 2 ou pule.
4. Não leia o conteúdo dos documentos dos casos agora. Diga que cada dossiê será completado quando o usuário abrir o caso (`/casos abrir`).

Ao terminar, rode `PE marcar dossies`.

## Etapa 6 — Resumo "como usar" e primeiro HANDOFF

1. Rode `PE concluir`. O comando grava o primeiro HANDOFF em `ESCRITORIO/HANDOFFS/` e marca a configuração como concluída.
2. Mostre ao usuário o resumo "Como usar" impresso pelo comando, em até 10 linhas, e termine com:
   > "Pronto! Daqui para frente é só conversar comigo normalmente. Dica: feche e abra o Claude Code (ou digite /reload-skills) para ativar os atalhos e a barra de status. Na próxima vez, abra o Claude Code na pasta ESCRITORIO."
3. Se o Windows ganhou um atalho, lembre que ele abre o assistente direto na pasta certa.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `node` não encontrado logo após instalar | Use o caminho completo (`C:\Program Files\nodejs\node.exe` ou `/usr/local/bin/node`). Depois de reabrir o Claude Code, `node` passa a funcionar. |
| "execução de scripts desabilitada" | Política da empresa: não contorne. Oriente procurar o TI. |
| CHECKSUM DIFERENTE | Pare. Não instale. Peça para tentar mais tarde. |
| Antivírus bloqueou | Explique que os arquivos são scripts de texto abertos (podem ser lidos); sugira liberar a pasta temporária ou instalar manualmente pelo README. |
| Conversa caiu no meio | Cole a mesma frase de novo: a Etapa 0 retoma de onde parou. |
| Algo parou de funcionar depois | Digite `/consertar`. |
