'use strict';
/*
 * Conferencia de julgados citados (existe? o trecho citado bate com o original?).
 * Nada vai para a internet por aqui: este modulo so compara textos LOCAIS e guarda o resultado.
 * A busca do original (WebFetch em site oficial/JusBrasil) e feita pelo assistente, e a guarda de
 * sigilo PERGUNTA antes de qualquer acesso a site que o advogado nao autorizou (config.fontesAutorizadas).
 * Livro de conferencias (sem dados de clientes; julgados sao publicos): ESCRITORIO/WIKI/julgados-verificados.json
 *   status: confere | divergente | inexistente     (sem registro = nao verificado)
 */
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const arqLivro = () => path.join(c.config().escritorio, 'WIKI', 'julgados-verificados.json');
const arqPend = () => path.join(c.P.estado, 'julgados-pendentes.json');
const FONTES_SUGERIDAS = ['stf.jus.br', 'stj.jus.br', 'tst.jus.br', 'jus.br', 'planalto.gov.br', 'jusbrasil.com.br'];

/** Chave canonica: "REsp n. 1.234.567/SP" -> "RESP1234567SP"; "Súmula 7 do STJ" -> "SUMULA7STJ". */
function chave(cit) {
  return String(cit || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/\bN[.ºO°]*\s*(?=\d)/g, '').replace(/\b(DO|DA|DE|NO|NA|EM)\b/g, '').replace(/[^A-Z0-9]/g, '');
}
function lerLivro() { const d = c.lerJSON(arqLivro(), null); return d && d.itens ? d : { itens: {} }; }
function gravarLivro(d) { c.gravarJSON(arqLivro(), d); }
function consultar(cit) { return lerLivro().itens[chave(cit)] || null; }
function registrar(cit, dados) {
  const d = lerLivro(); const k = chave(cit);
  if (!k) return null;
  d.itens[k] = Object.assign({}, d.itens[k] || {}, dados, { citacao: String(cit).trim(), verificadoEm: new Date().toISOString() });
  gravarLivro(d); return d.itens[k];
}

// ---------------------------------------------------------------- comparacao do trecho
function tokens(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[“”«»"'‘’]/g, ' ').match(/[a-z0-9]+/g) || [];
}
function lcs(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) { const cur = new Array(n + 1).fill(0); for (let j = 1; j <= n; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]); prev = cur; }
  return prev[n];
}
/** Compara o trecho citado com o texto original. Retorna { similaridade 0..1, literal, faltando[] }. */
function comparar(trecho, original) {
  const T = tokens(trecho), O = tokens(original);
  if (!T.length || !O.length) return { similaridade: 0, literal: false, faltando: T.slice(0, 10) };
  const tn = T.join(' '), on = ' ' + O.join(' ') + ' ';
  if (on.includes(' ' + tn + ' ')) return { similaridade: 1, literal: true, faltando: [] };
  // ancora na palavra mais rara do trecho e mede a maior subsequencia comum numa janela ao redor
  const freq = {}; for (const w of O) freq[w] = (freq[w] || 0) + 1;
  const ancoras = Array.from(new Set(T)).filter((w) => freq[w]).sort((a, b) => freq[a] - freq[b]).slice(0, 3);
  let melhor = 0, melhorJan = [];
  for (const anc of ancoras) {
    let vistos = 0;
    for (let p = 0; p < O.length && vistos < 40; p++) {
      if (O[p] !== anc) continue; vistos++;
      const iT = T.indexOf(anc);
      const ini = Math.max(0, p - iT - Math.ceil(T.length * 0.3)); const jan = O.slice(ini, ini + Math.ceil(T.length * 1.6) + 2);
      const s = lcs(T, jan) / T.length;
      if (s > melhor) { melhor = s; melhorJan = jan; }
    }
  }
  const J = new Set(melhorJan);
  return { similaridade: Math.round(melhor * 1000) / 1000, literal: false, faltando: T.filter((w) => !J.has(w)).slice(0, 12) };
}
/** Classifica o resultado da comparacao. */
function situacao(cmp) { return cmp.literal || cmp.similaridade >= 0.97 ? 'confere' : 'divergente'; }

/** Trecho entre aspas (ou citacao em bloco ">") logo depois/antes da citacao, no mesmo bloco. */
function trechoCitado(texto, ini, fim) {
  const depois = texto.slice(fim, fim + 900); const antes = texto.slice(Math.max(0, ini - 900), ini);
  const aspas = /[“"]([^”"\n]{25,1500})[”"]/;
  let m = depois.split(/\n\s*\n(?!\s*>)/)[0].match(aspas) || (depois.match(/^(?:[^\n]*\n){0,2}\s*>\s*([^\n]{25,}(?:\n\s*>\s*[^\n]+)*)/) || null);
  if (!m) m = antes.split(/\n\s*\n/).pop().match(aspas);
  return m ? m[1].replace(/\n\s*>\s*/g, ' ').trim() : null;
}

// ---------------------------------------------------------------- politica de rede
function politica() {
  const cfg = c.config();
  return { modo: cfg.verificacaoOnline || 'perguntar', fontes: Array.isArray(cfg.fontesAutorizadas) ? cfg.fontesAutorizadas : [], busca: !!cfg.buscaWebAutorizada };
}
function dominioAutorizado(url, fontes) {
  let h = ''; try { h = new URL(String(url)).hostname.toLowerCase(); } catch (e) { return false; }
  return (fontes || politica().fontes).some((f) => { f = String(f).toLowerCase().replace(/^\*?\./, ''); return h === f || h.endsWith('.' + f); });
}
function lerPendentes() { return c.lerJSON(arqPend(), []) || []; }
function pedir(cit) { const l = lerPendentes(); const k = chave(cit); if (k && !l.some((x) => x.chave === k)) l.push({ chave: k, citacao: String(cit).trim(), em: new Date().toISOString() }); c.gravarJSON(arqPend(), l.slice(-200)); return k; }
/** Numeros CNJ no texto que pertencem a julgados que o advogado pediu para conferir. */
function cnjLiberados(texto) {
  const pend = lerPendentes().map((x) => x.chave);
  const nums = String(texto || '').match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/g) || [];
  return nums.length > 0 && nums.every((n) => pend.some((k) => k.includes(n.replace(/\D/g, ''))));
}

module.exports = { chave, lerLivro, consultar, registrar, comparar, situacao, trechoCitado, politica, dominioAutorizado, pedir, lerPendentes, cnjLiberados, FONTES_SUGERIDAS, arqLivro };
