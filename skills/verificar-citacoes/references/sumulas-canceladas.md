# Súmulas canceladas ou superadas

O livro de conferências (`julgados.js`) diz se o julgado existe e se o trecho bate. **Não diz se a súmula ainda vale.** Para isso existe uma lista local, que vem com o assistente e é lida sem internet.

## De onde vem o aviso

1. **Lista embarcada:** `~/.claude/advogado/scripts/lib/dados/sumulas-canceladas.json`. Foi curada à mão e tem data de revisão (`revisadoEm`). Só entra o que é certo: cancelamento formal vira `cancelada`; superação sem cancelamento formal (comum no STF) vira `superada`. **Não é completa:** súmula que não está na lista não fica confirmada como vigente. OJs do TST ainda não entram.
2. **Ajuste do escritório:** `ESCRITORIO/WIKI/sumulas-situacao.json`. Vale mais que a lista: acrescenta itens ou marca `vigente` para anular um falso positivo. É público e não leva dado de cliente.

## O que acontece com cada citação

| Situação | Exemplo | checar-peca | Word (exportar-docx / mapa-teses exportar) |
|---|---|---|---|
| Cancelada, com tribunal | "Súmula 469 do STJ", "Súmula n. 469/STJ", "Súmula 469 do C. STJ" | 🔴 | **recusa (código 2)**; com `--forcar`, sai `[⚠️ SÚMULA CANCELADA]` grifado em vermelho |
| Superada | "Súmula 690 do STF" | ⚠️ | exporta e avisa |
| Sem tribunal | "Súmula 469" (cancelada no STJ) | ❓ "confirme de qual tribunal" | exporta e avisa |
| Citada como histórico | "a antiga Súmula 469 do STJ, cancelada em 2018…" ou `[CITADA COMO HISTÓRICO]` logo depois | ℹ️ | exporta; só uma linha informativa |

O tribunal é lido por "do STJ", "/STJ", "do C. STJ", "STF", "TST" e por "Súmula Vinculante" (= STF), até cerca de 20 caracteres depois da citação. Citação consciente: "cancelada", "revogada", "superada", "antiga" ou "extinta" na **mesma frase**.

## Como falar com o advogado

Sempre: "segundo a lista local de DD/MM/AAAA" + "confirme no site do tribunal (stf.jus.br / stj.jus.br / tst.jus.br) antes de protocolar". Exemplo: "A Súmula 469 do STJ foi cancelada em 2018 (substituída pela 608), segundo a lista local de 12/11/2026. Confirme no site do STJ antes de protocolar." Nunca afirme vigência como certeza.

## Comandos (`S="$HOME/.claude/advogado/scripts"`)

- `node "$S/julgados.js" sumula consultar "Súmula 469 do STJ"`: situação segundo a lista e o ajuste do escritório.
- `node "$S/julgados.js" sumula listar`: data da revisão, itens e ajustes do escritório.
- `node "$S/julgados.js" sumula marcar "Súmula 469 do STJ" --vigente|--cancelada|--superada --fonte <link do tribunal ou WIKI/raw/arquivo> [--data AAAA] [--substituida-por N] [--obs "..."]`
  - A `--fonte` é obrigatória. Antes de marcar, o advogado confere no site do tribunal (internet só com a permissão dele, como em `conferencia-online.md`).
  - `--vigente` anula um aviso errado da lista. `--cancelada` e `--superada` acrescentam um cancelamento que a lista ainda não tem.
  - Se o arquivo do escritório estiver ilegível, nada é gravado por cima: corrija ou renomeie o arquivo e marque de novo.

## Manutenção

O `/doutor` mostra quantos itens a lista tem e a data da revisão. A manutenção quinzenal avisa quando a revisão passa de 6 meses ("confira novos cancelamentos"); até a atualização do assistente, use `sumula marcar` para ajustes pontuais.
