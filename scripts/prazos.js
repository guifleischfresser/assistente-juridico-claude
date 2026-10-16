#!/usr/bin/env node
'use strict';
// Uso: node prazos.js listar [dias]          -> prazos pendentes dos proximos N dias (padrao 15)
//      node prazos.js calcular DD/MM/AAAA N  -> vencimento de prazo de N dias uteis
//      node prazos.js util DD/MM/AAAA        -> diz se a data e dia util
const path = require('path');
const { config } = require('./lib/comum');
const pz = require('./lib/prazos');

const cfg = config();
const extras = cfg.feriadosExtras || [];
const [cmd, a1, a2] = process.argv.slice(2);
const fmt = (d) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

if (cmd === 'calcular') {
  const ini = pz.lerData(a1); const n = parseInt(a2, 10);
  if (!ini || !n) { console.log('Uso: calcular DD/MM/AAAA DIAS'); process.exit(1); }
  const v = pz.calcularVencimento(ini, n, extras);
  console.log('Intimação/publicação: ' + fmt(ini));
  console.log('Prazo: ' + n + ' dias úteis (CPC art. 219 e 224; recesso art. 220 considerado)');
  console.log('Vencimento estimado: ' + fmt(v) + ' (' + pz.iso(v) + ')');
  console.log('⚠️ Confira feriados locais, suspensões do tribunal e a regra do seu rito (ex.: JEC, trabalhista, penal conta em dias corridos).');
} else if (cmd === 'util') {
  const d = pz.lerData(a1);
  if (!d) { console.log('Uso: util DD/MM/AAAA'); process.exit(1); }
  console.log(fmt(d) + (pz.ehDiaUtil(d, extras) ? ' é dia útil' : ' NÃO é dia útil') + (pz.emRecesso(d) ? ' (período de suspensão 20/12–20/01)' : ''));
} else {
  const janela = parseInt(a1, 10) || 15;
  const itens = pz.lerPrazos(path.join(cfg.escritorio, 'PRAZOS.md'));
  const hoje = new Date();
  const lista = itens.map((i) => Object.assign(i, { uteis: pz.diasUteisAte(i.data, hoje, extras) })).filter((i) => i.uteis <= janela);
  if (!lista.length) { console.log('Nenhum prazo pendente nos próximos ' + janela + ' dias úteis. ✅'); process.exit(0); }
  for (const i of lista) {
    const icone = i.uteis < 0 ? '🔴 VENCIDO' : i.uteis <= 2 ? '🔴' : i.uteis <= 5 ? '🟡' : '🟢';
    const quando = i.uteis < 0 ? 'há ' + (-i.uteis) + ' dia(s) útil(eis)' : i.uteis === 0 ? 'HOJE' : 'em ' + i.uteis + ' dia(s) útil(eis)';
    console.log(icone + ' ' + i.vencimento + ' (' + quando + ') — ' + i.caso + ' — ' + i.tarefa);
  }
}
