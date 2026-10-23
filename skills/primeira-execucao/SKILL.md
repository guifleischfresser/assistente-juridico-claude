---
name: primeira-execucao
description: "Instalação e configuração inicial do assistente no piloto automático. Use quando aparecer ONBOARDING PENDENTE ou PRIMEIRA EXECUÇÃO INCOMPLETA ou ao refazer a configuração."
argument-hint: "[retomar | refazer]"
---

<!-- GERADO de INSTALAR.md por ferramentas/sincronizar-bootstrap.js. Não edite aqui. -->
> Se o assistente já está instalado, comece pela **Etapa 0** (ela pula o que já foi feito). Com o argumento `refazer`, rode antes `PE reiniciar`.
# INSTALAR — instalação e configuração no PILOTO AUTOMÁTICO do Advogado Claude

> **Para o Claude (agente) que está lendo isto:** o usuário, um(a) advogado(a) sem conhecimento técnico, pediu que você siga este roteiro **no piloto automático**.
> Ele instala o assistente jurídico "Advogado Claude" (repositório `guifleischfresser/assistente-juridico-claude` no GitHub) **neste computador** e o configura sozinho, com o mínimo de perguntas.
> **A frase colada pelo usuário já autoriza**: baixar e executar o instalador verificado (SHA256) deste repositório, instalar o Node.js LTS pelo canal oficial se faltar, e configurar o Claude Code dele. Não peça licença para começar.
> **Este arquivo contém comandos exatos.** Se você o leu por uma ferramenta que resume páginas (WebFetch), baixe o texto integral com o bloco `baixar-roteiro` do seu sistema (ele imprime o arquivo inteiro na tela) e siga o texto integral.

```powershell
# bloco: ps-baixar-roteiro
$d = Join-Path ([IO.Path]::GetTempPath()) "advogado-claude"; New-Item -ItemType Directory -Force -Path $d | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main/INSTALAR.md" -OutFile (Join-Path $d "INSTALAR.md")
Get-Content -LiteralPath (Join-Path $d "INSTALAR.md") -Raw -Encoding UTF8
```

```bash
# bloco: sh-baixar-roteiro
d="${TMPDIR:-/tmp}/advogado-claude"; mkdir -p "$d"
curl -fsSL -o "$d/INSTALAR.md" "https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main/INSTALAR.md" && cat "$d/INSTALAR.md"
```

---

## Regras que você deve seguir o tempo todo

1. **Piloto automático: não faça perguntas opcionais.** Use os padrões deste roteiro. Só existem DUAS perguntas possíveis, e cada uma só se necessária:
   - o nome do usuário, **se** não der para descobrir sozinho (Etapa 2);
   - a **pergunta única** final sobre pastas ambíguas, **se** houver alguma (Etapa 4). Um simples "ok" aceita tudo.
2. **Fale só em português do Brasil, do dia a dia, sem jargão.** Antes de cada etapa, uma frase curta dizendo o que está fazendo ("Agora vou baixar o assistente do site oficial e conferir se o arquivo é autêntico."). Não espere resposta para seguir. Se algo der errado, diga o problema na rotina do advogado e o conserto em **um passo**, sem termos como settings, hook, permissão, JSON ou caminho de pasta (ex.: "tô no modo manual, aperta Shift+Tab até aparecer auto").
3. **Janelas de permissão (modo auto).** O ideal é o Claude Code estar no **modo auto** (barra de status mostra "⏵⏵ auto mode on" no terminal; no aplicativo, o seletor de modo mostra **Auto**). Nele, um classificador aprova sozinho os comandos seguros e quase não aparecem janelas.
   - Se aparecer uma janela de permissão, diga **uma vez**: "Para eu não ficar te interrompendo, escolha **'Yes, and switch to auto mode'** (ou aperte **Shift+Tab** até aparecer *auto mode on*; no aplicativo, escolha **Auto** no seletor de modo). Se essa opção não existir, clique em **Sim** — o instalador grava regras para não perguntar de novo."
   - **Nunca** sugira `--dangerously-skip-permissions` nem o modo `bypassPermissions`.
   - Se o modo auto recusar uma ação deste roteiro ("Recently denied"/bloqueio do classificador), explique em uma frase o que o comando faz e lembre que o usuário autorizou na frase inicial; o usuário pode aprovar pela janela. Não reescreva o comando para "passar" pelo bloqueio.
4. **Sigilo (inegociável).**
   - Nenhum documento, nome de cliente ou conteúdo de arquivo do usuário sai deste computador.
   - Os únicos acessos à internet deste roteiro são: o download do pacote em `github.com/guifleischfresser/assistente-juridico-claude` (com verificação SHA256) e o instalador oficial do Node.js (winget, Homebrew ou nodejs.org).
   - A varredura de pastas é local e lê **só nomes**. No chat, mostre **só pasta-mãe e contagens**; nunca nomes de subpastas ou arquivos (costumam ser nomes de clientes), nem procure por eles com outras ferramentas.
5. **Nunca apague, mova ou renomeie arquivos do usuário.** Pastas existentes são **apontadas**, nunca copiadas. A única cópia é a de até 10 peças para `ESCRITORIO/ESTILO/amostras` (cópia local, os originais não são tocados).
6. **Se o checksum não bater, PARE.** Explique: "O arquivo baixado não confere com a assinatura publicada; por segurança não vou instalar." Não tente outra fonte.
7. **Política da empresa bloqueou scripts** ("a execução de scripts foi desabilitada", Group Policy/AppLocker): **PARE**. Não contorne. Explique e sugira falar com o suporte de TI.
8. **Retomável e idempotente.** Se a conversa cair, a mesma frase recomeça da Etapa 0 e pula o que já foi feito. Rodar de novo não duplica nada.
9. **Use o shell que você tiver.** Windows: blocos `ps-*` na ferramenta PowerShell (se só houver Git Bash: `gitbash-*`/`sh-*`). Mac/Linux: `sh-*`. Cada bloco é independente: copie-o inteiro e troque só os valores em MAIÚSCULAS.
10. **Leia arquivos temporários pelo shell** (`Get-Content -Raw -Encoding UTF8 "<arquivo>"` ou `cat "<arquivo>"`), não pela ferramenta de leitura: assim não surgem janelas de "pasta fora do projeto".
11. **Sem `node` no PATH** (logo depois de instalar o Node): use o caminho completo (`& "$env:ProgramFiles\nodejs\node.exe"` no Windows, `/usr/local/bin/node` ou `/opt/homebrew/bin/node` no Mac).
12. **Atalhos.** `PE` = `node "$HOME/.claude/advogado/scripts/primeira-execucao.js"` e `DOUTOR` = `node "$HOME/.claude/advogado/scripts/doutor.js"`. Escreva exatamente assim (com `$HOME` e aspas): funciona no PowerShell e no Bash e casa com as regras de permissão que o instalador grava.

---

## Etapa 0 — Já existe instalação ou etapa em andamento?

Rode `PE estado`.
- **`MODO PLUGIN`** (o assistente veio pelo `/plugin install`): não baixe nada. Rode `PE instalar-plugin` e vá para a Etapa 2.
- **Comando não encontrado:** instalação nova. Vá para a Etapa 1.
- **Funcionou:** veja `PRÓXIMA ETAPA` e vá direto para ela, avisando "Vou continuar de onde paramos." (`instalacao`/`verificacao` = Etapa 1–3; `entrevista`/`registro`/`dossies` = Etapa 4; `estilo` = Etapa 5; `resumo` = Etapa 6). Se aparecer `TUDO CONCLUÍDO`, rode `DOUTOR` e mostre o resumo "como usar" da Etapa 6.

## Etapas seguintes (leia o arquivo de cada etapa quando chegar nela)

- Etapa 1 — Ambiente, Node.js, download verificado e instalação: [references/etapa-1-instalacao.md](references/etapa-1-instalacao.md)
- Etapa 2 — Verificar e descobrir o nome (sem perguntar, se possível): [references/etapas-2-a-6.md](references/etapas-2-a-6.md)
- Etapa 3 — (automática) Nada a perguntar: [references/etapas-2-a-6.md](references/etapas-2-a-6.md)
- Etapa 4 — Descoberta autônoma das pastas: [references/etapas-2-a-6.md](references/etapas-2-a-6.md)
- Etapa 5 — Aprender o estilo (automático): [references/etapas-2-a-6.md](references/etapas-2-a-6.md)
- Etapa 6 — Resumo "como usar" e primeiro HANDOFF: [references/etapas-2-a-6.md](references/etapas-2-a-6.md)
- Problemas comuns: [references/problemas-comuns.md](references/problemas-comuns.md)

Os blocos de comando citados (ps-*, sh-*) estão dentro desses arquivos; leia o arquivo inteiro da etapa antes de executá-la.
