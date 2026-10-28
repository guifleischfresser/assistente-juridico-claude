#!/usr/bin/env node
'use strict';
// Hook PreToolUse (Bash|PowerShell|WebFetch|WebSearch|mcp__.*): guarda de SIGILO PROFISSIONAL / LGPD.
// - Envio de dados para fora do computador (upload, POST, e-mail, git push, pastas de nuvem) => "ask":
//   o proprio advogado precisa confirmar na tela. Nada vai para a nuvem sem pedido explicito.
// - Busca/acesso web contendo CPF, CNPJ, numero de processo etc. => "deny".
// - v0.5: toda busca/acesso web pergunta ao advogado, salvo sites que ele autorizou (julgados.js autorizar,
//   que tambem pergunta). verificacaoOnline: "nunca" desliga a internet de vez.
// - Apagar pastas do ESCRITORIO em massa => "deny" (use _versoes, nunca apague).
// - Anonimizacao (opt-in por caso): ler o ORIGINAL de caso anonimizado (Read, ou Grep que mostra trechos)
//   => "ask" (o advogado decide); a tabela com os dados reais (_anonimizacao/) => "deny" em Read/Grep/terminal.
const c = require('./lib/comum');

const ENVIO = [
  /\bcurl\b[^|;&]*\s(-T|--upload-file|-d|--data(-\w+)?|-F|--form|-X\s*(POST|PUT|PATCH)|--request\s*(POST|PUT|PATCH))\b/i,
  /\bwget\b[^|;&]*--(post|body)-(data|file)/i,
  /\b(scp|sftp|ftp|rsync|rclone|nc|ncat|netcat)\b/i,
  /\bgit\s+push\b/i,
  /\bgh\s+(gist|issue|pr|release)\s+create\b/i,
  /\b(aws\s+s3|gsutil|az\s+storage|azcopy)\b/i,
  /\b(Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b[^|;]*-(Method\s+(Post|Put|Patch)|InFile|Body)\b/i,
  /\bSend-MailMessage\b|\bsendmail\b|\bmailx?\s/i,
  /\bpython3?\b[^|;&]*(requests\.(post|put)|smtplib|ftplib)/i,
  /\bnode\b[^|;&]*(https?\.request|fetch\()/i,
];
const NUVEM = /(OneDrive|Google\s?Drive|GoogleDrive|My\s?Drive|Dropbox|iCloud|Mobile Documents|Box Sync|MEGA)/i;
const APAGAR_MASSA = /\b(rm\s+(-\w*r\w*f?|-\w*f\w*r)\b|rmdir\s+\/s|Remove-Item\b[^|;]*-Recurse|rd\s+\/s|del\s+\/s)/i;

const REPO_OFICIAL = /^https:\/\/(raw\.githubusercontent\.com\/guifleischfresser\/assistente-juridico-claude\/|github\.com\/guifleischfresser\/assistente-juridico-claude(\/|$))/i;
function perguntar(motivo) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: '🔒 Sigilo do cliente: ' + motivo + ' Só aperte Sim se foi VOCÊ que pediu isso.' } };
}
function negar(motivo) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: '🔒 ' + motivo } };
}

c.rodarHook('guarda-sigilo', (ent) => {
  const nome = ent.tool_name || '';
  const inp = ent.tool_input || {};
  const cfg = c.config();

  if (nome === 'Read' || nome === 'NotebookRead' || nome === 'Grep') {
    const an = require('./lib/anonimizar');
    const r = nome === 'Grep' ? an.avaliarBusca(inp, ent.cwd, cfg.escritorio) : an.avaliarLeitura(inp.file_path || inp.notebook_path, cfg.escritorio);
    if (!r) return {};
    c.log('guardas', nome + ' ' + r.decisao + ' (anonimização)');
    return r.decisao === 'deny' ? negar(r.motivo) : perguntar(r.motivo);
  }

  if (nome === 'Bash' || nome === 'PowerShell') {
    const cmd = String(inp.command || '');
    const tab = require('./lib/anonimizar').avaliarComando(cmd);
    if (tab) { c.log('guardas', 'negado acesso a tabela de anonimizacao'); return negar(tab.motivo); }
    if (APAGAR_MASSA.test(cmd) && (cmd.includes('ESCRITORIO') || c.dentroDe(ent.cwd || '', cfg.escritorio))) {
      c.log('guardas', 'negado apagar-massa: ' + cmd.slice(0, 200));
      return negar('Apagar pastas inteiras do ESCRITORIO está bloqueado. Mova para CASOS/Arquivados ou para _versoes em vez de apagar.');
    }
    if (/julgados\.js["']?\s+autorizar\b/.test(cmd)) {
      return perguntar('isto AUTORIZA o assistente a consultar sozinho, daqui em diante, os sites indicados (' + cmd.replace(/^.*autorizar\s+/, '').slice(0, 120) + ') para conferir julgados. Só o número do julgado vai na consulta.');
    }
    if (ENVIO.some((re) => re.test(cmd))) {
      c.log('guardas', 'ask envio: ' + cmd.slice(0, 200));
      return perguntar('isso pode mandar dados seus pra fora do computador.');
    }
    if (NUVEM.test(cmd) && /\b(cp|copy|Copy-Item|robocopy|xcopy|mv|move|Move-Item|rsync)\b/i.test(cmd)) {
      return perguntar('isso copia arquivos pra uma pasta que vai pra nuvem.');
    }
    return {};
  }

  if (nome === 'WebSearch' || nome === 'WebFetch') {
    const texto = [inp.query, inp.url, inp.prompt].filter(Boolean).join(' ');
    const jg = require('./lib/julgados');
    const pol = jg.politica();
    let achados = c.acharSigilo(texto);
    // numero CNJ de um julgado que o advogado pediu para conferir (julgados.js pedir) nao e dado do cliente
    if (achados.includes('numero de processo (CNJ)') && jg.cnjLiberados(texto)) achados = achados.filter((x) => x !== 'numero de processo (CNJ)');
    if (pol.modo === 'nunca') return negar('Consultas à internet estão desligadas neste escritório (verificacaoOnline: "nunca"). Trabalhe só com arquivos locais e marque [NÃO VERIFICADO] o que não puder conferir.');
    if (achados.length) {
      c.log('guardas', nome + ' negado por dados pessoais: ' + achados.join(','));
      return negar('A pesquisa na internet continha dados pessoais/sigilosos (' + achados.join(', ') + '). Refaça a busca só com termos jurídicos genéricos (tese, artigo de lei, tribunal), sem nomes, CPF, CNPJ ou número de processo.');
    }
    // Nada sai sem pedido explicito: so sites que o advogado autorizou passam direto; o resto pergunta na tela.
    if (nome === 'WebFetch' && jg.dominioAutorizado(inp.url, pol.fontes)) return {};
    // o proprio roteiro de instalacao/atualizacao do assistente (repositorio oficial) nao leva dado algum
    if (nome === 'WebFetch' && REPO_OFICIAL.test(String(inp.url || ''))) return {};
    if (nome === 'WebSearch' && pol.busca) return {};
    let dom = ''; try { dom = new URL(String(inp.url)).hostname; } catch (e) { dom = ''; }
    c.log('guardas', nome + ' pergunta: ' + (dom || String(inp.query || '').slice(0, 80)));
    return perguntar(nome === 'WebFetch' ? 'vou abrir o site ' + (dom || '(endereço)') + '. Só o endereço vai pra internet; nada dos seus arquivos.' : 'vou pesquisar na internet: "' + String(inp.query || '').slice(0, 120) + '".');
  }

  if (/^mcp__/.test(nome) && /(send|post|upload|create|write|share|publish|email|message|draft|update|delete)/i.test(nome)) {
    return perguntar('isso usa um serviço de fora (' + nome.replace(/^mcp__/, '').split('__')[0] + ') que pode mandar ou mudar coisas fora do computador.');
  }
  return {};
});
