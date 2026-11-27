essas são as coisas que eu achei hoje de gente fazendo, qual você acha que vale a implementação, escolha uma delas, orquestre a implementação e me devolva um prompt com objetivos /goal

Repo: guifleischfresser/assistente-juridico-claude (este checkout, branch claude/diario-20261113 a partir de origin/main). Leia ARQUITETURA.md (§19 Roadmap) e CHANGELOG.md para não repetir o que já existe.

Ideias de hoje:
1. Proteção de CLAUDE.md/AGENTS.md (@hyu001225): esses arquivos não estão entre os protegidos do Claude Code; uma regra deny de Edit bloqueia reescrita até em modo automático. Conferir se instalador/modo plugin protege o CLAUDE.md global, AGENTS.md gerado e skills do escritório contra reescrita silenciosa (deny estreito + guarda de escrita que pede confirmação ao advogado), com testes.
2. Claude Desktop v4.23118.1: skills em .claude/skills de subpasta não carregam com sandbox ligado; solução oficial é iniciar a sessão na própria pasta. Incluir no diagnóstico do SessionStart um aviso em pt-BR simples quando a sessão foi aberta fora da pasta do caso/escritório e as skills do mod não estariam disponíveis.
3. Hooks com onFailure: "block" (CC ≥2.1.295): as guardas críticas (texto oculto, dado de cliente, erro bloqueado) falham fechadas quando o hook quebra, o resto continua fail-open; com detecção de versão.
4. Statusline opcional para o advogado: caso aberto, se está anonimizado, consentimento, sem rede.
5. LGPD (@dailymonologo, advogados mandando dados de clientes para agentes): resumo "o que sai da máquina" por caso, listando quais arquivos do caso já foram lidos pela sessão e se havia cópia anonimizada disponível, só local.

Restrições:
- Escolha UMA. Há dois PRs abertos que NÃO podem conflitar: #11 mexe em scripts/anonimizar.js, scripts/lib/anonimizar.js, scripts/lib/citacoes.js, skills/anonimizar; #12 mexe em scripts/checar-peca.js, scripts/doutor.js, scripts/exportar-docx.js, scripts/julgados.js, scripts/manutencao.js, scripts/mapa-teses.js, skills/ajuda/SKILL.md, skills/verificar-citacoes. Evite esses arquivos. Ambos tocam testes/rodar-testes.js, CHANGELOG.md, ARQUITETURA.md e README.md: se tocar, mantenha mudança pequena em seção nova separada (nova seção de testes no fim, entrada própria no CHANGELOG).
- Descrições de skills sempre carregadas enxutas (não aumentar o contexto fixo sem necessidade forte).
- Dados de cliente locais e por caso; nada de chamada à nuvem sem pedido explícito do usuário; Node puro, sem baixar dependência ou dados da internet.
- Nunca sugerir --dangerously-skip-permissions nem bypassPermissions.
- Testes têm que passar (node testes/rodar-testes.js), inclusive com TZ=America/Sao_Paulo.
- Ao final, commit, push da branch e PR com gh em pt-BR (dizer que foi escrito com Claude Code). Nunca merge, tag ou release.

Devolva APENAS o prompt /goal (objetivo, escopo, critérios de pronto), pronto para eu te mandar de volta para execução.
