#!/usr/bin/env node
'use strict';
/*
 * Analise quantitativa do estilo de escrita a partir de ESTILO/amostras (fontes brutas, so leitura).
 * Saida: relatorio Markdown com metricas e exemplos de expressoes (sem nomes/numeros de clientes),
 * base para o assistente redigir ESTILO/perfil-de-escrita.md (arquivo derivado).
 * Uso: node estilo.js [pasta-amostras] [--json]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const c = require('./lib/comum');
const { docxTexto } = require('./preparar-autos');

const CONECTIVOS = ['outrossim', 'destarte', 'ademais', 'com efeito', 'nesse sentido', 'nesse diapasão', 'por conseguinte', 'dessa forma', 'desse modo', 'assim sendo', 'assim', 'contudo', 'todavia', 'no entanto', 'entretanto', 'porém', 'ou seja', 'isto é', 'vale dizer', 'data venia', 'data maxima venia', 'ante o exposto', 'isto posto', 'diante do exposto', 'pelo exposto', 'por todo o exposto', 'em que pese', 'não obstante', 'mormente', 'sobretudo', 'inclusive', 'portanto', 'logo', 'de fato', 'em verdade', 'ressalte-se', 'frise-se', 'registre-se', 'note-se', 'cumpre salientar', 'impende destacar'];
const TRATAMENTOS = ['Vossa Excelência', 'V. Exa.', 'V. Exª', 'Excelentíssimo', 'MM. Juízo', 'Douto Juízo', 'Egrégio Tribunal', 'Colenda Câmara', 'Nobre Julgador'];
const PARTES = ['o Autor', 'a Autora', 'a parte autora', 'o Requerente', 'a Requerente', 'o Réu', 'a Ré', 'a parte ré', 'o Requerido', 'a Requerida', 'o Reclamante', 'a Reclamada', 'o Apelante', 'o Apelado', 'o Agravante', 'a Contratante', 'a Contratada', 'o Consulente'];
const FECHOS = ['Termos em que', 'Nestes termos', 'Nesses termos', 'pede deferimento', 'Pede e espera deferimento', 'Respeitosamente'];

function textoDe(arq) {
  const ext = path.extname(arq).toLowerCase();
  try {
    if (ext === '.docx') return docxTexto(arq).texto;
    if (ext === '.pdf') return execFileSync('pdftotext', ['-enc', 'UTF-8', arq, '-'], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8');
    if (['.txt', '.md'].includes(ext)) return fs.readFileSync(arq, 'utf8');
  } catch (e) { return null; }
  return null;
}
function contar(texto, lista) {
  const baixo = texto.toLowerCase();
  return lista.map((t) => [t, (baixo.match(new RegExp('(^|[^\\p{L}])' + t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[^\\p{L}]|$)', 'gu')) || []).length]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
}

const dir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(c.config().escritorio, 'ESTILO', 'amostras');
const arquivos = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => !/^[._]/.test(n)).map((n) => path.join(dir, n)).filter((p) => fs.statSync(p).isFile()) : [];
const lidos = [], falhas = [];
let tudo = '';
for (const a of arquivos) { const t = textoDe(a); if (t && t.trim().length > 200) { lidos.push(path.basename(a)); tudo += '\n\n' + t; } else falhas.push(path.basename(a)); }
if (!lidos.length) { console.log('Nenhuma amostra legível em ' + dir + '. Coloque de 5 a 10 peças suas (.docx, .pdf ou .txt) nessa pasta.' + (falhas.length ? ' Não consegui ler: ' + falhas.join(', ') : '')); process.exit(0); }

const pars = tudo.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.split(' ').length >= 12);
const frases = tudo.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).filter((f) => f.split(' ').length >= 4);
const media = (arr) => arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : 0;
const pPal = pars.map((p) => p.split(' ').length).sort((a, b) => a - b);
const r = {
  amostras: lidos, naoLidas: falhas,
  paragrafoMedio: media(pPal), paragrafoMediano: pPal[Math.floor(pPal.length / 2)] || 0,
  fraseMedia: media(frases.map((f) => f.split(' ').length)),
  conectivos: contar(tudo, CONECTIVOS).slice(0, 15), tratamentos: contar(tudo, TRATAMENTOS), partes: contar(tudo, PARTES).slice(0, 8), fechos: contar(tudo, FECHOS),
  citacao: {
    'nº': (tudo.match(/n[º°]\s*\d/g) || []).length, 'n.': (tudo.match(/\bn\.\s*\d/g) || []).length,
    'fls.': (tudo.match(/\bfls?\.\s*\d/g) || []).length, 'ID (PJe)': (tudo.match(/\bID\s*\d{5,}/g) || []).length,
    'Rel.': (tudo.match(/\bRel(ator|\.)/g) || []).length, 'j. (julgado em)': (tudo.match(/\bj\.\s*\d/g) || []).length,
    'DJe': (tudo.match(/\bDJe\b/g) || []).length, 'grifos nossos': (tudo.match(/grifo[s]? nosso|destaque[s]? nosso|g\.n\./gi) || []).length,
  },
  latinismos: contar(tudo, ['data venia', 'in casu', 'in verbis', 'ex vi', 'ab initio', 'inaudita altera pars', 'periculum in mora', 'fumus boni iuris', 'ad argumentandum', 'mutatis mutandis', 'sub judice', 'erga omnes', 'ipsis litteris', 'in fine']),
  maiusculasEmTitulos: (tudo.match(/^\s*(I|II|III|IV|V|VI|\d+)\s*[-–—.)]\s*D[AO]S?\s+[A-ZÇÃÉ ]{3,}$/gm) || []).length,
};
if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
const fmt = (l) => l.length ? l.map(([t, n]) => t + ' (' + n + ')').join(', ') : '—';
console.log(['# Métricas de estilo (' + lidos.length + ' amostra(s))', '',
  '- Amostras lidas: ' + lidos.join(', ') + (falhas.length ? ' | não lidas: ' + falhas.join(', ') : ''),
  '- Parágrafo: média ' + r.paragrafoMedio + ' palavras (mediana ' + r.paragrafoMediano + ')',
  '- Frase: média ' + r.fraseMedia + ' palavras',
  '- Conectivos preferidos: ' + fmt(r.conectivos),
  '- Tratamento ao juízo: ' + fmt(r.tratamentos),
  '- Como chama as partes: ' + fmt(r.partes),
  '- Fechos: ' + fmt(r.fechos),
  '- Latinismos: ' + fmt(r.latinismos),
  '- Estilo de citação: ' + Object.entries(r.citacao).filter(([, n]) => n).map(([k, n]) => k + ' (' + n + ')').join(', '),
  '- Títulos de seção no padrão "I – DOS FATOS": ' + r.maiusculasEmTitulos,
  '', 'Use estas métricas + leitura das amostras para redigir ESTILO/perfil-de-escrita.md (sem dados de clientes).'].join('\n'));
