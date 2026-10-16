---
name: consertar
description: "Doutor do assistente jurídico: verifica a instalação (Node, hooks, skills, settings, pastas do ESCRITORIO, barra de status, exportação .docx, guarda de sigilo) e conserta o que estiver quebrado, sem apagar nada. Use quando algo parar de funcionar, a barra de status sumir, um atalho não aparecer, depois de atualizar o computador, ou quando o usuário digitar /consertar."
argument-hint: "[verificar | consertar]"
---

# Consertar (doutor)

1. Diga em uma linha: "Vou verificar se está tudo funcionando. É rápido e não mexe nos seus documentos."
2. Rode: `node "$HOME/.claude/advogado/scripts/doutor.js"`. Se `node` não for encontrado, no Windows use `& "$env:ProgramFiles\nodejs\node.exe" "$HOME/.claude/advogado/scripts/doutor.js"`.
3. Com `RESULTADO: TUDO CERTO`, diga isso e mencione só os avisos (⚠️) que importam ao usuário, em linguagem simples.
4. Se houver ❌ e o argumento não for `verificar`, rode o mesmo comando com `--consertar`. O reparo:
   - reinstala a partir da cópia local do pacote, com backup das configurações;
   - recria pastas que faltam no ESCRITORIO;
   - re-sincroniza as pastas registradas.
   Nada é apagado.
5. Se ainda restar ❌:
   - **Node ausente ou antigo:** ofereça instalar o Node LTS (Windows: `winget install -e --id OpenJS.NodeJS.LTS`; Mac: `brew install node`), com a autorização do usuário.
   - **"Sem cópia local do pacote":** siga a skill `primeira-execucao` (download verificado).
   - **"Sessão na nuvem":** explique que precisa abrir o Claude Code no próprio computador.
   - **Outros casos:** explique o item e sugira fechar e abrir o Claude Code.
6. Depois de consertar, sugira digitar `/reload-skills` ou reabrir o Claude Code se atalhos ou a barra de status estavam ausentes.
7. Nunca edite `~/.claude/settings.json` à mão para "consertar": use o doutor, que faz backup antes.
