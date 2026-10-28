'use strict';
/*
 * Calendario forense local (v0.7): feriados estaduais/municipais e suspensoes por tribunal/comarca.
 * Arquivo do usuario: ~/.claude/advogado/calendario.json (respeita CLAUDE_CONFIG_DIR/ADVOGADO_BASE).
 * {"versao":1,"entradas":[{id,tipo,inicio,fim,recorrente,escopo,motivo,fonte,semFonte,criadoEm}],
 *  "migradosDeFeriadosExtras":["MM-DD"|"AAAA-MM-DD"]}
 * - tipo: feriado | suspensao | indisponibilidade
 * - inicio/fim: "AAAA-MM-DD" (ou "MM-DD" quando recorrente: vale todo ano)
 * - escopo: "global" | {tribunal?, comarca?}. Global vale para todos; so tribunal vale para todas as
 *   comarcas dele; comarca (com ou sem tribunal) vale so para aquela comarca.
 * - Sem semente: nada de listas inventadas. O advogado cadastra cada data com a fonte (lei/portaria/link).
 * Tudo local; nunca acessa a rede. Arquivo ilegivel => calendario vazio + aviso (falha aberta), e nada
 * e regravado por cima dele (o doutor guarda a copia estragada de lado).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./comum');
const pz = require('./prazos');

const TIPOS = ['feriado', 'suspensao', 'indisponibilidade'];
const NOME_TIPO = { feriado: 'feriado', suspensao: 'suspensão de prazos', indisponibilidade: 'indisponibilidade do sistema' };
const arquivo = () => path.join(c.P.base, 'calendario.json');

/** "Comarca de São José dos Pinhais" -> "sao jose dos pinhais"; "TJ-PR" -> "tjpr". */
function normalizar(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/^\s*(comarca|foro|forum|secao judiciaria|subsecao judiciaria)\s+(de|da|do|dos|das)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
const normTribunal = (s) => normalizar(s).replace(/\s+/g, '');
/** Nome para exibir/gravar: "tj-pr" -> "TJPR"; "comarca de curitiba" -> "curitiba" (caixa preservada). */
const limparTribunal = (s) => String(s || '').trim().toUpperCase().replace(/[\s.\-]+/g, '');
const limparComarca = (s) => String(s || '').trim().replace(/^(comarca|foro|f[oó]rum|se[cç][aã]o judici[aá]ria|subse[cç][aã]o judici[aá]ria)\s+(de|da|do|dos|das)\s+/i, '').replace(/\s+/g, ' ');
function tipoNormal(t) {
  const n = normalizar(t);
  if (/^feriado/.test(n)) return 'feriado';
  if (/^suspens/.test(n)) return 'suspensao';
  if (/^indisponib/.test(n)) return 'indisponibilidade';
  return null;
}

/** Le o calendario. {versao, entradas, migradosDeFeriadosExtras, existe, invalido}. Nunca lanca. */
function ler() {
  const arq = arquivo();
  if (!fs.existsSync(arq)) return { versao: 1, entradas: [], migradosDeFeriadosExtras: [], existe: false };
  let j = null;
  try { j = JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, '')); } catch (e) { j = null; }
  if (!j || typeof j !== 'object' || !Array.isArray(j.entradas)) return { versao: 1, entradas: [], migradosDeFeriadosExtras: [], existe: true, invalido: true };
  return { versao: j.versao || 1, entradas: j.entradas.filter((x) => x && x.inicio), migradosDeFeriadosExtras: Array.isArray(j.migradosDeFeriadosExtras) ? j.migradosDeFeriadosExtras : [], existe: true };
}
function gravar(cal) {
  if (cal.invalido) throw new Error('calendario.json ilegível: rode o doutor (--consertar) antes de gravar');
  c.gravarJSON(arquivo(), { versao: 1, entradas: cal.entradas, migradosDeFeriadosExtras: cal.migradosDeFeriadosExtras || [] });
}

function idDe(e) {
  const chave = [e.tipo, e.inicio, e.fim, e.recorrente ? 'r' : '', JSON.stringify(escopoNormal(e.escopo)), normalizar(e.motivo)].join('|');
  return 'c' + crypto.createHash('sha1').update(chave).digest('hex').slice(0, 7);
}
function escopoNormal(esc) {
  if (!esc || esc === 'global') return 'global';
  const o = {};
  if (esc.tribunal) o.tribunal = normTribunal(esc.tribunal);
  if (esc.comarca) o.comarca = normalizar(esc.comarca);
  return Object.keys(o).length ? o : 'global';
}

/** Entrada a partir de feriadosExtras ("MM-DD" anual ou "AAAA-MM-DD"). */
function entradaDeExtra(x) {
  const rec = /^\d{2}-\d{2}$/.test(x);
  const e = { tipo: 'feriado', inicio: x, fim: x, recorrente: rec, escopo: 'global', motivo: 'Data migrada de feriadosExtras (config.json)', fonte: '', semFonte: true, origem: 'feriadosExtras', criadoEm: new Date().toISOString() };
  e.id = 'x' + crypto.createHash('sha1').update('extra|' + x).digest('hex').slice(0, 7);
  return e;
}
const extraValido = (x) => typeof x === 'string' && /^(\d{4}-)?\d{2}-\d{2}$/.test(x.trim());

/** Extras ainda nao migrados (para usar em memoria sem gravar). */
function extrasPendentes(cal, cfg) {
  const feitos = new Set(cal.migradosDeFeriadosExtras || []);
  return ((cfg && cfg.feriadosExtras) || []).map((x) => String(x).trim()).filter((x) => extraValido(x) && !feitos.has(x));
}
/** Migra config.feriadosExtras para entradas de escopo global. Idempotente; nao mexe no config. */
function migrarExtras(cfg) {
  cfg = cfg || c.config();
  const cal = ler();
  if (cal.invalido) return { migradas: 0, invalido: true };
  const pend = extrasPendentes(cal, cfg);
  if (!pend.length) return { migradas: 0 };
  const ids = new Set(cal.entradas.map((e) => e.id));
  for (const x of pend) {
    const e = entradaDeExtra(x);
    if (!ids.has(e.id)) cal.entradas.push(e);
    cal.migradosDeFeriadosExtras.push(x);
  }
  gravar(cal);
  return { migradas: pend.length };
}

/** A entrada vale para o contexto {tribunal, comarca}? */
function aplica(e, ctx) {
  const esc = escopoNormal(e.escopo);
  if (esc === 'global') return true;
  ctx = ctx || {};
  const t = ctx.tribunal ? normTribunal(ctx.tribunal) : '', m = ctx.comarca ? normalizar(ctx.comarca) : '';
  if (esc.comarca) {
    if (!m || m !== esc.comarca) return false;
    return !(esc.tribunal && t && t !== esc.tribunal);
  }
  return !!t && t === esc.tribunal;
}
/** A entrada cobre a data "AAAA-MM-DD"? */
function cobre(e, isoData) {
  if (e.recorrente) {
    const md = isoData.slice(5), a = String(e.inicio).slice(-5), b = String(e.fim || e.inicio).slice(-5);
    return a <= b ? md >= a && md <= b : md >= a || md <= b;
  }
  return isoData >= e.inicio && isoData <= (e.fim || e.inicio);
}

/**
 * Calendario ativo de um contexto. Objeto aceito por lib/prazos (parametro opcional "cal"):
 * { bloqueios(d) -> entradas que tornam a data nao util, entradas, ctx, invalido }
 */
function ativo(ctx, cfg) {
  cfg = cfg || c.config();
  const cal = ler();
  const todas = cal.entradas.concat(extrasPendentes(cal, cfg).map(entradaDeExtra));
  const entradas = todas.filter((e) => TIPOS.includes(e.tipo) && aplica(e, ctx));
  return {
    ctx: ctx || {}, entradas, invalido: !!cal.invalido, total: todas.length,
    bloqueios(d) { const s = typeof d === 'string' ? d : pz.iso(d); return entradas.filter((e) => cobre(e, s)); },
  };
}

// ---------- contexto do caso (tribunal/comarca no DOSSIE.md) ----------
const RE_CAMPO = (nome) => new RegExp('(?:^|[\\s·—|*-])' + nome + '\\**\\s*:\\s*\\**\\s*([^·|\\n*]+)', 'im');
function lerCampo(texto, nome) {
  const m = String(texto || '').match(RE_CAMPO(nome));
  if (!m) return '';
  const v = m[1].replace(/\s*\(.*$/, '').trim();
  return !v || /^\[.*\]$/.test(v) || /a confirmar/i.test(v) ? '' : v;
}
/** {tribunal, comarca} lidos do DOSSIE.md do caso (linha "Tribunal: TJPR · Comarca: Curitiba"). */
function foroDoCaso(pasta) {
  let t = ''; try { t = fs.readFileSync(path.join(pasta, 'DOSSIE.md'), 'utf8'); } catch (e) { return { tribunal: '', comarca: '' }; }
  return { tribunal: lerCampo(t, 'Tribunal'), comarca: lerCampo(t, 'Comarca') };
}
/**
 * Resolve o contexto: --tribunal/--comarca explicitos prevalecem; senao o caso (nome ou numero).
 * Retorna {tribunal, comarca, origem, caso, aviso}.
 */
function resolverContexto(op, esc) {
  op = op || {};
  const out = { tribunal: op.tribunal || '', comarca: op.comarca || '', origem: '', caso: null, aviso: '' };
  if (op.caso) {
    const k = require('./casos');
    const r = k.buscar(op.caso, esc);
    if (r.length === 1) {
      const f = foroDoCaso(r[0].pasta);
      out.caso = r[0].rel;
      if (!out.tribunal) out.tribunal = f.tribunal;
      if (!out.comarca) out.comarca = f.comarca;
      if (!f.tribunal && !f.comarca && !op.tribunal && !op.comarca) out.aviso = 'o caso ' + r[0].rel + ' não tem tribunal/comarca no DOSSIE.md (use processo.js foro)';
    } else if (r.length > 1 && !op.tribunal && !op.comarca) out.aviso = 'mais de um caso combina com "' + op.caso + '"';
    else if (!r.length && !op.tribunal && !op.comarca) out.aviso = 'não achei o caso "' + op.caso + '"';
  }
  out.origem = op.tribunal || op.comarca ? 'informado' : out.caso && (out.tribunal || out.comarca) ? 'caso ' + out.caso : '';
  return out;
}
function descreverContexto(ctx) {
  if (!ctx.tribunal && !ctx.comarca) return 'só nacional (sem tribunal/comarca)';
  return [ctx.tribunal, ctx.comarca ? 'comarca de ' + ctx.comarca : ''].filter(Boolean).join(', ');
}

// ---------- apresentacao ----------
const br = (s) => { const m = String(s).match(/^(?:(\d{4})-)?(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + (m[1] ? '/' + m[1] : '') : String(s); };
function descreverEscopo(esc) {
  if (!esc || esc === 'global') return 'todos os tribunais';
  return [esc.tribunal, esc.comarca ? 'comarca de ' + esc.comarca : ''].filter(Boolean).join(', ');
}
function periodo(e) { return (e.fim && e.fim !== e.inicio ? br(e.inicio) + ' a ' + br(e.fim) : br(e.inicio)) + (e.recorrente ? ' (todo ano)' : ''); }
/** Linha legivel de uma entrada; [SEM FONTE] sinalizado com ⚠️. */
function linhaEntrada(e, comId) {
  const fonte = e.semFonte || !e.fonte ? '[SEM FONTE] — confirme' : 'fonte: ' + e.fonte;
  return (e.semFonte || !e.fonte ? '⚠️ ' : '') + periodo(e) + ' — ' + (NOME_TIPO[e.tipo] || e.tipo) + ' — ' + descreverEscopo(e.escopo) + ' — ' + (e.motivo || '(sem motivo)') + ' — ' + fonte + (comId ? ' [id ' + e.id + ']' : '');
}

// ---------- prazos do PRAZOS.md com o calendario de cada caso ----------
/**
 * Avalia os prazos (lerPrazos) com o calendario do caso/tribunal/comarca de cada linha.
 * Acrescenta: ctx, efetivo (Date, com a prorrogacao do art. 224 par. 1o), prorrogadoPor (entradas locais),
 * uteis (dias uteis ate o efetivo), depois (Date recalculado: com dados de calculo, refaz a contagem;
 * sem eles, so a prorrogacao), consideradas, semDadosDeCalculo, muda (depois != vencimento gravado).
 */
function avaliarPrazos(itens, op) {
  op = op || {};
  const cfg = op.cfg || c.config(); const hoje = op.hoje || new Date();
  const ctxCache = new Map(), calCache = new Map();
  return itens.map((i) => {
    let ctx;
    if (i.calculo && (i.calculo.tribunal || i.calculo.comarca)) ctx = { tribunal: i.calculo.tribunal, comarca: i.calculo.comarca, origem: 'linha do PRAZOS.md' };
    else {
      if (!ctxCache.has(i.caso)) ctxCache.set(i.caso, i.caso ? resolverContexto({ caso: i.caso }, cfg.escritorio) : { tribunal: '', comarca: '' });
      ctx = ctxCache.get(i.caso);
    }
    const chave = normTribunal(ctx.tribunal) + '|' + normalizar(ctx.comarca);
    if (!calCache.has(chave)) calCache.set(chave, ativo(ctx, cfg));
    const cal = calCache.get(chave);
    const efetivo = pz.prorrogar(i.data, [], cal);
    const prorrogadoPor = efetivo.getTime() !== i.data.getTime() ? pz.entradasNoPeriodo(i.data, pz.somaDias(efetivo, -1), cal) : [];
    let depois, consideradas;
    if (i.calculo) { const dv = pz.detalharVencimento(i.calculo.inicio, i.calculo.dias, [], cal); depois = dv.vencimento; consideradas = dv.consideradas; }
    else { depois = efetivo; consideradas = prorrogadoPor; }
    return Object.assign(i, { ctx, efetivo, prorrogadoPor, uteis: pz.diasUteisAte(i.data, hoje, [], cal), depois, consideradas, semDadosDeCalculo: !i.calculo, muda: pz.iso(depois) !== i.vencimento });
  });
}
const dataBR = (d) => { const z = (n) => String(n).padStart(2, '0'); return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear(); };
/** Prazos cujo vencimento muda com o calendario atual (antes -> depois). Nao grava nada. */
function prazosAfetados(op) {
  op = op || {};
  const cfg = op.cfg || c.config();
  const arq = op.arquivo || path.join(cfg.escritorio, 'PRAZOS.md');
  return { arquivo: arq, itens: avaliarPrazos(pz.lerPrazos(arq), { cfg, hoje: op.hoje }).filter((i) => i.muda) };
}
function linhasAfetados(afetados) {
  return afetados.map((i) => {
    const ant = i.depois < i.data;
    return (ant ? '🔴 ' : '- ') + i.caso + ' — ' + i.tarefa + ': ' + dataBR(i.data) + ' → ' + dataBR(i.depois) + (ant ? ' (ANTECIPA — confira já)' : '') +
      (i.semDadosDeCalculo ? ' (sem dados de cálculo na linha: só a prorrogação do art. 224 §1º — vencimento caiu em dia não útil)' : ' (recontado: ' + i.calculo.dias + ' dias úteis desde ' + dataBR(i.calculo.inicio) + ')') +
      (i.consideradas.length ? '\n    considerei: ' + i.consideradas.map((e) => linhaEntrada(e)).join('; ') : '');
  });
}
/** Reescreve a data (1a coluna) das linhas afetadas do PRAZOS.md, com copia em _versoes. So com confirmacao. */
function reescreverPrazos(arquivo, afetados, esc) {
  if (!afetados.length) return 0;
  const texto = fs.readFileSync(arquivo, 'utf8');
  const eol = /\r\n/.test(texto) ? '\r\n' : '\n';
  const linhas = texto.split(/\r?\n/);
  c.versionar(arquivo, path.join(esc || c.config().escritorio, '_versoes'), esc || c.config().escritorio);
  let n = 0;
  for (const i of afetados) {
    const l = linhas[i.linha]; if (l == null) continue;
    const m = l.match(/^(\s*\|\s*)([^|]*?)(\s*\|)/);
    if (!m || !pz.lerData(m[2]) || pz.iso(pz.lerData(m[2])) !== i.vencimento) continue;
    linhas[i.linha] = m[1] + dataBR(i.depois) + l.slice(m[1].length + m[2].length); n++;
  }
  fs.writeFileSync(arquivo, linhas.join(eol), 'utf8');
  return n;
}

module.exports = { limparTribunal, limparComarca, avaliarPrazos, prazosAfetados, linhasAfetados, reescreverPrazos, dataBR, TIPOS, NOME_TIPO, arquivo, normalizar, normTribunal, tipoNormal, ler, gravar, idDe, escopoNormal, entradaDeExtra, extrasPendentes, migrarExtras, aplica, cobre, ativo, foroDoCaso, lerCampo, resolverContexto, descreverContexto, descreverEscopo, periodo, linhaEntrada, br };
