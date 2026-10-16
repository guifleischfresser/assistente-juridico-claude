---
name: formatar-peca
description: "Formata e exporta peça jurídica para Word (.docx) no padrão forense/ABNT (A4, margens 3/2 cm, fonte 12, entrelinhas 1,5, recuo 1,25 cm, citação longa com recuo de 4 cm, numeração de páginas). Use quando o usuário pedir para formatar, gerar o Word/.docx, deixar pronto para protocolar ou digitar /formatar-peca."
argument-hint: "[arquivo .md da peça]"
---

# Formatar e exportar

Arquivo: $ARGUMENTS (se vazio, pergunte qual peça ou use a última editada no caso atual).

1. Ajuste o Markdown às marcações do exportador, sem mudar o conteúdo jurídico:
   - `# TÍTULO` centralizado e em negrito (ex.: `# CONTESTAÇÃO`); `## I – DOS FATOS` para seções; `### 1.1` subseções.
   - `>` no início da linha para citação longa (mais de 3 linhas: recuo 4 cm, fonte 10, espaço simples — NBR 10520).
   - `<!-- sem-recuo -->` antes do endereçamento e da qualificação; `<!-- centralizar -->` antes de local/data/assinatura; `<!-- quebra-pagina -->` antes das razões recursais.
   - Pedidos com `a)`, `b)`... Remova emojis, tabelas e restos de formatação técnica.
2. Exporte (gera sem depender de Word ou internet):
   `node "$HOME/.claude/advogado/scripts/exportar-docx.js" "<peça.md>" "<ESCRITORIO>/EXPORTADOS/<nome>.docx"`
   - Se recusar por citação de jurisprudência sem fonte, **não force**: rode `/verificar-citacoes` e explique ao usuário. Só use `--forcar` se o usuário pedir expressamente, ciente do risco.
   - Fonte, tamanho e recuos vêm de `config.json` → `formatacao` (definidos no /boas-vindas).
3. Alternativa (se o usuário quiser e estiver instalado): `pandoc "<peça.md>" -o "<saida.docx>"`.
4. Informe o caminho do arquivo, lembre que `[NÃO VERIFICADO]` e `[PREENCHER]` saem grifados em amarelo e que a revisão final e a assinatura são do advogado.
