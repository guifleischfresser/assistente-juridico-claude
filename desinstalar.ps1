# Advogado Claude Mod - desinstalador (Windows PowerShell 5.1). Nunca apaga a pasta ESCRITORIO.
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Node.js nao encontrado; nada a fazer."; exit 1 }
$r = Read-Host "Remover o assistente juridico do Claude Code? Seus documentos NAO serao apagados. (S/N)"
if ($r -match '^(s|sim)$') { & node (Join-Path (Join-Path $PSScriptRoot "scripts") "instalar.js") --desinstalar }
Read-Host "Pressione ENTER para fechar" | Out-Null
