'use strict';
/*
 * Prazos processuais: leitura do PRAZOS.md e contagem em dias uteis
 * (CPC art. 219: so dias uteis; art. 224: exclui o dia do comeco e inclui o do vencimento;
 *  art. 220: suspensao de 20/12 a 20/01). Feriados locais/estaduais e suspensoes: calendario forense
 *  (lib/calendario.js, v0.7) passado no parametro opcional "cal"; config.feriadosExtras continua aceito.
 * "cal" = { bloqueios(data) -> lista de entradas que tornam o dia nao util } (lib/calendario.ativo).
 * AVISO: auxilio de organizacao. O advogado sempre confere o prazo oficial.
 */
const fs = require('fs');

function pascoa(ano) { // algoritmo de Meeus/Jones/Butcher
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}
function iso(d) { const z = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
function somaDias(d, n) { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() + n); return r; }

function feriados(ano, extras) {
  const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
  const s = new Set(fixos.map((x) => ano + '-' + x));
  const p = pascoa(ano);
  // Carnaval (seg/ter) e Quarta de Cinzas costumam suspender expediente forense; Sexta Santa; Corpus Christi
  [-48, -47, -46, -2, 60].forEach((n) => s.add(iso(somaDias(p, n))));
  (extras || []).forEach((x) => s.add(/^\d{2}-\d{2}$/.test(x) ? ano + '-' + x : x));
  return s;
}
function emRecesso(d) { const m = d.getMonth() + 1, dia = d.getDate(); return (m === 12 && dia >= 20) || (m === 1 && dia <= 20); }
function ehDiaUtil(d, extras, cal) {
  const sem = d.getDay();
  if (sem === 0 || sem === 6) return false;
  if (feriados(d.getFullYear(), extras).has(iso(d))) return false;
  if (cal && cal.bloqueios(d).length) return false;
  return true;
}
function ehDiaContavel(d, extras, cal) { return ehDiaUtil(d, extras, cal) && !emRecesso(d); }

/** Data final de um prazo de N dias uteis a partir da intimacao/publicacao. */
function calcularVencimento(inicio, dias, extras, cal) {
  let d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  let contados = 0;
  while (contados < dias) { d = somaDias(d, 1); if (ehDiaContavel(d, extras, cal)) contados++; }
  return d;
}
/** Vencimento em dia nao util (feriado, suspensao, indisponibilidade) prorroga para o 1o dia util seguinte (CPC art. 224, par. 1o). */
function prorrogar(alvo, extras, cal) {
  let a = new Date(alvo.getFullYear(), alvo.getMonth(), alvo.getDate());
  for (let i = 0; i < 400 && !ehDiaUtil(a, extras, cal); i++) a = somaDias(a, 1);
  return a;
}
/** Entradas do calendario local que bloquearam dias de semana entre de (inclusive) e ate (inclusive), sem repetir. */
function entradasNoPeriodo(de, ate, cal) {
  if (!cal) return [];
  const vistas = new Map();
  for (let d = new Date(de.getFullYear(), de.getMonth(), de.getDate()), i = 0; d <= ate && i < 2000; d = somaDias(d, 1), i++) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    for (const e of cal.bloqueios(d)) if (!vistas.has(e.id)) vistas.set(e.id, e);
  }
  return Array.from(vistas.values());
}
/** Vencimento + entradas locais consideradas (as que caem em dia de semana dentro do prazo). */
function detalharVencimento(inicio, dias, extras, cal) {
  const vencimento = calcularVencimento(inicio, dias, extras, cal);
  return { vencimento, consideradas: entradasNoPeriodo(somaDias(inicio, 1), vencimento, cal) };
}
/** Dias uteis entre hoje (exclusive) e a data (inclusive). Negativo = vencido. */
function diasUteisAte(alvo, hoje, extras, cal) {
  hoje = hoje || new Date();
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const a = prorrogar(alvo, extras, cal);
  if (a.getTime() === h.getTime()) return 0;
  const passo = a > h ? 1 : -1; let d = h, n = 0;
  while (d.getTime() !== a.getTime()) { d = somaDias(d, passo); if (ehDiaUtil(d, extras, cal)) n += passo; }
  return n;
}
function lerData(txt) {
  txt = String(txt || '').trim();
  let m = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

/**
 * Dados de calculo guardados na coluna Origem (v0.7, retrocompativel: e so texto):
 *   "intimação DJEN [cálculo: 05/10/2026 + 15 dias úteis]"  ou  "[cálculo: 05/10/2026 + 15 dias úteis · TJPR · Curitiba]"
 */
const RE_CALCULO = /\[c[áa]lculo:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*\+\s*(\d+)\s*dias?\s+[úu]teis([^\]]*)\]/i;
function lerCalculo(origem) {
  const m = String(origem || '').match(RE_CALCULO);
  if (!m) return null;
  const inicio = lerData(m[1]); const dias = parseInt(m[2], 10);
  if (!inicio || !dias) return null;
  const extra = m[3].split('·').map((x) => x.trim()).filter(Boolean);
  return { inicio, dias, tribunal: extra[0] || '', comarca: extra[1] || '' };
}
function marcaCalculo(inicio, dias, tribunal, comarca) {
  const z = (n) => String(n).padStart(2, '0');
  return '[cálculo: ' + z(inicio.getDate()) + '/' + z(inicio.getMonth() + 1) + '/' + inicio.getFullYear() + ' + ' + dias + ' dias úteis' + (tribunal || comarca ? ' · ' + (tribunal || '') + (comarca ? ' · ' + comarca : '') : '') + ']';
}

/** Le a tabela markdown do PRAZOS.md. Colunas: Vencimento | Caso | O que fazer | Origem | Status */
function lerPrazos(arquivo) {
  let texto = '';
  try { texto = fs.readFileSync(arquivo, 'utf8'); } catch (e) { return []; }
  const itens = [];
  const linhas = texto.split(/\r?\n/);
  for (let n = 0; n < linhas.length; n++) {
    const linha = linhas[n];
    if (!/^\s*\|/.test(linha) || /^\s*\|\s*-/.test(linha)) continue;
    const cel = linha.split('|').slice(1, -1).map((c) => c.trim());
    const data = lerData(cel[0]);
    if (!data) continue;
    const status = (cel[cel.length - 1] || '').toLowerCase();
    if (/feito|cumprido|conclu|cancelad|ok\b/.test(status)) continue;
    const origem = cel.length >= 5 ? cel.slice(3, -1).join(' | ') : '';
    itens.push({ data, vencimento: iso(data), caso: cel[1] || '', tarefa: cel[2] || '', status, origem, calculo: lerCalculo(origem), linha: n });
  }
  return itens.sort((a, b) => a.data - b.data);
}

module.exports = { pascoa, feriados, ehDiaUtil, ehDiaContavel, calcularVencimento, diasUteisAte, lerData, lerPrazos, iso, emRecesso, somaDias, prorrogar, entradasNoPeriodo, detalharVencimento, lerCalculo, marcaCalculo, RE_CALCULO };
