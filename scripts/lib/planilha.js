'use strict';
// Leitura minima de planilha (.csv e .xlsx) so com modulos nativos: usada pelo mapa-teses.js importar-valores.
// Devolve uma grade de celulas (numero, texto ou null). Nada de rede, nada de dependencia.
// .xlsx: zip (lib/zip.js) + xl/workbook.xml (ordem das abas) + sharedStrings; numero e formula usam o valor em cache (<v>).
const fs = require('fs');
const path = require('path');

const LIMITE = 20 * 1024 * 1024;
const RECUSA_FORMATO = 'Não consigo ler esse formato de planilha (só .xlsx e .csv). Abra o arquivo no Excel ou no LibreOffice, use "Salvar como" e escolha .xlsx (Pasta de Trabalho do Excel) ou .csv, e me passe o arquivo novo.';

// ---------- numeros no padrao brasileiro ----------
/** "R$ 1.234,56" | "1234,56" | "1.234" | "1234.56" -> numero; texto que nao e numero -> null. */
function numeroBR(s) {
  if (typeof s === 'number') return isFinite(s) ? s : null;
  if (s == null) return null;
  let t = String(s).replace(/[\s  ]/g, '').replace(/^R\$/i, '').replace(/^\((.*)\)$/, '-$1');
  if (!t) return null;
  const neg = /^-/.test(t); t = t.replace(/^[-+]/, '').replace(/^R\$/i, '');
  if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return null;
  const ultV = t.lastIndexOf(','), ultP = t.lastIndexOf('.');
  if (ultV >= 0 && ultP >= 0) {
    // os dois: o ultimo e o decimal
    if (ultV > ultP) { if (!/^\d{1,3}(\.\d{3})*,\d+$/.test(t)) return null; t = t.replace(/\./g, '').replace(',', '.'); }
    else { if (!/^\d{1,3}(,\d{3})*\.\d+$/.test(t)) return null; t = t.replace(/,/g, ''); }
  } else if (ultV >= 0) {
    if (!/^\d+,\d+$/.test(t)) return null; t = t.replace(',', '.'); // virgula = decimal (padrao BR)
  } else if (ultP >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); // 1.234 / 1.234.567 = milhar
    else if (!/^\d+\.\d{1,2}$/.test(t)) return null;
  }
  const v = parseFloat(t);
  return isFinite(v) ? (neg ? -v : v) : null;
}

// ---------- CSV ----------
function decodificar(buf) {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.slice(3).toString('utf8');
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString('utf16le');
  const u = buf.toString('utf8');
  return u.includes('�') ? buf.toString('latin1') : u; // Excel em pt-BR grava CSV em windows-1252
}
/** Separador: o mais frequente (fora de aspas) entre ; , e TAB nas primeiras linhas. "sep=;" do Excel tambem vale. */
function separador(texto) {
  const m = texto.match(/^sep=(.)\r?\n/i); if (m) return { sep: m[1], pular: m[0].length };
  const amostra = texto.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20).map((l) => l.replace(/"[^"]*"/g, ''));
  let melhor = ';', nota = -1;
  for (const s of [';', '\t', ',']) {
    const n = amostra.reduce((a, l) => a + l.split(s).length - 1, 0);
    if (n > nota) { nota = n; melhor = s; }
  }
  return { sep: melhor, pular: 0 };
}
function lerCsv(buf) {
  let texto = decodificar(buf);
  const { sep, pular } = separador(texto); texto = texto.slice(pular);
  const linhas = []; let linha = [], cel = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) { if (ch === '"') { if (texto[i + 1] === '"') { cel += '"'; i++; } else aspas = false; } else cel += ch; continue; }
    if (ch === '"' && !cel.trim()) { aspas = true; cel = ''; } else if (ch === sep) { linha.push(cel); cel = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && texto[i + 1] === '\n') i++; linha.push(cel); linhas.push(linha); linha = []; cel = ''; } else cel += ch;
  }
  if (cel !== '' || linha.length) { linha.push(cel); linhas.push(linha); }
  return { linhas: linhas.map((l) => l.map((x) => (x.trim() === '' ? null : x.trim()))), separador: sep === '\t' ? 'TAB' : sep };
}

// ---------- XLSX ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function desescapar(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] != null ? ENT[e] : m))
    .replace(/_x([0-9a-f]{4})_/gi, (m, h) => String.fromCharCode(parseInt(h, 16)));
}
const atributo = (tag, nome) => { const m = tag.match(new RegExp('\\s' + nome + '="([^"]*)"')); return m ? desescapar(m[1]) : null; };
/** Texto de um <si>/<is>: todos os <t> (rich text), sem a leitura fonetica (<rPh>). */
const textoT = (xml) => (xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').match(/<t(?:\s[^>]*)?>[\s\S]*?<\/t>|<t(?:\s[^>]*)?\/>/g) || []).map((t) => desescapar(t.replace(/^<t[^>]*>|<\/t>$/g, '').replace(/^<t[^>]*\/>$/, ''))).join('');
function colunaIndice(letras) { let n = 0; for (const ch of letras.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
function letraColuna(i) { let s = ''; i += 1; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }

function abasXlsx(z) {
  const wb = z.get('xl/workbook.xml'); if (!wb) return null;
  const rels = {}; const relXml = (z.get('xl/_rels/workbook.xml.rels') || '').toString('utf8');
  for (const r of relXml.match(/<Relationship\b[^>]*>/g) || []) rels[atributo(r, 'Id')] = atributo(r, 'Target');
  const abas = [];
  for (const s of wb.toString('utf8').match(/<sheet\b[^>]*>/g) || []) {
    let alvo = rels[atributo(s, 'r:id')] || '';
    alvo = alvo.startsWith('/') ? alvo.slice(1) : path.posix.normalize('xl/' + alvo);
    abas.push({ nome: atributo(s, 'name') || '', arquivo: alvo });
  }
  return abas;
}
function lerXlsx(z, aba) {
  const abas = abasXlsx(z);
  if (!abas || !abas.length) return { erro: 'Não achei nenhuma aba na planilha (o .xlsx parece incompleto). ' + RECUSA_FORMATO };
  let escolhida = abas[0];
  if (aba != null && aba !== true) {
    const n = /^\d+$/.test(String(aba)) ? parseInt(aba, 10) : 0;
    const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    escolhida = (n >= 1 && abas[n - 1]) || abas.find((a) => norm(a.nome) === norm(aba));
    if (!escolhida) return { erro: 'A planilha não tem a aba "' + aba + '". Abas: ' + abas.map((a, i) => (i + 1) + ') ' + a.nome).join(', ') + '.' };
  }
  const folha = z.get(escolhida.arquivo);
  if (!folha) return { erro: 'Não achei a aba "' + escolhida.nome + '" dentro do .xlsx. ' + RECUSA_FORMATO };
  const compart = []; const ss = z.get('xl/sharedStrings.xml');
  if (ss) for (const si of ss.toString('utf8').match(/<si\b[\s\S]*?<\/si>|<si\s*\/>/g) || []) compart.push(textoT(si));
  const linhas = []; const xml = folha.toString('utf8');
  const reLinha = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g; let mL, prox = 0;
  while ((mL = reLinha.exec(xml))) {
    const rAttr = atributo(mL[1], 'r'); const iL = rAttr ? parseInt(rAttr, 10) - 1 : prox; prox = iL + 1;
    const linha = []; let proxC = 0;
    const reCel = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let mC;
    while ((mC = reCel.exec(mL[2] || ''))) {
      const ref = atributo(mC[1], 'r'); const iC = ref ? colunaIndice(ref.replace(/\d+/g, '')) : proxC; proxC = iC + 1;
      const tipo = atributo(mC[1], 't') || 'n'; const corpo = mC[2] || '';
      const v = corpo.match(/<v>([\s\S]*?)<\/v>/); const bruto = v ? desescapar(v[1]) : null;
      let val = null;
      if (tipo === 's') val = bruto != null ? (compart[parseInt(bruto, 10)] != null ? compart[parseInt(bruto, 10)] : null) : null;
      else if (tipo === 'inlineStr') { const is = corpo.match(/<is>([\s\S]*?)<\/is>/); val = is ? textoT(is[1]) : null; }
      else if (tipo === 'str' || tipo === 'e') val = bruto; // formula de texto (ou erro, ex.: #DIV/0!): valor em cache, como texto
      else if (tipo === 'b') val = bruto;
      else val = bruto != null && bruto.trim() !== '' && isFinite(Number(bruto)) ? Number(bruto) : null; // numero ou formula numerica: valor em cache
      if (typeof val === 'string' && !val.trim()) val = null;
      linha[iC] = typeof val === 'string' ? val.trim() : val;
    }
    linhas[iL] = Array.from(linha, (x) => (x === undefined ? null : x));
  }
  return { linhas: Array.from(linhas, (l) => l || []), aba: escolhida.nome, abas: abas.map((a) => a.nome) };
}

/** Le a planilha: { linhas[[celula]], tipo, aba?, separador? } ou { erro }. */
function lerPlanilha(arq, opts) {
  opts = opts || {};
  const ext = path.extname(arq).toLowerCase();
  if (/^\.(xls|xlt|xlsb|ods|fods|sxc|numbers)$/.test(ext)) return { erro: 'A planilha ' + path.basename(arq) + ' está em formato ' + ext + '. ' + RECUSA_FORMATO, formato: true };
  if (!/^\.(xlsx|xlsm|csv|txt)$/.test(ext)) return { erro: 'Não reconheço a planilha ' + path.basename(arq) + '. ' + RECUSA_FORMATO, formato: true };
  const st = fs.statSync(arq);
  if (st.size > LIMITE) return { erro: 'A planilha ' + path.basename(arq) + ' é grande demais (' + Math.round(st.size / 1048576) + ' MB). Salve só a aba do cálculo em .csv e me passe esse arquivo.' };
  const buf = fs.readFileSync(arq);
  // .xls antigo (OLE) ou .ods renomeados: recusa igual
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0xd0cf11e0) return { erro: 'A planilha ' + path.basename(arq) + ' é um .xls antigo (só com a extensão trocada). ' + RECUSA_FORMATO, formato: true };
  if (ext === '.csv' || ext === '.txt') {
    if (buf.length >= 4 && buf.readUInt32LE(0) === 0x04034b50) return { erro: 'O arquivo ' + path.basename(arq) + ' não é um .csv de verdade (parece uma planilha compactada). ' + RECUSA_FORMATO, formato: true };
    return Object.assign({ tipo: 'csv' }, lerCsv(buf));
  }
  let z; try { z = require('./zip').lerZip(buf); } catch (e) { return { erro: 'Não consegui abrir ' + path.basename(arq) + ' como .xlsx (arquivo danificado ou de outro formato). ' + RECUSA_FORMATO, formato: true }; }
  const mime = z.get('mimetype'); if (mime && /opendocument/.test(mime.toString('utf8'))) return { erro: 'A planilha ' + path.basename(arq) + ' é do LibreOffice (.ods), só com a extensão trocada. ' + RECUSA_FORMATO, formato: true };
  if (!z.has('xl/workbook.xml')) return { erro: 'O arquivo ' + path.basename(arq) + ' não é uma planilha do Excel. ' + RECUSA_FORMATO, formato: true };
  return Object.assign({ tipo: 'xlsx' }, lerXlsx(z, opts.aba));
}

module.exports = { lerPlanilha, numeroBR, lerCsv, colunaIndice, letraColuna, RECUSA_FORMATO };
