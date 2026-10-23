# Avisos do diagnóstico: o que dizer e como consertar

> Parte da skill /consertar, lida só quando necessária. O mesmo diagnóstico roda no início de cada conversa (`lib/diagnostico.js`) e no doutor. O texto entre aspas é o que o advogado lê; a coluna "técnico" é só para você.

| id | O que dizer ao advogado (causa + 1 passo) | Técnico | Conserto |
|---|---|---|---|
| `modo-auto` | "Tô no modo manual, por isso vou ficar te pedindo licença — aperta Shift+Tab até aparecer “auto” (no aplicativo, escolha Auto no seletor de modo)." | `permissions.defaultMode` ≠ `auto`, ou a sessão abriu em `default` | `--consertar` grava `defaultMode: "auto"` (com backup). Se a sessão abre em Manual mesmo assim, o plano/empresa não libera o modo auto: o aviso aparece no máximo 1x por dia; "é só clicar Sim". Para silenciar: `config.json` → `"avisos": { "modoAuto": false }`. |
| `escritorio` | "Não tô conseguindo abrir a pasta do escritório…" | ESCRITORIO inexistente/sem leitura | Se mudou de lugar: pergunte onde está e rode o instalador com `--escritorio "<novo>"` (via `/consertar`, que usa a cópia local). |
| `externa` | "Não tô achando a pasta “X” (suas peças já escritas)…" | pasta de `pastasExternas` inacessível | Ver "Pasta que mudou de lugar". |
| `pasta-caso` | "Não acho mais os documentos do caso “Y” no lugar de antes…" | `Pasta original` do DOSSIE.md inacessível | Pergunte onde estão; atualize a linha **Pasta original** do `DOSSIE.md` daquele caso (Edit). |
| `diretorios` / `diretorios-externos` | "O Claude perdeu a chave da pasta do escritório / da pasta “X” — digita /consertar que eu devolvo." | fora de `permissions.additionalDirectories` | `--consertar` (reinstala / re-sincroniza o mapa). |
| `permissoes` | "Uma atualização do Claude apagou as licenças que eu tinha pra usar as ferramentas do assistente…" | regras de `permissions.allow` do instalador ausentes | `--consertar`. |
| `hooks` | "Algumas proteções do assistente (sigilo, cópia de segurança das peças, aviso de prazo) foram desligadas…" | hooks do assistente ausentes no settings | `--consertar`. |
| `claude-md` | "As regras do assistente sumiram das instruções do Claude…" | bloco `advogado-claude-mod` ausente no CLAUDE.md global | `--consertar`. |
| `plugin` | "O assistente jurídico foi desligado no Claude — digita /plugin, ativa o advogado-claude e depois /reload-plugins." | plugin desativado em `enabledPlugins` | Só o usuário ativa (não há conserto automático). |

## Pasta que mudou de lugar
1. Uma pergunta só: "Onde está agora a pasta “X”? Pode arrastar a pasta aqui pra conversa." Se ele disser que apagou de propósito, só remova o registro.
2. Remova o registro antigo e registre o novo (mesmo tipo que aparece no aviso técnico):
   - `node "$HOME/.claude/advogado/scripts/primeira-execucao.js" remover "<caminho antigo>"`
   - `node "$HOME/.claude/advogado/scripts/primeira-execucao.js" registrar <tipo> "<caminho novo>"`
3. Confirme em uma linha: "Pronto, reconectei a pasta “X”." Nunca copie, mova ou renomeie a pasta do advogado.
