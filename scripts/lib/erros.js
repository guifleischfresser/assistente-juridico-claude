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

// ---------- sugerir o padrao a partir da correcao (antes -> depois) ----------
// Diff por palavras (prefixo/sufixo comuns), contexto so quando o trecho e curto/generico, regex
// tolerante (espacos, caixa, acentos tambem em NFD, º/ª) testada do mais tolerante ao mais exato. Dado de cliente
// (CPF, CNPJ, processo, RG, e-mail, telefone, nomes do DOSSIE/tabela/qualificacao) nunca entra.
const TOKEN = /[\p{L}\p{N}\p{M}°]+|[^\s\p{L}\p{N}\p{M}°]/gu;
const PALAVRA_RE = /[\p{L}\p{N}]/u;
const VAZIAS = new Set('a o as os um uma uns umas de da do das dos em no na nos nas ao aos à às por pela pelo pelas pelos para e ou que se com sem é'.split(' '));
const SIGILO_POS = [
  { tipo: 'cnj', re: /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/g },
  { tipo: 'cnpj', re: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g },
  { tipo: 'cpf', re: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g },
  { tipo: 'telefone', re: /\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/g },
  { tipo: 'rg', re: /\bRG\s*(?:n[ºo°.]*\s*)?[\d.]{5,}-?[\dxX]?\b/gi },
  { tipo: 'email', re: /[\w.+-]+@[\w-]+\.[\w.]+/g },
];
const NOME_TIPO = { cpf: 'CPF', cnpj: 'CNPJ', cnj: 'número de processo', rg: 'RG', email: 'e-mail', telefone: 'telefone', endereco: 'endereço', cep: 'CEP', nome: 'nome', cliente: 'nome' };
const dobra = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Nomes conhecidos (DOSSIE de todos os casos e tabelas de anonimizacao). Nunca lanca. */
function nomesConhecidos() {
  const out = new Set();
  try {
    const casos = require('./casos').listar();
    let dos = null; try { dos = require('../anonimizar').nomesDoDossie; } catch (e) { /* */ }
    const A = require('./anonimizar');
    for (const k of casos) {
      if (dos) for (const n of dos(k.pasta)) out.add(n);
      const t = A.lerTabela(k.pasta);
      if (t) for (const v of A.valoresReais(t)) if (['nome', 'endereco', 'email'].includes(v.tipo)) out.add(v.valor);
    }
  } catch (e) { /* fail-open: so as outras deteccoes */ }
  return [...out].filter((n) => dobra(n).replace(/[^a-z0-9]/g, '').length >= 4);
}
/** Trechos com dado pessoal: [{ini, fim, tipo, chave}] */
function trechosSigilosos(texto, nomes) {
  const sp = [];
  try { for (const d of require('./anonimizar').detectar(texto)) sp.push({ ini: d.ini, fim: d.fim, tipo: d.tipo, chave: d.tipo === 'nome' ? dobra(d.valor) : String(d.valor).replace(/\D/g, '') || dobra(d.valor) }); } catch (e) { /* */ }
  for (const p of SIGILO_POS) { p.re.lastIndex = 0; let m; while ((m = p.re.exec(texto))) sp.push({ ini: m.index, fim: m.index + m[0].length, tipo: p.tipo, chave: m[0].replace(/\D/g, '') || dobra(m[0]) }); }
  // nomes conhecidos: comparacao sem acento/caixa (a dobra preserva o comprimento em NFC na pratica; confere borda)
  const tDob = dobra(texto);
  if (tDob.length === texto.length) {
    for (const n of nomes) {
      const k = dobra(n).replace(/\s+/g, ' ').trim(); let p = 0;
      while ((p = tDob.indexOf(k, p)) >= 0) {
        const f = p + k.length;
        if (!(p > 0 && PALAVRA_RE.test(tDob[p - 1])) && !(f < tDob.length && PALAVRA_RE.test(tDob[f]))) sp.push({ ini: p, fim: f, tipo: 'cliente', chave: k });
        p = f;
      }
    }
  }
  return sp.sort((x, y) => x.ini - y.ini || y.fim - x.fim);
}
/** Tokens do texto; os que caem num trecho sigiloso viram UM marcador (mesmo dado = mesmo marcador nos dois lados). */
function tokenizar(texto, sp, marcas) {
  const toks = []; TOKEN.lastIndex = 0; let m;
  while ((m = TOKEN.exec(texto))) {
    const ini = m.index, fim = ini + m[0].length;
    const s = sp.find((x) => ini < x.fim && fim > x.ini);
    if (s) {
      const ult = toks[toks.length - 1];
      if (ult && ult.sigilo === s) { ult.fim = Math.max(ult.fim, fim); continue; }
      const chave = s.tipo + ':' + s.chave;
      if (!marcas.has(chave)) marcas.set(chave, '[' + s.tipo.toUpperCase() + '_' + (marcas.size + 1) + ']');
      toks.push({ t: marcas.get(chave), ini, fim, sigilo: s, tipo: s.tipo });
    } else toks.push({ t: m[0], ini, fim });
  }
  return toks;
}
const ehPalavra = (k) => !k.sigilo && PALAVRA_RE.test(k.t);
const ehGenerica = (ks) => {
  const pal = ks.filter(ehPalavra);
  if (!pal.length) return true;
  if (pal.reduce((n, k) => n + k.t.replace(/[^\p{L}\p{N}]/gu, '').length, 0) < 5) return true;
  return pal.every((k) => VAZIAS.has(k.t.toLowerCase()) || /^[\d.,ªº°oa]+$/i.test(k.t));
};
const CLS = { a: '[aáàâãª]', e: '[eéèê]', i: '[iíìî]', o: '[oóòôõº°]', u: '[uúùü]', c: '[cç]' };
const ESC = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** Regex de uma sequencia de tokens. nivel 2 = acentos+º/ª+caixa+espacos; 1 = º/ª+caixa+espacos; 0 = caixa+espacos. */
function regexDe(toks, texto, nivel) {
  let p = '';
  toks.forEach((k, x) => {
    if (x) p += /\s/.test(texto.slice(toks[x - 1].fim, k.ini)) ? '\\s+' : '\\s*';
    if (!PALAVRA_RE.test(k.t)) { p += ESC(k.t); return; }
    let ant = '';
    for (const ch of k.t.normalize('NFC')) {
      const base = dobra(ch);
      if (nivel >= 1 && (ch === 'ª' || (/\d/.test(ant) && base === 'a'))) p += '[ªa]';
      else if (nivel >= 1 && (ch === 'º' || ch === '°' || (/\d/.test(ant) && base === 'o'))) p += '[º°o]';
      else if (nivel >= 2 && CLS[base]) p += CLS[base] + '\\p{M}?'; // \p{M}?: acento decomposto (NFD, macOS)
      else p += ESC(nivel >= 2 ? base : ch.toLowerCase());
      ant = ch;
    }
  });
  return p;
}
const BORDA_I = '(?<![\\p{L}\\p{N}])', BORDA_F = '(?![\\p{L}\\p{N}])';
const TOLERA = [['espaços', 'maiúsculas', 'acentos', 'º/ª'], ['espaços', 'maiúsculas', 'º/ª'], ['espaços', 'maiúsculas']];

/**
 * Sugere {padrao, exemplo, certo, licao, mensagem} a partir do trecho errado e do corrigido.
 * Falha => { ok:false, motivo: 'uso'|'vazio'|'pontuacao'|'caixa'|'reescrita'|'sigilo'|'sem-padrao', mensagem }.
 */
function sugerirPadrao(antes, depois, opts) {
  opts = opts || {};
  antes = String(antes || '').normalize('NFC').trim(); depois = String(depois || '').normalize('NFC').trim();
  const falha = (motivo, mensagem, extra) => Object.assign({ ok: false, motivo, mensagem }, extra || {});
  if (!antes || !depois) return falha('uso', 'Preciso dos dois trechos: o que estava escrito (--antes) e como ficou certo (--depois).');
  if (antes.length > 2000 || depois.length > 2000) return falha('reescrita', 'Os trechos são longos demais para achar um padrão. Cole só a frase em que estava o erro.');
  const nomes = opts.nomes || nomesConhecidos();
  const marcas = new Map();
  const A = tokenizar(antes, trechosSigilosos(antes, nomes), marcas), B = tokenizar(depois, trechosSigilosos(depois, nomes), marcas);
  let i0 = 0; while (i0 < A.length && i0 < B.length && A[i0].t === B[i0].t) i0++;
  let s = 0; while (s < A.length - i0 && s < B.length - i0 && A[A.length - 1 - s].t === B[B.length - 1 - s].t) s++;
  const ra = A.slice(i0, A.length - s), rb = B.slice(i0, B.length - s);
  const tiposSig = [...new Set(A.concat(B).filter((k) => k.sigilo).map((k) => NOME_TIPO[k.tipo] || k.tipo))];
  if (!ra.length && !rb.length) return falha('vazio', 'Não vi diferença entre os dois trechos (só espaços, ou são iguais). Não há o que registrar.');
  const sig = ra.concat(rb).filter((k) => k.sigilo);
  if (sig.length) return falha('sigilo', 'A correção é no próprio dado do cliente (' + [...new Set(sig.map((k) => NOME_TIPO[k.tipo] || k.tipo))].join(', ') + '). Isso não vira aviso: o aviso guardaria esse dado fora da pasta do caso. Corrija direto na peça e, se precisar, no DOSSIÊ do caso.');
  if (ra.concat(rb).every((k) => !PALAVRA_RE.test(k.t))) return falha('pontuacao', 'A correção foi só de pontuação. Isso não dá um aviso seguro (pegaria texto certo demais).');
  if (ra.length === rb.length && ra.every((k, x) => k.t.toLowerCase() === rb[x].t.toLowerCase())) return falha('caixa', 'A correção foi só de maiúscula/minúscula. O aviso não distingue isso; anote como preferência (memoria.js preferir).');
  if (ra.filter(ehPalavra).length > 6 || rb.filter(ehPalavra).length > 10) return falha('reescrita', 'Foi uma reescrita grande, não uma troca de palavra ou expressão. Não dá para tirar um aviso seguro daí.');
  // contexto: k palavras de cada lado (vazias e pontuacao vem de graca), sem atravessar dado sigiloso
  const ctx = (lado, n) => {
    let x = lado < 0 ? i0 : A.length - s, cont = 0;
    const lim = lado < 0 ? 0 : A.length;
    let fimOk = x;
    while (cont < n && x !== lim) {
      const k = lado < 0 ? A[x - 1] : A[x];
      if (k.sigilo) break;
      x += lado;
      if (ehPalavra(k) && !VAZIAS.has(k.t.toLowerCase())) { cont++; fimOk = x; }
    }
    return cont ? fimOk : (lado < 0 ? i0 : A.length - s);
  };
  const generico = ehGenerica(ra) || !ra.length || !rb.length;
  const pares = generico ? [[1, 1], [2, 1], [1, 2], [2, 2], [1, 0], [0, 1], [2, 0], [0, 2]] : [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]];
  const vistos = new Set();
  for (const [L, R] of pares) {
    const a0 = ctx(-1, L), a1 = ctx(1, R);
    if (a0 === a1 || vistos.has(a0 + ':' + a1)) continue;
    vistos.add(a0 + ':' + a1);
    const nucleo = A.slice(a0, a1);
    if (!nucleo.some(ehPalavra)) continue;
    const b0 = a0, b1 = B.length - (A.length - a1); // contexto e comum aos dois lados
    const exemplo = antes.slice(nucleo[0].ini, nucleo[nucleo.length - 1].fim);
    const certoT = B.slice(b0, b1); const certo = certoT.length ? depois.slice(certoT[0].ini, certoT[certoT.length - 1].fim) : '';
    for (let nv = 2; nv >= 0; nv--) {
      let p = regexDe(nucleo, antes, nv);
      if (PALAVRA_RE.test(nucleo[0].t)) p = BORDA_I + p;
      if (PALAVRA_RE.test(nucleo[nucleo.length - 1].t)) p += BORDA_F;
      // insercao pura: o erro e a falta do trecho => "X sem Y logo depois/antes"
      if (!ra.length && a1 === A.length - s) p += '(?!\\s*' + regexDe(rb, depois, nv) + ')';
      else if (!ra.length && a0 === i0) p = '(?<!' + regexDe(rb, depois, nv) + '\\s*)' + p;
      if (validarPadrao(p, exemplo, certo).length) continue;
      let re; try { re = new RegExp(p, 'iu'); } catch (e) { continue; }
      if (!re.test(antes) || re.test(depois)) continue;
      const licao = (opts.licao || ('Escrever "' + certo + '", não "' + exemplo + '"')).slice(0, 300);
      if (c.acharSigilo([p, exemplo, certo, licao].join(' ')).length) continue;
      const onde = opts.escopo === 'tudo' ? 'nas peças e anotações' : 'em peças';
      const falta = !ra.length ? ' sem "' + rb.map((k) => k.t).join(' ').replace(/ ([.,;:!?)])/g, '$1') + '"' : '';
      const omitido = tiposSig.length ? ' (Deixei de fora do aviso o ' + tiposSig.join(', ') + ' que estava no trecho: dado do cliente não vai para a memória.)' : '';
      return {
        ok: true, padrao: p, exemplo, certo, licao, escopo: opts.escopo === 'tudo' ? 'tudo' : 'pecas', tolerancia: TOLERA[2 - nv], omitidos: tiposSig,
        mensagem: 'Entendi o erro: escrevi "' + exemplo + '", o certo é "' + certo + '". Vou passar a avisar sempre que aparecer "' + exemplo + '"' + falta + ' ' + onde + '. Confirma?' + omitido,
      };
    }
  }
  return falha('sem-padrao', 'Não achei um padrão seguro para essa correção (ele acusaria também o texto certo ou ficaria genérico demais).');
}

module.exports = { registrar, verificar, marcarDisparos, texto, remover, nivel, ler, validarPadrao, sugerirPadrao, arquivo: arq };
