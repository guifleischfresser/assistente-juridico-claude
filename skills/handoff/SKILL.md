---
name: handoff
description: "Salva o estado do trabalho no HANDOFF.md do caso para continuar depois. Use quando aparecer \"⚠️ HANDOFF AUTOMÁTICO\", o usuário for encerrar ou pedir para salvar onde parou."
---

# Handoff (passagem de bastão)

1. Identifique o caso em andamento (ou "geral" se não houver).
2. Escreva o handoff (curto, objetivo, até 40 linhas):
   ```
   # HANDOFF — <caso ou assunto>
   - Data/hora: <AAAA-MM-DD HH:MM>  · Contexto ao salvar: <X>%
   ## O que foi feito
   ## Decisões tomadas (e por quê)
   ## Próximos passos
   1. ...
   ## Arquivos tocados
   ## Pendências do usuário (documentos, confirmações)
   ```
3. Grave em **dois lugares** (regra do escritório):
   - `CASOS/<fase>/<caso>/HANDOFF.md` (substitui o anterior; o sistema versiona automaticamente) — ou `HANDOFFS/geral.md` se não houver caso;
   - `HANDOFFS/AAAA-MM-DD_HHMM_<caso-ou-assunto>.md` (espelho central, nunca sobrescrever).
4. Atualize o Histórico e as Pendências do `DOSSIE.md`, e `PRAZOS.md` se surgiu prazo.
5. Aplique a skill `reflexao` (memória e skills, sem pedir aprovação; dados de clientes só no DOSSIE.md).
6. Diga ao usuário, em linguagem simples: "Salvei tudo. Para continuar com a memória leve, digite /clear. Na próxima conversa eu retomo daqui."
