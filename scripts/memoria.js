#!/usr/bin/env node
'use strict';
// Memoria autonoma do assistente (harness engineering sem aprovacao, v0.3).
// Tudo local. Dados de clientes NUNCA vao para memoria global: so ficam na pasta do caso (DOSSIE.md).
//
//   node memoria.js registrar-rascunho <arquivo>   foto do rascunho que o assistente escreveu (peca)
//   node memoria.js aprender-edicoes [--json]      compara rascunho x versao final do advogado e refina ESTILO/perfil-de-escrita.md
//   node memoria.js preferir "<texto>" [--tipo preferencia|cuidado]   grava/confirma uma preferencia ou cuidado (gotcha)
//   node memoria.js manter [--forcar] [--json]     auto-manutencao: backup, CLAUDE.md curto, poda, deduplicacao, changelog
//   node memoria.js reflexao [--automatica] [--fim] [--json]   rotina de reflexao (tambem usada pelo hook SessionEnd)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./lib/comum');

const DIAS_PODA = 120;
const MARCA_APR_INI = '<!-- aprendizado-automatico:inicio -->';
const MARCA_APR_FIM = '<!-- aprendizado-automatico:fim -->';

function caminhos() {
  const esc = c.config().escritorio;
  return {
    esc,
    mem: path.join(esc, 'MEMORIA'),
    pref: path.join(esc, 'MEMORIA', 'preferencias-e-cuidados.md'),
    changelog: path.join(esc, 'MEMORIA', 'CHANGELOG.md'),
    morto: path.join(esc, 'MEMORIA', 'arquivo-morto.md'),
    perfil: path.join(esc, 'ESTILO', 'perfil-de-escrita.md'),
    claudeEsc: path.join(esc, 'CLAUDE.md'),
    claudeGlobal: path.join(c.P.claude, 'CLAUDE.md'),
    indice: path.join(c.P.estado, 'rascunhos', 'indice.json'),
    fotos: path.join(c.P.estado, 'rascunhos'),
    aprendizado: path.join(c.P.estado, 'aprendizado-estilo.json'),
    reflexao: path.join(c.P.estado, 'reflexao.json'),
    backups: path.join(c.P.base, 'backups', 'memoria'),
  };
}

function ler(a) { try { return fs.readFileSync(a, 'utf8').replace(/^\uFEFF/, ''); } catch (e) { return null; } }
function gravar(a, t) { c.garantirDir(path.dirname(a)); fs.writeFileSync(a, t, 'utf8'); }
function sha(t) { return crypto.createHash('sha256').update(String(t)).digest('hex'); }

function changelog(msg) {
  const k = caminhos();
  const atual = ler(k.changelog) || '# Changelog da memória do assistente\n\n> Escrito automaticamente. Cada mudança tem backup em ' + k.backups.replace(/\\/g, '/') + '.\n\n';
  gravar(k.changelog, atual + '- ' + c.carimbo().replace('_', ' ').replace(/(\d\d)(\d\d)\d\d$/, '$1:$2') + ' ' + msg + '\n');
}

/** Texto puro de .md/.txt/.docx (docx: paragrafos do word/document.xml). */
function textoDe(arq) {
  if (/\.docx$/i.test(arq)) {
    try {
      const xml = (require('./lib/zip').lerZip(arq).get('word/document.xml') || Buffer.from('')).toString('utf8');
      return xml.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    } catch (e) { return null; }
  }
  return ler(arq);
}

// ---------------------------------------------------------------- rascunhos
/** Peca = .md/.docx em PECAS/ ou numa subpasta "pecas" de um caso. */
function ehPeca(arq) {
  if (!arq || !/\.(md|docx)$/i.test(arq)) return false;
  const esc = c.config().escritorio;
  return c.dentroDe(arq, path.join(esc, 'PECAS')) || (c.dentroDe(arq, path.join(esc, 'CASOS')) && /[\\/]pecas[\\/]/i.test(arq));
}
function lerIndice() { return c.lerJSON(caminhos().indice, { pecas: {} }) || { pecas: {} }; }
function idDe(arq) { return sha(c.norm(arq)).slice(0, 16); }

function registrarRascunho(arq) {
  const k = caminhos();
  arq = path.resolve(arq);
  const t = textoDe(arq);
  if (t == null || !t.trim()) return { ok: false, erro: 'arquivo ilegível ou vazio' };
  const idx = lerIndice();
  const id = idDe(arq);
  gravar(path.join(k.fotos, id + '.txt'), t);
  idx.pecas[id] = Object.assign(idx.pecas[id] || {}, { arquivo: arq, sha: sha(t), em: new Date().toISOString() });
  c.gravarJSON(k.indice, idx);
  return { ok: true, id };
}

// ---------------------------------------------------------------- diff
function paragrafos(t) { return t.split(/\r?\n/).map((x) => x.trim()).filter(Boolean); }
function palavras(t) { return t.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || []; }

/** LCS generico; devolve operacoes [{op:'=',a,b}|{op:'-',a}|{op:'+',b}]. */
function diffSeq(A, B) {
  const n = A.length, m = B.length;
  if (n * m > 4e6) return null;
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push({ op: '=', a: A[i] }); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) ops.push({ op: '-', a: A[i++] }); else ops.push({ op: '+', b: B[j++] });
  }
  while (i < n) ops.push({ op: '-', a: A[i++] });
  while (j < m) ops.push({ op: '+', b: B[j++] });
  return ops;
}

function mediaFrase(t) {
  const fr = t.split(/[.!?;]+\s/).map((f) => palavras(f).length).filter((x) => x > 2);
  return fr.length ? fr.reduce((a, b) => a + b, 0) / fr.length : 0;
}

/** Analisa as edicoes do advogado. So considera palavras comuns (minusculas, sem digitos, 3+ letras,
 *  nunca vistas com inicial maiuscula no texto) => nomes, numeros e dados de clientes ficam de fora. */
function analisarEdicao(antes, depois) {
  const proprios = new Set();
  // maiuscula fora do inicio de frase/paragrafo => nome proprio (fica fora da memoria)
  const re = /[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu; let mm; const tudo = antes + '\n' + depois;
  while ((mm = re.exec(tudo))) {
    if (!/^\p{Lu}/u.test(mm[0])) continue;
    const inicioFrase = mm.index === 0 || /(^|[.!?:;]|\n)\s*$/.test(tudo.slice(Math.max(0, mm.index - 4), mm.index));
    if (!inicioFrase) proprios.add(mm[0].toLowerCase());
  }
  const comum = (w) => w && /^\p{Ll}{3,}$/u.test(w) && !proprios.has(w);
  const r = { substituicoes: [], removidas: [], adicionadas: [], antes: mediaFrase(antes), depois: mediaFrase(depois) };
  const PA = paragrafos(antes), PB = paragrafos(depois);
  const opsP = diffSeq(PA, PB) || [];
  // agrupa blocos de paragrafos removidos/adicionados e compara palavra a palavra em pares
  let rem = [], add = [];
  const fechar = () => {
    const k = Math.max(rem.length, add.length);
    for (let x = 0; x < k; x++) {
      const a = palavras(rem[x] || ''), b = palavras(add[x] || '');
      const ops = diffSeq(a, b); if (!ops) continue;
      for (let y = 0; y < ops.length; y++) {
        if (ops[y].op === '=') continue;
        const dels = [], ins = [];
        while (y < ops.length && ops[y].op !== '=') { if (ops[y].op === '-') dels.push(ops[y].a); else ins.push(ops[y].b); y++; }
        y--;
        if (dels.length === 1 && ins.length === 1 && comum(dels[0]) && comum(ins[0])) r.substituicoes.push(dels[0] + ' → ' + ins[0]);
        else if (dels.length && !ins.length) dels.filter(comum).forEach((w) => r.removidas.push(w));
        else if (ins.length && !dels.length) ins.filter(comum).forEach((w) => r.adicionadas.push(w));
      }
    }
    rem = []; add = [];
  };
  for (const o of opsP) { if (o.op === '=') fechar(); else if (o.op === '-') rem.push(o.a); else add.push(o.b); }
  fechar();
  return r;
}

const PALAVRAS_VAZIAS = new Set('que para com por uma dos das nos nas não sua seu como mais pelo pela este esta isso esse essa aos foi ser são tem'.split(' '));

function aprenderEdicoes(soArquivo) {
  const k = caminhos();
  const idx = lerIndice();
  const ap = c.lerJSON(k.aprendizado, { substituicoes: {}, removidas: {}, adicionadas: {}, frases: [], pecasAnalisadas: 0 });
  const res = { analisadas: 0, editadas: 0, regras: 0 };
  for (const [id, e] of Object.entries(idx.pecas)) {
    if (soArquivo && id !== idDe(path.resolve(soArquivo))) continue;
    if (!fs.existsSync(e.arquivo)) continue;
    const atual = textoDe(e.arquivo); if (atual == null) continue;
    res.analisadas++;
    if (sha(atual) === e.sha) continue;
    const foto = ler(path.join(k.fotos, id + '.txt')); if (foto == null) continue;
    const a = analisarEdicao(foto, atual);
    res.editadas++; ap.pecasAnalisadas++;
    for (const s of a.substituicoes) {
      ap.substituicoes[s] = (ap.substituicoes[s] || 0) + 1;
      // v0.5: a 2a vez que o advogado faz a MESMA troca, vira "erro a nao repetir" (nivel aviso)
      if (ap.substituicoes[s] === 2) { try { registrarTrocaComoErro(s); res.erros = (res.erros || 0) + 1; } catch (e) { /* fail-open */ } }
    }
    for (const w of a.removidas) if (!PALAVRAS_VAZIAS.has(w)) ap.removidas[w] = (ap.removidas[w] || 0) + 1;
    for (const w of a.adicionadas) if (!PALAVRAS_VAZIAS.has(w)) ap.adicionadas[w] = (ap.adicionadas[w] || 0) + 1;
    if (a.antes && a.depois) ap.frases = ap.frases.concat([[Math.round(a.antes), Math.round(a.depois)]]).slice(-30);
    // a versao do advogado vira a nova referencia
    gravar(path.join(k.fotos, id + '.txt'), atual);
    e.sha = sha(atual); e.aprendidoEm = new Date().toISOString();
  }
  c.gravarJSON(k.indice, idx);
  c.gravarJSON(k.aprendizado, ap);
  if (res.editadas) { res.regras = atualizarPerfil(ap); changelog('aprendi com ' + res.editadas + ' peça(s) editada(s) por você; perfil de escrita atualizado (' + res.regras + ' ajuste(s) ativos).'); }
  return res;
}

function registrarTrocaComoErro(s) {
  const [antes, depois] = s.split(' → ');
  if (!antes || !depois || antes.length < 3) return null;
  const esc = antes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return require('./lib/erros').registrar({ licao: 'O advogado troca "' + antes + '" por "' + depois + '" nas peças', padrao: '(?<!\\p{L})' + esc + '(?!\\p{L})', exemplo: antes, certo: depois, origem: 'edicoes' });
}

function topo(obj, min, n) { return Object.entries(obj).filter(([, v]) => v >= min).sort((a, b) => b[1] - a[1]).slice(0, n); }

function atualizarPerfil(ap) {
  const k = caminhos();
  const linhas = [];
  for (const [s, v] of topo(ap.substituicoes, 2, 12)) linhas.push('- Você troca "' + s.replace(' → ', '" por "') + '" (' + v + 'x). Escreva já do seu jeito.');
  for (const [w, v] of topo(ap.removidas, 3, 8)) linhas.push('- Você costuma cortar "' + w + '" (' + v + 'x). Evite.');
  for (const [w, v] of topo(ap.adicionadas, 3, 8)) linhas.push('- Você costuma acrescentar "' + w + '" (' + v + 'x).');
  if (ap.frases.length >= 2) {
    const d = ap.frases.reduce((s, [x, y]) => s + (y - x), 0) / ap.frases.length;
    if (d <= -2) linhas.push('- Você encurta as frases (em média ' + Math.round(-d) + ' palavras a menos). Prefira frases mais curtas.');
    else if (d >= 2) linhas.push('- Você alonga as frases (em média ' + Math.round(d) + ' palavras a mais). Desenvolva mais cada frase.');
  }
  const bloco = MARCA_APR_INI + '\n## Ajustes aprendidos com as suas edições (automático, atualizado a cada peça revisada)\n' +
    (linhas.length ? linhas.join('\n') : '- (ainda poucos dados: preciso ver o mesmo ajuste 2+ vezes)') +
    '\n_Base: ' + ap.pecasAnalisadas + ' peça(s) comparadas (rascunho do assistente x versão final sua)._\n' + MARCA_APR_FIM + '\n';
  const atual = ler(k.perfil) || '# Perfil de escrita\n';
  backupArquivos([k.perfil]);
  const re = new RegExp(MARCA_APR_INI + '[\\s\\S]*?' + MARCA_APR_FIM + '\\n?');
  gravar(k.perfil, re.test(atual) ? atual.replace(re, bloco) : atual.trimEnd() + '\n\n' + bloco);
  return linhas.length;
}

// ---------------------------------------------------------------- preferencias e cuidados
const RE_ITEM = /^- \[(\d{4}-\d{2}-\d{2})\] (.+?) · confirmações: (\d+)\s*$/;
function lerPrefs() {
  const t = ler(caminhos().pref) || '';
  const itens = [];
  let secao = 'preferencia';
  for (const l of t.split(/\r?\n/)) {
    if (/^## Cuidados/i.test(l)) secao = 'cuidado'; else if (/^## Prefer/i.test(l)) secao = 'preferencia';
    const m = l.match(RE_ITEM);
    if (m) itens.push({ data: m[1], texto: m[2], n: Number(m[3]), tipo: secao });
  }
  return itens;
}
function gravarPrefs(itens) {
  const k = caminhos();
  const f = (t) => itens.filter((i) => i.tipo === t).map((i) => '- [' + i.data + '] ' + i.texto + ' · confirmações: ' + i.n).join('\n') || '- (nada ainda)';
  gravar(k.pref, '# Preferências e cuidados (memória do assistente)\n\n' +
    '> Mantido pelo próprio assistente, sem pedir aprovação (backup + changelog em MEMORIA/CHANGELOG.md).\n' +
    '> Só preferências de trabalho. **Nunca** dados de clientes: esses ficam no DOSSIE.md do caso.\n' +
    '> Itens não confirmados há ' + DIAS_PODA + ' dias vão para MEMORIA/arquivo-morto.md.\n\n' +
    '## Preferências\n' + f('preferencia') + '\n\n## Cuidados (erros a não repetir)\n' + f('cuidado') + '\n');
}
function conjunto(t) { return new Set(palavras(t.toLowerCase()).filter((w) => w.length > 2)); }
function parecido(a, b) {
  const A = conjunto(a), B = conjunto(b); if (!A.size || !B.size) return false;
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter) >= 0.7;
}

function preferir(texto, tipo) {
  texto = String(texto || '').replace(/\s+/g, ' ').replace(/·/g, '-').trim();
  tipo = tipo === 'cuidado' ? 'cuidado' : 'preferencia';
  if (texto.length < 5) return { ok: false, erro: 'texto curto demais' };
  if (texto.length > 300) return { ok: false, erro: 'seja breve (até 300 caracteres); detalhes vão para uma skill' };
  const sig = c.acharSigilo(texto);
  if (sig.length) return { ok: false, erro: 'recusado: parece conter dado de cliente (' + sig.join(', ') + '). Isso vai só no DOSSIE.md do caso.' };
  const k = caminhos();
  backupArquivos([k.pref]);
  const itens = lerPrefs();
  const hoje = c.hojeISO();
  const igual = itens.find((i) => i.tipo === tipo && parecido(i.texto, texto));
  if (igual) { igual.n++; igual.data = hoje; gravarPrefs(itens); changelog('confirmado (' + tipo + '): "' + igual.texto + '" (' + igual.n + 'x)'); return { ok: true, confirmado: true, n: igual.n }; }
  itens.push({ data: hoje, texto, n: 1, tipo });
  gravarPrefs(itens);
  changelog('memorizado (' + tipo + '): "' + texto + '"');
  return { ok: true, novo: true };
}

// ---------------------------------------------------------------- manutencao
let backupDaRodada = null;
function backupArquivos(lista) {
  const k = caminhos();
  if (!backupDaRodada) backupDaRodada = path.join(k.backups, c.carimbo());
  for (const a of lista) {
    if (!a || !fs.existsSync(a)) continue;
    const destino = path.join(backupDaRodada, path.relative(path.parse(a).root, a).replace(/[\\/:]/g, '__'));
    if (!fs.existsSync(destino)) { c.garantirDir(backupDaRodada); fs.copyFileSync(a, destino); }
  }
  // guarda so os 30 backups mais recentes
  try { const ds = fs.readdirSync(k.backups).sort(); for (const d of ds.slice(0, Math.max(0, ds.length - 30))) fs.rmSync(path.join(k.backups, d), { recursive: true, force: true }); } catch (e) { /* */ }
  return backupDaRodada;
}

function dirsMemoriaAuto() {
  const base = path.join(c.P.claude, 'projects');
  const r = [];
  try { for (const p of fs.readdirSync(base)) { const d = path.join(base, p, 'memory'); if (fs.existsSync(d)) r.push(d); } } catch (e) { /* */ }
  return r;
}

function manter(opts) {
  opts = opts || {};
  const k = caminhos();
  const est = c.lerJSON(k.reflexao, {});
  const r = { feito: [], avisos: [] };
  if (!opts.forcar && est.ultimaManutencao && Date.now() - Date.parse(est.ultimaManutencao) < 20 * 3600e3) { r.pulado = true; return r; }

  // 1. CLAUDE.md global: o nosso bloco volta ao modelo; linhas extras viram preferencias (aponte, nao copie)
  try {
    const inst = require('./instalar');
    const atual = ler(k.claudeGlobal);
    const re = new RegExp(inst.MARCA_INI + '[\\s\\S]*?' + inst.MARCA_FIM + '\\n?');
    const m = atual && atual.match(re);
    if (m) {
      const cfg = c.config();
      const modelo = inst.blocoClaudeMd(cfg.escritorio, cfg.nome);
      if (m[0].trim() !== modelo.trim()) {
        const doModelo = new Set(modelo.split(/\r?\n/).map((l) => l.trim()));
        const extras = m[0].split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !doModelo.has(l) && !/^<!--|^#/.test(l));
        backupArquivos([k.claudeGlobal]);
        let movidas = 0, descartadas = 0;
        for (const l of extras) { const p = preferir(l.replace(/^[-*]\s*/, ''), 'preferencia'); if (p.ok) movidas++; else descartadas++; }
        gravar(k.claudeGlobal, atual.replace(re, modelo));
        changelog('CLAUDE.md global enxugado: bloco do assistente restaurado; ' + movidas + ' linha(s) movidas para MEMORIA/preferencias-e-cuidados.md' + (descartadas ? ', ' + descartadas + ' descartada(s) (dado sensível ou inválida)' : '') + '.');
        r.feito.push('CLAUDE.md global enxugado (' + movidas + ' linha(s) movidas para a memória)');
      }
      const n = (ler(k.claudeGlobal) || '').split(/\r?\n/).length;
      if (n > 120) r.avisos.push('CLAUDE.md global tem ' + n + ' linhas (fora do bloco do assistente). Considere enxugar.');
    }
  } catch (e) { r.avisos.push('não consegui revisar o CLAUDE.md global: ' + e.message); }

  // 2. CLAUDE.md do ESCRITORIO: secao "Aprendizados" migra para a memoria e vira ponteiro
  const te = ler(k.claudeEsc);
  if (te) {
    const linhas = te.split(/\r?\n/);
    const ini = linhas.findIndex((l) => /^## Aprendizados/i.test(l));
    if (ini >= 0) {
      let fim = linhas.findIndex((l, i) => i > ini && /^## /.test(l)); if (fim < 0) fim = linhas.length;
      const itens = linhas.slice(ini + 1, fim).map((l) => l.replace(/^[-*]\s*/, '').trim()).filter((l) => l.length > 4);
      if (itens.length) {
        backupArquivos([k.claudeEsc]);
        for (const i of itens) preferir(i.replace(/^\[?\d{4}-\d{2}-\d{2}\]?\s*[-:]?\s*/, ''), 'preferencia');
        linhas.splice(ini, fim - ini, '## Aprendizados', '- Ficam em `MEMORIA/preferencias-e-cuidados.md` (mantido pelo assistente). Aqui só o perfil e as regras da casa.');
        gravar(k.claudeEsc, linhas.join('\n'));
        changelog('CLAUDE.md do ESCRITORIO: ' + itens.length + ' aprendizado(s) movidos para MEMORIA/preferencias-e-cuidados.md.');
        r.feito.push(itens.length + ' aprendizado(s) do CLAUDE.md do ESCRITORIO organizados na memória');
      }
    }
    if (linhas.length > 80) r.avisos.push('CLAUDE.md do ESCRITORIO tem ' + linhas.length + ' linhas.');
  }

  // 3. Poda: itens com 1 confirmacao e mais de 120 dias vao para o arquivo morto; duplicatas se fundem
  const itens = lerPrefs();
  if (itens.length) {
    const limite = c.hojeISO(new Date(Date.now() - DIAS_PODA * 864e5));
    const ficam = [], saem = [];
    for (const i of itens) {
      const dup = ficam.find((f) => f.tipo === i.tipo && parecido(f.texto, i.texto));
      if (dup) { dup.n += i.n; if (i.data > dup.data) dup.data = i.data; continue; }
      if (i.n <= 1 && i.data < limite) saem.push(i); else ficam.push(i);
    }
    if (saem.length || ficam.length !== itens.length) {
      backupArquivos([k.pref, k.morto]);
      if (saem.length) gravar(k.morto, (ler(k.morto) || '# Arquivo morto da memória\n\n> Itens podados automaticamente (não confirmados há ' + DIAS_PODA + ' dias). Podem voltar se confirmados de novo.\n\n') + saem.map((i) => '- [' + i.data + '] (' + i.tipo + ') ' + i.texto + ' · podado em ' + c.hojeISO()).join('\n') + '\n');
      gravarPrefs(ficam);
      changelog('manutenção: ' + saem.length + ' item(ns) podado(s), ' + (itens.length - ficam.length - saem.length) + ' duplicata(s) fundida(s).');
      r.feito.push('memória podada/deduplicada');
    }
  }

  // 4. Memoria automatica do Claude Code (global): nunca guarda dado de cliente => linhas suspeitas sao redigidas
  let redigidas = 0;
  for (const d of dirsMemoriaAuto()) {
    let arqs = []; try { arqs = fs.readdirSync(d).filter((n) => /\.md$/i.test(n)); } catch (e) { /* */ }
    for (const n of arqs) {
      const a = path.join(d, n); const t = ler(a); if (t == null) continue;
      let mudou = 0;
      const novo = t.split(/\r?\n/).map((l) => (c.acharSigilo(l).length ? (mudou++, '[removido automaticamente: possível dado de cliente — ver DOSSIE.md do caso]') : l)).join('\n');
      if (mudou) { backupArquivos([a]); gravar(a, novo); redigidas += mudou; }
    }
  }
  if (redigidas) { changelog('memória automática do Claude Code: ' + redigidas + ' linha(s) com possível dado de cliente removidas (backup feito).'); r.feito.push(redigidas + ' linha(s) sensíveis removidas da memória automática'); }

  est.ultimaManutencao = new Date().toISOString();
  c.gravarJSON(k.reflexao, est);
  return r;
}

// ---------------------------------------------------------------- reflexao
function candidatasPendentes() {
  const cand = c.lerJSON(path.join(c.P.hab, 'candidatas.json'), {}) || {};
  const lista = Array.isArray(cand) ? cand : Object.values(cand.candidatas || cand);
  return lista.filter((x) => x && typeof x === 'object' && !x.publicada && x.status !== 'publicada' && x.status !== 'descartada');
}

function reflexao(opts) {
  opts = opts || {};
  const k = caminhos();
  const est = c.lerJSON(k.reflexao, {});
  const r = { estilo: aprenderEdicoes(), manutencao: manter({ forcar: opts.forcar }), candidatas: candidatasPendentes().length };
  if (opts.fim) {
    // fim de sessao: o hook nao conversa com o Claude; deixa a reflexao completa para a proxima sessao
    const s = opts.sessao ? c.lerSessao(opts.sessao) : {};
    const desde = (s.ferramentas || 0) - (s.reflexaoEm || 0);
    if (desde >= 5 || (s.pecasDesdeReflexao || 0) > 0 || r.candidatas) est.reflexaoPendente = { desde: new Date().toISOString(), ferramentas: desde, pecas: s.pecasDesdeReflexao || 0 };
  } else if (!opts.automatica) {
    delete est.reflexaoPendente;
  }
  est.ultimaReflexao = new Date().toISOString();
  est.reflexoes = (est.reflexoes || 0) + 1;
  c.gravarJSON(k.reflexao, est);
  r.pendente = !!est.reflexaoPendente;
  return r;
}

function resumoReflexao(r) {
  const p = [];
  p.push(r.estilo.editadas ? 'estilo: aprendi com ' + r.estilo.editadas + ' peça(s) que você editou' : 'estilo: nenhuma edição nova');
  if (r.manutencao.pulado) p.push('manutenção: feita há menos de 1 dia'); else p.push('manutenção: ' + (r.manutencao.feito.join('; ') || 'tudo em ordem'));
  p.push('tarefas repetidas candidatas a skill: ' + r.candidatas);
  return p.join(' · ') + (r.manutencao.avisos && r.manutencao.avisos.length ? '\nAvisos: ' + r.manutencao.avisos.join(' ') : '');
}

module.exports = { ehPeca, textoDe, registrarRascunho, analisarEdicao, aprenderEdicoes, preferir, lerPrefs, manter, reflexao, resumoReflexao, caminhos, MARCA_APR_INI };

if (require.main === module) {
  const a = process.argv.slice(2);
  const cmd = a[0];
  const json = a.includes('--json');
  const out = (obj, txt) => { console.log(json ? JSON.stringify(obj, null, 1) : txt); };
  if (cmd === 'registrar-rascunho') { const r = registrarRascunho(a[1] || ''); out(r, r.ok ? 'Rascunho registrado (para aprender com as suas edições depois).' : 'Não registrado: ' + r.erro); }
  else if (cmd === 'aprender-edicoes') { const r = aprenderEdicoes(); out(r, 'Peças acompanhadas: ' + r.analisadas + ' · editadas por você desde o rascunho: ' + r.editadas + ' · ajustes de estilo ativos: ' + r.regras); }
  else if (cmd === 'preferir') {
    const i = a.indexOf('--tipo'); const tipo = i >= 0 ? a[i + 1] : 'preferencia';
    const texto = a.slice(1).filter((x, j) => x !== '--json' && x !== '--tipo' && !(i >= 0 && j + 1 === i + 1)).join(' ');
    const r = preferir(texto, tipo); out(r, r.ok ? (r.novo ? 'Memorizado.' : 'Já sabia; confirmação registrada (' + r.n + 'x).') : 'Não memorizado: ' + r.erro);
    if (!r.ok) process.exitCode = 2;
  } else if (cmd === 'manter') { const r = manter({ forcar: a.includes('--forcar') }); out(r, r.pulado ? 'Manutenção já feita nas últimas 20 horas.' : 'Manutenção: ' + (r.feito.join('; ') || 'tudo em ordem') + (r.avisos.length ? '\nAvisos: ' + r.avisos.join(' ') : '')); }
  else if (cmd === 'reflexao') {
    const fim = a.includes('--fim');
    const rodar = (ent) => {
      const r = reflexao({ automatica: a.includes('--automatica'), fim, forcar: a.includes('--forcar'), sessao: ent && ent.session_id });
      if (fim) { c.log('reflexao', 'fim de sessao: ' + JSON.stringify({ editadas: r.estilo.editadas, pendente: r.pendente })); process.exit(0); }
      out(r, 'REFLEXÃO — ' + resumoReflexao(r));
    };
    if (fim) c.lerEntrada().then(rodar, () => rodar({})); else rodar({});
  } else {
    console.log('Uso: memoria.js registrar-rascunho <arq> | aprender-edicoes | preferir "<texto>" [--tipo preferencia|cuidado] | manter [--forcar] | reflexao [--automatica] [--fim]');
    process.exitCode = 1;
  }
}
