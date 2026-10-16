#!/usr/bin/env bash
# Advogado Claude Mod - instalador para macOS (e Linux).
# Uso: clique duas vezes em instalar.command (macOS) ou rode: bash instalar.sh
# Opcoes: --escritorio "/caminho" --nome "Dra. Ana" --silencioso
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ESC=""; NOME=""; SILENCIOSO=0
while [ $# -gt 0 ]; do
  case "$1" in
    --escritorio) ESC="${2:-}"; shift 2 ;;
    --nome) NOME="${2:-}"; shift 2 ;;
    --silencioso) SILENCIOSO=1; shift ;;
    *) shift ;;
  esac
done
titulo() { printf '\n\033[36m==== %s ====\033[0m\n' "$1"; }
sim_nao() {
  if [ "$SILENCIOSO" = 1 ]; then return 1; fi  # silencioso: nada é instalado sem pergunta
  local r; read -r -p "$1 (S/N) " r || true
  case "$r" in s|S|sim|Sim|SIM|y|Y) return 0 ;; *) return 1 ;; esac
}
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

titulo "Advogado Claude Mod - instalação"
echo "Tudo fica no seu computador. Nenhum documento é enviado para a internet."

titulo "1/4 Claude Code"
if ! command -v claude >/dev/null 2>&1; then
  echo "O Claude Code não foi encontrado."
  if sim_nao "Instalar agora pelo instalador oficial da Anthropic?"; then
    curl -fsSL https://claude.ai/install.sh | bash || echo "Falhou; instale depois em https://code.claude.com"
  fi
else echo "OK: Claude Code encontrado."; fi

titulo "2/4 Node.js"
# Node recem-instalado pode nao estar no PATH desta sessao: procura nos locais padrao.
for d in /opt/homebrew/bin /usr/local/bin "$HOME/.local/node/bin"; do
  if ! command -v node >/dev/null 2>&1 && [ -x "$d/node" ]; then PATH="$d:$PATH"; export PATH; fi
done
if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1 && sim_nao "Instalar o Node.js agora com o Homebrew?"; then
    brew install node
  fi
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale a versão LTS em https://nodejs.org e rode este instalador de novo."
  exit 1
fi
MAIOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$MAIOR" -lt 18 ]; then echo "Node.js $(node -v) é antigo; instale a versão LTS (18+)."; exit 1; fi
echo "OK: Node.js $(node -v)"

titulo "3/4 Pasta do ESCRITORIO"
PADRAO="$HOME/ESCRITORIO"
if [ -z "$ESC" ]; then
  if [ "$SILENCIOSO" = 1 ]; then ESC="$PADRAO"; else
    read -r -p "ENTER para usar [$PADRAO] ou digite outra pasta: " ESC || true
    ESC="${ESC:-$PADRAO}"
  fi
fi
case "$ESC" in
  *iCloud*|*"Mobile Documents"*|*Dropbox*|*"Google Drive"*|*OneDrive*)
    echo "ATENÇÃO: essa pasta sincroniza com a nuvem (documentos de clientes sairiam do computador)."
    sim_nao "Continuar mesmo assim?" || ESC="$PADRAO" ;;
esac
if [ -z "$NOME" ] && [ "$SILENCIOSO" != 1 ]; then
  read -r -p "Como prefere ser chamado(a)? (ENTER para depois): " NOME || true
fi

titulo "4/4 Instalando"
if [ -n "$NOME" ]; then
  node "$RAIZ/scripts/instalar.js" --escritorio "$ESC" --nome "$NOME" --silencioso
else
  node "$RAIZ/scripts/instalar.js" --escritorio "$ESC" --silencioso
fi
echo
echo "Para começar: abra o Terminal e digite:  cd \"$ESC\" && claude"
