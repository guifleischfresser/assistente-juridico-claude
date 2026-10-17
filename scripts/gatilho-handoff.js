#!/usr/bin/env node
'use strict';
// Hook Stop: regra dos 75%. Quando o contexto passa do limite, impede o Claude de parar e o
// re-instrui com "⚠️ HANDOFF AUTOMATICO" para salvar o estado (caso + espelho em HANDOFFS/).
// Dispara de novo apenas se o uso subir mais 10 pontos. Respeita stop_hook_active (sem laco).
// v0.3: tambem dispara a "🧠 REFLEXÃO AUTOMÁTICA" (memoria + skills) depois de N usos de ferramenta
// ou de uma peca escrita, no maximo uma vez a cada N usos.
const c = require('./lib/comum');
const { usoContexto } = require('./lib/contexto');

c.rodarHook('gatilho-handoff', (ent) => {
  if (ent.stop_hook_active) return {};
  const cfg = c.config();
  const { pct } = usoContexto(ent);
  if (pct == null || pct < cfg.limiteContexto) return reflexao(ent, cfg);
  const s = c.lerSessao(ent.session_id);
  if (s.ultimoHandoffPct && pct < s.ultimoHandoffPct + 10) return reflexao(ent, cfg);
  marcarReflexao(s);
  s.ultimoHandoffPct = pct; s.handoffs = (s.handoffs || []).concat([{ ts: Date.now(), pct }]);
  c.gravarSessao(ent.session_id, s);
  c.log('handoff', 'disparado em ' + pct + '% sessao ' + ent.session_id);
  return {
    decision: 'block',
    reason: '⚠️ HANDOFF AUTOMÁTICO — o contexto desta conversa está em ' + pct + '% (limite ' + cfg.limiteContexto + '%). ' +
      'Antes de encerrar a resposta, aplique a skill handoff: (1) escreva/atualize o HANDOFF.md na pasta do caso em andamento ' +
      '(ou no ESCRITORIO, se não houver caso) e a cópia-espelho em HANDOFFS/AAAA-MM-DD_HHMM_assunto.md; ' +
      '(2) atualize PRAZOS.md se surgiu prazo novo; (3) aplique também a skill reflexao (memória e skills, sem pedir aprovação); ' +
      '(4) diga ao usuário, em português simples, que tudo foi salvo e que ele pode digitar /clear para começar uma conversa nova e leve, ' +
      'e que o assistente vai retomar de onde parou.',
  };
});

const { PASSOS_REFLEXAO } = require('./gatilho-handoff-passos');
function marcarReflexao(s) { s.reflexaoEm = s.ferramentas || 0; s.pecasDesdeReflexao = 0; }
function reflexao(ent, cfg) {
  const s = c.lerSessao(ent.session_id);
  const desde = (s.ferramentas || 0) - (s.reflexaoEm || 0);
  const peca = (s.pecasDesdeReflexao || 0) > 0 && desde >= 8;
  if (desde < cfg.limites.reflexaoACada && !peca) return {};
  marcarReflexao(s);
  c.gravarSessao(ent.session_id, s);
  let resumo = '';
  try { const m = require('./memoria'); resumo = m.resumoReflexao(m.reflexao({ automatica: true })); } catch (e) { c.log('erros', 'reflexao stop: ' + e.message); }
  c.log('reflexao', 'stop sessao ' + ent.session_id + ' (' + desde + ' ferramentas' + (peca ? ', peça escrita' : '') + ')');
  return { decision: 'block', reason: '🧠 REFLEXÃO AUTOMÁTICA (' + (peca ? 'peça escrita' : desde + ' ações') + ' desde a última). ' + (resumo ? 'Parte automática já feita: ' + resumo + '. ' : '') + PASSOS_REFLEXAO };
}
