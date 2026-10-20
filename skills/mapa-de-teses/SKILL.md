---
name: mapa-de-teses
description: "Mapa de teses da defesa: para cada pedido da inicial, valor, risco (alto/médio/baixo), teses e precedentes. Use ao analisar petição inicial para defender."
argument-hint: "[caso] [arquivo da inicial]"
---

# Mapa de teses da defesa

Pedido: $ARGUMENTS. `S="$HOME/.claude/advogado/scripts"`.

1. Identifique o caso (`/processo`). A inicial precisa estar em `autos-md/` (senão, `/preparar-autos`). Leia por trechos: `INDICE.md` + Grep por "pedido", "requer", "valor", "R$".
2. Crie o arquivo: `node "$S/mapa-teses.js" modelo "<pasta do caso>" --titulo "<ação — cliente réu>"` (fica em `<caso>/pecas/mapa-de-teses-AAAA-MM-DD.md`).
3. Preencha **um pedido por linha** do quadro, com o valor atribuído na inicial (ou "ilíquido"), o risco (alto/médio/baixo, e o porquê no detalhe) e as teses de defesa (preliminares, prescrição, mérito, subsidiárias). Use só o que está nos autos e no dossiê; falta dado → `[PREENCHER]`.
4. **Precedentes: nunca invente.** Só cite julgado/súmula/tema que esteja na WIKI, que o advogado deu ou que você conferiu. Todos levam ` [A VERIFICAR]` até serem conferidos com `/verificar-citacoes` (que pergunta antes de ir à internet). Na dúvida, escreva a tese sem precedente.
5. Feche: `node "$S/mapa-teses.js" marcar "<mapa>"`, `totalizar "<mapa>"` e `validar "<mapa>"` (corrija até ✅). Ofereça `imprimir` (HTML para imprimir/PDF) e anote no `DOSSIE.md`.
6. Entregue: quadro resumido, exposição por risco e lista do que falta conferir. Critérios de risco e exemplos trabalhistas: `references/criterios.md`.
