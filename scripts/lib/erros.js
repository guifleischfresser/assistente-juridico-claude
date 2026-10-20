'use strict';
/*
 * Guarda de erros repetidos (ideia do repeat-mistake-guard, em Node, local e "fail-open").
 * O advogado corrige uma vez -> vira LIÇÃO com um padrao verificavel (nivel "aviso": o hook avisa).
 * O mesmo erro e corrigido de novo -> vira BLOQUEIO (o hook PreToolUse nega gravar a peca com o erro).
 * Arquivo: ESCRITORIO/MEMORIA/erros-a-nao-repetir.json (sem dados de clientes; use [CLIENTE] etc.).
 * Regras de seguranca dos padroes: ate 200 caracteres, compilam, sem quantificador aninhado
 * (evita travar o hook), precisam casar com um EXEMPLO real do erro e nao casar com a forma certa.
 */
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const arq = () => path.join(c.config().escritorio, 'MEMORIA', 'erros-a-nao-repetir.json');
let cache = null; let cacheMt = 0; let cacheArq = '';
function ler() {
  const a = arq();
  try {
    const mt = fs.statSync(a).mtimeMs;
    if (cache && mt === cacheMt && a === cacheArq) return cache;
    const d = JSON.parse(fs.readFileSync(a, 'utf8').replace(/^\uFEFF/, ''));
    d.checks = Array.isArray(d.checks) ? d.checks : [];
    cache = d; cacheMt = mt; cacheArq = a; return d;
  } catch (e) { return { checks: [] }; }
}
function gravar(d) { c.gravarJSON(arq(), d); cache = null; }

const ANINHADO = /\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*[+*{]/; // (a+)+ , (a*)* ...
function validarPadrao(p, exemplo, certo) {
  const erros = [];
  if (!p || typeof p !== 'string') return ['falta o padrão (--padrao)'];
  if (p.length > 200) erros.push('padrão longo demais (máx. 200 caracteres)');
  if (ANINHADO.test(p) || /\.\*.*\.\*.*\.\*/.test(p)) erros.push('padrão arriscado (quantificador aninhado ou muitos ".*"): simplifique');
  let re = null; try { re = new RegExp(p, 'iu'); } catch (e) { erros.push('padrão inválido: ' + e.message); }
  if (re && !exemplo) erros.push('falta um exemplo real do erro (--exemplo) para provar que o padrão pega o erro');
  if (re && exemplo && !re.test(exemplo)) erros.push('o padrão não encontra o erro no exemplo dado');
  if (re && certo && re.test(certo)) erros.push('o padrão também acusa a forma CERTA (' + certo + '); deixe-o mais específico');
  if (re && re.test('a') && re.test('o') && re.test(' ')) erros.push('padrão genérico demais');
  return erros;
}
function termos(t) { return new Set((String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{3,}/g) || [])); }
function parecido(a, b) { const A = termos(a), B = termos(b); let n = 0; for (const w of A) if (B.has(w)) n++; return n / (A.size + B.size - n || 1); }

/**
 * Registra uma correcao. Se ja existir (mesmo padrao ou licao parecida) => REPETICAO: conta e vira bloqueio.
 * o: { licao, padrao, exemplo, certo, exceto, escopo: 'pecas'|'tudo', bloquear, origem }
 */
function registrar(o) {
  o = o || {};
  const licao = String(o.licao || '').trim();
  const prob = [];
  if (licao.length < 8) prob.push('descreva a lição (--licao), ex.: "TRT da 2ª Região, não 15ª, para casos de São Paulo"');
  if (licao.length > 300) prob.push('lição longa demais (máx. 300 caracteres)');
  const sig = c.acharSigilo([licao, o.exemplo, o.certo, o.padrao].filter(Boolean).join(' '));
  if (sig.length) prob.push('contém dado pessoal (' + sig.join(', ') + '); use marcadores como [CLIENTE], [CPF]');
  prob.push(...validarPadrao(o.padrao, o.exemplo, o.certo));
  if (o.exceto) { try { new RegExp(o.exceto, 'iu'); } catch (e) { prob.push('"exceto" inválido: ' + e.message); } }
  if (prob.length) return { ok: false, erros: prob };
  const d = ler();
  const agora = new Date().toISOString();
  const ja = d.checks.find((x) => x.padrao === o.padrao) || d.checks.find((x) => parecido(x.licao, licao) >= 0.6);
  if (ja) {
    ja.correcoes = (ja.correcoes || 1) + 1; ja.ultimaCorrecao = agora;
    const antes = ja.nivel;
    if (ja.correcoes >= 2 || o.bloquear) ja.nivel = 'bloqueio';
    gravar(d);
    return { ok: true, repetido: true, check: ja, escalou: antes !== ja.nivel };
  }
  const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ch = { id, licao, padrao: o.padrao, exemplo: o.exemplo, certo: o.certo || null, exceto: o.exceto || null, escopo: o.escopo === 'tudo' ? 'tudo' : 'pecas', nivel: o.bloquear ? 'bloqueio' : 'aviso', origem: o.origem || 'advogado', correcoes: 1, disparos: 0, criadoEm: agora };
  d.checks.push(ch); gravar(d);
  return { ok: true, repetido: false, check: ch };
}

/** Procura erros ja registrados num texto. Rapido e tolerante a falhas (nunca lanca). */
function verificar(texto, opts) {
  opts = opts || {};
  const t = String(texto || '');
  if (!t) return [];
  const out = [];
  for (const ch of ler().checks) {
    if (ch.desativado) continue;
    if (ch.escopo === 'pecas' && opts.ehPeca === false) continue;
    try {
      const re = new RegExp(ch.padrao, 'giu');
      re.lastIndex = 0; const m = re.exec(t.length > 400000 ? t.slice(0, 400000) : t);
      if (!m) continue;
      const ini = Math.max(0, m.index - 60); const trecho = t.slice(ini, m.index + m[0].length + 60).replace(/\s+/g, ' ');
      if (ch.exceto && new RegExp(ch.exceto, 'iu').test(trecho)) continue;
      out.push({ id: ch.id, nivel: ch.nivel, licao: ch.licao, certo: ch.certo, achado: m[0], trecho });
    } catch (e) { /* padrao quebrado: ignora (fail-open) */ }
  }
  return out;
}
function marcarDisparos(ids) {
  if (!ids || !ids.length) return;
  try { const d = ler(); for (const ch of d.checks) if (ids.includes(ch.id)) { ch.disparos = (ch.disparos || 0) + 1; ch.ultimoDisparo = new Date().toISOString(); } gravar(d); } catch (e) { /* */ }
}
function texto(h) { return '"' + h.licao + '"' + (h.certo ? ' (o certo: ' + h.certo + ')' : '') + ' — encontrado: "…' + h.trecho.slice(0, 160) + '…"'; }
function remover(id) { const d = ler(); const n = d.checks.length; d.checks = d.checks.filter((x) => x.id !== id); gravar(d); return n !== d.checks.length; }
function nivel(id, nv) { const d = ler(); const ch = d.checks.find((x) => x.id === id); if (!ch) return false; if (nv === 'desativar') ch.desativado = true; else { ch.nivel = nv; delete ch.desativado; } gravar(d); return true; }

module.exports = { registrar, verificar, marcarDisparos, texto, remover, nivel, ler, validarPadrao, arquivo: arq };
