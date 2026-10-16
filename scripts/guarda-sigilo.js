#!/usr/bin/env node
'use strict';
// Hook PreToolUse (Bash|PowerShell|WebFetch|WebSearch|mcp__.*): guarda de SIGILO PROFISSIONAL / LGPD.
// - Envio de dados para fora do computador (upload, POST, e-mail, git push, pastas de nuvem) => "ask":
//   o proprio advogado precisa confirmar na tela. Nada vai para a nuvem sem pedido explicito.
// - Busca/acesso web contendo CPF, CNPJ, numero de processo etc. => "deny".
// - Apagar pastas do ESCRITORIO em massa => "deny" (use _versoes, nunca apague).
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

function perguntar(motivo) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: '🔒 Sigilo profissional: ' + motivo + ' Só confirme se VOCÊ pediu isso.' } };
}
function negar(motivo) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: '🔒 ' + motivo } };
}

c.rodarHook('guarda-sigilo', (ent) => {
  const nome = ent.tool_name || '';
  const inp = ent.tool_input || {};
  const cfg = c.config();

  if (nome === 'Bash' || nome === 'PowerShell') {
    const cmd = String(inp.command || '');
    if (APAGAR_MASSA.test(cmd) && (cmd.includes('ESCRITORIO') || c.dentroDe(ent.cwd || '', cfg.escritorio))) {
      c.log('guardas', 'negado apagar-massa: ' + cmd.slice(0, 200));
      return negar('Apagar pastas inteiras do ESCRITORIO está bloqueado. Mova para CASOS/Arquivados ou para _versoes em vez de apagar.');
    }
    if (ENVIO.some((re) => re.test(cmd))) {
      c.log('guardas', 'ask envio: ' + cmd.slice(0, 200));
      return perguntar('este comando pode ENVIAR dados para fora do computador.');
    }
    if (NUVEM.test(cmd) && /\b(cp|copy|Copy-Item|robocopy|xcopy|mv|move|Move-Item|rsync)\b/i.test(cmd)) {
      return perguntar('este comando copia arquivos para uma pasta sincronizada com a nuvem.');
    }
    return {};
  }

  if (nome === 'WebSearch' || nome === 'WebFetch') {
    const texto = [inp.query, inp.url, inp.prompt].filter(Boolean).join(' ');
    const achados = c.acharSigilo(texto);
    if (achados.length) {
      c.log('guardas', nome + ' negado por dados pessoais: ' + achados.join(','));
      return negar('A pesquisa na internet continha dados pessoais/sigilosos (' + achados.join(', ') + '). Refaça a busca só com termos jurídicos genéricos (tese, artigo de lei, tribunal), sem nomes, CPF, CNPJ ou número de processo.');
    }
    return {};
  }

  if (/^mcp__/.test(nome) && /(send|post|upload|create|write|share|publish|email|message|draft|update|delete)/i.test(nome)) {
    return perguntar('a ferramenta externa "' + nome + '" pode enviar ou alterar dados fora do computador.');
  }
  return {};
});
