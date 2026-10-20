#!/usr/bin/env node
'use strict';
/*
 * Erros a não repetir (correções do advogado viram checagens).
 * Uso: node erros.js listar
 *      node erros.js registrar --licao "<o que estava errado e o certo>" --padrao "<regex>" --exemplo "<trecho com o erro>" [--certo "<forma certa>"] [--exceto "<regex>"] [--tudo] [--bloquear]
 *      node erros.js testar <arquivo>         (mostra os erros registrados que aparecem no arquivo)
 *      node erros.js remover <id> | aviso <id> | bloqueio <id> | desativar <id>
 * 1ª correção = aviso; a mesma correção de novo = bloqueio (a peça com o erro não é gravada).
 */
const fs = require('fs');
const er = require('./lib/erros');

const a = process.argv.slice(2);
const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
const cmd = a[0];
function sair(m, cod) { console.log(m); process.exit(cod || 0); }

if (cmd === 'listar') {
  const d = er.ler();
  sair(d.checks.length ? d.checks.map((x) => (x.desativado ? '⏸️ ' : x.nivel === 'bloqueio' ? '🛑 ' : '⚠️ ') + x.id + ' — ' + x.licao + ' · correções ' + (x.correcoes || 1) + ', disparos ' + (x.disparos || 0) + (x.certo ? ' · certo: ' + x.certo : '')).join('\n') : 'Nenhum erro registrado ainda.');
} else if (cmd === 'registrar') {
  const r = er.registrar({ licao: opt('--licao'), padrao: opt('--padrao'), exemplo: opt('--exemplo'), certo: opt('--certo'), exceto: opt('--exceto'), escopo: a.includes('--tudo') ? 'tudo' : 'pecas', bloquear: a.includes('--bloquear'), origem: opt('--origem') || 'advogado' });
  if (!r.ok) sair('❌ Não registrado:\n- ' + r.erros.join('\n- '), 2);
  sair(r.repetido ? '🔁 ERRO REPETIDO (já estava registrado): "' + r.check.licao + '". Agora é ' + (r.check.nivel === 'bloqueio' ? '🛑 BLOQUEIO: a peça com esse erro não será gravada.' : 'aviso.') + ' id ' + r.check.id
    : '📝 Lição registrada (⚠️ aviso): "' + r.check.licao + '". Se o erro voltar e for corrigido de novo, vira bloqueio. id ' + r.check.id);
} else if (cmd === 'testar') {
  const f = a[1]; if (!f || !fs.existsSync(f)) sair('Uso: testar <arquivo>', 1);
  const hits = er.verificar(fs.readFileSync(f, 'utf8'), { ehPeca: true });
  sair(hits.length ? hits.map((h) => (h.nivel === 'bloqueio' ? '🛑 ' : '⚠️ ') + er.texto(h)).join('\n') : '✅ Nenhum erro já corrigido pelo advogado aparece neste arquivo.', hits.some((h) => h.nivel === 'bloqueio') ? 3 : 0);
} else if (['remover', 'aviso', 'bloqueio', 'desativar'].includes(cmd)) {
  const ok = cmd === 'remover' ? er.remover(a[1]) : er.nivel(a[1], cmd);
  sair(ok ? '✅ Feito (' + cmd + ' ' + a[1] + ').' : 'Não encontrei o id ' + a[1], ok ? 0 : 1);
} else sair('Uso: erros.js listar | registrar --licao … --padrao … --exemplo … [--certo …] [--bloquear] | testar <arquivo> | remover|aviso|bloqueio|desativar <id>', 1);
