---
name: verificar-citacoes
description: "Verificador anti-alucinação: confere se julgados citados existem e se o trecho entre aspas bate com o original. Use para conferir citações/jurisprudência."
argument-hint: "[arquivo]"
---

# Verificar citações

Arquivo: $ARGUMENTS

Princípio: **citação sem fonte é risco profissional** (litigância de má-fé, ofício à OAB). Nunca "confirme de memória". `S="$HOME/.claude/advogado/scripts"`.

1. Relatório: `node "$S/checar-peca.js" "<arquivo>"` e `node "$S/julgados.js" listar "<arquivo>"` (julgado, trecho citado, situação).
2. Para cada julgado ainda **não verificado**, nesta ordem:
   a. **Local primeiro:** `WIKI/raw/` e `WIKI/paginas/` (Grep pelo número), depois os autos (`autos-md/`). Achou o texto original → salve/aponte o arquivo e rode `node "$S/julgados.js" comparar --citacao "<julgado>" --original "<arquivo do original>" --peca "<arquivo>" --fonte "<link ou WIKI/raw/...>"`.
   b. **Internet só com permissão:** veja `node "$S/julgados.js" politica`. Se nenhum site estiver autorizado, **pergunte uma vez** ao advogado (texto pronto no comando). Ele aceitando: `node "$S/julgados.js" autorizar <sites>` (o sistema pede confirmação na tela). Antes de cada consulta: `node "$S/julgados.js" pedir "<julgado>"`. Use WebFetch só nos sites autorizados e só com o número do julgado — nunca nome, CPF ou dado do cliente. Passo a passo e endereços: `references/conferencia-online.md`.
   c. **Não deu para conferir** (sem permissão, site fora do ar, não achou) → ` [NÃO VERIFICADO]`: `node "$S/checar-peca.js" "<arquivo>" --marcar`.
3. Resultado 🔴 (julgado não existe ou trecho diverge): registre (`julgados.js registrar --status inexistente|divergente --fonte ...`), mostre o que muda e proponha corrigir o trecho, remover ou reescrever o argumento. A exportação para Word fica bloqueada até resolver.
4. Legislação: confira existência e vigência (revogações/renumerações) no Planalto quando autorizado.
5. Entregue tabela: julgado | situação (✅ confere / ⚠️ não verificado / 🔴 divergente ou inexistente) | fonte | o que fazer.
