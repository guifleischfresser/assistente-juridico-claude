essas são as coisas que eu achei hoje de gente fazendo, qual você acha que vale a implementação, escolha uma delas, orquestre a implementação e me devolva um prompt com objetivos /goal

Repo: guifleischfresser/assistente-juridico-claude (este checkout, branch claude/diario-20261118 a partir de origin/main, que tem #11–#14 mergeados). Há um PR aberto, #15 (integridade do núcleo), que mexe em: ARQUITETURA.md, CHANGELOG.md, ferramentas/empacotar.js, scripts/doutor.js, scripts/guarda-escrita.js, scripts/instalar.js, scripts/integridade.js, scripts/lib/comum.js, scripts/lib/diagnostico.js, scripts/lib/integridade.js, scripts/memoria.js, scripts/sessao-inicio.js, skills/ajuda, skills/consertar, testes/rodar-testes.js. Prefira uma ideia que toque o mínimo nesses arquivos (CHANGELOG/ARQUITETURA/rodar-testes é aceitável). Leia ARQUITETURA.md (§17 anonimização, §19 Roadmap) e CHANGELOG.md para não repetir o que já existe.

Ideias de hoje:
1. Segunda passada local de anonimização com modelo pequeno via Ollama (pedido explícito do Guilherme em 17/11; @JorgeAraujo comprou PC com GPU só para desidentificar dossiês localmente): regras determinísticas primeiro (CPF, CNPJ, OAB, RG, telefone, e-mail, CEP, nº de processo, dicionário de nomes), depois, opcional, Ollama em localhost para nomes sem rótulo, endereços e razões sociais; se o Ollama não estiver instalado/rodando, só regras com aviso em pt-BR; o advogado continua revisando a prévia do simular; nada sai da máquina (só 127.0.0.1, nunca outro host). Testes sem depender de Ollama (servidor falso local).
2. Checar backdoor na config do Claude Code (@zacodil, 7,5k imp): script local que lê, sem abrir sessão, ~/.claude/settings*.json e .claude/settings*.json do escritório/casos, e lista hooks que não são do mod, comandos com rede (curl/wget/iwr), env suspeito e permissões amplas/bypass, com veredito em pt-BR.
3. CC 2.1.323: plugin.json com engines["claude-code"] (versão mínima) e validação do manifesto do plugin nos testes, sem depender do binário claude no CI.
4. CC 2.1.325 passou a pedir permissão antes de rodar skill com allowed-tools/hooks, até em tarefa agendada (@romulocarvs): o diagnóstico explica e sugere Skill(nome) no allow (nunca bypass).
5. Peça revisada por um segundo revisor de contexto limpo, não o mesmo que redigiu (@ppcnogueira), com checklist de verificação com evidência por item antes de exportar, e aceite do advogado.
6. Roadmap 9 pendente: cópia anonimizada direto em .docx.

Restrições:
- Escolha UMA, a de melhor valor/risco para o advogado.
- Descrições de skills sempre carregadas: enxutas (não inflar o orçamento de descrições).
- Dados de cliente locais e por caso. Nenhuma chamada de rede/nuvem sem pedido explícito do usuário (localhost do Ollama só se o usuário ligar).
- Nunca sugerir --dangerously-skip-permissions nem bypassPermissions.
- Testes (node testes/rodar-testes.js e o que o CI roda) precisam passar.
- Abrir PR só com gh (base main, descrição pt-BR); nunca merge, tag ou release.
- O /goal tem limite de 4000 caracteres: devolva o prompt /goal completo em até ~3500 caracteres, começando com "/goal", e nada depois dele.
