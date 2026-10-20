#!/usr/bin/env node
'use strict';
/*
 * Conferência de julgados: existe? o trecho citado confere com o original?
 * NADA vai para a internet por este script. A busca do original é feita pelo assistente com WebFetch
 * (e a guarda de sigilo PERGUNTA antes de acessar qualquer site não autorizado pelo advogado).
 *
 * Uso: node julgados.js listar <arquivo>                 citações de julgados + trecho citado + situação
 *      node julgados.js politica                          como está a regra de consulta externa
 *      node julgados.js autorizar <dominio|busca>...      (o sistema pede a confirmação do advogado na tela)
 *      node julgados.js desautorizar <dominio|busca>...
 *      node julgados.js pedir "<citação>"                 o advogado pediu para conferir este julgado online
 *      node julgados.js comparar --citacao "<c>" --original <arquivo-com-o-texto-oficial> [--trecho "<t>" | --peca <arquivo>] [--fonte <url>]
 *      node julgados.js registrar --citacao "<c>" --status confere|divergente|inexistente --fonte <url|WIKI/...> [--obs "..."]
 *      node julgados.js situacao "<citação>"
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const j = require('./lib/julgados');
const { analisarCitacoes } = require('./lib/citacoes');

const a = process.argv.slice(2);
const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
const cmd = a[0];
function sair(m, cod) { console.log(m); process.exit(cod || 0); }
const ICONE = { confere: '✅ confere', divergente: '🔴 DIVERGENTE', inexistente: '🔴 NÃO EXISTE' };
const rotulo = (r) => (r ? ICONE[r.status] || r.status : '⚠️ não verificado');

function listar(arq) {
  const texto = fs.readFileSync(arq, 'utf8');
  const cfg = c.config();
  return analisarCitacoes(texto, path.dirname(arq), cfg.escritorio).filter((x) => x.tipo === 'jurisprudencia')
    .map((x) => ({ citacao: x.texto, linha: x.linha, trecho: j.trechoCitado(texto, x.ini, x.fim), registro: j.consultar(x.texto) }));
}

switch (cmd) {
  case 'listar': {
    const f = a[1]; if (!f || !fs.existsSync(f)) sair('Uso: listar <arquivo>', 1);
    const l = listar(f);
    if (a.includes('--json')) sair(JSON.stringify(l, null, 2));
    sair(l.length ? l.map((x) => '- linha ' + x.linha + ': ' + x.citacao + ' — ' + rotulo(x.registro) + (x.trecho ? '\n  trecho citado: "' + x.trecho.slice(0, 160) + (x.trecho.length > 160 ? '…' : '') + '"' : '') + (x.registro && x.registro.fonte ? '\n  fonte: ' + x.registro.fonte : '')).join('\n') : 'Nenhum julgado citado encontrado.');
    break;
  }
  case 'politica': {
    const p = j.politica();
    sair('Consulta externa: ' + (p.modo === 'nunca' ? 'DESLIGADA (só conferência local)' : 'pergunta antes de cada acesso') + '\nSites autorizados para conferência sem perguntar de novo: ' + (p.fontes.length ? p.fontes.join(', ') : 'nenhum') + '\nBusca na web (WebSearch): ' + (p.busca ? 'autorizada' : 'pergunta antes') +
      '\n\nPergunta a fazer ao advogado (uma vez): "Posso conferir os julgados direto nos sites oficiais dos tribunais (' + j.FONTES_SUGERIDAS.slice(0, 4).join(', ') + ') e no JusBrasil? Só o número do julgado vai na consulta; nada do cliente sai do computador."');
    break;
  }
  case 'autorizar': case 'desautorizar': {
    const itens = a.slice(1).map((x) => x.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean);
    if (!itens.length) sair('Uso: ' + cmd + ' <dominio|busca>...', 1);
    const cfg = c.lerJSON(c.P.config, {}) || {};
    const fontes = new Set(cfg.fontesAutorizadas || []);
    for (const d of itens) { if (d === 'busca') cfg.buscaWebAutorizada = cmd === 'autorizar'; else if (cmd === 'autorizar') { if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) sair('Domínio inválido: ' + d, 2); fontes.add(d); } else fontes.delete(d); }
    cfg.fontesAutorizadas = Array.from(fontes);
    if (cmd === 'autorizar' && !cfg.verificacaoOnline) cfg.verificacaoOnline = 'perguntar';
    c.gravarJSON(c.P.config, cfg);
    sair('✅ ' + (cmd === 'autorizar' ? 'Autorizado' : 'Removido') + ': ' + itens.join(', ') + '. Sites autorizados agora: ' + (cfg.fontesAutorizadas.join(', ') || 'nenhum'));
    break;
  }
  case 'pedir': { const k = j.pedir(a[1]); sair(k ? 'Anotado para conferência: ' + a[1] : 'Citação vazia', k ? 0 : 1); break; }
  case 'comparar': {
    const cit = opt('--citacao'); const orig = opt('--original');
    if (!cit || !orig || !fs.existsSync(orig)) sair('Uso: comparar --citacao "<c>" --original <arquivo> [--trecho "<t>" | --peca <arquivo>] [--fonte <url>]', 1);
    let trecho = opt('--trecho');
    if (!trecho && opt('--peca')) { const l = listar(opt('--peca')).find((x) => j.chave(x.citacao) === j.chave(cit)); trecho = l && l.trecho; }
    const original = fs.readFileSync(orig, 'utf8');
    const fonte = opt('--fonte') || path.relative(c.config().escritorio, path.resolve(orig)).replace(/\\/g, '/');
    if (!trecho) { const r = j.registrar(cit, { status: 'confere', fonte, trechoConfere: null, obs: 'julgado localizado; a peça não traz trecho entre aspas' }); sair('✅ ' + cit + ': julgado localizado (sem trecho citado para comparar). Registrado: ' + r.fonte); }
    const cmp = j.comparar(trecho, original);
    const st = j.situacao(cmp);
    j.registrar(cit, { status: st, fonte, trechoConfere: st === 'confere', similaridade: cmp.similaridade, faltando: cmp.faltando });
    sair((st === 'confere' ? '✅ CONFERE' : '🔴 DIVERGENTE') + ': ' + cit + ' — trecho ' + Math.round(cmp.similaridade * 100) + '% igual ao original' + (cmp.faltando.length ? '. Palavras do trecho citado que NÃO estão no original: ' + cmp.faltando.join(', ') : '') + '\nFonte registrada: ' + fonte, st === 'confere' ? 0 : 3);
    break;
  }
  case 'registrar': {
    const cit = opt('--citacao'); const st = opt('--status'); const fonte = opt('--fonte');
    if (!cit || !['confere', 'divergente', 'inexistente'].includes(st) || !fonte) sair('Uso: registrar --citacao "<c>" --status confere|divergente|inexistente --fonte <url|WIKI/...> [--obs "..."]', 1);
    if (st === 'confere' && !/^https?:\/\//.test(fonte) && !fs.existsSync(path.resolve(c.config().escritorio, fonte))) sair('❌ Para "confere" a fonte precisa ser um link ou um arquivo existente no ESCRITORIO (ex.: WIKI/raw/...).', 2);
    j.registrar(cit, { status: st, fonte, obs: opt('--obs') || null });
    sair('Registrado: ' + cit + ' — ' + rotulo({ status: st }));
    break;
  }
  case 'situacao': { const r = j.consultar(a[1]); sair(a[1] + ': ' + rotulo(r) + (r && r.fonte ? ' (' + r.fonte + ')' : '')); break; }
  default: sair('Uso: julgados.js listar <arquivo> | politica | autorizar|desautorizar <dominio|busca> | pedir "<c>" | comparar … | registrar … | situacao "<c>"', 1);
}
