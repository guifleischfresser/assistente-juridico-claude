---
name: erros
description: "Erros que o advogado já corrigiu e o assistente não pode repetir: listar, registrar, testar uma peça, bloquear ou desativar. Use em /erros."
argument-hint: "[listar | testar <arquivo> | bloqueio|aviso|desativar|remover <id>]"
disable-model-invocation: true
---

# Erros a não repetir

Pedido: $ARGUMENTS (vazio = listar). `S="$HOME/.claude/advogado/scripts"`.

- **listar**: `node "$S/erros.js" listar`. Mostre em linguagem simples: o que é o erro, o certo, se só avisa (⚠️) ou bloqueia (🛑), quantas vezes foi corrigido e disparou.
- **registrar** (quando o advogado corrigir você): primeiro `node "$S/erros.js" sugerir --antes "<trecho errado exato>" --depois "<trecho corrigido>"`. Mostre ao advogado só o campo `mensagem` (ex.: "Entendi o erro: escrevi … o certo é … Vou passar a avisar … Confirma?"). Se ele confirmar, rode o mesmo comando com `--registrar` e repasse a nova `mensagem`. Corrigido pela 2ª vez → passa a **bloquear** a gravação da peça com esse erro.
  - Código 4 (`ok: false`): diga o `motivo` em palavras simples. Se ainda der para reconhecer o erro no texto, registre à mão: `node "$S/erros.js" registrar --licao "<o certo>" --padrao "<regex curta do erro>" --exemplo "<trecho errado>" --certo "<forma certa>"` (o padrão precisa achar o exemplo e não acusar a forma certa); senão, anote como cuidado (`memoria.js preferir "…" --tipo cuidado`).
  - Nunca ponha nomes, CPF ou números de processo no padrão ou na lição (use [CLIENTE]); o `sugerir` já tira esses dados ou recusa.
- **testar**: `node "$S/erros.js" testar "<arquivo>"`.
- **bloqueio / aviso / desativar / remover `<id>`**: só a pedido do advogado; confirme antes de remover.

Onde fica: `ESCRITORIO/MEMORIA/erros-a-nao-repetir.json` (local; só lições, sem dados de clientes). Trocas de palavras que o advogado faz duas vezes nas peças entram sozinhas como aviso.
