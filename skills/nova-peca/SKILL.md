---
name: nova-peca
description: "Redige minuta de peça jurídica brasileira no estilo do advogado. Use quando o usuário pedir para escrever, redigir ou minutar qualquer peça ou documento jurídico."
argument-hint: "[tipo da peça] [caso]"
---

# Nova peça

Pedido: $ARGUMENTS

## Antes de escrever (economize limite: leia só o necessário)
1. Identifique **tipo** e **caso**. Se faltar, pergunte (uma pergunta por vez).
2. Leia: `ESTILO/perfil-de-escrita.md` (se ainda não preenchido, avise e ofereça `/aprender-meu-estilo`; siga o padrão forense sóbrio), o `DOSSIE.md` do caso, o modelo em `PECAS/modelos/` e, se houver, 1 peça parecida em `PECAS/minhas-pecas/<tipo>/`.
3. Autos: use `autos-md/INDICE.md` + Grep por termos, lendo trechos com offset/limit. Se os PDFs ainda não foram convertidos, rode `/preparar-autos` primeiro. Nunca carregue o processo inteiro.
4. Confirme em 3–5 linhas a **tese** e os pedidos antes de redigir peças longas. Peça sem tese é peça genérica.

## Redação
- Brasileira, técnica e no estilo do usuário: vocabulário, conectivos, tamanho de parágrafo, forma de tratar o juízo e as partes e estilo de citação conforme o perfil.
- Estrutura conforme o CPC/CLT/CC aplicável (ex.: inicial — CPC art. 319; contestação — arts. 335–342; apelação — arts. 1.009–1.014; trabalhista — CLT art. 840).
- **Citações**: só use julgado/súmula/tema que esteja na `WIKI/paginas/` com fonte, que o usuário forneceu, ou que você confirmou em fonte oficial a pedido dele. Formato: `REsp 1.234.567/SP [fonte: WIKI/paginas/jurisprudencia/x.md]` ou com link oficial. Qualquer outra citação recebe ` [NÃO VERIFICADO]` logo depois. **Nunca invente** número, relator, data ou trecho de ementa.
- Sem "cara de IA": nada de "vale ressaltar", "é importante destacar", "em suma", "robusto", listas excessivas, emojis, negrito em excesso ou travessões em cascata. Parágrafos com o comprimento médio do perfil.
- Dados faltantes: `[PREENCHER: o quê]`. Nunca preencha CPF, endereço ou valores por suposição.
- Use as marcações do exportador: `#` título centralizado, `##` seções, `>` citação longa, `<!-- sem-recuo -->`, `<!-- centralizar -->`.

## Salvar e fechar
1. Salve em `CASOS/<fase>/<caso>/pecas/AAAA-MM-DD_<tipo>_v1.md` (nova versão = v2, v3; não sobrescreva versões anteriores).
2. O verificador automático de citações vai rodar sozinho; trate os avisos (marque [NÃO VERIFICADO] ou inclua a fonte).
3. Rode a checagem: `node "$HOME/.claude/advogado/scripts/checar-peca.js" "<arquivo>" --tipo <tipo>` e corrija o que for possível.
3b. **Julgados com trecho entre aspas:** confira com `/verificar-citacoes` (original local em `WIKI/raw/` ou, só com permissão do advogado, no site do tribunal). Trecho divergente bloqueia a exportação.
4. Atualize o Histórico e as Pendências do `DOSSIE.md`.
5. Entregue: resumo da tese em 3 linhas, lista de `[PREENCHER]` e de `[NÃO VERIFICADO]`, e ofereça `/advogado-do-diabo`, `/revisar` e `/formatar-peca`.
