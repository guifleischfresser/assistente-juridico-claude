essas são as coisas que eu achei hoje de gente fazendo, qual você acha que vale a implementação, escolha uma delas, orquestre a implementação e me devolva um prompt com objetivos /goal

Repo: guifleischfresser/assistente-juridico-claude (este checkout, branch claude/diario-20261116 a partir de origin/main). Leia ARQUITETURA.md (§19 Roadmap) e CHANGELOG.md para não repetir o que já existe.

Ideias de hoje:
1. Integridade do mod (incidente: chave vazada permitiu publicar versões adulteradas da extensão Claude Code no marketplace do Cursor, até 5 mil usuários): manifesto local de hashes SHA-256 dos arquivos do mod gerado no release/instalação, comando local que confere e aviso em pt-BR simples no SessionStart quando um script/hook/skill do núcleo foi alterado fora do fluxo. Sem rede.
2. Checklist antes de instalar skill/plugin de terceiros (@francisco_devbr): o advogado cola/baixa uma skill de terceiro e o mod audita antes de instalar (texto oculto e prompt injection — já temos lib/injecao.js —, chamadas de rede, hooks, comandos perigosos, pedidos de bypassPermissions), mostra relatório e só instala com OK.
3. "Se dá pra escrever a regra, vire hook, não linha no CLAUDE.md" (@AISystems_hq): auditar o CLAUDE.md global e o do escritório e apontar regras que já têm guarda em código vs. as que são só texto, sugerindo quais virar guarda.
4. CC 2.1.323: plugin.json com "engines" (versão mínima do Claude Code) e passo de validação do manifesto do plugin nos testes (sem depender do binário claude no CI).
5. MCP Jurídico Brasil (@nikolasdehor1): DataJud + prazo em dias úteis. Já temos prazos locais; DataJud exige rede, então só se for opt-in explícito (Roadmap item 2).

Restrições:
- Escolha UMA. Há três PRs abertos que NÃO podem conflitar:
  #11: scripts/anonimizar.js, scripts/lib/anonimizar.js, scripts/lib/citacoes.js, skills/anonimizar/**.
  #12: scripts/checar-peca.js, doutor.js, exportar-docx.js, julgados.js, manutencao.js, mapa-teses.js, skills/ajuda/SKILL.md, skills/verificar-citacoes/**.
  #13: scripts/agentes.js, guarda-escrita.js, guarda-sigilo.js, instalar.js, lib/saida.js, pos-ferramenta.js, processo.js, saida.js, skills/consentimento/**, skills/processo/SKILL.md, templates/claude-global/CLAUDE.md.
  Evite esses arquivos. Todos tocam testes/rodar-testes.js, CHANGELOG.md, ARQUITETURA.md e README.md: se tocar, mudança pequena em seção nova separada (nova seção de testes no fim, entrada própria no CHANGELOG).
- Descrições de skills sempre carregadas enxutas (não aumentar o contexto fixo sem necessidade forte).
- Dados de cliente locais e por caso; nada de chamada à nuvem sem pedido explícito do usuário; Node puro, sem baixar dependência ou dados da internet.
- Nunca sugerir --dangerously-skip-permissions nem bypassPermissions.
- Testes têm que passar (node testes/rodar-testes.js), inclusive com TZ=America/Sao_Paulo.
- Ao final, commit, push da branch e PR com gh em pt-BR (dizer que foi escrito com Claude Code). Nunca merge, tag ou release.

Devolva APENAS o prompt /goal (objetivo, escopo, critérios de pronto), pronto para eu te mandar de volta para execução. Máximo 3.800 caracteres (o /goal tem limite de 4.000).
