'use strict';
/*
 * Sumulas canceladas ou superadas (STF, STJ, TST) — lista LOCAL embarcada, sem rede.
 * O livro de conferencias (julgados.js) diz se o julgado existe e se o trecho bate; nao diz se a sumula
 * ainda vale. Este modulo cruza as citacoes de analisarCitacoes (lib/citacoes.js, que nao e alterado aqui)
 * com duas fontes:
 *   1. lista embarcada: scripts/lib/dados/sumulas-canceladas.json (ou ADVOGADO_SUMULAS_LISTA, usada nos testes)
 *      { versao, revisadoEm: "AAAA-MM-DD", itens: [{ tribunal, numero, vinculante?, situacao: cancelada|superada,
 *        ato?, data?, substituidaPor?, observacao? }] }
 *   2. ajuste do escritorio: ESCRITORIO/WIKI/sumulas-situacao.json (publico, sem dado de cliente), gravado por
 *      `julgados.js sumula marcar`. Vale mais que a lista: acrescenta itens ou marca "vigente" (anula falso positivo).
 * Niveis do resultado (citacao.sumula.nivel):
 *   bloqueio -> cancelada, tribunal identificado, citacao nao consciente (exportar-docx recusa, codigo 2)
 *   aviso    -> superada, tribunal identificado, nao consciente
 *   leve     -> numero cancelado/superado em algum tribunal, mas a citacao nao diz qual ("confirme de qual tribunal")
 *   info     -> citacao consciente ("cancelada", "revogada", "superada", "antiga", "extinta" na frase, ou a marca
 *               [CITADA COMO HISTÓRICO] logo depois): so uma linha informativa
 * Nunca afirma vigencia: todo aviso diz "segundo a lista local de DD/MM/AAAA" e manda confirmar no site do tribunal.
 */
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const TRIBUNAIS = ['STF', 'STJ', 'TST'];
const SITES = { STF: 'portal.stf.jus.br', STJ: 'stj.jus.br', TST: 'tst.jus.br' };
const SITUACOES = ['cancelada', 'superada'];
const ARQ_PADRAO = path.join(__dirname, 'dados', 'sumulas-canceladas.json');

const arqLista = () => process.env.ADVOGADO_SUMULAS_LISTA || ARQ_PADRAO;
const arqEscritorio = (esc) => path.join(esc || c.config().escritorio, 'WIKI', 'sumulas-situacao.json');
const dataBR = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || '?'); };
const chave = (tribunal, numero, vinculante) => String(tribunal).toUpperCase() + (vinculante ? '-SV-' : '-') + parseInt(numero, 10);

function itemValido(x, situacoes) {
  return x && TRIBUNAIS.includes(String(x.tribunal).toUpperCase()) && parseInt(x.numero, 10) > 0 && situacoes.includes(x.situacao) && (!x.vinculante || String(x.tribunal).toUpperCase() === 'STF');
}
/** Lista embarcada: { ok, versao, revisadoEm, itens, arquivo, erro? }. Nunca lanca. */
function lerLista() {
  const arquivo = arqLista();
  try {
    const d = JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, ''));
    if (!d || !Array.isArray(d.itens) || !/^\d{4}-\d{2}-\d{2}$/.test(String(d.revisadoEm || ''))) return { ok: false, itens: [], arquivo, erro: 'formato inválido (faltam itens ou revisadoEm AAAA-MM-DD)' };
    const invalidos = d.itens.filter((x) => !itemValido(x, SITUACOES));
    if (invalidos.length) return { ok: false, itens: [], arquivo, erro: invalidos.length + ' item(ns) inválido(s)' };
    return { ok: true, versao: d.versao || null, revisadoEm: d.revisadoEm, itens: d.itens, arquivo };
  } catch (e) { return { ok: false, itens: [], arquivo, erro: fs.existsSync(arquivo) ? 'JSON ilegível' : 'arquivo não encontrado' }; }
}
/** Ajuste do escritorio: { existe, ilegivel, itens, arquivo }. Ilegivel: ignorado (e nada e gravado por cima). */
function lerEscritorio(esc) {
  const arquivo = arqEscritorio(esc);
  if (!fs.existsSync(arquivo)) return { existe: false, ilegivel: false, itens: [], arquivo };
  try {
    const d = JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, ''));
    if (!d || !Array.isArray(d.itens)) return { existe: true, ilegivel: true, itens: [], arquivo };
    return { existe: true, ilegivel: false, itens: d.itens.filter((x) => itemValido(x, SITUACOES.concat(['vigente']))), arquivo };
  } catch (e) { return { existe: true, ilegivel: true, itens: [], arquivo }; }
}
/** Mapa chave -> item (com origem e data da fonte); o ajuste do escritorio substitui o item da lista. */
function indice(esc) {
  const L = lerLista(); const E = lerEscritorio(esc);
  const m = new Map();
  for (const x of L.itens) m.set(chave(x.tribunal, x.numero, x.vinculante), Object.assign({}, x, { tribunal: String(x.tribunal).toUpperCase(), origem: 'lista', dataFonte: L.revisadoEm }));
  for (const x of E.itens) m.set(chave(x.tribunal, x.numero, x.vinculante), Object.assign({}, x, { tribunal: String(x.tribunal).toUpperCase(), origem: 'escritorio', dataFonte: String(x.marcadoEm || '').slice(0, 10) || L.revisadoEm }));
  return { m, lista: L, escritorio: E };
}

// ---------------------------------------------------------------- leitura da citacao
const RE_TRIB_DEPOIS = /^\s*(?:\/\s*|[-–,]?\s*(?:d[oa]\s+)?(?:(?:C|E|Col|Eg|Exc)\.\s*|Colendo\s+|Egr[eé]gio\s+|Excelso\s+)?)(STF|STJ|TST|TSE|TNU|STM|TJ[A-Z]{2}|TRF\s?\d|TRT\s?\d+|TJDFT)\b/i;
/** "Súmula Vinculante 25", "Súmula n. 469/STJ"... -> { numero, vinculante, tribunal|null, outro, fimTribunal } (fimTribunal: relativo ao fim da citacao). */
function lerCitacao(cit, depois) {
  const t = String(cit || '');
  const m = t.match(/S[uú]mula\s+(Vinculante\s+)?(?:n[º°o.]*\s*)?(\d+)/i);
  if (!m) return null;
  const vinculante = !!m[1];
  let tribunal = null, outro = false, fimTribunal = 0;
  const noTexto = t.slice(m.index + m[0].length).match(/\b(STF|STJ|TST|TSE|TNU|STM|TJ[A-Z]{2}|TRF\s?\d|TRT\s?\d+)\b/i);
  const sigla = noTexto ? noTexto[1] : null;
  let s = sigla;
  if (!s && depois != null) { const d = String(depois).slice(0, 24).match(RE_TRIB_DEPOIS); if (d) { s = d[1]; fimTribunal = d[0].length; } }
  if (s) { s = s.toUpperCase().replace(/\s/g, ''); if (TRIBUNAIS.includes(s)) tribunal = s; else outro = true; }
  if (vinculante) { if (outro) outro = false; tribunal = 'STF'; }
  return { numero: parseInt(m[2], 10), vinculante, tribunal, outro, fimTribunal };
}
/** Frase que contem [ini, fim): limites em ".!?;|" seguidos de espaco (menos abreviacoes como "n.", "C.", "art.") e quebra de linha. */
const ABREV = new Set(['n', 'nº', 'no', 'art', 'arts', 'c', 'e', 'col', 'eg', 'exc', 'min', 'rel', 'j', 'fl', 'fls', 'inc', 'p', 'pag', 'pág', 'v', 'ex', 'sr', 'sra', 'dr', 'dra', 'des', 'exmo', 'ilmo', 'ltda', 'cf', 'vol', 'ed']);
function limite(texto, i) { // i aponta para o sinal
  const ch = texto[i];
  if (ch === '\n' || ch === '|' || ch === ';') return true;
  if (!/[.!?]/.test(ch)) return false;
  if (i + 1 < texto.length && !/\s/.test(texto[i + 1])) return false;
  if (ch !== '.') return true;
  const w = (texto.slice(Math.max(0, i - 12), i).match(/([\p{L}º]+)$/u) || [])[1];
  return !(w && (ABREV.has(w.toLowerCase()) || w.length === 1));
}
function frase(texto, ini, fim) {
  let a = ini; while (a > 0 && !limite(texto, a - 1)) a--;
  let b = fim; while (b < texto.length && !limite(texto, b)) b++;
  return texto.slice(a, b);
}
const RE_CONSCIENTE = /\b(cancelad[ao]s?|revogad[ao]s?|superad[ao]s?|antig[ao]s?|extint[ao]s?|cancelamento|revoga[cç][aã]o|supera[cç][aã]o)\b/i;
const RE_HISTORICO = /^[^\n]{0,40}?\[CITAD[AO] COMO HIST[ÓO]RICO\]/i;

/**
 * Anexa `sumula` as citacoes de sumula do STF/STJ/TST que constem como canceladas/superadas.
 * citacoes: saida de analisarCitacoes(texto, ...). Retorna a lista das citacoes com aviso (mesmos objetos).
 */
function avaliarSumulas(texto, citacoes, opts) {
  opts = opts || {};
  texto = String(texto || '');
  let idx; try { idx = indice(opts.escritorio); } catch (e) { return []; }
  if (!idx.m.size) return [];
  const comAviso = [];
  for (const x of citacoes || []) {
    if (!x || x.tipo !== 'jurisprudencia' || !/S[uú]mula/i.test(x.texto)) continue;
    const lc = lerCitacao(x.texto, texto.slice(x.fim, x.fim + 40));
    if (!lc || lc.outro) continue;
    const fimT = x.fim + lc.fimTribunal;
    const depois = texto.slice(fimT, fimT + 80);
    const consciente = RE_HISTORICO.test(depois) || RE_CONSCIENTE.test(frase(texto, x.ini, fimT).replace(x.texto, ' '));
    let item = null, candidatos = [];
    if (lc.tribunal) item = idx.m.get(chave(lc.tribunal, lc.numero, lc.vinculante)) || null;
    else candidatos = TRIBUNAIS.map((t) => idx.m.get(chave(t, lc.numero, false))).filter((y) => y && y.situacao !== 'vigente');
    if (item && item.situacao === 'vigente') continue;
    if (!item && !candidatos.length) continue;
    const base = item || candidatos[0];
    const fonteLista = base.origem === 'escritorio' ? 'lista local do escritório de ' + dataBR(base.dataFonte) : 'lista local de ' + dataBR(base.dataFonte);
    x.sumula = {
      situacao: base.situacao, tribunal: item ? item.tribunal : null, numero: lc.numero, vinculante: lc.vinculante,
      ato: base.ato || null, data: base.data || null, substituidaPor: base.substituidaPor || null, consciente, fonteLista,
      origem: base.origem, fonte: base.fonte || null, fimTribunal: fimT,
      candidatos: item ? [] : candidatos.map((y) => ({ tribunal: y.tribunal, situacao: y.situacao, data: y.data || null, substituidaPor: y.substituidaPor || null, fonteLista: (y.origem === 'escritorio' ? 'lista local do escritório de ' : 'lista local de ') + dataBR(y.dataFonte) })),
    };
    x.sumula.nivel = !item ? 'leve' : consciente ? 'info' : base.situacao === 'cancelada' ? 'bloqueio' : 'aviso';
    x.sumula.mensagem = mensagem(x.sumula);
    comAviso.push(x);
  }
  return comAviso;
}

const nome = (s) => (s.vinculante ? 'Súmula Vinculante ' : 'Súmula ') + s.numero + (s.tribunal && !s.vinculante ? ' do ' + s.tribunal : '');
function oQue(s) {
  const verbo = s.situacao === 'cancelada' ? 'foi cancelada' : 'é tida como superada';
  return verbo + (s.data ? (s.situacao === 'cancelada' ? ' em ' : ' desde ') + s.data : '') + (s.substituidaPor ? ' (substituída pela ' + s.substituidaPor + ')' : '');
}
/** Aviso em pt-BR simples; nunca afirma vigencia, sempre manda confirmar no site do tribunal. */
function mensagem(s) {
  if (s.nivel === 'leve') {
    const cs = s.candidatos.map((y) => 'a Súmula ' + s.numero + ' do ' + y.tribunal + ' ' + oQue(y) + ', segundo a ' + y.fonteLista);
    return 'A Súmula ' + s.numero + ' foi citada sem o tribunal. ' + cs.join('; ').replace(/^a/, 'A') + '. Confirme de qual tribunal é a súmula citada e confira no site do tribunal antes de protocolar.';
  }
  const site = 'Confirme no site do ' + s.tribunal + ' (' + SITES[s.tribunal] + ') antes de protocolar.';
  if (s.nivel === 'info') return 'A ' + nome(s) + ' aparece citada como histórico (' + (s.situacao === 'cancelada' ? 'cancelada' : 'superada') + (s.data ? ' em ' + s.data : '') + ', segundo a ' + s.fonteLista + '). ' + site;
  return 'A ' + nome(s) + ' ' + oQue(s) + ', segundo a ' + s.fonteLista + '. ' + site;
}

// ---------------------------------------------------------------- consulta e ajuste do escritorio
/** "Súmula 469 do STJ" -> situacao (consultar). */
function consultar(cit, esc) {
  const lc = lerCitacao(cit, '');
  if (!lc) return { erro: 'Não entendi a súmula. Exemplo: "Súmula 469 do STJ" ou "Súmula Vinculante 25".' };
  const idx = indice(esc);
  const L = idx.lista;
  if (!lc.tribunal) {
    const cand = TRIBUNAIS.map((t) => idx.m.get(chave(t, lc.numero, false))).filter(Boolean);
    return { lc, semTribunal: true, candidatos: cand, lista: L, escritorio: idx.escritorio };
  }
  return { lc, item: idx.m.get(chave(lc.tribunal, lc.numero, lc.vinculante)) || null, lista: L, escritorio: idx.escritorio };
}
/** Grava o ajuste do escritorio. Retorna { ok, erro?, codigo?, item? }. Arquivo ilegivel: nao grava por cima. */
function marcar(cit, situacao, fonte, extra, esc) {
  extra = extra || {};
  const lc = lerCitacao(cit, '');
  if (!lc) return { ok: false, codigo: 1, erro: 'Não entendi a súmula. Exemplo: "Súmula 469 do STJ".' };
  if (!lc.tribunal) return { ok: false, codigo: 1, erro: 'Diga o tribunal da súmula (STF, STJ ou TST). Exemplo: "Súmula 469 do STJ".' };
  if (!['vigente', 'cancelada', 'superada'].includes(situacao)) return { ok: false, codigo: 1, erro: 'Use --vigente, --cancelada ou --superada.' };
  if (!fonte) return { ok: false, codigo: 1, erro: 'A fonte é obrigatória: --fonte <link do site do tribunal ou arquivo salvo>.' };
  const escDir = esc || c.config().escritorio;
  if (!/^https?:\/\/\S+$/.test(fonte) && !fs.existsSync(path.resolve(escDir, fonte)) && !fs.existsSync(path.resolve(fonte))) return { ok: false, codigo: 2, erro: 'A fonte precisa ser um link (http/https) ou um arquivo que exista (ex.: WIKI/raw/sumula-469-stj.pdf).' };
  const E = lerEscritorio(escDir);
  if (E.ilegivel) return { ok: false, codigo: 2, erro: 'O arquivo de ajustes do escritório (' + E.arquivo + ') está ilegível; não gravei nada por cima. Corrija ou renomeie o arquivo e marque de novo.' };
  let d = { versao: 1, itens: [] };
  if (E.existe) { try { d = JSON.parse(fs.readFileSync(E.arquivo, 'utf8').replace(/^﻿/, '')); } catch (e) { return { ok: false, codigo: 2, erro: 'Arquivo de ajustes ilegível; nada gravado.' }; } }
  const k = chave(lc.tribunal, lc.numero, lc.vinculante);
  d.itens = (d.itens || []).filter((x) => !(x && chave(x.tribunal, x.numero, x.vinculante) === k));
  const item = { tribunal: lc.tribunal, numero: lc.numero, situacao, fonte, marcadoEm: c.hojeISO() };
  if (lc.vinculante) item.vinculante = true;
  for (const n of ['ato', 'data', 'substituidaPor', 'observacao']) if (extra[n]) item[n] = String(extra[n]);
  d.itens.push(item);
  c.gravarJSON(E.arquivo, d);
  return { ok: true, item, arquivo: E.arquivo };
}

/** Para o doutor e a manutencao: { ok, n, revisadoEm, revisadoBR, escritorio: {n, ilegivel}, vencida(hojeISO) }. */
function estado(esc) {
  const L = lerLista(); const E = lerEscritorio(esc);
  return { ok: L.ok, erro: L.erro || null, arquivo: L.arquivo, n: L.itens.length, revisadoEm: L.revisadoEm || null, revisadoBR: L.revisadoEm ? dataBR(L.revisadoEm) : null, escritorio: { existe: E.existe, n: E.itens.length, ilegivel: E.ilegivel, arquivo: E.arquivo } };
}
/** A lista passou de `meses` desde revisadoEm? (datas como texto AAAA-MM-DD; hoje no dia local). */
function listaVencida(hojeISO, meses) {
  const L = lerLista(); if (!L.ok) return null;
  const [y, m, d] = L.revisadoEm.split('-').map(Number);
  const lim = new Date(Date.UTC(y, m - 1 + (meses || 6), d));
  const limISO = lim.toISOString().slice(0, 10);
  return hojeISO > limISO ? { revisadoBR: dataBR(L.revisadoEm), limiteBR: dataBR(limISO) } : null;
}

module.exports = { avaliarSumulas, lerCitacao, lerLista, lerEscritorio, consultar, marcar, estado, listaVencida, mensagem, dataBR, arqLista, arqEscritorio, SITES, frase };
