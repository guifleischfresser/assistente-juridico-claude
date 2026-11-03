# Importar os valores da planilha de cálculo da inicial

Quando o advogado pedir "pega os valores da planilha do cálculo e põe no mapa de teses do caso X" (ou mandar a planilha anexa à inicial).

1. A planilha precisa estar **na pasta do caso** (por exemplo, `documentos/calculo-inicial.xlsx`). Se estiver em outro lugar (Downloads, e-mail, outro caso), peça para copiá-la para lá: o script recusa caminho fora da pasta do caso (código 2), como o comprovante do `/consentimento`.
2. **Não abra a planilha na conversa** (nem com Read nem convertendo): ela costuma ter nome, CPF e dados do cliente. Quem lê é o script, e ele só devolve os nomes dos pedidos (do próprio mapa) e os números. Nada da planilha vai para a memória, o DOSSIE ou outro arquivo.
3. Simule primeiro: `node "$S/mapa-teses.js" importar-valores "<caso ou mapa.md>" --planilha "<arquivo>" --simular`. Mostra a tabela **antes → depois** sem gravar. Aceita `.xlsx` (primeira aba; outra com `--aba "<nome ou nº>"`) e `.csv` (`;` ou `,`, decimal 1.234,56). `.xls` antigo e `.ods`: o script pede para salvar como `.xlsx` ou `.csv` — repasse ao advogado.
4. O script acha sozinho a coluna do pedido (Pedido, Verba, Rubrica, Descrição…) e a do valor (Valor, Total…). Se recusar (código 2) por não achar ou por haver mais de uma coluna de valor, pergunte ao advogado qual usar e rode com `--coluna-pedido <letra> --coluna-valor <letra>` (ou o nome exato do cabeçalho). Não escolha por ele.
5. Confirmado, rode sem `--simular`. Grava só a coluna **Valor** do quadro e recalcula o bloco resumo-risco (a mesma conta do `totalizar`); teses, precedentes e as marcas `[A VERIFICAR]`/`[CONFERIDO]` não mudam. A versão anterior vai para `_versoes/`.
6. Regras que o script segue (e que você não contorna):
   - casa pedido e linha pelo nome (sem acento, maiúsculas e pontuação; igual ou muito parecido). Ambíguo (duas linhas servem) ou sem casamento → **não altera** e lista no relatório;
   - valor vazio, zero, negativo ou em texto ("a apurar") → trata como ilíquido, **não altera** e avisa;
   - nunca inventa valor. Se o advogado quiser preencher um pedido que ficou de fora, ele diz o valor e você edita a célula.
7. Responda com a primeira linha da saída, em linguagem simples, por exemplo: "Peguei 6 valores da planilha calculo-inicial.xlsx e coloquei no mapa de teses do caso X. 1 pedido não achei na planilha (Danos morais) e ficou como estava. Total provável agora: R$ 52.140,00." Depois rode `validar` e ofereça `exportar` (Word).
8. Caso anonimizado (`/anonimizar`): o script avisa e mostra os pedidos com marcadores. Continue só com os marcadores; se o mapa de trabalho estiver em `anonimizado/`, passe esse arquivo.
