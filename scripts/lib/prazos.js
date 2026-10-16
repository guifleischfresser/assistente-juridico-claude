'use strict';
/*
 * Prazos processuais: leitura do PRAZOS.md e contagem em dias uteis
 * (CPC art. 219: so dias uteis; art. 224: exclui o dia do comeco e inclui o do vencimento;
 *  art. 220: suspensao de 20/12 a 20/01). Feriados locais/estaduais: config.feriadosExtras.
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
function ehDiaUtil(d, extras) {
  const sem = d.getDay();
  if (sem === 0 || sem === 6) return false;
  if (feriados(d.getFullYear(), extras).has(iso(d))) return false;
  return true;
}
function ehDiaContavel(d, extras) { return ehDiaUtil(d, extras) && !emRecesso(d); }

/** Data final de um prazo de N dias uteis a partir da intimacao/publicacao. */
function calcularVencimento(inicio, dias, extras) {
  let d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  let contados = 0;
  while (contados < dias) { d = somaDias(d, 1); if (ehDiaContavel(d, extras)) contados++; }
  return d;
}
/** Dias uteis entre hoje (exclusive) e a data (inclusive). Negativo = vencido. */
function diasUteisAte(alvo, hoje, extras) {
  hoje = hoje || new Date();
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let a = new Date(alvo.getFullYear(), alvo.getMonth(), alvo.getDate());
  // vencimento em dia nao util prorroga para o primeiro dia util seguinte (CPC art. 224, par. 1o)
  while (!ehDiaUtil(a, extras)) a = somaDias(a, 1);
  if (a.getTime() === h.getTime()) return 0;
  const passo = a > h ? 1 : -1; let d = h, n = 0;
  while (d.getTime() !== a.getTime()) { d = somaDias(d, passo); if (ehDiaUtil(d, extras)) n += passo; }
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

/** Le a tabela markdown do PRAZOS.md. Colunas: Vencimento | Caso | O que fazer | ... | Status */
function lerPrazos(arquivo) {
  let texto = '';
  try { texto = fs.readFileSync(arquivo, 'utf8'); } catch (e) { return []; }
  const itens = [];
  for (const linha of texto.split(/\r?\n/)) {
    if (!/^\s*\|/.test(linha) || /^\s*\|\s*-/.test(linha)) continue;
    const cel = linha.split('|').slice(1, -1).map((c) => c.trim());
    const data = lerData(cel[0]);
    if (!data) continue;
    const status = (cel[cel.length - 1] || '').toLowerCase();
    if (/feito|cumprido|conclu|cancelad|ok\b/.test(status)) continue;
    itens.push({ data, vencimento: iso(data), caso: cel[1] || '', tarefa: cel[2] || '', status });
  }
  return itens.sort((a, b) => a.data - b.data);
}

module.exports = { pascoa, feriados, ehDiaUtil, ehDiaContavel, calcularVencimento, diasUteisAte, lerData, lerPrazos, iso, emRecesso };
