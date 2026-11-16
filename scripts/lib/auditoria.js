'use strict';
/*
 * Auditoria LOCAL de skill/plugin de terceiros antes de instalar (Node puro, sem rede, sem dependencia).
 *  - Copia para a quarentena (~/.claude/advogado/quarentena/<id>/arquivos) e grava o relatorio com o
 *    SHA-256 de cada arquivo. Zip pelo lib/zip.js; recusa zip-slip, symlink, caminho absoluto, arquivo gigante.
 *  - NUNCA executa, importa ou da require em arquivo da skill auditada: tudo e lido como texto/bytes.
 *  - Heuristica: aponta o que merece atencao; nao garante seguranca.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./comum');
const { lerZip } = require('./zip');
const inj = require('./injecao');
const { NUCLEO, RESERVADOS } = require('./validar');

const LIMITE = { arquivo: 5 * 1024 * 1024, total: 50 * 1024 * 1024, arquivos: 500 };
const D = {
  get quarentena() { return path.join(c.P.base, 'quarentena'); },
  get terceiros() { return path.join(c.P.base, 'terceiros'); },
  get registro() { return path.join(c.P.base, 'terceiros', 'registro.json'); },
  get aposentadas() { return path.join(c.P.base, 'terceiros', 'aposentadas'); },
};
const AVISO = 'Esta auditoria é heurística: procura sinais conhecidos de risco, mas NÃO garante que a skill é segura. Na dúvida, não instale.';
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const agoraLocal = () => c.carimbo().replace('_', ' ').replace(/(\d{2})(\d{2})(\d{2})$/, '$1:$2:$3');

class Recusa extends Error {}

// ---------- entrada -> mapa caminho relativo -> Buffer ----------
function caminhoSeguro(nome) {
  const n = String(nome);
  if (!n || /^[\\/]/.test(n) || /^[a-z]:/i.test(n)) return false;
  return !n.split(/[\\/]+/).some((p) => p === '..');
}
function lerPasta(raiz) {
  const mapa = new Map(); let total = 0;
  const andar = (d, rel) => {
    for (const nome of fs.readdirSync(d).sort()) {
      const a = path.join(d, nome), r = rel ? rel + '/' + nome : nome;
      const st = fs.lstatSync(a);
      if (st.isSymbolicLink()) throw new Recusa('a pasta contém um atalho (symlink): ' + r + '. Atalhos podem apontar para arquivos fora da skill; não audito nem instalo.');
      if (st.isDirectory()) { andar(a, r); continue; }
      if (!st.isFile()) throw new Recusa('arquivo especial na pasta: ' + r);
      if (st.size > LIMITE.arquivo) throw new Recusa('arquivo grande demais (' + r + ', ' + Math.round(st.size / 1048576) + ' MB). Skill de verdade é texto pequeno.');
      total += st.size;
      if (total > LIMITE.total || mapa.size >= LIMITE.arquivos) throw new Recusa('a pasta é grande demais para ser uma skill (limite ' + LIMITE.arquivos + ' arquivos / 50 MB).');
      mapa.set(r, fs.readFileSync(a));
    }
  };
  andar(raiz, '');
  return mapa;
}
/** Le o diretorio central do zip so para conferir nomes, tipo (symlink) e tamanho declarado. */
function conferirZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Recusa('o arquivo .zip está corrompido ou não é um zip.');
  const total = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); let soma = 0;
  if (total > LIMITE.arquivos) throw new Recusa('o zip tem arquivos demais para ser uma skill.');
  for (let n = 0; n < total; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Recusa('o arquivo .zip está corrompido.');
    const sistema = buf.readUInt8(p + 5), tam = buf.readUInt32LE(p + 24), attr = buf.readUInt32LE(p + 38);
    const lenN = buf.readUInt16LE(p + 28), lenE = buf.readUInt16LE(p + 30), lenK = buf.readUInt16LE(p + 32);
    const nome = buf.slice(p + 46, p + 46 + lenN).toString('utf8');
    if (!caminhoSeguro(nome)) throw new Recusa('o zip tenta gravar fora da pasta (caminho "' + nome.slice(0, 80) + '"). É um truque conhecido (zip-slip); não abro.');
    if (sistema === 3 && ((attr >>> 16) & 0xF000) === 0xA000) throw new Recusa('o zip contém um atalho (symlink): ' + nome.slice(0, 80) + '. Não abro.');
    if (tam > LIMITE.arquivo) throw new Recusa('arquivo grande demais dentro do zip (' + nome.slice(0, 80) + ').');
    soma += tam; if (soma > LIMITE.total) throw new Recusa('o zip descompactado passaria de 50 MB.');
    p += 46 + lenN + lenE + lenK;
  }
}
function lerZipSeguro(arq) {
  const buf = fs.readFileSync(arq);
  if (buf.length > LIMITE.total) throw new Recusa('o .zip é grande demais para ser uma skill.');
  conferirZip(buf);
  let bruto;
  try { bruto = lerZip(buf); } catch (e) { throw new Recusa('não consegui abrir o .zip (' + e.message + ').'); }
  const mapa = new Map();
  for (const [nome, dados] of bruto) {
    if (/\/$/.test(nome)) continue;
    if (dados.length > LIMITE.arquivo) throw new Recusa('arquivo grande demais dentro do zip (' + nome.slice(0, 80) + ').');
    mapa.set(nome.replace(/\\/g, '/'), dados);
  }
  // zip com uma unica pasta no topo (minha-skill/SKILL.md): tira a pasta
  const topos = new Set(Array.from(mapa.keys()).map((n) => n.split('/')[0]));
  if (topos.size === 1 && Array.from(mapa.keys()).every((n) => n.includes('/'))) {
    const t = Array.from(topos)[0] + '/'; const m2 = new Map();
    for (const [n, d] of mapa) m2.set(n.slice(t.length), d);
    return { mapa: m2, pastaTopo: t.slice(0, -1) };
  }
  return { mapa, pastaTopo: null };
}

// ---------- checagens ----------
const TEXTO_EXT = /\.(md|markdown|txt|json|ya?ml|toml|js|mjs|cjs|ts|py|sh|bash|zsh|ps1|psm1|bat|cmd|vbs|rb|pl|php|html?|css|xml|csv|ini|cfg|conf|env)$/i;
const BINARIO_EXT = /\.(exe|dll|so|dylib|bin|msi|com|scr|jar|class|pyc|pyo|o|a|app|dmg|pkg|deb|rpm|apk|wasm|node)$/i;
const SCRIPT_EXT = /\.(js|mjs|cjs|ts|py|sh|bash|zsh|ps1|psm1|bat|cmd|vbs|rb|pl|php)$/i;
const R = '🔴', A = '🟡';

// [regex, gravidade, tipo, explicacao leiga]
const REGRAS_LINHA = [
  // permissoes (detectar, nunca sugerir)
  [/bypassPermissions|dangerously-skip-permissions|--permission-mode\s+bypass/i, R, 'permissões', 'pede para o Claude trabalhar sem pedir sua autorização (desliga as janelas de confirmação). Nenhuma skill precisa disso.'],
  [/["']?(defaultMode|permissions)["']?\s*[:=]|permissions\.allow|settings(\.local)?\.json/i, R, 'permissões', 'mexe nas configurações de permissão do Claude Code (o que ele pode fazer sem perguntar).'],
  // comandos perigosos
  [/\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r|Remove-Item\b[^\n]*-Recurse[^\n]*-Force|\brmdir\s+\/s/i, R, 'comando perigoso', 'apaga pastas inteiras sem perguntar (rm -rf ou equivalente).'],
  [/(^|[\s;&|`(])sudo\s|runas\s+\/user/i, R, 'comando perigoso', 'pede privilégio de administrador do computador (sudo).'],
  [/\b(curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\n|]*\|\s*(ba|z)?sh\b|\b(curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\n]*\|\s*(iex|Invoke-Expression)\b|(iex|Invoke-Expression)\s*\(\s*(New-Object|iwr|irm|Invoke-)/i, R, 'comando perigoso', 'baixa um programa da internet e executa na hora (curl | sh). É a forma clássica de instalar vírus.'],
  [/\beval\s*[(\s"'`$]|\bexec\s*\(|Invoke-Expression|\biex\s/i, R, 'comando perigoso', 'executa texto como se fosse programa (eval). Esconde o que realmente vai rodar.'],
  [/base64\s+(-d|--decode|-D)\b|FromBase64String|atob\s*\(|b64decode/i, R, 'comando perigoso', 'decodifica conteúdo escondido em base64 — costuma servir para disfarçar comandos.'],
  [/\b(powershell|pwsh)(\.exe)?\b[^\n]*\s-(e|ec|enc|encodedcommand)\b/i, R, 'comando perigoso', 'roda PowerShell com comando codificado (ilegível para quem lê).'],
  [/\bchmod\s+(-R\s+)?777\b|\bmkfs\b|\bdd\s+if=|>\s*\/dev\/sd|format\s+[a-z]:/i, R, 'comando perigoso', 'comando de sistema que pode estragar arquivos ou o disco.'],
  // leitura de credenciais / dados do escritorio
  [/~\/\.ssh|\.ssh\/|id_rsa|id_ed25519|authorized_keys|known_hosts/i, R, 'dados sensíveis', 'lê as chaves de acesso (SSH) do computador.'],
  [/(^|[\s"'`/\\(])\.env(\.[a-z]+)?\b|dotenv/i, R, 'dados sensíveis', 'lê arquivos .env, onde ficam senhas e chaves de sistemas.'],
  [/credentials?(\.json)?\b|\.aws\/|\.netrc|\.npmrc|\.pypirc|keychain|Login Data|cookies\.sqlite|\bsenhas?\.(txt|xlsx|csv)|api[_-]?key|access[_-]?token|client[_-]?secret/i, R, 'dados sensíveis', 'procura senhas, chaves de API ou credenciais salvas.'],
  [/\bCASOS[\\/]|_anonimizacao|_consentimento[\\/]|ESCRITORIO[\\/]/i, R, 'dados de clientes', 'lê as pastas de casos do escritório ou a tabela da anonimização (dados de clientes).'],
  // rede
  [/\b(curl|wget|scp|sftp|rsync|rclone|nc|ncat|Invoke-WebRequest|Invoke-RestMethod|Send-MailMessage|Net\.WebClient|urllib|requests\.(get|post)|http\.request|https\.request|smtplib)\b|\bfetch\s*\(/i, A, 'rede', 'acessa a internet ou envia dados para fora do computador.'],
  [/\bWebFetch\b|\bWebSearch\b/, A, 'rede', 'pede ao Claude para abrir páginas da internet (WebFetch/WebSearch).'],
  [/\bmcp__|\bmcpServers\b|\.mcp\.json|\bMCP server/i, A, 'rede', 'usa ou instala um servidor MCP (conector externo que pode ler e enviar dados).'],
  [/https?:\/\/[^\s)"'>\]]+/i, A, 'rede', 'cita um endereço de internet. Confira se é só referência ou se a skill manda baixar/enviar algo.'],
  // hooks e injecao de comando
  [/^\s*["']?hooks["']?\s*:/i, R, 'hooks', 'registra "hooks": comandos que rodam sozinhos, sem você pedir, a cada ação do Claude.'],
  [/(^|\s)!`[^`]+`|^```!/, A, 'comando automático', 'roda um comando automaticamente quando a skill é carregada (!`...`).'],
];

function tipoNome(rel) { return path.basename(rel).toLowerCase(); }
function ehBinario(buf) { return buf.slice(0, 8000).includes(0); }

function checarArquivo(rel, buf, achados) {
  const add = (linha, grav, tipo, explicacao, trecho) => achados.push({ arquivo: rel, linha, gravidade: grav, tipo, explicacao, trecho: trecho ? String(trecho).replace(/\s+/g, ' ').trim().slice(0, 100) : '' });
  const nome = tipoNome(rel);
  if (BINARIO_EXT.test(rel) || (!TEXTO_EXT.test(rel) && ehBinario(buf) && !/\.(png|jpe?g|gif|webp|svg|ico|pdf|docx|xlsx|pptx|ttf|otf|woff2?)$/i.test(rel))) {
    add(0, R, 'binário', 'programa compilado ou arquivo binário embutido. Não dá para ler o que ele faz; skill de texto não precisa disso.');
    return;
  }
  if (!TEXTO_EXT.test(rel) && ehBinario(buf)) { add(0, A, 'arquivo de apoio', 'arquivo não-texto (imagem/documento). Não foi analisado por dentro.'); return; }
  if (SCRIPT_EXT.test(rel)) add(0, A, 'script', 'script embutido. Eu não executei; se a skill mandar rodar, o Claude Code vai pedir sua permissão — leia antes de aceitar.');
  if (nome === 'hooks.json' || /(^|\/)hooks\//.test(rel)) add(0, R, 'hooks', 'arquivo de "hooks": comandos que rodam sozinhos, sem você pedir, a cada ação do Claude.');
  if (/^settings(\.local)?\.json$/.test(nome)) add(0, R, 'permissões', 'traz um settings.json, que pode trocar as permissões e os hooks do seu Claude Code.');
  if (nome === '.mcp.json') add(0, A, 'rede', 'instala um servidor MCP (conector externo).');

  const texto = buf.toString('utf8');
  // texto oculto: caracteres invisiveis por linha; HTML/CSS que esconde (arquivo inteiro)
  const linhas = texto.split(/\r?\n/);
  linhas.forEach((l, i) => {
    const sem = i === 0 ? l.replace(/^﻿/, '') : l;
    const inv = inj.detectarInvisiveis(sem);
    if (inv.length) add(i + 1, R, 'texto oculto', 'tem ' + inv[0] + '. Caracteres invisíveis servem para esconder instruções de quem lê.', '');
    const cssOc = inj.ocultoNoTexto(sem).filter((o) => o.texto);
    if (cssOc.length) add(i + 1, R, 'texto oculto', 'texto escondido (' + cssOc[0].motivo + '): aparece para o Claude, mas não para você.', cssOc[0].texto);
    for (const s of inj.detectarInjecao(sem)) add(i + 1, A, 'instrução suspeita', 'frase típica de "prompt injection" (tenta mudar as regras do assistente ou esconder algo de você).', s);
    for (const [re, grav, tipo, expl] of REGRAS_LINHA) {
      const m = sem.match(re);
      if (!m) continue;
      if (tipo === 'rede' && /^https?:/.test(m[0]) && achados.some((x) => x.arquivo === rel && x.linha === i + 1 && x.tipo === 'rede')) continue;
      add(i + 1, grav, tipo, expl, sem.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30));
    }
  });

  if (nome === 'skill.md') {
    const fm = c.lerFrontmatter(texto);
    const d = fm.dados || {};
    const ferr = d['allowed-tools'] ? (Array.isArray(d['allowed-tools']) ? d['allowed-tools'].join(' ') : String(d['allowed-tools'])) : '';
    const ln = Math.max(1, linhas.findIndex((l) => /^allowed-tools\s*:/i.test(l)) + 1);
    if (ferr) {
      if (/(^|[\s,])(Bash|PowerShell)(\(\s*\*?\s*\))?(?=[\s,]|$)|(^|[\s,])\*(?=[\s,]|$)/.test(ferr))
        add(ln, R, 'permissões', 'pré-autoriza o terminal inteiro (allowed-tools: ' + ferr.slice(0, 60) + '): a skill rodaria qualquer comando sem pedir sua permissão.', ferr);
      else if (/\b(Bash|PowerShell|Write|Edit|MultiEdit|NotebookEdit|WebFetch|WebSearch|mcp__)/.test(ferr))
        add(ln, A, 'permissões', 'pré-autoriza ferramentas que gravam arquivos, rodam comandos ou acessam a internet sem perguntar (allowed-tools: ' + ferr.slice(0, 60) + ').', ferr);
    }
    if (d.hooks && !achados.some((x) => x.arquivo === rel && x.tipo === 'hooks')) add(1, R, 'hooks', 'registra "hooks" no cabeçalho: comandos que rodam sozinhos a cada ação do Claude.');
  }
}

function nomeDaSkill(mapa, pastaTopo, origem) {
  const sk = mapa.get('SKILL.md');
  const d = sk ? (c.lerFrontmatter(sk.toString('utf8')).dados || {}) : {};
  const bruto = d.name || pastaTopo || origem || 'skill-terceiro';
  return String(bruto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'skill-terceiro';
}
function colide(nome) { return NUCLEO.includes(nome) || RESERVADOS.includes(nome) || /^auto-/.test(nome); }

function analisar(mapa, nome) {
  const achados = [];
  if (!mapa.has('SKILL.md')) achados.push({ arquivo: '(raiz)', linha: 0, gravidade: A, tipo: 'estrutura', explicacao: 'não há SKILL.md na raiz: isto não é uma skill pronta (pode ser plugin ou outra coisa). Eu só sei instalar skill.', trecho: '' });
  for (const [rel, buf] of mapa) checarArquivo(rel, buf, achados);
  if (colide(nome)) achados.push({ arquivo: 'SKILL.md', linha: 1, gravidade: A, tipo: 'nome', explicacao: 'o nome "' + nome + '" é de uma skill do assistente, de um atalho automático (auto-*) ou de um comando do Claude Code. Se instalar, ela recebe outro nome.', trecho: '' });
  const ordem = { [R]: 0, [A]: 1 };
  achados.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade] || a.arquivo.localeCompare(b.arquivo) || a.linha - b.linha);
  const veredito = achados.some((x) => x.gravidade === R) ? R : achados.length ? A : '🟢';
  return { achados, veredito };
}

// ---------- operacoes ----------
function novoId() { return c.carimbo() + '-' + crypto.randomBytes(3).toString('hex'); }
const dirQ = (id) => path.join(D.quarentena, String(id).replace(/[^\w.-]/g, '_'));

/** auditar <pasta|SKILL.md|.zip> ou texto colado ({ texto }). */
function auditar(entrada) {
  let mapa, pastaTopo = null, tipo, origem;
  if (entrada && typeof entrada === 'object' && entrada.texto != null) {
    tipo = 'texto colado'; origem = 'texto colado';
    mapa = new Map([['SKILL.md', Buffer.from(String(entrada.texto), 'utf8')]]);
  } else {
    const alvo = path.resolve(String(entrada || ''));
    if (!entrada || !fs.existsSync(alvo)) throw new Recusa('não achei "' + (entrada || '') + '". Passe o caminho da pasta da skill, do SKILL.md ou do .zip (não baixo nada da internet).');
    if (/^https?:\/\//i.test(String(entrada))) throw new Recusa('não baixo nada da internet. Baixe o arquivo você mesmo e me passe o caminho.');
    const st = fs.lstatSync(alvo);
    if (st.isSymbolicLink()) throw new Recusa('o caminho é um atalho (symlink). Passe a pasta ou o arquivo de verdade.');
    origem = path.basename(alvo);
    if (st.isDirectory()) { tipo = 'pasta'; mapa = lerPasta(alvo); pastaTopo = origem; }
    else if (/\.zip$/i.test(alvo)) { tipo = 'zip'; const z = lerZipSeguro(alvo); mapa = z.mapa; pastaTopo = z.pastaTopo || origem.replace(/\.zip$/i, ''); }
    else if (/\.md$/i.test(alvo)) { if (st.size > LIMITE.arquivo) throw new Recusa('arquivo grande demais.'); tipo = 'arquivo'; mapa = new Map([['SKILL.md', fs.readFileSync(alvo)]]); pastaTopo = path.basename(path.dirname(alvo)); }
    else throw new Recusa('formato não suportado: passe uma pasta, um SKILL.md ou um .zip.');
  }
  if (!mapa.size) throw new Recusa('não há arquivos para auditar.');
  for (const n of mapa.keys()) if (!caminhoSeguro(n)) throw new Recusa('caminho inválido: ' + n);
  const nome = nomeDaSkill(mapa, pastaTopo, origem);
  const { achados, veredito } = analisar(mapa, nome);
  const id = novoId();
  const q = dirQ(id), arqs = path.join(q, 'arquivos');
  const arquivos = [];
  for (const [rel, buf] of mapa) {
    const destino = path.join(arqs, ...rel.split('/'));
    if (!c.dentroDe(destino, arqs)) throw new Recusa('caminho inválido: ' + rel);
    c.garantirDir(path.dirname(destino));
    fs.writeFileSync(destino, buf);
    arquivos.push({ caminho: rel, bytes: buf.length, sha256: sha(buf) });
  }
  const rel = { id, nome, origem, tipo, data: agoraLocal(), veredito, arquivos, achados, aviso: AVISO, estado: 'em quarentena' };
  c.gravarJSON(path.join(q, 'relatorio.json'), rel);
  fs.writeFileSync(path.join(q, 'RELATORIO.md'), relatorioTexto(rel) + '\n', 'utf8');
  return rel;
}

const FRASE = { '🟢': 'não achei sinal de risco conhecido', '🟡': 'tem pontos que merecem sua atenção antes de instalar', '🔴': 'tem sinais de risco sério — NÃO recomendo instalar' };
function relatorioTexto(rel) {
  const L = ['Auditoria da skill "' + rel.nome + '" (' + rel.tipo + ': ' + rel.origem + ') — ' + rel.data, '', 'Veredito: ' + rel.veredito + ' ' + FRASE[rel.veredito] + '.', ''];
  if (rel.achados.length) {
    L.push('O que encontrei (' + rel.achados.length + '):');
    for (const a of rel.achados) L.push('- ' + a.gravidade + ' ' + a.arquivo + (a.linha ? ':' + a.linha : '') + ' [' + a.tipo + '] ' + a.explicacao + (a.trecho ? ' Trecho: "' + a.trecho + '"' : ''));
  } else L.push('Nenhum achado.');
  L.push('', 'Arquivos (' + rel.arquivos.length + ') e impressão digital SHA-256:');
  for (const f of rel.arquivos) L.push('- ' + f.caminho + ' (' + f.bytes + ' bytes) ' + f.sha256);
  L.push('', 'Quarentena: ' + rel.id + '. Nenhum arquivo da skill foi executado.', '⚠️ ' + AVISO);
  if (rel.veredito === '🔴') L.push('Não vou instalar esta skill.');
  else L.push('Para instalar, depois de ler este relatório: instalar ' + rel.id + ' --confirmo');
  return L.join('\n');
}

function lerRelatorio(id) {
  const r = c.lerJSON(path.join(dirQ(id), 'relatorio.json'), null);
  if (!r) throw new Recusa('não achei a auditoria "' + id + '" na quarentena. Use "listar" para ver as que existem.');
  return r;
}
function hashesAtuais(id) {
  const arqs = path.join(dirQ(id), 'arquivos');
  if (!fs.existsSync(arqs)) return new Map();
  const m = lerPasta(arqs); const out = new Map();
  for (const [rel, buf] of m) out.set(rel, sha(buf));
  return out;
}
const lerRegistro = () => { const r = c.lerJSON(D.registro, { skills: {} }) || { skills: {} }; r.skills = r.skills || {}; return r; };

function nomeLivre(base) {
  let n = colide(base) ? base.replace(/^auto-/, '') + '-terceiro' : base;
  if (colide(n)) n = 'terceiro-' + n;
  let k = 2; const raiz = n;
  while (fs.existsSync(path.join(c.P.skillsVivas, n)) || colide(n)) n = raiz + '-' + k++;
  return n;
}

/** instalar <id> --confirmo [--forcar]. Retorna { codigo, msg }. */
function instalar(id, op) {
  op = op || {};
  const rel = lerRelatorio(id);
  if (rel.estado === 'instalada') return { codigo: 2, msg: 'Esta auditoria já foi instalada como /' + rel.instaladaComo + '.' };
  if (rel.veredito === '🔴' && !op.forcar) return { codigo: 2, msg: '🔴 Não instalo: a auditoria achou sinais de risco sério.\n\n' + relatorioTexto(rel) };
  if (!op.confirmo) return { codigo: 2, msg: relatorioTexto(rel) + '\n\nAinda NÃO instalei. Leia o relatório acima; se quiser mesmo instalar, confirme com --confirmo.' };
  // confere os hashes de novo: mudou depois da auditoria => recusa
  let atuais;
  try { atuais = hashesAtuais(id); } catch (e) { return { codigo: 3, msg: '🛑 A quarentena mudou depois da auditoria (' + e.message + '). Não instalo; audite de novo.' }; }
  const esperado = new Map(rel.arquivos.map((f) => [f.caminho, f.sha256]));
  const dif = [];
  for (const [k, v] of esperado) if (atuais.get(k) !== v) dif.push(k);
  for (const k of atuais.keys()) if (!esperado.has(k)) dif.push(k);
  if (dif.length) return { codigo: 3, msg: '🛑 Arquivo(s) alterado(s) depois da auditoria: ' + dif.slice(0, 5).join(', ') + '. Não instalo; audite de novo.' };
  if (!esperado.has('SKILL.md')) return { codigo: 2, msg: 'Não há SKILL.md na raiz: eu só sei instalar skill (não plugin).' };
  const nome = nomeLivre(rel.nome);
  const destino = path.join(c.P.skillsVivas, nome);
  const origemArqs = path.join(dirQ(id), 'arquivos');
  for (const f of rel.arquivos) {
    const d = path.join(destino, ...f.caminho.split('/'));
    c.garantirDir(path.dirname(d));
    let buf = fs.readFileSync(path.join(origemArqs, ...f.caminho.split('/')));
    if (f.caminho === 'SKILL.md' && nome !== rel.nome) {
      const t = buf.toString('utf8');
      buf = Buffer.from(/^---\r?\n[\s\S]*?^name\s*:/m.test(t) ? t.replace(/^(name\s*:\s*).*$/m, '$1' + nome) : t, 'utf8');
    }
    fs.writeFileSync(d, buf);
  }
  const dataLocal = agoraLocal();
  const hashes = {}; for (const f of rel.arquivos) hashes[f.caminho] = f.sha256;
  const prov = require('./proveniencia');
  prov.registrar(nome, 'instalada-terceiro', { origem: 'terceiro', fonte: rel.origem, tipoFonte: rel.tipo, dataLocal, veredito: rel.veredito, auditoria: rel.id, hashes, forcada: !!(op.forcar && rel.veredito === '🔴'), nomeOriginal: rel.nome });
  const reg = lerRegistro();
  reg.skills[nome] = { origem: 'terceiro', fonte: rel.origem, tipoFonte: rel.tipo, instaladaEm: dataLocal, veredito: rel.veredito, auditoria: rel.id, hashes, nomeOriginal: rel.nome };
  c.gravarJSON(D.registro, reg);
  rel.estado = 'instalada'; rel.instaladaComo = nome; rel.instaladaEm = dataLocal;
  c.gravarJSON(path.join(dirQ(id), 'relatorio.json'), rel);
  return { codigo: 0, nome, msg: '✅ Instalei a skill como /' + nome + (nome !== rel.nome ? ' (o nome "' + rel.nome + '" já estava em uso)' : '') + '. Veredito da auditoria: ' + rel.veredito + '. Procedência registrada (origem, data, impressões digitais). Para tirar: remover ' + nome + '.\n⚠️ ' + AVISO };
}

function listar() {
  const q = [];
  if (fs.existsSync(D.quarentena)) for (const id of fs.readdirSync(D.quarentena).sort()) {
    if (id.startsWith('_')) continue;
    const r = c.lerJSON(path.join(D.quarentena, id, 'relatorio.json'), null);
    if (r) q.push({ id: r.id, nome: r.nome, veredito: r.veredito, data: r.data, estado: r.estado, instaladaComo: r.instaladaComo || null });
  }
  return { quarentena: q, instaladas: lerRegistro().skills };
}

function remover(nome) {
  const reg = lerRegistro();
  if (!reg.skills[nome]) throw new Recusa('"' + nome + '" não é uma skill de terceiro instalada por aqui. Não mexo em skills do assistente nem nas que você escreveu.');
  const atual = path.join(c.P.skillsVivas, nome);
  const destino = path.join(D.aposentadas, nome + '-' + c.carimbo());
  c.garantirDir(D.aposentadas);
  if (fs.existsSync(atual)) fs.renameSync(atual, destino);
  const dados = reg.skills[nome]; delete reg.skills[nome];
  reg.aposentadas = reg.aposentadas || []; reg.aposentadas.push(Object.assign({ nome, removidaEm: agoraLocal(), pasta: path.basename(destino) }, dados));
  c.gravarJSON(D.registro, reg);
  require('./proveniencia').registrar(nome, 'removida-terceiro', { origem: 'terceiro', dataLocal: agoraLocal() });
  return destino;
}

function descartar(id) {
  lerRelatorio(id);
  const destino = path.join(D.quarentena, '_descartadas', path.basename(dirQ(id)));
  c.garantirDir(path.dirname(destino));
  fs.renameSync(dirQ(id), destino);
  return destino;
}

module.exports = { auditar, instalar, listar, remover, descartar, relatorioTexto, lerRelatorio, analisar, caminhoSeguro, Recusa, AVISO, D, LIMITE };
