#!/usr/bin/env node
'use strict';
/*
 * Integridade do nucleo do assistente (§21). Local, sem rede.
 * Uso: node integridade.js conferir [--json]
 *      node integridade.js aceitar [--confirmo]
 *   conferir: compara scripts, hooks.json, skills do nucleo e o bloco do CLAUDE.md global com o
 *             manifesto gravado pelo fluxo oficial (instalacao, /consertar, atualizacao do plugin).
 *             Saida 0 = tudo igual; 2 = algo mudou; 3 = manifesto ausente ou ilegivel.
 *   aceitar:  o ADVOGADO mexeu de proposito e quer que o estado atual vire o oficial. Sem --confirmo
 *             so mostra o que seria aceito (nada gravado, saida 2). Use --confirmo SOMENTE depois do
 *             "sim" explicito do advogado. O caminho normal para alteracao estranha e o /consertar.
 */
const path = require('path');
const c = require('./lib/comum');
const ig = require('./lib/integridade');

const args = process.argv.slice(2);
const cmd = args[0] || 'conferir';
// stdout bloqueante: no macOS o pipe e assincrono e process.exit() cortaria um --json maior que o buffer
try { if (process.stdout._handle && process.stdout._handle.setBlocking) process.stdout._handle.setBlocking(true); } catch (e) { /* */ }
const sair = (txt, code) => { if (txt) console.log(txt); process.exit(code || 0); };

if (cmd === 'conferir') {
  const r = ig.conferir();
  if (args.includes('--json')) sair(JSON.stringify(r, null, 2), r.estado === 'ok' ? 0 : r.estado === 'alterado' ? 2 : 3);
  if (r.estado === 'ok') sair('✅ Arquivos do assistente conferidos: ' + r.manifesto.n + ' arquivo(s) iguais aos da instalação oficial (' + String(r.manifesto.geradoEm || '').slice(0, 10) + ').');
  sair('⚠️ ' + ig.mensagem(r), r.estado === 'alterado' ? 2 : 3);
} else if (cmd === 'aceitar') {
  const r = ig.conferir();
  if (r.estado === 'ok') sair('Nada a aceitar: os arquivos do assistente já são iguais aos da instalação oficial.');
  const lista = r.estado === 'alterado' ? r.alterados.map((k) => '- alterado: ' + ig.descrever(k)).concat(r.faltando.map((k) => '- sumiu: ' + ig.descrever(k)), r.novos.map((k) => '- novo: ' + ig.descrever(k))) : ['- a lista de conferência será refeita a partir dos arquivos como estão agora'];
  if (!args.includes('--confirmo')) {
    sair('NADA FOI GRAVADO. Isto faria o estado atual virar o oficial:\n' + lista.join('\n') + '\n\nSó confirme se foi o próprio advogado quem mexeu de propósito. Se ninguém mexeu, o certo é /consertar (põe a versão original de volta).\nDepois do "sim" explícito do advogado: node "' + path.join(c.P.base, 'scripts', 'integridade.js') + '" aceitar --confirmo', 2);
  }
  // estado atual vira o oficial (copias do plugin continuam conferidas contra os scripts aceitos)
  const ant = ig.lerManifesto().manifesto;
  const L = ig.locais();
  const nucleo = (ant && ant.nucleo) || ig.skillsDoNucleo(L.plugin || path.join(c.P.base, 'pacote'));
  const atual = {};
  for (const [k, h] of Object.entries(ig.hashesInstalados({ nucleo }).atual)) if (!k.startsWith('plugin/')) atual[k] = h;
  const novo = { versao: c.VERSAO, formato: 1, geradoEm: new Date().toISOString(), origem: 'aceitar', modo: L.plugin ? 'plugin' : 'instalador', nucleo, arquivos: atual };
  ig.gravarManifesto(novo);
  c.log('integridade', 'aceitar --confirmo: ' + Object.keys(atual).length + ' arquivo(s)');
  const depois = ig.conferir();
  sair('✅ Pronto: o estado atual dos arquivos do assistente virou o oficial (' + Object.keys(atual).length + ' arquivo(s)).' + (depois.estado !== 'ok' ? '\n⚠️ Ainda há diferença na pasta do plugin (' + depois.alterados.concat(depois.faltando, depois.novos).length + ' arquivo(s)); ali só a atualização do plugin (/plugin) ou o /consertar resolvem.' : ''));
} else {
  sair('Uso: node integridade.js conferir [--json] | aceitar [--confirmo]', 1);
}
