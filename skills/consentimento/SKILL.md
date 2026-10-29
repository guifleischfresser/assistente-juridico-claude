---
name: consentimento
description: "Registra, revoga ou mostra a autorização do cliente para uso de IA no caso e gera o termo para ele assinar. Use quando pedirem /consentimento."
argument-hint: "[caso] | modelo <caso> | revogar <caso> | estado [caso]"
---

# Consentimento do cliente para uso de IA (por caso)

Pedido: $ARGUMENTS. `CST` = `node "$HOME/.claude/advogado/scripts/consentimento.js"`.

O registro fica **só na pasta do caso** (`<caso>/_consentimento/registro.json`) e guarda o histórico: registrar e revogar acrescentam, nada é apagado. Nunca escreva nesse arquivo à mão (a guarda recusa) nem copie o conteúdo dele para outro lugar.

1. **Registrar** ("o cliente do caso X autorizou o uso de IA"): descubra, do que o advogado já disse, e pergunte só o que faltar, uma pergunta por vez:
   - **forma**: por escrito (termo assinado), por e-mail ou verbalmente;
   - **o que autorizou**: uso de IA no caso (sim/não), envio de documentos ao Claude (sim/não), anonimização obrigatória ou opcional;
   - **quem**: o cliente ou um representante (o nome vem do DOSSIE.md: linha `Cliente:` ou `Representante:`; não peça o nome na conversa se já estiver lá);
   - **data** (padrão: hoje) e **comprovante** (opcional: arquivo que já está na pasta do caso, ex. `documentos/termo-assinado.pdf`).
   Depois: `CST registrar "<caso>" --forma escrito|email|verbal [--documentos nao] [--anonimizacao obrigatoria] [--quem representante] [--data DD/MM/AAAA] [--comprovante "<arquivo>"]`. Repita a frase do script ("Anotei: o cliente do caso X autorizou o uso de IA em 29/10/2026, por escrito. …").
2. **Modelo de termo**: `CST modelo "<caso>"` (`--representante` se for o caso) → `.md` na pasta `_consentimento/` do caso, com as opções para o cliente marcar. Ofereça o Word com `/formatar-peca`.
3. **Revogar**: `CST revogar "<caso>" [--forma …] [--data …] [--comprovante …]`. Diga ao advogado que, daqui em diante, o caso abre com o aviso e sugira `/anonimizar`.
4. **Estado**: `CST estado "<caso>"` (histórico) ou `CST estado` (todos os casos).

Avisos (vêm do `/processo`, do início da conversa e da checagem da peça): repasse ao advogado em uma linha e **não trave o trabalho**. Revogado ou não autorizado: "o cliente revogou a autorização de uso de IA neste caso" e sugira `/anonimizar`. Anonimização obrigatória desligada: sugira ligar antes de ler documentos.

Detalhes (formato, opções, avisos e limites): [references/detalhes.md](references/detalhes.md).
