#!/usr/bin/env node
'use strict';
/*
 * Exporta uma peca em Markdown para .docx com formatacao forense (padrao ABNT adaptado):
 * A4; margens sup/esq 3 cm, inf/dir 2 cm; fonte 12; entrelinhas 1,5; recuo de 1a linha 1,25 cm;
 * texto justificado; citacao longa (linha iniciada por ">") com recuo de 4 cm, fonte 10, espaco simples;
 * numero de pagina no rodape. Sem dependencias (zip proprio). Pandoc/python-docx sao opcionais.
 *
 * Uso: node exportar-docx.js <entrada.md> [saida.docx] [--forcar] [--restaurar]
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
 * Sumulas (lib/sumulas.js, lista local): cancelada, com tribunal identificado e nao citada como historico =>
 *       recusa (codigo 2, salvo --forcar); com --forcar sai "[⚠️ SÚMULA CANCELADA]" grifado em vermelho.
 *       Superada, sem tribunal ou historica: so aviso. Peca sem sumula da lista gera o mesmo document.xml.
 */
const fs = require('fs');
const path = require('path');
const { criarZip } = require('./lib/zip');
const { config, dentroDe, norm } = require('./lib/comum');
const A = require('./lib/anonimizar');
const cofre = require('./lib/cofre');

const cfg = config();
const F = Object.assign({ fonte: 'Times New Roman', tamanho: 12, entrelinhas: 1.5, recuoPrimeiraLinhaCm: 1.25, recuoCitacaoCm: 4 }, cfg.formatacao || {});
const cm = (x) => Math.round(x * 567);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const RE_INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\[N[ÃA]O VERIFICADO[^\]]*\]|\[PREENCHER[^\]]*\]|\[[A-ZÇÃÉÍÓÚ ]{3,}\]|\[(?:PARTE|CPF|CNPJ|PROCESSO|RG|EMAIL|TELEFONE|ENDERECO|CEP)_[A-Z0-9]{1,4}(?:#\d{1,3})?\])/g;
// opcional (mapa de teses exportado com --forcar): "[🔴 DIVERGENTE: fonte]" sai grifado em vermelho
const RE_INLINE_DIV = new RegExp(RE_INLINE.source.slice(0, -1) + '|\\[🔴[^\\]]*\\])', 'g');
// opcional (peca/mapa exportado com --forcar apesar de sumula cancelada): "[⚠️ SÚMULA CANCELADA]" sai grifado em vermelho
const SUMULA_CANCELADA = '[⚠️ SÚMULA CANCELADA]';
const reInline = (op) => {
  const base = op && op.grifarDivergentes ? RE_INLINE_DIV : RE_INLINE;
  return op && op.grifarSumulas ? new RegExp(base.source.slice(0, -1) + '|\\[⚠️ SÚMULA CANCELADA[^\\]]*\\])', 'g') : base;
};

function runs(texto, base, op) {
  base = base || {};
  texto = texto.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)').replace(/`([^`]+)`/g, '$1');
  const render = op?.restaurar || run;
  const out = [];
  const re = new RegExp(reInline(op).source, 'g');
  let ult = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > ult) out.push(render(texto.slice(ult, m.index), base));
    const t = m[0];
    if (t.startsWith('**')) out.push(render(t.slice(2, -2), Object.assign({}, base, { b: true })));
    else if (t.startsWith('*') || t.startsWith('_')) out.push(render(t.slice(1, -1), Object.assign({}, base, { i: true })));
    else if (t.startsWith('[🔴') || t.startsWith('[⚠️ SÚMULA')) out.push(render(t, Object.assign({}, base, { grifo: 'red', b: true })));
    else out.push(render(t, Object.assign({}, base, { grifo: true, b: true })));
    ult = m.index + t.length;
  }
  if (ult < texto.length) out.push(render(texto.slice(ult), base));
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
    'Para devolver os dados no Word, execute localmente: node "' + path.join(__dirname, 'exportar-docx.js') + '" "' + entrada + '" --restaurar. Para exportar com os marcadores grifados: --forcar.'] };
}
const avisoMarcadoresForcados = (n) => '⚠️ ' + n + ' marcador(es) de anonimização foram para o Word (grifados em amarelo) porque você usou --forcar. Troque pelos dados reais antes de protocolar.';
/**
 * Sumulas canceladas/superadas (lib/sumulas.js; lista local + ajuste do escritorio). Fail-open.
 * Retorna { avaliadas, bloqueio[], recusa (linhas, codigo 2, salvo --forcar) | null, avisos[] (linhas para depois de exportar) }.
 * So 'cancelada' + tribunal identificado + citacao nao consciente bloqueia; superada, sem tribunal e historica so avisam.
 */
function checarSumulas(md, cits, forcar, oQue) {
  let av = []; try { av = require('./lib/sumulas').avaliarSumulas(md, cits, { escritorio: cfg.escritorio }); } catch (e) { av = []; }
  const bloqueio = av.filter((x) => x.sumula.nivel === 'bloqueio');
  const recusa = bloqueio.length && !forcar ? ['❌ Exportação interrompida: ' + (oQue || 'a peça') + ' cita ' + bloqueio.length + ' súmula(s) cancelada(s) como se ainda valessem:']
    .concat(bloqueio.slice(0, 15).map((x) => '  - linha ' + x.linha + ': ' + x.sumula.mensagem),
      ['Troque a súmula (ou a tese). Se a citação é de propósito, como histórico, escreva isso na frase ou ponha [CITADA COMO HISTÓRICO] logo depois. Se a lista estiver errada, confira no site do tribunal e registre: julgados.js sumula marcar "<súmula>" --vigente --fonte <link>. (Para exportar mesmo assim, com ' + SUMULA_CANCELADA + ' grifado em vermelho: --forcar)']) : null;
  const avisos = [];
  if (bloqueio.length && forcar) avisos.push('⚠️ Exportado com --forcar apesar de ' + bloqueio.length + ' súmula(s) cancelada(s) (saem com ' + SUMULA_CANCELADA + ' grifado em vermelho). Não protocole assim sem conferir.');
  av.filter((x) => x.sumula.nivel !== 'bloqueio').forEach((x) => avisos.push((x.sumula.nivel === 'info' ? 'ℹ️ ' : '⚠️ ') + 'Linha ' + x.linha + ': ' + x.sumula.mensagem));
  return { avaliadas: av, bloqueio, recusa, avisos };
}
/** So na copia exportada: poe " [⚠️ SÚMULA CANCELADA]" depois de cada sumula cancelada que bloquearia (reanalisa o texto dado). */
function marcarSumulasCanceladas(texto, dir) {
  const cits = require('./lib/citacoes').analisarCitacoes(texto, dir, cfg.escritorio);
  const { bloqueio } = checarSumulas(texto, cits, true);
  for (const x of bloqueio.slice().sort((a, b) => b.sumula.fimTribunal - a.sumula.fimTribunal)) {
    const fim = x.sumula.fimTribunal;
    if (texto.slice(fim, fim + 40).includes(SUMULA_CANCELADA)) continue;
    texto = texto.slice(0, fim) + ' ' + SUMULA_CANCELADA + texto.slice(fim);
  }
  return { texto, n: bloqueio.length };
}
/** Converte e grava o .docx. Retorna null ou a mensagem de recusa (codigo 3) se o Word gerado tiver run invisivel. */
function gravarDocx(md, saida, op) {
  const inj = require('./lib/injecao');
  const corpoXml = converter(md, op);
  // defesa em profundidade: o Word gerado tambem nao pode ter run invisivel
  const ocXml = inj.ocultoNoDocx(corpoXml).concat(inj.detectarInvisiveis(corpoXml).map((m) => ({ motivo: m })));
  if (ocXml.length) return op?.restaurar ? 'Texto oculto no Word.' :
    inj.avisoGravacao(ocXml, 'no Word que eu ia gerar') + ' (Não gerei o arquivo.)';
  const docx = montarDocx(corpoXml);
  if (op?.restaurar) {
    cofre.gravarAtomico(saida, docx, '.advogado-restaurado.docx-', true);
  } else {
    if (cofre.ehSaidaProtegida(saida)) throw Error('Reserve o sufixo -restaurado.docx para a exportação com --restaurar.');
    fs.writeFileSync(saida, docx);
  }
  return null;
}

// Mantém os marcadores fora da gramática Markdown. Os valores entram só nos runs de texto.
function prepararRunsRestaurados(md, tabela, bloqueio) {
  let prefixo = '\uE000';
  while (md.includes(prefixo) || tabela.entradas.some((e) => e.formas.some((v) => v.includes(prefixo)))) prefixo += '\uE000';
  const valores = [];
  const marcas = [...new Set(bloqueio.map((x) => x.sumula.fimTribunal))].sort((a, b) => a - b);
  let bruto = 0;
  let pos = 0;
  let indice = 0;
  let texto = '';
  const token = (valor) => prefixo + (valores.push(valor) - 1) + '\uE001';
  const emitir = (trecho, literal) => {
    const fim = pos + trecho.length;
    let inicio = 0;
    while (indice < marcas.length && marcas[indice] <= fim) {
      const corte = marcas[indice++] - pos;
      const antes = trecho.slice(inicio, corte);
      texto += (literal && antes ? token(antes) : antes) + token(null);
      inicio = corte;
    }
    const resto = trecho.slice(inicio);
    texto += literal && resto ? token(resto) : resto;
    pos = fim;
  };
  for (const m of A.marcadores(md)) {
    emitir(md.slice(bruto, m.ini), false);
    emitir(A.reverterTexto(m.marcador, tabela).texto, true);
    bruto = m.fim;
  }
  emitir(md.slice(bruto), false);
  const tokens = new RegExp(prefixo + '(\\d+)\uE001', 'g');
  const grifos = new RegExp(prefixo + '|\\[⚠️ SÚMULA CANCELADA\\]|\\[(?:N[ÃA]O VERIFICAD[OA]|A VERIFICAR)[^\\]\\r\\n]*\\]', 'gi');
  const restaurar = (trecho, estilo) => {
    const restaurado = trecho.replace(tokens, (_, i) => valores[Number(i)] ?? prefixo);
    let xml = '';
    let fim = 0;
    for (const m of restaurado.matchAll(grifos)) {
      if (m.index > fim) xml += run(restaurado.slice(fim, m.index), estilo);
      const avisoInserido = m[0] === prefixo;
      const sumula = avisoInserido || m[0].toUpperCase() === SUMULA_CANCELADA;
      xml += run(avisoInserido ? ' ' + SUMULA_CANCELADA : m[0], { ...estilo, b: true, grifo: sumula ? 'red' : true });
      fim = m.index + m[0].length;
    }
    return xml + (fim < restaurado.length ? run(restaurado.slice(fim), estilo) : '');
  };
  return { texto, restaurar };
}

function restaurarWord(entrada, saidaPedida, md, forcar) {
  const esc = cofre.realpath(cfg.escritorio);
  const real = cofre.realpath(entrada);
  const caso = A.pastaDoCaso(real, esc);
  if (!caso || !A.marcadores(md).length || !/\.md$/i.test(real)) {
    console.log('Use uma peça Markdown com marcadores dentro do caso a que ela pertence.');
    return 2;
  }
  const lexical = cofre.seguro(esc, cofre.naRaiz(esc, cfg.escritorio, entrada));
  if (norm(lexical).normalize('NFC') !== norm(real).normalize('NFC') || A.ehDaTabela(real) || fs.statSync(real).nlink !== 1) return 2;
  let saida = path.resolve(saidaPedida || real.replace(/\.md$/i, '-restaurado.docx'));
  if (!/\.docx$/i.test(saida)) return 2;
  if (!saida.toLowerCase().endsWith(cofre.SUFIXO_WORD)) saida = saida.replace(/\.docx$/i, cofre.SUFIXO_WORD);
  const destino = cofre.seguro(esc, cofre.naRaiz(esc, cfg.escritorio, saida));
  if (!dentroDe(destino, caso) && !dentroDe(destino, path.join(esc, 'EXPORTADOS'))) {
    console.log('Escolha um destino dentro do próprio caso ou em EXPORTADOS.');
    return 2;
  }
  return cofre.comTrava(caso, (p) => {
    const vinculada = cofre.separarPeca(md, p.id);
    if (vinculada === null) {
      console.log('O vínculo da peça está ausente ou não corresponde ao cofre deste caso.');
      return 2;
    }
    const t = cofre.ler(caso, true);
    if (!t) throw Error(cofre.MSG);
    const r = A.reverterTexto(vinculada, t);
    if (r.orfaos.length || A.marcadores(r.texto).length) {
      console.log('Restauração interrompida. Confira os marcadores da peça no caso correto.');
      return 2;
    }
    if (recusaOculto(r.texto)) {
      console.log('Restauração interrompida por texto oculto.');
      return 3;
    }
    const cits = require('./lib/citacoes').analisarCitacoes(r.texto, path.dirname(real), cfg.escritorio);
    const sumReal = checarSumulas(r.texto, cits, forcar);
    if (sumReal.recusa ||
        !forcar && cits.some((x) => x.problema || x.tipo === 'jurisprudencia' && !x.verificada && !x.marcada)) {
      console.log('Restauração interrompida pela checagem de citações. Revise a peça localmente.');
      return 2;
    }
    const bloqueio = sumReal.bloqueio.filter((x) => !r.texto.slice(x.sumula.fimTribunal, x.sumula.fimTribunal + 40).includes(SUMULA_CANCELADA));
    const { texto, restaurar } = prepararRunsRestaurados(vinculada, t, bloqueio);
    const nomeTrava = 'word-' + cofre.hash(norm(destino).normalize('NFC'));
    if (cofre.sobTrava(p.chaves, nomeTrava, () => gravarDocx(texto, destino, { grifarSumulas: true, restaurar }))) {
      console.log('Restauração interrompida por texto oculto no Word.');
      return 3;
    }
    console.log('Word restaurado gerado localmente com o sufixo -restaurado.docx.');
    if (sumReal.bloqueio.length) console.log('Súmulas canceladas grifadas no Word. Revise localmente.');
    if (sumReal.avaliadas.some((x) => x.sumula.nivel !== 'bloqueio')) console.log('Há avisos sobre súmulas. Confira as citações localmente.');
    return 0;
  });
}

function cli() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const forcar = process.argv.includes('--forcar');
  const restaurar = process.argv.includes('--restaurar');
  if (!args[0]) { console.log('Uso: node exportar-docx.js <entrada.md> [saida.docx] [--forcar] [--restaurar]'); process.exit(1); }
  if (cofre.ehSaidaProtegida(args[0]) || cofre.ehSaidaProtegida(cofre.realpath(args[0]))) {
    console.log('Use a peça de trabalho com marcadores como entrada.');
    return 2;
  }
  const md = fs.readFileSync(args[0], 'utf8');
  const oculto = recusaOculto(md);
  if (oculto) { console.log(restaurar ? 'Exportação interrompida por texto oculto na peça.' : oculto); process.exit(3); }
  if (restaurar) return restaurarWord(args[0], args[1], md, forcar);
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
  // sumula cancelada citada como se valesse: recusa (codigo 2), salvo --forcar (sai grifada em vermelho)
  const sum = checarSumulas(md, todas, forcar);
  if (sum.recusa) { sum.recusa.forEach((l) => console.log(l)); process.exit(2); }
  const pend = todas.filter((x) => !x.verificada && !x.marcada && !x.problema && x.tipo === 'jurisprudencia');
  const leis = todas.filter((x) => !x.verificada && !x.marcada && x.tipo === 'legislacao');
  if (pend.length && !forcar) {
    console.log('❌ Exportação interrompida: ' + pend.length + ' citação(ões) de JURISPRUDÊNCIA sem fonte e sem a marca [NÃO VERIFICADO]:');
    pend.slice(0, 15).forEach((x) => console.log('  - ' + x.texto + ' (linha ' + x.linha + ')' + (x.semTexto ? ' (o arquivo salvo não tinha texto legível — veja `julgados.js situacao`)' : '')));
    console.log('Rode /verificar-citacoes para marcar ou incluir a fonte. (Para exportar mesmo assim: --forcar)');
    process.exit(2);
  }
  const saida = args[1] || args[0].replace(/\.md$/i, '') + '.docx';
  const comMarca = sum.bloqueio.length ? marcarSumulasCanceladas(md, path.dirname(args[0])).texto : md;
  if (cofre.ehSaidaProtegida(saida) || cofre.ehSaidaProtegida(fs.existsSync(saida) ? cofre.realpath(saida) : '')) return 2;
  // memoria de estilo: aprende com o que o advogado mudou no .docx anterior e fotografa o novo rascunho
  let mem = null; try { mem = require('./memoria'); if (!(mem.ehPeca(saida) || mem.ehPeca(args[0]))) mem = null; } catch (e) { mem = null; }
  if (mem && fs.existsSync(saida)) { try { mem.aprenderEdicoes(saida); } catch (e) { /* */ } }
  const recusa = gravarDocx(comMarca, saida, sum.bloqueio.length ? { grifarSumulas: true } : undefined);
  if (recusa) { console.log(recusa); process.exit(3); }
  if (mem) { try { mem.registrarRascunho(saida); } catch (e) { /* */ } }
  const marcadas = todas.filter((x) => x.marcada).length;
  if (leis.length) console.log('ℹ️ ' + leis.length + ' dispositivo(s) legal(is) citados sem fonte (ex.: ' + leis[0].texto + '). Confira a redação vigente no Planalto.');
  if (restantes.length) console.log(avisoMarcadoresForcados(restantes.length));
  sum.avisos.forEach((l) => console.log(l));
  console.log('✅ Documento gerado: ' + saida + (marcadas ? '\n⚠️ Atenção: ' + marcadas + ' citação(ões) marcadas [NÃO VERIFICADO] (grifadas em amarelo). Confira antes de protocolar.' : ''));
}
if (require.main === module) {
  try { process.exitCode = cli(); }
  catch (e) {
    console.log('Exportação interrompida. Confira a peça, o cofre local e se o destino é válido e está livre.');
    process.exitCode = 2;
  }
}
module.exports = { converter, montarDocx, celulas, larguras, LARGURA_UTIL, recusaOculto, checarAnonimizacao, avisoMarcadoresForcados, gravarDocx, checarSumulas, marcarSumulasCanceladas, SUMULA_CANCELADA };
