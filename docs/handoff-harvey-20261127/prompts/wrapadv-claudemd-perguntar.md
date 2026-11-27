Você está no repositório guifleischfresser/wrapadv, branch feat/demo-pasta-raiz (PR #2, aberto). Trabalhe nesta branch, faça commit e push nela. NUNCA faça merge, tag ou release.

Pedido do Guilherme (dono do produto):
No teste do modo demo, o Claude de um caso redigiu uma petição de alienação de bem penhorado cheia de "[PREENCHER: ...]" e "[ESCOLHER UMA DAS OPÇÕES]" (Opção A/Opção B), deixando para o advogado completar. Ele quer que o CLAUDE.md que o WrapAdv gera/usa para os casos (veja src/escritorio/claudemd.js e onde mais o CLAUDE.md dos casos é montado, incluindo o modo demo) traga uma instrução clara e forte:

1. Antes de redigir qualquer peça ou documento, procurar ativamente os dados do caso: arquivos da pasta do caso (autos, movimentações, documentos, planilhas, peças anteriores, memória/anotações do caso) e as fontes autorizadas. Respeitar a regra existente: para olhar outro caso, pedir autorização antes, salvo se o advogado já mandou explicitamente.
2. Nunca entregar texto com placeholders ([PREENCHER], [inserir], XXX, "escolher uma das opções", colchetes a completar etc.).
3. Se faltar dado que não encontrou, ou se houver decisão a tomar (por exemplo, leilão ou iniciativa particular), PARAR e perguntar ao advogado ANTES de escrever: uma lista curta e numerada do que falta, dizendo onde já procurou, e a recomendação do Claude quando houver opções. Só redigir a peça completa depois das respostas. É um diálogo de ida e volta com o advogado.
4. Nunca inventar dados (partes, número dos autos, vara, valores, movimentações, datas, OAB). O que não está nos arquivos e o advogado não informou deve ser perguntado.
5. Vale igualmente no modo demo.

Escreva em pt-BR simples, no mesmo tom das regras já existentes no CLAUDE.md. Não remova as proteções atuais (documentos originais, provas e decisões protegidos contra alteração; regra de outros casos).

Extra (só se for simples e seguro): no demo, o Claude disse que não conseguia gerar o .docx timbrado porque o modo demo bloqueia gravação e o script da skill. Avalie permitir gravar saídas numa pasta de saída do próprio demo (ex.: dentro de ~/.wrapadv/demo-saida ou uma subpasta _wrapadv-saida explicitamente criada para isso), sem jamais escrever nas pastas reais do usuário mapeadas pelo demo. Se não for simples, não implemente; apenas documente em docs/demo.md e relate.

Adicione/atualize testes (node --test, pasta test/) que verifiquem que o CLAUDE.md gerado contém a regra de não usar placeholders e de perguntar antes. Rode `npm test` e `npm run lint` se existir; tudo precisa passar.

Commit em português (mensagem convencional, ex.: "feat(claudemd): pesquisar dados e perguntar antes de redigir, sem placeholders"), `git push origin feat/demo-pasta-raiz`, e comente no PR #2 com `gh pr comment 2` resumindo a mudança. Ao final, imprima: arquivos alterados, resultado dos testes, novo head (git rev-parse HEAD) e se o extra do .docx foi feito.
