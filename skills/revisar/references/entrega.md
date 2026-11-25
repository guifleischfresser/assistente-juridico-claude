# Conferências, pendências e premissas na entrega

Depois da saída específica do fluxo, feche a resposta ao advogado com as três listas abaixo. Use as evidências da tarefa atual e seja breve. Quando uma lista estiver vazia, escreva “Nenhum item.”.

- **Conferi** — diga o que foi checado e indique a fonte efetivamente consultada (arquivo e trecho, página ou evento, quando útil) ou o teste executado e seu resultado. Limite a afirmação ao alcance da conferência. Para citações, use a integração existente com `/verificar-citacoes`. A presença de uma fonte ou o resultado de `checar-peca.js` que indica fonte só permite registrar que há uma referência. Registre a conferência no original apenas se ele foi consultado e o ponto citado foi comparado com ele.
- **Não consegui conferir** — diga o que segue pendente e o que faltou para verificar. Inclua citações com fonte cujo original ainda precisa ser conferido, indicando a fonte disponível. Preserve os marcadores aplicáveis do fluxo, como `[PREENCHER]`, `[NÃO VERIFICADO]` e `[A VERIFICAR]`.
- **Assumi** — declare cada premissa adotada provisoriamente e onde ela afeta a entrega. Se uma premissa também decorre de algo sem conferência, descreva a lacuna em **Não consegui conferir** e a hipótese usada em **Assumi**, destacando o ponto apenas uma vez.

Escolha até três pontos distintos somando **Não consegui conferir** e **Assumi**, pelo impacto provável caso estejam errados. Considere consequências concretas para o prazo, o pedido, a prova, a estratégia ou o valor em jogo. Marque os itens nas próprias listas com **Prioridade 1**, **Prioridade 2** e **Prioridade 3**, conforme a ordem de impacto entre as duas listas. Em cada destaque, indique a consequência e o próximo passo de validação. Se houver menos de três pontos, destaque apenas os existentes.

Mantenha os dados do cliente no caso correspondente, com os marcadores de anonimização aplicáveis. O resumo pertence à resposta de entrega. Não o persista em memória automática, em `MEMORIA/` ou no `CLAUDE.md` global. Use rede ou nuvem somente mediante pedido explícito do usuário e respeite as restrições do fluxo.

## Exemplos sintéticos

### Minuta de recurso

**Conferi**
- O pedido de reforma corresponde ao capítulo impugnado na sentença, evento 12.

**Não consegui conferir**
- **Prioridade 1** — Data da intimação `[PREENCHER]`. A certidão não está nos autos disponíveis. Uma data incorreta pode levar ao protocolo fora do prazo. Consulte a certidão no evento de intimação e recalcule o prazo.
- **Prioridade 3** — O precedente consta de uma ficha em `WIKI/paginas/`, mas o inteiro teor não está disponível no acervo local. A tese pode depender de uma distinção omitida na ficha. Compare o fundamento citado com o inteiro teor pelo fluxo de `/verificar-citacoes`.
- Referência ao comprovante de remessa `[PREENCHER]`. Falta a numeração da página no índice dos autos.

**Assumi**
- **Prioridade 2** — A minuta impugna apenas o capítulo sobre a multa. Se o recurso também tiver de abranger o principal, a minuta deixará esse capítulo sem impugnação. Confirme a extensão do recurso com o advogado.

### Revisão de petição inicial

**Conferi**
- As parcelas do pedido principal somam o valor indicado na minuta. Refiz a soma com os valores da tabela anexa.

**Não consegui conferir**
- **Prioridade 1** — Poderes do signatário. A procuração não acompanhou os arquivos da revisão. A representação irregular pode exigir regularização. Compare a procuração assinada com a identificação do signatário.

**Assumi**
- Nenhum item.

### Análise de defesa

**Conferi**
- Os pedidos de multa e restituição constam da inicial, seção “Pedidos”, e aparecem no quadro de exposição.

**Não consegui conferir**
- **Prioridade 2** — A quitação alegada está sem recibo no dossiê. Sem prova do pagamento, a defesa pode falhar quanto à restituição. Localize o recibo e compare valor e beneficiário com o pedido.

**Assumi**
- **Prioridade 1** — A exposição soma os dois pedidos sob a hipótese de cumulação. Se forem alternativos, o total estimado superará a exposição do caso. Confirme a relação entre os pedidos lendo o fecho da inicial em conjunto com a fundamentação.
