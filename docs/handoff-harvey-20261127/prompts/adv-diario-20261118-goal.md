/goal Implementar a segunda passada local de anonimização com Ollama (ideia 1), opt-in, sobre o fluxo existente da `/anonimizar` (ARQUITETURA §17, Roadmap 9).

Orquestração:
1. Faça `git fetch` e confirme a branch `claude/diario-20261118` a partir de origin/main.
2. Leia §17, §19, `scripts/lib/anonimizar.js` e `scripts/anonimizar.js`.
3. Implemente.
4. Rode `node testes/rodar-testes.js` e o que o CI roda, inclusive o job `testes-fuso`.
5. Peça uma revisão a um agente novo (contexto limpo, que não escreveu o código) com `/code-review`. Corrija o que ele achar.
6. Abra o PR.

Escopo (só estes arquivos): novo `scripts/lib/ollama.js`; mudanças pequenas em `scripts/lib/anonimizar.js` e `scripts/anonimizar.js`; testes em `testes/` e em `rodar-testes.js` (seção nova, próxima letra livre depois das existentes); `skills/anonimizar/references/detalhes.md`; ARQUITETURA (§17.7 e Roadmap 9); CHANGELOG. Não toque nos arquivos do PR #15: doutor, instalar, integridade, comum, diagnostico, memoria, sessao-inicio, guarda-escrita, ajuda, consertar, empacotar. Não mude a descrição da skill (157 caracteres) nem o contexto fixo.

Comportamento:
- A flag `--ia-local` (com `--modelo`, `--porta` opcionais) vale em `preparar`, `aplicar` e `simular`. Sem a flag, a saída é idêntica à de hoje, byte a byte.
- Ordem: primeiro as regras determinísticas existentes (CPF, CNPJ, OAB, RG, telefone, e-mail, CEP, processo, dicionário). Depois o Ollama, só sobre o texto restante, para nomes sem rótulo, endereços e razões sociais.
- Rede: `lib/ollama.js` usa só `http` do Node, com host fixo `127.0.0.1` ou `::1`. Qualquer outro host (variável `OLLAMA_HOST`, flag ou redirecionamento) é recusado antes de abrir conexão. Sem dependências, sem HTTPS externo, sem telemetria. Timeout e limite de tamanho por trecho, com o texto em pedaços.
- Ollama ausente, parado ou sem o modelo: continua só com as regras e avisa em pt-BR simples ("IA local indisponível; usei só as regras. Para ligar: instale o Ollama e baixe um modelo."). Código 0, nunca falha.
- Resposta do modelo em JSON `{tipo,texto}`. É tratada como não confiável. Descarte tudo que não aparece literalmente no texto, que sobrepõe achado das regras, que é magistrado, tribunal ou o próprio escritório (mesmas exclusões do dicionário), que tem tamanho absurdo ou que não é JSON válido. O que passar entra na tabela com `origem: "ia-local"`, que um rótulo, o DOSSIE ou `--nome` confirmam e apagam. A tabela continua `versao: 1`.
- O resumo de `aplicar` e `simular` diz "N achado(s) pela IA local — confira a prévia" (só contagem, nunca o nome). O advogado continua revisando a prévia do `simular`. A frase "a detecção não é perfeita" continua.
- O texto real só vai para o localhost, quando o usuário liga. Nada é gravado em log. Nenhuma instrução de `--dangerously-skip-permissions` nem de `bypassPermissions`.
- `reverterTexto(anonimizarTexto(x))` continua idêntico a `x`.

Testes (sem Ollama real): servidor falso em `127.0.0.1:0` dentro do teste, para estes casos:
- resposta válida;
- porta fechada (aviso, só regras);
- JSON quebrado;
- trecho alucinado (descartado);
- trecho sobreposto às regras;
- magistrado;
- timeout;
- host não-loopback recusado, sem nenhuma conexão (provar com um segundo servidor falso que nunca recebe requisição);
- ida e volta byte a byte;
- sem `--ia-local` a saída é igual à anterior;
- dado real não aparece no resumo;
- idempotência entre `simular` e `aplicar`.

Pronto quando: todos os testes passam, inclusive com `TZ=America/Sao_Paulo`. O diff não tem nenhum arquivo do PR #15. O CHANGELOG e a ARQUITETURA estão atualizados (Roadmap 9 com a parte 2 feita e o `.docx` ainda pendente). A revisão do agente independente está sem pendências. O PR está aberto com `gh pr create --base main`, descrição em pt-BR e o resultado dos testes. Não faça merge, tag nem release.