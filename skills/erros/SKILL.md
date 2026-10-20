---
name: erros
description: "Erros que o advogado já corrigiu e o assistente não pode repetir: listar, registrar, testar uma peça, bloquear ou desativar. Use em /erros."
argument-hint: "[listar | testar <arquivo> | bloqueio|aviso|desativar|remover <id>]"
disable-model-invocation: true
---

# Erros a não repetir

Pedido: $ARGUMENTS (vazio = listar). `S="$HOME/.claude/advogado/scripts"`.

- **listar**: `node "$S/erros.js" listar`. Mostre em linguagem simples: o que é o erro, o certo, se só avisa (⚠️) ou bloqueia (🛑), quantas vezes foi corrigido e disparou.
- **registrar** (quando o advogado corrigir você): `node "$S/erros.js" registrar --licao "<o certo>" --padrao "<regex curta do erro>" --exemplo "<trecho errado real>" --certo "<forma certa>"`. Sem nomes, CPF ou números de processo (use [CLIENTE]). O padrão precisa achar o exemplo e não acusar a forma certa. Corrigido pela 2ª vez → passa a **bloquear** a gravação da peça com esse erro.
- **testar**: `node "$S/erros.js" testar "<arquivo>"`.
- **bloqueio / aviso / desativar / remover `<id>`**: só a pedido do advogado; confirme antes de remover.

Onde fica: `ESCRITORIO/MEMORIA/erros-a-nao-repetir.json` (local; só lições, sem dados de clientes). Trocas de palavras que o advogado faz duas vezes nas peças entram sozinhas como aviso.
