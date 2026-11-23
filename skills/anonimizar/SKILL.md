---
name: anonimizar
description: "Troca nomes, CPF/CNPJ, nº do processo e contatos do caso por marcadores; no fim devolve os dados reais. Use quando pedirem /anonimizar ou anonimizar um caso."
argument-hint: "[caso] | migrar <caso> | estado | desligar <caso>"
---

# Anonimizar um caso (opcional, só quando o advogado pede)

Pedido: $ARGUMENTS. `ANZ` = `node "$HOME/.claude/advogado/scripts/anonimizar.js"`.

**Nunca** abra o cofre, suas chaves ou o Word restaurado. **Nunca** repita na conversa um dado real que o advogado não tenha escrito.

1. **Ligar** (pedido explícito, por caso): explique em 2 linhas — troco nomes das partes, CPF/CNPJ, nº do processo, RG, e-mails, telefones, endereços e CEPs por marcadores (`[PARTE_A]`, `[CPF_1]`, `[PROCESSO_1]`) antes de ler; a correspondência fica num cofre cifrado; os dados reais voltam no Word local. Depois: `ANZ preparar "<caso>"`.
   - Não peça para o advogado digitar nomes na conversa. Se a detecção deixar alguém de fora, ele mesmo escreve no DOSSIE.md do caso a linha `Anonimizar também: Nome Um; Nome Dois` e você roda `preparar` de novo. (Se ele preferir dizer aqui: `--nome "Nome|Outra grafia"`, avisando que o nome passa pela conversa.)
2. **Aplicar:** `ANZ aplicar "<caso>"` (todos os documentos de `documentos/` e `autos-md/`) ou `ANZ aplicar "<caso>" "<arquivo>"`. Repita a frase do script ("Anonimizei 3 documentos do caso X: …") e peça ao advogado que **passe o olho nas cópias** antes: a detecção de nomes não é perfeita.
3. **Trabalhar:** leia só `anonimizado/` e o dossiê do `/processo` (já sai com marcadores). Escreva a peça em `pecas/` com os marcadores exatamente como estão (`[PARTE_A#2]` é a mesma parte em outra grafia). Se aparecer pergunta para abrir o original, explique ao advogado que aquele arquivo tem os dados reais.
4. **Word final.** Oriente o advogado a executar no terminal local `node "$HOME/.claude/advogado/scripts/exportar-docx.js" "<peça.md>" --restaurar`. A peça permanece com marcadores e o Word recebe o sufixo `-restaurado.docx`. Use `ANZ conferir "<peça>"` para identificar órfãos.
5. **Migrar e revisar.** Oriente `ANZ migrar "<caso>"` no terminal local. Peça revisão dos antigos `*-dados-reais.md`, suas versões e saídas personalizadas.
6. **Outros comandos.** `ANZ estado ["<caso>"]` e `ANZ desligar "<caso>"`. Para remover a correspondência e os históricos elegíveis, siga `/processo`.

Detalhes (marcadores, onde fica cada coisa, o que as guardas fazem e limites): [references/detalhes.md](references/detalhes.md).

Diga sempre, uma vez: "A anonimização reduz o que vai para a conversa, mas a detecção de nomes não é perfeita — confira as cópias antes."
