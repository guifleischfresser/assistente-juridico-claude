'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./comum');

const PASTA_CHAVES = 'advogado-cofre-chaves';
const MSG = 'Cofre indisponível: verifique localmente a chave, a integridade e operações concorrentes. Se houver tabela antiga, use anonimizar.js migrar.';
const ID = /^[a-f0-9]{32}$/;
const IDADE_TRAVA = 10 * 60 * 1000;
const revisao = new WeakMap();
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const pastaChaves = () => path.resolve(c.P.claude, PASTA_CHAVES);
const SUFIXO_WORD = '-restaurado.docx';
const ehSaidaProtegida = (arq) => /(?:-restaurado\.docx|-dados-reais\.(?:md|txt|markdown|csv))/i.test(arq);

function stat(arq) {
  try { return fs.lstatSync(arq); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

const realpath = fs.realpathSync.native;

// Aceita a grafia configurada da raiz ou a canônica, sem resolver atalhos abaixo dela.
function naRaiz(raiz, configurada, alvo) {
  const base = c.dentroDe(alvo, raiz) ? raiz : path.resolve(configurada);
  const rel = path.relative(base, path.resolve(alvo));
  if (path.isAbsolute(rel) || rel === '..' || rel.startsWith('..' + path.sep)) throw Error(MSG);
  return path.resolve(raiz, rel);
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
    if (s && (s.isSymbolicLink() || path.relative(atual.normalize('NFC'), realpath(atual).normalize('NFC')) !== '')) throw Error(MSG);
  }
  return alvo;
}

function caminhos(pasta, escritorio = c.config().escritorio) {
  const raiz = realpath(escritorio);
  const pastaCaso = naRaiz(raiz, escritorio, pasta);
  const rel = path.relative(raiz, pastaCaso);
  if (rel.split(path.sep).length !== 3 || !c.dentroDe(pastaCaso, path.join(raiz, 'CASOS'))) throw Error(MSG);
  const caso = seguro(raiz, pastaCaso);
  if (!stat(caso)?.isDirectory()) throw Error(MSG);
  const dir = seguro(caso, path.join(caso, '_anonimizacao'));
  const claude = realpath(c.P.claude);
  const chaves = seguro(claude, path.join(claude, PASTA_CHAVES));
  if (c.dentroDe(chaves, raiz)) throw Error(MSG);
  const permissoes = stat(chaves);
  if (permissoes && (!permissoes.isDirectory() || process.platform !== 'win32' &&
      ((permissoes.mode & 0o077) !== 0 || permissoes.uid !== process.getuid()))) throw Error(MSG);
  const cofre = seguro(caso, path.join(dir, 'cofre.json'));
  const pendente = seguro(caso, path.join(dir, 'cofre-id-pendente'));
  const bytes = lerArquivo(cofre);
  const env = bytes && JSON.parse(bytes.toString('utf8'));
  const reserva = lerArquivo(pendente)?.toString('utf8');
  if (reserva !== undefined && !ID.test(reserva) ||
      bytes && (!env || env.v !== 2 || !ID.test(env.id)) ||
      env && reserva && reserva !== env.id) throw Error(MSG);
  const id = env ? env.id : reserva;
  return {
    caso, dir, id, chaves, cofre, pendente, bytes,
    legado: seguro(caso, path.join(dir, 'tabela.json')),
    chave: id && seguro(chaves, path.join(chaves, id + '.key')),
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
const aad = (id) => Buffer.from('advogado-cofre:v2:' + id);
const cabecalhoPeca = (id) => '<!-- advogado-caso: ' + id + ' -->';
const vinculoPeca = /^<!-- advogado-caso: ([a-f0-9]{32}) -->[ \t]*(?:\r?\n|$)/gm;

function separarPeca(md, id) {
  const marcas = [...md.matchAll(vinculoPeca)];
  if (marcas.length !== 1 || marcas[0][1] !== id || marcas[0].index !== 0) return null;
  return md.replace(vinculoPeca, '');
}

function base64(valor) {
  if (typeof valor !== 'string') throw Error(MSG);
  const bytes = Buffer.from(valor, 'base64');
  if (bytes.toString('base64') !== valor) throw Error(MSG);
  return bytes;
}

function abrir(id, bytes, chave) {
  const env = JSON.parse(bytes.toString('utf8'));
  if (!chave || chave.length !== 32 || env?.v !== 2 || Object.keys(env).length !== 5 || env.id !== id) throw Error(MSG);
  const nonce = base64(env.nonce);
  const tag = base64(env.tag);
  if (nonce.length !== 12 || tag.length !== 16) throw Error(MSG);
  const cifra = crypto.createDecipheriv('aes-256-gcm', chave, nonce);
  cifra.setAAD(aad(id));
  cifra.setAuthTag(tag);
  return Buffer.concat([cifra.update(base64(env.dados)), cifra.final()]);
}

const lerChave = (p) => p.chave ? lerArquivo(p.chave, true) : null;

function estado(p) {
  const chave = lerChave(p);
  if (p.bytes && (!p.id || !chave)) throw Error(MSG);
  return { bytes: p.bytes, chave, legado: lerArquivo(p.legado) };
}

function ler(pasta, apenasCofre = false) {
  try {
    const p = caminhos(pasta);
    if (apenasCofre && stat(path.join(p.caso, '_descarte.jsonl'))) throw Error(MSG);
    const { bytes, chave, legado } = estado(p);
    if (!bytes && (!legado || apenasCofre)) return null;
    const dados = bytes ? abrir(p.id, bytes, chave) : legado;
    if (bytes && legado && !dados.equals(legado)) throw Error(MSG);
    const t = decodificar(dados);
    revisao.set(t, { id: p.id, hash: hash(bytes || legado) });
    return t;
  } catch (e) { throw Error(MSG); }
}

function exclusivo(arq, bytes) {
  const fd = fs.openSync(arq, 'wx', 0o600);
  try {
    try {
      fs.writeFileSync(fd, bytes);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    fs.unlinkSync(arq);
    throw e;
  }
}

function liberarTravaVelha(trava) {
  const s = stat(trava);
  if (!s?.isDirectory() || Date.now() - s.mtimeMs < IDADE_TRAVA) throw Error(MSG);
  const donos = fs.readdirSync(trava);
  if (donos.length) {
    const dono = /^(\d+)-[a-f0-9-]+$/.exec(donos[0]);
    const pid = Number(dono?.[1]);
    if (donos.length !== 1 || !Number.isSafeInteger(pid) || pid < 1) throw Error(MSG);
    try { process.kill(pid, 0); throw Error(MSG); }
    catch (e) { if (e.code !== 'ESRCH') throw e; }
    fs.unlinkSync(path.join(trava, donos[0]));
  }
  fs.rmdirSync(trava);
}

function sobTrava(chaves, nome, executar) {
  const trava = seguro(chaves, path.join(chaves, nome + '.lock'));
  const dono = process.pid + '-' + crypto.randomUUID();
  const tmp = path.join(chaves, '.trava-' + dono);
  fs.mkdirSync(tmp, { mode: 0o700 });
  try {
    exclusivo(path.join(tmp, dono), '');
    if (stat(trava)) liberarTravaVelha(trava);
    fs.renameSync(tmp, trava);
    try { return executar(); }
    finally {
      fs.unlinkSync(path.join(trava, dono));
      fs.rmdirSync(trava);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function comTrava(pasta, executar, escritorio) {
  const inicial = caminhos(pasta, escritorio);
  try { fs.mkdirSync(inicial.chaves, { mode: 0o700 }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  caminhos(pasta, escritorio);
  return sobTrava(inicial.chaves, 'pasta-' + hash(c.norm(inicial.caso).normalize('NFC')), () => {
    const p = caminhos(pasta, escritorio);
    return p.id ? sobTrava(p.chaves, p.id, () => executar(caminhos(pasta, escritorio))) : executar(p);
  });
}

function sincronizarPasta(pasta) {
  if (process.platform === 'win32') return;
  const fd = fs.openSync(pasta, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function publicar(p, dados, chaveExistente) {
  if (!p.id) {
    const id = crypto.randomBytes(16).toString('hex');
    fs.mkdirSync(p.dir, { recursive: true, mode: 0o700 });
    gravarAtomico(p.pendente, id, 'cofre-');
    sincronizarPasta(p.dir);
    sincronizarPasta(p.caso);
    p.id = id;
    p.chave = seguro(p.chaves, path.join(p.chaves, id + '.key'));
  }
  if (chaveExistente && chaveExistente.length !== 32) throw Error(MSG);
  const chave = chaveExistente || crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv('aes-256-gcm', chave, nonce);
  cifra.setAAD(aad(p.id));
  const cifrado = Buffer.concat([cifra.update(dados), cifra.final()]);
  const bytes = Buffer.from(JSON.stringify({
    v: 2, id: p.id, nonce: nonce.toString('base64'), tag: cifra.getAuthTag().toString('base64'), dados: cifrado.toString('base64'),
  }));
  if (!chaveExistente) {
    const tmpChave = seguro(p.chaves, p.chave + '.tmp');
    if (stat(tmpChave)) fs.unlinkSync(tmpChave);
    try {
      exclusivo(tmpChave, chave);
      fs.renameSync(tmpChave, p.chave);
    } finally {
      if (stat(tmpChave)) fs.unlinkSync(tmpChave);
    }
  }
  sincronizarPasta(p.chaves);
  sincronizarPasta(path.dirname(p.chaves));
  if (!abrir(p.id, bytes, lerArquivo(p.chave, true)).equals(dados)) throw Error(MSG);
  gravarAtomico(p.cofre, bytes, 'cofre-');
  sincronizarPasta(p.dir);
  if (!abrir(p.id, lerArquivo(p.cofre), lerArquivo(p.chave, true)).equals(dados)) throw Error(MSG);
  if (stat(p.pendente)) fs.unlinkSync(p.pendente);
  return bytes;
}

function gravarAtomico(arq, bytes, prefixo, semSobrescrever = false) {
  const tmp = path.join(path.dirname(arq), prefixo + crypto.randomUUID() + '.tmp');
  exclusivo(tmp, bytes);
  try {
    if (semSobrescrever && stat(arq)) throw Error(MSG);
    fs.renameSync(tmp, arq);
  } finally {
    if (stat(tmp)) fs.unlinkSync(tmp);
  }
}

function gravar(pasta, t, aposGravar) {
  try {
    return comTrava(pasta, (p) => {
      if (stat(path.join(p.caso, '_descarte.jsonl'))) throw Error(MSG);
      const { bytes, chave, legado } = estado(p);
      const anterior = revisao.get(t);
      if (legado || (bytes ? !anterior || anterior.id !== p.id || anterior.hash !== hash(bytes) : anterior)) throw Error(MSG);
      if (bytes) abrir(p.id, bytes, chave);
      const persistir = (material) => {
        const dados = Buffer.from(JSON.stringify(validar(t)));
        const gravado = publicar(p, dados, material);
        revisao.set(t, { id: p.id, hash: hash(gravado) });
      };
      persistir(chave);
      if (aposGravar) {
        // Os IDs já estão persistidos. Publique os metadados só após gravar as cópias.
        aposGravar(p.caso, p.id);
        persistir(lerArquivo(p.chave, true));
      }
    });
  } catch (e) { throw Error(MSG); }
}

function migrar(pasta) {
  try {
    return comTrava(pasta, (p) => {
      const { bytes, chave, legado } = estado(p);
      const dados = bytes ? abrir(p.id, bytes, chave) : legado;
      if (!dados) return false;
      decodificar(dados);
      if (!legado) return false;
      if (bytes && !dados.equals(legado)) throw Error(MSG);
      if (stat(path.join(p.caso, '_descarte.jsonl'))) throw Error(MSG);
      if (!bytes) publicar(p, dados, chave);
      sincronizarPasta(p.chaves);
      sincronizarPasta(p.dir);
      sincronizarPasta(p.caso);
      if (!lerArquivo(p.legado)?.equals(legado)) throw Error(MSG);
      fs.unlinkSync(p.legado);
      return true;
    });
  } catch (e) { throw Error(MSG); }
}

function verificarAntesDoDescarte(p) {
  const chave = lerChave(p);
  if (p.bytes && chave) abrir(p.id, p.bytes, chave);
}

module.exports = { verificarAntesDoDescarte, cabecalhoPeca, separarPeca, gravarAtomico, sobTrava, hash, PASTA_CHAVES, SUFIXO_WORD, MSG, pastaChaves, ehSaidaProtegida, stat, realpath, naRaiz, seguro, caminhos, comTrava, ler, gravar, migrar };
