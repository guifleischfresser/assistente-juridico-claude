---
name: habilidades
description: "Mostra e controla as habilidades do assistente. Use quando o usuário perguntar o que o assistente aprendeu/criou ou quiser desfazer um atalho novo."
argument-hint: "[listar | historico | proveniencia <nome> | desfazer <nome> | aposentar <nome> | restaurar <nome> | candidatas]"
disable-model-invocation: true
---

# Habilidades

Pedido: $ARGUMENTS (vazio = listar)

Script: `node "$HOME/.claude/advogado/scripts/habilidades.js" <comando>`

- **listar** → `listar`. Explique a legenda: 📦 núcleo (vem com o sistema), 🧪 experimental (criada recentemente), ✅ estável (5 usos sem falha), 🗄️ aposentada.
- **historico** → `historico 10`. Resuma em linguagem simples o que mudou e por quê.
- **proveniencia <nome>** → de onde veio um atalho `auto-*`: quando e por que foi criado, em que tipo de peça, cada edição, mescla ou aposentadoria.
- **desfazer <nome>** → `desfazer <nome>` (volta à versão anterior; se era a primeira, aposenta).
- **aposentar <nome>** → `aposentar <nome> "pedido do usuário"`.
- **restaurar <nome>** → `restaurar <nome>`.
- **candidatas** → `candidatas` (tarefas repetidas que podem virar atalho).

Lembre ao usuário que nada é apagado: tudo fica em `~/.claude/advogado/habilidades/` (versões, aposentadas e CHANGELOG.md).
