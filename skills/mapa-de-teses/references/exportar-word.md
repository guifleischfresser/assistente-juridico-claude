# Exportar o mapa de teses para Word (.docx)

Quando o advogado pedir "exporta o mapa de teses do caso X pra Word" (ou "manda o mapa em .docx").

1. Rode: `node "$S/mapa-teses.js" exportar "<caso ou mapa.md>"`. Aceita o nome do caso (usa o mapa mais recente de `<caso>/pecas/`), a pasta do caso ou o arquivo do mapa. Outro destino: `--saida "<arquivo.docx>"`.
2. O script **valida antes** (mesmo `validar` do passo 5 da skill) e segue as regras do `exportar-docx`:
   - precedente sem `[A VERIFICAR]`, divergente ou inexistente no livro de julgados → **recusa (código 2)**. Corrija com `marcar`/`/verificar-citacoes` e exporte de novo;
   - marcador de anonimização não revertido (`[PARTE_A]`, `[CPF_1]`…) → recusa (código 2): rode `/anonimizar reverter` no mapa e exporte o arquivo `-dados-reais`;
   - texto oculto ou erro já corrigido duas vezes (`/erros`, bloqueio) → recusa (código 3), sem exceção.
3. `--forcar` só com pedido expresso do advogado: exporta mesmo assim, com `[🔴 DIVERGENTE/NÃO EXISTE]` grifado em vermelho e marcadores grifados em amarelo. Diga que o arquivo **não** pode ir para a peça assim.
4. O Word sai com o quadro `| # | Pedido | Valor (R$) | Risco | Teses | Precedentes |` como tabela do Word (bordas, cabeçalho repetido em cada página, fonte do escritório, valores à direita), o detalhe de cada pedido e a tabela **Totais por risco** (provável, possível, remota, total; ilíquidos à parte — a mesma conta do `totalizar`). O `.md` do mapa não muda.
5. Se já existia o `.docx`, a versão anterior (talvez editada no Word) vai para `_versoes/` antes de ser substituída.
6. Responda com a primeira linha da saída, em linguagem simples, por exemplo: "Exportei o mapa de teses do caso X para Word: 7 pedidos, total provável R$ 48.300,00. Arquivo: pecas/mapa-de-teses-2026-11-02.docx." Acrescente os avisos (precedentes ainda `[A VERIFICAR]`, versão anterior guardada).

Tabelas em outras peças: qualquer tabela Markdown (`| a | b |` + `|---|---|`) vira tabela do Word no `exportar-docx.js`; `:--:` centraliza, `--:` alinha à direita e `\|` escreve uma barra dentro da célula.
