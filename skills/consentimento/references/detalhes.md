# Consentimento do cliente — detalhes

## Onde fica e por quê
- `<caso>/_consentimento/registro.json` — **só na pasta do caso**, nunca global, nunca na nuvem, sem rede. Junto com o termo gerado (`termo-consentimento-ia-AAAA-MM-DD.md`).
- Arquivo próprio (e não uma linha no DOSSIE.md) porque o histórico precisa ser intocável: o DOSSIE é editado pelo advogado e pelo assistente a toda hora (e sai com marcadores quando o caso está anonimizado), enquanto o registro só cresce e só é gravado pelo `consentimento.js`. A guarda de escrita recusa editar o registro à mão e recusa copiar o conteúdo dele para outro arquivo.

## Eventos (o histórico só cresce)
| Evento | Campos |
|---|---|
| `registro` | `data` (dia local), `quem` (cliente/representante), `nome` (do DOSSIE), `autorizou` {`usoIA`, `envioDocumentos`, `anonimizacaoObrigatoria`}, `forma` (escrito/email/verbal), `comprovante` (caminho relativo ao caso ou vazio), `observacao` |
| `revogacao` | `data`, `forma`, `comprovante`, `observacao` |
| `modelo` | `data`, `arquivo` (termo gerado) |

A situação é o último `registro`/`revogacao`: **autorizado**, **não autorizado** (`--ia nao`), **revogado**, **sem registro** ou **ilegível** (arquivo estragado: o script não grava por cima e pede para o advogado conferir).

## Opções do `registrar`
- `--forma escrito|email|verbal` (obrigatória; aceita "por escrito", "e-mail", "oral").
- `--data DD/MM/AAAA` (padrão hoje; "ontem" também vale; data futura é recusada).
- `--quem cliente|representante`; o nome vem do DOSSIE (`Cliente:` / `Representante:`). `--nome "…"` só quando o dossiê não tiver (o nome passa pela conversa: avise).
- `--ia sim|nao`, `--documentos sim|nao` (envio de documentos ao Claude), `--anonimizacao obrigatoria|opcional`.
- `--comprovante <arquivo>`: precisa existir e estar **dentro da pasta do caso** (senão o script pede para copiar o arquivo para lá).
- `--obs "…"`: observação curta.

## Avisos (nunca travam o trabalho)
- **Sem registro**: sugere registrar ou gerar o termo.
- **Revogado / não autorizado**: "o cliente revogou a autorização de uso de IA neste caso" e sugere parar de enviar documentos ou ligar `/anonimizar`.
- **Anonimização obrigatória e desligada**: pede para ligar antes de ler documentos.
- **Sem envio de documentos**: trabalhar só com o que o advogado escrever.
- Onde aparecem: `/processo abrir` (sempre), início da conversa já vinculada ao caso (uma vez por conversa), `checar-peca` em peça do caso e contagem no doutor.

## Limites
- É um registro de apoio: não substitui o contrato de honorários nem a análise do advogado sobre a LGPD e a Recomendação CFOAB nº 001/2024.
- Os avisos não bloqueiam nada; quem decide seguir é o advogado.
- O nome de quem autorizou fica no registro (dentro do caso). Em caso anonimizado, o script não mostra o nome.
