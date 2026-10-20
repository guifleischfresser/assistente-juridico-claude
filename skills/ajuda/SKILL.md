---
name: ajuda
description: "Mostra em português simples tudo o que o assistente jurídico faz e os atalhos disponíveis. Use quando o usuário pedir ajuda, perguntar \"o que você faz\", \"como uso\" ou parecer perdido."
---

Responda com esta tabela (ajuste se houver habilidades `auto-*` novas: liste-as com `node "$HOME/.claude/advogado/scripts/habilidades.js" listar`):

| Digite | O que acontece |
|---|---|
| `/processo` (ou `/cliente`) | Abro **um** processo nesta conversa: só o dossiê e o "onde paramos" dele (uma conversa por processo) |
| `/novo-caso` | Abro a pasta de um caso novo com dossiê e checklist |
| `/casos` | Lista, abre, ativa ou arquiva casos |
| `/preparar-autos` | Transformo os PDFs do processo em texto leve, tiro duplicados e procuro "pegadinhas" escondidas para IA |
| `/nova-peca` | Escrevo uma minuta no seu estilo (inicial, contestação, recurso, contrato, parecer...) |
| `/revisar` | Reviso: citações, requisitos legais, clareza e "cara de IA" |
| `/advogado-do-diabo` | Ataco sua peça como faria a parte contrária ou o juiz |
| `/mapa-de-teses` | Monto o mapa da defesa: cada pedido da inicial com valor, risco, teses e precedentes [A VERIFICAR] |
| `/verificar-citacoes` | Confiro se cada julgado existe e se o trecho citado bate com o original (internet só com sua permissão); o resto fica [NÃO VERIFICADO] |
| `/erros` | Mostro os erros que você já corrigiu e que não posso repetir |
| `/formatar-peca` | Gero o .docx formatado (ABNT/forense) para protocolo |
| `/prazos` | Mostro e calculo prazos em dias úteis |
| `/aprender-meu-estilo` | Aprendo seu jeito de escrever a partir das suas peças |
| `/handoff` | Salvo onde paramos para continuar depois |
| `/habilidades` | Mostro os atalhos que criei sozinho; você pode desfazer qualquer um |
| `/consertar` | Verifico se está tudo funcionando e conserto sozinho o que estiver quebrado |
| `/primeira-execucao` | Refaço (ou continuo) a configuração inicial: onde ficam suas pastas, estilo e dossiês |
| `/backup` | Faço cópia de segurança do escritório para um disco que você escolher |

No modo plugin, os atalhos começam com `/advogado-claude:` (ex.: `/advogado-claude:nova-peca`).

Lembretes curtos: tudo fica no seu computador; você pode falar normalmente, sem atalhos; a barra de baixo mostra quanto da "memória da conversa" já foi usada e o próximo prazo.
