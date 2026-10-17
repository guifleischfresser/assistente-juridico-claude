---
name: manutencao
description: "Manutenção das habilidades: mede o contexto que ocupam, enxuga descrições, aposenta e mescla atalhos automáticos sem uso. Use quando o usuário digitar /manutencao ou pedir para desfazer a manutenção."
argument-hint: "[medir | revisar | simular | desfazer | estado]"
disable-model-invocation: true
---

# Manutenção das habilidades

Pedido: $ARGUMENTS (vazio = revisar)

Script: `node "$HOME/.claude/advogado/scripts/manutencao.js" <comando>`

Roda sozinha a cada 15 dias, no início de uma conversa. Aqui o usuário pede na hora.

- **revisar** (padrão) → `revisar`. Mostre ao usuário só a linha "Manutenção feita: …" e o caminho do relatório.
- **simular** → `revisar --simular`. Mostra o que seria feito, sem alterar nada.
- **medir** → `medir`. Explique em uma frase: "descrição" é o que fica carregado em toda conversa; "corpo" só carrega quando o atalho é usado.
- **desfazer** → `desfazer` (ou `desfazer <carimbo>`). Tudo volta ao estado anterior: skills, registro e memória.
- **estado** → `estado` (última e próxima manutenção).

O que a revisão faz, sempre com backup, ensaio (dry-run) e changelog:
1. Aposenta atalhos `auto-*` sem uso há 45+ dias (vão para `_aposentadas`; voltam com `/habilidades restaurar`).
2. Mescla atalhos `auto-*` quase iguais (o mais usado fica; o outro vira `references/variante-*.md`).
3. Enxuga descrições longas (meta: 200 caracteres) mantendo o "Use quando" e o `/comando`.
4. Move detalhes pesados do corpo para `references/*.md`, lidos só quando necessários.
5. Confere o tamanho do CLAUDE.md e da memória (MEMORY.md acima de 200 linhas é arquivado em parte).
6. Valida cada skill alterada; a que falhar no ensaio volta como estava.

Nunca muda o que uma skill do núcleo faz; só encurta a descrição e reorganiza detalhes. Relatórios ficam em `ESCRITORIO/MEMORIA/revisoes/`.

Se o usuário quiser refinar uma mesclagem (texto da skill que ficou), use a skill criar-skill-automatica, seguindo as salvaguardas dela.
