#!/usr/bin/env node
'use strict';
// Uso: node prazos.js listar [dias]          -> prazos pendentes dos proximos N dias (padrao 15), com o calendario de cada caso
//      node prazos.js calcular DD/MM/AAAA N [--caso "<nome>"] [--tribunal TJPR] [--comarca Curitiba]
//                                            -> vencimento de prazo de N dias uteis + entradas locais consideradas
//      node prazos.js util DD/MM/AAAA [--caso|--tribunal|--comarca] -> diz se a data e dia util (e por que nao)
//      node prazos.js calendario adicionar --tipo feriado|suspensao|indisponibilidade
//                      (--data DD/MM/AAAA | --de DD/MM/AAAA --ate DD/MM/AAAA | --data DD/MM --recorrente)
//                      (--tribunal X [--comarca Y] | --comarca Y | --global) --motivo "..." (--fonte "..." | --sem-fonte)
//                      [--confirmar]
//      node prazos.js calendario listar | ver [--caso|--tribunal|--comarca] [--ano AAAA] | remover <id> | recalcular [--confirmar] | migrar
// Confirmacao (v0.7): "adicionar" grava a entrada no calendario na hora (com a fonte) e mostra os prazos do
// PRAZOS.md que mudam (antes -> depois). Reescrever vencimentos no PRAZOS.md SO com --confirmar,
// depois do "sim" do advogado. "remover" idem: sai do calendario; a reescrita pede "recalcular --confirmar".
const path = require('path');
const c = require('./lib/comum');
const pz = require('./lib/prazos');
const cl = require('./lib/calendario');

const cfg = c.config();
const argv = process.argv.slice(2);
const FLAGS = ['--confirmar', '--sem-fonte', '--recorrente', '--global'];
const pos = [], op = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (FLAGS.includes(a)) op[a.slice(2)] = true;
  else if (/^--/.test(a)) { op[a.slice(2)] = argv[i + 1] != null ? argv[i + 1] : ''; i++; }
  else pos.push(a);
}
const [cmd, a1, a2] = pos;
const fmt = (d) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
const AVISO_RITO = '⚠️ Confira a regra do seu rito: JEC (Lei 9.099, art. 12-A) e trabalhista (CLT art. 775) contam dias úteis; penal (CPP art. 798) conta dias CORRIDOS — não use este cálculo; prazos em dobro (art. 229).';
const sair = (msg, cod) => { console.log(msg); process.exit(cod == null ? 1 : cod); };

function contexto() {
  const ctx = cl.resolverContexto({ caso: op.caso, tribunal: op.tribunal, comarca: op.comarca }, cfg.escritorio);
  return { ctx, cal: cl.ativo(ctx, cfg) };
}
function avisoCalendario(cal, ctx) {
  const l = [];
  if (cal.invalido) l.push('⚠️ O calendário forense está ilegível: considerei só feriados nacionais. Rode o doutor (/consertar).');
  if (ctx.aviso) l.push('⚠️ Calendário local: ' + ctx.aviso + '.');
  if (!ctx.tribunal && !ctx.comarca) l.push('⚠️ Sem tribunal/comarca: considerei só feriados nacionais, o recesso e as entradas globais. Informe --caso ou --tribunal/--comarca.');
  return l;
}

if (cmd === 'calcular') {
  const ini = pz.lerData(a1); const n = parseInt(a2, 10);
  if (!ini || !n) sair('Uso: calcular DD/MM/AAAA DIAS [--caso "<nome>"] [--tribunal TJPR] [--comarca Curitiba]');
  const { ctx, cal } = contexto();
  const { vencimento: v, consideradas } = pz.detalharVencimento(ini, n, [], cal);
  const onde = cl.descreverContexto(ctx);
  console.log('Intimação/publicação: ' + fmt(ini));
  console.log('Prazo: ' + n + ' dias úteis (CPC arts. 219 e 224; recesso art. 220 considerado)');
  console.log('Calendário usado: ' + onde + (ctx.origem ? ' (' + ctx.origem + ')' : ''));
  console.log('Vencimento estimado: ' + fmt(v) + ' (' + pz.iso(v) + ')');
  if (consideradas.length) { console.log('Entradas locais consideradas:'); for (const e of consideradas) console.log('- ' + cl.linhaEntrada(e)); }
  else console.log('Entradas locais consideradas: nenhuma caiu dentro do prazo.');
  const semFonte = consideradas.filter((e) => e.semFonte || !e.fonte);
  for (const e of semFonte) console.log('⚠️ considerei ' + cl.periodo(e) + ' (' + (e.motivo || cl.NOME_TIPO[e.tipo]) + ') [SEM FONTE] — confirme');
  console.log('Resumo: Prazo de ' + n + ' dias úteis' + (ctx.tribunal || ctx.comarca ? ' no ' + onde : '') + ': vence ' + cl.dataBR(v) +
    (consideradas.length ? ' (considerei ' + consideradas.map((e) => (cl.NOME_TIPO[e.tipo] || e.tipo) + ' ' + cl.periodo(e) + ' — ' + (e.motivo || '') + (e.semFonte || !e.fonte ? ' [SEM FONTE]' : ', ' + e.fonte)).join('; ') + ')' : '') + '.');
  console.log('Linha para o PRAZOS.md: | ' + cl.dataBR(v) + ' | ' + (ctx.caso ? ctx.caso.split('/').pop() : '<caso>') + ' | <o que fazer> | <intimação/publicação> ' + pz.marcaCalculo(ini, n, op.tribunal || '', op.comarca || '') + ' | pendente |');
  for (const l of avisoCalendario(cal, ctx)) console.log(l);
  console.log(AVISO_RITO);
} else if (cmd === 'util') {
  const d = pz.lerData(a1);
  if (!d) sair('Uso: util DD/MM/AAAA [--caso|--tribunal|--comarca]');
  const { ctx, cal } = contexto();
  const bl = cal.bloqueios(d);
  console.log(fmt(d) + (pz.ehDiaUtil(d, [], cal) ? ' é dia útil' : ' NÃO é dia útil') + (pz.emRecesso(d) ? ' (período de suspensão 20/12–20/01)' : '') + ' — calendário: ' + cl.descreverContexto(ctx));
  for (const e of bl) console.log('- ' + cl.linhaEntrada(e));
  for (const l of avisoCalendario(cal, ctx)) console.log(l);
} else if (cmd === 'calendario') {
  calendario(a1);
} else {
  const janela = parseInt(a1, 10) || 15;
  const itens = cl.avaliarPrazos(pz.lerPrazos(path.join(cfg.escritorio, 'PRAZOS.md')), { cfg });
  const lista = itens.filter((i) => i.uteis <= janela).sort((x, y) => x.efetivo - y.efetivo);
  if (!lista.length) sair('Nenhum prazo pendente nos próximos ' + janela + ' dias úteis. ✅', 0);
  for (const i of lista) {
    const icone = i.uteis < 0 ? '🔴 VENCIDO' : i.uteis <= 2 ? '🔴' : i.uteis <= 5 ? '🟡' : '🟢';
    const quando = i.uteis < 0 ? 'há ' + (-i.uteis) + ' dia(s) útil(eis)' : i.uteis === 0 ? 'HOJE' : 'em ' + i.uteis + ' dia(s) útil(eis)';
    const pr = i.efetivo.getTime() !== i.data.getTime() ? ' → ' + pz.iso(i.efetivo) + ' (prorrogado, art. 224 §1º' + (i.prorrogadoPor.length ? ': ' + i.prorrogadoPor.map((e) => e.motivo + (e.semFonte || !e.fonte ? ' [SEM FONTE]' : '')).join('; ') : '') + ')' : '';
    console.log(icone + ' ' + i.vencimento + pr + ' (' + quando + ') — ' + i.caso + ' — ' + i.tarefa);
  }
  const mudam = itens.filter((i) => i.muda && !(i.semDadosDeCalculo));
  if (mudam.length) console.log('⚠️ ' + mudam.length + ' prazo(s) mudam com o calendário forense: veja com "calendario recalcular".');
}

function mostrarAfetados(confirmar, cabecalho) {
  const { arquivo, itens } = cl.prazosAfetados({ cfg });
  if (!itens.length) { console.log('Nenhum prazo do PRAZOS.md muda de vencimento.'); return; }
  console.log(cabecalho + ' (' + itens.length + '):');
  for (const l of cl.linhasAfetados(itens)) console.log(l);
  if (confirmar) {
    const n = cl.reescreverPrazos(arquivo, itens, cfg.escritorio);
    console.log('✅ PRAZOS.md atualizado: ' + n + ' vencimento(s) reescrito(s) (cópia anterior em _versoes/). Atualize também o DOSSIE.md dos casos, se o prazo estiver anotado lá.');
  } else console.log('SIMULAÇÃO: o PRAZOS.md NÃO foi alterado. Mostre a lista ao advogado e, só depois do "sim", rode de novo com --confirmar.');
}

function calendario(sub) {
  const cal = cl.ler();
  if (cal.invalido && sub !== 'listar' && sub !== 'ver') sair('O calendário forense (' + cl.arquivo() + ') está ilegível; não vou gravar por cima. Rode o doutor com --consertar (ele guarda a cópia estragada de lado).', 2);
  if (sub === 'migrar') {
    const r = cl.migrarExtras(cfg);
    sair(r.migradas ? '✅ ' + r.migradas + ' data(s) de feriadosExtras viraram entradas globais [SEM FONTE] (o config.json foi mantido).' : 'Nada a migrar.', 0);
  }
  cl.migrarExtras(cfg);
  if (sub === 'adicionar') {
    const tipo = cl.tipoNormal(op.tipo);
    if (!tipo) sair('Informe --tipo feriado | suspensao | indisponibilidade.');
    const rec = !!op.recorrente;
    const lerD = (s) => { if (rec) { const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{4})?$/); return m ? String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0') : null; } const d = pz.lerData(s); return d ? pz.iso(d) : null; };
    const inicio = lerD(op.data || op.de), fim = lerD(op.data || op.ate || op.de);
    if (!inicio || !fim) sair('Informe a data: --data DD/MM/AAAA (um dia), --de DD/MM/AAAA --ate DD/MM/AAAA (intervalo) ou --data DD/MM --recorrente (todo ano).');
    if (!rec && fim < inicio) sair('A data final (--ate) é anterior à inicial (--de).');
    let escopo;
    if (op.global) escopo = 'global';
    else if (op.tribunal || op.comarca) { escopo = {}; if (op.tribunal) escopo.tribunal = cl.limparTribunal(op.tribunal); if (op.comarca) escopo.comarca = cl.limparComarca(op.comarca); }
    else sair('Informe o alcance: --tribunal X, --comarca Y, os dois, ou --global (vale para todos os tribunais).');
    const motivo = String(op.motivo || '').trim();
    if (!motivo) sair('Informe --motivo (ex.: "Feriado municipal de Nossa Senhora da Luz", "Indisponibilidade do eproc").');
    const fonte = String(op.fonte || '').trim();
    if (!fonte && !op['sem-fonte']) sair('Falta a FONTE (lei, portaria, ato do tribunal ou link). Peça ao advogado. Só sem fonte se ele insistir: use --sem-fonte (a data fica marcada [SEM FONTE] e é sinalizada em todo cálculo).');
    const e = { tipo, inicio, fim, recorrente: rec, escopo, motivo, fonte, semFonte: !fonte, criadoEm: new Date().toISOString() };
    e.id = cl.idDe(e);
    const ja = cal.entradas.find((x) => x.id === e.id);
    const atual = cl.ler();
    if (ja) console.log('Essa data já estava no calendário (id ' + e.id + '): ' + cl.linhaEntrada(ja));
    else { atual.entradas.push(e); cl.gravar(atual); console.log('✅ Gravado no calendário forense: ' + cl.linhaEntrada(e, true)); }
    mostrarAfetados(!!op.confirmar, 'Prazos que mudam de vencimento (antes → depois)');
    console.log('⚠️ Confira o prazo no sistema do tribunal. O cálculo é um auxílio.');
  } else if (sub === 'remover') {
    const id = pos[2];
    const atual = cl.ler();
    const e = atual.entradas.find((x) => x.id === id);
    if (!e) sair('Não achei a entrada "' + (id || '') + '". Veja os ids com: calendario listar');
    c.versionar(cl.arquivo(), path.join(c.P.base, 'calendario-versoes'));
    atual.entradas = atual.entradas.filter((x) => x.id !== id);
    cl.gravar(atual);
    console.log('🗑️ Removida do calendário (cópia em calendario-versoes/): ' + cl.linhaEntrada(e));
    if (e.origem === 'feriadosExtras') console.log('(O valor original continua em feriadosExtras no config.json, mas não é mais considerado.)');
    mostrarAfetados(false, 'Prazos que mudariam de vencimento (antes → depois)');
  } else if (sub === 'recalcular') {
    mostrarAfetados(!!op.confirmar, 'Prazos que mudam de vencimento (antes → depois)');
  } else if (sub === 'ver') {
    const { ctx, cal: ativo } = contexto();
    const ano = parseInt(op.ano, 10) || new Date().getFullYear();
    console.log('Calendário forense ativo — ' + cl.descreverContexto(ctx) + ' — ' + ano);
    console.log('Nacionais (sempre): ' + Array.from(pz.feriados(ano)).sort().map((d) => cl.br(d)).join(', ') + '; recesso 20/12–20/01 (art. 220).');
    const doAno = ativo.entradas.filter((e) => e.recorrente || String(e.inicio).slice(0, 4) <= String(ano) && String(e.fim || e.inicio).slice(0, 4) >= String(ano));
    console.log(doAno.length ? 'Locais e suspensões que valem aqui (' + doAno.length + '):\n' + doAno.map((e) => '- ' + cl.linhaEntrada(e, true)).join('\n') : 'Nenhuma entrada local cadastrada para esse alcance. Cadastre com a fonte (calendario adicionar).');
    for (const l of avisoCalendario(ativo, ctx)) console.log(l);
  } else if (sub === 'listar' || !sub) {
    if (cal.invalido) sair('⚠️ O calendário forense está ilegível. Rode o doutor com --consertar.', 2);
    const todas = cl.ler().entradas;
    if (!todas.length) sair('Calendário forense vazio: só feriados nacionais e o recesso. Cadastre feriados locais e suspensões com a fonte.', 0);
    const sem = todas.filter((e) => e.semFonte || !e.fonte).length;
    console.log('Calendário forense: ' + todas.length + ' entrada(s)' + (sem ? ' (' + sem + ' sem fonte)' : '') + ' — ' + cl.arquivo());
    for (const e of todas.slice().sort((x, y) => String(x.inicio).localeCompare(String(y.inicio)))) console.log('- ' + cl.linhaEntrada(e, true));
  } else sair('Uso: calendario adicionar|listar|ver|remover <id>|recalcular [--confirmar]|migrar');
}
