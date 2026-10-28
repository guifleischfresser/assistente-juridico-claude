#!/usr/bin/env node
'use strict';
// Linha de status em portugues: caso atual | memoria da conversa (contexto) | proximo prazo | modelo.
// Tambem grava o % de contexto para os hooks (monitor de contexto e gatilho de handoff).
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const { gravarContexto } = require('./lib/contexto');
const pz = require('./lib/prazos');

c.lerEntrada().then((e) => {
  try {
    const cfg = c.config();
    const cw = e.context_window || {};
    const pct = cw.used_percentage == null ? null : Math.round(cw.used_percentage);
    if (pct != null) gravarContexto(e.session_id, pct, cw.context_window_size);
    const cor = (n, s) => '\x1b[' + n + 'm' + s + '\x1b[0m';
    const partes = [];
    partes.push('⚖️ ' + (cfg.nomeCurto || 'Escritório'));

    const dir = (e.workspace && e.workspace.current_dir) || e.cwd || process.cwd();
    const casos = path.join(cfg.escritorio, 'CASOS');
    if (c.dentroDe(dir, casos)) {
      const rel = path.relative(casos, dir).split(/[\\/]/);
      partes.push('📁 ' + (rel[1] ? rel[1].replace(/^\d{4}[-_]/, '').replace(/[-_]+/g, ' ') + ' (' + rel[0] + ')' : rel[0]));
    } else if (c.dentroDe(dir, cfg.escritorio)) partes.push('📁 ESCRITÓRIO');

    if (pct != null) {
      const cheio = Math.min(10, Math.round(pct / 10));
      const barra = '▓'.repeat(cheio) + '░'.repeat(10 - cheio);
      const n = pct >= cfg.limiteContexto ? 31 : pct >= cfg.limiteContexto - 15 ? 33 : 32;
      partes.push(cor(n, '🧠 memória ' + pct + '% ' + barra + (pct >= cfg.limiteContexto ? ' → hora do handoff' : '')));
    }

    // v0.7: vencimento com o calendario forense do caso (tribunal/comarca) e a prorrogacao do art. 224 par. 1o.
    // O cache cai sozinho quando PRAZOS.md ou calendario.json mudam, e na virada do dia LOCAL (nao UTC).
    const cache = path.join(c.P.estado, 'prazo-cache.json');
    const arqPz = path.join(cfg.escritorio, 'PRAZOS.md');
    const mt = (f) => { try { return fs.statSync(f).mtimeMs; } catch (er) { return 0; } };
    const chave = mt(arqPz) + '|' + mt(require('./lib/calendario').arquivo()) + '|' + pz.iso(pz.hojeLocal());
    let prox = c.lerJSON(cache, null);
    if (!prox || Date.now() - prox.ts > 120000 || prox.chave !== chave) {
      const itens = require('./lib/calendario').avaliarPrazos(pz.lerPrazos(arqPz), { cfg }).sort((a, b) => a.efetivo - b.efetivo);
      const i = itens[0];
      prox = { ts: Date.now(), chave, item: i ? { uteis: i.uteis, tarefa: i.tarefa, caso: i.caso, vencimento: pz.iso(i.efetivo) } : null };
      try { c.gravarJSON(cache, prox); } catch (er) { /* ignora */ }
    }
    if (prox.item) {
      const u = prox.item.uteis;
      const dm = prox.item.vencimento ? ' (' + prox.item.vencimento.slice(8, 10) + '/' + prox.item.vencimento.slice(5, 7) + ')' : '';
      const txt = (u < 0 ? 'PRAZO VENCIDO' : u === 0 ? 'prazo HOJE' : 'prazo em ' + u + (u > 1 ? ' dias úteis' : ' dia útil')) + dm;
      partes.push(cor(u <= 2 ? 31 : u <= 5 ? 33 : 32, '⏰ ' + txt + ': ' + String(prox.item.tarefa).slice(0, 30)));
    } else partes.push('⏰ sem prazos próximos');

    if (e.model && e.model.display_name) partes.push(cor(90, e.model.display_name));
    process.stdout.write(partes.join(' │ '));
  } catch (err) { c.log('erros', 'statusline: ' + err.message); process.stdout.write('⚖️ Advogado Claude'); }
});
