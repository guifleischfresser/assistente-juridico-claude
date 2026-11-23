'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./comum');
const casos = require('./casos');
const cofre = require('./cofre');
const { caminhosNoTexto, isoLocal } = require('./saida');

const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const LIMITE = 64 * 1024 * 1024;
const RECIBOS = 'advogado-fim-de-sessao';
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const listar = (pasta) => cofre.stat(pasta) ? fs.readdirSync(pasta, { withFileTypes: true }) : [];

function projetos() {
  const raiz = fs.realpathSync(c.P.claude);
  return cofre.seguro(raiz, path.join(raiz, 'projects'));
}

function transcrito(base, arquivo, id) {
  if (!UUID.test(id || '') || typeof arquivo !== 'string' || !path.isAbsolute(arquivo)) throw Error();
  const rel = path.relative(base, arquivo);
  if (rel.split(path.sep).length !== 2 || path.basename(rel) !== id + '.jsonl') throw Error();
  cofre.seguro(base, arquivo);
  const s = fs.lstatSync(arquivo);
  if (!s.isFile() || s.nlink !== 1 || s.size > LIMITE) throw Error();
  return { s, bytes: fs.readFileSync(arquivo) };
}

function pastaRecibos() {
  const raiz = fs.realpathSync(c.P.claude);
  return cofre.seguro(raiz, path.join(raiz, RECIBOS));
}
function recibo(arquivo) {
  const pasta = pastaRecibos();
  return cofre.seguro(pasta, path.join(pasta, sha(c.norm(arquivo)) + '.json'));
}

function registrarSessao(ent, fim) {
  try {
    const base = projetos();
    const id = ent.session_id;
    const arquivo = path.resolve(fs.realpathSync(c.P.claude), path.relative(path.resolve(c.P.claude), ent.transcript_path));
    const rel = path.relative(base, arquivo);
    if (!UUID.test(id || '') || rel.split(path.sep).length !== 2 || path.basename(arquivo) !== id + '.jsonl') return;
    cofre.seguro(base, arquivo);
    const arq = recibo(arquivo);
    if (!fim) {
      if (cofre.stat(arq)) fs.unlinkSync(arq);
      return;
    }
    const { bytes } = transcrito(base, arquivo, id);
    fs.mkdirSync(pastaRecibos(), { recursive: true, mode: 0o700 });
    fs.writeFileSync(arq, JSON.stringify({ sha256: sha(bytes) }), { flag: 'wx', mode: 0o600 });
  } catch (e) { /* sem prova de encerramento, a sessão fica pendente */ }
}

// Registros do Claude Code são evidência de atividade. Um registro ilegível deixa a atividade incerta.
function sessoesAtivas() {
  const raiz = fs.realpathSync(c.P.claude);
  const pasta = cofre.seguro(raiz, path.join(raiz, 'sessions'));
  const ids = new Set();
  for (const n of listar(pasta)) {
    if (!/^\d+\.json$/.test(n.name)) continue;
    const pid = Number(path.basename(n.name, '.json'));
    if (!Number.isSafeInteger(pid) || pid < 1) throw Error();
    try { process.kill(pid, 0); } catch (e) {
      if (e.code === 'ESRCH') continue;
      if (e.code !== 'EPERM') throw e;
    }
    if (!n.isFile()) throw Error();
    const dados = JSON.parse(fs.readFileSync(cofre.seguro(pasta, path.join(pasta, n.name)), 'utf8'));
    if (!UUID.test(dados.sessionId || '')) throw Error();
    ids.add(dados.sessionId);
  }
  return ids;
}

function casoDoCaminho(valor, raiz, alvo) {
  if (typeof valor !== 'string' || !path.isAbsolute(valor)) return null;
  const rel = casos.casoDoArquivo(path.join(valor, 'DOSSIE.md'), raiz);
  if (rel !== alvo.rel) return rel;
  const real = fs.realpathSync(valor);
  if (!c.dentroDe(real, alvo.pasta) || path.relative(valor, real)) throw Error();
  return rel;
}

function evidencias(bytes, id, raiz, alvo) {
  const vistos = new Set();
  let aberta = false;
  const aberturas = new Set();
  let conversa = false;
  let compartilhada = false;
  let ambigua = false;
  const visitar = (v, chave, cwd) => {
    if (typeof v === 'string') {
      if (v && ['cwd', 'file_path', 'notebook_path', 'path'].includes(chave) &&
          (path.isAbsolute(v) || typeof cwd === 'string' && path.isAbsolute(cwd))) {
        const local = path.isAbsolute(v) ? path.resolve(v) : path.resolve(cwd, v);
        const real = cofre.stat(local) ? fs.realpathSync(local) : local;
        const rel = casos.casoDoArquivo(path.join(real, '_'), raiz);
        if (rel) {
          vistos.add(rel);
          if (rel === alvo.rel) cofre.seguro(alvo.pasta, local);
        }
      }
      if (/(?:^|[\s"'\\/])\.\.[\\/]/.test(v)) ambigua = true;
      const temCaso = /CASOS[\\/]/i.test(v);
      const citados = temCaso ? caminhosNoTexto(v, raiz) : [];
      for (const x of citados) {
        vistos.add(casos.casoDoArquivo(path.join(x.pasta, '_'), raiz));
        if (!c.dentroDe(path.resolve(x.pasta, x.rel), x.pasta)) ambigua = true;
        if (x.pasta === alvo.pasta) cofre.seguro(alvo.pasta, path.resolve(x.pasta, x.rel));
      }
      if (temCaso && !citados.length) ambigua = true;
    } else if (v && typeof v === 'object') {
      for (const [k, filho] of Object.entries(v)) visitar(filho, k, cwd);
    }
  };
  for (const linha of bytes.toString('utf8').split(/\r?\n/)) {
    if (!linha.trim()) continue;
    const r = JSON.parse(linha);
    if (!r || typeof r.type !== 'string' || r.sessionId && r.sessionId !== id || r.isSidechain) ambigua = true;
    if (r?.type === 'user' || r?.type === 'assistant') {
      conversa = true;
      if (r.sessionId !== id || typeof r.cwd !== 'string' || !path.isAbsolute(r.cwd)) ambigua = true;
      const conteudo = r.message?.content;
      for (const bloco of Array.isArray(conteudo) ? conteudo : []) {
        if (bloco?.type === 'tool_use' && ['Bash', 'PowerShell'].includes(bloco.name) &&
            /processo\.js["']?\s+abrir\b/i.test(bloco.input?.command || '')) aberturas.add(bloco.id);
        if (bloco?.type !== 'tool_result' || bloco.is_error || !aberturas.has(bloco.tool_use_id)) continue;
        const trechos = Array.isArray(bloco.content) ? bloco.content.map((t) => t?.text || '') : [bloco.content];
        let confirmada = false;
        for (const trecho of trechos) {
          if (typeof trecho !== 'string') continue;
          for (const m of trecho.matchAll(/^CASO_ATIVO=([^\r\n]+)/gm)) {
            const rel = casoDoCaminho(m[1].trim(), raiz, alvo);
            if (!rel) ambigua = true;
            else { vistos.add(rel); aberta ||= rel === alvo.rel; confirmada = true; }
          }
        }
        if (confirmada) aberturas.delete(bloco.tool_use_id);
      }
      const rel = casoDoCaminho(r.cwd, raiz, alvo);
      if (rel) vistos.add(rel);
      else {
        compartilhada = true;
        if (!r.cwd || !c.dentroDe(alvo.pasta, r.cwd) || path.relative(r.cwd, fs.realpathSync(r.cwd))) ambigua = true;
      }
    }
    visitar(r, null, r?.cwd);
  }
  return { vistos, conversa, ambigua: ambigua || aberturas.size > 0 || compartilhada && !aberta };
}

function lerVinculosValidados() {
  const raiz = fs.realpathSync(c.P.base);
  const arq = cofre.seguro(raiz, path.resolve(raiz, path.relative(path.resolve(c.P.base), casos.arqVinculos())));
  const s = cofre.stat(arq);
  if (!s) return {};
  if (!s.isFile() || s.nlink !== 1) throw Error();
  const dados = JSON.parse(fs.readFileSync(arq, 'utf8'));
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw Error();
  return dados;
}

function emIndice(pasta, indice, id) {
  cofre.seguro(pasta, indice);
  const s = cofre.stat(indice);
  if (!s) return false;
  if (!s.isFile() || s.nlink !== 1 || s.size > LIMITE) return true;
  const bytes = fs.readFileSync(indice, 'utf8');
  const dados = JSON.parse(bytes);
  return !Array.isArray(dados.entries) || bytes.toLowerCase().includes(id.toLowerCase());
}

function apagarHistoricos(alvo, raiz, resultado) {
  const base = projetos();
  const vinculos = lerVinculosValidados();
  const ativos = sessoesAtivas();
  const candidatos = [];
  const repetidos = new Map();
  for (const projeto of listar(base)) {
    if (!projeto.isDirectory()) {
      if (projeto.isSymbolicLink()) resultado.pendencias++;
      continue;
    }
    const pasta = cofre.seguro(base, path.join(base, projeto.name));
    for (const n of listar(pasta)) {
      const id = path.basename(n.name, '.jsonl');
      if (!UUID.test(id) || n.name !== id + '.jsonl') continue;
      repetidos.set(id, (repetidos.get(id) || 0) + 1);
      candidatos.push({ arquivo: path.join(pasta, n.name), id, pasta });
    }
  }
  for (const { arquivo, id, pasta } of candidatos) {
    const vinculo = Object.hasOwn(vinculos, id) ? vinculos[id]?.caso : null;
    try {
      const hist = transcrito(base, arquivo, id);
      const ev = evidencias(hist.bytes, id, raiz, alvo);
      if (vinculo !== alvo.rel && !ev.vistos.has(alvo.rel)) continue;
      const marca = recibo(arquivo);
      const reg = cofre.stat(marca);
      const encerrada = reg?.isFile() && reg.nlink === 1 && c.lerJSON(marca, null)?.sha256 === sha(hist.bytes);
      const indice = path.join(pasta, 'sessions-index.json');
      if (vinculo !== alvo.rel || !ev.conversa || !ev.vistos.has(alvo.rel) || ev.vistos.size !== 1 || ev.ambigua ||
          repetidos.get(id) !== 1 || !encerrada || ativos.has(id) ||
          cofre.stat(path.join(pasta, id)) || emIndice(pasta, indice, id)) {
        resultado.pendencias++;
        continue;
      }
      // O vínculo atual, a prova de encerramento e o conteúdo precisam continuar iguais.
      const agora = transcrito(base, arquivo, id);
      if (hist.s.dev !== agora.s.dev || hist.s.ino !== agora.s.ino || !agora.bytes.equals(hist.bytes) ||
          lerVinculosValidados()[id]?.caso !== alvo.rel || c.lerJSON(recibo(arquivo), null)?.sha256 !== sha(agora.bytes) ||
          sessoesAtivas().has(id) || cofre.stat(path.join(pasta, id)) || emIndice(pasta, indice, id)) throw Error();
      fs.unlinkSync(arquivo);
      resultado.historicos++;
      fs.unlinkSync(marca);
    } catch (e) {
      // Arquivo ilegível ou inseguro: a atribuição não pode ser concluída.
      resultado.pendencias++;
    }
  }
}

function remover(arq) {
  const s = cofre.stat(arq);
  if (!s) return;
  if (!s.isFile() || s.nlink !== 1) throw Error();
  fs.unlinkSync(arq);
}

const reciboDescarte = (pasta) => path.join(pasta, '_descarte.jsonl');
function descartado(pasta) { return !!cofre.stat(reciboDescarte(pasta)); }

function descartar(caso, escritorio, acao) {
  return cofre.comTrava(caso.pasta, (p) => {
    const resultado = { historicos: 0, pendencias: 0 };
    const arq = cofre.seguro(p.caso, reciboDescarte(p.caso));
    const s = cofre.stat(arq);
    if (s && (!s.isFile() || s.nlink !== 1)) throw Error();
    const registrar = (estado) => fs.appendFileSync(arq, JSON.stringify({
      data: isoLocal(new Date()), acao, resultado: estado,
    }) + '\n', { mode: 0o600 });
    registrar('iniciado');
    const removerComRegistro = (arq) => {
      try { remover(arq); } catch (e) { resultado.pendencias++; }
    };
    removerComRegistro(p.chave);
    removerComRegistro(p.cofre);
    removerComRegistro(p.legado);
    try {
      for (const n of listar(p.dir)) {
        if (/^(?:tabela\.json\.tmp-\d+|cofre-[a-f0-9-]+\.tmp)$/.test(n.name)) removerComRegistro(path.join(p.dir, n.name));
      }
      if (cofre.stat(p.dir) && !listar(p.dir).length) fs.rmdirSync(p.dir);
    } catch (e) { resultado.pendencias++; }
    try { apagarHistoricos({ ...caso, pasta: p.caso }, fs.realpathSync(escritorio), resultado); }
    catch (e) { resultado.pendencias++; }
    registrar(resultado.pendencias ? 'pendente' : 'concluido');
    return resultado;
  }, escritorio);
}

module.exports = { descartar, descartado, registrarSessao, RECIBOS };
