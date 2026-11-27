Claudeo, nova demanda do Guilherme. Por enquanto é SÓ PLANEJAMENTO: rode o Claude Opus em modo de plano (sem gravar código, sem abrir PR) e me devolva o plano para eu aprovar, reprovar ou pedir ajustes. A execução só começa depois que eu aprovar o plano.

## Demanda
Um app local para o Guilherme usar como advogado, com o nome "Casos" ou "Clientes" (o Opus pode sugerir). Ele vai ser feito em HTML/JS e vai abrir o Claude Code dentro de cada cliente ou caso para ajudar no trabalho.

**Visual:** estilo Apple, minimalista, fundo branco, ilustrações bonitinhas.

**Estrutura:**
- Abre numa pasta raiz: uma página HTML branca com um ícone de pasta parecido com o do Windows Explorer, só que mais bonito.
- Dentro da raiz ficam subpastas que expandem, com clientes e casos divididos por área: trabalhista, cível e as outras áreas que o Opus julgar adequadas para um escritório brasileiro.
- O advogado vai abrindo as pastas até chegar no cliente ou no caso e, ali, abre o Claude para trabalhar naquele caso.

**Botão de Configurações:**
1. O advogado sobe os templates dele, e o app extrai sozinho os cabeçalhos e o jeito como ele escreve.
2. Se não tiver template, ele sobe um conjunto de pastas, e um agente do Claude gera um markdown de estilo de escrita. Esse markdown fica salvo para o Claude sempre escrever daquele jeito.

## O que o plano do Opus precisa conter
- Taxonomia das pastas: áreas e subníveis, de cliente para caso e de caso para peças, documentos, prazos etc.
- Telas e fluxo de navegação.
- Modelo de dados e onde ele fica guardado.
- O contexto que o Claude recebe em cada caso e o que ele pode ler e gravar.
- Como a parte de templates e estilo vai funcionar.
- Cuidados de sigilo e LGPD.
- Stack e como abrir o Claude Code a partir do app.
- Fases de entrega e critérios de aceite.

## Contexto útil (o Opus decide se usa)
- Já existe o repo privado `guifleischfresser/claude-code-wrap` (PR #1, ainda sem merge): um chat HTML local organizado por pasta que chama o Claude Code CLI, com modo auto e as permissões aparecendo como cards. Avaliar se vale reaproveitar.
- Existe também o mod `guifleischfresser/assistente-juridico-claude` (v0.6.0), com skills jurídicas, anti-texto oculto, checador de julgados e calendário forense em desenvolvimento.
- Regras fixas: rodar no Windows, macOS e Linux; servidor local, se houver, só em 127.0.0.1; nunca usar bypass de permissões por padrão; interface e README em pt-BR simples.

## Regras do processo
Agora é só o plano. Depois que eu aprovar, a execução sai em PR, e o merge só acontece com a aprovação do Guilherme nas palavras dele.
