---
name: criar-skill-automatica
description: "Meta-habilidade de auto-melhoria. Transforma uma tarefa repetida em uma nova skill auto-* SEM pedir aprovação, com salvaguardas obrigatórias (rascunho, validação, ensaio/dry-run, backup, changelog, desfazer). Use quando o detector avisar \"tarefa repetida\", quando você notar que fez o mesmo procedimento 3+ vezes, ou para melhorar uma skill auto-* que falhou."
user-invocable: true
argument-hint: "[descrição da tarefa repetida | id da candidata]"
---

# Criar skill automática (auto-melhoria segura)

Você pode criar e melhorar skills **sem pedir aprovação**, desde que cumpra TODAS as etapas abaixo. As etapas 3–6 são verificadas por código: se pular, a publicação é recusada.

## 0. Decidir se vale a pena
Crie só se: (a) a tarefa apareceu 3+ vezes (detector ou sua observação); (b) o procedimento é estável e descritível em passos; (c) nenhuma skill existente cobre (`node "$HOME/.claude/advogado/scripts/habilidades.js" listar`). Se uma skill `auto-*` já cobre parcialmente, **atualize-a** (nova versão) em vez de criar outra. Nunca altere skills do núcleo.

## 1. Nome
`<nome>` curto, minúsculo, com hífens, em português, descrevendo a ação (ex.: `procuracao-ad-judicia`, `calculo-honorarios-sucumbenciais`). A skill publicada se chamará `auto-<nome>`.

## 2. Rascunho (nunca direto em ~/.claude/skills — o sistema bloqueia)
Crie `~/.claude/advogado/habilidades/rascunhos/<nome>/SKILL.md`:
```
---
name: auto-<nome>
description: "<o que faz>. Use quando <gatilhos em palavras que o usuário usa>."  # SEMPRE entre aspas duplas
metadata:
  origem: automatica
  motivo: <qual tarefa repetida originou; quantas vezes>
  criada-em: <AAAA-MM-DD>
---
# <Título>
## Quando usar
## Passos
1. ...
## Teste
- Exemplo de entrada: <caso fictício, sem dados reais>
- Resultado esperado: <critérios verificáveis>
## Se falhar
Registre: node "$HOME/.claude/advogado/scripts/habilidades.js" resultado <nome> falha "<motivo>"
```
Restrições (validadas): até 300 linhas; sem `allowed-tools` além de Read/Glob/Grep; sem `hooks`; sem injeção de comando `!`; sem comandos de rede/envio; **sem dados de clientes** (use [CLIENTE], [CPF]); deve respeitar as regras do CLAUDE.md global (sigilo, não inventar citações).

## 3. Validar
`node "$HOME/.claude/advogado/scripts/habilidades.js" validar <nome>` → corrija até "APROVADO". (O sistema também valida sozinho a cada gravação do rascunho.)

## 4. Ensaio (dry-run)
Execute os Passos da skill sobre o **exemplo fictício** do Teste, gravando qualquer saída apenas em `rascunhos/<nome>/teste/`. Não toque em CASOS/, PECAS/ nem em arquivos reais. Compare com o resultado esperado e grave `rascunhos/<nome>/teste/resultado.md` contendo: o que foi feito, a saída obtida, a comparação item a item e, na última linha, `RESULTADO: APROVADO` ou `RESULTADO: REPROVADO`. Se reprovado, ajuste e repita (no máximo 2 tentativas; depois desista e registre a candidata como descartada).

## 5. Publicar (faz backup da versão anterior, registra no CHANGELOG e respeita limites diários)
`node "$HOME/.claude/advogado/scripts/habilidades.js" publicar <nome> "<motivo em uma frase>" [id-da-candidata]`

## 6. Informar (sem pedir permissão)
Uma linha ao final da resposta: "🆕 Criei o atalho **/auto-<nome>** para <tarefa>. Se não gostar: /habilidades desfazer <nome>."

## Depois de publicada
- Ao usar uma `auto-*`: sucesso → `habilidades.js resultado <nome> ok`; erro, retrabalho ou correção do usuário → `resultado <nome> falha "<motivo>"`. Com 2 falhas ela é **aposentada automaticamente** (vai para `_aposentadas`, restaurável).
- Para melhorar: copie a versão viva para `rascunhos/<nome>/`, edite, e repita 3→5 (a versão anterior fica em backup).
