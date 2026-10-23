<!-- GERADO de INSTALAR.md por ferramentas/sincronizar-bootstrap.js. Não edite aqui. -->

## Etapa 2 — Verificar e descobrir o nome (sem perguntar, se possível)

1. Rode `DOUTOR`. `RESULTADO: TUDO CERTO` → rode `PE marcar verificacao`. Problemas → `DOUTOR --consertar` uma vez e `DOUTOR` de novo; se persistir, explique o item ❌ em linguagem simples e pare (a mesma frase retoma depois).
2. Rode `PE nome-sugerido`.
   - `NOME=` preenchido: rode `PE definir-nome "<NOME>"` e guarde para o resumo final ("Vou te chamar de <NOME>; para mudar, é só dizer *me chame de ...*"). **Não pergunte.**
   - `NOME=` vazio: faça a **única** pergunta desta etapa: "Como você prefere ser chamado(a)? (ex.: Dra. Ana)". Com a resposta, `PE definir-nome "<resposta>"`. Enquanto espera, não há nada a fazer; depois siga direto.

Até o Claude Code recarregar as skills, quando este roteiro mandar seguir uma skill, leia `~/.claude/skills/<nome>/SKILL.md` pelo shell (Regra 10) e siga-o.

## Etapa 3 — (automática) Nada a perguntar

A antiga entrevista de 10 perguntas não existe mais: as preferências são aprendidas com o uso (skill `reflexao`). Siga para a Etapa 4.

## Etapa 4 — Descoberta autônoma das pastas

1. Diga: "Agora vou procurar sozinho, só pelos nomes, onde ficam suas peças, modelos e casos." Rode `PE autopiloto`.
   - Varre localmente Documentos, Área de Trabalho, Downloads, OneDrive, Google Drive e Dropbox (só nomes), dá uma nota a cada pasta e **registra sozinho** as de alta confiança (apontamento, sem copiar): peças já escritas, modelos, casos ativos e controles de prazo.
   - Cria sozinho um **dossiê** por pasta de caso encontrada e copia até 10 peças para `ESTILO/amostras` (cópia local).
   - Repita ao usuário só o resumo impresso (tipos, pasta-mãe e quantidades).
2. Se a saída tiver **PERGUNTA ÚNICA**, mostre-a **exatamente como impressa, numa única mensagem** e espere. Depois:
   - "ok" (ou "pode", "sim", "tudo certo") → `PE resolver ok`
   - mudanças ("G3 não", "o G2 sim") → `PE resolver G3=nao G2=sim` (grupos não citados ficam com a sugestão).
   - Se a saída disser "Nenhuma dúvida", não pergunte nada.
3. Se o script falhar, **não** faça varredura por conta própria: siga sem pastas registradas e diga que dá para apontar pastas depois ("minhas petições ficam em ...").
4. Rode `PE marcar registro` e `PE marcar dossies` (se já marcados, nada muda).

## Etapa 5 — Aprender o estilo (automático)

Se houver arquivos em `ESCRITORIO/ESTILO/amostras`, diga "Vou ler algumas peças suas para aprender seu jeito de escrever." e siga a skill `aprender-meu-estilo`; ao terminar, `PE marcar estilo`. Sem amostras: `PE marcar estilo "sem amostras"` (o estilo será aprendido com as edições do usuário nas peças).

## Etapa 6 — Resumo "como usar" e primeiro HANDOFF

1. Rode `PE concluir` (grava o primeiro HANDOFF e marca a configuração como concluída).
2. Mostre o resumo em até 10 linhas, incluindo: o nome usado (e que pode mudar), o que foi registrado (tipos e pasta-mãe), e:
   > "Pronto! Daqui para frente é só conversar comigo. Eu aprendo sozinho com o seu jeito de trabalhar: crio habilidades para tarefas repetidas e guardo suas preferências (tudo no seu computador; dados de clientes só ficam na pasta de cada caso). Feche e abra o Claude Code para ativar os atalhos, o modo auto e a barra de status. Na próxima vez, abra o Claude Code na pasta ESCRITORIO."
3. No Windows, lembre que o atalho **Escritorio Claude** na Área de Trabalho abre o assistente na pasta certa.
4. Se esta conversa não estava no modo auto, diga: "Na próxima conversa o modo auto já vem ligado. Se o seu plano ou a sua empresa não permitirem o modo auto, tudo funciona igual; só vou te pedir licença umas vezes a mais. E se um dia algo sumir depois de uma atualização, eu te aviso logo no começo da conversa e digo como arrumar."
