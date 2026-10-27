'use strict';
/*
 * Verificador de citacoes (anti-alucinacao). Encontra julgados, sumulas, temas e dispositivos
 * legais citados e classifica cada um:
 *   verificada  -> ha link (http) ou [fonte: caminho-existente] logo apos a citacao
 *   marcada     -> ha a marca [NAO VERIFICADO] logo apos a citacao
 *   pendente    -> nenhuma das duas (jurisprudencia pendente bloqueia a exportacao)
 * Nao consulta a internet: verificar = o advogado (ou uma pesquisa pedida por ele) confirmou a fonte.
 * v0.5: tambem consulta o livro de conferencias (julgados.js): 'confere' conta como verificada;
 * 'divergente'/'inexistente' viram problema (bloqueia a exportacao) mesmo com link.
 * 'sem-texto' (o arquivo salvo do original nao tinha texto legivel): nem conferida nem problema; continua
 * pendente (link/fonte nao bastam) ate nova conferencia ou a marca [NAO VERIFICADO].
 */
const fs = require('fs');
const path = require('path');

const PADROES = [
  { tipo: 'jurisprudencia', re: /\b(?:REsp|AREsp|EREsp|AgRg|AgInt|EDcl|RE|ARE|HC|RHC|MS|RMS|ADI|ADC|ADPF|Rcl|CC|RR|AIRR|Ag|AI|AgR)\b(?:\s+(?:no|na|em)\s+\w+)?\s*(?:n[º°o.]*\s*)?\d[\d.\-]*(?:\/[A-Z]{2})?/g },
  { tipo: 'jurisprudencia', re: /\b(?:Apela[cç][aã]o(?:\s+C[ií]vel|\s+Criminal)?|Agravo(?:\s+de\s+Instrumento|\s+Interno)?|Recurso\s+(?:Especial|Extraordin[aá]rio|Inominado|Ordin[aá]rio)|Mandado\s+de\s+Seguran[cç]a|Embargos\s+de\s+Declara[cç][aã]o)\s*(?:n[º°o.]*\s*)?\d[\d.\-\/]{5,}/gi },
  { tipo: 'jurisprudencia', re: /\bS[uú]mula\s+(?:Vinculante\s+)?(?:n[º°o.]*\s*)?\d+(?:\s+d[oa]\s+(?:STF|STJ|TST|TSE|TNU|TJ[A-Z]{2}|TRF\d|TRT\d+))?/gi },
  { tipo: 'jurisprudencia', re: /\bTema\s+(?:n[º°o.]*\s*)?\d+(?:\s+d[oa]\s+(?:STF|STJ|TST|repercuss[aã]o geral|recursos repetitivos))?/gi },
  { tipo: 'jurisprudencia', re: /\b(?:Enunciado|OJ|Orienta[cç][aã]o\s+Jurisprudencial)\s+(?:n[º°o.]*\s*)?\d+/gi },
  { tipo: 'legislacao', re: /\b(?:Lei(?:\s+Complementar)?|Decreto(?:-Lei)?|Medida\s+Provis[oó]ria|Resolu[cç][aã]o|Provimento|Recomenda[cç][aã]o)\s+(?:[A-Z]{2,6}\s+)?n[º°o.]*\s*\d[\d.]*\/\d{2,4}/gi },
  { tipo: 'legislacao', re: /\barts?\.\s*\d+[º°o]?(?:-[A-Z])?(?:[^.;\n]{0,40}?)\s+d[oa]\s+(?:CPC|CC|CLT|CF|CDC|CP|CPP|CTN|ECA|CF\/88|Constitui[cç][aã]o(?:\s+Federal)?|C[oó]digo\s+(?:Civil|de\s+Processo\s+Civil|Penal|de\s+Defesa\s+do\s+Consumidor|Tribut[aá]rio\s+Nacional)|Lei\s+n?[º°o.]*\s*[\d.]+\/\d{2,4})/gi },
];

function analisarCitacoes(texto, baseDir, escritorio) {
  const achados = [];
  for (const p of PADROES) {
    p.re.lastIndex = 0; let m;
    while ((m = p.re.exec(texto))) achados.push({ tipo: p.tipo, texto: m[0].trim(), ini: m.index, fim: m.index + m[0].length });
  }
  achados.sort((a, b) => a.ini - b.ini);
  // remove sobreposicoes
  const lista = achados.filter((a, i) => !achados.some((b, j) => j !== i && b.ini <= a.ini && b.fim >= a.fim && (b.fim - b.ini) > (a.fim - a.ini)));
  lista.forEach((a, i) => {
    const prox = lista[i + 1] ? lista[i + 1].ini : texto.length;
    let fimPar = texto.indexOf('\n\n', a.fim); if (fimPar < 0) fimPar = texto.length;
    const janela = texto.slice(a.fim, Math.min(prox, a.fim + 300, fimPar));
    const fonte = janela.match(/\[fonte:\s*([^\]]+)\]/i);
    let fonteOk = false;
    if (fonte) {
      const f = fonte[1].trim();
      fonteOk = /^https?:\/\//.test(f) || [baseDir, escritorio].filter(Boolean).some((d) => fs.existsSync(path.resolve(d, f)));
    }
    // v0.5: livro de conferencias (WIKI/julgados-verificados.json) — confere / divergente / inexistente
    let reg = null; if (a.tipo === 'jurisprudencia') { try { reg = require('./julgados').consultar(a.texto); } catch (e) { /* sem livro */ } }
    a.conferida = !!(reg && reg.status === 'confere');
    a.problema = reg && (reg.status === 'divergente' || reg.status === 'inexistente') ? reg.status : null;
    a.semTexto = !!(reg && reg.status === 'sem-texto');
    a.fonteRegistro = reg && reg.fonte || null;
    a.verificada = !a.problema && !a.semTexto && (/https?:\/\/\S+/.test(janela) || fonteOk || a.conferida);
    a.marcada = /\[N[ÃA]O VERIFICAD[OA]|\[A VERIFICAR/i.test(janela);
    a.linha = texto.slice(0, a.ini).split('\n').length;
  });
  return lista;
}
module.exports = { analisarCitacoes };
