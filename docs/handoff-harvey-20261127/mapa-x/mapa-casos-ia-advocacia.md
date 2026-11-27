# Mapa de casos reais de IA (e de Claude / Claude Code) na advocacia brasileira, com base em posts do X

*Levantamento feito em 16/10/2026 (horário de Brasília, BRT). Fonte principal: API do X (`search_posts_all`, `get_users_posts`, `get_posts_by_ids`, `get_users_by_usernames`, `search_news`). Foram cerca de 49 chamadas e 708 posts únicos coletados, quase todos de jan/2025 a out/2026. As datas estão em BRT. Engajamento: curt = curtidas, RT = reposts, resp = respostas, imp = impressões, conforme a API devolveu no momento da coleta. Todo post citado aqui foi devolvido pelas ferramentas. Os dados brutos estão em `raw/`, e o índice consolidado é `raw/_indice_consolidado_posts.json`.*

> **Ressalvas metodológicas**
> - A busca do X por relevância favorece posts com engajamento. Contas pequenas com casos reais podem ter ficado de fora.
> - Algumas contas de legaltech têm impressões muito altas para poucas curtidas. Exemplos: @rafaelobitten/@iajusbr, com 200k a 900k impressões e cerca de 50 a 180 curtidas, e @jusratio, com 359k impressões e 58 curtidas. Isso **sugere posts impulsionados (anúncio)**. Use as impressões com cautela.
> - @CarlosR26271158 e @CarlosRodr44314 têm **bio idêntica** e o mesmo link para o Jusratio. Parecem ser contas do mesmo fundador ou projeto, mas não confirmei.
> - Os nomes de modelos citados nos posts ("Opus 5.5", "Fable 5.1" etc.) foram reproduzidos como estão escritos.
> - O `search_news` do X trouxe quase só manchetes globais e recentes, com pouco conteúdo brasileiro. O X segue como a fonte primária. Usei WebSearch apenas para contextualizar normas (OAB e CNJ).

---

## 1. Resumo executivo

1. **O uso dominante ainda é o "chat + modelo de peça".** O padrão mais citado é: subir petições próprias como modelo, pedir que a IA "incorpore o estilo" e adaptar ao caso. @lfgomide é o maior difusor de prompts desse tipo, com posts de 100 a 1.700 curtidas.
2. **A alucinação de jurisprudência é o medo nº 1 e move o mercado.** Há muitos posts virais sobre multas e ofícios à OAB por julgado inventado. A resposta das legaltechs brasileiras são **conectores MCP de jurisprudência para Claude/ChatGPT**: Jusratio, IAJus, Cognitio e Precedentes. Advogados relatam usar Claude com esses conectores e conferir cada citação.
3. **Claude Code já aparece em escritórios reais, mas por advogados "técnicos".** Os casos encontrados: ferramenta local que reproduz conversas de WhatsApp exportadas e as transforma em prova documental (@igornicolodi1), sistema próprio de prazos/CRM que substitui software pago (@kurosawaadv, @gabriel_gfb92), dossiês em Markdown por cliente mantidos por uma *skill* (@iamleds), Claude Code integrado a jurisprudência durante a redação (@agiacomolli_) e MCP com autos do processo (@dr_eduserafim/Atende Direito).
4. **O formato *skill* começa a circular entre advogados.** Exemplos: skill de dossiê, skill de transcrição local com Whisper para audiências (@femarc0086), skill de pesquisa "dos tribunais superiores até o TJ local" (@marceloborsari) e skills de advocacia usadas por um leigo que ganhou dois processos (@glaubera).
5. **O Claude for Legal (Anthropic) foi notado, mas visto como "americano".** @rpjupiter detalhou que as skills foram calibradas para common law e contencioso corporativo dos EUA, e que falta o Código Civil, o CPC e a lógica do contencioso brasileiro. Há espaço claro para *skills* brasileiras.
6. **Limite de uso e custo de tokens com PDFs de autos é a dor prática mais repetida entre usuários de Claude.** "Pedi UMA petição e acabou o limite", "analisar um processo e um contrato acabou o plano PRO". A comunidade responde com dicas manuais: converter PDF para Markdown (markitdown), cortar anexos inúteis e evitar OCR.
7. **Sigilo, LGPD e prompt injection são preocupações crescentes.** Aparecem a Recomendação CFOAB 001/2024, a decisão de NY que negou sigilo a documentos feitos com Claude, o "Galileu" do TRT-8 e o OpenDetector OAB/Jusbrasil. Advogados já pedem auditoria de prompt injection nas peças da parte contrária.
8. **Codex compete diretamente com o Claude entre advogados mais avançados.** Vários migraram por causa de limites (@carloshsl_, @odilonoliveira). Para um assistente baseado em Claude Code, **previsibilidade de custo e eficiência com PDF** são diferenciais decisivos.

---

## 2. Casos de uso por categoria

### 2.1 Redação de peças (petições, réplicas, contrarrazões, HC)

| Autor | Data (BRT) | Resumo | Engajamento | Link |
|---|---|---|---|---|
| @lfgomide (advogado, RJ) | 08/10/2025 | Prompt: anexar petições próprias e pedir que a IA "analise e incorpore o estilo de escrita e técnica" antes de redigir. | 607 curt / 27 RT / 24k imp | https://x.com/lfgomide/status/1975902130742698450 |
| @lfgomide | 20/01/2026 | Prompt (Gemini) para petição que impugna laudo pericial. "Economizei algumas horas." | 430 curt / 33 RT / 30k imp | https://x.com/lfgomide/status/2013638618196177077 |
| @lfgomide | 15/05/2026 | Usar a IA como "advogado da outra parte" para apontar os pontos fracos da própria petição. | 382 curt / 19 RT / 36k imp | https://x.com/lfgomide/status/2055294836345909339 |
| @arielrocco | 27/08/2026 | Alerta: jogar os autos no Claude sem indicar tese e estratégia gera "petição porcaria e evidentemente elaborada por IA". | 2 curt | https://x.com/arielrocco/status/2093013985129836660 |
| @RafaelGuzzo3 | 16/10/2026 | Cenário: o criminalista sai da cadeia e pede o *habeas corpus* ao Claude pelo app, recebendo o rascunho no WhatsApp para aprovar. | recém-publicado | https://x.com/RafaelGuzzo3/status/2111197436987253064 |

Respostas à enquete de @tretasjuridicas, "o que você usa de IA na advocacia que faz você ganhar muito tempo?" (06/03/2026, 109 curt / 26 resp, https://x.com/tretasjuridicas/status/2030078325972951462):
- "Pet de juntada": https://x.com/EduBragaFilho/status/2030098457084461145
- "Manifestações intermediárias. Ajuda SUPER.": https://x.com/weslleyllimaa_/status/2030103066985279959
- "Desenvolver argumentos e levantar teses… quando coloco inicial e contestação, o agente aponta o que é incontroverso": https://x.com/vanessaglima_/status/2030242317785878645
- "Jurisprudência no JusIA e estrutura da inicial no GPT": https://x.com/jsslc27/status/2030237076638007671

### 2.2 Pesquisa de jurisprudência (e combate à alucinação)

| Autor | Data | Resumo | Engajamento | Link |
|---|---|---|---|---|
| @AdvTrib (Márcio Pinheiro, tributarista) | 17/05/2026 | Instalou o conector Jusratio no Claude e no Perplexity: "nunca vi esse nível de aplicação jurisprudencial… faço quase uma petição por dia". | 75 curt / 59k imp | https://x.com/AdvTrib/status/2056088645241577817 |
| @b_descalante | 19/06/2026 | Usa Jusratio com Claude, mas "valido e leio cada jurisprudência antes de incluir na petição… é o nome que vai no final da peça". | 2 curt | https://x.com/b_descalante/status/2068011873149104569 |
| @advgabrielval (advogado) | 25/05/2026 | Fluxo: Jusbrasil logado + Claude com permissão para controlar o Chrome, com a pesquisa de jurisprudência como tarefa logo após a análise da petição. | 2 curt / 317 imp | https://x.com/advgabrielval/status/2059095491992768982 |
| @CarlosR26271158 (Jusratio) | 05/06/2026 | Estudo próprio: 3 modelos, 36 perguntas, 2.248 citações conferidas. Em fio no mesmo dia, afirma resposta "útil e segura" de 16% sem conector contra 62% com Jusratio. Dado do próprio fornecedor. | 67 curt / 5k imp | https://x.com/CarlosR26271158/status/2062886003233157454 |
| @RealBernardoSC | 15/05/2026 | Relato negativo: num caso tributário a IA "inventou a solução… completamente errada com o CTN e a CRFB". | 5 curt / 7 resp | https://x.com/RealBernardoSC/status/2055459884779425861 |

Contexto viral sobre punições: @joaosenzi, "Advogado recebe MULTA… jurisprudências TODAS inventadas" (701 curt), https://x.com/joaosenzi/status/1897293527153041746; @tretasjuridicas, "a ementa informada na petição não existe" (61 curt), https://x.com/tretasjuridicas/status/2022534556729925837.

### 2.3 Análise de contratos e de documentos financeiros

| Autor | Data | Resumo | Engajamento | Link |
|---|---|---|---|---|
| @suzukjuts | 27/02/2026 | Claude analisou um contrato complexo, "discriminou todas as cláusulas e seus riscos… em tabela… com minutas de cláusulas". | 2 curt | https://x.com/suzukjuts/status/2027523859683914082 |
| @b_descalante | 28/02/2026 | Claude e Gemini interpretaram uma sentença reformada por acórdão junto com um contrato, aplicando critérios de correção monetária e juros. | 0 curt | https://x.com/b_descalante/status/2027746929296236980 |
| @marcusaraujobhz (advogado) | 05/03/2026 | Claude gratuito gerou parecer "em formato Word… quadro com dados das partes, Comarca, número do processo". | 203 curt / 12k imp | https://x.com/marcusaraujobhz/status/2029610584573178038 |
| @rpjupiter | 13/05/2026 | Crítica: a skill "Commercial" do Claude for Legal não cobre boa-fé objetiva (art. 422), onerosidade excessiva (art. 478) etc. O conselho é criar skill personalizada. | 385 imp | https://x.com/rpjupiter/status/2054396621916455255 |
| @fabioborgesia | 16/10/2026 | Divulga o "plugin Legal no Claude Code" para triagem de contratos. Post promocional. | 2 imp | https://x.com/fabioborgesia/status/2111110439903908074 |

### 2.4 Gestão de escritório, prazos e intimações

| Autor | Data | Resumo | Engajamento | Link |
|---|---|---|---|---|
| @kurosawaadv (advogado empresarial) | 02/12/2025 | "Cancelamos um serviço que gerenciava processos e prazos… estou desenvolvendo um próprio porque é mil vezes mais barato pagar o Claude Code." | 457 imp | https://x.com/kurosawaadv/status/1995840395931250692 |
| @gabriel_gfb92 | 04/10/2026 | "Montei meu site profissional com o Claude Code. Agora estou criando ferramenta própria de monitoramento de prazos… contratos e honorários." | 90 imp | https://x.com/gabriel_gfb92/status/2106793603251232879 |
| @advgabrielval | 11/06/2026 | "Dá pra programar com o Claude. Roda um script de Python todo dia, captura intimações e manda um email no layout do escritório." | 3 curt | https://x.com/advgabrielval/status/2065229368578691344 |
| @edmar_neto | 25/09/2026 | Digita o número do processo no chat. A IA acessa o PJe, baixa inicial e documentos, resume e busca jurisprudência, com a peça aberta ao lado para conferência. | 59 imp | https://x.com/edmar_neto/status/2103333866693890461 |
| @ranierimb1 (advogado/empresário) | 23/06/2026 | "Claude Cowork + JusIA + Gemini… menos de 500 reais por mês e produzem muito mais que uma equipe de 5-6 pessoas." | 400 imp | https://x.com/ranierimb1/status/2069417646303400090 |

### 2.5 Claude Code, automação, MCP e *skills*

| Autor | Data | Resumo | Engajamento | Link |
|---|---|---|---|---|
| @igornicolodi1 | 05/06/2026 | Com Claude Code, criou uma ferramenta HTML local que reproduz a conversa de WhatsApp exportada pelo cliente, transcreve áudios e gera relatório de prova. "O que me tomava horas agora leva segundos." | 6 curt / 538 imp | https://x.com/igornicolodi1/status/2063077466558648512 |
| @iamleds (advogado de trânsito) | 14/08/2026 | Implementou com Claude uma *skill* de **dossiês em Markdown por cliente**: resumo, documentos faltantes, próximos passos, teses. É a "memória do caso" legível por LLM. | 23 imp | https://x.com/iamleds/status/2088268004844859396 |
| @iamleds | 30/07/2026 | "Uso gdrive para as pastas dos clientes e Claude Code, Grok Build e outros para elaborar petições, contratos, controlar prazos." | 17 imp | https://x.com/iamleds/status/2082820754085740739 |
| @agiacomolli_ | 06/03/2026 | Integra conector de jurisprudência "no Claude Code para pesquisar jurisprudência durante a elaboração da peça". | 33 curt / 1,6k imp | https://x.com/agiacomolli_/status/2030105383994343469 |
| @dr_eduserafim (CEO Atende Direito) | 29/08/2026 | "O advogado do futuro não abre PDF. Ele abre o terminal." Atende Direito Sync conectado ao Claude Code via MCP para consultar o processo inteiro. Post de fornecedor. | 49 imp | https://x.com/dr_eduserafim/status/2093700212078305729 |
| @glaubera (leigo) | 12/10/2026 | "Usei o Claude com algumas skills de advocacia. Montei dois processos… entreguei pro meu adv mastigado, vencemos os 2." | 59 imp | https://x.com/glaubera/status/2109700267021103242 |
| @CarlosR26271158 | 06/04/2026 | Projeto "Ratio Escritório", escritório virtual multiagente: intake por perguntas, pesquisa por tese (inclusive contrária), redação por seção com fonte e **agente adversário** que ataca a peça. | 328 curt / 22 RT / 77k imp | https://x.com/CarlosR26271158/status/2041154896896946180 |

### 2.6 Estilo de escrita personalizado e banco de peças

| Autor | Data | Resumo | Engajamento | Link |
|---|---|---|---|---|
| @douglaxx (advogado autônomo, RJ) | 13/07/2026 | "Drive integrado com o Claude como banco de dados… impressionante a capacidade da IA de assimilar a sua escrita e estilo de formatação." | 72 imp | https://x.com/douglaxx/status/2076708565855650177 |
| @Sandravills | 27/08/2026 | "Treinando a IA para ser tão purista quanto eu… escrever do meu jeito, com as minhas teses e seguir o meu modelo de petição." | 7 curt | https://x.com/Sandravills/status/2093152636123889875 |
| @martins_piton (defensor público) | 01/06/2026 | Receita: subir 10 modelos de peça em PDF no Claude ou ChatGPT e configurar estilo da casa, vocabulário e jurisprudência preferida. | 23 imp | https://x.com/martins_piton/status/2061485736025571582 |
| @ViniWmp | 12/08/2026 | ChatGPT pago "bem treinado com meu estilo, meu histórico, peças". | 132 imp | https://x.com/ViniWmp/status/2087685573288837539 |
| @lfgomide | 06/11/2025 | Prompt: "Redija uma petição como este modelo (anexe), mas adapte para o caso…" | 283 curt / 9k imp | https://x.com/lfgomide/status/1986454921001029959 |

Contraponto: @odilonoliveira alerta que "kits de petição" geram "peças padronizadas, voz indistinguível e dependência de fornecedor", https://x.com/odilonoliveira/status/2089812830866341979. Também em junho de 2026 perguntou qual expressão "mais entrega" que uma petição foi escrita por IA: https://x.com/odilonoliveira/status/2061908301672005724.

### 2.7 Organização e leitura de autos, audiências e documentos

| Autor | Data | Resumo | Engajamento | Link |
|---|---|---|---|---|
| @femarc0086 (advogado) | 30/09/2026 | Audiência de 3h: *skill* no Claude para transcrição **local** com Whisper (sigilo e custo zero), depois NotebookLM para análise macro e Claude Projects por caso para refinar. | 144 imp | https://x.com/femarc0086/status/2105388171043455234 |
| @CarlosRodr44314 | 10/07/2026 | Conector local para PDFs de 2 mil páginas: divide página a página, indexa localmente e só envia ao chat os trechos relevantes. "Um processo de 2 mil páginas custa o mesmo que um de 20." | 221 curt / 22 RT / 29k imp | https://x.com/CarlosRodr44314/status/2075579473550770237 |
| @re_c4stello | 08/03/2026 | NotebookLM com os mp4 de cada depoimento: resumo mais transcrição literal por depoente. | 2 curt | https://x.com/re_c4stello/status/2030649048244387938 |
| @propatooo | 24/06/2026 | "O Claude escreveu um código em Python (eu nem vi)… comparamos 2 mil linhas de planilha" e resolveu um problema do escritório. | 70 imp | https://x.com/propatooo/status/2069820605344485408 |
| @carloshsl_ (advogado) | 07/07/2026 | Usa o Codex (concorrente) para "organizar minhas pastas, fazer petições, analisar decisões, tarefas automatizadas via Chrome". | 67 imp | https://x.com/carloshsl_/status/2074516093872361816 |

---

## 3. Pessoas e contas para acompanhar

| Conta | Perfil (bio do X) | Por que acompanhar |
|---|---|---|
| **@lfgomide**, Luiz Felipe Gomide | "Advogado underground desde 2006, entusiasta da IA" (3,7k seg.) | Maior volume de prompts práticos para petições, com alto engajamento. Termômetro do advogado médio. Ex.: https://x.com/lfgomide/status/1983614638853136688 (1.745 curt) |
| **@freitashebert_**, Hebert Freitas | Advogado criminalista, criador do Síntese Criminal e do **Habias** (9,5k seg.) | Usa chat e Claude Code com "redundância" (um modelo checa o outro) e constrói um agente de defesa criminal com acervo curado e link para cada julgado. https://x.com/freitashebert_/status/2052538240754717124 |
| **@CarlosR26271158** / **@CarlosRodr44314** (Jusratio) | "Transforme qualquer LLM genérico num especialista em direito" | Conector MCP de jurisprudência para Claude e ChatGPT, estudos sobre alucinação e conector local de PDF. São os que mais ensinam MCP para advogados. https://x.com/CarlosR26271158/status/2055386947309199549 (547 curt) |
| **@iamleds**, Lucas Eduardo | Advogado (trânsito), automatiza a operação com agentes | Caso mais próximo de um "assistente autônomo": dossiês, skills, Drive como base, acesso ao e-SAJ. https://x.com/iamleds/status/2088268004844859396 |
| **@odilonoliveira**, Odilon Jr | Criminalista em Campo Grande/MS, "IA aplicada à advocacia" | Visão crítica e metodológica ("IA first", riscos de padronização, prompt injection). Usa Claude Code e Codex. |
| **@martins_piton**, Marcelo Martins Piton | Defensor público, mestre e professor | Dicas curtas e notícias de regulação (OAB, CNJ, sigilo). https://x.com/martins_piton/status/2036171989774205189 |
| **@AdvDoHardware** | Advogado (7,7k seg.) | Voz influente que reclama de limites do Claude e critica petições mal feitas com IA. https://x.com/AdvDoHardware/status/2034003587785716041 |
| **@carloshsl_**, Henrique | Advogado | Mantém uma biblioteca aberta de 41 prompts jurídicos com "travas contra invenção", incluindo auditoria de prompt injection. https://x.com/carloshsl_/status/2059303572316078265 |
| **@pizaniadv**, Raphael Pizani | Advogado tributário em Salvador, "acervo de ferramentas jurídicas abertas" | Cognitio: 7 conectores (verificação de citação, cálculo Selic, DJEN/DataJud, auditoria lógica, detector de instruções ocultas). https://x.com/pizaniadv/status/2095636431624442083 |
| **@kurosawaadv** | Advogado empresarial | Desenvolve sistema próprio de prazos com Claude Code e usa o Codex como revisor. |
| **@dr_eduserafim**, Eduardo Serafim | CEO da @atendedireito, "aDEVogado" | Discurso "advogado no terminal" e MCP com autos. Público pequeno, mas tese próxima à de um assistente baseado em Claude Code. |
| **@rafaelobitten** / **@iajusbr** (IAJus) | Cientista de dados, formado em Direito | Plugin e conector MCP de pesquisa jurídica (afirma 32 milhões de decisões). Ressalva: impressões aparentemente impulsionadas. |
| **@tretasjuridicas** | Perfil de humor jurídico (38k seg.) | Enquetes geram respostas espontâneas de advogados sobre usos reais. |
| **@rpjupiter** | Entusiasta de IA e negócios | Melhor análise encontrada sobre a inadequação do Claude for Legal ao Brasil. |
| **@joaoli13**, João Lima | PhD em Direito e em Ciência da Informação | Visão acadêmica sobre IA jurídica e casos de petições com IA. |

---

## 4. Dores e desejos dos advogados (insumos para um assistente Claude Code autônomo para leigos em tecnologia)

**Dores (com evidência):**
1. **Medo de alucinação e da sanção que vem junto.** Multa por litigância de má-fé, ofício à OAB e perda de reputação ("é o nome que vai no final da peça"). Exemplos: @b_descalante, @joaosenzi, @martins_piton (TRT-2): https://x.com/martins_piton/status/2024108702811247001
2. **Limite de uso e custo imprevisível.** "Pedi UMA petição… acabou meu limite até às 20h" (@AdvDoHardware, 131 curt). "Analisar um processo e um contrato acabou o plano PRO" (@EauDeJordano, 233 curt, https://x.com/EauDeJordano/status/2102125104075354215). "56% do uso só para ajustes numa petição" (@marcusaraujobhz, 144 curt). "Limite acabou no meio do raciocínio": https://x.com/letrasnumerose_/status/2103203288254697868. Houve quem perdesse o prazo de memoriais: https://x.com/exchurchgurl/status/2103212914375049259
3. **PDFs de autos são pesados.** Há anexos duplicados, imagens escaneadas e brasões. Usuários ensinam truques manuais: markitdown/Markdown (https://x.com/edumtimbo/status/2102939615082717280), triagem prévia em outra IA (https://x.com/fi_del/status/2102934268683190769) e recusa do Claude com processo de 60 páginas (https://x.com/alyssondreyffus/status/2034007762187735237).
4. **Coleta manual de dados nos sistemas dos tribunais.** Baixar do PJe e colar na IA, o código de 6 dígitos do tribunal (dor citada por @aliaadgeorge) e hCaptcha que bloqueia a coleta de dados de clientes (@iamleds: https://x.com/iamleds/status/2102947249022267674).
5. **Qualidade "cara de IA".** Petições genéricas, sem tese, com emojis e prompt esquecido, que são alvo de críticas virais (@brunoadvba, 325 curt; @AdvDoHardware, 609 curt: https://x.com/AdvDoHardware/status/2034827678436458678).
6. **Sigilo e LGPD.** Inserir dados de cliente em IA gratuita (https://x.com/ORobertoDuarte/status/1929117154034770205). Decisão de NY: material produzido com Claude não teve sigilo reconhecido (https://x.com/martins_piton/status/2047730062418485373).
7. **Prompt injection em peças adversárias e em sistemas de tribunais.** Exemplos: https://x.com/lfgomide/status/2080056144496611440 (268 curt) e o caso Galileu/TRT-8 citado por @martins_piton.
8. **Curva de aprendizado e oferta de cursos de qualidade duvidosa.** https://x.com/rubiconiano/status/2043820564402380857. "A curva de aprendizagem de um Claude Code é grande": https://x.com/oelberdomingos/status/2057079229875982347
9. **Confiabilidade oscilante do modelo.** "O Claude Code tá lento e burro" (@freitashebert_, 57 curt). "Algo mudou e ele emburreceu": https://x.com/mbc1989adv/status/2103097716922372265
10. **Falta de ferramentas abertas para o Brasil.** "Tem pouco repo jurídico, o jeito é criar tudo": https://x.com/carloshsl_/status/2041335715628265480. "Estou pensando em fazer um 'Claude Code' jurídico… é isso que está faltando": https://x.com/juniorro16/status/1937269773165039730

**Desejos explícitos ou implícitos:**
- **Escrever "do meu jeito"**, com memória de estilo, teses e modelos do escritório.
- **Citações sempre com link para o inteiro teor** e verificação automática de existência e literalidade (Basanos/Cognitio, Jusratio).
- **Memória por caso**: dossiê, próximos passos, documentos faltantes (@iamleds).
- **Busca automática nos tribunais** (PJe, e-SAJ, eproc, DJEN) e alertas de intimação no layout do escritório.
- **Agente adversário** que ataca a própria peça antes do protocolo (@lfgomide, @CarlosR26271158, @vonealex).
- **Custo baixo e previsível**: "Claude Cowork + JusIA + Gemini < R$ 500/mês", "conector por 20 pila/mês".
- **Processamento local de dados sensíveis**, como a transcrição Whisper local de @femarc0086.

**Implicações de produto para um assistente Claude Code destinado a advogados não técnicos:**
1. Ingestão de autos com conversão PDF→texto/Markdown, deduplicação, descarte de imagens e um índice local, para gastar poucos tokens e manter o processo fora do contexto inteiro. Mostrar ao usuário uma estimativa de consumo antes de cada tarefa.
2. Pasta por cliente com `DOSSIE.md` atualizado automaticamente e um `ESTILO.md` do escritório gerado a partir de 5 a 10 peças reais.
3. Pesquisa de jurisprudência **somente** via conector MCP com fonte (Jusratio, IAJus, Cognitio ou base própria) e um verificador de citações que bloqueia a minuta quando a citação não é confirmada.
4. Etapa obrigatória de "revisor adversário" e checklist de qualidade: partes qualificadas, valor da causa, pedidos, ausência de emojis ou markdown, ausência de expressões típicas de IA.
5. Auditoria de prompt injection em documentos recebidos.
6. Modo sigilo: anonimização antes do envio, transcrição local e registro de consentimento do cliente (Recomendação CFOAB 001/2024).
7. Interface em linguagem natural, sem terminal visível, com *skills* prontas em português: inicial, réplica, contrarrazões, HC, juntada, manifestação, análise de contrato pelo Código Civil.

---

## 5. Lacunas e oportunidades

1. **Skills jurídicas brasileiras abertas.** Os pacotes oficiais (Claude for Legal) são EUA-cêntricos (@rpjupiter, @mends_alex: "Não cobre Brasil", https://x.com/mends_alex/status/2054532702921969779). Não encontrei um repositório popular de *skills* de contencioso brasileiro. É a maior lacuna observada.
2. **Claude Code "para leigos".** Os casos reais vêm de advogados com perfil técnico. Ninguém resolveu a experiência para o advogado comum sem terminal. Os que tentam (Atende Direito) têm alcance baixo no X.
3. **Integração com tribunais (PJe, e-SAJ, eproc, DJEN, DataJud).** É desejada e citada, mas ainda artesanal: scripts, controle do Chrome, captchas.
4. **Eficiência de tokens com autos.** Hoje é resolvida com truques compartilhados em respostas. Um pipeline embutido seria diferencial direto contra a migração para o Codex.
5. **Verificação de citações como etapa padrão.** Já existem peças (Cognitio/Basanos, Jusratio), mas não há um fluxo fim a fim dentro do editor do advogado.
6. **Pós-venda e atendimento ao cliente do escritório** (ex.: https://x.com/JP21108/status/2021396582281904582) e **relatórios ao cliente**. Aparecem pouco, sinal de oportunidade pouco explorada.
7. **Conformidade.** A Recomendação CFOAB 001/2024 (conformidade legal, sigilo, prática ética e comunicação ao cliente com consentimento escrito) e a Resolução CNJ 615/2025 (IA no Judiciário, supervisão humana) criam demanda por registro de uso de IA e termo de consentimento gerados automaticamente. Fontes de contexto: https://www.oab.org.br/noticia/62711/confira-versao-final-da-recomendacao-do-cfoab-sobre-o-uso-de-ia-na-pratica-juridica e https://atos.cnj.jus.br/atos/detalhar/6001
8. **Formação.** Há uma demanda alta ("qual IA usar?") atendida por cursos genéricos. Conteúdo prático sobre Claude Code e skills para advogados ainda é raro. Exemplo existente: lives "Claude para advocacia" do @professormazza, https://x.com/professormazza/status/2087900672024879201

---

## Anexo: arquivos brutos (`raw/`)
- `q00`–`q33_*.json`: buscas `search_posts_all` (a consulta está no nome do arquivo e nos metadados).
- `u01_perfis.json`: perfis das contas recorrentes. `u02`–`u04`: timelines de @iamleds, @CarlosR26271158 e @odilonoliveira.
- `p01_posts_chave_texto_completo.json`: texto integral (note_tweet) de 30 posts-chave.
- `n01`–`n03_*.json`: `search_news` (baixa aderência ao tema brasileiro).
- `_indice_consolidado_posts.json`: 708 posts únicos com data em BRT, métricas, URL e consulta de origem.
