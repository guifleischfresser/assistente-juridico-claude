/goal Avisar quando uma peça cita súmula cancelada ou superada (ideia 5), usando uma lista local embarcada, sem acesso à rede

**Contexto**
Repo guifleischfresser/assistente-juridico-claude, branch `claude/diario-20261112`, criada a partir de origin/main. Leia antes ARQUITETURA.md (§5 Antialucinação, §15 e §19) e CHANGELOG.md (Unreleased).
- Hoje `scripts/lib/citacoes.js` (`analisarCitacoes`) acha as súmulas e consulta o livro de conferências. Esse livro diz se o julgado existe e se o texto bate. Ele não diz se a súmula ainda vale.
- O risco é real: o estudo de Stanford (arxiv 2405.20362) e a multa noticiada pelo Conjur por citar súmula cancelada.

**Objetivo**
`checar-peca` e `exportar-docx` passam a reconhecer citação de súmula do STF, do STJ ou do TST que conste como cancelada ou superada numa lista local embarcada. O advogado vê um aviso em pt-BR simples, por exemplo: "A Súmula 469 do STJ foi cancelada em 2018 (substituída pela 608), segundo a lista local de 12/11/2026. Confirme no site do STJ antes de protocolar."

**Escopo**
1. **Lista de dados:** `scripts/lib/dados/sumulas-canceladas.json`, com `{versao, revisadoEm, itens:[{tribunal, numero, vinculante?, situacao: "cancelada"|"superada", ato?, data?, substituidaPor?, observacao?}]}`.
   - Só entram itens de que você tenha alta certeza; na dúvida, fica de fora.
   - Cancelamento formal vira `cancelada`. Superação sem cancelamento formal (comum no STF) vira `superada`.
   - Âncoras para os testes: STJ 469, cancelada em 2018 e substituída pela 608; STJ 603, cancelada em 2018.
   - Não baixe nada. O nome do arquivo não pode coincidir com os de `dados/` do PR #11 (prenomes.txt e sobrenomes.txt).
2. **Módulo novo `scripts/lib/sumulas.js`** (não editar `citacoes.js`, que o PR #11 altera):
   - `avaliarSumulas(texto, citacoes)` recebe as citações de `analisarCitacoes` e anexa `sumula: {situacao, tribunal, ato, data, substituidaPor, consciente, fonteLista}`.
   - Identificar o tribunal por "do STJ", "/STJ", "do C. STJ", "STF", "TST" e por "Súmula Vinculante" (= STF). Olhar no máximo cerca de 20 caracteres depois da citação.
   - Sem tribunal identificável e com o número cancelado em algum tribunal: só um aviso leve ("confirme de qual tribunal"), sem bloquear.
   - Citação **consciente** não bloqueia. É o caso de "cancelada", "revogada", "superada", "antiga" ou "extinta" na mesma frase, ou da marca `[CITADA COMO HISTÓRICO]` logo depois. Nesses casos sai só uma linha informativa.
   - **Ajuste do escritório:** `ESCRITORIO/WIKI/sumulas-situacao.json` acrescenta itens ou marca `vigente` para anular um falso positivo da lista. Esse ajuste vale mais que a lista embarcada. É público e sem dado de cliente.
3. **`julgados.js sumula`** (reaproveita a regra de permissão `julgados.js *`; instalador e modo plugin sem mudança, com teste que confirma):
   - `sumula consultar "<citação>"`
   - `sumula marcar "<citação>" --vigente|--cancelada|--superada --fonte <url|arquivo>` (a fonte é obrigatória)
   - `sumula listar`
4. **Integrações:**
   - `checar-peca` lista as súmulas canceladas ou superadas com a linha onde aparecem.
   - `exportar-docx` (e o `mapa-teses exportar`, que reaproveita as mesmas funções) **recusa com código 2** a súmula `cancelada`, não consciente e com tribunal identificado. Com `--forcar`, exporta com `[⚠️ SÚMULA CANCELADA]` grifado em vermelho, no mesmo padrão do `[🔴 DIVERGENTE]`. Súmula `superada` só gera aviso.
   - Peça sem súmula na lista gera `document.xml` idêntico ao de hoje (golden em `testes/fixtures/`).
5. **Manutenção e doutor:**
   - O doutor confere se a lista lê sem erro e mostra o número de itens e a data `revisadoEm`. JSON do escritório ilegível vira aviso, e nada é gravado por cima.
   - A manutenção quinzenal avisa quando `revisadoEm` passar de 6 meses ("confira novos cancelamentos"), sem rede.
6. **Textos:**
   - Corpo da skill `verificar-citacoes` (só o SKILL.md e as references). Descrições sempre carregadas inalteradas: contexto fixo continua em **3.869** caracteres.
   - README, `/ajuda` e uma subseção curta em ARQUITETURA §5 (não mexer em §17 nem §19).
   - CHANGELOG: um bloco novo e separado no fim de Unreleased.
   - Todo aviso diz "segundo a lista local de DD/MM/AAAA" e manda confirmar no site do tribunal. Nunca afirmar vigência como certeza.

**Restrições**
- Node puro, sem dependência, sem rede, sem chamada à nuvem.
- Não tocar `scripts/anonimizar.js`, `scripts/lib/anonimizar.js`, `scripts/lib/citacoes.js` nem `skills/anonimizar`.
- Em `testes/rodar-testes.js`, só uma seção nova (12l), com sandbox próprio e uma lista de teste via variável de ambiente, para os testes não dependerem dos dados reais. Fora isso, apenas o sanity com as âncoras STJ 469 e 603.
- Nunca sugerir `--dangerously-skip-permissions` nem `bypassPermissions`.

**Critérios de pronto**
- Testes cobrem:
  - "Súmula 469 do STJ", "Súmula n. 469/STJ" e "Súmula 469 do C. STJ" detectadas.
  - "Súmula 7 do STJ" sem aviso.
  - Número cancelado sem tribunal gera só aviso leve.
  - Citação consciente ("a antiga Súmula 469, cancelada…") e `[CITADA COMO HISTÓRICO]` não bloqueiam.
  - `superada` só avisa.
  - Exportação recusada com código 2; `--forcar` grifa em vermelho.
  - `mapa-teses exportar` recusa da mesma forma.
  - Golden sem mudança em peça sem súmula.
  - Ajuste do escritório `vigente` anula o aviso; `marcar` exige `--fonte`.
  - JSON do escritório ilegível vira aviso, sem gravar nada.
  - Doutor mostra a contagem; manutenção avisa lista com mais de 6 meses (relógio falso).
  - Regra `julgados.js *` presente no instalador e no modo plugin.
  - Teste de limite do contexto fixo continua em ≤ 3.869.
- `node testes/rodar-testes.js` verde, e também com `TZ=America/Sao_Paulo ADVOGADO_TESTE_AGORA=2026-10-28T02:30:00Z`.
- `git diff origin/main --stat` sem nenhum dos arquivos exclusivos do PR #11 listados acima. Em CHANGELOG, ARQUITETURA, README e rodar-testes.js, só acréscimos em blocos separados.
- Commit (fim da mensagem: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), push de `claude/diario-20261112` e PR com `gh`, em pt-BR.
  - O PR explica: o problema (súmula cancelada e multa), o comportamento, como o escritório corrige um falso positivo, os limites (lista curada à mão, data de revisão, OJs do TST fora por enquanto) e os testes rodados.
  - Termina com "Escrito com Claude Code" e `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Nunca fazer merge, tag ou release.


Correção do orquestrador: o PR #11 já usa a seção de testes 12l; use 12m para a seção nova. Não use bypass de permissões.
