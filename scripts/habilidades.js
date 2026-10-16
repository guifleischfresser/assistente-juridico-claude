#!/usr/bin/env node
'use strict';
/*
 * Gestor das HABILIDADES (skills) do assistente. E o unico caminho para uma skill automatica
 * entrar em ~/.claude/skills. Toda mudanca: valida -> exige ensaio -> faz backup -> registra no
 * CHANGELOG -> pode ser desfeita. Falhas repetidas => aposentada automaticamente.
 *
 * Uso: node habilidades.js <comando> [args]
 *   listar | candidatas | validar <nome> | publicar <nome> "<motivo>"
 *   resultado <nome> ok|falha "<detalhe>" | desfazer <nome> | aposentar <nome> "<motivo>"
 *   restaurar <nome> | registrar-nucleo <pasta-skills> | historico [n]
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const { validarSkill, NUCLEO } = require('./lib/validar');

const H = {
  reg: path.join(c.P.hab, 'registro.json'),
  log: path.join(c.P.hab, 'CHANGELOG.md'),
  rasc: path.join(c.P.hab, 'rascunhos'),
  versoes: path.join(c.P.hab, 'versoes'),
  apos: path.join(c.P.hab, '_aposentadas'),
  cand: path.join(c.P.hab, 'candidatas.json'),
};
const cfg = c.config();
const lerReg = () => { const r = c.lerJSON(H.reg, { skills: {} }); r.skills = r.skills || {}; return r; };
const limpar = (n) => String(n || '').trim().toLowerCase().replace(/^auto-/, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const viva = (n) => path.join(c.P.skillsVivas, 'auto-' + n);
const agora = () => new Date().toISOString();

function copiarDir(o, d, pular) {
  c.garantirDir(d);
  for (const x of fs.readdirSync(o)) {
    if (pular && pular.includes(x)) continue;
    const a = path.join(o, x), b = path.join(d, x);
    if (fs.statSync(a).isDirectory()) copiarDir(a, b, null); else fs.copyFileSync(a, b);
  }
}
function removerDir(d) { if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true }); }
function moverDir(o, d) { c.garantirDir(path.dirname(d)); try { fs.renameSync(o, d); } catch (e) { copiarDir(o, d); removerDir(o); } }
function changelog(titulo, linhas) {
  c.garantirDir(c.P.hab);
  if (!fs.existsSync(H.log)) fs.writeFileSync(H.log, '# Histórico de habilidades do assistente\n\nCada mudança automática fica registrada aqui, com backup e instrução para desfazer.\n', 'utf8');
  const d = new Date();
  fs.appendFileSync(H.log, '\n## ' + d.toLocaleString('pt-BR') + ' — ' + titulo + '\n' + linhas.map((l) => '- ' + l).join('\n') + '\n', 'utf8');
}
function sair(msg, codigo) { console.log(msg); process.exit(codigo || 0); }

const [cmd, a1, a2, a3] = process.argv.slice(2);
const nome = limpar(a1);

switch (cmd) {
  case 'listar': {
    const reg = lerReg();
    const linhas = Object.entries(reg.skills).sort().map(([n, s]) => {
      const ic = s.origem === 'nucleo' ? '📦' : s.status === 'aposentada' ? '🗄️' : s.status === 'estavel' ? '✅' : '🧪';
      return ic + ' /' + n + ' — ' + (s.origem === 'nucleo' ? 'núcleo' : s.status + ', v' + s.versao + ', usos ' + (s.usos || 0) + ', falhas ' + (s.falhas || 0)) + (s.resumo ? ' — ' + s.resumo : '');
    });
    sair(linhas.length ? linhas.join('\n') : 'Nenhuma habilidade registrada ainda.');
    break;
  }
  case 'candidatas': {
    const cand = c.lerJSON(H.cand, []);
    sair(cand.length ? cand.map((x) => '- [' + x.status + '] ' + x.assinatura + ' (' + x.ocorrencias + 'x, última ' + x.ultima + ')').join('\n') : 'Nenhuma tarefa repetida detectada ainda.');
    break;
  }
  case 'validar': {
    if (!nome) sair('Uso: validar <nome>', 1);
    const r = validarSkill(path.join(H.rasc, nome), { auto: true, exigirTeste: a2 === '--com-teste' });
    sair((r.ok ? '✅ APROVADO' : '❌ REPROVADO') + (r.erros.length ? '\nErros:\n- ' + r.erros.join('\n- ') : '') + (r.avisos.length ? '\nAvisos:\n- ' + r.avisos.join('\n- ') : ''), r.ok ? 0 : 2);
    break;
  }
  case 'publicar': {
    if (!nome) sair('Uso: publicar <nome> "<motivo>"', 1);
    if (NUCLEO.includes(nome)) sair('❌ "' + nome + '" é skill do núcleo e não pode ser substituída.', 2);
    const dir = path.join(H.rasc, nome);
    const r = validarSkill(dir, { auto: true, exigirTeste: true });
    if (!r.ok) sair('❌ Publicação recusada. Corrija o rascunho:\n- ' + r.erros.join('\n- '), 2);
    const reg = lerReg();
    const chave = 'auto-' + nome;
    const hoje = c.hojeISO();
    const criadasHoje = Object.values(reg.skills).filter((s) => s.origem === 'automatica' && (s.historico || []).some((h) => h.data.startsWith(hoje))).length;
    if (criadasHoje >= cfg.limites.skillsPorDia) sair('⏸️ Limite diário de ' + cfg.limites.skillsPorDia + ' mudanças automáticas atingido. Tente amanhã (salvaguarda contra excesso de mudanças).', 3);
    const ativas = Object.values(reg.skills).filter((s) => s.origem === 'automatica' && s.status !== 'aposentada').length;
    if (!reg.skills[chave] && ativas >= cfg.limites.skillsAtivas) sair('⏸️ Já existem ' + ativas + ' habilidades automáticas ativas (limite). Aposente alguma pouco usada antes.', 3);
    let backup = null;
    if (fs.existsSync(viva(nome))) { backup = path.join(H.versoes, chave, c.carimbo()); copiarDir(viva(nome), backup); removerDir(viva(nome)); }
    copiarDir(dir, viva(nome), ['teste']);
    const ensaio = path.join(H.versoes, chave, 'ensaios', c.carimbo() + '.md');
    c.garantirDir(path.dirname(ensaio)); fs.copyFileSync(path.join(dir, 'teste', 'resultado.md'), ensaio);
    const ant = reg.skills[chave] || {};
    const fm = c.lerFrontmatter(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')).dados;
    reg.skills[chave] = {
      origem: 'automatica', status: 'experimental', versao: (ant.versao || 0) + 1, usos: ant.usos || 0, falhas: 0, sucessos: 0,
      criadaEm: ant.criadaEm || agora(), atualizadoEm: agora(), resumo: String(fm.description || '').slice(0, 120),
      historico: (ant.historico || []).concat([{ data: agora(), acao: ant.versao ? 'atualizada' : 'criada', motivo: a2 || '', backup }]),
    };
    c.gravarJSON(H.reg, reg);
    const cand = c.lerJSON(H.cand, []);
    cand.forEach((x) => { if (x.status === 'sugerida' && a3 && x.id === a3) x.status = 'criada'; });
    c.gravarJSON(H.cand, cand);
    changelog(chave + ' v' + reg.skills[chave].versao + ' (' + (ant.versao ? 'atualizada' : 'criada') + ')', [
      'Motivo: ' + (a2 || 'não informado'), 'Validação: aprovada' + (r.avisos.length ? ' (avisos: ' + r.avisos.join('; ') + ')' : ''),
      'Ensaio (dry-run): aprovado — cópia em ' + ensaio, 'Backup da versão anterior: ' + (backup || 'nenhuma (primeira versão)'),
      'Para desfazer: /habilidades desfazer ' + nome,
    ]);
    sair('✅ Habilidade /' + chave + ' publicada (v' + reg.skills[chave].versao + ', experimental). Desfazer: /habilidades desfazer ' + nome);
    break;
  }
  case 'resultado': {
    const reg = lerReg(); const chave = 'auto-' + nome; const s = reg.skills[chave];
    if (!s) sair('Habilidade não encontrada: ' + chave, 1);
    if (a2 === 'ok') { s.sucessos = (s.sucessos || 0) + 1; if (s.status === 'experimental' && s.sucessos >= 5 && !s.falhas) s.status = 'estavel'; }
    else {
      s.falhas = (s.falhas || 0) + 1; s.ultimaFalha = { data: agora(), detalhe: a3 || '' };
      changelog(chave + ' falhou (' + s.falhas + '/' + cfg.limites.falhasParaAposentar + ')', ['Detalhe: ' + (a3 || 'não informado')]);
    }
    c.gravarJSON(H.reg, reg);
    if (s.falhas >= cfg.limites.falhasParaAposentar) {
      require('child_process').execFileSync(process.execPath, [__filename, 'aposentar', nome, 'falhou ' + s.falhas + ' vezes: ' + (a3 || '')], { stdio: 'inherit' });
    } else sair('Registrado: ' + chave + ' ' + (a2 === 'ok' ? 'sucesso' : 'falha') + '.');
    break;
  }
  case 'aposentar': {
    const reg = lerReg(); const chave = 'auto-' + nome;
    if (!fs.existsSync(viva(nome))) sair('Habilidade não está ativa: ' + chave, 1);
    const destino = path.join(H.apos, chave + '__' + c.carimbo());
    moverDir(viva(nome), destino);
    if (reg.skills[chave]) { reg.skills[chave].status = 'aposentada'; reg.skills[chave].atualizadoEm = agora(); reg.skills[chave].historico = (reg.skills[chave].historico || []).concat([{ data: agora(), acao: 'aposentada', motivo: a2 || '' }]); }
    c.gravarJSON(H.reg, reg);
    changelog(chave + ' aposentada', ['Motivo: ' + (a2 || 'não informado'), 'Guardada em: ' + destino, 'Para trazer de volta: /habilidades restaurar ' + nome]);
    sair('🗄️ /' + chave + ' aposentada (guardada em _aposentadas). Restaurar: /habilidades restaurar ' + nome);
    break;
  }
  case 'desfazer': {
    const chave = 'auto-' + nome; const dv = path.join(H.versoes, chave);
    const backs = fs.existsSync(dv) ? fs.readdirSync(dv).filter((x) => x !== 'ensaios').sort() : [];
    if (!backs.length) {
      require('child_process').execFileSync(process.execPath, [__filename, 'aposentar', nome, 'desfeita (não havia versão anterior)'], { stdio: 'inherit' });
      break;
    }
    const ultimo = path.join(dv, backs[backs.length - 1]);
    const reg = lerReg();
    if (fs.existsSync(viva(nome))) moverDir(viva(nome), path.join(H.apos, chave + '__desfeita__' + c.carimbo()));
    copiarDir(ultimo, viva(nome)); moverDir(ultimo, ultimo + '__restaurada');
    const s = reg.skills[chave] || { origem: 'automatica', versao: 1 };
    s.versao = Math.max(1, (s.versao || 1) - 1); s.status = 'experimental'; s.falhas = 0; s.atualizadoEm = agora();
    s.historico = (s.historico || []).concat([{ data: agora(), acao: 'desfeita', backup: ultimo }]);
    reg.skills[chave] = s; c.gravarJSON(H.reg, reg);
    changelog(chave + ' revertida para a versão anterior', ['Restaurada de: ' + ultimo]);
    sair('↩️ /' + chave + ' voltou para a versão anterior.');
    break;
  }
  case 'restaurar': {
    const chave = 'auto-' + nome;
    const lista = fs.existsSync(H.apos) ? fs.readdirSync(H.apos).filter((x) => x.startsWith(chave + '__')).sort() : [];
    if (!lista.length) sair('Nada para restaurar: ' + chave, 1);
    if (fs.existsSync(viva(nome))) sair('Já existe uma versão ativa de ' + chave + '. Use desfazer ou aposentar antes.', 1);
    moverDir(path.join(H.apos, lista[lista.length - 1]), viva(nome));
    const reg = lerReg(); const s = reg.skills[chave] || { origem: 'automatica', versao: 1 };
    s.status = 'experimental'; s.falhas = 0; s.atualizadoEm = agora(); reg.skills[chave] = s; c.gravarJSON(H.reg, reg);
    changelog(chave + ' restaurada', ['Origem: _aposentadas/' + lista[lista.length - 1]]);
    sair('♻️ /' + chave + ' restaurada.');
    break;
  }
  case 'registrar-nucleo': {
    const pasta = a1; const reg = lerReg();
    for (const n of fs.readdirSync(pasta)) {
      if (!fs.existsSync(path.join(pasta, n, 'SKILL.md'))) continue;
      const fm = c.lerFrontmatter(fs.readFileSync(path.join(pasta, n, 'SKILL.md'), 'utf8')).dados;
      reg.skills[n] = Object.assign(reg.skills[n] || {}, { origem: 'nucleo', status: 'estavel', versao: c.VERSAO, resumo: String(fm.description || '').slice(0, 120) });
    }
    c.gravarJSON(H.reg, reg);
    sair('Núcleo registrado.');
    break;
  }
  case 'historico': {
    const t = fs.existsSync(H.log) ? fs.readFileSync(H.log, 'utf8') : 'Sem histórico ainda.';
    const blocos = t.split(/\n(?=## )/); const n = parseInt(a1, 10) || 10;
    sair(blocos.slice(0, 1).concat(blocos.slice(1).slice(-n)).join('\n'));
    break;
  }
  default:
    sair('Comandos: listar | candidatas | validar <nome> | publicar <nome> "<motivo>" [id-candidata] | resultado <nome> ok|falha "<detalhe>" | desfazer <nome> | aposentar <nome> "<motivo>" | restaurar <nome> | historico [n]');
}
