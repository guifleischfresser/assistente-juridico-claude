# Claude for Legal, IA jurídica no Brasil e o que levar para o WrapAdv — pesquisa e proposta

**Data:** 30/10/2026 (America/Sao_Paulo) · **Para:** Guilherme Fleischfresser · **Autor:** Claudeo (orquestração e conferência) + Claude Code CLI (Sonnet na coleta web, Opus na síntese)

> **Somente documentação.** Nada foi programado, nenhum repositório foi alterado e não houve branch, commit, push nem PR. As propostas abaixo são opinião e dependem da sua decisão.
>
> **Como foi feito:** 3 rodadas de coleta web no Claude Code (Sonnet), 1 rodada de síntese (Opus) e conferência manual pelo Claudeo (WebSearch/WebFetch, API pública do X e leitura do código). A síntese Opus bateu o **limite de sessão da Claude Pro** (reinicia às 14h50, horário de Brasília) durante a releitura final; a releitura foi concluída pelo Claudeo, conferindo por amostragem as afirmações sobre o código (`politica.js`, `runner.js`, `settings.js`, `criar.js`, `julgados.js`, `anonimizar.js`, `CHANGELOG.md`, `exportar-docx.js`).

**O que foi lido**
- Notas de pesquisa web de 30/10/2026: `notasA-claude-for-legal.md`, `notasB-brasil.md`, `notasC-lacunas.md` e `notasD-verificado-pelo-orquestrador.md`. **A notasD prevalece em caso de conflito.**
- **WrapAdv**, branch `claude/fase1-wrapadv`, commit `40cc26e` (só leitura): `README.md`, `docs/arquitetura.md`, `src/permissoes/*.js`, `src/escritorio/{cnj,criar,varredura,incluidos,mencoes}.js`, `src/runner.js`, `src/claude-args.js`, `bin/hooks/*.js`, `bin/permission-mcp.js` e `public/telas.js` (tela do caso). O PR #1 (Fase 1) foi **fechado sem merge** em 30/10/2026; a branch fica como referência.
- **assistente-juridico-claude** ("Advogado Claude Mod"), v0.8.0, commit `fed81c1`: `README.md`, `ARQUITETURA.md`, o topo do `CHANGELOG.md`, as skills `verificar-citacoes`, `anonimizar`, `consentimento`, `prazos` e `mapa-de-teses`, as libs `julgados.js`, `citacoes.js`, `anonimizar.js`, `consentimento.js`, `calendario.js`, `prazos.js` e `injecao.js`, além de `scripts/guarda-sigilo.js`, `hooks/hooks.json` e o termo de consentimento.
- Plano anterior: `/workspace/specs/casos-plano-v2.md` (§5, §7, §8.4 e §9).

**Legenda de confiança**
- ✅ confirmado em fonte oficial lida (órgão público, Anthropic, ou a página do próprio fornecedor para dados do produto dele);
- 🟡 fonte de terceiro (imprensa, blog, fonte institucional secundária) ou **visto só em resultado de busca**;
- ❓ não confirmado.

Todas as fontes foram acessadas em 30/10/2026. A lista completa está no §7.

---

## 1. Resumo executivo

- **Claude for Legal** é a oferta jurídica da Anthropic. O post de 12/05/2026 lançou 12 plugins por área de prática e mais de 20 conectores. Em 28/10/2026 vieram uma galeria de *artifacts* e "mais de 60 conectores jurídicos" ✅ ([Anthropic, 28/10/2026](https://claude.com/resources/articles/introducing-artifacts-for-legal-work)).
- O pacote é **todo dos EUA**: conectores (Bloomberg Law, Filevine, Ivo, Legora, Patlytics…), artifacts de acesso à justiça (Nova York e D.C.) e plugins (por exemplo, o `demand-draft` trata da FRE 408). **Não encontrei nada específico para o direito brasileiro.** Isso é ausência nas fontes lidas, não prova de que não exista. O diretório completo deu 403/404 ❓.
- O artigo dos artifacts aparece rotulado como "Claude Enterprise". **Não está confirmado** se usuários Pro ou Max têm acesso à galeria jurídica e aos plugins ❓.
- O **cite check** da Anthropic "compara um documento com suas fontes" ✅. Pela descrição oficial, ele confere o que foi anexado ou conectado. O README do repositório diz: "citations are unverified without [a research tool]" ✅. A Atla (@atlaiabr), que é concorrente, afirma que o cite check não detecta julgado inexistente. A alegação é plausível pela descrição oficial, mas não foi testada 🟡.
- **Brasil:** o mercado tem pesquisa de jurisprudência com IA (Jus IA, Turivius, Jurídico AI, Jusratio, CoCounsel/TR) e gestão com IA (Astrea, ADVBOX, Projuris, Lexter). Quase nenhum desses produtos declara o LLM que usa.
- **Fonte de jurisprudência mais promissora para o WrapAdv:** o **garimpo-mcp**. É local (stdio), MIT, cobre 59 tribunais e confere citações por regra fixa, sem IA. Ressalvas: é **cliente não oficial** do JurisprudênciaIA, a busca não tem documentação pública e o repositório foi criado em 08/10/2026 ✅/🟡 ([GitHub](https://github.com/leorochasf/garimpo-mcp)).
- **Regulação que importa para o app:** a Recomendação CFOAB nº 001/2024 🟡 (o número aparece só em fonte secundária; a proposição é a 49.0000.2024.007325-9/COP). Os itens relevantes tratam de consentimento escrito do cliente (4.3.1), revisão humana integral (3.7), escolha de fornecedor que não treine com os dados (2.2) e política escrita de IA (3.6). A Res. CNJ 615/2025 e o programa Conecta valem **para o Judiciário**, não para advogados ✅.
- **Sanções em 2026** por julgado inexistente e por comando oculto (*prompt injection*): STF R$ 5 mil (comando oculto, Moraes) 🟡; STJ 1ª Turma R$ 20 mil (prompt injection, 20/10/2026) ✅; STJ 2ª Turma 10% do valor da causa (prompt injection) ✅; **TST SDI-1 elevou a multa para 10%** por precedentes inexistentes (15/10/2026) 🟡; TST 6ª Turma, 1% 🟡.
- **O WrapAdv já tem a base certa:** o Claude roda local, há cartão para todo `mcp__*`, os originais são imutáveis e não existe bypass. **Faltam três coisas para usar conectores brasileiros com segurança:**
  1. filtro de CPF, CNPJ, CNJ e nome do cliente nos **argumentos** de `mcp__*` (hoje o filtro existe só para WebFetch e WebSearch, em `src/permissoes/politica.js`);
  2. um catálogo de ferramentas de consulta pública que possam ter "Permitir nesta conversa". Hoje, nomes de ferramenta em português, como `busca_direta`, caem como "de saída" e nunca ganham essa opção;
  3. a chave "conectores deste caso" (ligar e desligar por caso).
- **O que imitar do Claude for Legal** são as *visões* e não a nuvem:
  - quadro de casos e prazos;
  - quadro de documentos do caso;
  - playbook de contratos;
  - matriz de tribunais;
  - radar normativo;
  - triagem de consulta.

  Todas seriam tabelas que o app desenha a partir de JSON gravado no próprio caso. Nada de compartilhamento ou galeria em nuvem.
- **O mod do assistente jurídico já faz melhor que o cite check** num ponto que importa: com sua permissão, ele busca o original no site oficial **só pelo número**, guarda o texto em `WIKI/raw/`, compara palavra por palavra (limiar de 0,97) e **trava a exportação** de citação divergente ou inexistente. Ressalva honesta: "não achei" não prova que o julgado não exista.
- **Recomendação principal:**
  1. reabrir e mergear a Fase 1;
  2. em seguida, fazer uma **Fase 1.5 "Conectores seguros"** (filtro de sigilo nos argumentos, catálogo por servidor, chave por caso, log), com o **garimpo-mcp como primeiro conector** em versão fixada e desligado por padrão;
  3. depois, os selos do mod no caso (consentimento, anonimizado, citações pendentes) e o quadro de casos e prazos;
  4. as demais visões vêm por último.

---

## 2. Claude for Legal (Anthropic)

### 2.1 Nome e cronologia

| Quando | O quê | Conf. |
|---|---|---|
| Início de 2026 | Primeiro plugin jurídico do Cowork. O post oficial diz só "Earlier this year". O LawNext diz "early February"; um terceiro diz 30/01/2026 (só busca) | ✅ (genérico) / 🟡 (data) |
| 12/05/2026 | "Claude for the legal industry": 12 plugins por área, "20+ new MCP connectors", plugins "open source and available in Claude Cowork" ([oficial](https://claude.com/blog/claude-for-the-legal-industry)) | ✅ |
| 26/08/2026 | Guia "Using Claude for Legal Work: Privilege, Confidentiality, and How to Think About Configuration" ([oficial](https://support.claude.com/en/articles/15707726-using-claude-for-legal-work-privilege-confidentiality-and-how-to-think-about-configuration)) | ✅ |
| 28/10/2026 | "Introducing artifacts for legal work": galeria em `claude.ai/artifacts?templates=legal` e "more than 60 legal connectors" ([oficial](https://claude.com/resources/articles/introducing-artifacts-for-legal-work); data também na [Unite.AI](https://www.unite.ai/anthropic-adds-ready-to-use-legal-artifacts-gallery-to-claude/)) | ✅ |

- O artigo de 28/10 diz "Since we launched Claude for Legal in May" ✅.
- Ele menciona também o **Legal Ambassadors Program** (com lista de espera), o **Oxford Justice Innovators Programme** e parceiros de implantação (Accenture, Deloitte, KPMG, PwC etc.) ✅. A notasA dizia que o Legal Ambassadors não estava na página; a notasD corrige.

### 2.2 O que oferece

**Os 6 artifacts oficiais** ✅ ([artigo](https://claude.com/resources/articles/introducing-artifacts-for-legal-work)). A Anthropic os define como "interactive tools, such as trackers and dashboards, that teams can use and share in Claude", com compartilhamento que "support[s] ethical walls between teams".

| Artifact | O que faz (fonte oficial) |
|---|---|
| Cite check | "compares a legal document with its sources and flags quotes that don't match, wrong page numbers, and sources that don't support the claim" |
| Jurisdiction survey matrix | Quadro comparativo por jurisdição (o artigo só dá o nome) |
| Matter board | Acompanhamento de casos. Na página de soluções: "flags hearings, limitation dates, and offers about to run out" ([solutions/legal](https://claude.com/solutions/legal)) |
| Playbook deviation board | Revisão contra o playbook: cada cláusula marcada como *standard*, *fallback*, *deviation* ou *missing* ([solutions/legal](https://claude.com/solutions/legal)) |
| Regulatory horizon scan | Monitoramento regulatório (só o nome) |
| Tabular review | Revisão de muitos documentos em tabela (só o nome) |

A página de soluções descreve também uma **triagem (intake)** com status *on time*, *at risk*, *late* e *waiting on requester* ✅.

**Artifacts de parceiros** ✅: AI Governance Benchmark (Goodwin), Harvey Intake (Harvey), Obligations Checker (Foley & Lardner) e Subpoena Response Tool (PwC). Há outros anunciados, de Legora e Orrick.

**Acesso à justiça** ✅: nove artifacts. Cinco são nomeados: Criminal Charge Reality Check (Zealous, NY), Immigration Papers Reader (Mobile Pathways), Rent Ledger Reviewer e Record-Sealing Screener (Rising for Justice, D.C.) e Record Clearance (The Access Project). Os outros quatro ❓.

**Os 12 plugins** ✅ ([README](https://github.com/anthropics/claude-for-legal); licença Apache-2.0 pela barra lateral do GitHub):

| Plugin | Escopo (citação do README) |
|---|---|
| commercial-legal | vendor/NDA/SaaS review, renewals, escalations |
| corporate-legal | M&A diligence, closing checklists, board consents, entity compliance |
| employment-legal | hire/term review, worker classification, leave, investigations |
| privacy-legal | DPA, DSAR, PIA, privacy triage, policy monitor |
| product-legal | launch review, marketing claims, "is this a problem?" triage |
| regulatory-legal | reg feed watcher, policy diff, gap tracker, NPRM comments |
| ai-governance-legal | AI use-case triage, AIAs, vendor AI review, AI reg gap-check |
| ip-legal | trademark clearance, FTO, C&D, DMCA, OSS, IP clauses, portfolio |
| litigation-legal | portfolio, matters, holds, demands, depo prep, claim charts |
| legal-clinic | clinic setup, student ramp, intake, deadlines, memos, handoffs |
| law-student | Socratic drilling, outlining, IRAC, bar prep, flashcards |
| legal-builder-hub | community skill discovery and install with a trust gate |

- **litigation-legal:** o README diz "a thinking partner, not a matter management system". Comandos: `matter-intake`, `portfolio-status`, `matter-briefing`, `demand-draft` (com *gate* de FRE 408/privilégio), `legal-hold`, `chronology`, `claim-chart` etc. Tem também o agente semanal `docket-watcher` ✅.
- **commercial-legal:** `review [file]` contra o playbook, `renewal-tracker` e triagem de NDA em verde/amarelo/vermelho. O plugin "assumes you're the **customer**" ✅.

**Conectores** ✅: "60+", com Bloomberg Law, Filevine, Ivo, Legora e Patlytics nomeados. O LawNext lista outros conectores do lançamento de maio (Ironclad, DocuSign, iManage, NetDocuments, Relativity, Everlaw, Harvey, Thomson Reuters CoCounsel Legal…) 🟡. A contagem não foi conferida, porque o diretório deu 403/404 ❓.

**Microsoft 365** ✅: Claude dentro do Word e do Outlook, com *tracked changes* ([solutions/legal](https://claude.com/solutions/legal)).

### 2.3 Planos e preços

Valores em USD da [página de preços](https://claude.com/pricing) ✅, sem data na página. A página não mostrou BRL nem seletor de moeda.

| Plano | Preço | Claude Code | Treino com dados |
|---|---|---|---|
| Free | $0 | Não | "Opt-out" |
| Pro | $17/mês no anual ($200 de uma vez) ou $20/mês no mensal | Sim | "Opt-out" |
| Max | "From $100"/mês | Sim | "Opt-out" |
| Team | Standard $20 (anual) / $25 (mensal); Premium $100 / $125; de 2 a 150 usuários | Sim | "None by default" |
| Enterprise | "US$20/seat/month, billed annually, 20 seat minimum" + uso "at API rates" | Sim | "None by default" |

- **Cowork:** a tabela mostra o recurso só no Team. O banner diz "Claude Cowork is now just Claude. Rolling out to Pro and Max" ✅.
- **Plugins:** não aparecem na tabela de recursos. Para o Claude for Legal, o post diz "Enterprise admins can enable them" ✅. Se Pro/Max acessa a galeria e os plugins jurídicos ❓.

### 2.4 Brasil

| Item | Situação | Conf. |
|---|---|---|
| Disponibilidade | O Brasil está na [lista de países](https://www.anthropic.com/supported-countries), mas a página mostra vigência em **12/11/2026**, depois de hoje | ✅ (com ressalva da data) |
| Preço em BRL | Não encontrado; só USD | ❓ |
| Português | A Central de Ajuda tem versão pt e o guia de privilégio tem URL em pt (vista em busca) | ✅/🟡 |
| Interface do app em pt | Não confirmado (o artigo de idiomas deu 404) | ❓ |
| Conector ou artifact de direito brasileiro | Nenhum encontrado nas fontes lidas | ❓ (ausência, não prova) |

### 2.5 Onde roda

| Superfície | O que do Claude for Legal funciona ali | Conf. |
|---|---|---|
| **claude.ai** (web) | Galeria de artifacts (`claude.ai/artifacts?templates=legal`), compartilhamento com *ethical walls* e conectores do diretório | ✅ |
| **Desktop / Cowork** | Plugins por "Customize" → "Browse plugins", ou envio de plugin em zip | ✅ ([README](https://github.com/anthropics/claude-for-legal)) |
| **Claude Code** | Plugins pelo marketplace: `/plugin marketplace add <repo>` e `/plugin install commercial-legal@claude-for-legal`, depois o `cold-start-interview` de cada um. **Se os artifacts funcionam aqui não foi confirmado** | ✅ (plugins) / ❓ (artifacts) |
| **API / Managed Agents / Agent SDK** | `scripts/deploy-managed-agent.sh` (reg-monitor, renewal-watcher, docket-watcher, diligence-grid, launch-radar). O Agent SDK é descrito com "sandboxed containers, network controls, credential isolation, and audit logging" | ✅ |
| **Word / Outlook (M365)** | Redação e redlining dentro do Office | ✅ |

**Consequência para o WrapAdv (opinião):** o WrapAdv roda o **Claude Code**. Os plugins do repositório poderiam ser instalados, mas são feitos para o direito e a prática dos EUA. A galeria de artifacts mora no claude.ai e não serve para um app local. O que vale a pena é **copiar as ideias**, não o produto.

### 2.6 Limites declarados

- **Cite check:**
  - A descrição oficial fala em comparar com "its sources", e o profissional "brings their own documents and sources" ✅.
  - A Anthropic não diz explicitamente se o recurso detecta precedente inexistente.
  - A Atla publicou no X, em 30/10/2026: "Só que confere o que você anexou. E se o julgado nem existe?" ([post](https://x.com/atlaiabr/status/2116111608015634777)). É **alegação de concorrente**, coerente com a descrição oficial e **não testada** 🟡.
- **README do repositório** ✅: "Start by connecting a research tool. Everything else is better with one, and citations are unverified without one." No litigation-legal, sem ferramenta de pesquisa, toda citação sai com `[verify]`.
- **Aviso do repositório** ✅: "Every output from these plugins is a draft for attorney review — not legal advice". E também: "These plugins do not represent Anthropic's legal positions."
- **Avaliações de terceiros** (só busca 🟡): a [Advbox](https://advbox.com.br/blog/claude-para-advogados/) diz que o Claude não verifica a existência da jurisprudência; a [Vaquill](https://www.vaquill.ai/blog/how-to-use-claude-for-legal-research) recomenda tratar caso trazido pelo Claude como pista a conferir.

### 2.7 Privacidade

- **Pro e Max:** treino com dados em "Opt-out", ou seja, ligado até o usuário desligar ✅ ([pricing](https://claude.com/pricing)).
- **Team e Enterprise:** "Anthropic doesn't train on your content by default, and Enterprise admins set how long it's retained" ✅ ([solutions/legal](https://claude.com/solutions/legal)).
- **Guia de privilégio** ✅ (26/08/2026):
  - "We do not train on your content by default." O contexto do guia são os produtos comerciais;
  - "Retention is configurable" (pelo admin);
  - manter "a lawyer visibly directing the work" fortalece a proteção;
  - menciona o caso Heppner (S.D.N.Y., fev/2026): o uso de conta *consumer* pelo próprio réu não foi considerado privilegiado. Não li a decisão.
- **Retenção de 30 dias:** um artigo de suporte de 16/03/2026 diz "We've changed our default data retention period to 30 days", mas não diz a qual plano se aplica ❓ ([suporte](https://support.claude.com/en/articles/9301722-updates-to-our-acceptable-use-policy-now-usage-policy-consumer-terms-of-service-and-privacy-policy)).
- **Para o Brasil (opinião):** o guia trata do *privilege* dos EUA, não do sigilo profissional brasileiro. Aqui o que conta é o Estatuto da Advocacia, o Código de Ética e a LGPD (§3.3).

---

## 3. IA para advogados no Brasil

### 3.1 Players

Preços como aparecem nas páginas em 30/10/2026; podem variar no checkout.

| Produto | Existe? | O que faz | Preço público | LLM | Fonte | Conf. |
|---|---|---|---|---|---|---|
| **Jus IA (Jusbrasil)** | Sim (lançado em mar/2025, segundo busca) | Pesquisa, redação de peças, análise de referências | Essencial R$ 78,90 (R$ 1,90 no 1º mês). Há **conflito** sobre o acesso completo (Datahackers: só no "Avançado + Jus IA") | ❓ | [Jusbrasil Pro](https://jusbrasil.com.br/pro), [Jurinews](https://jurinews.com.br/ia/jusbrasil-integra-ia-em-todos-os-planos-para-facilitar-o-acesso-dos-advogados-brasileiros-a-inteligencia-artificial), [Datahackers](https://www.datahackers.news/p/como-usar-o-jusia-para-otimizar-seu-trabalho-jur-dico) | 🟡 |
| **Turivius / GPTuri** | Sim | Jurisprudência, jurimetria e GPTuri. Declara mais de 130 milhões de decisões e dados no Brasil | Sem preço público (demonstração) | ❓ | [turivius.com](https://turivius.com) | ✅ (página do fornecedor) |
| **Jusratio** | Sim | "Camada de pesquisa" via MCP remoto (`https://mcp.jusratio.com.br/mcp`) para Claude, ChatGPT ou Gemini. Declara 49 milhões de decisões, 129 tribunais e órgãos e 1,1 milhão de normas | Grátis (8 créditos/mês); Pro R$ 19,90/mês no anual (100 créditos); Pro Plus R$ 39,90; Pro Max R$ 79,90. Os dados estruturados da página divergem | Usa o LLM do cliente do usuário | [jusratio.com.br](https://jusratio.com.br/) | ✅ |
| **Jurídico AI (MCP)** | Sim | Conector MCP: busca por sentido e "conferir se um acórdão existe". Declara mais de 50 milhões de julgados e mais de 100 tribunais. Exige conta | MCP "em breve em todos os planos"; rodapé "a partir de R$ 55,90/mês" | Do cliente (Claude ou ChatGPT) | [juridico.ai/mcp](https://juridico.ai/mcp) | ✅ |
| **Lexter.ai** | Sim | "Laura" (peças, contratos, jurisprudência, estratégia) e "Lia" (atendimento por WhatsApp e e-mail) | Lexter Essencial R$ 199/mês | Imprensa: modelos da OpenAI combinados com sistemas próprios | [lexter.ai](https://lexter.ai/), [Startupi](https://startupi.com.br/lexter-ai-recebe-aporte/) | ✅ / 🟡 (LLM) |
| **Projuris ADV** | Sim | Classificação, petições, resumo de andamentos e prognóstico | ADV Start "a partir de R$ 79/mês" (Solo) e R$ 349 (Compartilhado); ADV completo sem preço | Não declarado | [projuris.com.br/adv](https://www.projuris.com.br/adv/) | ✅ |
| **Astrea (Aurum)** | Sim | Agente JUX (jurisprudência e peças), publicações e "tradução do juridiquês" | up R$ 209, smart R$ 379, company R$ 689, vip R$ 1.249/mês. O smart diverge na página (R$ 439 no mensal) | Não declarado | [aurum.com.br](https://www.aurum.com.br/astrea/planos-e-precos/) | ✅ |
| **ADVBOX** | Sim | Donna (intimações) e Justine (controladoria e prazos) | Essencial R$ 220 … Elite R$ 1.800 (o simulador mostra R$ 1.750) … Big Offices a partir de R$ 5.000 | Não declarado | [advbox.com.br](https://advbox.com.br/planos) | ✅ |
| **CoCounsel (Thomson Reuters)** | Sim | CoCounsel Core lançado no Brasil em 22/10/2025; nova geração do CoCounsel Legal com Westlaw Brasil e RT | ❓ | ❓ | [TR](https://www.thomsonreuters.com.br/pt/sala-de-imprensa/tr-lanca-cocounsel-core-brasil.html) | 🟡 (busca) |
| **Atla** | Sim | "A IA jurídica que não inventa jurisprudência"; teste de 3 dias | "Valores comerciais definidos conforme o perfil de uso" (sem preço público) | ❓ | [atla.ia.br](https://atla.ia.br/) | ✅ (página) |
| **Juit/Judit** | Sim (MCP descrito em blog) | Dados jurídicos e MCP para agentes | ❓ | ❓ | [judit.io](https://judit.io/blog/ia-dados-juridicos/mcp-para-agentes-juridicos-de-ia-juridica/) | 🟡 |
| MinutaIA, Jurisprudências.ai | Listados como conectores MCP | Pesquisa jurídica | ❓ | ❓ | [getdrio](https://www.getdrio.com/mcp/br-com-minutaia-pesquisa-juridica), [skillsplayground](https://skillsplayground.com/connectors/ai-jurisprudencias-case-law/) | 🟡 |
| IAJUS, Preâmbulo, Doutor IA, Leya, Chat ADV, Legal One (IA) | Nada encontrado | — | — | — | — | ❓ |

**Leitura (opinião):** os conectores remotos (Jusratio, Jurídico AI) mandam a consulta ao servidor da empresa, e o modelo de cobrança é por crédito ou assinatura. O garimpo roda no seu computador, mas consulta terceiros (o JurisprudênciaIA e os tribunais). Nos dois casos **a tese sai do computador**; o que muda é para onde vai e se há contrato.

### 3.2 Fontes de jurisprudência e MCPs

**garimpo-mcp ("Garimpo-Jurídico")** ✅ (README lido via API do GitHub; [repo](https://github.com/leorochasf/garimpo-mcp))
- **Identificação:** o repositório é `leorochasf/garimpo-mcp` e o autor declarado é "ia.de.gabinete". Licença MIT. Criado em 08/10/2026; último push em 30/10/2026; 20 estrelas.
- **Como roda:** servidor MCP **local stdio**, pacote npm `garimpo-mcp`, Node 22.13+. Instalação sugerida: `claude mcp add garimpo -- npx -y garimpo-mcp`.
- **Natureza:** **cliente não oficial do JurisprudênciaIA**. A busca é "direta sem documentação pública" e "pode mudar sem aviso". O site do JurisprudênciaIA não foi identificado ❓.
- **Cobertura (59 tribunais):** STF, STJ, TSE, TST, STM e 27 TJs; 24 TRTs (Falcão/CSJT); TRF2, TRF4 e TNU (e-Proc); TCU por dados abertos baixados pelo usuário; DataJud e DJEN pelo número CNJ; `texto_de_lei` (CPC, CC, CF, CP, CPP, CLT, CDC) via normas.leg.br. TRF1, 3, 5 e 6 não são nomeados, o que sugere que estão fora.
- **Inteiro teor oficial com recibo** (link, data, sha256): TJCE, TJMG, TJMS, TJRR, TJSP e TSE. **STF e STJ só dão link** (anti-robô / robots.txt).
- **Conferência:**
  - `conferir_citacao` confere **por regra fixa, sem IA**, se o trecho está literalmente na ementa ou no inteiro teor;
  - `conferir_acordao_citado` confere número, tribunal, data e órgão. **"Não verificado" não prova inexistência.**
- **Freios:** no máximo 2 chamadas simultâneas; cache local de 24 h.
- **16 ferramentas:** `busca_direta`, `busca_ampla`, `obter_ementa`, `obter_inteiro_teor`, `ler_inteiro_teor`, `conferir_citacao`, `consultar_precedente`, `julgamentos_do_processo`, `listar_tribunais`, `diagnostico_dos_freios`, `conferir_acordao_citado`, `panorama_da_amostra`, `texto_de_lei`, `baixar_anos_tcu`, `pesquisar_acordaos_tcu` e `ler_acordao_tcu`.
- **Implicação** (notasD): os termos de busca (a tese) saem para o JurisprudênciaIA e os tribunais. **Nunca mandar nome ou CPF do cliente.**

**Datajud (CNJ)** 🟡
- Metadados processuais (Res. CNJ 331/2020), **não inteiro teor**.
- API pública com chave do CNJ no cabeçalho `Authorization: APIKey <chave>`. O CNJ pode trocar a chave.
- Endpoint por tribunal: `https://api-publica.datajud.cnj.jus.br/api_publica_<tribunal>/_search`.
- Não consulta processos em segredo de justiça.
- Fontes: [TRT-3](https://portal.trt3.jus.br/internet/transparencia/tecnologia-da-informacao/dados-api/datajud), [TJPE](https://portal.tjpe.jus.br/web/transparencia/tic/dados-abertos) e o [tutorial CNJ (beta, 2023)](https://www.cnj.jus.br/wp-content/uploads/2023/05/tutorial-api-publica-datajud-beta.pdf), este último só em busca.
- A wiki oficial deu 403: **termos de uso, limite de uso e restrições de finalidade ❓**.

**DJEN / Comunica PJe** 🟡
- Portal `comunica.pje.jus.br` ([CNJ](https://www.cnj.jus.br/programas-e-acoes/processo-judicial-eletronico-pje/comunicacoes-processuais/)). O PJe envia publicações ao DJEN a cada 10 minutos ([TJRJ](https://portaltj.tjrj.jus.br/documents/d/guest/dica_de_sistema_publicacoes-djen-pje-v1-0-4)).
- O swagger `comunicaapi.pje.jus.br` deu 403. Autenticação e limites ❓. O endpoint `api/v1/caderno` aparece só num dataset de terceiros.
- Existe MCP de terceiros que consulta por número ou OAB ([Glama: cnj-processual](https://glama.ai/mcp/servers/ACARVALHOSP/cnj-processual)) 🟡.

**PJe (MNI / consulta pública):** nada útil pesquisado ❓.

**Plugin PJe da @atlaiabr:** existe só como alegação em posts de 28/10/2026: "temos um plugin que conecta o PJe aos agentes (Grok, Claude, Gemini, ChatGPT)" ([post](https://x.com/atlaiabr/status/2115485190218981735)). Não há página de produto, código, preço nem documentação ❓.

**Outros projetos PJe + IA** (só busca, não verificados ❓):
- [ThalesRubiale/pje-ia](https://github.com/ThalesRubiale/pje-ia) (extensão do Chrome);
- AdvogaIA;
- [chapirousIA/pje-mcp-server](https://glama.ai/mcp/servers/chapirousIA/pje-mcp-server), com certificado A1/A3.

**Risco (opinião):** qualquer coisa que use o **certificado digital** do advogado é de altíssimo risco. O WrapAdv já nega a leitura de `.pfx` e `.p12`.

**Outros MCPs brasileiros** (só listagens 🟡): [brlaw_mcp_server](https://glama.ai/mcp/servers/pdmtt/brlaw_mcp_server), [br-eli-mcp](https://awesome.ecosyste.ms/projects/github.com%2Fmatematicsolutions%2Fbr-eli-mcp) (proposições federais) e [TJSP Colégio Recursal](https://glama.ai/mcp/servers/awcl0berpl). Licença e qualidade ❓.

### 3.3 Regulação

**LGPD (Lei 13.709/2018)** ✅ ([Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm))
- **Bases legais:** art. 7º, VI, e art. 11, II, "d" (exercício regular de direitos em processo).
- **Obrigações:** art. 37 (registro das operações), art. 38 (relatório de impacto, a pedido da ANPD), art. 39 (o operador segue as instruções do controlador), art. 41 (encarregado) e art. 46 (medidas de segurança).
- **Transferência internacional:** os artigos específicos (Capítulo V da LGPD, arts. 33 a 36, referência de memória) **não foram conferidos** nesta pesquisa ❓.
- **ANPD:** a Nota Técnica 27/2024 aparece só em fonte secundária. Segundo ela, legítimo interesse não serve para dado sensível e o escritório é controlador do que insere na ferramenta 🟡/❓. O Radar Tecnológico nº 3 (IA generativa) tem data divergente entre fontes ❓.

**CFOAB: Recomendação nº 001/2024** 🟡
- Aprovada pelo Conselho Pleno em 11/11/2024 ✅ ([OAB](https://www.oab.org.br/noticia/62704/oab-aprova-recomendacoes-para-uso-de-ia-na-pratica-juridica); [versão final](https://www.oab.org.br/noticia/62711/confira-versao-final-da-recomendacao-do-cfoab-sobre-o-uso-de-ia-na-pratica-juridica)).
- O **número 001/2024** vem do [MPRJ](https://www.mprj.mp.br/documents/20184/8630878/Leandro_Garcia_Algarte_Assuncao.pdf) e da [SIJUR](https://www.sijur.com.br/recomendacao-oab-inteligencia-artificial/); as notícias da OAB não trazem o número. Proposição 49.0000.2024.007325-9/COP.
- É **recomendação, sem sanção própria**: o relator remeteu ao Código de Ética.
- **Itens que importam ao app** (texto pela SIJUR 🟡):

| Item | Conteúdo | Reflexo no WrapAdv |
|---|---|---|
| 2.2 | Diligência na escolha do fornecedor: proteção, segurança, não usar os dados para treino | Aviso do plano (Pro/Max em "Opt-out") e pergunta F do plano v2 |
| 3.1 | Nada privativo delegado à IA; supervisão humana | Cartões, modo "Perguntar", nada protocolado pelo app |
| 3.2 | Art. 77 do CPC, veracidade | Verificador de julgados (§4.4) |
| 3.6 | Política escrita de uso de IA no escritório | Modelo de política gerado pelo app (proposto) |
| 3.7 | Revisar integralmente toda saída em litígio | Selo "revisado pelo advogado" (proposto) |
| 4.1 / 4.2.1 | Informar o cliente por escrito: propósito, benefícios e limitações, riscos, medidas de segurança, revisão humana | Termo do mod (§4.4) e lacunas apontadas |
| 4.3 | Direito de falar com um humano | Falta no termo do mod (proposta de PR) |
| 4.3.1 | Consentimento explícito assinado | `/consentimento` do mod e selo no caso |
| 4.3.2 | A recusa é respeitada | "Não autorizado" bloqueia o envio de documentos (proposto) |
| 4.3.3 | Termo arquivado até o fim do serviço | `_consentimento/` na pasta do caso; não descartar antes do fim |

- **Plano Nacional de IA da OAB:** lançado em 15/06/2026. **Prevê** um Código de Boas Práticas, ainda não publicado 🟡 ([Migalhas, 16/06/2026](https://www.migalhas.com.br/quentes/458194/oab-lanca-plano-nacional-para-orientar-uso-de-ia-na-advocacia)).

**OAB-RJ** ✅ ([série "Advoga AI", 27/10/2026](https://oabrj.org.br/noticias/advoga-ai-saiba-delegar-inteligencia-artificial-sua-rotina-juridica))
- É orientação, não norma. Comissão de IA, presidida por Graziela Bonfim.
- **Pode:** transcrição de audiências e reuniões (com consentimento e confidencialidade) e rascunhos de minutas, com revisão profissional.
- **Nunca:** delegar a estratégia processual; incluir dados sensíveis sem anonimizar antes.
- Há também uma notícia sobre anonimização ([busca](https://oabrj.org.br/noticias/advoga-ai-anonimizacao-dados-essencial-uso-ia-pela-advocacia)) e uma [cartilha](https://www.oabrj.org.br/sites/default/files/cartilha_para_o_uso_etico_da_ia_na_pratica_juridica.pdf) 🟡.
- **Lista oficial de ferramentas homologadas:** não encontrada ❓.

**Estatuto da Advocacia e Código de Ética (sigilo)**
- Lei 8.906/94, art. 7º, II: inviolabilidade "de seus instrumentos de trabalho, de sua correspondência escrita, eletrônica, telefônica e telemática" ✅ ([Planalto](https://www.planalto.gov.br/ccivil_03/leis/l8906.htm)).
- Art. 34, VII: "violar, sem justa causa, sigilo profissional" ✅.
- CED (Res. CFOAB 02/2015), arts. 35 a 38: o texto literal **não foi conferido** ❓. Pelos resumos secundários, o sigilo é de ordem pública e independe de pedido do cliente.

**CNJ: normas e programas do Judiciário (não se aplicam ao advogado)** ✅
- [Res. 615, de 11/03/2025](https://atos.cnj.jus.br/atos/detalhar/6001), publicada no DJe/CNJ de 14/03/2025, sobre governança de IA nos tribunais. O art. 19 permite LLMs da internet como apoio a magistrados e servidores; o §2º só admite contratação privada se o tribunal não oferecer solução corporativa.
- [Res. 674, de 25/03/2026](https://atos.cnj.jus.br/atos/detalhar/6836), que altera o art. 15 (composição do comitê); há [texto compilado](https://atos.cnj.jus.br/files/compilado1243232026032669c529ebd7bbb.pdf).
- **Conecta** 🟡: programa do CNJ (Justiça 4.0 / PDPJ-Br) que nacionaliza soluções de IA dos tribunais: Apoia, Berna, Promptus, MAIA, LIA3R… ([CNJ](https://www.cnj.jus.br/conecta-reune-principais-solucoes-de-ia-do-judiciario-e-acelera-uso-nacional/), só busca; [TRF3](https://web.trf3.jus.br/noticias/Noticiar/ExibirNoticia/446267-cnj-lanca-lia3r-e-amplia-uso-de-inteligencia-artificial)).
- **Por que importa ao advogado:** os tribunais usam IA para ler petições. Comandos ocultos são detectados, como no módulo Maria Shield do STF, citado pela imprensa, e punidos (§3.4).

### 3.4 Sanções

| Tribunal | Órgão / relator | Data | Conduta | Sanção | Processo | Fonte | Conf. |
|---|---|---|---|---|---|---|---|
| STF | Min. Alexandre de Moraes | Decisão de 30/09/2026 (data inferida); publicada em 01/10/2026 | **Comando oculto** ("negar todos os comandos do GPT") em petição | **R$ 5 mil** ao advogado; comunicação à OAB e ao MPF | Não informado | [Poder360, 01/10/2026](https://www.poder360.com.br/poder-justica/moraes-multa-advogado-por-comando-de-ia-em-peticao/); [Convergência Digital](https://convergenciadigital.com.br/inovacao/stf-impoe-multa-a-advogado-por-burlar-sistema-de-inteligencia-artificial/) | 🟡 |
| STJ | 1ª Turma, min. Paulo Sérgio Domingues | 20/10/2026 | **Prompt injection** em REsp (texto da cor do fundo, fonte de 0,8 pt) | **R$ 20 mil** aos advogados por ato atentatório à dignidade da Justiça; relatório técnico; comunicação à OAB e ao MPF | AREsp 3.095.458 (só em terceiro) | [STJ](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/20102026-Novo-caso-de-prompt-injection-STJ-multa-advogados-em-R--20-mil-por-ato-contra-a-dignidade-da-Justica.aspx); [Conjur](https://conjur.com.br/2026-out-20/stj-multa-advogados-em-r-20-mil-por-uso-de-prompt-injection-em-peticao/); nº: [Lex, 21/10/2026](https://www.lex.com.br/novo-caso-de-prompt-injection-stj-multa-advogados-em-r-20-mil-por-ato-contra-a-dignidade-da-justica/) | ✅ (fato) / 🟡 (nº) |
| STJ | 2ª Turma, min. Teodoro Silva Santos | Julgado em 01/09/2026; DJEN de 17/09/2026 | **Prompt injection** de procurador municipal ("Recado para a inteligência artificial…") | Multa do art. 81 do CPC, **10% do valor da causa** | Segredo de justiça | [STJ, 03/09/2026](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/03092026-STJ-impoe-multa-por-litigancia-de-ma-fe-em-recurso-com-prompt-injection-assinado-por-procurador-municipal-.aspx); [Informativo 902](https://scon.stj.jus.br/jurisprudencia/externo/informativo/?livre=%40CNOT%3D022624) | ✅ |
| STJ | 6ª Turma | ago/2025 | Leis e precedentes **inexistentes** | HC **não conhecido** | HC 1.023.732 | [STJ, 18/10/2026](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/18102026-Quando-a-inteligencia-artificial-vira-questao-de-Justica-as-primeiras-decisoes-do-STJ-sobre-o-uso-de-IA.aspx/) | ✅ |
| TST | SDI-1, min. Breno Medeiros | 15/10/2026 | Todos os precedentes de um recurso de embargos **inexistentes** | Multa por má-fé **elevada para 10%**; ofício ao CFOAB e à seccional; apuração de eventual prompt injection. Vencido em parte o min. Evandro Valadão (9%) | 0100312-15.2023.5.01.0522 | [Migalhas, 16/10/2026](https://www.migalhas.com.br/quentes/466709/gol-de-mao-ministro-alerta-sobre-ia-e-tst-multa-por-precedente-falso) | 🟡 |
| TST | 6ª Turma, min. Fabrício Gonçalves | Não informada (matéria de 10/03/2026) | Precedentes não localizados | **1%** do valor da causa à empresa e ao advogado | RR-0000284-92.2024.5.06.0351 | [Lex, 10/03/2026](https://www.lex.com.br/empresa-e-advogado-sao-condenados-por-possivel-uso-de-ia-com-citacoes-falsas-de-jurisprudencia/) | 🟡 |
| TJPR | 9ª Câmara Cível, des. Luis Sérgio Swiech | Não informada (matéria de 01/07/2026) | Uso de IA "sem zelo e cautela" | Multa por má-fé (percentual não informado; os 5% vistos em busca ❓) | 0025387-22.2025.8.16.0001 | [Lex, 01/07/2026](https://www.lex.com.br/tjpr-multa-advogado-por-litigancia-de-ma-fe-pelo-uso-de-ia-sem-zelo-e-cautela/) | 🟡 |
| TRT-3 | 9ª Turma | Não informada | Súmula do TST inexistente | R$ 1.200 ao trabalhador | Não informado | [TRT-3](https://portal.trt3.jus.br/internet/conheca-o-trt/comunicacao/noticias-juridicas/justica-do-trabalho-aplica-multa-apos-advogado-citar-sumula-inexistente-gerada-por-inteligencia-artificial) (só busca) | 🟡 |
| STF | Min. Cristiano Zanin | ~mai/2025 | Reclamação com precedentes inexistentes | Multa de 2× as custas; comunicação à OAB | Não informado | [SBT News](https://sbtnews.sbt.com.br/noticia/politica/ministro-do-stf-nega-peticao-em-que-advogado-usou-ia-para-escrever) (só busca) | 🟡 |
| TSE | Não informado | fev/2026 | Julgados inexistentes (em causa própria) | R$ 2 mil | Não informado | [TSE temas selecionados](https://temasselecionados.tse.jus.br/temas-selecionados/materia-processual/litigancia-de-ma-fe) (não aberta) | ❓ |
| Vara do Trabalho de Parauapebas (PA) | — | ~mai/2026 | Texto branco em inicial | Multa; OAB-PA afastou as advogadas por 30 dias, cautelarmente | Não informado | [Diário do Pará](https://diariodopara.com.br/para/oab-do-para-afasta-advogadas-acusadas-de-usar-ia-em-peticao-judicial/) (só busca) | ❓ |
| TJMG | 29ª Vara Cível de BH | Não informada | Prompt injection pedindo gratuidade e urgência | Sanção (valor ❓) | Não informado | [O Fator](https://ofator.com.br/?p=65022) (só busca) | ❓ |

**Correção dos relatos que circularam** (inclusive o post da Atla de 28/10/2026, [link](https://x.com/atlaiabr/status/2115404132341469602): "STF: R$ 5 mil por comando oculto; STJ: R$ 20 mil pelo mesmo truque; TST: multa por má-fé subiu pra 10% por precedentes inventados"):
- **"TST, multa de 10%":** as notas B e C não acharam o caso e apontaram o TST 6ª Turma (**1%**, RR-0000284-92.2024.5.06.0351) e o **STJ 2ª Turma (10%, prompt injection)**. A conferência posterior (notasD) achou na imprensa a **SDI-1 do TST elevando a multa para 10%** por precedentes inexistentes (proc. 0100312-15.2023.5.01.0522) 🟡. Conclusão: **existem dois casos de 10%**, um no STJ (comando oculto) ✅ e um no TST (julgado inexistente) 🟡. O caso de 1% é outro, da 6ª Turma do TST.
- **"STF, R$ 5 mil":** é por **comando oculto** (Moraes), **não** por julgado inexistente. O caso de julgado inexistente no STF é o do Zanin, com multa de 2× as custas.
- **"STJ, R$ 20 mil":** é **prompt injection** (1ª Turma, 20/10/2026), não alucinação.

**Lição para o app (opinião):** os dois riscos são distintos e pedem defesas distintas:
- **julgado inexistente:** verificador mais bloqueio da exportação;
- **texto oculto:** o app **nunca** exporta nem grava texto escondido, e avisa quando ele chega nos autos.

---

## 4. Proposta para o WrapAdv

### 4.1 Princípios

1. **Direito brasileiro primeiro:** CPC, CLT, prazos em dias úteis, número CNJ e tribunais brasileiros. Nada de importar plugins pensados para os EUA.
2. **Tudo local:** os dados ficam em pastas reais, o servidor escuta em `127.0.0.1` e não há telemetria. Isso já existe (`README.md`; `src/runner.js` liga `DISABLE_TELEMETRY=1`).
3. **Cartão para tudo que sai do computador:** `mcp__*`, WebFetch, WebSearch e Bash pedem confirmação. Isso já existe (`src/permissoes/politica.js`, `classificar()`).
4. **Sem bypass:** `src/permissoes/modos.js` não tem a chave; `src/permissoes/settings.js` recusa settings que mencionem "bypass". Manter assim.
5. **`mcp__*` sempre com cartão.** O máximo é "Permitir nesta conversa" para **consulta pública em catálogo**, nunca para envio, escrita ou ferramenta desconhecida. Nunca entra `allow` de `mcp__*` no settings.
6. **O que dá para calcular sem IA, o app calcula:** prazos, quadro de casos, selos. Assim não há envio nem alucinação.
7. **Saída limpa:** nada exportado pelo app pode conter texto oculto. Isso reaproveita `lib/injecao.js` do mod.

### 4.2 O que imitar do Claude for Legal, adaptado

**Formato comum das visões (proposta)**
- **Onde fica:** o Claude grava um JSON na pasta do caso e o app desenha a tabela. Sugiro a pasta `<caso>/visoes/<tipo>-AAAA-MM-DD.json`. Hoje o Claude só escreve sem perguntar em `pecas/`, `audiencias/`, `autos-md/`, `DOSSIE.md`, `HANDOFF.md` e `PRAZOS.md` (`ESCRITA_PERMITIDA_DIRS` e `ESCRITA_PERMITIDA_ARQUIVOS` em `politica.js`). Há duas opções:
  - **(a)** acrescentar `visoes` à lista. É uma linha em `politica.js`, e o `settings.js` ganha o `ask` correspondente no modo "Perguntar";
  - **(b)** usar `pecas/_visoes/` sem mexer na política.

  Recomendo **(a)**, para não misturar visões com peças. **Decisão sua.**
- **Visões do escritório** (quadro de casos e prazos, radar): ficam em `<raiz>/_visoes/`. O app grava, não o Claude.
- **Esquema:**
  - `{ versao, tipo, geradoEm, caso, colunas[], linhas[] }`;
  - cada linha tem `fonte: { arquivo, pagina? }`, relativo ao caso. **Linha sem fonte aparece com "sem fonte"**;
  - o app valida o esquema, desenha só com `textContent` (sem HTML vindo do JSON) e ignora campos desconhecidos;
  - o espelho em `.md` é opcional, para abrir no Word.
- **Onde aparece:** uma aba nova **"Visões"** na tela do caso, ao lado de Resumo, Arquivos, Prazos e Conversas (`public/telas.js`, `T.caso`). Cada visão tem o botão **"Atualizar com o Claude"**, que abre uma conversa no caso com um prompt pronto.

| Visão (origem) | O que mostra | De onde vêm os dados | Rede? | Onde entra | Formato | Prioridade |
|---|---|---|---|---|---|---|
| **Quadro de casos e prazos** (*matter board*) | Por caso: fase, próximo prazo, dias úteis restantes, audiência, pendências do DOSSIE e selos (consentimento, sigilo). Filtros por área e cliente. Estado no estilo do *intake*: em dia, em risco, vencido | `caso.json` (fase, privacidade, `consentimentoIa`), `PRAZOS.md` da raiz e do caso, seção "Pendências" do `DOSSIE.md`, `_consentimento/registro.json` (mod). Cálculo de dias úteis por `prazos.js` e `calendario.js` do mod, como função pura | **Não** | Tela "Seu escritório" (raiz) e de cada área | Calculado pelo app, sem Claude | **Alta** (Fase 3) |
| **Quadro de documentos do caso** (*tabular review*) | Uma linha por documento de `documentos/`, `provas/` e `autos-md/`: tipo, data, partes (com marcadores, se anonimizado), resumo de uma linha, página relevante, "o que prova" e alerta de texto oculto | O Claude lê `autos-md/INDICE.md` e os trechos (via `/preparar-autos` do mod) e grava `visoes/documentos-*.json` | Não (fora o envio normal à Anthropic) | Aba Visões do caso | JSON → tabela | **Alta** (Fase 4) |
| **Playbook do escritório** (*playbook deviation*) | Cláusula por cláusula de um contrato: **padrão / alternativa aceita / desvio / ausente** (as 4 marcas da Anthropic), com sugestão de redação | `<raiz>/ESTILO/playbooks/<tipo>.md`, escrito pelo advogado, e o contrato em `documentos/` | Não | Aba Visões; botão "Revisar contra o playbook" | JSON → tabela | Média (Fase 6) |
| **Cite check** | Já existe no mod e é **melhor** (§4.4). O WrapAdv só mostra o resultado | `WIKI/julgados-verificados.json` e a checagem da peça | Só com permissão | Selo "citações: N não verificadas" na peça e no caso | Leitura do livro | **Alta** (Fase 4) |
| **Matriz de tribunais** (*jurisdiction matrix*) | Para uma tese: como STF, STJ, TST e cada TJ ou TRT decidem (a favor / contra / dividido), com 1 a 3 julgados **conferidos** por célula. Divergência entre tribunais | Busca via garimpo-mcp, com cartão (§4.3); conferência pelo mod; só julgados com status `confere` entram como "conferido" | **Sim** (cartão; só a tese sai) | Aba Visões; ligada ao mapa de teses | JSON → matriz | Média (Fase 6) |
| **Radar normativo** (*regulatory horizon scan*) | Novidades do DOU, CNJ e OAB por tema escolhido (ex.: IA, LGPD, prazos do tribunal X), com link e resumo | WebFetch nos sites oficiais com cartão, ou um conector futuro. **Sem dado de cliente** (é por tema, não por caso) | **Sim** | Tela da raiz (escritório), não do caso | JSON em `<raiz>/_visoes/radar-*.json` | Baixa (Fase 6). Cuidado: o radar nunca afirma que uma norma vigora sem o link oficial; as fontes do CNJ deram 403 ao robô |
| **Triagem de consulta / novo caso** (*intake*) | Formulário guiado (em tela própria): quem, o quê, área sugerida, urgência, conflito de interesse (busca local de partes em `caso.json`), documentos recebidos e próximo passo | Assistente de criação existente (`public/telas.js`, "Novo caso") e `criar.js` com `fase: 'consulta'`. A busca de conflito é local, no índice | Não | Botão "Nova consulta" na raiz | `caso.json` (fase consulta) e `DOSSIE.md` | Média (Fase 3) |

**Por que não copiar a galeria (opinião):** os artifacts da Anthropic vivem no claude.ai, com compartilhamento e *ethical walls* na nuvem. O WrapAdv é de uma pessoa por computador (`README.md`). Copiar o formato de tabela basta; o compartilhamento seria uma nova superfície de vazamento.

### 4.3 Conectores e MCPs brasileiros dentro da autorização por caso

**Como é hoje (fatos do código)**
- **`mcp.json` da sessão:** é gerado a cada turno em `~/.wrapadv/sessoes/<casoId>/<tarefaId>/mcp.json` e contém **só** o servidor `wrapadv` (`src/runner.js`, `_prepararSessao`).
- **Sem `--strict-mcp-config`:** `src/claude-args.js` não usa a flag, por decisão do plano v2 §5.4. Por isso os conectores da conta claude.ai e os MCPs de usuário (`claude mcp add`) **também aparecem**, sempre via cartão.
- **Dupla defesa:**
  - a regra `ask: ["mcp__*"]` no settings, validada como obrigatória em `settings.js`, `validarSettings`;
  - o hook `bin/hooks/guarda-mcp.js`, que responde `ask` para todo `mcp__.*` e `deny` para `mcp__wrapadv__*`.
- **"Permitir nesta conversa":** só aparece se `ehFerramentaDeSaida()` der falso (`politica.js`). A função quebra o nome da ferramenta em palavras e procura verbos **em inglês** (`VERBOS_DE_SAIDA`, `VERBOS_DE_LEITURA`). **Nome sem verbo de leitura conhecido conta como saída.** Por isso, todas as ferramentas do garimpo (`busca_direta`, `obter_ementa`, `conferir_citacao`…) seriam tratadas como "de saída" e **nunca** teriam a opção. Isso é seguro, mas cansa.
- **Memória da opção:** o "Permitir nesta conversa" de conector fica **só em memória** (`runner.js`, `conversaPermite`, por `tarefaId`) e se perde ao reiniciar o app.
- **Filtro de CPF/CNPJ/CNJ:** existe só para WebFetch e WebSearch (`politica.js`: `RE_CPF`, `RE_CNPJ`, `RE_CNJ` → `negar`). **Não se aplica aos argumentos de `mcp__*`.**
- **Logs:** `store.log` grava `pedido_bloqueado`, `pedido_permitido_automatico`, `cartao_permitido` e `cartao_negado`, com `toolName` e tipo, sem conteúdo.

**Proposta: "Conectores seguros" (Fase 1.5)**
1. **Catálogo de conectores conhecidos** em `src/permissoes/conectores.js`, com política única e testada:
   - para cada servidor: nome amigável, para onde os dados vão, e a lista de ferramentas classificadas em `consulta-publica`, `processo` ou `escrita/download`;
   - **ferramenta fora do catálogo continua tratada como saída**, como hoje.
2. **Configuração por sessão gerada pelo app:** os conectores do catálogo entram no `mcp.json` da sessão **só se ligados** no caso e no global. Isso usa `config.json` → `conectores: { garimpo: { ligado, versao } }` e `caso.json` → `conectores: { garimpo: true|false }`.
   - **Desligado no caso:** a política nega `mcp__garimpo__*`, mesmo que o garimpo também esteja instalado no usuário.
   - **Padrão de fábrica: desligado.** Caso com `segredoDeJustica` ou `sigiloReforcado` começa desligado e mostra um aviso ao ligar.
3. **Filtro de sigilo nos argumentos** (novo em `politica.js`), aplicado a **todo** `mcp__*`, catalogado ou não:
   - junta todos os valores de texto do `input`;
   - reaproveita `RE_CPF`, `RE_CNPJ` e `RE_CNJ` de `politica.js` e acrescenta RG, e-mail e telefone, como em `PADROES_SIGILO` (`ajc/scripts/lib/comum.js`);
   - acrescenta **nome do cliente e das partes contrárias** do caso, a partir de `cliente.json` e `caso.json` (`parteContraria`), comparados sem acento e sem caixa. Nomes com 6 caracteres ou mais, como em `sugerirInclusao` (`mencoes.js`);
   - **se casar:** `negar`, com o motivo "a consulta continha dado do cliente; refaça só com a tese";
   - **exceção:** o número CNJ do próprio caso nas ferramentas da classe `processo` (abaixo) vira cartão **com faixa vermelha**, em vez de negação. É a mesma ideia do `cnjLiberados` do mod (`ajc/scripts/lib/julgados.js`).
4. **Texto do cartão** (`src/permissoes/cartoes.js`, `case 'conector'`): mostrar **o que sai**, em vez de só "dados podem sair". Exemplo:

   > "O Claude quer pesquisar jurisprudência no **Garimpo** (consulta ao JurisprudênciaIA e aos sites dos tribunais). Vai sair do seu computador: **'dano moral atraso voo overbooking'** · Tribunais: STJ, TJSP."

   Os parâmetros continuam listados, como já acontece em `parametrosDe`.
5. **"Permitir nesta conversa"** só para a classe `consulta-publica` do catálogo, e continua passando pelo filtro de sigilo **a cada chamada**. O filtro roda antes do auto-permitir em `runner.js`, `_criarPedido`.
6. **Log local por caso:** `~/.wrapadv/logs/conectores.jsonl` com hora, `casoId`, servidor, ferramenta, decisão e **hash (sha256) dos argumentos**, nunca o texto. É coerente com §7 do plano v2 ("só eventos e ids").
7. **Tela "Configurações → Conectores":** lista os conectores do catálogo (ligar/desligar global e versão fixada) e os que apareceram no `init` sem catálogo, com orientação para desligá-los na conta claude.ai, conforme o plano v2 §7.

**Por conector**

| Conector | Onde mora | O que sai | "Permitir nesta conversa" | Nunca "nesta conversa" | Observações |
|---|---|---|---|---|---|
| **garimpo-mcp** (primeiro da fila) | O app instala uma **versão fixada** em `~/.wrapadv/conectores/garimpo/` (`npm install garimpo-mcp@<versão>`) e põe `{ "type":"stdio", "command": <node>, "args":[<caminho do bin>] }` no `mcp.json` da sessão. **Não usar `npx -y`**, que baixa a última versão a cada abertura | A tese ou os termos de busca, números de julgado e tribunal; para `julgamentos_do_processo`, o número CNJ | `busca_direta`, `busca_ampla`, `obter_ementa`, `obter_inteiro_teor`, `ler_inteiro_teor`, `conferir_citacao`, `conferir_acordao_citado`, `consultar_precedente`, `texto_de_lei`, `listar_tribunais`, `diagnostico_dos_freios`, `panorama_da_amostra`, `pesquisar_acordaos_tcu`, `ler_acordao_tcu` | `julgamentos_do_processo` (classe `processo`: pode levar o CNJ do cliente) e `baixar_anos_tcu` (baixa arquivos para o disco) | Cliente **não oficial**, que pode quebrar sem aviso. O app mostra "Fonte não oficial; confira no site do tribunal". Antes de entrar no catálogo é preciso ler o código, porque os nomes dos argumentos de cada ferramenta não estão nas notas |
| **Datajud** | Via `julgamentos_do_processo` do garimpo. Um MCP próprio do app só se o garimpo não servir (a chave pública do CNJ muda; os termos de uso são ❓) | Número CNJ | — | Sempre cartão (é o processo do cliente) | Metadados apenas; não consulta processos em segredo de justiça. Caso com `segredoDeJustica`: o app avisa que não vai achar |
| **DJEN / Comunica PJe** | Fica para depois (plano v2 §11, item 12: "PJe/DJEN: fora da v1"). A documentação oficial da API não foi confirmada | Número CNJ ou OAB | — | Sempre cartão | Útil para alimentar `PRAZOS.md` com as intimações; exige confirmar a API e os termos antes |
| **normas.leg.br / Planalto** | `texto_de_lei` do garimpo (normas.leg.br); Planalto por WebFetch, que já tem cartão e filtro | Artigo ou lei consultada | `texto_de_lei` (consulta pública) | — | Sem dado de cliente por natureza |
| **Jusratio, Jurídico AI** (remotos, pagos) | MCP remoto (URL e autenticação da empresa), adicionado pelo usuário | A tese vai para a empresa | Só depois de catalogado | Tudo enquanto não estiver catalogado | **Decisão sua** (contrato e custo). Exigem conta; a Jurídico AI não publica os nomes das ferramentas |
| **PJe** (certificado) | **Não fazer** | — | — | — | Risco de credencial e de termos de uso dos tribunais. O WrapAdv já nega `.pfx`/`.p12` (`politica.js`) |

### 4.4 Reaproveitar o assistente-juridico-claude

**Incompatibilidade de estrutura (fato, e ponto mais importante desta seção)**
- O mod assume casos em `ESCRITORIO/CASOS/<fase>/<caso>`. Por exemplo, `pastaDoCaso()` em `ajc/scripts/lib/anonimizar.js` só reconhece arquivos sob `<escritorio>/CASOS/`.
- O WrapAdv usa `<raiz>/<área>/<cliente>/<caso>/` com `caso.json` (`src/escritorio/criar.js`).
- **Até o mod reconhecer `caso.json`**, as guardas de anonimização do mod **não protegem casos do WrapAdv**. A guarda de sigilo pergunta antes de ler o original e nega a tabela, mas `pastaDoCaso` devolve `null` para esses caminhos.
- **Proposta:**
  - **não oferecer `/anonimizar` em casos do WrapAdv antes desse PR no mod**;
  - enquanto isso, o WrapAdv nega por conta própria a leitura de `**/_anonimizacao/**` e a escrita em `**/_consentimento/**` (regras de `deny` em `settings.js` e em `politica.js`).

  O plano v2 §8.4 já previa o PR "`lib/casos.js` reconhecer `caso.json`".

**1. Verificador de julgados** (`/verificar-citacoes`)
- **Hoje (fatos):**
  - **Fluxo** (`ajc/skills/verificar-citacoes/SKILL.md`): primeiro procura local (`WIKI/raw/`, `WIKI/paginas/`, `autos-md/`). Depois, internet **só com permissão** e só com o número do julgado (`julgados.js politica | autorizar | pedir`). Não deu para conferir → `[NÃO VERIFICADO]` (`checar-peca.js --marcar`).
  - **Comparação** (`ajc/scripts/lib/julgados.js`, `comparar`/`situacao`): local, sem rede, **≥ 0,97 palavra por palavra**, tolerante só à forma (NFKC, hífen, invisíveis). Status `confere | divergente | inexistente | sem-texto`.
  - **Livro:** `ESCRITORIO/WIKI/julgados-verificados.json`. Pendentes em `julgados-pendentes.json`, na pasta de estado do mod.
  - **`lib/citacoes.js`:** reconhece REsp, AREsp, RE, HC, Súmula, Tema, OJ e leis. Classifica cada citação em verificada, marcada ou pendente; divergente e inexistente viram problema mesmo com link.
  - **Exportação:** `exportar-docx.js` recusa (código 2) jurisprudência pendente, com `--forcar` como saída, e bloqueia as divergentes (`ARQUITETURA.md` §5; `CHANGELOG` 0.5.0).
  - **Sites sugeridos** (`FONTES_SUGERIDAS`): `stf.jus.br`, `stj.jus.br`, `tst.jus.br`, `jus.br`, `planalto.gov.br` e `jusbrasil.com.br`.
- **Por que é melhor que o cite check (opinião):**
  - o cite check compara com o que você anexou ou conectou;
  - o mod **vai buscar o original** no site oficial, com sua permissão e sem dado do cliente, guarda a prova em `WIKI/raw/`, compara de forma determinística (sem IA) e **trava a exportação**;
  - **limite:** o status `inexistente` é registrado quando a busca não achou (`conferencia-online.md`, passo 5). Isso **não prova** inexistência, porque o site pode estar fora do ar ou o número pode ter sido mal digitado. **Na UI do WrapAdv, mostrar "não localizado", nunca "inexistente".**
- **No WrapAdv:**
  - selo na peça e no caso: **"Citações: 3 não verificadas · 1 divergente"**, lido do livro e da checagem;
  - botão **"Conferir julgados"** (já previsto no plano v2 §8.4), que abre uma conversa com `/verificar-citacoes <peça>`;
  - quando o garimpo estiver ligado, a skill pode usar `conferir_citacao` (também por regra fixa) como **segunda fonte**, sem substituir o original salvo.
- **Atrito a resolver:** o filtro de WebFetch do WrapAdv **nega qualquer número CNJ** (`politica.js`), inclusive o de um acórdão de TJ citado pelo número. O mod libera os números pedidos com `julgados.js pedir` (`cnjLiberados`). Proposta: o WrapAdv lê `julgados-pendentes.json`, só leitura, e libera esses números, **só para domínios oficiais**.
- **Mudança no mod (PR futuro):** reconhecer `caso.json`; rótulo "não localizado" no relatório; opção de usar o garimpo como fonte.

**2. Anonimização** (`/anonimizar`)
- **Hoje (fatos):**
  - comandos de `scripts/anonimizar.js`: `preparar | aplicar | reverter | conferir | estado | desligar`;
  - **tabela** só em `<caso>/_anonimizacao/tabela.json`; **cópias** em `<caso>/anonimizado/`; a peça com dados reais vai para `<peça>-dados-reais.md`;
  - **marcadores estáveis:** `[PARTE_A]`, `[CPF_1]`, `[PROCESSO_1]`… e variantes como `[PARTE_A#2]`. `reverter(aplicar(x)) === x`;
  - **guardas:** ler o original de um caso anonimizado → `ask`; a tabela → `deny` em Read, Grep e terminal (`guarda-sigilo.js`); o conteúdo da tabela fora dali → `deny` (`guarda-escrita`). A exportação recusa marcador restante.
  - **Limites declarados** (`skills/anonimizar/references/detalhes.md`): a detecção de nomes é heurística; o nome da pasta do caso continua aparecendo; leituras pelo terminal não passam pela pergunta.
- **No WrapAdv:**
  - selo **"Anonimizado"** no caso, quando a tabela estiver ativa;
  - na aba Arquivos, as cópias de `anonimizado/` aparecem como as que o Claude lê;
  - faixa amarela se o consentimento exigir anonimização e ela estiver desligada;
  - **o slug da pasta** (`src/escritorio/slug.js`) pode ganhar a opção "nome neutro", para responder ao limite do nome da pasta.
- **Mudança no mod:** `pastaDoCaso` para a estrutura do WrapAdv; ler `parteContraria` do `caso.json` como fonte de nomes.

**3. Consentimento** (`/consentimento`)
- **Hoje (fatos):**
  - **comandos** (`scripts/consentimento.js`): `registrar <caso> --forma escrito|email|verbal`, `modelo`, `revogar` e `estado`;
  - **registro** em `<caso>/_consentimento/registro.json`, só de acréscimo. Eventos `registro`, `revogacao` e `modelo`; situação autorizado, não autorizado, revogado, sem registro ou ilegível;
  - **avisos sem bloquear** (fail-open) no `/processo`, no início da conversa e no `checar-peca`;
  - **o termo gerado** (`lib/consentimento.js`) tem opções para marcar, inclusive "Autorizo o envio de documentos … (Claude, da empresa Anthropic), que processa o texto em servidores fora do escritório" e a exigência de anonimização. O modelo geral `templates/escritorio/PECAS/modelos/termo-consentimento-ia.md` é mais curto e não cita a Anthropic.
  - **Status:** no topo do CHANGELOG, como **Unreleased** (não lançado).
- **No WrapAdv:**
  - **hoje** existe só `caso.json → consentimentoIa: { informado, data, arquivo }` (`criar.js`) e a faixa amarela quando `informado === false` (`public/telas.js`);
  - **proposta:** o app lê `_consentimento/registro.json` (só leitura) e mostra o selo **"Consentimento registrado em 29/10/2026 (escrito)"**, **"Revogado"** ou **"Sem registro"**, com o botão "Gerar termo";
  - **opinião:** "não autorizado" ou "revogado" deveria **bloquear** a leitura de `documentos/` pelo Claude (negar na política), e não só avisar. É mais forte que o mod, que é fail-open. **Decisão sua.**
- **Lacunas do termo frente à Rec. 001/2024 (PR no mod):** faltam o direito de falar com um humano (4.3), "benefícios, limitações e riscos" explícitos (4.2.1) e a guarda até o fim do serviço (4.3.3).

**4. Calendário forense e prazos** (`/prazos`)
- **Hoje (fatos):**
  - `~/.claude/advogado/calendario.json`, versionado, com entradas `{id, tipo, inicio, fim, recorrente, escopo, motivo, fonte, semFonte, criadoEm}`. Tipos feriado, suspensão e indisponibilidade; escopo global, tribunal ou comarca;
  - **sem semente:** cada data entra com fonte; sem fonte, recebe a marca `[SEM FONTE]` (`skills/prazos/references/calendario.md`);
  - `lib/prazos.js`: CPC arts. 219, 220 e 224, Páscoa, recesso de 20/12 a 20/01 e "hoje" local (`hojeLocal`). Lê o `PRAZOS.md` com as colunas `Vencimento | Caso | O que fazer | Origem | Status`;
  - o foro do caso fica no `DOSSIE.md` (linha `Tribunal: … · Comarca: …`).
- **Incompatibilidades com o WrapAdv:**
  - o `PRAZOS.md` **do caso** criado pelo WrapAdv tem 4 colunas (`Vencimento | O que fazer | Origem | Status`, sem "Caso"); só o da raiz bate com o mod (`criar.js`);
  - o foro, no WrapAdv, está em `caso.json` (`tribunal`, `orgao`), não no DOSSIE.
- **No WrapAdv:**
  - aba **Prazos** do caso e quadro de casos e prazos (§4.2) usando `prazos.js` e `calendario.js` como **funções puras** (plano v2 §8.4);
  - selo "prazo em N dias úteis (DD/MM)";
  - aviso `[SEM FONTE]` visível.
- **Mudança no mod:** aceitar o `PRAZOS.md` de 4 colunas (caso implícito pela pasta) e ler o foro do `caso.json`.

**5. Guarda de sigilo e injeção**
- **Hoje (fatos):**
  - **`scripts/guarda-sigilo.js`** (PreToolUse em `Bash|PowerShell|WebFetch|WebSearch|Read|NotebookRead|Grep|mcp__.*`, conforme `hooks/hooks.json`):
    - envio por terminal (curl POST, scp, git push, e-mail…) → `ask`;
    - cópia para pasta de nuvem → `ask`;
    - apagar pastas do ESCRITORIO em massa → `deny`;
    - web com CPF, CNPJ, CNJ, RG, e-mail ou telefone → `deny`, salvo CNJ liberado;
    - `verificacaoOnline: "nunca"` → `deny`;
    - `mcp__*` com verbo de envio no nome → `ask`. **Não olha os argumentos.**
  - **`scripts/lib/injecao.js`:** `detectarInjecao` (pt e en), `detectarInvisiveis`, `ocultoNoDocx` (vanish, fonte branca, ≤ 2 pt) e `ocultoNoTexto` (CSS que esconde). O que **entra** gera aviso sem obedecer; o que **sai** (gravar ou exportar peça) com texto oculto é **barrado**, e a exportação recusa com código 3, sem `--forcar` (`CHANGELOG` 0.6.0).
- **No WrapAdv:**
  - o app chama `injecao.js` ao **exportar ou abrir** qualquer peça, e mostra o selo **"Sem texto oculto ✓"** ou 🔴 na peça;
  - quando os autos chegam (Arquivos), mostra o alerta "este documento traz instruções escondidas para IA";
  - o filtro de argumentos de `mcp__*` (§4.3) cobre o ponto que o mod não cobre.
- **Mudança no mod:** opcional, aplicar `acharSigilo` aos argumentos de `mcp__*` também.
- **Verificar:** se os hooks do mod carregam com `--setting-sources user` (plano v2 §10). Não está verificado no material lido.

**6. Mapa de teses** (`/mapa-de-teses`)
- **Hoje (fatos):** `mapa-teses.js modelo|validar|marcar|totalizar|imprimir`. O mapa fica em `<caso>/pecas/mapa-de-teses-AAAA-MM-DD.md`. É um quadro por pedido (valor, risco alto/médio/baixo, teses, precedentes); todo precedente sai `[A VERIFICAR]` até ser conferido; `validar` reprova divergente ou inexistente (`ARQUITETURA.md` §15.2).
- **No WrapAdv:** visão "Mapa de teses" na aba Visões, renderizando o `.md`, com o total de exposição por risco e a contagem de "a verificar". Ligação natural com a matriz de tribunais (§4.2).
- **Mudança no mod:** opcional, emitir também JSON no formato comum das visões.

### 4.5 Riscos LGPD, OAB e sigilo e como o app trata

| Risco | Mitigação | Onde no app | Status |
|---|---|---|---|
| Plano consumer (Pro/Max) com treino em "Opt-out" ✅ | Aviso nas boas-vindas para desligar o treino; recomendação de Team, Enterprise ou API para dados de clientes (Rec. 2.2) | Boas-vindas; `README.md` ("Antes de usar com dados de clientes") | **Já existe** (aviso, sem bloqueio) |
| Treino ou retenção desconhecidos no plano em uso | Registrar em Configurações qual plano o escritório usa e a data em que o treino foi desligado (declaração do advogado) | Configurações → Claude | Proposto |
| Dados sensíveis (art. 11 da LGPD; saúde, criminal, família) | `sigiloReforcado` por área; faixa vermelha nos cartões; anonimização opcional; conectores desligados por padrão | `politica.js` (`avisosDeSigilo`), `cartoes.js` (`faixaVermelha`) | Avisos **já existem**; anonimização e conectores, propostos |
| Transferência internacional (servidores da Anthropic fora do Brasil) | Constar no termo de consentimento (o termo gerado pelo mod já diz "servidores fora do escritório"); os artigos da LGPD sobre o tema **não foram conferidos** ❓ | Termo (mod) e selo de consentimento | Parcial (mod) / proposto (selo) |
| Consentimento do cliente (Rec. 4.3.1) | `/consentimento`, selo no caso; recusa ou revogação bloqueia leitura de `documentos/` (proposta) | Tela do caso | Faixa amarela **já existe** (`telas.js`); selo e bloqueio propostos |
| Falta de revisão humana (Rec. 3.1 e 3.7) | Modo padrão "Perguntar antes de alterar"; nada é protocolado pelo app; selo "revisado por mim" na peça antes de exportar | `modos.js`; tela da peça | Modo **já existe**; selo proposto |
| Julgado inexistente (multas de 1% e 10% no TST e no STJ) | Verificador do mod; exportação travada; UI diz "não localizado", nunca "inexistente" | Selo de citações; botão "Conferir julgados" | Proposto (o mod já faz) |
| Prompt injection **na entrada** (autos da parte contrária) | `injecao.js` avisa sem obedecer; inclusão de outro caso **nunca** vem de texto (`mencoes.js`) | `mencoes.js`; alerta em Arquivos | Inclusão segura **já existe**; alerta proposto |
| Prompt injection **na saída** (multas de R$ 20 mil e 10% no STJ, R$ 5 mil no STF) | O app nunca exporta texto oculto (`ocultoNoDocx`/`ocultoNoTexto` antes de exportar); selo "Sem texto oculto" | Exportação; tela da peça | Proposto (o mod já barra na exportação dele) |
| Conector que envia dados (a tese, o CNJ) | Cartão sempre; filtro de sigilo nos argumentos; catálogo; ligar por caso; log com hash | `politica.js`, `cartoes.js`, `runner.js` | Cartão **já existe**; o resto é proposto (Fase 1.5) |
| Conector com código de terceiros (cadeia de suprimentos) | Versão fixada, instalada pelo app; nada de `npx -y`; leitura do código antes de catalogar | `~/.wrapadv/conectores/` | Proposto |
| Pastas em nuvem (OneDrive, Drive, Dropbox, iCloud) | Aviso, sem bloqueio | `src/escritorio/nuvem.js`; faixa em `telas.js` | **Já existe** |
| Resíduos do Claude Code (transcripts, `backups/`, `shell-snapshots/`, `plans/`) | `cleanupPeriodDays: 30` no settings; descarte completo (`claude purge`) previsto | `settings.js`; README | 30 dias **já existe**; descarte proposto (Fase 4) |
| Tabela de anonimização e registro de consentimento lidos ou alterados pelo Claude | `deny` de leitura em `**/_anonimizacao/**` e de escrita em `**/_consentimento/**` no próprio WrapAdv, sem depender do mod | `settings.js`, `politica.js` | Proposto |
| Certificado digital, `.env`, `~/.ssh` | `deny` de leitura e escrita | `politica.js`, `settings.js` | **Já existe** |
| Responsabilidade do advogado (Rec. 3.2; art. 77 do CPC) | Texto fixo nas exportações ("Minuta revisada e assinada por…"); política escrita de IA do escritório gerada a partir de modelo (Rec. 3.6) | Exportação; Configurações → Política de IA | Proposto |

### 4.6 Faseamento

**Estimativas são estimativas.** Unidades: "dias de agente" (trabalho de implementação e testes) + "revisão G." (seu tempo para revisar e testar). Os números alinham com `casos-plano-v2.md` §9.

| Fase | Escopo | Esforço | Depende de você |
|---|---|---|---|
| **1 (reabrir)** | Reabrir o PR da branch `claude/fase1-wrapadv`. O motivo do fechamento **não consta** no material lido. Conferir os aceites 11 a 13 do plano v2: `verificar-cli` na sua máquina (as regras de caminho no Windows têm "INCERTEZA" anotada em `settings.js`), capturas e roteiro manual com o Claude real. Corrigir o que você apontar | 1–3 dias de agente + 1–2 h de revisão G. | Por que o PR foi fechado; rodar `npm run verificar-cli` no seu computador; aprovar o visual |
| **1.5 (nova) Conectores seguros** | Catálogo (`conectores.js`); filtro de sigilo nos argumentos de `mcp__*` (CPF, CNPJ, CNJ, RG, e-mail, telefone e nomes do caso); chave por caso e global; `mcp.json` da sessão com garimpo em versão fixada; cartão "o que sai"; log com hash; tela Conectores; `deny` de `_anonimizacao/` e `_consentimento/`; testes com MCP falso | 3–5 dias de agente + 2–3 h de revisão G. | Ligar o garimpo (sim/não); aceitar cliente não oficial; versão a fixar |
| **2 Estilo e modelos** | Igual ao plano v2 | Conforme o plano v2 | Timbrado e pastas de amostra |
| **3 Busca, prazos e triagem** | Plano v2 + **quadro de casos e prazos** (calculado, sem IA) + **triagem de consulta** (com conflito de interesse local) + leitura de `PRAZOS.md` de 4 colunas | 4–7 dias de agente + 3 h de revisão G. | Se o mod v0.7+ já é a base dos prazos |
| **4 Sigilo avançado e integração com o mod** | Plano v2 + selos (consentimento, anonimizado, citações, texto oculto) + botão "Conferir julgados" + aba Visões (documentos do caso, mapa de teses) + **PRs separados no mod**: `caso.json` / `pastaDoCaso`, rótulo "não localizado", termo com o item 4.3, `PRAZOS.md` de 4 colunas e foro no `caso.json` | 6–10 dias de agente (app) + 3–5 dias (PRs no mod) + 4–6 h de revisão G. | Bloquear ou só avisar sem consentimento; ordem dos PRs no mod |
| **5 Empacotamento** | Igual ao plano v2 | Conforme o plano v2 | — |
| **6 (nova) Visões avançadas** | Playbook de contratos; matriz de tribunais (com garimpo e conferência); radar normativo | 5–9 dias de agente + 3–4 h de revisão G. | Escrever o primeiro playbook; temas do radar; avaliar Jusratio ou Jurídico AI (custo e contrato) |

**Ordem recomendada:** 1 → 1.5 → 4 (só os selos e o verificador) → 3 → 2 → resto da 4 → 5 → 6. A 1.5 vem cedo porque fecha o vazamento mais provável: a tese com nome do cliente indo para um conector. Os selos vêm antes do estilo porque respondem diretamente às sanções de 2026.

### 4.7 O que NÃO fazer

- **Não copiar** a galeria de artifacts nem o compartilhamento em nuvem do claude.ai. O WrapAdv é local e de uma pessoa.
- **Não instalar** os plugins do `claude-for-legal` no escritório. Foram feitos para os EUA (FRE 408, *privilege*, "assumes you're the customer"). Se alguma ideia for aproveitada em texto, respeitar a licença Apache-2.0.
- **Não depender** de API não documentada **sem aviso visível**. O garimpo usa busca sem documentação pública; o DJEN e o Datajud têm termos não confirmados.
- **Não prometer** que a conferência prova que um julgado não existe. "Não localizado" ≠ "inexistente", e o próprio garimpo avisa isso.
- **Não usar** `npx -y` para conectores. Não instalar MCP de PJe que use o certificado do advogado.
- **Não criar** `allow` de `mcp__*` no settings nem "Permitir sempre" para conectores. Não abrir exceção de bypass, nem no modo Automático.
- **Não mandar** ao conector nada que identifique o cliente. O filtro nega; o Claude deve reformular só com a tese.
- **Não deixar** o radar normativo afirmar vigência sem link oficial. Não tratar a Res. CNJ 615 como norma para advogados.
- **Não mexer** no mod dentro dos PRs do WrapAdv. As mudanças no mod vão em PRs separados, como no plano v2 §8.4.

---

## 5. Perguntas para o Guilherme

1. Por que o PR #1 foi fechado? Há algo a mudar antes de reabrir?
2. Você aprova inserir a **Fase 1.5 (Conectores seguros)** antes da Fase 2?
3. Liga o **garimpo-mcp** sabendo que é cliente **não oficial** do JurisprudênciaIA? Padrão desligado e ligado por caso?
4. Em casos com **segredo de justiça ou sigilo reforçado**: conectores proibidos ou só com aviso?
5. Sem consentimento (ou com consentimento revogado), o app **bloqueia** a leitura de `documentos/` ou **só avisa**, como o mod?
6. Visões em pasta nova `visoes/` (muda uma linha da política) ou em `pecas/_visoes/`?
7. Qual plano do Claude o escritório usa hoje, e o treino está desligado? (É a pergunta F do plano v2, ainda em aberto no material lido.)
8. Quer avaliar um conector pago (Jusratio ou Jurídico AI)? Se sim, com qual orçamento?
9. Posso abrir os PRs no mod (`caso.json`, "não localizado", termo com o item 4.3, `PRAZOS.md` de 4 colunas), separados e depois da Fase 1?
10. Temas iniciais do radar normativo (ex.: IA na advocacia, LGPD, portarias de suspensão do seu TJ)?

---

## 6. Não confirmado e lacunas

**Claude for Legal**
- Acesso de Pro/Max à galeria jurídica e aos plugins; lista e contagem dos 60+ conectores (o diretório deu 403/404).
- Os 4 artifacts de acesso à justiça não nomeados; se os artifacts funcionam no Claude Code ou no Desktop.
- A qual plano se aplica a retenção de 30 dias; cobrança em BRL; interface em português.
- A lista de países mostra vigência em 12/11/2026, depois de hoje.
- Data exata do primeiro plugin jurídico (início de 2026).
- O que o cite check faz com julgado inexistente: a Anthropic não diz; a alegação da Atla não foi testada.

**Brasil: produtos**
- LLM de quase todos os players (exceção: menção da imprensa à OpenAI no Lexter); preço vigente do Jus IA (fontes em conflito); preço do CoCounsel no Brasil; preço do MCP da Jurídico AI.
- IAJUS, Preâmbulo, Doutor IA, Leya, Chat ADV: nada encontrado.
- JurisprudênciaIA: site oficial, termos e preço.
- Plugin PJe da Atla: só alegação em posts. MCPs de PJe de terceiros: não verificados.
- Datajud: termos de uso, limites e finalidade. DJEN: API oficial, autenticação e limites. PJe MNI.
- garimpo-mcp: nomes dos argumentos de cada ferramenta (preciso ler o código antes de catalogar).

**Regulação**
- Número "001/2024" da recomendação: só em fonte institucional secundária (MPRJ, SIJUR). Os itens vêm do texto da SIJUR.
- Texto literal do CED, arts. 35 a 38.
- Artigos da LGPD sobre transferência internacional (não conferidos).
- Nota Técnica ANPD 27/2024 e data do Radar nº 3.
- PL 2338/2023: situação em out/2026 e relator.
- Código de Boas Práticas da OAB: previsto, não publicado.
- Lista oficial de ferramentas da OAB-RJ: inexistente nas fontes.

**Sanções**
- AREsp 3.095.458: número só em terceiros; valor total ou por advogado.
- STF (Moraes): número do processo e data exata (30/09 inferida).
- TST SDI-1: só imprensa (sem notícia oficial do TST aberta).
- TJPR: percentual. TSE, Parauapebas, TJMG, TRT-5, TRT-RS e STJ REsp 2.256.731-PB: só busca.

**Código**
- Por que o PR #1 foi fechado.
- Regras de caminho e hooks no Windows (incerteza anotada em `src/permissoes/settings.js`).
- Se os hooks e skills do mod carregam com `--setting-sources user` (plano v2 §10).
- Se `consentimento.js` do mod resolve casos fora de `CASOS/` (não li a resolução de caso dele; é provável que não, como `anonimizar.js`).

---

## 7. Fontes

Todas acessadas em 30/10/2026. "Busca" = vista só em resultado de busca, página não aberta.

### 7.1 Oficiais: Anthropic

1. Claude for the legal industry: https://claude.com/blog/claude-for-the-legal-industry (12/05/2026)
2. Introducing artifacts for legal work: https://claude.com/resources/articles/introducing-artifacts-for-legal-work (28/10/2026)
3. Claude for Legal (solução): https://claude.com/solutions/legal (sem data)
4. Preços: https://claude.com/pricing (sem data)
5. Repositório claude-for-legal (README): https://github.com/anthropics/claude-for-legal (data do último commit não visível)
6. litigation-legal: https://github.com/anthropics/claude-for-legal/tree/main/litigation-legal
7. commercial-legal: https://github.com/anthropics/claude-for-legal/tree/main/commercial-legal
8. Guia de privilégio e confidencialidade: https://support.claude.com/en/articles/15707726-using-claude-for-legal-work-privilege-confidentiality-and-how-to-think-about-configuration (26/08/2026); versão pt (busca): https://support.claude.com/pt/articles/15707726-usando-claude-para-trabalho-juridico-privilegio-confidencialidade-e-como-pensar-sobre-configuracao
9. Atualização de políticas (retenção de 30 dias): https://support.claude.com/en/articles/9301722-updates-to-our-acceptable-use-policy-now-usage-policy-consumer-terms-of-service-and-privacy-policy (16/03/2026)
10. Países suportados: https://www.anthropic.com/supported-countries (vigência mostrada: 12/11/2026)

### 7.2 Oficiais: Brasil (órgãos públicos e OAB)

11. STJ, R$ 20 mil por prompt injection: https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/20102026-Novo-caso-de-prompt-injection-STJ-multa-advogados-em-R--20-mil-por-ato-contra-a-dignidade-da-Justica.aspx (20/10/2026)
12. STJ, multa a procurador municipal: https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/03092026-STJ-impoe-multa-por-litigancia-de-ma-fe-em-recurso-com-prompt-injection-assinado-por-procurador-municipal-.aspx (03/09/2026)
13. STJ, Informativo 902: https://scon.stj.jus.br/jurisprudencia/externo/informativo/?livre=%40CNOT%3D022624 (22/09/2026)
14. STJ, primeiras decisões sobre IA (HC 1.023.732): https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/18102026-Quando-a-inteligencia-artificial-vira-questao-de-Justica-as-primeiras-decisoes-do-STJ-sobre-o-uso-de-IA.aspx/ (18/10/2026)
15. OAB, aprovação das recomendações: https://www.oab.org.br/noticia/62704/oab-aprova-recomendacoes-para-uso-de-ia-na-pratica-juridica (11/11/2024)
16. OAB, versão final: https://www.oab.org.br/noticia/62711/confira-versao-final-da-recomendacao-do-cfoab-sobre-o-uso-de-ia-na-pratica-juridica (13/11/2024)
17. CNJ, Res. 615/2025: https://atos.cnj.jus.br/atos/detalhar/6001 ; PDF: https://atos.cnj.jus.br/files/original1555302025031467d4517244566.pdf (11/03/2025; DJe 14/03/2025)
18. CNJ, Res. 674/2026: https://atos.cnj.jus.br/atos/detalhar/6836 ; compilado: https://atos.cnj.jus.br/files/compilado1243232026032669c529ebd7bbb.pdf (25/03/2026)
19. OAB-RJ, Advoga AI (delegar): https://oabrj.org.br/noticias/advoga-ai-saiba-delegar-inteligencia-artificial-sua-rotina-juridica (27/10/2026)
20. OAB-RJ, anonimização (busca): https://oabrj.org.br/noticias/advoga-ai-anonimizacao-dados-essencial-uso-ia-pela-advocacia ; cartilha (busca): https://www.oabrj.org.br/sites/default/files/cartilha_para_o_uso_etico_da_ia_na_pratica_juridica.pdf
21. Lei 8.906/94 (Planalto): https://www.planalto.gov.br/ccivil_03/leis/l8906.htm
22. LGPD (Planalto): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
23. CNJ, Conecta (busca; 403): https://www.cnj.jus.br/conecta-reune-principais-solucoes-de-ia-do-judiciario-e-acelera-uso-nacional/ ; TRF3, LIA3R: https://web.trf3.jus.br/noticias/Noticiar/ExibirNoticia/446267-cnj-lanca-lia3r-e-amplia-uso-de-inteligencia-artificial
24. Datajud: TRT-3 https://portal.trt3.jus.br/internet/transparencia/tecnologia-da-informacao/dados-api/datajud ; TJPE https://portal.tjpe.jus.br/web/transparencia/tic/dados-abertos ; tutorial CNJ (busca) https://www.cnj.jus.br/wp-content/uploads/2023/05/tutorial-api-publica-datajud-beta.pdf
25. DJEN: CNJ https://www.cnj.jus.br/programas-e-acoes/processo-judicial-eletronico-pje/comunicacoes-processuais/ ; TJRJ https://portaltj.tjrj.jus.br/documents/d/guest/dica_de_sistema_publicacoes-djen-pje-v1-0-4
26. TRT-3, súmula inexistente (busca): https://portal.trt3.jus.br/internet/conheca-o-trt/comunicacao/noticias-juridicas/justica-do-trabalho-aplica-multa-apos-advogado-citar-sumula-inexistente-gerada-por-inteligencia-artificial
27. TSE, temas selecionados (não aberta): https://temasselecionados.tse.jus.br/temas-selecionados/materia-processual/litigancia-de-ma-fe
28. MPRJ, artigo que cita a "Recomendação 001/2024" (institucional secundária): https://www.mprj.mp.br/documents/20184/8630878/Leandro_Garcia_Algarte_Assuncao.pdf

### 7.3 Terceiros

29. LawNext, conectores e plugins: https://www.lawnext.com/2026/05/anthropic-goes-all-in-on-legal-releasing-more-than-20-connectors-and-12-practice-area-plugins-for-claude/ (12/05/2026)
30. Unite.AI, galeria de artifacts: https://www.unite.ai/anthropic-adds-ready-to-use-legal-artifacts-gallery-to-claude/ (data do artigo: 28/10/2026)
31. Artificial Lawyer (não abriu): https://artificiallawyer.com/2026/10/28/anthropic-increases-legal-vertical-push-with-artifacts
32. Vaquill (busca): https://www.vaquill.ai/blog/how-to-use-claude-for-legal-research ; Advbox (busca): https://advbox.com.br/blog/claude-para-advogados/
33. Posts da Atla no X: https://x.com/atlaiabr/status/2116111608015634777 (30/10/2026) ; https://x.com/atlaiabr/status/2115485190218981735 e https://x.com/atlaiabr/status/2115503129399525667 (28/10/2026) ; https://x.com/atlaiabr/status/2115404132341469602 (28/10/2026); site: https://atla.ia.br/
34. garimpo-mcp: https://github.com/leorochasf/garimpo-mcp
35. Conjur, STJ R$ 20 mil: https://conjur.com.br/2026-out-20/stj-multa-advogados-em-r-20-mil-por-uso-de-prompt-injection-em-peticao/ (20/10/2026)
36. Lex, AREsp 3.095.458: https://www.lex.com.br/novo-caso-de-prompt-injection-stj-multa-advogados-em-r-20-mil-por-ato-contra-a-dignidade-da-justica/ (21/10/2026)
37. Rota Jurídica: https://www.rotajuridica.com.br/?p=179732 (21/10/2026)
38. COAD, STJ 2ª Turma: https://www.coad.com.br/home/noticias-detalhe/139561/stj-impoe-multa-por-litigancia-de-ma-fe-em-recurso-com-prompt-injection-assinado-por-procurador-municipal (04/09/2026)
39. Migalhas, TST SDI-1 10%: https://www.migalhas.com.br/quentes/466709/gol-de-mao-ministro-alerta-sobre-ia-e-tst-multa-por-precedente-falso (16/10/2026)
40. Lex, TST 6ª Turma 1%: https://www.lex.com.br/empresa-e-advogado-sao-condenados-por-possivel-uso-de-ia-com-citacoes-falsas-de-jurisprudencia/ (10/03/2026)
41. Lex, TJPR: https://www.lex.com.br/tjpr-multa-advogado-por-litigancia-de-ma-fe-pelo-uso-de-ia-sem-zelo-e-cautela/ (01/07/2026)
42. Poder360, STF R$ 5 mil: https://www.poder360.com.br/poder-justica/moraes-multa-advogado-por-comando-de-ia-em-peticao/ (01/10/2026) ; Convergência Digital: https://convergenciadigital.com.br/inovacao/stf-impoe-multa-a-advogado-por-burlar-sistema-de-inteligencia-artificial/ (01/10/2026) ; Correio da Manhã (busca): https://www.correiodamanha.com.br/politica/2026/10/323680-moraes-multa-advogado-por-comando-oculto-para-tentar-manipular-ia-do-stf-e-aciona-mpf.html
43. SBT News, STF/Zanin (busca): https://sbtnews.sbt.com.br/noticia/politica/ministro-do-stf-nega-peticao-em-que-advogado-usou-ia-para-escrever ; Portal Tela (busca): https://www.portaltela.com/noticias/politica/2025/05/16/supremo-tribunal-federal-rejeita-reclamacao-gerada-por-inteligencia-artificial-e-multa-autor/ (URL indica 16/05/2025)
44. Diário do Pará (busca): https://diariodopara.com.br/para/oab-do-para-afasta-advogadas-acusadas-de-usar-ia-em-peticao-judicial/ ; O Fator (busca): https://ofator.com.br/?p=65022
45. Migalhas, Plano Nacional de IA da OAB: https://www.migalhas.com.br/quentes/458194/oab-lanca-plano-nacional-para-orientar-uso-de-ia-na-advocacia (16/06/2026)
46. SIJUR, texto da recomendação: https://www.sijur.com.br/recomendacao-oab-inteligencia-artificial/
47. Players: Jusbrasil Pro https://jusbrasil.com.br/pro ; Jurinews https://jurinews.com.br/ia/jusbrasil-integra-ia-em-todos-os-planos-para-facilitar-o-acesso-dos-advogados-brasileiros-a-inteligencia-artificial ; Datahackers https://www.datahackers.news/p/como-usar-o-jusia-para-otimizar-seu-trabalho-jur-dico ; Turivius https://turivius.com ; Jusratio https://jusratio.com.br/ ; Jurídico AI https://juridico.ai/mcp ; Lexter https://lexter.ai/ ; Startupi https://startupi.com.br/lexter-ai-recebe-aporte/ ; Projuris https://www.projuris.com.br/adv/ ; Aurum https://www.aurum.com.br/astrea/planos-e-precos/ ; ADVBOX https://advbox.com.br/planos ; TR CoCounsel (busca) https://www.thomsonreuters.com.br/pt/sala-de-imprensa/tr-lanca-cocounsel-core-brasil.html (22/10/2025) ; Judit (busca) https://judit.io/blog/ia-dados-juridicos/mcp-para-agentes-juridicos-de-ia-juridica/ ; MinutaIA (busca) https://www.getdrio.com/mcp/br-com-minutaia-pesquisa-juridica ; Jurisprudências.ai (busca) https://skillsplayground.com/connectors/ai-jurisprudencias-case-law/
48. MCPs e PJe (busca): https://glama.ai/mcp/servers/ACARVALHOSP/cnj-processual ; https://glama.ai/mcp/servers/chapirousIA/pje-mcp-server ; https://github.com/ThalesRubiale/pje-ia ; https://glama.ai/mcp/servers/pdmtt/brlaw_mcp_server ; https://awesome.ecosyste.ms/projects/github.com%2Fmatematicsolutions%2Fbr-eli-mcp ; https://glama.ai/mcp/servers/awcl0berpl

### 7.4 Código lido (repositórios locais, só leitura)

49. WrapAdv `40cc26e`: `README.md`, `docs/arquitetura.md`, `src/permissoes/{politica,cartoes,settings,modos}.js`, `src/runner.js`, `src/claude-args.js`, `bin/hooks/{guarda-caso,guarda-mcp}.js`, `bin/permission-mcp.js`, `src/escritorio/{criar,cnj,varredura,incluidos,mencoes}.js` e `public/telas.js`.
50. assistente-juridico-claude `fed81c1` (v0.8.0): `README.md`, `ARQUITETURA.md`, `CHANGELOG.md`, `skills/{verificar-citacoes,anonimizar,consentimento,prazos,mapa-de-teses}/`, `scripts/lib/{julgados,citacoes,anonimizar,consentimento,calendario,prazos,injecao,comum}.js`, `scripts/guarda-sigilo.js`, `hooks/hooks.json` e `templates/escritorio/PECAS/modelos/termo-consentimento-ia.md`.
51. Plano: `/workspace/specs/casos-plano-v2.md`.
