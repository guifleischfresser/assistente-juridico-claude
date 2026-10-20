# Conferência de julgados na internet (só com permissão do advogado)

## Regra de ouro
Nada sai do computador sem o advogado pedir. A guarda de sigilo **pergunta na tela** antes de qualquer acesso a site que ele não autorizou, e **bloqueia** buscas com nome, CPF, CNPJ ou número de processo do cliente. Com `"verificacaoOnline": "nunca"` no `config.json`, a internet fica desligada de vez — tudo vira `[NÃO VERIFICADO]` se não estiver na WIKI.

## Autorização (uma vez)
Pergunte: *"Posso conferir os julgados direto nos sites oficiais dos tribunais (STF, STJ, TST, TJs/TRFs/TRTs em jus.br) e no JusBrasil? Só o número do julgado vai na consulta; nada do cliente sai do computador."*
- Sim → `node "$S/julgados.js" autorizar stf.jus.br stj.jus.br tst.jus.br jus.br jusbrasil.com.br` (a tela pede confirmação).
- Só alguns → autorize só esses. Não → trabalhe só local.
- Busca aberta na web (WebSearch) é outra autorização: `julgados.js autorizar busca`. Sem ela, cada busca pergunta.
- Desfazer: `julgados.js desautorizar <site|busca>`.

## Conferir um julgado
1. `julgados.js pedir "REsp 1.234.567/SP"` (libera o número desse julgado na guarda de sigilo; números de processo comuns continuam bloqueados).
2. WebFetch na página oficial (pesquisa de jurisprudência do tribunal ou página do JusBrasil) com o número do julgado.
3. Copie o trecho relevante do original (ementa/voto) para `WIKI/raw/<tribunal>-<classe>-<numero>.md`, com o link no topo.
4. `julgados.js comparar --citacao "<julgado>" --original WIKI/raw/<arquivo>.md --peca "<peça>" --fonte <link>`:
   - ✅ **confere** (≥97% igual) → a citação passa a contar como verificada (sem `[NÃO VERIFICADO]`).
   - 🔴 **divergente** → mostra as palavras do trecho citado que não estão no original; corrija o trecho com o texto exato.
5. Julgado não encontrado nos sites oficiais → `julgados.js registrar --citacao "<julgado>" --status inexistente --fonte <link da busca>` e avise o advogado.

O livro de conferências fica no escritório: `WIKI/julgados-verificados.json` (só números de julgados públicos, sem dados de clientes). Conferido uma vez, vale para todas as peças.

## Ferramenta externa opcional
Quem quiser uma segunda checagem automatizada pode usar o **Basanos** (cognitio.one), serviço externo de verificação de citações. Ele **não** é integrado ao assistente: usar é decisão do advogado, fora do Claude, e só com trechos sem dados de clientes.
