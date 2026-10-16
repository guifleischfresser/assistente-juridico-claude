'use strict';
/*
 * Biblioteca comum dos scripts do Advogado Claude Mod.
 * Regras: so modulos nativos do Node (sem npm), nada de rede, falhar "aberto"
 * (um erro no hook nunca deve travar o trabalho do advogado), UTF-8 sempre.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const VERSAO = '0.2.0';

function dirClaude() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}
function dirBase() {
  return process.env.ADVOGADO_BASE || path.join(dirClaude(), 'advogado');
}
const P = {
  get claude() { return dirClaude(); },
  get base() { return dirBase(); },
  get config() { return path.join(dirBase(), 'config.json'); },
  get estado() { return path.join(dirBase(), 'estado'); },
  get logs() { return path.join(dirBase(), 'logs'); },
  get hab() { return path.join(dirBase(), 'habilidades'); },
  get skillsVivas() { return path.join(dirClaude(), 'skills'); },
};

function garantirDir(d) {
  try { fs.mkdirSync(d, { recursive: true }); } catch (e) { /* ignora */ }
  return d;
}

function lerJSON(arq, padrao) {
  try { return JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^\uFEFF/, '')); }
  catch (e) { return padrao; }
}

function gravarJSON(arq, obj) {
  garantirDir(path.dirname(arq));
  const tmp = arq + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, arq);
}

function config() {
  const c = lerJSON(P.config, {}) || {};
  if (!c.escritorio) c.escritorio = path.join(os.homedir(), 'ESCRITORIO');
  if (!c.limiteContexto) c.limiteContexto = 75;
  if (!c.limites) c.limites = {};
  c.limites.skillsPorDia = c.limites.skillsPorDia || 3;
  c.limites.skillsAtivas = c.limites.skillsAtivas || 30;
  c.limites.falhasParaAposentar = c.limites.falhasParaAposentar || 2;
  c.limites.repeticoesParaSugerir = c.limites.repeticoesParaSugerir || 3;
  return c;
}

/** Le todo o stdin (JSON do Claude Code). Nunca lanca. */
function lerEntrada() {
  return new Promise((resolve) => {
    let dados = '';
    if (process.stdin.isTTY) return resolve({});
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { dados += c; });
    process.stdin.on('end', () => {
      try { resolve(dados.trim() ? JSON.parse(dados) : {}); } catch (e) { resolve({}); }
    });
    process.stdin.on('error', () => resolve({}));
    setTimeout(() => { try { resolve(dados ? JSON.parse(dados) : {}); } catch (e) { resolve({}); } }, 4000).unref();
  });
}

/** Escreve o JSON de saida do hook e encerra com codigo 0. */
function responder(obj) {
  if (obj && Object.keys(obj).length) process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

function log(nome, msg) {
  try {
    garantirDir(P.logs);
    fs.appendFileSync(path.join(P.logs, nome + '.log'), new Date().toISOString() + ' ' + msg + '\n', 'utf8');
  } catch (e) { /* ignora */ }
}

/** Executa o corpo do hook; qualquer excecao vira log + saida silenciosa (falha aberta). */
function rodarHook(nome, corpo) {
  lerEntrada().then((entrada) => Promise.resolve(corpo(entrada || {})))
    .then((saida) => responder(saida || {}))
    .catch((e) => { log('erros', '[' + nome + '] ' + (e && e.stack || e)); process.exit(0); });
}

/** Normaliza caminho para comparacao (barras, caixa no Windows). */
function norm(p) {
  if (!p) return '';
  let r = path.resolve(String(p)).replace(/\\/g, '/');
  if (process.platform === 'win32') r = r.toLowerCase();
  return r;
}
function dentroDe(arquivo, pasta) {
  const a = norm(arquivo), b = norm(pasta).replace(/\/+$/, '');
  return a === b || a.startsWith(b + '/');
}

function carimbo(d) {
  d = d || new Date();
  const z = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '_' + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds());
}
function hojeISO(d) {
  d = d || new Date();
  const z = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}

/** Estado por sessao (arquivos lidos, handoff ja disparado etc.). */
function arqSessao(id) {
  return path.join(P.estado, 'sessao-' + String(id || 'sem-id').replace(/[^\w.-]/g, '_') + '.json');
}
function lerSessao(id) { return lerJSON(arqSessao(id), { lidos: [], handoffs: [] }); }
function gravarSessao(id, s) { gravarJSON(arqSessao(id), s); }

/** Copia arquivo para pasta de versoes antes de editar. Retorna destino ou null. */
function versionar(arquivo, pastaVersoes, raizRelativa) {
  try {
    if (!fs.existsSync(arquivo) || !fs.statSync(arquivo).isFile()) return null;
    let rel = path.basename(arquivo);
    if (raizRelativa && dentroDe(arquivo, raizRelativa)) rel = path.relative(raizRelativa, arquivo);
    const destino = path.join(pastaVersoes, path.dirname(rel), carimbo() + '__' + path.basename(rel));
    garantirDir(path.dirname(destino));
    fs.copyFileSync(arquivo, destino);
    return destino;
  } catch (e) { log('erros', 'versionar: ' + e.message); return null; }
}

/** Frontmatter YAML minimo (chave: valor, listas simples e mapas de 1 nivel). */
function lerFrontmatter(texto) {
  texto = String(texto || '').replace(/^\uFEFF/, '');
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { ok: false, dados: {}, corpo: texto };
  const dados = {}; let chaveMapa = null;
  for (const linha of m[1].split(/\r?\n/)) {
    if (!linha.trim() || linha.trim().startsWith('#')) continue;
    const item = linha.match(/^\s+-\s+(.*)$/);
    if (item && chaveMapa) {
      if (!Array.isArray(dados[chaveMapa])) dados[chaveMapa] = [];
      dados[chaveMapa].push(limparValor(item[1])); continue;
    }
    const sub = linha.match(/^\s{2,}([\w-]+):\s*(.*)$/);
    if (sub && chaveMapa && !Array.isArray(dados[chaveMapa])) { dados[chaveMapa][sub[1]] = limparValor(sub[2]); continue; }
    const kv = linha.match(/^([\w-]+):\s*(.*)$/);
    if (kv) {
      if (kv[2] === '') { dados[kv[1]] = {}; chaveMapa = kv[1]; } else { dados[kv[1]] = limparValor(kv[2]); chaveMapa = null; }
    }
  }
  return { ok: true, dados, corpo: m[2] };
}
function limparValor(v) {
  v = String(v).trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\(["\\])/g, '$1');
  else if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
  return v;
}

/** Problemas de YAML que fazem o Claude Code descartar o frontmatter inteiro em silencio. */
function problemasYaml(texto) {
  const m = String(texto || '').replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [];
  const probs = [];
  m[1].split(/\r?\n/).forEach((linha, i) => {
    const kv = linha.match(/^\s*(?:-\s+)?([\w-]+):\s+(.+)$/);
    if (!kv) return;
    const v = kv[2].trim();
    if (/^["']/.test(v)) { if (v[v.length - 1] !== v[0]) probs.push('linha ' + (i + 2) + ': aspas de "' + kv[1] + '" não fechadas'); return; }
    if (/^[{&*!|>%@`]/.test(v) || (v[0] === '[' && !/^\[[\w\s,*()\-]*\]$/.test(v))) probs.push('linha ' + (i + 2) + ': valor de "' + kv[1] + '" começa com caractere especial — coloque entre aspas duplas');
    else if (/:\s/.test(v) || /\s#/.test(v) || /:$/.test(v)) probs.push('linha ' + (i + 2) + ': valor de "' + kv[1] + '" contém ": " ou " #" — coloque entre aspas duplas');
  });
  return probs;
}

/** Padroes de dados pessoais/sigilosos (LGPD) usados por varios guardas. */
const PADROES_SIGILO = [
  { nome: 'CPF', re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/ },
  { nome: 'CNPJ', re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/ },
  { nome: 'numero de processo (CNJ)', re: /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/ },
  { nome: 'RG', re: /\bRG\s*(n[ºo°.]*\s*)?[\d.]{5,}-?[\dxX]?\b/i },
  { nome: 'e-mail', re: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/ },
  { nome: 'telefone', re: /\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/ },
];
function acharSigilo(texto) {
  const achados = [];
  for (const p of PADROES_SIGILO) if (p.re.test(String(texto || ''))) achados.push(p.nome);
  return achados;
}

module.exports = {
  problemasYaml,
  VERSAO, P, garantirDir, lerJSON, gravarJSON, config, lerEntrada, responder, log, rodarHook,
  norm, dentroDe, carimbo, hojeISO, lerSessao, gravarSessao, versionar, lerFrontmatter, acharSigilo,
};
