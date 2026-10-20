# Critérios do mapa de teses

## Risco (padrão de provisão — CPC 25 / NBC TG 25)
- **Alto (perda provável):** fato incontroverso ou provado por documento do próprio réu; jurisprudência pacífica contra (súmula, tema repetitivo, OJ); ônus da prova do réu sem documento.
- **Médio (perda possível):** depende de prova oral/pericial; jurisprudência dividida; há documento parcial.
- **Baixo (perda remota):** prescrição clara; pedido sem fundamento legal; prova documental robusta a favor do réu; tese pacífica a favor.
Explique o porquê de cada risco no detalhe do pedido; o advogado decide a classificação final.

## Teses típicas (trabalhista) — checklist, não precedente
- **Preliminares:** inépcia (CLT art. 840, §1º — pedido sem valor), ilegitimidade, incompetência, litispendência/coisa julgada.
- **Prejudiciais:** prescrição bienal/quinquenal (CF art. 7º, XXIX), prescrição parcial.
- **Mérito:** cartões de ponto e ônus da prova (horas extras), pagamento comprovado (recibos), natureza indenizatória, ausência de requisitos (vínculo, equiparação, insalubridade — laudo).
- **Subsidiárias:** limitação aos valores da inicial, compensação/dedução do já pago, base de cálculo, reflexos, juros e correção conforme entendimento vigente (conferir), justiça gratuita/honorários de sucumbência (CLT art. 791-A).

## Precedentes
- Formato: `Súmula 338 do TST [A VERIFICAR]`, `REsp 1.234.567/SP [A VERIFICAR]`.
- Depois de conferido com `/verificar-citacoes`, `mapa-teses.js marcar` troca para `[CONFERIDO: <fonte>]`, ou `[🔴 DIVERGENTE/NÃO EXISTE]`.
- `validar` reprova o mapa se algum precedente estiver sem marca ou conferido como divergente/inexistente.

## Valores
- Use o valor que a inicial atribuiu a cada pedido (CLT art. 840, §1º). Sem valor → "ilíquido" (fica fora da soma, mas é contado).
- `totalizar` soma por risco e escreve o resumo entre as marcas `resumo-risco` (rode de novo após editar).
