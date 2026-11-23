'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./comum');

const PASTA_CHAVES = 'advogado-cofre-chaves';
const MSG = 'Cofre indisponível: verifique localmente a chave, a integridade e operações concorrentes. Se houver tabela antiga, use anonimizar.js migrar.';
const revisao = new WeakMap();
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const pastaChaves = () => path.resolve(c.P.claude, PASTA_CHAVES);
const SUFIXO_WORD = '-restaurado.docx';
const ehSaidaProtegida = (arq) => /(?:-restaurado\.docx|-dados-reais\.(?:md|txt|markdown|csv))/i.test(arq);

function stat(arq) {
  try { return fs.lstatSync(arq); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

// Verifica todos os componentes abaixo de uma raiz real, inclusive junções no Windows.
function seguro(raiz, alvo) {
  const rel = path.relative(raiz, alvo);
  if (path.isAbsolute(rel) || rel === '..' || rel.startsWith('..' + path.sep)) throw Error(MSG);
  let atual = raiz;
  for (const parte of rel.split(path.sep).filter(Boolean)) {
    if (process.platform === 'win32' && parte.includes(':')) throw Error(MSG);
    atual = path.join(atual, parte);
    const s = stat(atual);
    if (s && (s.isSymbolicLink() || c.norm(atual).normalize('NFC') !== c.norm(fs.realpathSync(atual)).normalize('NFC'))) throw Error(MSG);
  }
  return alvo;
}

function caminhos(pasta, escritorio = c.config().escritorio) {
  const raiz = fs.realpathSync(escritorio);
  const base = c.dentroDe(pasta, raiz) ? raiz : path.resolve(escritorio);
  const rel = path.relative(base, path.resolve(pasta));
  if (rel.split(path.sep).length !== 3 || rel.split(path.sep)[0] !== 'CASOS') throw Error(MSG);
  const caso = seguro(raiz, path.resolve(raiz, rel));
  if (!stat(caso)?.isDirectory()) throw Error(MSG);
  const dir = seguro(caso, path.join(caso, '_anonimizacao'));
  const claude = fs.realpathSync(c.P.claude);
  const chaves = seguro(claude, path.join(claude, PASTA_CHAVES));
  if (c.dentroDe(chaves, raiz)) throw Error(MSG);
  const permissoes = stat(chaves);
  if (permissoes && (!permissoes.isDirectory() || process.platform !== 'win32' &&
      ((permissoes.mode & 0o077) !== 0 || permissoes.uid !== process.getuid()))) throw Error(MSG);
  const identidade = fs.statSync(caso, { bigint: true });
  const id = hash([identidade.dev, identidade.ino, identidade.birthtimeNs].join(':'));
  return {
    caso, dir, id, chaves,
    cofre: seguro(caso, path.join(dir, 'cofre.json')),
    legado: seguro(caso, path.join(dir, 'tabela.json')),
    chave: seguro(chaves, path.join(chaves, id + '.key')),
    trava: seguro(chaves, path.join(chaves, id + '.lock')),
  };
}

function lerArquivo(arq, privado = false) {
  const s = stat(arq);
  if (!s) return null;
  if (!s.isFile() || s.nlink !== 1 || privado && process.platform !== 'win32' &&
      ((s.mode & 0o077) !== 0 || s.uid !== process.getuid())) throw Error(MSG);
  return fs.readFileSync(arq);
}

function validar(t) {
  if (!t || t.tipo !== 'tabela-anonimizacao' || t.versao !== 1 || !Array.isArray(t.entradas)) throw Error(MSG);
  const ids = new Set();
  for (const e of t.entradas) {
    if (!e || typeof e.id !== 'string' || typeof e.tipo !== 'string' || ids.has(e.id) ||
        !Array.isArray(e.formas) || !e.formas.length || e.formas.some((v) => typeof v !== 'string' || !v)) throw Error(MSG);
    ids.add(e.id);
  }
  return t;
}

const decodificar = (bytes) => validar(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')));
const aad = (p) => Buffer.from('advogado-cofre:v1:' + p.id);

function base64(valor) {
  if (typeof valor !== 'string') throw Error(MSG);
  const bytes = Buffer.from(valor, 'base64');
  if (bytes.toString('base64') !== valor) throw Error(MSG);
  return bytes;
}

function abrir(p, bytes, chave) {
  const env = JSON.parse(bytes.toString('utf8'));
  if (!chave || chave.length !== 32 || env?.v !== 1 || Object.keys(env).length !== 4) throw Error(MSG);
  const nonce = base64(env.nonce);
  const tag = base64(env.tag);
  if (nonce.length !== 12 || tag.length !== 16) throw Error(MSG);
  const cifra = crypto.createDecipheriv('aes-256-gcm', chave, nonce);
  cifra.setAAD(aad(p));
  cifra.setAuthTag(tag);
  return Buffer.concat([cifra.update(base64(env.dados)), cifra.final()]);
}

function estado(p) {
  const bytes = lerArquivo(p.cofre);
  const chave = lerArquivo(p.chave, true);
  if (!!bytes !== !!chave) throw Error(MSG);
  return { bytes, chave, legado: lerArquivo(p.legado) };
}

function ler(pasta, apenasCofre = false) {
  try {
    const p = caminhos(pasta);
    if (apenasCofre && stat(path.join(p.caso, '_descarte.jsonl'))) throw Error(MSG);
    const { bytes, chave, legado } = estado(p);
    if (!bytes && (!legado || apenasCofre)) return null;
    const dados = bytes ? abrir(p, bytes, chave) : legado;
    if (bytes && legado && !dados.equals(legado)) throw Error(MSG);
    const t = decodificar(dados);
    revisao.set(t, { id: p.id, hash: hash(bytes || legado) });
    return t;
  } catch (e) { throw Error(MSG); }
}

function exclusivo(arq, bytes) {
  const fd = fs.openSync(arq, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } catch (e) {
    fs.closeSync(fd);
    fs.unlinkSync(arq);
    throw e;
  }
  fs.closeSync(fd);
}

function comTrava(pasta, executar, escritorio) {
  const p = caminhos(pasta, escritorio);
  if (!stat(p.chaves)) {
    try { fs.mkdirSync(p.chaves, { mode: 0o700 }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  seguro(path.dirname(p.chaves), p.chaves);
  const s = fs.lstatSync(p.chaves);
  if (!s.isDirectory() || process.platform !== 'win32' &&
      ((s.mode & 0o077) !== 0 || s.uid !== process.getuid())) throw Error(MSG);
  fs.mkdirSync(p.trava, { mode: 0o700 });
  try { return executar(p); } finally { fs.rmdirSync(p.trava); }
}

function sincronizarPasta(pasta) {
  if (process.platform === 'win32') return;
  const fd = fs.openSync(pasta, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function publicar(p, dados, chaveExistente) {
  const chave = chaveExistente || crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv('aes-256-gcm', chave, nonce);
  cifra.setAAD(aad(p));
  const cifrado = Buffer.concat([cifra.update(dados), cifra.final()]);
  const bytes = Buffer.from(JSON.stringify({
    v: 1, nonce: nonce.toString('base64'), tag: cifra.getAuthTag().toString('base64'), dados: cifrado.toString('base64'),
  }));
  fs.mkdirSync(p.dir, { recursive: true, mode: 0o700 });
  const tmp = path.join(p.dir, 'cofre-' + crypto.randomUUID() + '.tmp');
  let novaChave = false;
  let publicado = false;
  exclusivo(tmp, bytes);
  try {
    if (!chaveExistente) {
      exclusivo(p.chave, chave);
      novaChave = true;
      sincronizarPasta(p.chaves);
      sincronizarPasta(path.dirname(p.chaves));
    }
    if (!abrir(p, lerArquivo(tmp), lerArquivo(p.chave, true)).equals(dados)) throw Error(MSG);
    fs.renameSync(tmp, p.cofre);
    publicado = true;
    sincronizarPasta(p.dir);
    sincronizarPasta(p.caso);
    if (!abrir(p, lerArquivo(p.cofre), lerArquivo(p.chave, true)).equals(dados)) throw Error(MSG);
    return bytes;
  } finally {
    if (!publicado) {
      if (stat(tmp)) fs.unlinkSync(tmp);
      if (novaChave) fs.unlinkSync(p.chave);
    }
  }
}

function gravar(pasta, t, aposGravar) {
  try {
    return comTrava(pasta, (p) => {
      if (stat(path.join(p.caso, '_descarte.jsonl'))) throw Error(MSG);
      const { bytes, chave, legado } = estado(p);
      const anterior = revisao.get(t);
      if (legado || (bytes ? !anterior || anterior.id !== p.id || anterior.hash !== hash(bytes) : anterior)) throw Error(MSG);
      if (bytes) abrir(p, bytes, chave);
      const persistir = (material) => {
        const dados = Buffer.from(JSON.stringify(validar(t)));
        const gravado = publicar(p, dados, material);
        revisao.set(t, { id: p.id, hash: hash(gravado) });
      };
      persistir(chave);
      if (aposGravar) {
        // Os IDs já estão persistidos. Publique os metadados só após gravar as cópias.
        aposGravar(p.caso);
        persistir(lerArquivo(p.chave, true));
      }
    });
  } catch (e) { throw Error(MSG); }
}

function migrar(pasta) {
  try {
    return comTrava(pasta, (p) => {
      const { bytes, chave, legado } = estado(p);
      const dados = bytes ? abrir(p, bytes, chave) : legado;
      if (!dados) return false;
      decodificar(dados);
      if (!legado) return false;
      if (bytes && !dados.equals(legado)) throw Error(MSG);
      if (stat(path.join(p.caso, '_descarte.jsonl'))) throw Error(MSG);
      if (!bytes) publicar(p, legado, null);
      sincronizarPasta(p.chaves);
      sincronizarPasta(p.dir);
      sincronizarPasta(p.caso);
      if (!lerArquivo(p.legado)?.equals(legado)) throw Error(MSG);
      fs.unlinkSync(p.legado);
      return true;
    });
  } catch (e) { throw Error(MSG); }
}

module.exports = { PASTA_CHAVES, SUFIXO_WORD, MSG, pastaChaves, ehSaidaProtegida, stat, seguro, caminhos, comTrava, ler, gravar, migrar };
