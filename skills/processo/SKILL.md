---
name: processo
description: "Abre ou retoma UM processo/cliente nesta conversa: carrega só o dossiê e o handoff daquele caso. Use quando o advogado citar um caso para trabalhar."
argument-hint: "<nome do caso, cliente ou número do processo>"
---

# Processo (uma conversa por caso)

Caso: $ARGUMENTS. `S="$HOME/.claude/advogado/scripts"`.

1. `node "$S/processo.js" abrir "<o que o advogado disse>"`. Se aparecer mais de um, pergunte qual; se nenhum, ofereça `/novo-caso`.
2. Resuma em até 5 linhas: partes, fase, onde paramos (HANDOFF), próximos prazos e pendências. Pergunte por onde seguir.
3. Daqui em diante **esta conversa é deste processo**: o sistema lembra disso ao retomar a conversa e avisa se você mexer em outro caso.
   - Não leia nem cite outros casos sem o advogado pedir. Outro caso → sugira abrir outra conversa (`/clear` ou nova janela) e `/processo <outro>`.
   - Fatos, decisões e preferências deste cliente: `node "$S/processo.js" anotar "<caso>" "<texto>"` (vai para o DOSSIE.md do caso). **Nunca** em `MEMORIA/` (memória global é só de estilo e método, sem dados de clientes).
   - Autos: só por trechos (`autos-md/INDICE.md` + Grep).
4. Ao encerrar o assunto do dia: `/handoff` (atualiza o HANDOFF.md do caso).

Dica para o advogado (diga uma vez): uma conversa por processo deixa as respostas mais precisas, gasta menos limite e evita misturar dados de clientes.
