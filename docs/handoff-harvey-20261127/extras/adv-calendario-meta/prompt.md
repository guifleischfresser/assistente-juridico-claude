Você está no repositório público (MIT) guifleischfresser/assistente-juridico-claude, worktree /workspace/adv-calendario, branch claude/calendario-forense-v070 (criada de origin/main c05977c, release atual v0.6.0). Implemente a versão v0.7.0: CALENDÁRIO FORENSE LOCAL — feriados estaduais/municipais e suspensões por tribunal/comarca (Roadmap item 6 em ARQUITETURA.md §16). Todo texto voltado ao advogado em pt-BR.

REGRAS DURAS
- NÃO faça push, NÃO abra PR, NÃO faça merge, tag ou release. Apenas faça commits locais na branch atual (mensagens em pt-BR). Eu (orquestrador) faço push e PR.
- Nenhuma chamada de rede no produto. Tudo local.
- O produto NUNCA deve sugerir --dangerously-skip-permissions nem bypassPermissions ao usuário (nem em docs, nem em skills, nem em mensagens).
- Não imprima segredos.
- Não altere release/estavel.json nem gere zip de release (isso é feito só na hora da tag). Se a suíte exigir versão consistente (package/plugin manifests, CHANGELOG), suba a versão para 0.7.0 de forma coerente com o que versões anteriores fizeram no commit de feature (veja o histórico: `git show 4a4df46 --stat` foi a feature da v0.6.0; `b81d901` foi a fixação do release — NÃO repita esta segunda parte).

CONTEXTO ATUAL (verifique lendo o código)
- scripts/lib/prazos.js: feriados nacionais (Páscoa móvel, Carnaval, Cinzas, Sexta Santa, Corpus Christi), recesso art. 220 (20/12–20/01), aceita `extras` = config.feriadosExtras como lista global plana ["MM-DD"|"AAAA-MM-DD"]; diasUteisAte prorroga vencimento em dia não útil (art. 224 §1º).
- scripts/prazos.js: listar/calcular/util; imprime aviso genérico "Confira feriados locais, suspensões do tribunal...".
- skills/prazos/SKILL.md manda gravar em feriadosExtras.
- statusline.js e sessao-inicio.js mostram o próximo prazo (usam lib/prazos); doutor.js tem checagens; instalar.js tem SCRIPTS_CLI e regras de permissão estreitas por script (regrasScripts()); scripts/processo.js e lib/casos.js: cada caso tem pasta e ficha do processo (/processo, v0.5).
- Testes: testes/rodar-testes.js (suíte ponta a ponta, sem dependências), testes/simular-bootstrap.js; ferramentas/sincronizar-bootstrap.js --verificar; validador do kit em scripts/lib/validar.js (veja como é rodado na suíte/doutor). CI em .github/workflows/release.yml roda em ubuntu, macos e windows (PowerShell 5.1 com instalar.ps1 -Silencioso + doutor).

O QUE O ADVOGADO VÊ
1. Ao cadastrar/calcular um prazo, o assistente usa o calendário do tribunal/comarca DAQUELE caso, não uma lista global. Ex.: "Prazo de 15 dias úteis no TJPR, comarca de Curitiba: vence 12/11/2026 (considerei o feriado municipal X e a suspensão da Portaria Y)". A saída do cálculo deve listar quais entradas locais foram consideradas (data, motivo, fonte).
2. Comando no /prazos (subcomando, ex. `feriado`/`suspensao` → script `prazos.js calendario adicionar ...`) para registrar feriado ou suspensão: data única ou intervalo (de–até), escopo (tribunal, comarca, ou ambos), tipo (feriado | suspensao | indisponibilidade), motivo e FONTE (link ou nº de portaria/lei). Ex.: "suspensão de prazos no TJPR de 04 a 06/11 por indisponibilidade do sistema, Portaria nº ...". Também `listar`, `remover` (por id), e ver calendário ativo de um tribunal/comarca.
3. Ao registrar novo feriado/suspensão, o script lista quais prazos existentes (PRAZOS.md e/ou casos) mudam de vencimento (antes → depois) e PEDE CONFIRMAÇÃO antes de reescrever: padrão é modo simulação (só mostra); só grava com flag explícita (ex. `--confirmar`) que a skill só usa depois do "sim" do advogado. Sem a flag, nada é escrito em PRAZOS.md nem no calendário? — decida: a entrada do calendário pode ser gravada, mas a reescrita de vencimentos SÓ com --confirmar; documente. Para recalcular é preciso saber o termo inicial e nº de dias do prazo: se a linha de PRAZOS.md não tiver esses dados, guarde-os em formato retrocompatível (ex. coluna origem ou um campo/arquivo auxiliar) quando o prazo for cadastrado via cálculo; prazos sem dados de cálculo só podem ser reavaliados pela prorrogação do art. 224 §1º (vencimento caindo em dia não útil) — mostre isso.
4. statusline e SessionStart continuam mostrando o próximo prazo, agora com o vencimento correto (calendário do caso/tribunal/comarca, com prorrogação).

REQUISITOS TÉCNICOS
- Arquivo local do calendário do usuário, ex. ~/.claude/advogado/calendario.json (respeite CLAUDE_CONFIG_DIR como o resto do código faz, use os helpers de lib/comum.js). Formato versionado, ex.: {"versao":1,"entradas":[{"id","tipo","inicio":"AAAA-MM-DD","fim":"AAAA-MM-DD","recorrente":bool (MM-DD anual),"escopo":{"tribunal":"TJPR","comarca":"Curitiba"} ou "global","motivo","fonte","semFonte":bool,"criadoEm"}]}. Normalize nomes (case/acentos) para comparar tribunal/comarca.
- NÃO embuta listas inventadas de feriados estaduais/municipais. Semente apenas com entradas que tenham fonte verificável citada no próprio arquivo (se não tiver certeza absoluta da fonte, deixe a semente vazia — é aceitável e preferível). Tudo o mais o advogado cadastra com fonte.
- Entrada sem fonte só é aceita marcada [SEM FONTE] (semFonte:true) e é sinalizada no cálculo ("⚠️ considerei X [SEM FONTE] — confirme").
- Associe tribunal/comarca ao caso (ex.: na ficha do processo / metadados do caso usados por /processo e lib/casos.js; campos `tribunal` e `comarca`). O cálculo usa o caso para escolher o calendário; também aceite `--tribunal`/`--comarca` diretos. Regras de escopo: entrada global vale para todos; entrada só com tribunal vale para todas as comarcas daquele tribunal; entrada com tribunal+comarca (ou só comarca) vale apenas para aquela comarca. Feriado municipal de Curitiba NÃO afeta comarca de Londrina.
- Retrocompatível: config.feriadosExtras continua funcionando. Migre para entradas de escopo "global" sem perda de dados (idempotente; não duplica ao reinstalar; mantenha feriadosExtras no config ou marque como migrado — sem perder nada). Reinstalar NÃO apaga o calendário do usuário; desinstalar PRESERVA calendario.json (como preserva os demais dados). As funções antigas de lib/prazos.js (calcularVencimento(inicio,dias,extras), ehDiaUtil, diasUteisAte, feriados) devem manter assinatura/compatibilidade; acrescente parâmetro opcional de calendário/contexto.
- Intervalos (suspensão de várias datas) e prorrogação para o próximo dia útil quando o vencimento cai em suspensão/indisponibilidade (CPC art. 224 §1º). Durante suspensão os dias não contam. NÃO mude regras de dias corridos/rito: mantenha o aviso para JEC/trabalhista/penal (penal conta dias corridos, não usar o script).
- Doutor mostra calendário ativo e contagem de entradas (ex.: "Calendário forense: N entradas (X sem fonte)"), sem falhar se o arquivo não existir; detecta JSON inválido como aviso com conserto.
- CONTEXTO FIXO: as descrições sempre carregadas (frontmatter description das skills) NÃO podem crescer. Medição atual: `node scripts/manutencao.js medir --pasta skills` → TOTAL contexto fixo 3543 caracteres; skill prazos descrição 171. Depois da mudança o total deve ser ≤ 3543 (idealmente a descrição de prazos igual ou menor). Detalhes vão em skills/prazos/references/calendario.md (divulgação progressiva); o corpo do SKILL.md apenas aponta para a referência. Rode o medir antes e depois e escreva os números em /workspace/adv-calendario-meta/medicao.txt (fora do repo).
- Nova permissão: se criar script novo, adicione regra de permissão estreita como nas versões anteriores (SCRIPTS_CLI/regrasScripts em instalar.js e o que mais o validador/doutor/testes exigirem). Preferível reutilizar scripts/prazos.js com subcomando (sem script novo) — se for assim, confira que a regra existente cobre.
- Não quebre Windows: caminhos com path.join, sem dependências npm, Node 20, sem shell-specific. Fim de linha: respeite .gitattributes.
- Se mudar INSTALAR.md ou arquivos gerados pelo sincronizar-bootstrap, rode `node ferramentas/sincronizar-bootstrap.js` e depois `--verificar`.

TESTES (em testes/rodar-testes.js, no estilo dos existentes, com HOME/CLAUDE_CONFIG_DIR temporários):
 a) feriado municipal afeta só a comarca certa (Curitiba x Londrina, mesmo TJPR);
 b) suspensão por intervalo (ex. 04–06/11) empurra o vencimento corretamente;
 c) vencimento que cai em suspensão/indisponibilidade prorroga para o próximo dia útil;
 d) migração de feriadosExtras para escopo global (sem perda, idempotente, reinstalação não apaga calendário; desinstalação preserva);
 e) recálculo ao cadastrar entrada lista prazos afetados (antes → depois) e NÃO escreve PRAZOS.md antes de --confirmar; com --confirmar escreve;
 f) entrada sem fonte é marcada [SEM FONTE] e sinalizada no cálculo;
 g) statusline/SessionStart mostram o vencimento correto considerando o calendário;
 h) doutor mostra contagem de entradas;
 i) contexto fixo ≤ 3543 (pode ajustar o teste existente de ≤3600 ou acrescentar um).
Rode TODA a suíte: `node testes/rodar-testes.js`, `node ferramentas/sincronizar-bootstrap.js --verificar`, `node testes/simular-bootstrap.js --shell bash`, e o validador do kit (descubra como é rodado). Tudo deve passar.

DOCUMENTAÇÃO (pt-BR)
- CHANGELOG.md: entrada v0.7.0 no estilo das anteriores (inclua o contexto fixo antes → depois).
- ARQUITETURA.md: nova seção "## 16. v0.7: calendário forense local" (ou o número seguinte, renumerando o Roadmap para §17) descrevendo formato, escopos, migração, fontes, prorrogação, confirmação; Roadmap atualizado (item 6 concluído/removido; renumere).
- README.md: seção curta sobre o calendário forense com exemplo de uso.
- skills/prazos/SKILL.md: troque a instrução de feriadosExtras pelo novo fluxo (apontando para references/calendario.md); sempre pedir fonte; mostrar antes→depois e pedir confirmação antes de --confirmar.

Ao terminar: faça commit(s) locais e escreva um resumo final com arquivos alterados, resultados dos testes e a medição antes/depois.
