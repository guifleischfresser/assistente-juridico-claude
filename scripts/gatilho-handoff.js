#!/usr/bin/env node
'use strict';
// Hook Stop: regra dos 75%. Quando o contexto passa do limite, impede o Claude de parar e o
// re-instrui com "⚠️ HANDOFF AUTOMATICO" para salvar o estado (caso + espelho em HANDOFFS/).
// Dispara de novo apenas se o uso subir mais 10 pontos. Respeita stop_hook_active (sem laco).
const c = require('./lib/comum');
const { usoContexto } = require('./lib/contexto');

c.rodarHook('gatilho-handoff', (ent) => {
  if (ent.stop_hook_active) return {};
  const cfg = c.config();
  const { pct } = usoContexto(ent);
  if (pct == null || pct < cfg.limiteContexto) return {};
  const s = c.lerSessao(ent.session_id);
  if (s.ultimoHandoffPct && pct < s.ultimoHandoffPct + 10) return {};
  s.ultimoHandoffPct = pct; s.handoffs = (s.handoffs || []).concat([{ ts: Date.now(), pct }]);
  c.gravarSessao(ent.session_id, s);
  c.log('handoff', 'disparado em ' + pct + '% sessao ' + ent.session_id);
  return {
    decision: 'block',
    reason: '⚠️ HANDOFF AUTOMÁTICO — o contexto desta conversa está em ' + pct + '% (limite ' + cfg.limiteContexto + '%). ' +
      'Antes de encerrar a resposta, aplique a skill handoff: (1) escreva/atualize o HANDOFF.md na pasta do caso em andamento ' +
      '(ou no ESCRITORIO, se não houver caso) e a cópia-espelho em HANDOFFS/AAAA-MM-DD_HHMM_assunto.md; ' +
      '(2) atualize PRAZOS.md se surgiu prazo novo; (3) registre aprendizados de estilo/preferências no lugar certo; ' +
      '(4) diga ao usuário, em português simples, que tudo foi salvo e que ele pode digitar /clear para começar uma conversa nova e leve, ' +
      'e que o assistente vai retomar de onde parou.',
  };
});
