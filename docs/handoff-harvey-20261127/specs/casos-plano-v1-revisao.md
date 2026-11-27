# Revisão do plano v1 (Mike Ross, 26/10/2026)

**Veredito: APROVADO, com os ajustes abaixo.** Liberada só a Fase 0. A Fase 1 em diante espera as respostas do Guilherme.

## Ajustes
1. **Modo padrão (conflita com preferência registrada).** No mod, o Guilherme pediu o modo auto como padrão. O plano usa `default` ("Perguntar antes de alterar"). Manter `default` como proposta, mas deixar isso como decisão dele (pergunta B). Ficar com um único ponto de configuração para trocar o padrão sem refatorar.
2. **Perguntas do §11.** Para ele, sobem só as 6 que bloqueiam (A–F abaixo). Nas outras, seguir o padrão recomendado no plano e deixar tudo configurável:
   - 3: mesma pasta ESCRITORIO do mod.
   - 4: lista do §2.1; bancário entra dentro de Consumidor/Cível por enquanto.
   - 5: as fases propostas.
   - 6: chat embutido, com terminal como opção secundária.
   - 9 e 10: pedir o arquivo e as pastas só na Fase 2.
   - 11: honorários com confirmação.
   - 12: anonimização na Fase 4.
   - 13: transcripts por 30 dias; conversas do app até o caso ser arquivado.
   - 14: perguntar na tela de backup.
   - 16: não mergear o wrap; copiar os módulos com nota de origem. A correção do modo `manual` no wrap entra em PR separado, sem merge.
   - 17: respondida — é a v0.7.0 que o próprio Claudeo está fazendo. Integrar quando sair, como função pura.
3. **Raiz padrão.** Se a pasta atual de clientes do Guilherme estiver em OneDrive/Drive, oferecer "Adotar no lugar" já na Fase 1 (só catalogar, sem mover). Hoje isso está na Fase 3, mas é o primeiro contato dele com o app.
4. **Visual.** Antes de fechar a Fase 1, anexar ao PR capturas de tela da Raiz, da Área, do Caso e da Conversa (claro, 1280px), para o Guilherme aprovar o visual sem precisar instalar.
5. **Fase 0.** Rodar local, sem criar repositório e sem PR. Entregar `docs/verificacao-cli.md` em `/workspace/specs/` e reportar.

## Perguntas que sobem para o Guilherme
- A. Nome: Escaninho, Casos, Gabinete ou Pasta do Cliente?
- B. Modo padrão do Claude no caso: perguntar antes de alterar ou auto (como no mod)?
- C. Repositório novo e privado (recomendado) ou dentro do claude-code-wrap?
- D. Onde fica hoje a pasta de clientes (caminho, e se está em OneDrive ou Drive)?
- E. Primeiro computador: Windows ou Mac? Outras pessoas vão usar?
- F. Plano do Claude e se o uso dos dados para treinamento está desligado.

PJe/DJEN fica fora da v1.
