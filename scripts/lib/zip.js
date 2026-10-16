'use strict';
// ZIP minimo (leitura e escrita) so com modulos nativos: usado para gerar .docx e ler .docx.
const fs = require('fs');
const zlib = require('zlib');

const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** Data/hora no formato DOS (padrao valido 1980-01-01, reprodutivel). */
function dataDos(d) {
  if (!d) return { hora: 0, data: (0 << 9) | (1 << 5) | 1 };
  return { hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2), data: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

/** arquivos: [{nome, dados(Buffer|string), modo?(permissoes unix, ex. 0o755)}] -> Buffer zip.
 *  opts.data: Date fixa; opts.semCompressao: STORE (bytes identicos em qualquer versao do zlib/Node). */
function criarZip(arquivos, opts) {
  const partes = [], central = []; let offset = 0;
  const dd = dataDos(opts && opts.data);
  for (const a of arquivos) {
    const nome = Buffer.from(a.nome, 'utf8');
    const dados = Buffer.isBuffer(a.dados) ? a.dados : Buffer.from(a.dados, 'utf8');
    const guardar = !!(opts && opts.semCompressao); const metodo = guardar ? 0 : 8;
    const comp = guardar ? dados : zlib.deflateRawSync(dados); const crc = crc32(dados);
    const loc = Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt16LE(0x0800, 6); loc.writeUInt16LE(metodo, 8);
    loc.writeUInt16LE(dd.hora, 10); loc.writeUInt16LE(dd.data, 12); loc.writeUInt32LE(crc, 14); loc.writeUInt32LE(comp.length, 18); loc.writeUInt32LE(dados.length, 22);
    loc.writeUInt16LE(nome.length, 26); loc.writeUInt16LE(0, 28);
    partes.push(loc, nome, comp);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(a.modo ? 0x0314 : 20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(metodo, 10);
    cen.writeUInt16LE(dd.hora, 12); cen.writeUInt16LE(dd.data, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(comp.length, 20); cen.writeUInt32LE(dados.length, 24);
    cen.writeUInt16LE(nome.length, 28); if (a.modo) cen.writeUInt32LE(((0o100000 | a.modo) << 16) >>> 0, 38); cen.writeUInt32LE(offset, 42);
    central.push(cen, nome);
    offset += 30 + nome.length + comp.length;
  }
  const cdir = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(arquivos.length, 8); fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(cdir.length, 12); fim.writeUInt32LE(offset, 16);
  return Buffer.concat(partes.concat([cdir, fim]));
}

/** Le um zip (Buffer ou caminho) -> Map nome -> Buffer */
function lerZip(entrada) {
  const buf = Buffer.isBuffer(entrada) ? entrada : fs.readFileSync(entrada);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('arquivo zip/docx inválido');
  const total = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  const mapa = new Map();
  for (let n = 0; n < total; n++) {
    const metodo = buf.readUInt16LE(p + 10), tamC = buf.readUInt32LE(p + 20);
    const lenN = buf.readUInt16LE(p + 28), lenE = buf.readUInt16LE(p + 30), lenK = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const nome = buf.slice(p + 46, p + 46 + lenN).toString('utf8');
    const ini = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const bruto = buf.slice(ini, ini + tamC);
    mapa.set(nome, metodo === 8 ? zlib.inflateRawSync(bruto) : bruto);
    p += 46 + lenN + lenE + lenK;
  }
  return mapa;
}
module.exports = { criarZip, lerZip, crc32 };
