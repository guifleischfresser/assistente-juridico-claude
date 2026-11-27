/goal Anonimização: reconhecer nomes sem rótulo com um dicionário local de prenomes/sobrenomes (Roadmap item 9, parte 1)

## Objetivo
Hoje lib/anonimizar.js (detectar/DETECTORES_NOME/limparNome) só acha nome depois de um papel processual ("Autor: …"), antes da qualificação ("…, brasileiro") ou com sufixo de PJ. Um nome solto no meio do texto ("conversei com Maria Aparecida Souza ontem") escapa e vai em claro para a API. Acrescentar um detector que reconheça pessoa física pela combinação prenome conhecido + sobrenome(s) conhecido(s), em Title Case ou CAIXA ALTA, usando um dicionário embarcado no repositório, em Node puro e sem rede.

## Escopo
1. Dicionário em scripts/lib/dados/ (ex.: prenomes.txt e sobrenomes.txt; um por linha, sem acento na chave, comparação por dobrar()). Lista curada com os prenomes e sobrenomes mais frequentes no Brasil (alguns milhares no total, ≤ 100 KB). NÃO baixar o dataset do IBGE nem nada da internet sem me pedir antes. Se achar que vale, proponha a fonte e espere o meu "sim".
2. Detector novo em lib/anonimizar.js, chamado por detectar():
   - um candidato = 1º token no dicionário de prenomes + ≥ 1 token seguinte em sobrenomes (ou prenome composto + sobrenome), com os conectores já aceitos (da/de/do/dos/das/e); não atravessa linha; não pega um prenome sozinho.
   - exclusões para não quebrar o que funciona: nome depois de Rel./Min./Ministro(a)/Des./Desembargador(a)/Juiz(a)/Relator(a), inclusive dentro de uma citação de julgado reconhecida por lib/citacoes; nome de lei ou instituto ("Lei Maria da Penha"); lugares ("São José", "Santa Catarina"; o NAO_NOME pode ganhar entradas); o próprio advogado (config.nome) e o escritório; trecho que já virou marcador.
   - o resultado entra no fluxo atual (tabela, formas, [PARTE_X#n], reverterTexto byte a byte), sem tipo novo de marcador.
3. Opção --sem-dicionario em anonimizar.js aplicar/simular (o padrão é ligado). O resumo separa "N nome(s) achado(s) pelo dicionário — confira na cópia" sem mostrar o nome real.
4. Atualizar skills/anonimizar/references/detalhes.md (o corpo da SKILL.md, só se precisar de uma linha), ARQUITETURA.md §17 e §19 item 9 (marcar a parte 1 como feita e deixar o .docx pendente), CHANGELOG e README/ajuda se citarem limites da detecção.

## Restrições
- A descrição sempre carregada da /anonimizar não muda; o contexto fixo continua ≤ 3.869 caracteres (teste da linha ~508 de testes/rodar-testes.js sem afrouxar).
- Dados de cliente só na pasta do caso; o dicionário não tem dado de cliente. Confirmar que guarda-escrita e guarda-sigilo não barram os arquivos do dicionário e que o instalador, o empacotamento e o modo plugin os levam (git ls-files / pasta scripts/).
- Nenhuma chamada de rede ou de nuvem sem pedido explícito meu. Nunca sugerir --dangerously-skip-permissions nem bypassPermissions.
- Não mudar o comportamento dos detectores existentes nem o formato de tabela.json (versao 1 compatível).
- Desempenho: um texto de 3 MB processado em menos de 2 s a mais que hoje (lookup por Set, sem regex gigante).

## Critérios de pronto
- Nova seção 12l em testes/rodar-testes.js cobrindo:
  - nome solto em Title Case e em CAIXA ALTA detectado e anonimizado;
  - prenome sozinho não detectado;
  - "Rel. Min. Nancy Andrighi" e o relator dentro de um REsp citado intactos;
  - "Lei Maria da Penha", "São José" e "Santa Catarina" intactos;
  - config.nome intacto;
  - reverterTexto(anonimizarTexto(x)) === x byte a byte, com NFD e CRLF;
  - --sem-dicionario reproduz exatamente a saída anterior;
  - o mesmo nome com e sem rótulo vira o mesmo [PARTE_X];
  - guarda-escrita aceita o dicionário;
  - instalador e plugin incluem os arquivos.
- `node testes/rodar-testes.js` com 0 falha (todas as seções antigas passando sem alteração de expectativa).
- Commits em claude/diario-20261111 e PR aberto com gh pr create contra main, descrevendo a cobertura, as exclusões e os limites conhecidos (falsos negativos de nomes raros). Não fazer merge, tag nem release.
