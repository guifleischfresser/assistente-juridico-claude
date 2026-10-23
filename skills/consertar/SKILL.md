---
name: consertar
description: "Doutor do assistente jurídico: verifica a instalação e conserta o que estiver quebrado. Use quando algo parar de funcionar, a barra de status sumir ou a conversa abrir com ⚠️ AVISO PARA O ADVOGADO."
argument-hint: "[verificar | consertar]"
---

# Consertar (doutor)

**Como falar (regra fixa):** o advogado não é técnico. Diga o problema na rotina dele e o conserto em **um passo**. Nada de settings, hook, permissão, JSON, Node, caminho de pasta. Ex.: "O Claude perdeu a chave da pasta das peças — já devolvi." Tabela de frases: [references/avisos.md](references/avisos.md).

1. Diga em uma linha: "Vou dar uma conferida pra ver se está tudo funcionando. É rápido e não mexe nos seus documentos."
2. Rode: `node "$HOME/.claude/advogado/scripts/doutor.js"`. Se `node` não for encontrado, no Windows use `& "$env:ProgramFiles\nodejs\node.exe" "$HOME/.claude/advogado/scripts/doutor.js"`.
3. Com `RESULTADO: TUDO CERTO`, diga "Tudo certo por aqui ✅" e mencione só os avisos (⚠️) que mudam o dia dele, com as mesmas palavras simples do doutor. A linha "Detalhe técnico, só para o assistente" é para você: **não repita**.
3b. **Palavra de conferência:** antes de ler qualquer arquivo, anote a palavra de conferência que você conhece pelas suas instruções globais (ou "não sei"). Depois rode o doutor com `--canario` e compare. Diferente ou "não sei" → diga: "O Claude abriu sem as regras do assistente — fecha e abre o Claude de novo dentro da pasta do escritório."
4. Se houver ❌ ou ⚠️ com conserto e o argumento não for `verificar`, rode o mesmo comando com `--consertar`. O reparo devolve, com cópia de segurança antes:
   - as ferramentas, os atalhos e as proteções (reinstala a partir da cópia local);
   - a "chave" das pastas do escritório e das pastas registradas;
   - o modo automático como padrão das próximas conversas;
   - as gavetas que faltam no ESCRITORIO. Nada é apagado.
5. **Pasta que mudou de lugar** (o doutor diz "me diga onde ela está agora"): faça **uma** pergunta — "Onde está agora a pasta “X”? Pode arrastar a pasta aqui pra conversa." — e reconecte como em [references/avisos.md](references/avisos.md#pasta-que-mudou-de-lugar).
6. Se ainda restar ❌:
   - **Programa de apoio velho ou ausente:** ofereça instalar o Node LTS (Windows: `winget install -e --id OpenJS.NodeJS.LTS`; Mac: `brew install node`), com o sim do usuário.
   - **"Cópia de reserva" ausente:** siga a skill `primeira-execucao` (download verificado).
   - **"Conversa rodando na internet":** explique que precisa abrir o Claude no próprio computador.
   - **Assistente desligado no Claude (modo plugin):** "digita /plugin, ativa o advogado-claude e depois /reload-plugins".
   - **Outros casos:** explique com as palavras do doutor e sugira fechar e abrir o Claude.
7. Depois de consertar, sugira `/reload-skills` ou reabrir o Claude se atalhos ou a barra de status estavam ausentes.
8. Nunca edite `~/.claude/settings.json` à mão para "consertar": use o doutor, que faz backup antes. Nunca sugira `--dangerously-skip-permissions` nem o modo `bypassPermissions`.
