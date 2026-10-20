---
name: revisar
description: "Revisão técnica completa de peça ou contrato: citações, requisitos legais por tipo. Use quando o usuário pedir revisão, conferência, \"dá uma olhada\" ou \"está bom?\"."
argument-hint: "[arquivo]"
---

# Revisar

Arquivo: $ARGUMENTS (se vazio, a última peça do caso atual).

1. Checagem automática: `node "$HOME/.claude/advogado/scripts/checar-peca.js" "<arquivo>"` (citações, cara de IA, campos a preencher, requisitos mínimos, tamanho de parágrafos vs. perfil).
2. Leitura crítica (você):
   - Coerência: cada pedido tem fundamento e cada fundamento tem fato e prova.
   - Requisitos do tipo (CPC 319/320, 335–342, 1.010; CLT 840 etc.), competência, legitimidade, valor da causa, tempestividade (confira PRAZOS.md).
   - Citações: rode a lógica de `/verificar-citacoes`; nada sem fonte passa sem `[NÃO VERIFICADO]`.
   - Estilo: compare com `ESTILO/perfil-de-escrita.md` (conectivos, vocabulário, parágrafos, tratamento). Aponte frases que "não soam" como o usuário.
   - Português: concordância, regência, crase, pontuação; clareza e concisão.
3. Entregue um relatório curto: 🔴 graves (podem causar indeferimento, preclusão ou sanção), 🟡 importantes, 🟢 sugestões. Para cada item: trecho, problema, sugestão.
4. Só altere o arquivo se o usuário pedir. Ao alterar, salve nova versão (`_v2`), nunca sobrescreva a anterior.
5. Ofereça `/advogado-do-diabo` para peças de mérito.
