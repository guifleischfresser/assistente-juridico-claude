#!/usr/bin/env node
'use strict';
/*
 * Gera o pacote de release em dist/:
 *   advogado-claude-mod.zip (+ .sha256)          nome fixo -> releases/latest/download funciona sempre
 *   advogado-claude-mod-v<versao>.zip (+ .sha256) copia com versao no nome
 *   SHA256SUMS.txt, NOTAS.md
 * O zip contem a pasta advogado-claude-mod/ com o mod (sem .github, dist, ferramentas, .git).
 * Uso: node ferramentas/empacotar.js [--fixar] [--tag v0.2.0] [--saida dist]
 *   --fixar  grava release/estavel.json {versao, tag, arquivo, sha256}. Esse arquivo fica FORA do zip
 *            (sem dependencia circular) e e o que o INSTALAR.md usa para baixar a release pela tag
 *            exata e conferir o hash esperado. Rode, faca commit do estavel.json e so entao crie a tag.
 *   --tag    falha se a tag nao corresponder a VERSAO, se houver placeholders, ou se o zip
 *            reconstruido nao tiver exatamente o SHA256 fixado em release/estavel.json.
 * Reprodutivel: lista de arquivos do git (rastreados + nao ignorados), ordem fixa, data fixa,
 * entradas sem compressao (STORE) -> mesmo SHA256 em qualquer maquina/versao do Node.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const RAIZ = path.resolve(__dirname, '..');
const { criarZip } = require(path.join(RAIZ, 'scripts', 'lib', 'zip.js'));
const { VERSAO } = require(path.join(RAIZ, 'scripts', 'lib', 'comum.js'));
const { spawnSync } = require('child_process');
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const tag = opt('--tag');
const saida = path.resolve(RAIZ, opt('--saida') || 'dist');
if (tag && tag.replace(/^v/, '') !== VERSAO) { console.error('ERRO: tag ' + tag + ' difere da VERSAO do código (' + VERSAO + '). Atualize scripts/lib/comum.js e .claude-plugin/plugin.json.'); process.exit(1); }
const plugin = JSON.parse(fs.readFileSync(path.join(RAIZ, '.claude-plugin', 'plugin.json'), 'utf8'));
if (plugin.version !== VERSAO) { console.error('ERRO: plugin.json version ' + plugin.version + ' != ' + VERSAO); process.exit(1); }

const EXCLUIR = /^(\.git|\.github|\.gitignore|\.gitattributes|dist|ferramentas|release|node_modules|\.DS_Store|.*\.tmp-\d+|.*~)$/;
const EXEC = /\.(sh|command)$/;
const arquivos = [];
const add = (p, r) => { const st = fs.statSync(p); arquivos.push({ nome: 'advogado-claude-mod/' + r, dados: fs.readFileSync(p), modo: (EXEC.test(r) || (st.mode & 0o111)) ? 0o755 : 0o644 }); };
const git = fs.existsSync(path.join(RAIZ, '.git')) ? spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: RAIZ, encoding: 'utf8' }) : null;
if (git && git.status === 0 && git.stdout) {
  [...new Set(git.stdout.split('\0').filter(Boolean))].sort()
    .filter((r) => !r.split('/').some((seg) => EXCLUIR.test(seg)) && fs.existsSync(path.join(RAIZ, r)) && fs.statSync(path.join(RAIZ, r)).isFile())
    .forEach((r) => add(path.join(RAIZ, r), r));
} else {
  (function andar(dir, rel) {
    for (const n of fs.readdirSync(dir).sort()) {
      if (EXCLUIR.test(n)) continue;
      const p = path.join(dir, n), r = rel ? rel + '/' + n : n;
      if (fs.statSync(p).isDirectory()) andar(p, r); else add(p, r);
    }
  })(RAIZ, '');
  arquivos.sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0));
}
const naoAscii = arquivos.filter((a) => /[^\x20-\x7e]/.test(a.nome));
if (naoAscii.length) { console.error('ERRO: nomes de arquivo não-ASCII quebram o Expand-Archive do PowerShell 5.1: ' + naoAscii.map((a) => a.nome).join(', ')); process.exit(1); }
const bomPs = arquivos.filter((a) => /\.(ps1|bat)$/.test(a.nome) && /[^\x00-\x7f]/.test(a.dados.toString('latin1')));
if (bomPs.length) { console.error('ERRO: .ps1/.bat devem ser ASCII (PowerShell 5.1): ' + bomPs.map((a) => a.nome).join(', ')); process.exit(1); }
const placeholders = arquivos.filter((a) => /\.(md)$/.test(a.nome) && a.dados.toString('utf8').includes('<OWNER>'));

fs.mkdirSync(saida, { recursive: true });
const zip = criarZip(arquivos, { data: new Date(Date.UTC(2026, 0, 1)), semCompressao: true });
const sha = crypto.createHash('sha256').update(zip).digest('hex');
const nomes = ['advogado-claude-mod.zip', 'advogado-claude-mod-v' + VERSAO + '.zip'];
for (const n of nomes) {
  fs.writeFileSync(path.join(saida, n), zip);
  fs.writeFileSync(path.join(saida, n + '.sha256'), sha + '  ' + n + '\n');
}
fs.writeFileSync(path.join(saida, 'SHA256SUMS.txt'), nomes.map((n) => sha + '  ' + n).join('\n') + '\n');
const notas = fs.readFileSync(path.join(RAIZ, 'CHANGELOG.md'), 'utf8').split(/\n(?=## )/).find((s) => s.startsWith('## ' + VERSAO)) || '## ' + VERSAO;
fs.writeFileSync(path.join(saida, 'NOTAS.md'), notas.trim() + '\n\n**SHA256** `' + sha + '`\n\nInstalação: veja o README (uma frase colada no Claude Code).\n');
console.log('Pacote v' + VERSAO + ': ' + arquivos.length + ' arquivos, ' + zip.length + ' bytes\nSHA256 ' + sha + '\nSaída: ' + saida);
if (placeholders.length) console.log('⚠️  Ainda há <OWNER>/<REPO> em: ' + placeholders.map((a) => a.nome.replace('advogado-claude-mod/', '')).join(', ') + ' (rode ferramentas/definir-repo.js antes de publicar)');
if (tag && placeholders.length) { console.error('ERRO: placeholders <OWNER>/<REPO> numa release com tag.'); process.exit(1); }
const ESTAVEL = path.join(RAIZ, 'release', 'estavel.json');
if (args.includes('--fixar')) {
  fs.mkdirSync(path.dirname(ESTAVEL), { recursive: true });
  fs.writeFileSync(ESTAVEL, JSON.stringify({ versao: VERSAO, tag: 'v' + VERSAO, arquivo: nomes[1], sha256: sha }, null, 2) + '\n');
  console.log('Fixado em release/estavel.json: v' + VERSAO + ' ' + sha + '\nFaça commit desse arquivo ANTES de criar a tag v' + VERSAO + '.');
}
if (tag) {
  let fx = null; try { fx = JSON.parse(fs.readFileSync(ESTAVEL, 'utf8')); } catch (e) { /* */ }
  if (!fx) { console.error('ERRO: release/estavel.json ausente. Rode empacotar.js --fixar e faça commit antes da tag.'); process.exit(1); }
  if (fx.tag !== tag || fx.versao !== VERSAO || fx.arquivo !== nomes[1]) { console.error('ERRO: release/estavel.json aponta ' + fx.tag + ' / ' + fx.arquivo + ', mas a tag é ' + tag + '.'); process.exit(1); }
  if (fx.sha256 !== sha) { console.error('ERRO: SHA256 reconstruído (' + sha + ') difere do fixado em release/estavel.json (' + fx.sha256 + '). O pacote não é reprodutível ou o estavel.json está desatualizado.'); process.exit(1); }
  console.log('✅ SHA256 confere com release/estavel.json (' + tag + ').');
}
