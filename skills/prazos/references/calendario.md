# Calendário forense local (feriados e suspensões por tribunal/comarca)

Tudo fica no computador do advogado, em `~/.claude/advogado/calendario.json`. O assistente **não traz lista pronta** de feriados estaduais/municipais: cada data é cadastrada pelo advogado, com a fonte. Feriados nacionais (inclusive Carnaval, Cinzas, Sexta Santa e Corpus Christi) e o recesso de 20/12 a 20/01 (CPC art. 220) já estão embutidos.

`PZ` = `node "$HOME/.claude/advogado/scripts/prazos.js"`

## Cadastrar
1. Pergunte, uma coisa por vez: o tipo (feriado, suspensão de prazos ou indisponibilidade do sistema), a data ou o período, onde vale (tribunal, comarca ou os dois), o motivo e a **fonte**.
2. Rode (exemplos):
   - Suspensão de um período no tribunal todo:
     `PZ calendario adicionar --tipo suspensao --de 04/11/2026 --ate 06/11/2026 --tribunal TJPR --motivo "Indisponibilidade do sistema" --fonte "Portaria nº …/2026"`
   - Feriado municipal (só aquela comarca), todo ano:
     `PZ calendario adicionar --tipo feriado --data 08/09 --recorrente --tribunal TJPR --comarca Curitiba --motivo "Feriado municipal …" --fonte "Lei municipal nº …"`
   - Indisponibilidade num dia: `--tipo indisponibilidade --data 13/11/2026 …`
   - Vale para todos os tribunais: `--global` no lugar de `--tribunal/--comarca`.
3. **Fonte é obrigatória.** Sem fonte o script recusa. Só se o advogado insistir, use `--sem-fonte`: a data fica marcada **[SEM FONTE]** e todo cálculo avisa "⚠️ considerei … [SEM FONTE] — confirme". Nunca invente número de lei ou portaria.
4. O script **grava a data no calendário na hora** e mostra, em modo **SIMULAÇÃO**, os prazos do `PRAZOS.md` que mudam de vencimento (antes → depois). O `PRAZOS.md` **não** é alterado nesse passo.
5. Mostre a lista ao advogado e pergunte se pode atualizar. Só depois do "sim", rode **o mesmo comando** com `--confirmar` (não duplica a data; reescreve os vencimentos, com cópia em `_versoes/`). Atualize também o DOSSIE.md dos casos afetados. 🔴 "ANTECIPA" = o prazo ficou mais curto: avise com destaque.

## Como cada prazo é reavaliado
- Linha com `[cálculo: DD/MM/AAAA + N dias úteis]` na origem: o prazo é **recontado** com o calendário do caso.
- Linha sem esses dados: só dá para aplicar a **prorrogação do art. 224 §1º** (vencimento que cai em feriado, suspensão ou indisponibilidade passa para o primeiro dia útil seguinte). Diga isso ao advogado e, se ele souber a data da intimação e o número de dias, refaça a linha pelo **calcular**.
- Durante suspensão os dias não contam. Regras de rito não mudam (penal conta dias corridos: não use o script).

## Onde cada data vale
- `--global`: todos os tribunais e comarcas.
- Só `--tribunal TJPR`: todas as comarcas do TJPR.
- `--comarca Curitiba` (com ou sem tribunal): só Curitiba — feriado de Curitiba **não** afeta Londrina.
- Nomes são comparados sem acento nem maiúsculas ("Comarca de São José" = "sao jose"; "TJ-PR" = "TJPR").
- O foro de cada caso fica no DOSSIE.md (linha `Tribunal: … · Comarca: …`), gravado com `processo.js foro "<caso>" --tribunal … --comarca …`. O `PRAZOS.md` acha o caso pelo nome da coluna Caso.

## Outros comandos
- `PZ calendario listar` — todas as datas, com id e fonte.
- `PZ calendario ver --caso "<caso>"` (ou `--tribunal/--comarca`, `--ano AAAA`) — calendário ativo daquele foro.
- `PZ calendario remover <id>` — tira a data (cópia em `calendario-versoes/`) e mostra os prazos que mudariam; para reescrever, `PZ calendario recalcular` e, depois do "sim", `--confirmar`.
- `PZ util DD/MM/AAAA --caso "<caso>"` — diz se o dia é útil e por quê.
- Datas antigas de `feriadosExtras` (config.json) viram entradas globais [SEM FONTE] sozinhas (o config é mantido). Peça a fonte ao advogado quando aparecerem.
