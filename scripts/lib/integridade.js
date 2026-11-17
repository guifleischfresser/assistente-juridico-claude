'use strict';
/*
 * Integridade do nucleo do mod (§21). Tudo local, Node puro, sem rede.
 * Motivo: uma chave vazada ja permitiu publicar versoes adulteradas de uma extensao. Aqui o assistente
 * guarda o SHA-256 de cada arquivo do nucleo no momento em que o fluxo OFICIAL o grava (instalacao,
 * /consertar, atualizacao do plugin) e, a cada conversa, confere se algo mudou por fora.
 *
 * Nucleo = scripts/** + hooks/hooks.json + skills do nucleo (pastas de skills/ do pacote, a mesma lista
 * do instalador) + bloco do mod no CLAUDE.md global. Fora: auto-*, skills de terceiros, ESCRITORIO,
 * CASOS, config, logs e _versoes. O manifesto guarda so caminhos relativos do pacote e hashes:
 * nenhum dado de cliente.
 *
 * Manifesto: ~/.claude/advogado/integridade.json { versao, geradoEm, origem, modo, arquivos: { rel: sha256 } }
 * Onde cada chave e conferida:
 *   scripts/...           -> ~/.claude/advogado/scripts/... (e, no modo plugin, tambem <raiz-do-plugin>/scripts/...)
 *   hooks/hooks.json      -> <raiz-do-plugin>/hooks/hooks.json (plugin) ou ~/.claude/advogado/pacote/hooks/hooks.json
 *   skills/<n>/...        -> <raiz-do-plugin>/skills/<n>/... (plugin) ou ~/.claude/skills/<n>/...
 *   CLAUDE.md#advogado    -> bloco entre as marcas do mod em ~/.claude/CLAUDE.md
 * Nunca lanca para o hook: conferir() devolve estado 'sem-manifesto' | 'ilegivel' em vez de erro.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./comum');

const VERSAO_MANIFESTO = 1;
const CHAVE_MD = 'CLAUDE.md#advogado';
const MARCA_INI = '<!-- advogado-claude-mod:inicio -->';
const MARCA_FIM = '<!-- advogado-claude-mod:fim -->';
// lixo de sistema que aparece sozinho em pastas (nao e alteracao do nucleo)
const IGNORAR = /^(\.DS_Store|Thumbs\.db|desktop\.ini|\._.*|.*~|.*\.tmp-\d+|_versoes|node_modules|__pycache__)$/i;

// mesmo SHA-256 da auditoria de skills de terceiros (lib/auditoria.js)
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const arquivo = () => path.join(c.P.base, 'integridade.json');

/** Lista recursiva de arquivos (caminhos relativos com "/"), ordenada; ignora lixo de sistema e _versoes. */
function listar(dir, rel, out) {
  out = out || [];
  let nomes = []; try { nomes = fs.readdirSync(dir).sort(); } catch (e) { return out; }
  for (const n of nomes) {
    if (IGNORAR.test(n)) continue;
    const a = path.join(dir, n), r = rel ? rel + '/' + n : n;
    let st; try { st = fs.lstatSync(a); } catch (e) { continue; }
    if (st.isDirectory()) listar(a, r, out); else out.push(r);
  }
  return out;
}

/** O rel do pacote faz parte do nucleo? (usado tambem pelo empacotar.js sobre a lista do zip) */
function ehNucleo(rel, nucleo) {
  const p = String(rel).split('/');
  if (p.some((s) => IGNORAR.test(s))) return false;
  if (p[0] === 'scripts' && p.length > 1) return true;
  if (rel === 'hooks/hooks.json') return true;
  if (p[0] === 'skills' && p.length > 2 && !/^auto-/.test(p[1])) return !nucleo || nucleo.includes(p[1]);
  return false;
}

/** Skills do nucleo: as pastas de skills/ do pacote (exatamente o que o instalador copia), sem auto-*. */
function skillsDoNucleo(raiz) {
  try { return fs.readdirSync(path.join(raiz, 'skills')).filter((n) => !IGNORAR.test(n) && !/^auto-/.test(n) && fs.statSync(path.join(raiz, 'skills', n)).isDirectory()).sort(); } catch (e) { /* */ }
  try { return require('./validar').NUCLEO.slice().sort(); } catch (e) { return []; }
}

/** Texto do bloco do mod no CLAUDE.md global (null se nao houver). */
function blocoClaudeMd(arq) {
  let t = ''; try { t = fs.readFileSync(arq || path.join(c.P.claude, 'CLAUDE.md'), 'utf8'); } catch (e) { return null; }
  const i = t.indexOf(MARCA_INI), f = t.indexOf(MARCA_FIM, i + 1);
  if (i < 0 || f < 0) return null;
  return t.slice(i, f + MARCA_FIM.length).replace(/\r\n/g, '\n');
}

/** Hashes do nucleo a partir de uma pasta de PACOTE (repo, zip extraido, pacote local ou raiz do plugin). */
function hashesDoPacote(raiz) {
  const arquivos = {};
  const nucleo = skillsDoNucleo(raiz);
  for (const r of listar(path.join(raiz, 'scripts'), 'scripts')) arquivos[r] = sha(fs.readFileSync(path.join(raiz, r)));
  const hj = path.join(raiz, 'hooks', 'hooks.json');
  if (fs.existsSync(hj)) arquivos['hooks/hooks.json'] = sha(fs.readFileSync(hj));
  for (const n of nucleo) for (const r of listar(path.join(raiz, 'skills', n), 'skills/' + n)) arquivos[r] = sha(fs.readFileSync(path.join(raiz, r)));
  return { arquivos, nucleo };
}

/** Manifesto a partir de uma lista [{rel, dados}] (empacotar.js: so o que vai no zip). */
function manifestoDeLista(lista, opts) {
  opts = opts || {};
  const nucleo = Array.from(new Set(lista.map((x) => x.rel.split('/')).filter((p) => p[0] === 'skills' && p.length > 2 && !/^auto-/.test(p[1])).map((p) => p[1]))).sort();
  const arquivos = {};
  for (const x of lista.slice().sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))) if (ehNucleo(x.rel, nucleo)) arquivos[x.rel] = sha(x.dados);
  return { versao: opts.versao || c.VERSAO, formato: VERSAO_MANIFESTO, geradoEm: opts.geradoEm || new Date().toISOString(), origem: opts.origem || 'pacote', modo: null, nucleo, arquivos };
}

/** Pasta do plugin registrada (modo plugin) ou null. */
function raizPlugin(cfg) {
  cfg = cfg || c.config();
  if (!cfg.modoPlugin) return null;
  const p = c.lerJSON(path.join(c.P.base, 'plugin.json'), null);
  const r = (p && p.raiz) || cfg.raizPlugin || process.env.CLAUDE_PLUGIN_ROOT || null;
  return r && fs.existsSync(r) ? r : null;
}

/**
 * gerarManifesto(raiz, opts): hashes do PACOTE em `raiz` (o fluxo oficial grava a partir da fonte, nunca
 * do que esta instalado: assim um arquivo mexido nao e "abencoado" por uma reinstalacao) + o bloco do
 * CLAUDE.md global como esta agora (o instalador acabou de grava-lo). opts.claudeMd: false = sem bloco;
 * opts.manterClaudeMd: reaproveita o hash do bloco do manifesto anterior (atualizacao do plugin).
 */
function gerarManifesto(raiz, opts) {
  opts = opts || {};
  const { arquivos, nucleo } = hashesDoPacote(raiz);
  if (opts.claudeMd !== false) {
    const ant = opts.manterClaudeMd ? lerManifesto().manifesto : null;
    if (ant && ant.arquivos && ant.arquivos[CHAVE_MD]) arquivos[CHAVE_MD] = ant.arquivos[CHAVE_MD];
    else { const b = blocoClaudeMd(); if (b != null) arquivos[CHAVE_MD] = sha(Buffer.from(b, 'utf8')); }
  }
  const cfg = c.config();
  return { versao: c.VERSAO, formato: VERSAO_MANIFESTO, geradoEm: opts.geradoEm || new Date().toISOString(), origem: opts.origem || 'instalacao', modo: cfg.modoPlugin || opts.modoPlugin ? 'plugin' : 'instalador', nucleo, arquivos };
}

/** Grava o manifesto (so pelos fluxos oficiais: instalar.js, doutor --consertar, plugin, aceitar --confirmo). */
function gravarManifesto(m) {
  c.garantirDir(c.P.base);
  const tmp = arquivo() + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(m, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, arquivo());
  return arquivo();
}

function lerManifesto() {
  const a = arquivo();
  if (!fs.existsSync(a)) return { estado: 'sem-manifesto', manifesto: null };
  try {
    const m = JSON.parse(fs.readFileSync(a, 'utf8').replace(/^﻿/, ''));
    if (!m || typeof m.arquivos !== 'object' || !m.arquivos || Array.isArray(m.arquivos) || !Object.values(m.arquivos).every((h) => /^[0-9a-f]{64}$/.test(h))) return { estado: 'ilegivel', manifesto: null };
    return { estado: 'ok', manifesto: m };
  } catch (e) { return { estado: 'ilegivel', manifesto: null }; }
}

/** Onde cada parte do nucleo esta instalada neste computador. */
function locais(cfg) {
  cfg = cfg || c.config();
  const rp = raizPlugin(cfg);
  return {
    plugin: rp,
    scripts: path.join(c.P.base, 'scripts'),
    hooks: rp ? path.join(rp, 'hooks', 'hooks.json') : path.join(c.P.base, 'pacote', 'hooks', 'hooks.json'),
    skills: rp ? path.join(rp, 'skills') : c.P.skillsVivas,
    claudeMd: path.join(c.P.claude, 'CLAUDE.md'),
  };
}

/** Hashes do que esta instalado agora, com as mesmas chaves do manifesto. */
function hashesInstalados(manifesto, cfg) {
  const L = locais(cfg);
  const atual = {};
  const ler = (k, a) => { try { atual[k] = sha(fs.readFileSync(a)); } catch (e) { /* faltando */ } };
  for (const r of listar(L.scripts, 'scripts')) ler(r, path.join(L.scripts, r.slice('scripts/'.length)));
  if (L.plugin) for (const r of listar(path.join(L.plugin, 'scripts'), 'scripts')) ler('plugin/' + r, path.join(L.plugin, r));
  ler('hooks/hooks.json', L.hooks);
  const nucleo = (manifesto && Array.isArray(manifesto.nucleo) && manifesto.nucleo.length) ? manifesto.nucleo
    : Array.from(new Set(Object.keys((manifesto && manifesto.arquivos) || {}).filter((k) => k.startsWith('skills/')).map((k) => k.split('/')[1])));
  for (const n of nucleo) for (const r of listar(path.join(L.skills, n), 'skills/' + n)) ler(r, path.join(L.skills, r.slice('skills/'.length)));
  const b = blocoClaudeMd(L.claudeMd);
  if (b != null) atual[CHAVE_MD] = sha(Buffer.from(b, 'utf8'));
  return { atual, locais: L };
}

/**
 * conferir() -> { estado: 'ok'|'alterado'|'sem-manifesto'|'ilegivel', alterados, faltando, novos, manifesto }
 * alterados/faltando/novos: chaves relativas (ex.: "scripts/guarda-sigilo.js", "plugin/scripts/x.js").
 */
function conferir(opts) {
  opts = opts || {};
  const vazio = { alterados: [], faltando: [], novos: [] };
  try {
    const lm = lerManifesto();
    if (lm.estado !== 'ok') return Object.assign({ estado: lm.estado, manifesto: null }, vazio);
    const m = lm.manifesto;
    const { atual, locais: L } = hashesInstalados(m, opts.cfg);
    const esperado = Object.assign({}, m.arquivos);
    // modo plugin: os hooks rodam os scripts da pasta do plugin; conferidos contra os mesmos hashes
    if (L.plugin) for (const k of Object.keys(m.arquivos)) if (k.startsWith('scripts/')) esperado['plugin/' + k] = m.arquivos[k];
    const alterados = [], faltando = [], novos = [];
    for (const [k, h] of Object.entries(esperado)) {
      if (!(k in atual)) faltando.push(k);
      else if (atual[k] !== h) alterados.push(k);
    }
    for (const k of Object.keys(atual)) if (!(k in esperado) && k !== CHAVE_MD) novos.push(k);
    const r = { estado: alterados.length || faltando.length || novos.length ? 'alterado' : 'ok', alterados: alterados.sort(), faltando: faltando.sort(), novos: novos.sort(), manifesto: { versao: m.versao, geradoEm: m.geradoEm, origem: m.origem, modo: m.modo, n: Object.keys(m.arquivos).length } };
    return r;
  } catch (e) {
    try { c.log('erros', 'integridade: ' + e.message); } catch (er) { /* */ }
    return Object.assign({ estado: 'ilegivel', manifesto: null, erro: e.message }, vazio);
  }
}

/** Confere uma pasta de PACOTE (pacote local, raiz do plugin, zip extraido) contra o manifesto. */
function conferirPacote(raiz, manifesto) {
  const { arquivos } = hashesDoPacote(raiz);
  const esp = {}; for (const [k, h] of Object.entries(manifesto.arquivos || {})) if (k !== CHAVE_MD) esp[k] = h;
  const alterados = [], faltando = [], novos = [];
  for (const [k, h] of Object.entries(esp)) { if (!(k in arquivos)) faltando.push(k); else if (arquivos[k] !== h) alterados.push(k); }
  for (const k of Object.keys(arquivos)) if (!(k in esp)) novos.push(k);
  return { ok: !alterados.length && !faltando.length && !novos.length, alterados, faltando, novos };
}

// ---------- linguagem do advogado (sem caminho de pasta, sem jargao) ----------
const NOMES = {
  'guarda-sigilo.js': 'a proteção de sigilo',
  'guarda-escrita.js': 'a proteção das suas peças',
  'sessao-inicio.js': 'a preparação do começo de cada conversa',
  'pos-ferramenta.js': 'a conferência de citações e de texto escondido',
  'registro-pedidos.js': 'o anotador de tarefas repetidas',
  'gatilho-handoff.js': 'o aviso de memória da conversa cheia',
  'statusline.js': 'a barrinha de baixo',
  'memoria.js': 'a memória do escritório',
  'doutor.js': 'o conserto automático (/consertar)',
  'instalar.js': 'o instalador',
  'integridade.js': 'a conferência dos arquivos do assistente',
};
/** "a proteção de sigilo (guarda-sigilo.js)" / "o atalho /processo" / "as regras do assistente". */
function descrever(k) {
  const p = String(k).replace(/^plugin\//, '').split('/');
  const nome = p[p.length - 1];
  if (k === CHAVE_MD) return 'as regras do assistente nas instruções do Claude';
  if (p[0] === 'hooks') return 'a lista das proteções que ligam sozinhas (hooks.json)';
  if (p[0] === 'skills') return 'o atalho /' + p[1] + (nome !== 'SKILL.md' ? ' (arquivo ' + nome + ')' : '');
  if (p[0] === 'scripts' && p[1] === 'lib') return 'uma peça interna das ferramentas do assistente (' + nome + ')';
  if (NOMES[nome]) return NOMES[nome] + ' (' + nome + ')';
  return 'a ferramenta ' + nome.replace(/\.js$/, '') + ' (' + nome + ')';
}

/** Frase para o advogado, com UM passo: /consertar. */
function mensagem(r) {
  if (!r || r.estado === 'ok') return '';
  if (r.estado === 'sem-manifesto') return 'Não achei a lista de conferência dos arquivos do assistente, então hoje não consigo garantir que nenhum deles foi mexido — digita /consertar que eu refaço a lista.';
  if (r.estado === 'ilegivel') return 'A lista de conferência dos arquivos do assistente ficou ilegível, então hoje não consigo garantir que nenhum deles foi mexido — digita /consertar que eu refaço a lista.';
  const grupo = (rot, ks) => (ks.length ? rot + ': ' + ks.slice(0, 3).map(descrever).join('; ') + (ks.length > 3 ? '; e mais ' + (ks.length - 3) : '') : null);
  const partes = [grupo('alterado', r.alterados), grupo('apagado', r.faltando), grupo('arquivo novo', r.novos)].filter(Boolean);
  return 'Um arquivo do próprio assistente foi mexido fora da instalação oficial (' + partes.join(' · ') + '). Pode ter sido um programa estranho ou alguém mexendo no computador — por segurança, digita /consertar que eu ponho de volta a versão original (guardo uma cópia do que mudou).';
}

/** Problema no formato do lib/diagnostico (aviso coloquial + tecnico + conserto). */
function problema(r) {
  if (!r || r.estado === 'ok') return null;
  const leve = r.estado !== 'alterado';
  const tecnico = leve ? 'integridade.json ' + r.estado + ' (' + arquivo() + ')'
    : 'Núcleo diferente do manifesto: alterados=' + (r.alterados.join(',') || '—') + ' faltando=' + (r.faltando.join(',') || '—') + ' novos=' + (r.novos.join(',') || '—') + '. Se o advogado mexeu de propósito: node "' + path.join(c.P.base, 'scripts', 'integridade.js') + '" aceitar --confirmo (só depois do "sim" dele).';
  return { id: 'integridade', nivel: leve ? 'aviso' : 'erro', aviso: mensagem(r), tecnico, conserto: 'integridade' };
}

/** Marca curta para "avisar uma vez por conversa". */
function marca(r) {
  return sha(Buffer.from(r.estado + '|' + r.alterados.join(',') + '|' + r.faltando.join(',') + '|' + r.novos.join(','))).slice(0, 16);
}

/** Caminho real, neste computador, de uma chave do manifesto (para o backup do /consertar). */
function caminhoLocal(k, L) {
  L = L || locais();
  if (k === CHAVE_MD) return L.claudeMd;
  if (k === 'hooks/hooks.json') return L.hooks;
  if (k.startsWith('plugin/') && L.plugin) return path.join(L.plugin, k.slice('plugin/'.length));
  if (k.startsWith('scripts/')) return path.join(L.scripts, k.slice('scripts/'.length));
  if (k.startsWith('skills/')) return path.join(L.skills, k.slice('skills/'.length));
  return null;
}

/** Atualiza so o hash do bloco do CLAUDE.md (memoria.js restaurou o bloco oficial). */
function atualizarBlocoClaudeMd() {
  const lm = lerManifesto(); if (lm.estado !== 'ok') return false;
  const b = blocoClaudeMd(); if (b == null) return false;
  lm.manifesto.arquivos[CHAVE_MD] = sha(Buffer.from(b, 'utf8'));
  gravarManifesto(lm.manifesto); return true;
}

module.exports = { caminhoLocal, hashesInstalados, gerarManifesto, gravarManifesto, lerManifesto, conferir, conferirPacote, manifestoDeLista, hashesDoPacote, ehNucleo, skillsDoNucleo, descrever, mensagem, problema, marca, locais, raizPlugin, atualizarBlocoClaudeMd, arquivo, sha, CHAVE_MD };
