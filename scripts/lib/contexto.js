'use strict';
// Percentual de uso da janela de contexto. Hooks nao recebem esse numero; a statusline recebe
// (context_window.used_percentage) e o grava em estado/contexto-<sessao>.json. Fallback: ler o
// "usage" da ultima resposta no transcript local.
const fs = require('fs');
const path = require('path');
const c = require('./comum');

function arqContexto(id) { return path.join(c.P.estado, 'contexto-' + String(id || 'sem-id').replace(/[^\w.-]/g, '_') + '.json'); }

function gravarContexto(id, pct, tamanho) {
  try { c.gravarJSON(arqContexto(id), { pct, tamanho, ts: Date.now() }); } catch (e) { /* ignora */ }
}

function pctDoTranscript(transcript, tamanhoJanela) {
  try {
    const st = fs.statSync(transcript);
    const n = Math.min(st.size, 400000);
    const fd = fs.openSync(transcript, 'r'); const buf = Buffer.alloc(n);
    fs.readSync(fd, buf, 0, n, st.size - n); fs.closeSync(fd);
    const linhas = buf.toString('utf8').split('\n').reverse();
    for (const l of linhas) {
      if (!l.includes('"usage"')) continue;
      try {
        const o = JSON.parse(l); const u = (o.message && o.message.usage) || o.usage;
        if (!u) continue;
        const tok = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
        return Math.round((tok / (tamanhoJanela || 200000)) * 100);
      } catch (e) { /* linha cortada */ }
    }
  } catch (e) { /* sem transcript */ }
  return null;
}

/** Retorna {pct, fonte} ou {pct:null}. */
function usoContexto(ent) {
  const reg = c.lerJSON(arqContexto(ent.session_id), null);
  if (reg && typeof reg.pct === 'number' && Date.now() - reg.ts < 15 * 60e3) return { pct: reg.pct, fonte: 'statusline' };
  const p = ent.transcript_path ? pctDoTranscript(ent.transcript_path, reg && reg.tamanho) : null;
  return { pct: p, fonte: p == null ? null : 'transcript' };
}
module.exports = { usoContexto, gravarContexto, pctDoTranscript };
