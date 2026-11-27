essas são as coisas que eu achei hoje de gente fazendo, qual você acha que vale a implementação, escolha uma delas, orquestre a implementação e me devolva um prompt com objetivos /goal

Repo: guifleischfresser/assistente-juridico-claude (este checkout, branch claude/diario-20261112 a partir de origin/main). Leia ARQUITETURA.md (§19 Roadmap) e CHANGELOG.md para não repetir o que já existe.

Ideias de hoje:
1. Proteção de CLAUDE.md/AGENTS.md: post (@hyu001225) diz que CLAUDE.md e AGENTS.md não estão entre os arquivos protegidos do Claude Code e que uma regra deny de Edit bloqueia reescrita até em bypass. Conferir se o instalador/modo plugin do mod já protege o CLAUDE.md global, o AGENTS.md gerado e as skills do escritório contra reescrita silenciosa (deny estreito + guarda de escrita), e cobrir com testes.
2. Regras contraditórias acumuladas (@namcios) e paper ETH dizendo que arquivos de instrução longos custam ~20% a mais sem ganho: no `doutor`/manutenção quinzenal, detectar regras contraditórias ou duplicadas entre CLAUDE.md global, MEMORIA e lições do /erros, e avisar (sem apagar nada).
3. Hooks com onFailure: "block" (CC 2.1.295): avaliar se as guardas críticas do mod (texto oculto, dado de cliente, erro bloqueado) devem falhar fechadas quando o hook quebra, mantendo o resto fail-open; com detecção de versão.
4. Statusline (claudecode-statusline): linha de status opcional para o advogado mostrando o caso aberto, se está anonimizado, consentimento, e limite 5h/semanal com reset, sem rede.
5. Alucinação de jurisprudência (@tretasjuridicas, estudo Stanford arxiv 2405.20362, Conjur multa por súmula cancelada): reforçar a conferência de julgados para súmula cancelada/superada (lista local de súmulas canceladas do STF/STJ/TST embarcada, sem rede) no checar-peca e exportar-docx.
6. Roadmap item 9, parte 2: cópia anonimizada direto em .docx (`anonimizar.js aplicar --docx`). ATENÇÃO: o PR #11 aberto mexe em scripts/anonimizar.js, scripts/lib/anonimizar.js, scripts/lib/citacoes.js, testes/rodar-testes.js, ARQUITETURA.md, CHANGELOG.md, README.md, skills/anonimizar; essa ideia provavelmente conflita, prefira outra.

Restrições:
- Escolha UMA. Evite conflito com o PR #11 aberto (arquivos acima); se tocar testes/rodar-testes.js/CHANGELOG/ARQUITETURA, mantenha a mudança em seção separada e pequena.
- Descrições de skills sempre carregadas enxutas (contexto fixo hoje 3.869 caracteres; não aumentar sem necessidade forte).
- Dados de cliente locais e por caso; nada de chamada à nuvem sem pedido explícito do usuário; Node puro, sem baixar dependência ou dados da internet.
- Nunca sugerir --dangerously-skip-permissions nem bypassPermissions.
- Testes têm que passar (node testes/rodar-testes.js), inclusive com TZ=America/Sao_Paulo.
- Ao final, commit, push da branch e PR com gh em pt-BR (dizer que foi escrito com Claude Code). Nunca merge, tag ou release.

Devolva APENAS o prompt /goal (objetivo, escopo, critérios de pronto), pronto para eu te mandar de volta para execução.
