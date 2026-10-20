#!/usr/bin/env node
'use strict';
// Gera skills/primeira-execucao/ a partir de INSTALAR.md (fonte unica), com divulgacao progressiva:
// SKILL.md = cabecalho + regras + Etapa 0 + indice; o resto vai para references/*.md (lido so quando preciso).
// Uso: node ferramentas/sincronizar-bootstrap.js [--verificar]   (--verificar: sai 1 se estiver dessincronizado)
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const DIR = path.join(RAIZ, 'skills', 'primeira-execucao');
const MARCA = '<!-- GERADO de INSTALAR.md por ferramentas/sincronizar-bootstrap.js. Não edite aqui. -->';
const FRONT = [
  '---',
  'name: primeira-execucao',
  'description: "Instalação e configuração inicial do assistente no piloto automático. Use quando aparecer ONBOARDING PENDENTE ou PRIMEIRA EXECUÇÃO INCOMPLETA ou ao refazer a configuração."',
  'argument-hint: "[retomar | refazer]"',
  '---',
  '',
  MARCA,
  '> Se o assistente já está instalado, comece pela **Etapa 0** (ela pula o que já foi feito). Com o argumento `refazer`, rode antes `PE reiniciar`.',
  '',
].join('\n');
// Secoes "## " movidas para references/ (titulo comeca com a chave -> arquivo).
const MOVER = [
  [/^## Etapa 1\b/, 'etapa-1-instalacao.md'],
  [/^## Etapa [2-6]\b/, 'etapas-2-a-6.md'],
  [/^## Problemas comuns/, 'problemas-comuns.md'],
];
function secoes(txt) {
  const linhas = txt.split('\n'); const out = [{ titulo: '', linhas: [] }]; let cerca = false;
  for (const l of linhas) {
    if (/^\s*(```|~~~)/.test(l)) cerca = !cerca;
    if (!cerca && /^## /.test(l)) out.push({ titulo: l, linhas: [] });
    out[out.length - 1].linhas.push(l);
  }
  return out;
}
function gerar() {
  const fonte = fs.readFileSync(path.join(RAIZ, 'INSTALAR.md'), 'utf8');
  const arquivos = {}; const corpo = []; const indice = [];
  for (const s of secoes(fonte)) {
    const alvo = MOVER.find(([re]) => re.test(s.titulo));
    if (!alvo) { corpo.push(s.linhas.join('\n')); continue; }
    const nome = alvo[1];
    if (!arquivos[nome]) { arquivos[nome] = [MARCA, '']; indice.push([s.titulo.replace(/^## /, ''), nome]); } else indice.push([s.titulo.replace(/^## /, ''), nome]);
    arquivos[nome].push(s.linhas.join('\n').replace(/\n+$/, ''), '');
  }
  const idx = ['## Etapas seguintes (leia o arquivo de cada etapa quando chegar nela)', '',
    ...indice.map(([t, n]) => '- ' + t + ': [references/' + n + '](references/' + n + ')'), '',
    'Os blocos de comando citados (ps-*, sh-*) estão dentro desses arquivos; leia o arquivo inteiro da etapa antes de executá-la.', ''].join('\n');
  const skill = FRONT + corpo.join('\n').replace(/\n+$/, '') + '\n\n' + idx;
  const out = { 'SKILL.md': skill };
  for (const [n, l] of Object.entries(arquivos)) out['references/' + n] = l.join('\n').replace(/\n+$/, '') + '\n';
  return out;
}
const esperado = gerar();
if (process.argv.includes('--verificar')) {
  const ok = Object.entries(esperado).every(([n, c]) => { const f = path.join(DIR, n); return fs.existsSync(f) && fs.readFileSync(f, 'utf8') === c; });
  const refs = fs.existsSync(path.join(DIR, 'references')) ? fs.readdirSync(path.join(DIR, 'references')).map((n) => 'references/' + n) : [];
  const sobra = refs.filter((n) => !(n in esperado));
  const tudo = ok && !sobra.length;
  console.log(tudo ? 'primeira-execucao sincronizada com INSTALAR.md' : 'DESSINCRONIZADO: rode node ferramentas/sincronizar-bootstrap.js');
  process.exit(tudo ? 0 : 1);
}
fs.rmSync(path.join(DIR, 'references'), { recursive: true, force: true });
for (const [n, c] of Object.entries(esperado)) { const f = path.join(DIR, n); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, 'utf8'); console.log('Gerado: ' + path.relative(RAIZ, f)); }
