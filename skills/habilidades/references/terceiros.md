# Skill de terceiros: auditar antes de instalar

Script: `node "$HOME/.claude/advogado/scripts/auditar-skill.js" <comando>` (sem rede; nada da skill é executado).

## Fluxo

1. **Origem só local.** O advogado baixou um `.zip`, tem a pasta ou colou o texto. Não baixe por URL nem faça `git clone`: peça para ele baixar e dizer onde salvou. Texto colado: grave em arquivo temporário e audite, ou use `auditar --colado` com o texto pela entrada padrão.
2. **Auditar.** `auditar <pasta|SKILL.md|.zip>`. A skill vai para a quarentena (`~/.claude/advogado/quarentena/<id>/`) com o SHA-256 de cada arquivo. Zip com caminho para fora da pasta (zip-slip), atalho (symlink), caminho absoluto ou arquivo gigante é recusado.
3. **Mostrar o relatório inteiro**, em linguagem simples: veredito 🟢/🟡/🔴, cada achado com arquivo:linha e explicação. Diga sempre que a auditoria é heurística e **não garante** segurança.
4. **Pedir o OK.**
   - 🔴 → não instale. Explique os achados. Não ofereça `--forcar`; só use se o advogado, depois de ler os riscos, pedir com todas as letras.
   - 🟡 → pergunte se ele quer instalar mesmo assim, citando os pontos de atenção.
   - 🟢 → pergunte se pode instalar.
5. **Instalar** só com o OK explícito: `instalar <id> --confirmo`. O script confere os hashes de novo (se algo mudou na quarentena depois da auditoria, recusa: audite de novo), escolhe um nome que não colida com o núcleo, `auto-*` ou comandos do Claude Code e registra a procedência (origem, data local, hashes, veredito). O pedido de permissão do Claude Code para rodar o comando também faz parte do OK.

## Outros comandos

- `listar` — auditorias na quarentena e skills de terceiros instaladas.
- `relatorio <id>` — mostra de novo o relatório.
- `remover <nome>` — tira a skill de terceiro das ativas (vai para `~/.claude/advogado/terceiros/aposentadas/`; nada é apagado). Só funciona com skills instaladas por este fluxo.
- `descartar <id>` — desiste de uma auditoria (vai para `quarentena/_descartadas/`).

## Nunca

- Executar, abrir com `node`/`python` ou dar `require` em arquivo da skill auditada.
- Sugerir `--dangerously-skip-permissions`, `bypassPermissions` ou regras amplas de permissão (a auditoria só **detecta** esses pedidos).
- Copiar dado de cliente para o relatório ou para a procedência.
