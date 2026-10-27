'use strict';
/*
 * Extrai o TEXTO LEGIVEL de um arquivo salvo pelo advogado (pagina salva do site do tribunal, PDF do
 * acordao, Word, .txt/.md), para comparar com o trecho citado na peca (julgados.js comparar).
 * Tudo local e sincrono: sem rede, sem dependencia npm. PDF usa o pdftotext do Poppler (ou markitdown).
 *
 * extrairTexto(arquivo, opts) -> { tipo, texto, via, semTexto, motivo, ocultos[], injecao[], paginasSemTexto, textoOculto }
 *   - pagina salva (.html/.htm): tira scripts, estilos, comentarios, <head> e TUDO que estiver escondido
 *     (display:none, hidden, fonte branca/minuscula... — mesma deteccao de lib/injecao.js); o escondido
 *     vai para `ocultos` (aviso) e `textoOculto`, nunca para `texto`. Entidades (&nbsp; &aacute; &#231;) decodificadas.
 *   - PDF: sem OCR; remove marcadores de pagina e cabecalhos/rodapes repetidos (limparPaginasPdf).
 *   - Word: sem os trechos ocultos (vanish, fonte branca/minuscula).
 *   - injecao/ocultos: varredura do arquivo ORIGINAL (so avisa, nunca obedece).
 *   - semTexto + motivo: 'sem-texto-pagina' | 'pdf-escaneado' | 'sem-leitor-pdf' | 'arquivo-vazio'.
 * Tambem e a casa dos leitores usados por preparar-autos.js (tem, pdfPaginas, docxTexto).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { lerZip } = require('./zip');
const { ocultoNoDocx, ocultoNoTexto, limparInvisiveis, analisarEntrada, detectarInjecao } = require('./injecao');

function tem(cmd) {
  try { execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }); return true; } catch (e) { return false; }
}

/** Paginas de um PDF (pdftotext; alternativa markitdown). opts.layout=false: ordem de leitura, sem colunas. */
function pdfPaginas(arq, ocr, opts) {
  if (tem('pdftotext')) {
    const layout = !(opts && opts.layout === false);
    const o = { maxBuffer: 512 * 1024 * 1024 }; if (opts) o.stdio = ['ignore', 'pipe', 'ignore'];
    const txt = execFileSync('pdftotext', ['-enc', 'UTF-8'].concat(layout ? ['-layout'] : [], [arq, '-']), o).toString('utf8');
    const pags = txt.split('\f'); if (pags.length > 1 && !pags[pags.length - 1].trim()) pags.pop();
    if (ocr && tem('pdftoppm') && tem('tesseract')) {
      pags.forEach((p, i) => {
        if (p.replace(/\s/g, '').length >= 30) return;
        try {
          const tmp = path.join(require('os').tmpdir(), 'autos-ocr-' + process.pid + '-' + i);
          execFileSync('pdftoppm', ['-r', '200', '-f', String(i + 1), '-l', String(i + 1), '-png', '-singlefile', arq, tmp]);
          pags[i] = execFileSync('tesseract', [tmp + '.png', '-', '-l', 'por'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8') + '\n[texto obtido por OCR local — conferir]';
          fs.unlinkSync(tmp + '.png');
        } catch (e) { /* segue sem OCR */ }
      });
    }
    return { pags, via: 'pdftotext' };
  }
  if (tem('markitdown')) return { pags: [execFileSync('markitdown', [arq], { maxBuffer: 512 * 1024 * 1024 }).toString('utf8')], via: 'markitdown' };
  return null;
}

/** Texto de um .docx. opts.semOcultos: pula os runs ocultos (vanish, fonte branca/minuscula). */
function docxTexto(arq, opts) {
  const semOcultos = !!(opts && opts.semOcultos);
  const z = lerZip(arq);
  const xml = (z.get('word/document.xml') || Buffer.from('')).toString('utf8');
  const pars = xml.split(/<\/w:p>/).map((p) => {
    let t = '';
    for (const r of p.split(/<\/w:r>/)) {
      if (semOcultos && ocultoNoDocx(r + '</w:r>').length) continue;
      t += (r.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join('');
    }
    return t;
  }).filter((t) => t.trim());
  const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  // texto oculto (vanish, fonte branca, minuscula): deteccao centralizada em lib/injecao.js
  const ocultos = ocultoNoDocx(xml).map((o) => o.texto + ' [' + o.motivo + ']');
  return { texto: dec(pars.join('\n\n')), ocultos, xml };
}

// ---------------------------------------------------------------- pagina salva do site (HTML)
const ENT = {
  nbsp: 160, amp: 38, lt: 60, gt: 62, quot: 34, apos: 39,
  Agrave: 192, Aacute: 193, Acirc: 194, Atilde: 195, Auml: 196, Aring: 197, AElig: 198, Ccedil: 199,
  Egrave: 200, Eacute: 201, Ecirc: 202, Euml: 203, Igrave: 204, Iacute: 205, Icirc: 206, Iuml: 207,
  ETH: 208, Ntilde: 209, Ograve: 210, Oacute: 211, Ocirc: 212, Otilde: 213, Ouml: 214, Oslash: 216,
  Ugrave: 217, Uacute: 218, Ucirc: 219, Uuml: 220, Yacute: 221, THORN: 222, szlig: 223,
  agrave: 224, aacute: 225, acirc: 226, atilde: 227, auml: 228, aring: 229, aelig: 230, ccedil: 231,
  egrave: 232, eacute: 233, ecirc: 234, euml: 235, igrave: 236, iacute: 237, icirc: 238, iuml: 239,
  eth: 240, ntilde: 241, ograve: 242, oacute: 243, ocirc: 244, otilde: 245, ouml: 246, oslash: 248,
  ugrave: 249, uacute: 250, ucirc: 251, uuml: 252, yacute: 253, thorn: 254, yuml: 255,
  iexcl: 161, cent: 162, pound: 163, curren: 164, yen: 165, brvbar: 166, sect: 167, uml: 168, copy: 169,
  ordf: 170, laquo: 171, not: 172, shy: 173, reg: 174, macr: 175, deg: 176, plusmn: 177, sup2: 178,
  sup3: 179, acute: 180, micro: 181, para: 182, middot: 183, cedil: 184, sup1: 185, ordm: 186, raquo: 187,
  frac14: 188, frac12: 189, frac34: 190, iquest: 191, times: 215, divide: 247,
  ndash: 0x2013, mdash: 0x2014, lsquo: 0x2018, rsquo: 0x2019, sbquo: 0x201A, ldquo: 0x201C, rdquo: 0x201D,
  bdquo: 0x201E, hellip: 0x2026, bull: 0x2022, euro: 0x20AC, trade: 0x2122, zwj: 0x200D, zwnj: 0x200C,
  ensp: 0x2002, emsp: 0x2003, thinsp: 0x2009, prime: 0x2032, dagger: 0x2020,
};
// &#128;..&#159; em paginas antigas sao, na pratica, os caracteres do windows-1252
const W1252 = { 128: 0x20AC, 130: 0x201A, 132: 0x201E, 133: 0x2026, 134: 0x2020, 139: 0x2039, 145: 0x2018, 146: 0x2019, 147: 0x201C, 148: 0x201D, 149: 0x2022, 150: 0x2013, 151: 0x2014, 153: 0x2122, 155: 0x203A };
function caractere(n) {
  if (W1252[n]) n = W1252[n];
  if (!(n > 0 && n <= 0x10FFFF) || (n >= 0xD800 && n <= 0xDFFF)) return '';
  return String.fromCodePoint(n);
}
function decodificarUmaVez(s) {
  return s.replace(/&(#[xX][0-9a-fA-F]{1,6}|#\d{1,7}|[A-Za-z][A-Za-z0-9]{1,8});/g, (m, e) => {
    if (e[0] === '#') return caractere(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return Object.prototype.hasOwnProperty.call(ENT, e) ? String.fromCodePoint(ENT[e]) : m;
  });
}
/** Entidades nomeadas e numericas, com segunda passada para dupla codificacao (&amp;nbsp;). */
function decodificarEntidades(s) {
  const um = decodificarUmaVez(String(s || ''));
  return /&(#[xX]?[0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]{1,8});/.test(um) ? decodificarUmaVez(um) : um;
}

/** Bytes da pagina salva -> texto (UTF-8; se nao for, ou se o meta charset pedir, windows-1252/latin1). */
function decodificarPagina(buf) {
  const cabeca = buf.slice(0, 4096).toString('latin1');
  const meta = cabeca.match(/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i);
  const declarado = meta ? meta[1].toLowerCase() : '';
  let s = buf.toString('utf8');
  if (/^(windows-1252|cp1252|iso-8859-1|iso8859-1|latin-?1|iso-8859-15)$/.test(declarado) || s.includes('�')) {
    try { s = new TextDecoder('windows-1252').decode(buf); } catch (e) { s = buf.toString('latin1'); }
  }
  return s.replace(/^﻿/, '');
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', 'keygen']);
const BLOCO = new Set(['address', 'article', 'aside', 'blockquote', 'br', 'caption', 'center', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'tbody', 'tfoot', 'thead', 'tr', 'ul']);
const CELULA = new Set(['td', 'th']);
// abrir um destes fecha um <p> aberto (o HTML permite omitir </p>)
const FECHA_P = new Set(['address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);

/** Pagina salva do site -> { texto, escondidos:[{motivo, texto}] }. */
function htmlParaTexto(html) {
  const s = String(html || '')
    .replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
    .replace(/<(script|style|noscript|template|head|title|svg|object|iframe)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[\s\S]*?\?>/g, ' ');
  const pilha = []; // { nome, oculto: motivo|null, buf? }
  const saida = []; const escondidos = [];
  const oculto = () => pilha.some((x) => x.oculto);
  const emitir = (txt) => {
    const dono = pilha.find((x) => x.oculto);
    if (dono) dono.buf.push(txt); else saida.push(txt);
  };
  const fechar = (i) => { // fecha pilha[i] e tudo acima dele
    while (pilha.length > i) {
      const x = pilha.pop();
      if (BLOCO.has(x.nome)) emitir('\n'); else if (CELULA.has(x.nome)) emitir(' ');
      if (x.oculto) { const t = x.buf.join('').replace(/\s+/g, ' ').trim(); if (t) escondidos.push({ motivo: x.oculto, texto: t }); }
    }
  };
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let ult = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > ult) emitir(s.slice(ult, m.index));
    ult = re.lastIndex;
    const nome = m[2].toLowerCase();
    if (m[1]) { // fechamento
      let i = pilha.length - 1; while (i >= 0 && pilha[i].nome !== nome) i--;
      if (i >= 0) fechar(i); else if (BLOCO.has(nome)) emitir('\n');
      continue;
    }
    // fechamentos implicitos mais comuns
    const topo = pilha.length ? pilha[pilha.length - 1].nome : '';
    if (topo === 'p' && FECHA_P.has(nome)) fechar(pilha.length - 1);
    else if (nome === 'li' && topo === 'li') fechar(pilha.length - 1);
    else if ((nome === 'td' || nome === 'th') && CELULA.has(topo)) fechar(pilha.length - 1);
    else if (nome === 'tr') { let i = pilha.length - 1; while (i >= 0 && (CELULA.has(pilha[i].nome) || pilha[i].nome === 'tr')) i--; if (i < pilha.length - 1) fechar(i + 1); }
    const achado = ocultoNoTexto(m[0]).find((o) => o.texto);
    const autoFecha = VOID.has(nome) || /\/\s*$/.test(m[3]);
    if (autoFecha) { if (!oculto() && !achado && BLOCO.has(nome)) emitir('\n'); continue; }
    if (BLOCO.has(nome)) emitir('\n'); else if (CELULA.has(nome)) emitir(' ');
    pilha.push({ nome, oculto: achado ? achado.motivo : null, buf: [] });
  }
  if (ult < s.length) emitir(s.slice(ult));
  fechar(0);
  // texto de "<" solto que nao era tag continua como texto; restos de tags quebradas saem
  const texto = decodificarEntidades(saida.join('').replace(/<\/?[a-zA-Z][^>]*>/g, ' '));
  return { texto, escondidos: escondidos.map((e) => ({ motivo: e.motivo, texto: decodificarEntidades(e.texto) })) };
}

/** Espacos especiais -> espaco; invisiveis fora; linhas aparadas; no maximo uma linha em branco. */
function arrumarEspacos(t) {
  return limparInvisiveis(String(t || '')).replace(/\r\n?/g, '\n')
    .replace(/[   -   　\t]+/g, ' ')
    .split('\n').map((l) => l.replace(/ {2,}/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------- PDF: marcadores de pagina e cabecalhos repetidos
const MARCA_LINHA = [
  /^p[áa]gina\s*\d+\s*(?:de|\/)\s*\d+\.?$/i,          // Página 3 de 10
  /^p[áa]g\.?\s*\d+\s*(?:\/|de)\s*\d+\.?$/i,          // Pág. 3/10
  /^p[áa]g(?:ina|\.)?\s*\d+\.?$/i,                     // Pág. 3
  /^fls?\.?\s*\d[\d.]*(?:\s*(?:v|verso))?\.?$/i,       // fls. 12
  /^[-–—]\s*\d+\s*[-–—]$/,                              // - 3 -
  /^num\.?\s*\d+\s*[-–—]\s*p[áa]g\.?\s*\d+$/i,         // Num. 123 - Pág. 3
  /^\d{1,4}$/,                                          // linha so com numero
];
// carimbos que nunca fazem parte do texto do julgado, mesmo no meio da linha
const MARCA_DENTRO = [/\bNum\.\s*\d+\s*[-–—]\s*P[áa]g\.\s*\d+\b/gi, /\bP[áa]gina\s+\d+\s+de\s+\d+\b/gi];

/** Paginas de texto de um PDF -> texto unico, sem marcadores de pagina nem cabecalhos/rodapes repetidos. */
function limparPaginasPdf(pags) {
  const normal = (l) => l.trim().replace(/\d+/g, '#').replace(/\s+/g, ' ').toLowerCase();
  let linhas = (pags || []).map((p) => String(p || '').replace(/\r\n?/g, '\n').split('\n')
    .map((l) => { let x = l; for (const re of MARCA_DENTRO) x = x.replace(re, ' '); return x.replace(/\s+$/, ''); })
    .filter((l) => !MARCA_LINHA.some((re) => re.test(l.trim()))));
  // cabecalho/rodape: so as 3 primeiras e 3 ultimas linhas nao vazias de cada pagina
  const bordas = (ls) => { const idx = ls.map((l, i) => (l.trim() ? i : -1)).filter((i) => i >= 0); return new Set(idx.slice(0, 3).concat(idx.slice(-3))); };
  if (linhas.length >= 2) {
    const cont = new Map();
    linhas.forEach((ls) => { const vistos = new Set(); bordas(ls).forEach((i) => vistos.add(normal(ls[i]))); vistos.forEach((k) => cont.set(k, (cont.get(k) || 0) + 1)); });
    const min = Math.max(2, Math.ceil(linhas.length * 0.6));
    const lixo = new Set([...cont].filter(([k, n]) => n >= min && k.replace(/[#\W_]/g, '').length >= 2).map(([k]) => k));
    if (lixo.size) linhas = linhas.map((ls) => { const b = bordas(ls); return ls.filter((l, i) => !(b.has(i) && lixo.has(normal(l)))); });
  }
  // paginas unidas com "\n": a palavra hifenizada no fim de uma pagina ("consti-") encosta na seguinte ("tucional")
  return linhas.map((ls) => ls.filter((l) => l.trim()).join('\n')).filter(Boolean).join('\n');
}

// ---------------------------------------------------------------- extrairTexto
const alfanum = (t) => (String(t || '').match(/[\p{L}\p{N}]/gu) || []).length;
const resumo = (o) => o.motivo + (o.texto ? ': ' + o.texto.replace(/\s+/g, ' ').slice(0, 160) : '');

function extrairTexto(arquivo, opts) {
  opts = opts || {};
  const ext = path.extname(arquivo).toLowerCase();
  const buf = fs.readFileSync(arquivo);
  const r = { tipo: 'texto', texto: '', via: 'texto', semTexto: false, motivo: null, ocultos: [], injecao: [], paginasSemTexto: 0, textoOculto: '' };
  let original = '', escondidos = [], xmlDocx = null, pdfErro = false;

  if (ext === '.html' || ext === '.htm' || ext === '.xhtml') {
    r.tipo = 'html'; r.via = 'pagina salva';
    original = decodificarPagina(buf);
    const h = htmlParaTexto(original);
    r.texto = arrumarEspacos(h.texto); escondidos = h.escondidos;
  } else if (ext === '.pdf') {
    r.tipo = 'pdf';
    let lido = null;
    if (buf.length) { try { lido = pdfPaginas(arquivo, false, { layout: false }); } catch (e) { lido = { pags: [], via: 'pdftotext', erro: true }; } }
    if (!buf.length) r.via = 'pdf';
    else if (!lido) { r.via = 'nenhum'; r.semTexto = true; r.motivo = 'sem-leitor-pdf'; return r; }
    else {
      r.via = lido.via; pdfErro = !!lido.erro;
      original = lido.pags.join('\n');
      r.paginasSemTexto = lido.pags.filter((p) => p.replace(/\s/g, '').length < 30).length;
      r.texto = arrumarEspacos(limparPaginasPdf(lido.pags.map(limparInvisiveis)));
    }
  } else if (ext === '.docx') {
    r.tipo = 'docx'; r.via = 'leitor docx';
    try {
      const d = docxTexto(arquivo, { semOcultos: true });
      xmlDocx = d.xml; original = docxTexto(arquivo).texto;
      r.texto = arrumarEspacos(decodificarEntidades(d.texto));
    } catch (e) { r.texto = ''; }
  } else {
    r.tipo = ext === '.md' ? 'md' : 'texto';
    r.texto = buf.toString('utf8').replace(/^﻿/, '');
    original = r.texto;
  }

  // varredura do ORIGINAL (so avisa, nunca obedece)
  const an = analisarEntrada(original, xmlDocx ? { xmlDocx } : {});
  const motivosEsc = new Set(escondidos.map((e) => e.motivo));
  const lista = escondidos.concat(an.oculto.filter((o) => !(motivosEsc.has(o.motivo) && o.texto)));
  r.ocultos = Array.from(new Set(lista.map(resumo)));
  r.textoOculto = escondidos.map((e) => e.texto).join('\n');
  r.injecao = Array.from(new Set(an.injecao.concat(detectarInjecao(r.texto + '\n' + r.textoOculto))));

  if (r.tipo === 'texto' || r.tipo === 'md') {
    if (!r.texto.trim()) { r.semTexto = true; r.motivo = 'arquivo-vazio'; }
  } else if (alfanum(r.texto) < 30) {
    r.semTexto = true;
    // PDF que o leitor nao conseguiu abrir (corrompido): mesmo passo da pagina sem texto (salvar de novo / como texto)
    r.motivo = !buf.length || r.tipo === 'docx' ? 'arquivo-vazio' : r.tipo === 'pdf' ? (pdfErro ? 'sem-texto-pagina' : 'pdf-escaneado') : 'sem-texto-pagina';
  }
  return r;
}

module.exports = { extrairTexto, limparPaginasPdf, htmlParaTexto, decodificarEntidades, decodificarPagina, pdfPaginas, docxTexto, tem };
