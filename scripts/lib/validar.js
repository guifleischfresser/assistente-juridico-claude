'use strict';
// Validacao estatica de skills (usada no rascunho, na publicacao e no teste do instalador).
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const RESERVADOS = ['help', 'clear', 'compact', 'config', 'cost', 'doctor', 'init', 'login', 'logout', 'memory', 'model', 'review', 'code-review', 'status', 'statusline', 'hooks', 'agents', 'plugin', 'resume', 'rewind', 'permissions', 'context', 'skills', 'output-style', 'exit', 'export', 'add-dir', 'mcp', 'usage', 'effort', 'verify', 'run', 'loop', 'debug', 'batch', 'synced', 'anthropic-skills'];
const NUCLEO = ['boas-vindas', 'ajuda', 'novo-caso', 'casos', 'nova-peca', 'formatar-peca', 'revisar', 'advogado-do-diabo', 'verificar-citacoes', 'preparar-autos', 'prazos', 'aprender-meu-estilo', 'handoff', 'criar-skill-automatica', 'habilidades', 'backup', 'primeira-execucao', 'consertar', 'reflexao', 'manutencao', 'mapa-de-teses', 'processo', 'cliente', 'erros', 'anonimizar', 'consentimento'];
const FERRAMENTAS_LIVRES = ['Read', 'Glob', 'Grep'];
const REDE = /\b(curl|wget|scp|sftp|ftp|rsync|rclone|Invoke-WebRequest|Invoke-RestMethod|Send-MailMessage|git\s+push|requests\.post|smtplib|fetch\()/i;

function validarSkill(dir, opcoes) {
  opcoes = opcoes || {};
  const erros = [], avisos = [];
  const arq = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(arq)) return { ok: false, erros: ['SKILL.md não encontrado em ' + dir], avisos };
  const texto = fs.readFileSync(arq, 'utf8');
  const fm = c.lerFrontmatter(texto);
  if (!fm.ok) erros.push('frontmatter YAML ausente (o arquivo deve começar com ---)');
  for (const p of c.problemasYaml(texto)) erros.push('YAML inválido (o Claude Code ignoraria a skill): ' + p);
  const d = fm.dados;
  const nome = d.name || path.basename(dir);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nome) || nome.length > 64) erros.push('name deve ser minúsculo-com-hifens, até 64 caracteres');
  if (!d.description || d.description.length < 20) erros.push('description ausente ou curta demais');
  else if (d.description.length > 1024) erros.push('description acima de 1024 caracteres');
  if (d.description && !/use quando|usar quando|quando o usu/i.test(d.description + ' ' + (d.when_to_use || ''))) avisos.push('description deveria dizer "Use quando..." para o gatilho automático funcionar');
  const linhas = texto.split(/\r?\n/).length;

  if (opcoes.auto) {
    const base = path.basename(dir).replace(/^auto-/, '');
    if (nome !== 'auto-' + base) erros.push('skill automática deve ter name: auto-' + base);
    if (NUCLEO.includes(base) || RESERVADOS.includes(base) || NUCLEO.includes(nome)) erros.push('nome colide com skill do núcleo ou comando do Claude Code');
    const meta = d.metadata || {};
    if (typeof meta !== 'object' || meta.origem !== 'automatica') erros.push('metadata.origem: automatica é obrigatório');
    if (!meta.motivo) erros.push('metadata.motivo (qual tarefa repetida originou a skill) é obrigatório');
    for (const sec of ['Quando usar', 'Passos', 'Teste']) {
      if (!new RegExp('^##\\s*' + sec, 'im').test(fm.corpo)) erros.push('falta a seção "## ' + sec + '"');
    }
    if (d['allowed-tools']) {
      const ferr = (Array.isArray(d['allowed-tools']) ? d['allowed-tools'].join(' ') : String(d['allowed-tools'])).split(/[\s,]+/).filter(Boolean);
      const proibidas = ferr.filter((f) => !FERRAMENTAS_LIVRES.includes(f));
      if (proibidas.length) erros.push('skill automática não pode pré-aprovar ferramentas além de Read/Glob/Grep: ' + proibidas.join(', '));
    }
    if (d.hooks || /^hooks:/m.test(texto)) erros.push('skill automática não pode registrar hooks');
    if (/(^|\s)!`/.test(fm.corpo) || /^```!/m.test(fm.corpo)) erros.push('skill automática não pode usar injeção de comando (!`...`)');
    if (REDE.test(texto)) erros.push('skill automática não pode conter comandos de rede/envio');
    if (linhas > 300) erros.push('skill automática deve ter até 300 linhas (tem ' + linhas + ')');
    const sig = c.acharSigilo(fm.corpo.replace(/\[[^\]]*\]/g, '')).filter((x) => ['CPF', 'CNPJ', 'numero de processo (CNJ)', 'RG'].includes(x));
    if (sig.length) erros.push('contém dados pessoais (' + sig.join(', ') + '); use marcadores [CLIENTE], [CPF]');
    const urls = (texto.match(/https?:\/\/[^\s)]+/g) || []).filter((u) => !/\.(jus|gov|leg)\.br|planalto\.gov\.br/.test(u));
    if (urls.length) avisos.push('URLs externas: ' + urls.slice(0, 3).join(', '));
    if (opcoes.exigirTeste) {
      const t = path.join(dir, 'teste', 'resultado.md');
      if (!fs.existsSync(t)) erros.push('falta o ensaio (dry-run): teste/resultado.md');
      else if (!/RESULTADO:\s*APROVADO/i.test(fs.readFileSync(t, 'utf8'))) erros.push('o ensaio em teste/resultado.md não terminou com "RESULTADO: APROVADO"');
    }
    const refsRede = arquivosRefs(dir).filter((a) => REDE.test(fs.readFileSync(a, 'utf8')));
    if (refsRede.length) erros.push('references/ da skill automática contém comandos de rede/envio: ' + refsRede.map((a) => path.basename(a)).join(', '));
  } else if (linhas > 500) avisos.push('SKILL.md com mais de 500 linhas; mova detalhes para arquivos de apoio');
  for (const m of fm.corpo.matchAll(/\]\((references\/[^)\s#]+)\)/g)) if (!fs.existsSync(path.join(dir, m[1]))) erros.push('link para arquivo de apoio inexistente: ' + m[1]);
  return { ok: erros.length === 0, erros, avisos, nome };
}
function arquivosRefs(dir) {
  const out = []; const r = path.join(dir, 'references');
  const andar = (d) => { if (!fs.existsSync(d)) return; for (const n of fs.readdirSync(d)) { const a = path.join(d, n); if (fs.statSync(a).isDirectory()) andar(a); else out.push(a); } };
  andar(r); return out;
}
module.exports = { validarSkill, NUCLEO, RESERVADOS };
