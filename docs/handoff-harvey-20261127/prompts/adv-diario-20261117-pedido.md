essas são as coisas que eu achei hoje de gente fazendo, qual você acha que vale a implementação, escolha uma delas, orquestre a implementação e me devolva um prompt com objetivos /goal

Repo: guifleischfresser/assistente-juridico-claude (este checkout, branch claude/diario-20261117 a partir de origin/main, que já tem #11–#14 mergeados; não há PRs abertos). Leia ARQUITETURA.md (§19 Roadmap) e CHANGELOG.md para não repetir o que já existe (ex.: auditoria de skill de terceiros, registro de saída, súmulas, anonimização por dicionário já existem).

Ideias de hoje:
1. Integridade do mod (incidente: chave vazada permitiu publicar versões adulteradas da extensão Claude Code no marketplace do Cursor): manifesto local de hashes SHA-256 dos arquivos do núcleo do mod gerado na instalação/release, comando local que confere e aviso em pt-BR simples no SessionStart quando script/hook/skill do núcleo foi alterado fora do fluxo. Sem rede. Pode reusar o que a auditoria (#14) já tem de hashes.
2. "Se dá pra escrever a regra, vire hook, não linha no CLAUDE.md" (@AISystems_hq): auditar o CLAUDE.md global e o do escritório e apontar quais regras já têm guarda em código e quais são só texto, sugerindo quais virar guarda.
3. CC 2.1.323: plugin.json com "engines" (versão mínima do Claude Code) e validação do manifesto do plugin nos testes (sem depender do binário claude no CI).
4. "Faça a IA verificar o próprio trabalho" (guia do time do Claude Code, @namcios) + herdr-goal-manager (@nwiizo: metas com evidência de verificação, humano decide o aceite): na peça, antes de exportar, um checklist de verificação com evidência por item (citação conferida, valores batem com a planilha, prazos), registrado por caso, e o advogado dá o aceite.
5. MCP Jurídico Brasil (DataJud + prazo em dias úteis): DataJud exige rede, então só como opt-in explícito (Roadmap item 2).

Restrições:
- Escolha UMA, a de melhor valor/risco para o advogado.
- Descrições de skills sempre carregadas: enxutas (não inflar o orçamento de descrições).
- Dados de cliente locais e por caso. Nenhuma chamada de rede/nuvem sem pedido explícito do usuário.
- Nunca sugerir --dangerously-skip-permissions nem bypassPermissions.
- Testes (node testes/rodar-testes.js e o que o CI roda) precisam passar.
- Abrir PR só com gh (base main, descrição pt-BR); nunca merge, tag ou release.
- O /goal tem limite de 4000 caracteres: devolva o prompt /goal completo em até ~3500 caracteres, começando com "/goal", e nada depois dele.