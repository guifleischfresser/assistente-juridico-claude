# Registro local "o que sai da máquina" por caso (LGPD) — ideia @dailymonologo

## Objetivo
Dar ao advogado, caso a caso, um resumo honesto do que a sessão do Claude Code já leu da pasta do caso (e, portanto, foi enviado ao modelo), e se havia cópia anonimizada disponível naquele momento. Tudo local, na pasta do caso, sem rede. Complementa a /anonimizar (§17) e a /consentimento (§18).

Repo: guifleischfresser/assistente-juridico-claude, branch claude/diario-20261113 (a partir de origin/main). Antes de codar, leia ARQUITETURA.md (§3, §8, §17, §18, §19) e CHANGELOG.md (Unreleased) e reaproveite o que já existe: c.lerSessao/lidos, casosTocados em pos-ferramenta.js, avisos do consentimento, utilitários de lib/casos.js.

## Escopo
1. Registro (só acréscimo) em `<caso>/_saida/registro.jsonl`, gravado pelo hook PostToolUse (scripts/pos-ferramenta.js, num bloco try/catch próprio e fail-open). Uma linha por evento:
   - data/hora local; id curto da sessão; ferramenta (Read, NotebookRead, Grep, Bash/PowerShell quando o comando cita um caminho do caso, mcp__*, WebFetch/WebSearch com caso aberto);
   - caminho RELATIVO ao caso (nunca conteúdo, trecho ou hash do texto);
   - tipo: `original` | `copia-anonimizada` | `derivado` (autos-md, HANDOFF, DOSSIE, peças);
   - se o caso tinha anonimização ligada e se existia cópia anonimizada daquele arquivo na hora;
   - estado do consentimento na hora (autorizado / sem registro / revogado / exige anonimização).
   Só LÊ o estado de anonimização e consentimento pelas funções já exportadas (require); NÃO altera scripts/lib/anonimizar.js nem scripts/anonimizar.js. Deduplicar o mesmo arquivo na mesma sessão (1 linha por arquivo/sessão/tipo). Arquivo estragado: não grava por cima, registra em log e segue. Bash é heurístico: documentar o limite.
2. Novo `scripts/saida.js` (+ `scripts/lib/saida.js`), Node puro:
   - `resumo <caso> [--desde AAAA-MM-DD] [--json]`: mensagem pt-BR simples, ex.: "Neste caso, o assistente já leu 14 arquivos em 3 conversas. 9 eram cópias anonimizadas. 5 eram originais: 2 deles tinham cópia anonimizada disponível (contrato.pdf, inicial.pdf). Nenhum arquivo foi enviado pela internet além da conversa com o Claude. Consentimento: autorizado por escrito em 29/10/2026." Lista agrupada por tipo, com destaque para "original lido havendo cópia anonimizada" e "lido sem consentimento registrado / após revogação".
   - `estado` (todos os casos: só contagens, sem nomes);
   - `exportar <caso>` gera `<caso>/_saida/resumo-AAAA-MM-DD.md` para anexar ao dossiê ou mostrar ao cliente.
   A saída nunca traz CPF/CNPJ/processo/nome real. Em caso anonimizado, nomes de arquivo que contenham dado da tabela aparecem com o marcador (fazer a troca no lib/saida.js, consultando a tabela só em memória e sem imprimi-la).
3. Guardas: a guarda-escrita recusa editar ou apagar `_saida/registro.jsonl` à mão e copiar o conteúdo dele para memória/CLAUDE.md/skills (mesmo padrão do 0b do consentimento). Bloco novo e pequeno.
4. Permissões: regra estreita `Bash/PowerShell(node "…/saida.js" *)` no instalador e no modo plugin; o desinstalador remove a regra e nunca toca `_saida/`.
5. Onde aparece, sem skill nova (o contexto fixo continua em 3.869 caracteres):
   - `/processo abrir` mostra uma linha ("Já li 5 originais deste caso; 2 tinham cópia anonimizada. Detalhes: 'o que saiu da máquina?'");
   - referências `skills/consentimento/references/` e `skills/processo/` (corpo/references, nunca a description) ensinam a responder "o que já foi enviado pro Claude deste caso?";
   - AGENTS.md gerado (agentes.js) e CLAUDE.md global com uma linha cada, se couber no limite.

## Fora do escopo / não tocar
- PR #11: scripts/anonimizar.js, scripts/lib/anonimizar.js, scripts/lib/citacoes.js, skills/anonimizar/**.
- PR #12: scripts/checar-peca.js, doutor.js, exportar-docx.js, julgados.js, manutencao.js, mapa-teses.js, skills/ajuda/SKILL.md, skills/verificar-citacoes/**. (Por isso: sem integração com o doutor nem com o /ajuda neste PR; anotar como pendência no corpo do PR.)
- Nada de nuvem, telemetria, download ou dependência nova. Não bloquear leitura nenhuma: é registro e aviso, fail-open.
- Nunca sugerir --dangerously-skip-permissions nem bypassPermissions.

## Arquivos compartilhados (mudança mínima, em seção nova)
- testes/rodar-testes.js: seção NOVA no fim (ex.: "12l. O que sai da máquina (LGPD)"), com sandbox próprio, sem mexer nas seções existentes.
- CHANGELOG.md: entrada própria em Unreleased, depois das existentes.
- ARQUITETURA.md: novo §20 ("Registro do que sai da máquina") + 1 item no §19 se fizer sentido; não reescrever as seções existentes.
- README.md: um parágrafo curto em seção própria.

## Critérios de pronto
- Testes da seção nova cobrindo: Read de original sem anonimização; Read de original com cópia anonimizada disponível (destacado); Read da cópia; Grep e Bash citando o caso; dedup na mesma sessão e nova linha em outra sessão; consentimento ausente/revogado/exige anonimização refletido no evento; registro corrompido não é sobrescrito; arquivo de outro caso não vaza para este; `resumo` sem dado de cliente (CPF, CNPJ, CNJ, nome do DOSSIE) e com marcador em caso anonimizado; `--json`; `exportar` gera o .md; data local correta às 23h30 em São Paulo; guarda-escrita nega editar o registro e copiar o conteúdo dele; regra de permissão presente no instalador e no modo plugin e removida pelo desinstalador; hook com entrada malformada não quebra (fail-open); contexto fixo das skills continua ≤ 3.869.
- `node testes/rodar-testes.js` verde e `TZ=America/Sao_Paulo node testes/rodar-testes.js` verde, sem regressão nas contagens anteriores (informe o total novo).
- `git diff origin/main --stat` sem nenhum arquivo dos PRs #11/#12 fora da lista compartilhada; conferir com `gh pr diff 11 --name-only` e `gh pr diff 12 --name-only`.
- Commits pequenos (feat / test / docs), push de claude/diario-20261113 e PR com gh em pt-BR: o que faz, mensagem típica para o advogado, limites (Bash heurístico, só o que passa pelos hooks), pendências (doutor e /ajuda depois do #12), plano de teste, e a menção de que foi escrito com Claude Code. NÃO fazer merge, tag nem release.

Nota: as seções 12l e 12m de testes já são usadas pelos PRs #11 e #12; use "12n" para a seção nova.
