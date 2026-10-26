---
name: prazos
description: "Prazos em dias úteis: mostra, cadastra, calcula, dá baixa e registra feriado ou suspensão local. Use quando o usuário falar de prazo, intimação, vencimento ou feriado."
argument-hint: "[listar | calcular DD/MM/AAAA dias | novo | feito | feriado | suspensao]"
---

# Prazos

Pedido: $ARGUMENTS (vazio = listar). Script: `PZ` = `node "$HOME/.claude/advogado/scripts/prazos.js"`.

- **listar**: `PZ listar 15` e mostre a saída (🔴 ≤ 2 dias úteis, 🟡 ≤ 5, 🟢 demais). Vencimento que caiu em dia não útil aparece já prorrogado (art. 224 §1º).
- **calcular**: `PZ calcular <DD/MM/AAAA da intimação/publicação> <dias> --caso "<caso>"` (ou `--tribunal <sigla> --comarca <cidade>`). Use o calendário do tribunal/comarca **daquele caso**; se o caso não tiver foro, pergunte e grave com `node "$HOME/.claude/advogado/scripts/processo.js" foro "<caso>" --tribunal TJPR --comarca Curitiba`. Diga o vencimento e **quais entradas locais foram consideradas** (data, motivo, fonte); repita todo aviso `[SEM FONTE]`. Explique o termo inicial: a contagem começa no primeiro dia útil seguinte (art. 224). Pergunte o rito: JEC (Lei 9.099, art. 12-A — dias úteis), processo do trabalho (CLT art. 775 — dias úteis), penal (CPP art. 798 — dias **corridos**: não use o script; calcule à parte), prazos em dobro (Fazenda, Defensoria, litisconsortes com procuradores distintos em autos físicos — art. 229).
- **novo**: acrescente linha em `PRAZOS.md`: `| DD/MM/AAAA | <caso> | <o que fazer> | <origem> | pendente |`. Se veio do **calcular**, use a "Linha para o PRAZOS.md" que ele imprime (guarda `[cálculo: …]` na origem, para recalcular depois). Replique no DOSSIE.md do caso.
- **feito**: troque o status para `feito` (não apague linhas).
- **feriado / suspensao** (feriado municipal/estadual, suspensão de prazos, indisponibilidade do sistema): siga [references/calendario.md](references/calendario.md). **Sempre peça a fonte** (lei, portaria, ato ou link). Mostre ao advogado os prazos que mudam (antes → depois) e só rode com `--confirmar` depois do "sim" dele.

Sempre termine com: "⚠️ Confira o prazo no sistema do tribunal. O cálculo é um auxílio."
