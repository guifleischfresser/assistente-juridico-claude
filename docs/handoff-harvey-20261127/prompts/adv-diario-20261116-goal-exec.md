/goal Implementar a ideia 2: auditoria local de skill/plugin de terceiros antes de instalar, no repo guifleischfresser/assistente-juridico-claude (branch claude/diario-20261116, a partir de origin/main).

OBJETIVO
O advogado baixa ou cola uma skill de terceiro e pede para instalar. O mod copia para quarentena, audita sem executar nada, mostra um relatório em pt-BR simples e só instala com OK explícito. Leia antes ARQUITETURA.md (§4, §7, §13.4, §19) e CHANGELOG.md.

ESCOPO (só arquivos novos, salvo os citados)
1. scripts/lib/auditoria.js + scripts/auditar-skill.js (Node puro, sem rede, sem dependência):
   - `auditar <pasta|SKILL.md|.zip>`: copia para ~/.claude/advogado/quarentena/<id>/ (zip pelo lib/zip.js; recusar zip-slip, symlink, caminho absoluto, arquivo gigante) e grava relatório com o SHA-256 de cada arquivo.
   - Checagens: texto oculto e prompt injection (reusar lib/injecao.js, sem duplicar); rede (curl, wget, fetch, Invoke-WebRequest, URLs, WebFetch, MCP); hooks (hooks.json, settings, frontmatter); comandos perigosos (rm -rf, sudo, curl|sh, eval, base64 -d, PowerShell codificado); leitura de ~/.ssh, .env, credenciais, CASOS/ ou _anonimizacao; pedidos de bypassPermissions, --dangerously-skip-permissions, allowed-tools amplo ou edição de permissões; binários e scripts embutidos; nome que colide com núcleo, auto-* ou reservados (lib/validar.js).
   - Veredito 🟢/🟡/🔴 com arquivo:linha e explicação leiga de cada achado. Dizer sempre que a auditoria é heurística e não garante segurança.
   - `instalar <id> --confirmo`: 🔴 nunca instala (sem --forcar); 🟡 exige --confirmo depois de mostrar o relatório; confere os hashes de novo (se mudou após a auditoria, recusa); instala em ~/.claude/skills com nome que não colida e registra procedência (origem, data local, hashes, veredito) seguindo lib/proveniencia.js.
   - `listar`, `remover <nome>` (move para aposentadas, nada é apagado) e `descartar <id>`.
   - Sem regra nova de permissão: o pedido de permissão do Claude Code faz parte do OK.
2. skills/habilidades/SKILL.md: uma linha para `auditar` e `instalar-terceiro`, com o fluxo em skills/habilidades/references/terceiros.md. Não criar skill nova nem mexer em descrição: contexto fixo continua 3.869 e o teste de limite não muda.
3. Testes: seção nova no FIM de testes/rodar-testes.js (próxima letra livre, sandbox próprio): skill limpa 🟢; uma fixture por tipo de achado; 🔴 não instala; 🟡 sem --confirmo não instala; arquivo alterado após auditar é recusado; zip-slip e symlink; colisão de nome; procedência gravada; nada fora do sandbox; nenhum código da skill executado; contexto fixo 3.869.
4. Docs, pequenas e em seção própria: entrada nova no CHANGELOG (Unreleased), § nova na ARQUITETURA antes do Roadmap, parágrafo curto no README.

NÃO TOCAR (PRs #11, #12, #13 abertos)
scripts/anonimizar.js, lib/anonimizar.js, lib/citacoes.js, skills/anonimizar/**; checar-peca.js, doutor.js, exportar-docx.js, julgados.js, manutencao.js, mapa-teses.js, skills/ajuda/SKILL.md, skills/verificar-citacoes/**; agentes.js, guarda-escrita.js, guarda-sigilo.js, instalar.js, lib/saida.js, pos-ferramenta.js, processo.js, saida.js, skills/consentimento/**, skills/processo/SKILL.md, templates/claude-global/CLAUDE.md.
Listar na descrição do PR, como pendência para depois desses merges: /ajuda, CLAUDE.md global, lista FERRAMENTAS do doutor e regra estreita de permissão só para `auditar`.

RESTRIÇÕES
- Sem rede: não baixar a skill por URL nem git clone; só caminho local ou texto colado.
- Nunca executar, importar ou dar require em arquivo da skill auditada.
- Nenhum dado de cliente no relatório nem na procedência.
- Nunca sugerir --dangerously-skip-permissions nem bypassPermissions (só detectar).
- Datas no dia local.

PRONTO QUANDO
- `node testes/rodar-testes.js` e `TZ=America/Sao_Paulo node testes/rodar-testes.js` passam inteiros; colar as contagens no PR.
- `git diff --name-only origin/main` não traz nenhum arquivo da lista NÃO TOCAR.
- Demonstração no PR: saída real do `auditar` numa fixture 🔴 e numa 🟢.
- Commit, push da branch e PR aberto com gh, em pt-BR, dizendo que foi escrito com Claude Code. Nunca merge, tag ou release.
