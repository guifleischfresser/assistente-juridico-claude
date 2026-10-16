#!/usr/bin/env bash
# Remove o assistente do Claude Code. Nunca apaga a pasta ESCRITORIO.
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
read -r -p "Remover o assistente jurídico? Seus documentos NÃO serão apagados. (S/N) " r || true
case "$r" in s|S|sim|Sim) node "$RAIZ/scripts/instalar.js" --desinstalar ;; *) echo "Cancelado." ;; esac
