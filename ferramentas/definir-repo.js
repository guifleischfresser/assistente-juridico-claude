#!/usr/bin/env node
'use strict';
// Substitui os marcadores <OWNER>/<REPO> pelo repositorio real em todos os arquivos de texto.
// Uso: node ferramentas/definir-repo.js dono/repositorio [--simular]
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const alvo = process.argv[2] || '';
const m = alvo.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
if (!m) { console.error('Uso: node ferramentas/definir-repo.js dono/repositorio'); process.exit(1); }
const simular = process.argv.includes('--simular');
const TEXTO = /\.(md|json|js|yml|yaml|ps1|sh|txt)$/;
let total = 0;
(function andar(d) {
  for (const n of fs.readdirSync(d)) {
    if (['.git', 'dist', 'node_modules'].includes(n) || n === 'definir-repo.js' || n === 'empacotar.js') continue;
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) { andar(p); continue; }
    if (!TEXTO.test(n)) continue;
    const t = fs.readFileSync(p, 'utf8');
    if (!t.includes('<OWNER>') && !t.includes('<REPO>')) continue;
    const novo = t.split('<OWNER>/<REPO>').join(m[1] + '/' + m[2]).split('<OWNER>').join(m[1]).split('<REPO>').join(m[2]);
    total++; console.log((simular ? '(simulação) ' : '') + path.relative(RAIZ, p));
    if (!simular) fs.writeFileSync(p, novo, 'utf8');
  }
})(RAIZ);
console.log(total + ' arquivo(s) ' + (simular ? 'seriam alterados' : 'atualizados') + '. Depois rode: node ferramentas/sincronizar-bootstrap.js');
