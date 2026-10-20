#!/usr/bin/env node
'use strict';
/*
 * Checagem automatica de uma peca (usada por /revisar, /verificar-citacoes e pelo hook pos-escrita).
 * Uso: node checar-peca.js <arquivo.md> [--tipo inicial|contestacao|recurso|contrato|parecer] [--json] [--marcar]
 *  --marcar : insere " [NÃO VERIFICADO]" apos cada citacao pendente (faz backup em _versoes antes).
 * Relatorio: citacoes (verificadas/marcadas/pendentes), "cara de IA", restos de markdown/emoji,
 * campos a preencher, tamanho de paragrafos vs. perfil de escrita, requisitos minimos por tipo.
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const { analisarCitacoes } = require('./lib/citacoes');

const CARA_DE_IA = ['vale ressaltar', 'é importante destacar', 'é importante ressaltar', 'cabe destacar que', 'em suma', 'em síntese, é crucial', 'nesse sentido, é fundamental', 'é crucial', 'desempenha um papel', 'no cenário atual', 'no contexto atual', 'em última análise', 'robusto', 'abrangente', 'navegar', 'mergulhar', 'tapeçaria', 'além disso, é importante', 'por fim, mas não menos importante', 'como um modelo de linguagem', 'espero ter ajudado', 'claro!', 'certamente!'];
const REQUISITOS = {
  inicial: [['endereçamento ao juízo', /excelent[ií]ssim|ju[ií]zo\s+d/i], ['qualificação das partes (CPC art. 319, II)', /inscrit[oa] no (cpf|cnpj)|portador|residente|domiciliad|\[CPF\]/i], ['fatos e fundamentos (art. 319, III)', /dos fatos|fundamentos/i], ['pedidos (art. 319, IV)', /dos pedidos|requer/i], ['valor da causa (art. 319, V)', /valor da causa/i], ['provas (art. 319, VI)', /provas|produ[cç][aã]o de prova/i], ['opção por audiência de conciliação (art. 319, VII)', /audi[eê]ncia de concilia/i], ['fecho e data', /termos em que|nestes termos|pede deferimento/i]],
  contestacao: [['endereçamento', /excelent[ií]ssim|ju[ií]zo/i], ['preliminares (CPC art. 337) ou declaração de inexistência', /preliminar/i], ['impugnação específica dos fatos (art. 341)', /impugna|m[eé]rito/i], ['pedidos', /requer/i], ['provas', /provas/i]],
  recurso: [['endereçamento ao juízo/tribunal', /excelent[ií]ssim|egr[eé]gio|colend/i], ['tempestividade', /tempestiv/i], ['preparo ou gratuidade', /preparo|gratuidade|custas/i], ['razões/fundamentação', /raz[oõ]es|fundament/i], ['pedido de reforma/anulação', /reforma|anula|provimento/i]],
  contrato: [['qualificação das partes', /contratante|contratad/i], ['objeto', /objeto/i], ['preço/pagamento', /pre[cç]o|pagamento|remunera/i], ['prazo/vigência', /prazo|vig[eê]ncia/i], ['rescisão', /rescis|resolu[cç][aã]o/i], ['foro', /foro/i]],
  parecer: [['consulta/ementa', /consulta|ementa/i], ['análise/fundamentação', /an[aá]lise|fundament/i], ['conclusão', /conclus/i]],
};

function checar(arquivo, opc) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  const cfg = c.config();
  const cits = analisarCitacoes(texto, path.dirname(arquivo), cfg.escritorio);
  const baixo = texto.toLowerCase();
  const ia = CARA_DE_IA.filter((e) => baixo.includes(e));
  const emoji = (texto.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  const restosMd = (texto.match(/^\s*```|^\s*\|.*\|\s*$/gm) || []).length;
  const preencher = (texto.match(/\[PREENCHER[^\]]*\]|\[CLIENTE\]|\[CPF\]|\[N[ºo] PROCESSO\]|XXX+/g) || []);
  const pars = texto.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^(#|>|[-*]|\d+[.)])/.test(p));
  const palavras = pars.map((p) => p.split(/\s+/).length);
  const media = palavras.length ? Math.round(palavras.reduce((a, b) => a + b, 0) / palavras.length) : 0;
  let perfilMedia = null;
  try { const pf = fs.readFileSync(path.join(cfg.escritorio, 'ESTILO', 'perfil-de-escrita.md'), 'utf8'); const m = pf.match(/m[eé]dia[^\n\d]{0,40}(\d{2,3})\s*palavras/i); if (m) perfilMedia = +m[1]; } catch (e) { /* sem perfil */ }
  const tipo = opc.tipo || (/contesta/i.test(arquivo) ? 'contestacao' : /recurso|apela|agravo/i.test(arquivo) ? 'recurso' : /contrato/i.test(arquivo) ? 'contrato' : /parecer/i.test(arquivo) ? 'parecer' : /inicial|peticao/i.test(arquivo) ? 'inicial' : null);
  const faltando = tipo ? (REQUISITOS[tipo] || []).filter(([, re]) => !re.test(texto)).map(([n]) => n) : [];
  return { arquivo, tipo, cits, ia, emoji, restosMd, preencher, media, perfilMedia, faltando, texto };
}

function relatorio(r) {
  const prob = r.cits.filter((x) => x.problema);
  const pend = r.cits.filter((x) => !x.verificada && !x.marcada && !x.problema), marc = r.cits.filter((x) => x.marcada && !x.problema), ok = r.cits.filter((x) => x.verificada);
  const L = ['# Checagem automática — ' + path.basename(r.arquivo), ''];
  L.push('## Citações (' + r.cits.length + ')');
  L.push('- ✅ Com fonte: ' + ok.length + ' (' + r.cits.filter((x) => x.conferida).length + ' conferidas no original) | ⚠️ Marcadas NÃO VERIFICADO: ' + marc.length + ' | ❌ Sem fonte nem marca: ' + pend.length + (prob.length ? ' | 🔴 Divergentes/inexistentes: ' + prob.length : ''));
  prob.forEach((x) => L.push('  - 🔴 linha ' + x.linha + ': ' + x.texto + ' — ' + (x.problema === 'inexistente' ? 'NÃO EXISTE' : 'trecho/conteúdo DIVERGE do original') + ' (conferido em ' + (x.fonteRegistro || 'fonte registrada') + '): remova ou reescreva'));
  pend.forEach((x) => L.push('  - ❌ linha ' + x.linha + ': ' + x.texto + ' (' + x.tipo + ')'));
  marc.forEach((x) => L.push('  - ⚠️ linha ' + x.linha + ': ' + x.texto));
  L.push('', '## Naturalidade do texto');
  L.push(r.ia.length ? '- Expressões com "cara de IA": ' + r.ia.join('; ') : '- Nenhuma expressão típica de IA encontrada.');
  if (r.emoji) L.push('- ' + r.emoji + ' emoji(s) — remover.');
  if (r.restosMd) L.push('- ' + r.restosMd + ' resto(s) de formatação técnica (tabela/código) — revisar.');
  L.push('- Parágrafo médio: ' + r.media + ' palavras' + (r.perfilMedia ? ' (seu estilo: ~' + r.perfilMedia + ')' : ''));
  if (r.preencher.length) L.push('', '## Campos a preencher (' + r.preencher.length + ')', '- ' + Array.from(new Set(r.preencher)).join(', '));
  if (r.tipo) L.push('', '## Requisitos mínimos (' + r.tipo + ')', r.faltando.length ? r.faltando.map((f) => '- ❓ não encontrei: ' + f).join('\n') : '- Todos os itens básicos parecem presentes.');
  L.push('', '_Checagem automática de apoio. A revisão final e a responsabilidade técnica são do advogado._');
  return L.join('\n');
}

function marcar(r) {
  const pend = r.cits.filter((x) => !x.verificada && !x.marcada && !x.problema).sort((a, b) => b.fim - a.fim);
  if (!pend.length) return 0;
  const cfg = c.config();
  if (c.dentroDe(r.arquivo, cfg.escritorio)) c.versionar(r.arquivo, path.join(cfg.escritorio, '_versoes'), cfg.escritorio);
  let t = r.texto;
  for (const x of pend) t = t.slice(0, x.fim) + ' [NÃO VERIFICADO]' + t.slice(x.fim);
  fs.writeFileSync(r.arquivo, t, 'utf8');
  return pend.length;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const arq = a.find((x) => !x.startsWith('--') && a[a.indexOf(x) - 1] !== '--tipo');
  if (!arq) { console.log('Uso: node checar-peca.js <arquivo.md> [--tipo X] [--json] [--marcar]'); process.exit(1); }
  const ti = a.indexOf('--tipo');
  const r = checar(arq, { tipo: ti >= 0 ? a[ti + 1] : null });
  if (a.includes('--marcar')) { const n = marcar(r); console.log(n ? '🖍️ ' + n + ' citação(ões) marcadas com [NÃO VERIFICADO] (backup em _versoes).' : 'Nenhuma citação pendente para marcar.'); }
  else if (a.includes('--json')) { delete r.texto; console.log(JSON.stringify(r, null, 2)); }
  else console.log(relatorio(r));
}
module.exports = { checar, relatorio };
