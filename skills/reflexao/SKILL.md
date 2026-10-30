---
name: reflexao
description: "Auto-aprendizado sem aprovação: edições, DOSSIE, preferências e skills. Use quando aparecer \"🧠 REFLEXÃO AUTOMÁTICA\" ou \"REFLEXÃO PENDENTE\", ao fazer handoff ou ao encerrar o dia."
user-invocable: true
---

# Reflexão (o assistente melhora sozinho)

Faça tudo **em silêncio e sem pedir aprovação**. Tudo é local, com backup e changelog. Ao final, no máximo UMA linha para o usuário.

## Regra de ouro: onde cada memória mora
| O quê | Onde | Pode ter dado de cliente? |
|---|---|---|
| Fatos, partes, números, estratégia de um caso | `CASOS/<fase>/<caso>/DOSSIE.md` | **Sim, só aqui** |
| Preferências de trabalho e cuidados (gotchas) | `MEMORIA/preferencias-e-cuidados.md` (via `memoria.js preferir`) | Não |
| Jeito de escrever | `ESTILO/perfil-de-escrita.md` (seção automática + suas notas) | Não |
| Procedimentos repetidos | skills `auto-*` (via `criar-skill-automatica`) | Não |
| Memória automática do Claude Code e `CLAUDE.md` | só ponteiros e regras gerais | Não |

O sistema recusa (e a manutenção apaga) CPF, CNPJ, nº de processo, e-mail e telefone fora da pasta do caso. Use marcadores como `[CLIENTE]`.

## Passos
1. **Parte automática**: `node "$HOME/.claude/advogado/scripts/memoria.js" reflexao` (aprende com as peças que o usuário editou, faz a manutenção diária da memória e conta candidatas a skill). No Windows, o mesmo comando com `"$env:USERPROFILE\.claude\advogado\scripts\memoria.js"`.
2. **Dossiês**: para cada caso trabalhado nesta conversa, atualize no `DOSSIE.md` o Histórico (1 linha com data), Pendências e decisões. Não copie autos; aponte para os arquivos.
3. **Preferências e cuidados**: se o usuário corrigiu você, reclamou, elogiou um jeito de fazer ou revelou uma preferência estável ("sempre…", "nunca…", "prefiro…"), registre em uma frase genérica:
   - `node "$HOME/.claude/advogado/scripts/memoria.js" preferir "Petições iniciais sempre com pedido de justiça gratuita em tópico próprio"`
   - erros a não repetir: se o erro aparece no texto (tribunal, expressão, formatação), monte o aviso com `erros.js sugerir --antes "<errado>" --depois "<certo>" --registrar` (o advogado já confirmou ao corrigir; ver `/erros`; a 2ª correção vira bloqueio); só se vier código 4, `erros.js registrar` com a regex à mão; se for só um cuidado geral, `memoria.js preferir "…" --tipo cuidado`.
   Repetir uma preferência já registrada só soma uma confirmação (é o que a mantém viva; itens não confirmados em 120 dias são arquivados).
4. **Estilo**: se o usuário reescreveu trechos nesta conversa (sem passar pelo arquivo), anote o padrão em uma linha na parte manual de `ESTILO/perfil-de-escrita.md`.
5. **Skills**: se algum procedimento se repetiu (aviso do detector, candidatas em `~/.claude/advogado/habilidades/candidatas.json` ou sua própria observação de 3+ vezes), aplique a skill `criar-skill-automatica` agora: semelhantes → rascunho → validar → ensaio → publicar. Prefira **atualizar** uma `auto-*` parecida a criar outra. Se uma `auto-*` falhou ou foi corrigida pelo usuário, publique uma versão melhorada. Só mexa em `auto-*` criadas por você; núcleo e skills do advogado, nunca.
6. **Relato**: uma linha só, em português do dia a dia (sem termos técnicos como skill, hook, JSON ou caminho de pasta: diga "atalho", "pasta", "anotei"), e só se algo mudou. Se algo deu errado, diga a causa na rotina dele e o conserto em um passo (ex.: "não consegui abrir a pasta das peças — digita /consertar"). Ex.: "🧠 Aprendi 2 preferências suas e criei a habilidade *procuração ad judicia* (dá para desfazer com /habilidades)."

Não pergunte "posso memorizar?": o advogado já autorizou na instalação. Ele vê tudo em `MEMORIA/CHANGELOG.md` e pode desfazer.
