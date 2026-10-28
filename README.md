# ⚖️ Advogado Claude: seu assistente jurídico no Claude Code

Este kit transforma o Claude Code num assistente para o seu escritório de advocacia. Funciona 100% em português e foi feito para o Direito brasileiro: CPC, CC, CLT e CF, Resolução CNJ nº 615/2025 e Recomendação CFOAB nº 001/2024.

> 🔒 **Sigilo em primeiro lugar.** Seus documentos ficam no seu computador. Nada é enviado para a internet ou para outros serviços sem você pedir.

---

## 1. Instalar: cole uma frase (piloto automático)

**Você só precisa do Claude Code instalado e com login feito** (no terminal, ou no aplicativo **Claude** na aba **Code**, com o ambiente **Local**), numa assinatura que dê acesso ao Claude Code. Nada mais: nem Node.js, nem Git, nem baixar arquivos. O resto o próprio Claude instala.

**Antes de colar (recomendado, 5 segundos): ligue o modo auto.** Ele deixa o Claude aprovar sozinho as ações seguras, sem janelas a cada passo.
- No terminal: aperte **Shift+Tab** até aparecer **⏵⏵ auto mode on** embaixo (nas versões recentes do Claude Code ele já vem ligado).
- No aplicativo: no seletor de modo, ao lado da caixa de mensagem, escolha **Auto**.
- Se a opção não existir (plano, modelo ou empresa não liberam), tudo bem: funciona igual, só com algumas janelas de "Sim" a mais.

Abra uma conversa nova e **cole esta frase**:

```
Leia o arquivo https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main/INSTALAR.md inteiro e siga as instruções para instalar meu assistente jurídico no piloto automático. Autorizo baixar e executar o instalador verificado desse repositório e instalar o Node.js LTS se faltar.
```

A partir daí o Claude faz **tudo sozinho**, sem perguntas opcionais:

1. Confere o computador (Windows ou Mac) e, se faltar, **instala o Node.js** pelo canal oficial (winget/Homebrew).
2. **Baixa o assistente** do GitHub pela versão fixada e **confere a assinatura digital (SHA256)**. Se não conferir, ele para e não instala.
3. **Instala e testa** (com atalho "Escritorio Claude" na Área de Trabalho, no Windows) e deixa o Claude Code configurado para as próximas conversas: **modo auto**, modelo **Opus 5.5** com **esforço médio** e **memória automática**.
4. **Descobre seu nome** (pela configuração do computador) ou pergunta uma única vez, se não achar.
5. **Procura sozinho, só pelos nomes**, onde ficam suas peças, modelos, casos e controle de prazos, e **registra sem mover nem copiar** as pastas de que tem certeza. Cria um **dossiê** para cada caso encontrado e copia até 10 peças para aprender seu estilo (cópia local; os originais não são tocados).
6. Se ficou em dúvida sobre alguma pasta, faz **uma única pergunta no final**, com tudo junto. Responder **"ok"** aceita as sugestões.
7. Aprende seu jeito de escrever e termina com um resumo de como usar.

Se a conversa cair no meio, cole a frase de novo: ele **continua de onde parou** e não duplica nada.

### O que ainda depende de você (lista completa)

| # | O quê | Quando |
|---|---|---|
| 1 | Colar a frase | Sempre |
| 2 | Dizer como prefere ser chamado(a) | Só se o nome não estiver na configuração do computador (Git ou nome completo da conta) |
| 3 | Responder **"ok"** (ou corrigir) à pergunta única sobre pastas | Só se alguma pasta ficou ambígua |
| 4 | Clicar **Sim** na janela do Windows (UAC) ao instalar o Node.js | Só no Windows sem Node.js. No Mac sem Homebrew: seguir a janela do instalador do Node; Windows sem winget ou Linux: instalar o Node LTS de nodejs.org |
| 5 | Janelas de permissão do Claude Code | **Modo auto ligado: em geral nenhuma** (no máximo 1, se o classificador pedir confirmação de algo). **Sem modo auto:** cerca de 4 a 7 cliques em "Sim" na primeira instalação (ler o roteiro, conferir o computador, baixar, instalar, e o Node se faltar); depois disso, as regras gravadas pelo instalador cobrem os scripts do assistente |
| 6 | Fechar e abrir o Claude Code no fim | Recomendado (ativa atalhos, barra de status e o modo/modelo configurados) |

No caso típico (modo auto, Node já instalado, nome encontrado), você **cola a frase e, no máximo, responde "ok"**.

> 🔐 O assistente **nunca** usa `--dangerously-skip-permissions` nem o modo "bypass permissions". As guardas de sigilo (bloqueio de envio de dados de clientes, de escrita em memória global com CPF/processo etc.) continuam valendo também no modo auto.

### Instalar pelo próprio Claude, como plugin (alternativa)
Dentro do Claude Code (terminal ou aba Code do aplicativo), digite, um de cada vez:

```
/plugin marketplace add guifleischfresser/assistente-juridico-claude
/plugin install advogado-claude@advogado-claude-mod
/reload-plugins
```

Depois abra uma conversa nova **dentro da pasta onde quer o escritório** e diga "oi". O assistente percebe que veio pelo plugin e termina a configuração sozinho (sem baixar nada de novo: `PE instalar-plugin`), igual à frase acima.
- No modo plugin, os atalhos têm prefixo: **`/advogado-claude:nova-peca`**, `/advogado-claude:processo` etc. (os nomes são os mesmos da tabela abaixo).
- Atualizar: `/plugin marketplace update advogado-claude-mod` e `/reload-plugins`. A versão do plugin é fixada no `plugin.json`.
- Os dois caminhos dão o mesmo assistente. Não use os dois ao mesmo tempo; se instalou pela frase e depois pelo plugin, a configuração do plugin remove os ganchos duplicados sozinha.

### Instalar sem a frase (manual)
1. Baixe `advogado-claude-mod.zip` na página **Releases** do repositório e descompacte.
2. No Windows, dê dois cliques em **`instalar.bat`**. No Mac, dê dois cliques em **`instalar.command`** (se o Mac bloquear: botão direito → Abrir).
3. Abra o Claude Code na pasta `ESCRITORIO` e digite `/primeira-execucao` para a configuração automática.

---

## 2. Destaque: ele aprende e se aprimora sozinho

Cada assistente vira, com o uso, **o assistente daquele advogado**. Sem pedir aprovação (tudo local, com backup, histórico e opção de desfazer), ele:

- 🧩 **Cria habilidades sozinho.** Quando você pede a mesma coisa 3 vezes (ex.: "faça uma procuração ad judicia"), ele transforma o procedimento numa habilidade nova. Também revisa a conversa ao fim de cada etapa e no handoff para ver se algo merece virar habilidade. Toda habilidade passa por rascunho → validação → ensaio → publicação, e pode ser desfeita em `/habilidades`.
- ✍️ **Aprende com as suas correções.** Ele guarda o rascunho de cada peça que escreve. Quando você edita a peça (no arquivo ou no Word), ele compara o rascunho com a sua versão final e atualiza `ESTILO/perfil-de-escrita.md` ("você troca *outrossim* por *ademais*", "você encurta as frases").
- 🗂️ **Mantém a memória de cada caso** no `DOSSIE.md` da pasta do caso.
- 📝 **Memoriza suas preferências e os erros a não repetir** em `ESCRITORIO/MEMORIA/preferencias-e-cuidados.md`. Item que não se confirma em 120 dias vai para o arquivo morto.
- 🧹 **Faz a própria faxina**: mantém as instruções globais curtas (aponta, não copia), funde repetições, poda o que ficou velho e registra tudo em `MEMORIA/CHANGELOG.md`, com backup.
- 🧽 **Faz manutenção das próprias habilidades a cada 15 dias.** Sozinho, no início de uma conversa: mede quanto cada habilidade ocupa da "memória de trabalho" do Claude, encurta descrições longas, move detalhes para arquivos lidos só quando precisa, junta atalhos repetidos e aposenta os que você não usa há 45 dias. Tudo com backup, ensaio e histórico; você vê uma linha só ("Manutenção feita: 3 skills enxugadas, 1 aposentada, contexto fixo das skills -38%") e pode desfazer com `/manutencao desfazer`. Relatório em `ESCRITORIO/MEMORIA/revisoes/`.
- ⏱️ **Sem você lembrar**: a rotina de reflexão roda sozinha a cada ~30 ações ou depois de uma peça escrita (hook `Stop`), no fim de cada conversa (hook `SessionEnd`, retomada na conversa seguinte) e em todo handoff.
- 🔒 **Dado de cliente nunca vai para a memória global.** CPF, CNPJ, nº de processo, e-mail e telefone ficam **só** no dossiê do caso. O sistema recusa gravá-los no CLAUDE.md, na memória automática do Claude Code, em `MEMORIA/` ou no perfil de estilo, e a faxina apaga o que escapar.

## 3. O que o assistente faz

**Novidades da v0.7 — calendário forense do seu tribunal e da sua comarca:**
- 📅 O prazo agora é contado com o calendário **daquele caso**: feriados municipais e estaduais, suspensões de prazo e dias de sistema fora do ar do tribunal/comarca do processo. Feriado de Curitiba não mexe em prazo de Londrina.
- ✍️ Você cadastra cada data **com a fonte** (lei, portaria, ato ou link). O assistente não traz lista pronta inventada; data sem fonte fica marcada **[SEM FONTE]** e é lembrada em todo cálculo.
- 🔁 Ao cadastrar uma suspensão, ele mostra quais prazos da sua lista mudam (antes → depois) e **só reescreve depois do seu "sim"**. Vencimento que cai em feriado, suspensão ou indisponibilidade passa para o próximo dia útil (CPC art. 224 §1º), já na barra de status.

**Novidades da v0.6:**
- 🩺 **Avisa quando o Claude "perde o fio"**: no começo de cada conversa ele confere se está no modo automático, se as pastas dos seus casos continuam no lugar e se uma atualização do Claude não tirou algum acesso. Se algo mudou, a primeira coisa que você lê é o problema, em português do dia a dia, e o conserto em um passo (por exemplo: "tô no modo manual, aperta Shift+Tab até aparecer auto" ou "o Claude perdeu a chave da pasta das peças — digita /consertar").
- 🕵️ **Nada de texto escondido**: ele se recusa a gravar ou exportar peça com fonte branca, letra minúscula, texto oculto do Word ou caracteres invisíveis. E avisa quando um documento que chegou (autos, PDF, site) traz um recado escondido para a IA, sem obedecer.
- 🧹 **Atalhos parecidos**: a arrumação de 15 dias só junta atalhos que o próprio assistente criou. Se um atalho seu ou do núcleo parecer com outro, ele só anota no relatório e não mexe.

**Novidades da v0.5:**
- 🗺️ **Mapa de teses da defesa** (`/mapa-de-teses`): lê a petição inicial e monta um quadro por pedido, com valor, risco (alto/médio/baixo, no padrão provável/possível/remota), teses de defesa e precedentes. Soma a exposição por risco e gera uma versão para imprimir. Todo precedente sai marcado **[A VERIFICAR]** até ser conferido.
- 🔍 **Conferência de julgados**: verifica se o julgado existe e se o trecho entre aspas bate **palavra por palavra** com o original (mostra o que diverge). Antes de ir à internet ele **pergunta**; você pode autorizar só os sites oficiais dos tribunais e o JusBrasil. Sem permissão, fica **[NÃO VERIFICADO]**. Julgado divergente trava a exportação para Word.
- 📁 **Uma conversa por processo** (`/processo <nome ou número>`, ou `/cliente`): abre só o dossiê e o "onde paramos" daquele caso, lembra disso ao retomar a conversa e avisa se você mexer em outro caso na mesma conversa.
- 🛑 **Não repete o erro que você já corrigiu** (`/erros`): quando você corrige algo reconhecível no texto (tribunal errado, expressão, formatação), ele registra. Na segunda correção, a peça com aquele erro **não é gravada** até ser corrigida.
- 🧬 **Habilidades com histórico e sem duplicatas**: cada atalho automático tem ficha de origem (quando, por quê, em que tipo de peça, cada mudança: `/habilidades proveniencia <nome>`). Atalhos parecidos são juntados, e a automação **só mexe nos atalhos que ela mesma criou**: nunca nos do núcleo nem nos que você escreveu.
- 🔁 **Funciona também no Codex e no Cursor**: a pasta do escritório ganha um `AGENTS.md` com as mesmas regras (o Claude Code continua sendo o principal; só nele as proteções rodam sozinhas).

- 📁 **Organiza seus casos**, cada um com um **dossiê** (resumo, partes, fatos, prazos, histórico). Casos que já existem no seu computador ganham dossiê **apontando para a pasta original**.
- ✍️ **Aprende o seu jeito de escrever**, para que o texto não fique com "cara de robô".
- 📄 **Redige e formata peças** e exporta para Word (.docx) no padrão forense: A4, margens 3/2 cm, Times 12, espaçamento 1,5.
- 🔎 **Não inventa jurisprudência.** Citação sem fonte fica marcada como **[NÃO VERIFICADO]**, e a exportação trava até você conferir.
- 😈 Tem um **advogado do diabo**, que ataca a sua peça antes da parte contrária.
- 📚 **Lê os autos em PDF uma vez só**, transforma em texto e tira as repetições, o que economiza o seu limite de uso.
- 🛡️ **Avisa sobre instruções escondidas** em documentos da parte contrária.
- ⏰ **Controla prazos em dias úteis**, considerando o recesso forense, os feriados nacionais e o **calendário forense local** de cada caso (veja abaixo).
- 🧠 **Aprende sozinho.** Quando percebe uma tarefa repetida, cria um atalho novo. Tudo fica registrado e pode ser desfeito.
- 🩺 **Conserta a si mesmo**: digite `/consertar`.

## 4. Comandos

Digite a barra `/` e o nome do comando:

| Comando | Para quê |
|---|---|
| `/boas-vindas` | Configuração inicial (ou refazer) |
| `/ajuda` | Mostra o que o assistente sabe fazer |
| `/processo` (ou `/cliente`) | Abre ou retoma **um** processo nesta conversa (uma conversa por processo) |
| `/novo-caso` | Abre um caso novo, com pasta e dossiê |
| `/casos` | Lista os casos, mostra a situação de cada um, move para "Arquivados" |
| `/preparar-autos` | Converte os PDFs do caso em texto, uma vez só (economiza muito) |
| `/nova-peca` | Redige uma peça no seu estilo (inicial, contestação, recurso, contrato, parecer…) |
| `/revisar` | Revisa uma peça: citações, clareza, erros, "cara de IA" |
| `/advogado-do-diabo` | Ataca a peça como a parte contrária faria |
| `/mapa-de-teses` | Mapa de teses da defesa por pedido da inicial (valor, risco, teses, precedentes) |
| `/verificar-citacoes` | Confere se os julgados existem e se o trecho citado bate com o original; marca [NÃO VERIFICADO] onde não deu |
| `/erros` | Mostra os erros que você já corrigiu e que o assistente não pode repetir |
| `/formatar-peca` | Formata e exporta para Word (.docx) |
| `/prazos` | Mostra os prazos, calcula vencimentos em dias úteis e cadastra feriados locais e suspensões do tribunal |
| `/aprender-meu-estilo` | Aprende (ou reaprende) o seu jeito de escrever |
| `/handoff` | Salva um resumo do trabalho para continuar depois |
| `/habilidades` | Mostra as habilidades que o assistente criou sozinho e permite desfazer |
| `/manutencao` | Faz agora a manutenção das habilidades (ela já roda sozinha a cada 15 dias); `/manutencao desfazer` volta atrás |
| `/reflexao` | Pede agora a rotina de auto-aprendizado (ela já roda sozinha) |
| `/consertar` | Verifica se está tudo funcionando e conserta sozinho |
| `/primeira-execucao` | Refaz ou continua a configuração inicial |
| `/backup` | Copia o escritório para um HD externo ou pendrive |

### Calendário forense: feriados locais e suspensões
Cada caso guarda o seu foro no dossiê (`Tribunal: TJPR · Comarca: Curitiba`). Exemplo de conversa:

> **Você:** suspensão de prazos no TJPR de 04 a 06/11 por indisponibilidade do sistema, Portaria nº … (cole o número ou o link)
> **Assistente:** gravei no calendário do TJPR. Isto muda: *Silva x Banco — contestação: 10/11/2026 → 13/11/2026*. Posso atualizar a sua lista de prazos?
> **Você:** pode.

E no cálculo: *"Prazo de 15 dias úteis no TJPR, comarca de Curitiba: vence 12/11/2026 (considerei o feriado municipal X e a suspensão da Portaria Y)"*. Para ver o que está cadastrado: `/prazos` e peça "calendário do TJPR em Curitiba". Tudo fica no seu computador (`~/.claude/advogado/calendario.json`) e continua lá se você reinstalar ou desinstalar.

### A barra de status (embaixo da tela)
`⚖️ Dra. Ana │ 📁 Silva x Banco (contestação) │ 🧠 memória 42% ▓▓▓▓░░░░ │ ⏰ prazo em 2 dias úteis (12/11): contestação`

- **🧠 memória:** quanto da "memória de curto prazo" da conversa já foi usado. Em **75%**, o assistente salva um resumo (⚠️ HANDOFF AUTOMÁTICO) para você continuar numa conversa nova sem perder nada.
- **⏰ prazo:** o próximo prazo da sua lista `PRAZOS.md`, com a data já prorrogada se cair em feriado ou suspensão do foro do caso.

---

## 5. Onde ficam as coisas

```
ESCRITORIO/
├── ESTRUTURA.md      ← o mapa do escritório (leia uma vez)
├── mapa-de-pastas.md ← onde ficam suas pastas antigas (só apontadas, nunca copiadas)
├── PRAZOS.md         ← sua lista de prazos
├── CASOS/
│   ├── Ativos/       ← cada caso tem DOSSIE.md, documentos/, autos-md/ e pecas/
│   ├── Em análise/
│   └── Arquivados/
├── PECAS/            ← seus modelos e peças prontas
├── ESTILO/           ← suas amostras e o seu "perfil de escrita" (atualizado com as suas edições)
├── MEMORIA/          ← preferências e cuidados que o assistente aprendeu + histórico (nunca dados de clientes)
├── WIKI/             ← jurisprudência e legislação que você já conferiu
├── HANDOFFS/         ← resumos para continuar o trabalho
└── EXPORTADOS/       ← os arquivos .docx gerados
```

Tudo são arquivos comuns no seu computador. Você pode abrir no Word, no Bloco de Notas ou no Explorer.

---

## 6. Privacidade e sigilo (LGPD)

- **Local primeiro:** seus casos ficam **no seu computador**. O assistente não usa serviços na nuvem, não envia e-mails e não faz upload de nada sem você pedir expressamente; se tentar, ele para e pergunta.
- **Pesquisas na internet** só acontecem com a sua autorização, e nunca com nome, CPF ou número de processo de cliente. A cada acesso a um site que você não autorizou, o Claude Code mostra uma janela pedindo confirmação. Para conferir julgados sem tantas janelas, autorize de uma vez só os sites oficiais (STF, STJ, TST, TJs/TRFs/TRTs) e o JusBrasil quando o assistente perguntar; para desligar a internet de vez, peça "nunca consulte a internet" (ele grava `"verificacaoOnline": "nunca"`).
- **Uma conversa por processo:** o que é de um cliente fica na pasta do caso (`DOSSIE.md`). A memória geral do assistente guarda só estilo e método, nunca dados de clientes.
- **Na primeira execução**, a busca pelas suas pastas é feita no seu computador, só pelos nomes, e o assistente mostra apenas a pasta principal e contagens (ex.: "Documentos/Clientes: 37 pastas"). Nomes de subpastas e arquivos, que costumam ser nomes de clientes, não aparecem na conversa.
- **Suas pastas originais** (petições, modelos, casos) são só **lidas**. Se o assistente precisar gravar numa delas, ele pede confirmação; o normal é salvar no ESCRITORIO.
- **Histórico de conversas por 14 dias:** depois disso, o Claude Code apaga as conversas antigas do seu computador, porque elas podem conter trechos de documentos.
- **Não apaga nada:** antes de alterar um arquivo, ele guarda uma cópia em `ESCRITORIO/_versoes`.
- **Importante:** o texto da conversa é processado pelos servidores da Anthropic, porque é assim que o Claude funciona. Avalie, com base no Código de Ética da OAB e na Recomendação CFOAB nº 001/2024, o que é adequado compartilhar, e considere obter o consentimento do cliente (há um modelo em `PECAS/modelos/termo-consentimento-ia.md`).
- **Evite** colocar a pasta ESCRITORIO dentro do OneDrive, Google Drive ou Dropbox, a menos que o seu escritório já use esses serviços de forma adequada para dados de clientes.

---

## 7. Ler PDFs (recomendado)

O assistente lê arquivos Word sozinho. Para ler **PDFs dos autos** com qualidade, instale uma destas ferramentas gratuitas, que funcionam offline:

- **Windows:** abra o PowerShell e digite `winget search poppler`; depois instale o resultado com `winget install <nome que aparecer>`. Alternativa: `pip install markitdown` (requer Python).
- **Mac:** `brew install poppler`
- **PDFs escaneados (foto de papel):** instale também o **Tesseract** com o idioma português. No Mac: `brew install tesseract tesseract-lang`. Depois use `/preparar-autos` e peça "com OCR".

Sem essas ferramentas, o assistente avisa e você pode converter o PDF de outra forma (por exemplo, "Salvar como texto" no leitor de PDF).

---

## 8. Backup

Use `/backup`, ou copie a pasta `ESCRITORIO` inteira para um HD externo. As configurações do assistente ficam em `C:\Users\SeuNome\.claude` (Windows) ou `~/.claude` (Mac).

## 9. Desinstalar

Peça ao Claude: "desinstale o assistente jurídico". Ele roda `node ~/.claude/advogado/pacote/scripts/instalar.js --desinstalar`. Também é possível dar dois cliques em `desinstalar.bat` (Windows) ou rodar `bash desinstalar.sh` (Mac) no pacote baixado. **Sua pasta ESCRITORIO não é apagada nem alterada.**

---

## 10. Perguntas frequentes

**O assistente substitui a minha revisão?**
Não. Ele é um assistente, e quem assina e responde pela peça é você. Toda citação marcada [NÃO VERIFICADO] precisa ser conferida na fonte oficial antes do protocolo.

**Ele inventa jurisprudência?**
Modelos de IA podem "inventar" julgados. Por isso o kit marca automaticamente qualquer citação sem fonte e trava a exportação para Word até você conferir. Quando conferir, cole o link ou registre na WIKI.

**Como o assistente confere um julgado?**
Ele procura primeiro nos seus arquivos (WIKI e autos). Se não achar e você autorizar, abre a página oficial do tribunal (ou do JusBrasil) só com o número do julgado, guarda o texto original em `WIKI/raw/` e compara com o trecho entre aspas da sua peça: ✅ confere, ou 🔴 diverge (mostra as palavras que não estão no original). Um serviço externo opcional de verificação de citações é o **Basanos** (cognitio.one); ele **não** é integrado ao assistente, e usá-lo é decisão sua, fora do Claude.

**Posso usar o mesmo escritório no Codex ou no Cursor?**
Sim. A pasta do escritório tem um `AGENTS.md` com as mesmas regras (sigilo, não inventar citação, uma conversa por processo). Abra o Codex/Cursor **dentro da pasta do escritório**. Para o Codex encontrar também as habilidades: `node "$HOME/.claude/advogado/scripts/agentes.js" gerar --skills`. Atenção: as proteções automáticas (janelas de confirmação, bloqueio de dados de clientes) só existem no Claude Code; nos outros, o `AGENTS.md` pede que as conferências sejam feitas à mão.

**Como sei se o Claude leu as minhas instruções?**
Digite `/consertar`: ele confere a "palavra de conferência" escrita nas instruções globais. Se ele não souber a palavra, as instruções não foram carregadas e ele diz o que fazer.

**O que é a "habilidade criada sozinha"?**
Se você pede três vezes algo parecido (por exemplo, "faça uma procuração ad judicia"), o assistente cria um atalho para isso. Ele avisa em uma linha, guarda tudo em `/habilidades` e você pode desfazer a qualquer momento. Se uma habilidade falhar duas vezes, ela é aposentada automaticamente.

**Por que o modo auto e o Opus 5.5?**
O modo auto evita que você precise clicar em "Sim" a cada passo: um classificador da Anthropic aprova as ações seguras e barra as arriscadas, e as guardas de sigilo do assistente continuam ativas por cima. O instalador deixa as próximas conversas começarem no modo auto, com o modelo Opus 5.5 (`claude-opus-5-5`) em esforço médio. Você pode mudar quando quiser (`/model`, `/effort`, Shift+Tab); o assistente respeita a sua escolha e, ao desinstalar, devolve o que havia antes.

**O assistente grava coisas sem me perguntar?**
Sim, de propósito: habilidades e memórias de trabalho (preferências, estilo, dossiês). Tudo fica no seu computador, com backup e histórico (`MEMORIA/CHANGELOG.md`, `/habilidades`), e pode ser apagado ou desfeito. Dados de clientes só ficam na pasta do próprio caso.

**O que é a "manutenção das habilidades"?**
Cada habilidade deixa uma descrição curta carregada em toda conversa, para o Claude saber quando usá-la. Com o tempo, atalhos criados sozinho se acumulam e ocupam espaço. A cada 15 dias, ao abrir uma conversa, o assistente arruma isso sozinho (sem agendador do sistema e sem nada sair do computador) e mostra uma linha com o resultado. Ele só mexe nos atalhos que ele mesmo criou: as habilidades principais e as que você escreveu ficam intactas. Para ver antes: `/manutencao simular`; para voltar atrás: `/manutencao desfazer`.

**A memória chegou a 75%. E agora?**
O assistente salva um resumo sozinho. Feche e abra uma conversa nova (ou digite `/clear`). Ele continua de onde parou.

**Funciona sem internet?**
O Claude precisa de internet para pensar. Os seus arquivos, porém, ficam no seu computador.

**Deu erro. O que faço?**
Digite `/consertar`: o assistente verifica tudo e conserta sozinho, sem apagar nada. Se não resolver, cole de novo a frase de instalação; ela retoma de onde parou e não duplica nada.

**Por que o histórico das conversas some depois de 14 dias?**
As conversas ficam gravadas no seu computador e podem conter trechos de documentos de clientes. Por sigilo, o assistente configura o Claude Code para apagá-las após 14 dias. O que importa continua salvo nos dossiês e handoffs. Se você já tinha um valor próprio, ele foi mantido. Para mudar, ajuste `cleanupPeriodDays` em `~/.claude/settings.json`.

---

## Para mantenedores
- O roteiro da instalação autônoma é `INSTALAR.md`. A skill `skills/primeira-execucao/SKILL.md` é gerada dele com `node ferramentas/sincronizar-bootstrap.js`.
- Para testar: `node testes/rodar-testes.js` e `node testes/simular-bootstrap.js [--shell pwsh|powershell]`.
- Para publicar uma versão: veja **PUBLICAR.md**. O GitHub Actions gera o zip e o SHA256 a cada tag `v*`.
- Detalhes técnicos: **ARQUITETURA.md**.
- Licença: **MIT** (veja `LICENSE`). Copyright (c) 2026 Guilherme Fleischfresser.
