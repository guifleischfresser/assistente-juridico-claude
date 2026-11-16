#!/usr/bin/env node
'use strict';
/*
 * Auditoria local de skill/plugin de terceiros antes de instalar (sem rede; nada da skill e executado).
 * Uso: node auditar-skill.js <comando> [args]
 *   auditar <pasta|SKILL.md|.zip>   (ou: auditar --colado  e o texto da skill pela entrada padrao)
 *   instalar <id> --confirmo [--forcar]
 *   relatorio <id> | listar | remover <nome> | descartar <id>
 * Codigos: 0 ok · 1 uso/erro · 2 recusado ou falta confirmar · 3 arquivo mudou depois da auditoria
 */
const fs = require('fs');
const A = require('./lib/auditoria');

const [cmd, ...resto] = process.argv.slice(2);
const flag = (f) => resto.includes(f);
const pos = resto.filter((x) => !x.startsWith('--'));
const sair = (codigo, msg) => { if (msg) console.log(msg); process.exit(codigo); };

try {
  if (cmd === 'auditar') {
    let rel;
    if (flag('--colado')) rel = A.auditar({ texto: fs.readFileSync(0, 'utf8') });
    else if (!pos[0]) sair(1, 'Uso: auditar <pasta da skill | SKILL.md | arquivo.zip>');
    else rel = A.auditar(pos[0]);
    sair(0, A.relatorioTexto(rel));
  } else if (cmd === 'instalar') {
    if (!pos[0]) sair(1, 'Uso: instalar <id da auditoria> --confirmo');
    const r = A.instalar(pos[0], { confirmo: flag('--confirmo'), forcar: flag('--forcar') });
    sair(r.codigo, r.msg);
  } else if (cmd === 'relatorio') {
    if (!pos[0]) sair(1, 'Uso: relatorio <id>');
    sair(0, A.relatorioTexto(A.lerRelatorio(pos[0])));
  } else if (cmd === 'listar') {
    const l = A.listar();
    if (flag('--json')) sair(0, JSON.stringify(l, null, 2));
    const L = ['Skills de terceiros em quarentena:'];
    if (!l.quarentena.length) L.push('- (nenhuma)');
    for (const q of l.quarentena) L.push('- ' + q.veredito + ' ' + q.nome + ' · ' + q.id + ' · ' + q.data + ' · ' + q.estado + (q.instaladaComo ? ' como /' + q.instaladaComo : ''));
    L.push('', 'Instaladas (de terceiros):');
    const ns = Object.keys(l.instaladas);
    if (!ns.length) L.push('- (nenhuma)');
    for (const n of ns) L.push('- /' + n + ' · ' + l.instaladas[n].veredito + ' · instalada em ' + l.instaladas[n].instaladaEm + ' · origem: ' + l.instaladas[n].fonte);
    sair(0, L.join('\n'));
  } else if (cmd === 'remover') {
    if (!pos[0]) sair(1, 'Uso: remover <nome>');
    A.remover(pos[0]);
    sair(0, 'Tirei /' + pos[0] + ' das skills ativas. Nada foi apagado: ela foi para ~/.claude/advogado/terceiros/aposentadas/.');
  } else if (cmd === 'descartar') {
    if (!pos[0]) sair(1, 'Uso: descartar <id>');
    A.descartar(pos[0]);
    sair(0, 'Descartei a auditoria ' + pos[0] + ' (movida para quarentena/_descartadas; nada foi apagado nem instalado).');
  } else {
    sair(1, 'Comandos: auditar <pasta|SKILL.md|.zip> · auditar --colado · instalar <id> --confirmo · relatorio <id> · listar · remover <nome> · descartar <id>');
  }
} catch (e) {
  if (e instanceof A.Recusa) sair(2, '🛑 Não auditei: ' + e.message + '\n⚠️ ' + A.AVISO);
  sair(1, 'Erro: ' + e.message);
}
