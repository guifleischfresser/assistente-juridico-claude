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
 *   Tabela GFM (| a | b | + |---|:--:|--:|) vira tabela do Word: bordas, cabecalho em negrito repetido a cada
 *   pagina (w:tblHeader), larguras proporcionais ao conteudo, "\|" escapado, valores em R$ a direita.
 *   Peca sem tabela gera o mesmo document.xml de antes (golden em testes/fixtures).
 * Recusa exportar se houver citacao sem fonte e sem a marca [NAO VERIFICADO] (salvo --forcar).
 * v0.5: recusa tambem julgado registrado como divergente/inexistente no livro de conferencias (julgados.js).
 * v0.6: recusa SEMPRE (codigo 3, sem --forcar) peca com texto oculto: fonte branca/minuscula, vanish,
 *       caracteres de largura zero, CSS que esconde (lib/injecao.js).
 * Anonimizacao: recusa (codigo 2, salvo --forcar) peca com marcador nao revertido ([PARTE_A], [CPF_1]...);
 *       com --forcar, os marcadores saem grifados.
 */
const fs = require('fs');
const path = require('path');
const { criarZip } = require('./lib/zip');
const { config } = require('./lib/comum');

const cfg = config();
const F = Object.assign({ fonte: 'Times New Roman', tamanho: 12, entrelinhas: 1.5, recuoPrimeiraLinhaCm: 1.25, recuoCitacaoCm: 4 }, cfg.formatacao || {});
const cm = (x) => Math.round(x * 567);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const RE_INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\[N[ÃA]O VERIFICADO[^\]]*\]|\[PREENCHER[^\]]*\]|\[[A-ZÇÃÉÍÓÚ ]{3,}\]|\[(?:PARTE|CPF|CNPJ|PROCESSO|RG|EMAIL|TELEFONE|ENDERECO|CEP)_[A-Z0-9]{1,4}(?:#\d{1,3})?\])/g;
// opcional (mapa de teses exportado com --forcar): "[🔴 DIVERGENTE: fonte]" sai grifado em vermelho
const RE_INLINE_DIV = new RegExp(RE_INLINE.source.slice(0, -1) + '|\\[🔴[^\\]]*\\])', 'g');

function runs(texto, base, op) {
  base = base || {};
  texto = texto.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)').replace(/`([^`]+)`/g, '$1');
  const out = [];
  const re = new RegExp((op && op.grifarDivergentes ? RE_INLINE_DIV : RE_INLINE).source, 'g');
  let ult = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > ult) out.push(run(texto.slice(ult, m.index), base));
    const t = m[0];
    if (t.startsWith('**')) out.push(run(t.slice(2, -2), Object.assign({}, base, { b: true })));
    else if (t.startsWith('*') || t.startsWith('_')) out.push(run(t.slice(1, -1), Object.assign({}, base, { i: true })));
    else if (t.startsWith('[🔴')) out.push(run(t, Object.assign({}, base, { grifo: 'red', b: true })));
    else out.push(run(t, Object.assign({}, base, { grifo: true, b: true })));
    ult = m.index + t.length;
  }
  if (ult < texto.length) out.push(run(texto.slice(ult), base));
  return out.join('');
}
function run(t, o) {
  const pr = (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') + (o.caps ? '<w:caps/>' : '') + (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : '') + (o.grifo ? '<w:highlight w:val="' + (o.grifo === 'red' ? 'red' : 'yellow') + '"/>' : '');
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

// --- tabelas GFM: | a | b | + linha separadora |---|:--:|--:| (sem a separadora, a linha continua sendo paragrafo)
const LARGURA_UTIL = 11906 - cm(3) - cm(2); // A4 menos as margens esquerda/direita (twips)
const temBarra = (t) => /(^|[^\\])\|/.test(t);
/** Celulas de uma linha de tabela; "\|" vira "|" literal. */
function celulas(linha) {
  let s = linha.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out = []; let atual = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { atual += '|'; i++; continue; }
    if (s[i] === '|') { out.push(atual.trim()); atual = ''; continue; }
    atual += s[i];
  }
  out.push(atual.trim());
  return out;
}
function separador(t, n) {
  if (!temBarra(t) || !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(t)) return null;
  const cs = celulas(t); if (cs.length !== n) return null;
  return cs.map((x) => (/^:-+:$/.test(x) ? 'center' : /-:$/.test(x) ? 'right' : /^:/.test(x) ? 'left' : null));
}
/** Valor em reais (R$ 1.000,00 / 25.000,00): alinhado a direita quando a coluna nao define alinhamento. */
const ehValor = (x) => /^(\*\*)?(R\$\s*)?-?\d{1,3}(\.\d{3})*(,\d{2})?(\*\*)?$/.test(x) && /R\$|,\d{2}/.test(x);
const visivel = (x) => x.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)').replace(/\*\*|[*_`]/g, '');
/** Larguras (twips) proporcionais ao conteudo; a soma nunca passa da largura util da pagina. */
function larguras(linhas, n) {
  const maxLen = Array(n).fill(0), maxPal = Array(n).fill(0);
  for (const l of linhas) l.forEach((x, i) => {
    const v = visivel(x); maxLen[i] = Math.max(maxLen[i], v.length);
    for (const p of v.split(/\s+/)) maxPal[i] = Math.max(maxPal[i], p.length);
  });
  const min = maxPal.map((p) => Math.min(Math.max(p, 2), 16) * 100 + 230);
  const somaMin = min.reduce((a, b) => a + b, 0);
  if (somaMin >= LARGURA_UTIL) return min.map((x) => Math.floor(x * LARGURA_UTIL / somaMin));
  const peso = maxLen.map((x) => Math.min(Math.max(x, 3), 40)); const somaPeso = peso.reduce((a, b) => a + b, 0);
  return min.map((x, i) => x + Math.floor((LARGURA_UTIL - somaMin) * peso[i] / somaPeso));
}
function tabela(cab, alin, corpoT, op) {
  const n = cab.length;
  const linhas = [cab].concat(corpoT.map((l) => Array.from({ length: n }, (_, i) => (l[i] == null ? '' : l[i]))));
  const lg = larguras(linhas, n);
  const sz = Math.max(16, F.tamanho * 2 - 4);
  const numerica = alin.map((a, i) => { const v = linhas.slice(1).map((l) => l[i]).filter(Boolean); return !a && v.length > 0 && v.filter(ehValor).length * 2 >= v.length; });
  const celula = (x, i, cabecalho) => {
    const a = alin[i] || (cabecalho ? (numerica[i] ? 'right' : 'left') : (ehValor(x) ? 'right' : 'left'));
    const conteudo = x.split(/<br\s*\/?>/i).map((p) => runs(p, cabecalho ? { b: true, sz } : { sz }, op)).join('<w:r><w:br/></w:r>');
    return '<w:tc><w:tcPr><w:tcW w:w="' + lg[i] + '" w:type="dxa"/>' + (cabecalho ? '<w:shd w:val="clear" w:color="auto" w:fill="E7E6E6"/>' : '') + '</w:tcPr>' +
      par(conteudo, { alin: a, simples: true, depois: 0 }) + '</w:tc>';
  };
  const borda = (b) => '<w:' + b + ' w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
  return '<w:tbl><w:tblPr><w:tblW w:w="' + lg.reduce((a, b) => a + b, 0) + '" w:type="dxa"/><w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(borda).join('') + '</w:tblBorders>' +
    '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="85" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
    '<w:tblGrid>' + lg.map((w) => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' +
    linhas.map((l, k) => '<w:tr><w:trPr><w:cantSplit/>' + (k === 0 ? '<w:tblHeader/>' : '') + '</w:trPr>' + l.map((x, i) => celula(x, i, k === 0)).join('') + '</w:tr>').join('') +
    '</w:tbl>' + par('', { depois: 120 });
}

/** op.grifarDivergentes: "[🔴 ...]" sai grifado em vermelho (mapa de teses com --forcar). */
function converter(md, op) {
  const linhas = md.replace(/\r/g, '').replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  const corpo = []; let buffer = [], cit = [], dir = {};
  const R = (t, base) => runs(t, base, op);
  const fechar = () => {
    if (buffer.length) {
      const t = buffer.join(' ').trim();
      if (t) corpo.push(par(R(t), dir.centro ? { alin: 'center' } : dir.semRecuo ? {} : { primeira: cm(F.recuoPrimeiraLinhaCm) }));
      buffer = []; dir = {};
    }
    if (cit.length) {
      corpo.push(par(R(cit.join(' ').trim(), { sz: 20 }), { esq: cm(F.recuoCitacaoCm), simples: true, depois: 240 }));
      cit = [];
    }
  };
  let quebra = false;
  for (let k = 0; k < linhas.length; k++) {
    const t = linhas[k].trim();
    if (/^<!--\s*centraliza/.test(t)) { fechar(); dir.centro = true; continue; }
    if (/^<!--\s*sem-recuo/.test(t)) { fechar(); dir.semRecuo = true; continue; }
    if (/^<!--\s*quebra-pagina/.test(t)) { fechar(); quebra = true; continue; }
    if (/^<!--.*-->$/.test(t)) continue;
    if (!t) { fechar(); continue; }
    const alin = temBarra(t) && k + 1 < linhas.length ? separador(linhas[k + 1].trim(), celulas(t).length) : null;
    if (alin) {
      fechar();
      if (quebra) { corpo.push(par('', { quebraAntes: true, depois: 0 })); quebra = false; }
      const corpoT = []; k += 2;
      while (k < linhas.length && linhas[k].trim() && temBarra(linhas[k].trim())) corpoT.push(celulas(linhas[k++]));
      k--;
      corpo.push(tabela(celulas(t), alin, corpoT, op));
      dir = {};
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) { fechar(); continue; }
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
      fechar();
      const nivel = m[1].length;
      const o = nivel === 1 ? { alin: 'center', depois: 240, manterProx: true } : { alin: 'left', depois: 120, manterProx: true };
      if (quebra) { o.quebraAntes = true; quebra = false; }
      corpo.push(par(R(m[2], { b: true, caps: nivel <= 2 }), o));
      continue;
    }
    if (t.startsWith('>')) { if (buffer.length) fechar(); cit.push(t.replace(/^>\s?/, '')); continue; }
    if ((m = t.match(/^([-*+]|\d+[.)]|[a-z][.)])\s+(.*)$/))) {
      fechar();
      const marca = /^[-*+]$/.test(m[1]) ? '–' : m[1];
      corpo.push(par(R(marca + '\u00a0' + m[2]), { esq: cm(F.recuoPrimeiraLinhaCm + 0.75), pendente: cm(0.75) }));
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

// --- regras compartilhadas (tambem usadas por mapa-teses.js exportar) ---
/** Texto oculto na peca (fonte branca/minuscula, vanish, largura zero): mensagem de recusa (codigo 3, sem --forcar) ou null. */
function recusaOculto(md, onde) {
  const inj = require('./lib/injecao');
  const oculto = inj.ocultoNoTexto(md);
  if (!oculto.length) return null;
  return inj.avisoGravacao(oculto, onde || 'na peça') + '\n(Não gerei o Word. Detalhe para o assistente: ' + oculto.map((o) => o.motivo + (o.texto ? ' «' + o.texto.slice(0, 60) + '»' : '')).join('; ') + '. Remova e exporte de novo; --forcar não libera isto.)';
}
/** Marcadores de anonimizacao nao revertidos: { restantes, recusa } (recusa = linhas da mensagem, codigo 2, salvo --forcar). */
function checarAnonimizacao(md, entrada, forcar, oQue) {
  const restantes = require('./lib/anonimizar').marcadores(md);
  if (!restantes.length || forcar) return { restantes, recusa: null };
  return { restantes, recusa: ['❌ Exportação interrompida: ' + (oQue || 'a peça') + ' ainda tem ' + restantes.length + ' marcador(es) de anonimização no lugar de dados reais (ex.: ' + Array.from(new Set(restantes.map((m) => m.marcador))).slice(0, 5).join(', ') + ', linha ' + restantes[0].linha + ').',
    'Devolva os dados reais antes: node "' + path.join(__dirname, 'anonimizar.js') + '" reverter "' + entrada + '" e exporte o arquivo -dados-reais. (Para exportar mesmo assim, com os marcadores grifados: --forcar)'] };
}
const avisoMarcadoresForcados = (n) => '⚠️ ' + n + ' marcador(es) de anonimização foram para o Word (grifados em amarelo) porque você usou --forcar. Troque pelos dados reais antes de protocolar.';
/** Converte e grava o .docx. Retorna null ou a mensagem de recusa (codigo 3) se o Word gerado tiver run invisivel. */
function gravarDocx(md, saida, op) {
  const inj = require('./lib/injecao');
  const corpoXml = converter(md, op);
  // defesa em profundidade: o Word gerado tambem nao pode ter run invisivel
  const ocXml = inj.ocultoNoDocx(corpoXml).concat(inj.detectarInvisiveis(corpoXml).map((m) => ({ motivo: m })));
  if (ocXml.length) return inj.avisoGravacao(ocXml, 'no Word que eu ia gerar') + ' (Não gerei o arquivo.)';
  fs.writeFileSync(saida, montarDocx(corpoXml));
  return null;
}

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const forcar = process.argv.includes('--forcar');
  if (!args[0]) { console.log('Uso: node exportar-docx.js <entrada.md> [saida.docx] [--forcar]'); process.exit(1); }
  const md = fs.readFileSync(args[0], 'utf8');
  // v0.6: nunca exportar peca com texto oculto (nem com --forcar): fonte branca/minuscula, vanish, largura zero
  const oculto = recusaOculto(md);
  if (oculto) { console.log(oculto); process.exit(3); }
  // anonimizacao: o Word e a versao final; marcador que sobrou e dado que faltou devolver
  const anon = checarAnonimizacao(md, args[0], forcar);
  if (anon.recusa) { anon.recusa.forEach((l) => console.log(l)); process.exit(2); }
  const restantes = anon.restantes;
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
  const recusa = gravarDocx(md, saida);
  if (recusa) { console.log(recusa); process.exit(3); }
  if (mem) { try { mem.registrarRascunho(saida); } catch (e) { /* */ } }
  const marcadas = todas.filter((x) => x.marcada).length;
  if (leis.length) console.log('ℹ️ ' + leis.length + ' dispositivo(s) legal(is) citados sem fonte (ex.: ' + leis[0].texto + '). Confira a redação vigente no Planalto.');
  if (restantes.length) console.log(avisoMarcadoresForcados(restantes.length));
  console.log('✅ Documento gerado: ' + saida + (marcadas ? '\n⚠️ Atenção: ' + marcadas + ' citação(ões) marcadas [NÃO VERIFICADO] (grifadas em amarelo). Confira antes de protocolar.' : ''));
}
module.exports = { converter, montarDocx, celulas, larguras, LARGURA_UTIL, recusaOculto, checarAnonimizacao, avisoMarcadoresForcados, gravarDocx };
