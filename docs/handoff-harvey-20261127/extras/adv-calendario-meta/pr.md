## v0.7.0: calendário forense local (feriados e suspensões por tribunal e comarca)

Este PR fecha o **item 6 do Roadmap** (ARQUITETURA.md §16, que agora vira §17). Tudo roda no computador do advogado, sem rede. O PR não faz merge, tag nem release.

### O que o advogado vê
- **O prazo é calculado com o calendário do caso.** Cada caso guarda o tribunal e a comarca no DOSSIE.md (`processo.js foro "<caso>" --tribunal TJPR --comarca Curitiba`). Uma resposta típica: *"Prazo de 15 dias úteis no TJPR, comarca de Curitiba: vence 13/11/2026 (considerei a suspensão de 04 a 06/11, Portaria nº …)"*. Cada data local usada aparece com motivo e fonte.
- **`/prazos feriado` e `/prazos suspensao` cadastram datas no calendário.** A data pode ser única ou um período, e pode repetir todo ano. O alcance pode ser global, um tribunal ou uma comarca. Os tipos são feriado, suspensão e indisponibilidade do sistema, e o advogado informa motivo e **fonte** (lei, portaria ou link). Um feriado de Curitiba não afeta Londrina.
- **Os prazos afetados aparecem antes de qualquer mudança.** Ao cadastrar ou remover uma data, o assistente lista os prazos que mudam de vencimento (**antes → depois**) e pergunta se pode atualizar. O `PRAZOS.md` só muda com `--confirmar`, depois do "sim", e uma cópia vai para `_versoes/`. Se um prazo ficar mais curto, ele aparece como 🔴 **ANTECIPA**.
- **Vencimento em dia sem expediente passa para o próximo dia útil** (CPC art. 224 §1º). Isso vale para feriado, suspensão ou indisponibilidade. Dias dentro de uma suspensão não contam. As regras de rito continuam iguais e o aviso de JEC, trabalhista e penal (penal conta dias corridos) continua.
- **Datas sem fonte ficam marcadas.** O cadastro sem fonte é recusado. Só com `--sem-fonte` a data entra como **[SEM FONTE]**, e todo cálculo que a usa avisa "⚠️ considerei … [SEM FONTE] — confirme".
- **A barra de status e o início da conversa mostram o próximo prazo com a data certa**, por exemplo "⏰ prazo em 3 dias úteis (03/11): …". Quando falta recalcular algum prazo, o início da conversa avisa.
- **O `/doutor` mostra o calendário:** "Calendário forense: N entrada(s) (X sem fonte)". Se o arquivo estiver ilegível, o doutor avisa e oferece conserto.

### Técnico
- Novo `scripts/lib/calendario.js`. Os dados ficam em `~/.claude/advogado/calendario.json`, com formato versionado. Nomes de tribunal e comarca são comparados sem acento nem maiúsculas.
- **Nenhuma lista de feriados estaduais ou municipais vem embutida.** A semente está vazia: só os feriados nacionais e o recesso do art. 220 já vinham no código.
- **`feriadosExtras` continua funcionando.** As datas migram para entradas globais `[SEM FONTE]` sem perder nada. A migração pode rodar várias vezes sem duplicar, e o `config.json` não muda.
- **Os dados do advogado ficam.** Reinstalar não apaga o `calendario.json` e desinstalar o preserva.
- **Não há script novo.** Tudo é o subcomando `prazos.js calendario …`, coberto pela regra de permissão estreita que já existia (um teste confere).
- `lib/prazos.js` mantém as assinaturas antigas e só ganhou um parâmetro opcional de calendário.
- Prazos cadastrados pelo cálculo guardam `[cálculo: DD/MM/AAAA + N dias úteis]` na coluna Origem, para serem recontados depois. Linhas antigas, sem esse dado, só podem receber a prorrogação do art. 224 §1º, e a saída diz isso.

### Contexto fixo das skills (`node scripts/manutencao.js medir --pasta skills`)
| | antes (v0.6.0) | depois |
|---|---|---|
| Total do contexto fixo | **3.543** caracteres | **3.539** caracteres (-4) |
| Descrição de `/prazos` | 171 | 167 |

Os detalhes ficam em `skills/prazos/references/calendario.md` e só são lidos quando a skill é usada. (Os documentos da v0.5 falavam em 3.496, mas a medição em `main` hoje dá 3.543; tomei esse número como base.)

### Testes
Os testes novos estão em `testes/rodar-testes.js`, §12f, e cobrem:
- feriado municipal que vale só para a comarca certa;
- suspensão de um período;
- vencimento que cai em suspensão e é prorrogado;
- migração de `feriadosExtras`;
- recálculo que lista os prazos afetados e não grava nada antes de `--confirmar`;
- data sem fonte sinalizada;
- statusline, doutor, reinstalação e desinstalação.

Rodado localmente no Linux: `rodar-testes.js` 276 ok, `sincronizar-bootstrap.js --verificar` ok, `simular-bootstrap.js --shell bash` 28 ok.
