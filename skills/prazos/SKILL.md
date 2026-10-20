---
name: prazos
description: "Mostra, cadastra, calcula e dá baixa em prazos processuais em dias úteis. Use quando o usuário falar de prazo, intimação, publicação, vencimento, agenda ou \"quando vence\"."
argument-hint: "[listar | calcular DD/MM/AAAA dias | novo | feito]"
---

# Prazos

Pedido: $ARGUMENTS (vazio = listar)

- **listar**: `node "$HOME/.claude/advogado/scripts/prazos.js" listar 15` e mostre a saída (🔴 ≤ 2 dias úteis, 🟡 ≤ 5, 🟢 demais).
- **calcular**: `node "$HOME/.claude/advogado/scripts/prazos.js" calcular <DD/MM/AAAA da intimação/publicação> <dias>`. Explique o termo inicial: a contagem começa no primeiro dia útil seguinte (art. 224). Pergunte o rito: JEC (Lei 9.099, art. 12-A — dias úteis), processo do trabalho (CLT art. 775 — dias úteis), penal (CPP art. 798 — dias **corridos**: não use o script; calcule à parte), prazos em dobro (Fazenda, Defensoria, litisconsortes com procuradores distintos em autos físicos — art. 229).
- **novo**: acrescente linha em `PRAZOS.md`: `| DD/MM/AAAA | <caso> | <o que fazer> | <origem> | pendente |`. Replique no DOSSIE.md do caso.
- **feito**: troque o status para `feito` (não apague linhas).
- Feriados municipais/estaduais e suspensões do tribunal: pergunte e grave em `config.json` → `feriadosExtras` (["MM-DD" ou "AAAA-MM-DD"]).

Sempre termine com: "⚠️ Confira o prazo no sistema do tribunal. O cálculo é um auxílio."
