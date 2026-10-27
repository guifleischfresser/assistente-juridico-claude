'use strict';
/*
 * Conferencia de julgados citados (existe? o trecho citado bate com o original?).
 * Nada vai para a internet por aqui: este modulo so compara textos LOCAIS e guarda o resultado.
 * A busca do original (WebFetch em site oficial/JusBrasil) e feita pelo assistente, e a guarda de
 * sigilo PERGUNTA antes de qualquer acesso a site que o advogado nao autorizou (config.fontesAutorizadas).
 * Livro de conferencias (sem dados de clientes; julgados sao publicos): ESCRITORIO/WIKI/julgados-verificados.json
 *   status: confere | divergente | inexistente | sem-texto   (sem registro = nao verificado)
 *   sem-texto: o arquivo salvo do original nao tinha texto legivel; nao conta como conferido nem como problema.
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
// Normalizacao tolerante a FORMA (nunca ao conteudo): ligaduras e larguras (NFKC), hifen discricionario,
// caracteres invisiveis, espacos especiais e palavra hifenizada no fim da linha. Palavras continuam palavras.
const INVIS = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
const ESPACOS = /[   -   　]/g;
const HIFEN_FIM_LINHA = /(\p{L})[-‐‑][ \t]*\r?\n[ \t]*(\p{L})/gu;
/** Palavras normalizadas. opts.hifen: 'juntar' (padrao: "consti-\ntucional" -> constitucional) | 'separar'
 *  | 'compactar' (junta tambem o hifen entre letras na mesma linha: "guarda-chuva" -> guardachuva). */
function tokens(t, opts) {
  let s = String(t || '').replace(/[ºª°]/g, ' ').normalize('NFKC')
    .replace(/­[ \t]*\r?\n[ \t]*/g, '').replace(INVIS, '').replace(ESPACOS, ' ');
  const h = opts && opts.hifen;
  if (h !== 'separar') s = s.replace(HIFEN_FIM_LINHA, '$1$2');
  if (h === 'compactar') s = s.replace(/(\p{L})[-\u2010\u2011](?=\p{L})/gu, '$1');
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[“”«»"'‘’]/g, ' ').match(/[a-z0-9]+/g) || [];
}
/** Alinhamento do trecho T com uma janela J do original: cada palavra trocada, acrescentada ou omitida custa 1.
 *  Pular palavras do original so e livre antes do inicio e depois do fim. */
function alinhar(T, J, livres, completo) {
  const m = T.length, n = J.length;
  const D = completo ? [] : null;
  let prev = new Int32Array(n + 1);
  if (D) D.push(prev);
  for (let i = 1; i <= m; i++) {
    const cur = new Int32Array(n + 1); cur[0] = i; const pula = livres.has(i) ? 0 : 1;
    for (let j = 1; j <= n; j++) {
      const sub = prev[j - 1] + (T[i - 1] === J[j - 1] ? 0 : 1), acr = prev[j] + 1, omi = cur[j - 1] + pula;
      cur[j] = sub < acr ? (sub < omi ? sub : omi) : (acr < omi ? acr : omi);
    }
    prev = cur; if (D) D.push(cur);
  }
  let fim = 0; for (let j = 1; j <= n; j++) if (prev[j] < prev[fim]) fim = j;
  const r = { custo: prev[fim], omitidas: [] };
  if (D) { // volta pelo caminho para listar as palavras do original que o trecho deixou de fora
    let i = m, j = fim;
    while (i > 0 && j > 0) {
      const pula = livres.has(i) ? 0 : 1;
      if (D[i][j] === D[i - 1][j - 1] + (T[i - 1] === J[j - 1] ? 0 : 1)) { i--; j--; }
      else if (D[i][j] === D[i][j - 1] + pula) { if (pula) r.omitidas.unshift(J[j - 1]); j--; }
      else i--;
    }
  }
  return r;
}
function compararTokens(T, livres, O) {
  if (!T.length || !O.length) return { similaridade: 0, literal: false, faltando: T.slice(0, 10), omitidas: [] };
  if (!livres.size && (' ' + O.join(' ') + ' ').includes(' ' + T.join(' ') + ' ')) return { similaridade: 1, literal: true, faltando: [], omitidas: [] };
  // ancora nas palavras mais raras do trecho e alinha numa janela ao redor
  const freq = {}; for (const w of O) freq[w] = (freq[w] || 0) + 1;
  const ancoras = Array.from(new Set(T)).filter((w) => freq[w]).sort((a, b) => freq[a] - freq[b]).slice(0, 3);
  let melhor = Infinity, melhorJan = [];
  const feitas = new Set();
  for (const anc of ancoras) {
    let vistos = 0;
    for (let p = 0; p < O.length && vistos < 40; p++) {
      if (O[p] !== anc) continue; vistos++;
      const iT = T.indexOf(anc);
      const ini = Math.max(0, p - iT - Math.ceil(T.length * 0.3));
      if (feitas.has(ini)) continue; feitas.add(ini);
      const jan = O.slice(ini, ini + Math.ceil(T.length * 1.6) + 2);
      const custo = alinhar(T, jan, livres).custo;
      if (custo < melhor) { melhor = custo; melhorJan = jan; }
    }
  }
  if (melhor === Infinity) return { similaridade: 0, literal: false, faltando: T.slice(0, 12), omitidas: [] };
  const J = new Set(melhorJan);
  return { similaridade: Math.round(Math.max(0, 1 - melhor / T.length) * 1000) / 1000, literal: false, faltando: T.filter((w) => !J.has(w)).slice(0, 12), omitidas: alinhar(T, melhorJan, livres, true).omitidas.slice(0, 12) };
}
/** Compara o trecho citado com o texto original. Retorna { similaridade 0..1, literal, faltando[], omitidas[] }.
 *  faltando = palavras do trecho que nao estao no original; omitidas = palavras do original que o trecho pulou
 *  . "guarda-\nchuva" e ambiguo: o original e comparado com a hifenizacao
 *  de fim de linha reunida, mantida como separador e (nos dois lados) com todo hifen entre letras unido;
 *  fica a melhor. Rigor igual: >= 0,97, palavra por palavra. */
function comparar(trecho, original) {
  const montar = (opts) => ({ T: tokens(trecho, opts), livres: new Set() });
  const normal = montar(), compacto = montar({ hifen: 'compactar' });
  const pares = [[normal, tokens(original)], [normal, tokens(original, { hifen: 'separar' })], [compacto, tokens(original, { hifen: 'compactar' })]];
  let melhor = null;
  for (const [{ T, livres }, O] of pares) {
    const r = compararTokens(T, livres, O);
    if (!melhor || r.similaridade > melhor.similaridade) melhor = r;
    if (r.literal) break;
  }
  return melhor;
}
const STATUS_SEM_TEXTO = 'sem-texto';
/** Classifica o resultado: confere | divergente ('sem-texto' se o original salvo nao tinha texto legivel). */
function situacao(cmp) {
  if (cmp && cmp.semTexto) return STATUS_SEM_TEXTO;
  return cmp.literal || cmp.similaridade >= 0.97 ? 'confere' : 'divergente';
}

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

module.exports = { chave, lerLivro, consultar, registrar, tokens, comparar, situacao, STATUS_SEM_TEXTO, trechoCitado, politica, dominioAutorizado, pedir, lerPendentes, cnjLiberados, FONTES_SUGERIDAS, arqLivro };
