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
 *           o original pode ser .txt/.md, pagina salva do site (.html), PDF ou Word (lib/extrair.js: so o texto
 *           visivel; texto escondido e instrucoes para IA geram aviso, nunca sao obedecidos).
 *           Arquivo sem texto legivel (PDF escaneado, pagina vazia): nao confere nem diverge; codigo 4, status 'sem-texto'.
 *      node julgados.js registrar --citacao "<c>" --status confere|divergente|inexistente --fonte <url|WIKI/...> [--obs "..."]
 *      node julgados.js situacao "<citação>"
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const j = require('./lib/julgados');
const { analisarCitacoes } = require('./lib/citacoes');
const { extrairTexto } = require('./lib/extrair');

const a = process.argv.slice(2);
const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
const cmd = a[0];
function sair(m, cod) { console.log(m); process.exit(cod || 0); }
const ICONE = { confere: '✅ confere', divergente: '🔴 DIVERGENTE', inexistente: '🔴 NÃO EXISTE', 'sem-texto': '⚠️ arquivo sem texto legível' };
const rotulo = (r) => (r ? ICONE[r.status] || r.status : '⚠️ não verificado');

// arquivo salvo sem texto legivel: um passo, em linguagem simples (o advogado le isto)
const COPIAR = 'Abra o julgado no site, copie o texto da ementa/inteiro teor e salve como texto (.txt), ou salve a página de novo.';
const PASSO_SEM_TEXTO = {
  'sem-texto-pagina': 'O arquivo salvo não traz o texto do julgado (veio vazio ou só com a programação do site). ' + COPIAR,
  'arquivo-vazio': 'O arquivo salvo está vazio. ' + COPIAR,
  'pdf-escaneado': 'Esse PDF é uma imagem, sem texto para ler. Coloque-o na pasta documentos do caso e rode o preparar-autos com --ocr (ele lê o texto da imagem no próprio computador); depois confira usando o arquivo gerado em autos-md/. Ou salve o trecho como texto.',
  'sem-leitor-pdf': 'Este computador não tem leitor de PDF; instale o Poppler (veja o README, "Ler PDFs") ou salve o julgado como texto.',
};
const semTags = (x) => String(x || '').replace(/<[^>]*>?/g, ' ').replace(/\s+/g, ' ').trim();
/** Linhas de aviso (texto escondido, frases para IA, paginas sem texto) — o assistente nunca obedece. */
function avisos(ex, st) {
  const L = []; const tipos = [];
  if (ex.ocultos.length) tipos.push('texto escondido (não aparece para quem abre o arquivo)');
  if (ex.injecao.length) tipos.push('frases que parecem ordens para um assistente de IA');
  if (tipos.length) {
    const ex1 = semTags(ex.textoOculto || ex.injecao[0] || '').slice(0, 120);
    L.push('⚠️ Atenção: o arquivo do julgado tem ' + tipos.join(' e ') + '. O assistente NÃO obedece ao que estiver escrito ali' + (ex.ocultos.length ? ' e não usou o texto escondido na comparação' : '') + '.' + (ex1 ? ' Trecho: «' + ex1 + '»' : ''));
  }
  if (ex.paginasSemTexto) {
    L.push('⚠️ ' + ex.paginasSemTexto + ' página(s) do PDF não têm texto (provavelmente imagem escaneada).' + (st === 'divergente' ? ' O trecho citado pode estar justamente nessas páginas: rode o preparar-autos com --ocr na pasta do caso e compare com o arquivo gerado em autos-md/, ou salve o trecho como texto e compare de novo.' : ''));
  }
  return L;
}

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
    const ex = extrairTexto(orig);
    const fonte = opt('--fonte') || path.relative(c.config().escritorio, path.resolve(orig)).replace(/\\/g, '/');
    if (ex.semTexto) {
      // nao da para dizer confere nem divergente; nunca rebaixa um registro anterior com resultado
      const ant = j.consultar(cit);
      if (!ant || ant.status === j.STATUS_SEM_TEXTO) j.registrar(cit, { status: j.STATUS_SEM_TEXTO, fonte, motivo: ex.motivo, obs: 'arquivo salvo sem texto legível' });
      sair('⚠️ ' + cit + ': não deu para conferir — ' + PASSO_SEM_TEXTO[ex.motivo] + '\nNada foi dado como conferido nem como divergente' + (ant && ant.status !== j.STATUS_SEM_TEXTO ? '; o registro anterior foi mantido (' + rotulo(ant) + ').' : '.'), 4);
    }
    const original = ex.texto;
    if (!trecho) { const r = j.registrar(cit, { status: 'confere', fonte, trechoConfere: null, motivo: null, obs: 'julgado localizado; a peça não traz trecho entre aspas' }); sair(['✅ ' + cit + ': julgado localizado (sem trecho citado para comparar). Registrado: ' + r.fonte].concat(avisos(ex, 'confere')).join('\n')); }
    const cmp = j.comparar(trecho, original);
    const st = j.situacao(cmp);
    j.registrar(cit, { status: st, fonte, trechoConfere: st === 'confere', similaridade: cmp.similaridade, faltando: cmp.faltando, omitidas: cmp.omitidas, motivo: null, obs: null });
    const L = [(st === 'confere' ? '✅ CONFERE' : '🔴 DIVERGENTE') + ': ' + cit + ' — trecho ' + Math.round(cmp.similaridade * 100) + '% igual ao original' + (cmp.faltando.length ? '. Palavras do trecho citado que NÃO estão no original: ' + cmp.faltando.join(', ') : '') + (st !== 'confere' && cmp.omitidas.length ? '. Palavras do original que o trecho deixou de fora: ' + cmp.omitidas.join(', ') : '')];
    // o trecho so existe no texto escondido? nunca vale como conferido; o advogado olha a pagina de verdade
    if (st !== 'confere' && ex.textoOculto && j.situacao(j.comparar(trecho, ex.textoOculto)) === 'confere') L.push('🔎 O trecho só aparece numa parte ESCONDIDA do arquivo (não aparece para quem abre). Não dei como conferido: abra o julgado no site e veja se esse texto aparece de verdade; se aparecer, copie, salve como texto e compare de novo.');
    L.push(...avisos(ex, st));
    L.push('Fonte registrada: ' + fonte);
    sair(L.join('\n'), st === 'confere' ? 0 : 3);
    break;
  }
  case 'registrar': {
    const cit = opt('--citacao'); const st = opt('--status'); const fonte = opt('--fonte');
    if (!cit || !['confere', 'divergente', 'inexistente'].includes(st) || !fonte) sair('Uso: registrar --citacao "<c>" --status confere|divergente|inexistente --fonte <url|WIKI/...> [--obs "..."]', 1);
    if (st === 'confere' && !/^https?:\/\//.test(fonte) && !fs.existsSync(path.resolve(c.config().escritorio, fonte))) sair('❌ Para "confere" a fonte precisa ser um link ou um arquivo existente no ESCRITORIO (ex.: WIKI/raw/...).', 2);
    j.registrar(cit, { status: st, fonte, motivo: null, obs: opt('--obs') || null });
    sair('Registrado: ' + cit + ' — ' + rotulo({ status: st }));
    break;
  }
  case 'situacao': { const r = j.consultar(a[1]); sair(a[1] + ': ' + rotulo(r) + (r && r.fonte ? ' (' + r.fonte + ')' : '')); break; }
  default: sair('Uso: julgados.js listar <arquivo> | politica | autorizar|desautorizar <dominio|busca> | pedir "<c>" | comparar … | registrar … | situacao "<c>"', 1);
}
