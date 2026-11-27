/goal Implementar a integridade do núcleo do mod no repo guifleischfresser/assistente-juridico-claude (branch claude/diario-20261117, a partir de origin/main com #11–#14). O incidente que motiva isto: uma chave vazada permitiu publicar versões adulteradas de uma extensão. O objetivo é avisar o advogado, em pt-BR simples, quando um script, hook ou skill do núcleo for alterado fora do fluxo oficial (instalação, /consertar, atualização do plugin). Tudo local, sem rede.

Antes de codar, leia ARQUITETURA.md (§3, §13, §18b, §19) e o CHANGELOG (Unreleased) para não duplicar nada. Reuse o SHA-256 de scripts/lib/auditoria.js, o lib/diagnostico.js (avisoSessao), o doutor.js (pacote de reserva) e o copiarDir/MODO_PLUGIN do instalar.js.

Entregas:
1. scripts/lib/integridade.js (Node puro): gerarManifesto(raiz) e conferir() → {alterados, faltando, novos}. O núcleo é scripts/**, hooks/hooks.json, as skills do núcleo (mesma lista do instalador) e o bloco do mod no CLAUDE.md global. Ficam de fora auto-*, skills de terceiros, ESCRITORIO, CASOS, config, logs e _versoes.
2. Manifesto em ~/.claude/advogado/integridade.json {versao, geradoEm, arquivos}. Ele é gravado pelo instalar.js, pelo reparo do doutor --consertar e, no modo plugin, a partir da raiz do plugin. O ferramentas/empacotar.js embute o manifesto no zip, e o zip continua reprodutível (mesmo SHA em qualquer máquina).
3. scripts/integridade.js: conferir [--json] e aceitar --confirmo. O aceitar só regrava depois do "sim" explícito do advogado.
4. SessionStart, via lib/diagnostico: aviso uma vez por sessão, fail-open. Diz qual arquivo mudou, em linguagem leiga, e dá um único passo: "/consertar". O doutor ganha uma linha de integridade, e o reparo reinstala a partir do pacote local, com backup. Manifesto ausente ou corrompido gera aviso leve, nunca trava.
5. A guarda de escrita recusa editar o manifesto à mão. Adicionar a regra de permissão estreita para node "…/integridade.js *" no instalador e no modo plugin.
6. Docs: ARQUITETURA §21 (com ligação ao Roadmap item 3), CHANGELOG Unreleased, references da /consertar e uma linha na /ajuda. Nenhuma skill nova e nenhuma descrição sempre carregada alterada: o contexto fixo continua 3.869.

Restrições:
- Nenhuma chamada de rede ou nuvem.
- Nada de dado de cliente no manifesto ou nos avisos.
- Nunca sugerir --dangerously-skip-permissions nem bypassPermissions.
- Os hooks continuam fail-open.

Testes (seção nova 12p, sandbox próprio):
- instalação limpa = OK;
- script alterado, hook apagado e arquivo novo no núcleo = aviso;
- auto-* alterada = sem aviso;
- consertar regrava e o aviso some;
- aceitar sem --confirmo não grava;
- modo plugin;
- manifesto corrompido = fail-open;
- aviso só uma vez por sessão;
- guarda recusa edição manual;
- empacotar reprodutível com o manifesto.

Critério de pronto:
- node testes/rodar-testes.js verde;
- node ferramentas/sincronizar-bootstrap.js --verificar OK;
- simular-bootstrap (bash) OK;
- suíte verde com TZ=America/Sao_Paulo;
- commit e PR via gh (base main, descrição pt-BR com o que mudou, limites e como testar).

Proibido merge, tag ou release. Ao final, mostre o link do PR, a contagem de testes e um exemplo da mensagem que o advogado verá.
