# Especificação — app "Casos" (advocacia, local, estilo Apple)

Versão 0.1 · 26/10/2026 · para o Claudeo executar via Claude Code CLI · só PR, sem merge sem aprovação do Guilherme.

## 0. Decisões de base
- **Nome:** "Casos" (curto e neutro; "Clientes" vira uma visão dentro do app).
- **Base técnica:** reaproveitar o `guifleischfresser/claude-code-wrap` (PR #1). Ele já tem servidor local em 127.0.0.1, chat por pasta chamando `claude -p --output-format stream-json --resume`, modo auto e permissões em cards. O "Casos" é uma nova interface em cima desse motor, não um projeto do zero. Sugestão: repo novo `guifleischfresser/casos` que usa o wrap como dependência/módulo, ou um branch do wrap. O Claudeo decide e justifica no PR.
- **Stack:** Node 20+ com servidor local; front em HTML/CSS/JS puro (sem framework pesado), Windows/macOS/Linux; README em pt-BR; CI com lint+testes nos 3 SOs.
- **Tudo local.** Nenhum dado de cliente sai da máquina, exceto o que o próprio Claude Code envia à Anthropic durante a conversa (avisar isso claramente na 1ª execução).
- **Fonte da verdade = sistema de arquivos.** As "pastas" do app são pastas reais no disco. Metadados ficam em arquivos `.casos/*.json` dentro de cada pasta. Sem banco de dados. Assim, o advogado continua abrindo tudo pelo Explorer/Finder, e o Claude Code trabalha direto na pasta.

## 1. Taxonomia de pastas
```
Casos/                                (raiz escolhida no 1º uso; ex.: Documentos/Casos)
├── .casos/                           (config global, estilo, templates; oculto)
├── Trabalhista/
├── Cível/
├── Família e Sucessões/
├── Consumidor/
├── Previdenciário/
├── Tributário/
├── Criminal/
├── Empresarial/
├── Administrativo/
└── Consultivo e Contratos/           (sem processo: pareceres, contratos)
```
- As áreas são editáveis em Configurações: dá pra ocultar, renomear, criar ou mudar a ordem. As padrão vêm com ícone e cor próprios.
- **Dentro da área:** `Cliente/` → `Caso/`. Um cliente pode ter vários casos e pode aparecer em várias áreas. Nesse caso, o cadastro do cliente é um só (em `.casos/clientes/<id>.json`), e cada pasta de área só tem atalhos para ele. Isso evita duplicar dados.
- **Nome da pasta do caso:** `AAAA-MM <título curto>`, e o nº CNJ, quando houver, vai no metadado (ex.: `2026-10 Reclamatória x Empresa Y`).
- **Dentro de cada caso (criado automaticamente):**
```
<Caso>/
├── 01 Peças/            (minutas e versões finais; o Claude escreve aqui)
├── 02 Documentos/       (do cliente e da parte contrária; somente leitura para o Claude por padrão)
├── 03 Decisões/         (despachos, sentenças, acórdãos)
├── 04 Prazos/           (prazos.json + calendário; integra com o calendário forense do mod)
├── 05 Pesquisa/         (jurisprudência, mapas de tese)
├── 06 Atendimento/      (atas, áudios transcritos, e-mails salvos)
├── CASO.md              (resumo vivo do caso, mantido pelo Claude, revisado pelo advogado)
└── .casos/caso.json     (metadados)
```
- **Visão alternativa "Clientes":** lista A–Z de todos os clientes com os casos de cada um em todas as áreas. É só uma visão, sem pastas novas.

## 2. Telas
1. **Primeiro uso (onboarding, 3 passos):** escolher ou criar a pasta raiz, importar uma estrutura existente (opcional: o app sugere como mapear as pastas atuais, mostra antes e só move/copia com confirmação; o padrão é copiar, nunca mover) e ver o aviso de sigilo e LGPD (§6).
2. **Raiz:** fundo branco, uma pasta grande ilustrada no centro ("Casos") e, abaixo, a grade de áreas com ilustrações. No topo, uma busca global (cliente, nº CNJ, parte, palavra), "Prazos da semana" (chip com contador) e a engrenagem de Configurações.
3. **Navegação:** pastas que expandem com animação suave, numa trilha de navegação no topo (Casos › Trabalhista › Maria Silva › 2026-10 Reclamatória). Funciona tanto com grade de ícones quanto com lista em árvore à esquerda (o usuário alterna). O teclado também funciona (setas, Enter, Esc para voltar).
4. **Cliente:** ficha (nome, CPF/CNPJ mascarado, contato, observações), lista de casos e botão "Novo caso".
5. **Caso:** área de trabalho com 3 colunas:
   - à esquerda, as subpastas do caso e os arquivos;
   - ao centro, a pré-visualização do arquivo (PDF, DOCX, imagem, MD);
   - à direita, o **painel do Claude** (chat), que já abre com o contexto do caso (§4).
   Logo acima ficam CASO.md resumido, os próximos prazos e os botões rápidos: "Resumir documentos novos", "Minutar peça", "Conferir prazos", "Atualizar CASO.md".
6. **Configurações:** estilo e templates (§3), áreas, pasta raiz, modo de permissão do Claude (padrão auto; bypass nunca é padrão e fica escondido com aviso), modelo e esforço, privacidade (§6) e backup/exportação.

**Visual:** branco, tipografia de sistema (SF / Segoe UI), cantos de 12px, sombras leves, uma cor de destaque e ilustrações em SVG próprias (linha fina, 2 tons). Gerar tudo em SVG no repo, sem bancos de imagem com licença duvidosa. Modo escuro fica para depois.

## 3. Configurações → Estilo e templates
**3a. Com templates (.docx/.odt/.pdf/.md):**
- O advogado arrasta os arquivos, e o app extrai **localmente** o cabeçalho e o rodapé (texto, imagem do timbre, fonte, margens, numeração, OAB, endereço).
- Depois, uma tarefa do Claude analisa o corpo dos textos e gera `.casos/estilo/ESTILO.md` (§3c). Mostrar uma prévia e só salvar depois de "Aprovar".
- Os templates ficam em `.casos/templates/<tipo-de-peça>/`, e o app sugere o tipo (inicial, contestação, recurso, contrato, notificação…), que o advogado pode corrigir.

**3b. Sem templates (pasta de peças antigas):**
- O advogado escolhe uma ou mais pastas. O app conta os arquivos e pede confirmação ("Vou ler 47 documentos localmente").
- Um agente do Claude lê uma amostra (até cerca de 30 documentos, os mais recentes e de tipos variados) e gera o mesmo `ESTILO.md` com exemplos curtos citados.
- Dados pessoais da amostra são substituídos por marcadores antes de virar exemplo no `ESTILO.md`.

**3c. Conteúdo do ESTILO.md:**
- Identificação: cabeçalho, rodapé, assinatura.
- Estrutura típica por tipo de peça.
- Tom (formal/colóquio), tamanho de parágrafo, uso de latim, citações (formato de jurisprudência e doutrina), negritos/maiúsculas, fechos e pedidos.
- Palavras e expressões preferidas e as proibidas.
- Formatação do DOCX final.

O `ESTILO.md` é editável à mão e versionado (o app guarda as versões anteriores). Toda tarefa de minuta carrega o `ESTILO.md`.

## 4. Contexto que o Claude recebe em cada caso
Ao abrir o painel, o app inicia (ou retoma, com `--resume`) **uma sessão por caso**, guardando o session id em `caso.json`. O diretório de trabalho é a pasta do caso. O contexto inicial vem por um `CLAUDE.md` gerado na pasta do caso, que referencia os itens abaixo em vez de colar tudo:
1. Regras da casa: sigilo, nunca inventar julgado nem dispositivo, conferir citações antes de usar e sinalizar incerteza. Se o mod `assistente-juridico-claude` estiver instalado, herda as regras e skills dele: checador de julgados, anti-texto oculto, detecção de prompt injection em documentos recebidos e calendário forense.
2. `ESTILO.md` e o template do tipo de peça pedido.
3. `CASO.md`: partes, nº CNJ, tribunal/comarca, fase, teses, histórico e pendências.
4. Lista de arquivos do caso com data e tipo. O conteúdo só é lido quando a tarefa precisa.
5. Prazos abertos (`prazos.json`).
6. Dados do cliente necessários para a tarefa (sem documentos de identidade completos, por padrão).

**Escopo de leitura:** a sessão só enxerga a pasta do caso (mais `.casos/estilo` e `.casos/templates`, somente leitura). Pastas de outros clientes ficam fora, por regra de permissão e não só por instrução.

**Escrita:** o Claude só grava em `01 Peças/`, `05 Pesquisa/`, `CASO.md` e `04 Prazos/` (este último com confirmação). Antes de sobrescrever, salva a versão anterior.

## 5. Modelo de dados (JSON em disco)
```jsonc
// .casos/config.json
{ "raiz": "...", "areas": [{"id":"trabalhista","nome":"Trabalhista","cor":"#..","icone":"..."}],
  "claude": {"modo":"auto","modelo":"claude-opus-5-5","esforco":"medium"},
  "privacidade": {"mascararDocs": true, "logs": "local-30d"} }

// .casos/clientes/<uuid>.json
{ "id":"uuid", "tipo":"PF|PJ", "nome":"", "documento":"(mascarado na UI)", "contatos":[],
  "areas":["trabalhista"], "casos":["<uuid-caso>"], "criadoEm":"", "consentimentoLGPD":{"base":"execução de contrato","data":""} }

// <Caso>/.casos/caso.json
{ "id":"uuid", "clienteId":"uuid", "area":"trabalhista", "titulo":"", "cnj":"", "tribunal":"", "comarca":"",
  "vara":"", "polo":"ativo|passivo", "parteContraria":[], "fase":"", "status":"ativo|suspenso|arquivado",
  "claudeSessionId":"", "criadoEm":"", "atualizadoEm":"" }

// <Caso>/04 Prazos/prazos.json
[{ "id":"", "descricao":"", "inicio":"", "dias":15, "contagem":"uteis", "vencimento":"", "fonte":"intimação DJEN ...", "status":"aberto|cumprido" }]
```
O índice de busca fica em `.casos/indice.json`, é recalculado localmente e pode ser apagado e refeito sem perder dados.

## 6. Sigilo, LGPD e segurança
- O servidor escuta só em 127.0.0.1, com um token aleatório por sessão na URL/cookie, para impedir que outros sites do navegador chamem a API local (proteção CSRF/DNS rebinding: checar Host e Origin).
- **Aviso explícito no 1º uso:** os arquivos ficam no computador, mas o que o Claude lê é enviado à Anthropic para processamento, conforme a conta do próprio advogado. Recomendar o plano ou as configurações que não usam dados para treino, e o advogado confirma que leu.
- Isolamento por caso, como no §4. Botão "Modo anônimo do caso", que substitui nomes e documentos por marcadores antes de mandar ao Claude (de forma reversível, só local).
- Documentos recebidos são tratados como não confiáveis: rodar a detecção de instruções ocultas do mod antes de o Claude usá-los e avisar onde estão.
- Antes de exportar uma peça, rodar a checagem anti-texto oculto (bloqueia texto branco, fonte minúscula, metadados com instruções).
- **LGPD:** registrar a base legal por cliente (campo simples) e oferecer exportar todos os dados do cliente (portabilidade) e apagar o cliente com confirmação dupla (vai para a lixeira do app por 30 dias).
- Os logs ficam locais, sem conteúdo de documentos, com rotação de 30 dias.
- Nada de telemetria e nenhuma chamada de rede além do Claude Code CLI.
- Backup: um botão que gera um `.zip` da raiz, com orientação para guardar num disco criptografado. Não fazemos backup na nuvem sozinhos.
- Nunca usar `--dangerously-skip-permissions` por padrão.

## 7. Fases de entrega (um PR por fase)
1. **F1 Navegação:** onboarding, raiz, áreas, cliente e caso com criação automática das subpastas, busca, visual e ilustrações. Sem Claude ainda.
2. **F2 Claude no caso:** painel do chat reaproveitando o motor do wrap, uma sessão por caso, `CLAUDE.md` gerado, escopo de leitura e escrita, botões rápidos.
3. **F3 Estilo e templates:** extração local do cabeçalho, geração do `ESTILO.md` por template ou amostra de pastas, prévia e aprovação, versionamento.
4. **F4 Prazos e segurança:** `prazos.json` com o calendário forense do mod, "Prazos da semana", modo anônimo, exportar/apagar cliente e backup.

## 8. Critérios de aceite (gerais)
- Instala e abre com 1 comando ou um duplo clique (atalho) no Windows; testes nos 3 SOs no CI.
- Funciona com uma pasta de 500 casos sem travar a navegação (busca em menos de 300 ms).
- Uma sessão de um caso não consegue ler a pasta de outro cliente (teste automatizado).
- Nenhum dado sai, exceto pelo Claude CLI (teste que bloqueia a rede e verifica).
- Toda a interface e o README em pt-BR simples, para um advogado leigo.
- Todo PR fica aberto; merge só com a aprovação do Guilherme nas palavras dele.

## 9. Em aberto para o Guilherme decidir
- Se o "Casos" vive dentro do repo do wrap ou num repo novo (recomendação: repo novo, reaproveitando o motor).
- Se ele quer integração futura com PJe/DJEN para puxar intimações automaticamente (fora do escopo da v1).
