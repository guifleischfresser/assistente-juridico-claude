#!/usr/bin/env node
'use strict';
/*
 * Exporta uma peca em Markdown para .docx com formatacao forense (padrao ABNT adaptado):
 * A4; margens sup/esq 3 cm, inf/dir 2 cm; fonte 12; entrelinhas 1,5; recuo de 1a linha 1,25 cm;
 * texto justificado; citacao longa (linha iniciada por ">") com recuo de 4 cm, fonte 10, espaco simples;
 * numero de pagina no rodape. Sem dependencias (zip proprio). Pandoc/python-docx sao opcionais.
 *
 * Uso: node exportar-docx.js <entrada.md> [saida.docx] [--forcar]
 * Marcacoes aceitas: # Titulo centralizado | ## Secao | ### Subsecao | **negrito** | *italico*
 *   > citacao longa | - item / 1. item / a) item | <!-- centralizar --> antes de um paragrafo
 *   <!-- sem-recuo --> | <!-- quebra-pagina -->.  "[NAO VERIFICADO]" e "[PREENCHER ...]" saem grifados.
 * Recusa exportar se houver citacao sem fonte e sem a marca [NAO VERIFICADO] (salvo --forcar).
 * v0.5: recusa tambem julgado registrado como divergente/inexistente no livro de conferencias (julgados.js).
 * v0.6: recusa SEMPRE (codigo 3, sem --forcar) peca com texto oculto: fonte branca/minuscula, vanish,
 *       caracteres de largura zero, CSS que esconde (lib/injecao.js).
 */
const fs = require('fs');
const path = require('path');
const { criarZip } = require('./lib/zip');
const { config } = require('./lib/comum');

const cfg = config();
const F = Object.assign({ fonte: 'Times New Roman', tamanho: 12, entrelinhas: 1.5, recuoPrimeiraLinhaCm: 1.25, recuoCitacaoCm: 4 }, cfg.formatacao || {});
const cm = (x) => Math.round(x * 567);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function runs(texto, base) {
  base = base || {};
  texto = texto.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)').replace(/`([^`]+)`/g, '$1');
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\[N[ÃA]O VERIFICADO[^\]]*\]|\[PREENCHER[^\]]*\]|\[[A-ZÇÃÉÍÓÚ ]{3,}\])/g;
  let ult = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > ult) out.push(run(texto.slice(ult, m.index), base));
    const t = m[0];
    if (t.startsWith('**')) out.push(run(t.slice(2, -2), Object.assign({}, base, { b: true })));
    else if (t.startsWith('*') || t.startsWith('_')) out.push(run(t.slice(1, -1), Object.assign({}, base, { i: true })));
    else out.push(run(t, Object.assign({}, base, { grifo: true, b: true })));
    ult = m.index + t.length;
  }
  if (ult < texto.length) out.push(run(texto.slice(ult), base));
  return out.join('');
}
function run(t, o) {
  const pr = (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') + (o.caps ? '<w:caps/>' : '') + (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : '') + (o.grifo ? '<w:highlight w:val="yellow"/>' : '');
  return '<w:r>' + (pr ? '<w:rPr>' + pr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + esc(t) + '</w:t></w:r>';
}
function par(conteudo, o) {
  o = o || {};
  const linha = Math.round(240 * (o.simples ? 1 : F.entrelinhas));
  let ppr = '<w:spacing w:before="0" w:after="' + (o.depois != null ? o.depois : 120) + '" w:line="' + linha + '" w:lineRule="auto"/>';
  const ind = [];
  if (o.esq) ind.push('w:left="' + o.esq + '"');
  if (o.primeira) ind.push('w:firstLine="' + o.primeira + '"');
  if (o.pendente) ind.push('w:hanging="' + o.pendente + '"');
  if (ind.length) ppr += '<w:ind ' + ind.join(' ') + '/>';
  ppr += '<w:jc w:val="' + (o.alin || 'both') + '"/>';
  if (o.quebraAntes) ppr += '<w:pageBreakBefore/>';
  if (o.manterProx) ppr += '<w:keepNext/>';
  return '<w:p><w:pPr>' + ppr + '</w:pPr>' + conteudo + '</w:p>';
}

function converter(md) {
  const linhas = md.replace(/\r/g, '').replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  const corpo = []; let buffer = [], cit = [], dir = {};
  const fechar = () => {
    if (buffer.length) {
      const t = buffer.join(' ').trim();
      if (t) corpo.push(par(runs(t), dir.centro ? { alin: 'center' } : dir.semRecuo ? {} : { primeira: cm(F.recuoPrimeiraLinhaCm) }));
      buffer = []; dir = {};
    }
    if (cit.length) {
      corpo.push(par(runs(cit.join(' ').trim(), { sz: 20 }), { esq: cm(F.recuoCitacaoCm), simples: true, depois: 240 }));
      cit = [];
    }
  };
  let quebra = false;
  for (const l of linhas) {
    const t = l.trim();
    if (/^<!--\s*centraliza/.test(t)) { fechar(); dir.centro = true; continue; }
    if (/^<!--\s*sem-recuo/.test(t)) { fechar(); dir.semRecuo = true; continue; }
    if (/^<!--\s*quebra-pagina/.test(t)) { fechar(); quebra = true; continue; }
    if (/^<!--.*-->$/.test(t)) continue;
    if (!t) { fechar(); continue; }
    if (/^(-{3,}|\*{3,})$/.test(t)) { fechar(); continue; }
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
      fechar();
      const nivel = m[1].length;
      const o = nivel === 1 ? { alin: 'center', depois: 240, manterProx: true } : { alin: 'left', depois: 120, manterProx: true };
      if (quebra) { o.quebraAntes = true; quebra = false; }
      corpo.push(par(runs(m[2], { b: true, caps: nivel <= 2 }), o));
      continue;
    }
    if (t.startsWith('>')) { if (buffer.length) fechar(); cit.push(t.replace(/^>\s?/, '')); continue; }
    if ((m = t.match(/^([-*+]|\d+[.)]|[a-z][.)])\s+(.*)$/))) {
      fechar();
      const marca = /^[-*+]$/.test(m[1]) ? '–' : m[1];
      corpo.push(par(runs(marca + '\u00a0' + m[2]), { esq: cm(F.recuoPrimeiraLinhaCm + 0.75), pendente: cm(0.75) }));
      continue;
    }
    if (quebra && !buffer.length) { corpo.push(par('', { quebraAntes: true, depois: 0 })); quebra = false; }
    buffer.push(t);
  }
  fechar();
  return corpo.join('');
}

function montarDocx(corpoXml) {
  const tam = F.tamanho * 2;
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + '><w:body>' + corpoXml +
    '<w:sectPr><w:footerReference w:type="default" r:id="rIdRodape"/><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="' + cm(3) + '" w:right="' + cm(2) + '" w:bottom="' + cm(2) + '" w:left="' + cm(3) + '" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const estilos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + W + '><w:docDefaults><w:rPrDefault><w:rPr>' +
    '<w:rFonts w:ascii="' + esc(F.fonte) + '" w:hAnsi="' + esc(F.fonte) + '" w:cs="' + esc(F.fonte) + '" w:eastAsia="' + esc(F.fonte) + '"/><w:sz w:val="' + tam + '"/><w:szCs w:val="' + tam + '"/><w:lang w:val="pt-BR"/>' +
    '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>';
  const rodape = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ' + W + '><w:p><w:pPr><w:jc w:val="right"/></w:pPr>' +
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
  return criarZip([
    { nome: '[Content_Types].xml', dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>' },
    { nome: '_rels/.rels', dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { nome: 'word/_rels/document.xml.rels', dados: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdEstilos" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdRodape" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>' },
    { nome: 'word/document.xml', dados: doc },
    { nome: 'word/styles.xml', dados: estilos },
    { nome: 'word/footer1.xml', dados: rodape },
  ]);
}

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const forcar = process.argv.includes('--forcar');
  if (!args[0]) { console.log('Uso: node exportar-docx.js <entrada.md> [saida.docx] [--forcar]'); process.exit(1); }
  const md = fs.readFileSync(args[0], 'utf8');
  // v0.6: nunca exportar peca com texto oculto (nem com --forcar): fonte branca/minuscula, vanish, largura zero
  const inj = require('./lib/injecao');
  const oculto = inj.ocultoNoTexto(md);
  if (oculto.length) {
    console.log(inj.avisoGravacao(oculto, 'na peça') + '\n(Não gerei o Word. Detalhe para o assistente: ' + oculto.map((o) => o.motivo + (o.texto ? ' «' + o.texto.slice(0, 60) + '»' : '')).join('; ') + '. Remova e exporte de novo; --forcar não libera isto.)');
    process.exit(3);
  }
  const { analisarCitacoes } = require('./lib/citacoes');
  const todas = analisarCitacoes(md, path.dirname(args[0]), cfg.escritorio);
  const prob = todas.filter((x) => x.problema);
  if (prob.length && !forcar) {
    console.log('❌ Exportação interrompida: ' + prob.length + ' julgado(s) conferido(s) no original que NÃO conferem com a peça:');
    prob.slice(0, 15).forEach((x) => console.log('  - ' + x.texto + ' (linha ' + x.linha + '): ' + (x.problema === 'inexistente' ? 'não existe' : 'trecho/conteúdo divergente') + ' — fonte: ' + (x.fonteRegistro || '?')));
    console.log('Corrija o trecho ou remova a citação (/verificar-citacoes). (Para exportar mesmo assim: --forcar)');
    process.exit(2);
  }
  const pend = todas.filter((x) => !x.verificada && !x.marcada && !x.problema && x.tipo === 'jurisprudencia');
  const leis = todas.filter((x) => !x.verificada && !x.marcada && x.tipo === 'legislacao');
  if (pend.length && !forcar) {
    console.log('❌ Exportação interrompida: ' + pend.length + ' citação(ões) de JURISPRUDÊNCIA sem fonte e sem a marca [NÃO VERIFICADO]:');
    pend.slice(0, 15).forEach((x) => console.log('  - ' + x.texto + ' (linha ' + x.linha + ')' + (x.semTexto ? ' (o arquivo salvo não tinha texto legível — veja `julgados.js situacao`)' : '')));
    console.log('Rode /verificar-citacoes para marcar ou incluir a fonte. (Para exportar mesmo assim: --forcar)');
    process.exit(2);
  }
  const saida = args[1] || args[0].replace(/\.md$/i, '') + '.docx';
  // memoria de estilo: aprende com o que o advogado mudou no .docx anterior e fotografa o novo rascunho
  let mem = null; try { mem = require('./memoria'); if (!(mem.ehPeca(saida) || mem.ehPeca(args[0]))) mem = null; } catch (e) { mem = null; }
  if (mem && fs.existsSync(saida)) { try { mem.aprenderEdicoes(saida); } catch (e) { /* */ } }
  const corpoXml = converter(md);
  // defesa em profundidade: o Word gerado tambem nao pode ter run invisivel
  const ocXml = inj.ocultoNoDocx(corpoXml).concat(inj.detectarInvisiveis(corpoXml).map((m) => ({ motivo: m })));
  if (ocXml.length) { console.log(inj.avisoGravacao(ocXml, 'no Word que eu ia gerar') + ' (Não gerei o arquivo.)'); process.exit(3); }
  fs.writeFileSync(saida, montarDocx(corpoXml));
  if (mem) { try { mem.registrarRascunho(saida); } catch (e) { /* */ } }
  const marcadas = todas.filter((x) => x.marcada).length;
  if (leis.length) console.log('ℹ️ ' + leis.length + ' dispositivo(s) legal(is) citados sem fonte (ex.: ' + leis[0].texto + '). Confira a redação vigente no Planalto.');
  console.log('✅ Documento gerado: ' + saida + (marcadas ? '\n⚠️ Atenção: ' + marcadas + ' citação(ões) marcadas [NÃO VERIFICADO] (grifadas em amarelo). Confira antes de protocolar.' : ''));
}
module.exports = { converter, montarDocx };
