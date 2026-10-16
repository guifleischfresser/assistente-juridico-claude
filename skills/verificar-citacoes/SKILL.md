---
name: verificar-citacoes
description: "Verificador anti-alucinação de jurisprudência e legislação citadas em peças (julgados, súmulas, temas, leis, artigos). Marca [NÃO VERIFICADO] em toda citação sem fonte conferida. Use quando o usuário pedir para conferir citações/jurisprudência, antes de exportar ou protocolar, ou digitar /verificar-citacoes."
argument-hint: "[arquivo]"
---

# Verificar citações

Arquivo: $ARGUMENTS

Princípio: **citação sem fonte é risco profissional** (multa por litigância de má-fé, ofício à OAB). O verificador nunca "confirma de memória".

1. Relatório automático: `node "$HOME/.claude/advogado/scripts/checar-peca.js" "<arquivo>"` (seção Citações).
2. Para cada citação **sem fonte**, nesta ordem:
   a. Procure na `WIKI/paginas/` (Grep pelo número/tema). Achou com fonte → acrescente `[fonte: WIKI/paginas/...]` logo após a citação.
   b. Procure nos autos do caso (`autos-md/`) — se a citação veio de decisão ou peça dos autos, cite a origem: `[fonte: autos-md/<doc>.md pág. N]`.
   c. Se o usuário **pedir** pesquisa na internet: busque só em fontes oficiais (stf.jus.br, stj.jus.br, tst.jus.br, sites dos TJs/TRFs/TRTs, planalto.gov.br) e **só com termos jurídicos** (classe, número, tema), nunca com nomes ou dados do cliente. Confirme existência, número, relator, órgão, data e que a ementa diz o que a peça afirma. Salve o inteiro teor/ementa em `WIKI/raw/` e um resumo em `WIKI/paginas/` (ver `WIKI/schema/SCHEMA.md`), e cite com o link oficial.
   d. Não confirmou → mantenha/insira ` [NÃO VERIFICADO]`: `node "$HOME/.claude/advogado/scripts/checar-peca.js" "<arquivo>" --marcar` (faz backup antes).
3. Se encontrar citação que **não existe** ou que diz outra coisa, destaque em 🔴 e proponha remover ou reescrever o argumento sem ela.
4. Legislação: confira se o dispositivo existe e se está vigente (atenção a revogações e renumerações); cite o Planalto quando conferido.
5. Entregue tabela: citação | situação (✅ fonte / ⚠️ não verificado / 🔴 inexistente ou distorcida) | fonte.
