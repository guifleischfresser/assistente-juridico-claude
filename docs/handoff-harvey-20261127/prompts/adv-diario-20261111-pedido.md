essas são as coisas que eu achei hoje de gente fazendo, qual você acha que vale a implementação, escolha uma delas, orquestre a implementação e me devolva um prompt com objetivos /goal

Ideias de hoje (repo guifleischfresser/assistente-juridico-claude, checkout em /workspace/advogado-claude-repo, branch claude/diario-20261111 a partir de main 499b4ec):
1. Roadmap item 9 (parte 2): `anonimizar.js aplicar --docx` — cópia anonimizada gravada direto em .docx (hoje PDF/Word viram .md).
2. Roadmap item 9 (parte 1): dicionário local de prenomes/sobrenomes para reconhecer nomes sem rótulo (menos falso negativo), sem rede.
3. Inspirado no BAS Guard (github.com/basdotio/bas-guard): varredura offline de instruções ocultas/injeção em skills, hooks, MCP e CLAUDE.md instalados na máquina do advogado (no doutor ou na manutenção quinzenal), só avisando.
4. Inspirado no claude-code-harness e no alerta de 73 repos falsos de skills/MCP com malware: auditoria só-leitura de skills/plugins de terceiros antes de instalar (origem, ZIP/binários no repo, comandos de rede nos hooks).
5. Inspirado na skill unslop: checagem de "cara de IA" no texto da petição (frases-clichê), só aviso no checar-peca.
6. Inspirado no relato de leigos/advogados protocolando jurisprudência inventada (12k impressões no X hoje): reforçar o verificador de julgados para marcar no checar-peca toda citação de julgado sem fonte conferida, só aviso.

Restrições: manter as descrições sempre carregadas das skills enxutas (teste de limite do contexto fixo, hoje 3.869 caracteres); dados de cliente locais e por caso; nunca sugerir --dangerously-skip-permissions nem bypassPermissions; nenhuma chamada de nuvem sem pedido explícito do usuário; todos os testes precisam passar; abrir PR só com gh, nunca fazer merge, tag ou release.

Responda só com a escolha (1 linha de justificativa) e o prompt /goal completo (objetivo, restrições, critérios de pronto), sem implementar ainda.
