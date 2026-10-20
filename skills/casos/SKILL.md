---
name: casos
description: "Gerencia os casos do escritório: listar, abrir/retomar, ativar, arquivar, reabrir. Use quando o usuário perguntar pelos seus casos, quiser continuar um caso ou mudar a fase de um caso."
argument-hint: "[listar | abrir <nome> | ativar <nome> | arquivar <nome> | reabrir <nome> | buscar <termo>]"
---

# Casos

Pedido: $ARGUMENTS (vazio = listar)

- **listar**: Glob `CASOS/*/*/DOSSIE.md`. Mostre uma tabela por fase (Em análise, Ativos, Arquivados) com nome, fase e a primeira pendência aberta do dossiê. Não leia dossiês inteiros só para listar (economia de limite).
- **abrir / retomar**: use a skill `processo` (`/processo <nome>`): ela carrega só o dossiê e o handoff do caso e vincula esta conversa a ele (uma conversa por processo). Leia autos só por trechos (`autos-md/INDICE.md`).
  - Se o dossiê tiver **"Pasta original"** (caso importado na primeira execução), os documentos ficam lá e não são copiados. Para ler, ofereça `/preparar-autos`: ele converte direto da pasta original para `autos-md/`. Complete o dossiê (partes, fatos, prazos) a partir do índice, com a confirmação do usuário.
  - Pastas externas registradas estão em `ESCRITORIO/mapa-de-pastas.md`. São somente leitura; salve sempre no ESCRITORIO.
- **ativar / arquivar / reabrir**: confirme o caso com o usuário, mova a pasta inteira entre `CASOS/Em análise`, `CASOS/Ativos` e `CASOS/Arquivados` (Move-Item / mv). Registre no Histórico do dossiê com data e motivo. Ao arquivar, marque prazos do caso como "feito" ou "cancelado" em PRAZOS.md após confirmar.
- **buscar**: Grep pelo termo em `CASOS/**/DOSSIE.md` primeiro; só depois em `autos-md/`.

Nunca apague um caso. Caso arquivado só é editado após confirmação (o sistema pede).
