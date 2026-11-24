---
name: verificar-citacoes
description: "Verificador anti-alucinação: confere se julgados citados existem e se o trecho entre aspas bate com o original. Use para conferir citações/jurisprudência."
argument-hint: "[arquivo]"
---

# Verificar citações

Arquivo: $ARGUMENTS

Princípio: **citação sem fonte é risco profissional** (litigância de má-fé, ofício à OAB). Nunca "confirme de memória". `S="$HOME/.claude/advogado/scripts"`.

1. **Com peça:** rode `node "$S/checar-peca.js" "<arquivo>"` e `node "$S/julgados.js" listar "<arquivo>"`. Identifique cada afirmação sobre o que o tribunal decidiu, inclusive as paráfrases e as que já têm registro de conferência.
   **Pesquisa sem peça:** use a pergunta ou a tese para localizar julgados candidatos. Examine o que cada um decidiu antes de apresentá-lo como precedente. Nos dois fluxos, aplique a mesma [regra de evidência](references/conferencia-online.md#evidência-para-cada-afirmação).
2. **Local primeiro:** procure na `WIKI/raw/` e na `WIKI/paginas/` pelo número ou tema e depois nos autos (`autos-md/`). Abra o texto original e confira a identificação, a passagem visível e seu contexto. Com peça, use `node "$S/julgados.js" comparar --citacao "<julgado>" --original "<arquivo do original>" --peca "<arquivo>" --fonte "<link ou caminho local>"` para a comparação de citações. O registro de localização sem trecho só comprova que o julgado foi localizado.
   - Rede ou nuvem só após pedido explícito do advogado, conforme `julgados.js politica`, as permissões de domínio e a autorização distinta para busca aberta. Com `verificacaoOnline: "nunca"`, trabalhe só local. Siga `references/conferencia-online.md`. Dados de clientes ficam na pasta do caso, fora da WIKI e das consultas.
   - Para cada afirmação sustentada, identifique o julgado, aponte a página específica ou o caminho local acessível e copie a frase literal relevante. Identifique qualquer interpretação como tal. Se faltar evidência, diga “não achei fonte verificável para esta afirmação” e mantenha a pendência no relatório. Com peça, use também `node "$S/checar-peca.js" "<arquivo>" --marcar` para as citações que a ferramenta marca como não verificadas.
3. Resultado 🔴 (referência comprovadamente inválida ou trecho divergente): registre (`julgados.js registrar --status inexistente|divergente --fonte ...`), mostre o que muda e proponha corrigir o trecho, remover ou reescrever o argumento. A exportação para Word fica bloqueada até resolver.
3b. **Súmula cancelada/superada** (lista local, sem internet): seção própria no `checar-peca`; uma a uma: `julgados.js sumula consultar "Súmula 469 do STJ"`. Fale sempre "segundo a lista local de DD/MM/AAAA" e "confirme no site do tribunal"; nunca afirme vigência. Cancelada **bloqueia o Word**: proponha a substituta ou rever a tese; se for histórica de propósito, `[CITADA COMO HISTÓRICO]` logo depois. Falso positivo: `sumula marcar` (`--fonte` obrigatória) — `references/sumulas-canceladas.md`.
4. Legislação: confira existência e vigência (revogações/renumerações) no Planalto quando autorizado.
5. Entregue uma linha por afirmação conforme o [formato da resposta](references/conferencia-online.md#formato-da-resposta).
