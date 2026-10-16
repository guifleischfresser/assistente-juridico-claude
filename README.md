# ⚖️ Advogado Claude: seu assistente jurídico no Claude Code

Este kit transforma o Claude Code num assistente para o seu escritório de advocacia. Funciona 100% em português e foi feito para o Direito brasileiro: CPC, CC, CLT e CF, Resolução CNJ nº 615/2025 e Recomendação CFOAB nº 001/2024.

> 🔒 **Sigilo em primeiro lugar.** Seus documentos ficam no seu computador. Nada é enviado para a internet ou para outros serviços sem você pedir.

---

## 1. Instalar: cole uma frase

**Você precisa de:**
- o **Claude Code** ou o aplicativo **Claude Desktop**, na aba **Code**, com o ambiente **Local**;
- uma assinatura do Claude (Pro ou Max).

Abra uma conversa nova e **cole esta frase**:

```
Leia o arquivo https://raw.githubusercontent.com/guifleischfresser/assistente-juridico-claude/main/INSTALAR.md inteiro e siga as instruções para instalar meu assistente jurídico.
```

> ⚠️ **Para o mantenedor:** antes de divulgar, troque os marcadores de dono/repositório desta frase pelo repositório real (veja PUBLICAR.md).

A partir daí, o Claude faz tudo sozinho e conversa com você em português simples:

1. **Confere o seu computador** (Windows ou Mac) e explica o que vai fazer.
2. **Baixa o assistente** do GitHub e **confere a assinatura digital (SHA256)**. Se o arquivo não conferir, ele não instala.
3. **Instala e testa** tudo em cerca de 2 minutos.
4. **Pergunta, uma coisa de cada vez**, onde ficam as suas petições, os modelos, as pastas dos casos, os documentos dos clientes e o controle de prazos. Se você quiser, ele procura essas pastas no computador, olhando só os **nomes** dos arquivos.
5. **Registra essas pastas sem mover nem copiar nada.** Seus arquivos continuam onde estão; o assistente só "aponta" para eles. A única cópia (opcional) é a das peças que mostram o seu estilo.
6. **Aprende o seu jeito de escrever** e cria uma ficha (dossiê) para cada caso ativo, se você quiser.
7. **Termina com um resumo de como usar.**

Durante a instalação, o Claude pede autorização para rodar alguns comandos. Ele explica cada um antes; é só clicar em **Sim**.
Se a conversa cair no meio, cole a frase de novo: ele **continua de onde parou** e não duplica nada.

### Instalar sem a frase (manual)
1. Baixe `advogado-claude-mod.zip` na página **Releases** do repositório e descompacte.
2. No Windows, dê dois cliques em **`instalar.bat`**. No Mac, dê dois cliques em **`instalar.command`** (se o Mac bloquear: botão direito → Abrir).
3. Abra o Claude Code na pasta `ESCRITORIO` e digite `/primeira-execucao` para a configuração conversada.

---

## 2. O que o assistente faz

- 📁 **Organiza seus casos**, cada um com um **dossiê** (resumo, partes, fatos, prazos, histórico). Casos que já existem no seu computador ganham dossiê **apontando para a pasta original**.
- ✍️ **Aprende o seu jeito de escrever**, para que o texto não fique com "cara de robô".
- 📄 **Redige e formata peças** e exporta para Word (.docx) no padrão forense: A4, margens 3/2 cm, Times 12, espaçamento 1,5.
- 🔎 **Não inventa jurisprudência.** Citação sem fonte fica marcada como **[NÃO VERIFICADO]**, e a exportação trava até você conferir.
- 😈 Tem um **advogado do diabo**, que ataca a sua peça antes da parte contrária.
- 📚 **Lê os autos em PDF uma vez só**, transforma em texto e tira as repetições, o que economiza o seu limite de uso.
- 🛡️ **Avisa sobre instruções escondidas** em documentos da parte contrária.
- ⏰ **Controla prazos em dias úteis**, considerando o recesso forense e os feriados nacionais.
- 🧠 **Aprende sozinho.** Quando percebe uma tarefa repetida, cria um atalho novo. Tudo fica registrado e pode ser desfeito.
- 🩺 **Conserta a si mesmo**: digite `/consertar`.

## 3. Comandos

Digite a barra `/` e o nome do comando:

| Comando | Para quê |
|---|---|
| `/boas-vindas` | Configuração inicial (ou refazer) |
| `/ajuda` | Mostra o que o assistente sabe fazer |
| `/novo-caso` | Abre um caso novo, com pasta e dossiê |
| `/casos` | Lista os casos, mostra a situação de cada um, move para "Arquivados" |
| `/preparar-autos` | Converte os PDFs do caso em texto, uma vez só (economiza muito) |
| `/nova-peca` | Redige uma peça no seu estilo (inicial, contestação, recurso, contrato, parecer…) |
| `/revisar` | Revisa uma peça: citações, clareza, erros, "cara de IA" |
| `/advogado-do-diabo` | Ataca a peça como a parte contrária faria |
| `/verificar-citacoes` | Confere as citações e marca [NÃO VERIFICADO] onde falta fonte |
| `/formatar-peca` | Formata e exporta para Word (.docx) |
| `/prazos` | Mostra os prazos e calcula vencimentos em dias úteis |
| `/aprender-meu-estilo` | Aprende (ou reaprende) o seu jeito de escrever |
| `/handoff` | Salva um resumo do trabalho para continuar depois |
| `/habilidades` | Mostra as habilidades que o assistente criou sozinho e permite desfazer |
| `/consertar` | Verifica se está tudo funcionando e conserta sozinho |
| `/primeira-execucao` | Refaz ou continua a configuração inicial |
| `/backup` | Copia o escritório para um HD externo ou pendrive |

### A barra de status (embaixo da tela)
`⚖️ Dra. Ana │ 📁 Silva x Banco (contestação) │ 🧠 memória 42% ▓▓▓▓░░░░ │ ⏰ prazo em 2 dias úteis: contestação`

- **🧠 memória:** quanto da "memória de curto prazo" da conversa já foi usado. Em **75%**, o assistente salva um resumo (⚠️ HANDOFF AUTOMÁTICO) para você continuar numa conversa nova sem perder nada.
- **⏰ prazo:** o próximo prazo da sua lista `PRAZOS.md`.

---

## 4. Onde ficam as coisas

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
├── ESTILO/           ← suas amostras e o seu "perfil de escrita"
├── WIKI/             ← jurisprudência e legislação que você já conferiu
├── HANDOFFS/         ← resumos para continuar o trabalho
└── EXPORTADOS/       ← os arquivos .docx gerados
```

Tudo são arquivos comuns no seu computador. Você pode abrir no Word, no Bloco de Notas ou no Explorer.

---

## 5. Privacidade e sigilo (LGPD)

- **Local primeiro:** seus casos ficam **no seu computador**. O assistente não usa serviços na nuvem, não envia e-mails e não faz upload de nada sem você pedir expressamente; se tentar, ele para e pergunta.
- **Pesquisas na internet** só acontecem com a sua autorização, e nunca com nome, CPF ou número de processo de cliente.
- **Na primeira execução**, a busca pelas suas pastas é feita no seu computador, só pelos nomes, e o assistente mostra apenas a pasta principal e contagens (ex.: "Documentos/Clientes: 37 pastas"). Nomes de subpastas e arquivos, que costumam ser nomes de clientes, não aparecem na conversa.
- **Suas pastas originais** (petições, modelos, casos) são só **lidas**. Se o assistente precisar gravar numa delas, ele pede confirmação; o normal é salvar no ESCRITORIO.
- **Histórico de conversas por 14 dias:** depois disso, o Claude Code apaga as conversas antigas do seu computador, porque elas podem conter trechos de documentos.
- **Não apaga nada:** antes de alterar um arquivo, ele guarda uma cópia em `ESCRITORIO/_versoes`.
- **Importante:** o texto da conversa é processado pelos servidores da Anthropic, porque é assim que o Claude funciona. Avalie, com base no Código de Ética da OAB e na Recomendação CFOAB nº 001/2024, o que é adequado compartilhar, e considere obter o consentimento do cliente (há um modelo em `PECAS/modelos/termo-consentimento-ia.md`).
- **Evite** colocar a pasta ESCRITORIO dentro do OneDrive, Google Drive ou Dropbox, a menos que o seu escritório já use esses serviços de forma adequada para dados de clientes.

---

## 6. Ler PDFs (recomendado)

O assistente lê arquivos Word sozinho. Para ler **PDFs dos autos** com qualidade, instale uma destas ferramentas gratuitas, que funcionam offline:

- **Windows:** abra o PowerShell e digite `winget search poppler`; depois instale o resultado com `winget install <nome que aparecer>`. Alternativa: `pip install markitdown` (requer Python).
- **Mac:** `brew install poppler`
- **PDFs escaneados (foto de papel):** instale também o **Tesseract** com o idioma português. No Mac: `brew install tesseract tesseract-lang`. Depois use `/preparar-autos` e peça "com OCR".

Sem essas ferramentas, o assistente avisa e você pode converter o PDF de outra forma (por exemplo, "Salvar como texto" no leitor de PDF).

---

## 7. Backup

Use `/backup`, ou copie a pasta `ESCRITORIO` inteira para um HD externo. As configurações do assistente ficam em `C:\Users\SeuNome\.claude` (Windows) ou `~/.claude` (Mac).

## 8. Desinstalar

Peça ao Claude: "desinstale o assistente jurídico". Ele roda `node ~/.claude/advogado/pacote/scripts/instalar.js --desinstalar`. Também é possível dar dois cliques em `desinstalar.bat` (Windows) ou rodar `bash desinstalar.sh` (Mac) no pacote baixado. **Sua pasta ESCRITORIO não é apagada nem alterada.**

---

## 9. Perguntas frequentes

**O assistente substitui a minha revisão?**
Não. Ele é um assistente, e quem assina e responde pela peça é você. Toda citação marcada [NÃO VERIFICADO] precisa ser conferida na fonte oficial antes do protocolo.

**Ele inventa jurisprudência?**
Modelos de IA podem "inventar" julgados. Por isso o kit marca automaticamente qualquer citação sem fonte e trava a exportação para Word até você conferir. Quando conferir, cole o link ou registre na WIKI.

**O que é a "habilidade criada sozinha"?**
Se você pede três vezes algo parecido (por exemplo, "faça uma procuração ad judicia"), o assistente cria um atalho para isso. Ele avisa em uma linha, guarda tudo em `/habilidades` e você pode desfazer a qualquer momento. Se uma habilidade falhar duas vezes, ela é aposentada automaticamente.

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
