# Anonimização — detalhes

## Marcadores (estáveis por caso)
| Dado | Marcador | Como é achado |
|---|---|---|
| Nome de parte (pessoa ou empresa) | `[PARTE_A]`, `[PARTE_B]`… | DOSSIE (`Cliente:`, `Parte contrária:`, `Anonimizar também:`), `--nome`, e nos documentos: rótulo (`Autor:`, `Réu:`, `Requerente:`…), qualificação (`NOME, brasileiro…`) e sufixo de empresa (Ltda., S.A., S/A, EIRELI, ME, EPP) |
| CPF | `[CPF_1]` | com ou sem pontos (sem pontos só se o dígito verificador bater) |
| CNPJ | `[CNPJ_1]` | idem |
| Nº do processo (CNJ) | `[PROCESSO_1]` | formatado ou só os 20 dígitos |
| RG | `[RG_1]` | número depois de "RG" |
| E-mail / telefone | `[EMAIL_1]` / `[TELEFONE_1]` | telefone com DDD entre parênteses ou separado |
| Endereço / CEP | `[ENDERECO_1]` / `[CEP_1]` | "Rua/Av./Praça… , número"; CEP formatado ou depois de "CEP" |

- O mesmo dado recebe o mesmo marcador em todos os documentos do caso; casos diferentes têm tabelas separadas.
- Outra grafia do mesmo dado (MAIÚSCULAS, sem acento, CPF sem pontos) ganha sufixo: `[PARTE_A#2]`. É a mesma pessoa; a reversão devolve exatamente aquela grafia.
- Nomes são comparados sem acento e sem diferença de maiúsculas, inclusive com acentos gravados de outro jeito (macOS).

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
- A detecção de nomes é heurística: nome sozinho (só "Maria"), apelido, sobrenome solto ("o Sr. Silva"), nome no meio da frase sem qualificação e nomes de testemunhas podem escapar. Nome de juiz, advogado e tribunal não é trocado. O advogado revisa as cópias; o que escapou entra com `Anonimizar também:` no DOSSIE ou `--nome "Nome|Silva"` (variantes separadas por `|` viram a mesma parte).
- O nome da pasta do caso (ex.: `silva-x-banco`) continua aparecendo; escolha nomes neutros se isso importar.
- Leituras pelo terminal (cat, scripts) de arquivos originais não passam pela pergunta; só a pasta da tabela é bloqueada no terminal.
- O que o advogado escrever na conversa continua indo para a Anthropic, como sempre.
