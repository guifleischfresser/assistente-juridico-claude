#!/usr/bin/env node
'use strict';
// Hook SessionStart: prepara o escritorio, restaura o estado (ultimo handoff), avisa prazos,
// onboarding pendente e novidades das habilidades automaticas. Nada sai do computador.
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const pz = require('./lib/prazos');
const { garantirEscritorio } = require('./lib/escritorio');

c.rodarHook('sessao-inicio', (ent) => {
  const cfg = c.config();
  const esc = cfg.escritorio;
  // Modo plugin: garante copia local dos scripts/modelos (as skills chamam ~/.claude/advogado/scripts)
  const raizPlugin = process.env.CLAUDE_PLUGIN_ROOT;
  if (raizPlugin && c.lerJSON(path.join(c.P.base, 'versao.json'), {}).versao !== c.VERSAO) {
    try { require(path.join(raizPlugin, 'scripts', 'instalar.js')).instalarArquivosBase(raizPlugin); } catch (e) { c.log('erros', 'bootstrap plugin: ' + e.message); }
  }
  const modelo = path.join(c.P.base, 'modelo-escritorio');
  const criados = garantirEscritorio(esc, modelo);
  const partes = [];

  partes.push('Advogado Claude Mod v' + c.VERSAO + ' ativo. ESCRITORIO do usuário: ' + esc + ' (mapa oficial em ESTRUTURA.md).');
  if (criados.length) partes.push('Itens recriados no ESCRITORIO nesta sessão: ' + criados.slice(0, 10).join(', ') + (criados.length > 10 ? '…' : '') + '.');

  // Onboarding
  if (!cfg.onboardingConcluido) {
    const est = c.lerJSON(path.join(c.P.estado, 'primeira-execucao.json'), null);
    let prox = '';
    try { const { ETAPAS } = require('./primeira-execucao'); const p = ETAPAS.find(([n]) => !(est && est.etapas && est.etapas[n] && est.etapas[n].feito)); prox = p ? p[0] : ''; } catch (e) { /* */ }
    partes.push((est ? 'PRIMEIRA EXECUÇÃO INCOMPLETA (próxima etapa: ' + (prox || '?') + '). ' : 'ONBOARDING PENDENTE. ') +
      'Na primeira resposta, cumprimente em português simples e retome a skill primeira-execucao (/primeira-execucao) de onde parou, no piloto automático (sem perguntas opcionais). Estado: node "' + path.join(c.P.base, 'scripts', 'primeira-execucao.js') + '" estado');
  }

  // Restaurar estado: handoff mais recente (7 dias)
  if (ent.source !== 'clear') {
    try {
      const dirH = path.join(esc, 'HANDOFFS');
      const arqs = fs.readdirSync(dirH).filter((f) => f.endsWith('.md'))
        .map((f) => ({ f, t: fs.statSync(path.join(dirH, f)).mtimeMs })).sort((a, b) => b.t - a.t);
      if (arqs.length && Date.now() - arqs[0].t < 7 * 864e5) {
        const txt = fs.readFileSync(path.join(dirH, arqs[0].f), 'utf8');
        const prox = txt.match(/##\s*Pr[oó]ximos passos[\s\S]*?(?=\n##\s|$)/i);
        partes.push('Último handoff: HANDOFFS/' + arqs[0].f + '. ' + (prox ? 'Trecho "Próximos passos":\n' + prox[0].slice(0, 1500) : 'Leia o arquivo se o usuário quiser continuar de onde parou.'));
      }
    } catch (e) { /* sem handoffs ainda */ }
  }
  if (ent.source === 'compact') {
    partes.push('A conversa acabou de ser compactada. Se havia trabalho em andamento sem handoff salvo, registre um handoff agora (skill handoff).');
  }

  // Prazos dos proximos 5 dias uteis
  try {
    const itens = pz.lerPrazos(path.join(esc, 'PRAZOS.md'))
      .map((i) => Object.assign(i, { uteis: pz.diasUteisAte(i.data, new Date(), cfg.feriadosExtras) }))
      .filter((i) => i.uteis <= 5);
    if (itens.length) {
      partes.push('PRAZOS PRÓXIMOS (avise o usuário logo no início):\n' + itens.map((i) => '- ' + i.vencimento + ' (' + (i.uteis < 0 ? 'VENCIDO' : i.uteis + ' dia(s) útil(eis)') + '): ' + i.caso + ' — ' + i.tarefa).join('\n'));
    }
  } catch (e) { /* ignora */ }

  // Habilidades automaticas: candidatas e mudancas recentes
  const cand = c.lerJSON(path.join(c.P.hab, 'candidatas.json'), []).filter((x) => x.status === 'sugerida');
  if (cand.length) partes.push('Há ' + cand.length + ' tarefa(s) repetida(s) candidata(s) a virar habilidade automática (veja ' + path.join(c.P.hab, 'candidatas.json') + '). Use a skill criar-skill-automatica quando for oportuno, sem pedir aprovação, seguindo as salvaguardas.');
  const reg = c.lerJSON(path.join(c.P.hab, 'registro.json'), { skills: {} });
  const recentes = Object.entries(reg.skills || {}).filter(([, s]) => s.atualizadoEm && Date.now() - Date.parse(s.atualizadoEm) < 2 * 864e5);
  if (recentes.length) partes.push('Habilidades alteradas nos últimos 2 dias: ' + recentes.map(([n, s]) => n + ' (' + s.status + ', v' + s.versao + ')').join(', ') + '. Mencione brevemente ao usuário e lembre que ele pode desfazer com /habilidades.');

  // Reflexao pendente (deixada pelo hook SessionEnd da sessao anterior)
  try {
    const rf = c.lerJSON(path.join(c.P.estado, 'reflexao.json'), {});
    if (rf.reflexaoPendente) partes.push('🧠 REFLEXÃO PENDENTE da sessão anterior (' + (rf.reflexaoPendente.ferramentas || 0) + ' ações, ' + (rf.reflexaoPendente.pecas || 0) + ' peça(s)). Depois de atender o primeiro pedido do usuário (ou já, se ele só cumprimentou): ' + require('./gatilho-handoff-passos').PASSOS_REFLEXAO);
  } catch (e) { /* */ }
  // Manutencao de habilidades a cada 15 dias (autonoma; backup + changelog + desfazer). So depois do onboarding.
  if (cfg.onboardingConcluido && ent.source !== 'compact') {
    try {
      const mt = require('./manutencao').aoIniciarSessao();
      if (mt.resumo) partes.splice(1, 0, '🧹 MANUTENÇÃO DE HABILIDADES ' + (mt.executada ? 'feita agora' : 'feita') + ' (automática, a cada 15 dias). Na primeira resposta, mostre ao usuário em UMA linha: "' + mt.resumo + '" e diga que dá para desfazer com /manutencao desfazer. Relatório: ' + (mt.relatorio || ''));
    } catch (e) { c.log('erros', 'manutencao: ' + e.message); }
  }
  return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: partes.join('\n\n').slice(0, 9500) } };
});
