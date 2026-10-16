# Advogado Claude Mod - instalador para Windows (compativel com Windows PowerShell 5.1)
# Uso: clique duas vezes em instalar.bat  (ou: powershell -ExecutionPolicy Bypass -File instalar.ps1)
# Parametros opcionais: -Escritorio "C:\caminho" -Nome "Dra. Ana" -Silencioso [-Atalho]
# -Silencioso: nenhuma pergunta e NADA e instalado sem pergunta (Claude/Node precisam existir).
# -Atalho: cria o atalho na area de trabalho mesmo no modo silencioso.
# Observacao: este arquivo e propositalmente ASCII (sem acentos) para funcionar em qualquer
# codificacao do PowerShell 5.1. As mensagens com acentos vem do instalador em Node.
param(
  [string]$Escritorio = "",
  [string]$Nome = "",
  [switch]$Silencioso,
  [switch]$Atalho
)
$ErrorActionPreference = "Stop"
$raiz = $PSScriptRoot

function Titulo($t) { Write-Host ""; Write-Host "==== $t ====" -ForegroundColor Cyan }
function Perguntar($texto, $padrao) {
  if ($Silencioso) { return $padrao }
  $r = Read-Host $texto
  if ([string]::IsNullOrWhiteSpace($r)) { return $padrao } else { return $r.Trim() }
}
function SimNao($texto) {
  # No modo silencioso nada e instalado/criado sem pergunta (seguranca): responde "nao".
  if ($Silencioso) { return $false }
  $r = Read-Host "$texto (S/N)"
  return ($r -match '^(s|sim|y|yes)$')
}
function AtualizarPath {
  if ($env:OS -ne "Windows_NT") { return }
  $m = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $u = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$m;$u;$env:USERPROFILE\.local\bin;$env:Path"
}
function Fim($codigo) {
  if (-not $Silencioso) { Read-Host "Pressione ENTER para fechar" | Out-Null }
  exit $codigo
}

Titulo "Advogado Claude Mod - instalacao"
Write-Host "Este instalador configura seu assistente juridico no Claude Code."
Write-Host "Tudo fica no seu computador. Nenhum documento e enviado para a internet."

# Desbloqueia arquivos baixados da internet (Mark of the Web)
try { Get-ChildItem -LiteralPath $raiz -Recurse -File | Unblock-File -ErrorAction SilentlyContinue } catch { }

# 1. Claude Code
Titulo "1/4 Verificando o Claude Code"
AtualizarPath
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "O Claude Code nao foi encontrado neste computador." -ForegroundColor Yellow
  if (SimNao "Deseja instalar agora pelo instalador oficial da Anthropic?") {
    try {
      Invoke-RestMethod -Uri "https://claude.ai/install.ps1" | Invoke-Expression
      AtualizarPath
    } catch {
      Write-Host "Nao foi possivel instalar automaticamente: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
  if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "Instale o Claude Code (https://code.claude.com) e rode este instalador de novo." -ForegroundColor Yellow
    Write-Host "Continuando mesmo assim: o assistente ficara pronto para quando o Claude Code for instalado."
  }
} else { Write-Host "OK: Claude Code encontrado." -ForegroundColor Green }

# 2. Node.js (as automacoes do assistente usam Node; o Claude Code nativo nao o inclui)
Titulo "2/4 Verificando o Node.js"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "O Node.js (necessario para as protecoes automaticas) nao foi encontrado." -ForegroundColor Yellow
  if ((Get-Command winget -ErrorAction SilentlyContinue) -and (SimNao "Deseja instalar o Node.js LTS agora (via winget, oficial da Microsoft)?")) {
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    AtualizarPath
    if (-not (Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path "$env:ProgramFiles\nodejs\node.exe")) {
      $env:Path = "$env:ProgramFiles\nodejs;$env:Path"
    }
  }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Nao encontrei o Node.js. Baixe a versao LTS em https://nodejs.org , instale e rode este instalador de novo." -ForegroundColor Red
  Fim 1
}
$versaoNode = (& node -v)
$maior = 0
if ($versaoNode -match '^v(\d+)') { $maior = [int]$Matches[1] }
if ($maior -lt 18) {
  Write-Host "Seu Node.js ($versaoNode) e antigo. Instale a versao LTS (18 ou superior) em https://nodejs.org" -ForegroundColor Red
  Fim 1
}
Write-Host "OK: Node.js $versaoNode" -ForegroundColor Green

# 3. Pasta do escritorio
Titulo "3/4 Pasta do seu ESCRITORIO"
$padrao = Join-Path $env:USERPROFILE "ESCRITORIO"
if ([string]::IsNullOrWhiteSpace($Escritorio)) {
  Write-Host "Seus casos, pecas e prazos ficarao numa pasta local (fora do OneDrive, por sigilo)."
  $Escritorio = Perguntar "Pressione ENTER para usar [$padrao] ou digite outra pasta" $padrao
}
if ($Escritorio -match 'OneDrive|Dropbox|Google Drive|iCloud') {
  Write-Host "ATENCAO: essa pasta sincroniza com a nuvem. Documentos de clientes seriam enviados para fora do computador." -ForegroundColor Yellow
  if (-not (SimNao "Deseja continuar mesmo assim?")) { $Escritorio = $padrao }
}
if ([string]::IsNullOrWhiteSpace($Nome)) {
  $Nome = Perguntar "Como prefere ser chamado(a)? (ex.: Dra. Ana) - ENTER para responder depois" ""
}

# 4. Instalacao (Node faz a mescla segura do settings.json, com backup)
Titulo "4/4 Instalando"
$argsNode = @((Join-Path (Join-Path $raiz "scripts") "instalar.js"), "--escritorio", $Escritorio)
if ($Silencioso) { $argsNode += "--silencioso" }
if (-not [string]::IsNullOrWhiteSpace($Nome)) { $argsNode += @("--nome", $Nome) }
& node @argsNode
if ($LASTEXITCODE -ne 0) {
  Write-Host "A instalacao encontrou um erro (codigo $LASTEXITCODE). Nada do seu escritorio foi apagado." -ForegroundColor Red
  Fim $LASTEXITCODE
}

# Atalho na area de trabalho
if ($Atalho -or (SimNao "Criar um atalho 'Escritorio Claude' na area de trabalho?")) {
  try {
    $desk = [Environment]::GetFolderPath("Desktop")
    $sh = New-Object -ComObject WScript.Shell
    $lnk = $sh.CreateShortcut((Join-Path $desk "Escritorio Claude.lnk"))
    $lnk.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $escAspas = $Escritorio.Replace("'", "''")
    $lnk.Arguments = "-NoExit -NoProfile -Command `"Set-Location -LiteralPath '$escAspas'; claude`""
    $lnk.WorkingDirectory = $Escritorio
    $lnk.Description = "Abre o assistente juridico na pasta do escritorio"
    $lnk.Save()
    Write-Host "OK: atalho criado na area de trabalho." -ForegroundColor Green
  } catch { Write-Host "Nao foi possivel criar o atalho: $($_.Exception.Message)" -ForegroundColor Yellow }
}

Titulo "Pronto!"
Write-Host "Clique no atalho 'Escritorio Claude' (ou abra o Claude Code na pasta $Escritorio)."
Write-Host "Na primeira conversa o assistente se apresenta e faz a configuracao com voce."
Fim 0
