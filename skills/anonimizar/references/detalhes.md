# Anonimização — detalhes

## Marcadores (estáveis por caso)
| Dado | Marcador | Como é achado |
|---|---|---|
| Nome de parte (pessoa ou empresa) | `[PARTE_A]`, `[PARTE_B]`… | DOSSIE (`Cliente:`, `Parte contrária:`, `Anonimizar também:`), `--nome`, e nos documentos: rótulo (`Autor:`, `Réu:`, `Requerente:`…), qualificação (`NOME, brasileiro…`), sufixo de empresa (Ltda., S.A., S/A, EIRELI, ME, EPP) e, sem rótulo, prenome + sobrenome do dicionário local (`scripts/lib/dados/`) |
| CPF | `[CPF_1]` | com ou sem pontos (sem pontos só se o dígito verificador bater) |
| CNPJ | `[CNPJ_1]` | idem |
| Nº do processo (CNJ) | `[PROCESSO_1]` | formatado ou só os 20 dígitos |
| RG | `[RG_1]` | número depois de "RG" |
| E-mail / telefone | `[EMAIL_1]` / `[TELEFONE_1]` | telefone com DDD entre parênteses ou separado |
| Endereço / CEP | `[ENDERECO_1]` / `[CEP_1]` | "Rua/Av./Praça… , número"; CEP formatado ou depois de "CEP" |

- O mesmo dado recebe o mesmo marcador em todos os documentos do caso; casos diferentes têm tabelas separadas.
- Outra grafia do mesmo dado (MAIÚSCULAS, sem acento, CPF sem pontos) ganha sufixo: `[PARTE_A#2]`. É a mesma pessoa; a reversão devolve exatamente aquela grafia.
- Nomes são comparados sem acento e sem diferença de maiúsculas, inclusive com acentos gravados de outro jeito (macOS).

## Nomes sem rótulo (dicionário local)
- "Conversei com Maria Aparecida Souza ontem" também vira marcador: o script reconhece **prenome conhecido + sobrenome conhecido** (Title Case ou CAIXA ALTA, na mesma linha) por um dicionário que vem no pacote (nada é baixado).
- Não troca: só o prenome ("Maria"), relator/ministro/desembargador/juiz ("Rel. Min. Nancy Andrighi", nomes dentro da citação de um REsp), "Lei Maria da Penha", lugares e logradouros ("São José", "Santa Catarina", "Rua João Silva"), o próprio advogado e o escritório.
- O script diz quantos nomes achou assim — "2 nome(s) achado(s) pelo dicionário — confira na cópia" — sem mostrar quais. Repita a frase e peça ao advogado para conferir na cópia. Se algum não era pessoa, ele pode rodar `ANZ aplicar "<caso>" --sem-dicionario` (volta ao comportamento antigo) ou corrigir à mão.
- `ANZ simular "<caso>"` mostra a contagem antes, sem gravar nada.

## Segunda passada com IA local (opcional: `--ia-local`)
- Só quando o advogado pede: `ANZ simular "<caso>" --ia-local` (e o mesmo em `preparar` e `aplicar`; `--modelo <nome>`, `--porta <n>` e `--host 127.0.0.1|::1` são opcionais). Sem a flag, nada muda.
- Primeiro rodam as regras de sempre (CPF, CNPJ, OAB, RG, telefone, e-mail, CEP, processo, dicionário). Depois um modelo do **Ollama deste computador** olha só o que sobrou, atrás de nomes sem rótulo, endereços e razões sociais. O texto real só vai para `127.0.0.1` (ou `::1`), nunca para a internet; qualquer outro endereço (variável `OLLAMA_HOST`, `--host`, redirecionamento) é recusado antes de abrir conexão. Nada é gravado em log.
- Para um modelo diferente do padrão (`qwen2.5:7b`) use `--modelo`; texto muito longo ou modelo lento: `ADVOGADO_IA_LOCAL_TIMEOUT_MS` (padrão 120000) aumenta a espera por pedido.
- Sem Ollama, parado ou sem o modelo: o script diz "IA local indisponível; usei só as regras. Para ligar: instale o Ollama e baixe um modelo." e segue só com as regras (código 0). Repita isso ao advogado em palavras simples. Se o texto for longo e o Ollama parar no meio (ou passar de ~120 mil caracteres), o aviso diz que a IA leu só parte do documento: o que ela achou até ali vale, o resto foi só pelas regras.
- A resposta do modelo não é confiável: só vale o que aparece escrito igual no texto, não é juiz, tribunal nem o próprio escritório e não mexe no que as regras já acharam. O que passa entra na tabela com `origem: "ia-local"` (um rótulo, o DOSSIE ou `--nome` confirmam).
- O resumo diz "N achado(s) pela IA local — confira a prévia" (só a contagem, nunca o nome). Peça ao advogado para revisar a prévia do `simular` e a cópia: o modelo erra para os dois lados.

## Onde fica cada coisa
- Tabela (dados reais): `<caso>/_anonimizacao/tabela.json` — só na pasta do caso, nunca global.
- Cópias anonimizadas: `<caso>/anonimizado/` (mesmo caminho do original; PDF/Word/página viram `.md`). O original não é tocado.
- Versão com dados reais: `<peça>-dados-reais.md`, ao lado da peça com marcadores (versão anterior vai para `_versoes/`).

## O que as guardas fazem (caso com anonimização LIGADA)
- Abrir um arquivo do caso fora de `anonimizado/` que tenha dado real (ou PDF/Word original): o Claude Code **pergunta** ao advogado. Se ele aceitar, vem um lembrete para continuar só com marcadores.
- Busca no conteúdo (Grep com trechos) que passa pelo caso fora das cópias: pergunta.
- A pasta `_anonimizacao/`: leitura, busca e comandos de terminal que a citem são **negados**; gravar nela, ou gravar o conteúdo da tabela em outro lugar, também.
- CLAUDE.md, skills, memória automática, `MEMORIA/` e perfil de escrita recusam qualquer dado real de caso anonimizado.
- `/processo` mostra o dossiê e o handoff já com marcadores. `checar-peca` conta os marcadores; `exportar-docx` recusa (código 2) se sobrar marcador — `--forcar` exporta com eles grifados.

## Limites (diga com franqueza)
- A detecção de nomes é heurística: nome sozinho (só "Maria"), apelido, sobrenome solto ("o Sr. Silva") e nome raro que não está no dicionário (prenome estrangeiro, sobrenome incomum — "Maria Souza Zwicker" pode virar "[PARTE_A] Zwicker") podem escapar; um doutrinador citado sem título pode virar marcador (a reversão devolve). Nome de juiz, advogado e tribunal não é trocado. O advogado revisa as cópias; o que escapou entra com `Anonimizar também:` no DOSSIE ou `--nome "Nome|Silva"` (variantes separadas por `|` viram a mesma parte).
- O nome da pasta do caso (ex.: `silva-x-banco`) continua aparecendo; escolha nomes neutros se isso importar.
- Leituras pelo terminal (cat, scripts) de arquivos originais não passam pela pergunta; só a pasta da tabela é bloqueada no terminal.
- O que o advogado escrever na conversa continua indo para a Anthropic, como sempre.
