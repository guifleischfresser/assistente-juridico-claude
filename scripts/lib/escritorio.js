'use strict';
// Estrutura oficial do ESCRITORIO (fonte unica: o instalador e o SessionStart usam esta lista).
const fs = require('fs');
const path = require('path');
const { garantirDir } = require('./comum');

const PASTAS = [
  'CASOS/Ativos',
  'CASOS/Em an\u00e1lise',
  'CASOS/Arquivados',
  'PECAS/modelos',
  'PECAS/minhas-pecas/peticoes-iniciais',
  'PECAS/minhas-pecas/contestacoes',
  'PECAS/minhas-pecas/recursos',
  'PECAS/minhas-pecas/contratos',
  'PECAS/minhas-pecas/pareceres',
  'PECAS/minhas-pecas/outras',
  'ESTILO/amostras',
  'WIKI/raw',
  'WIKI/paginas/jurisprudencia',
  'WIKI/paginas/legislacao',
  'WIKI/paginas/doutrina',
  'WIKI/schema',
  'HANDOFFS',
  'MEMORIA',
  'EXPORTADOS',
  '_versoes',
];

/** Cria pastas que faltam e copia arquivos do modelo que nao existem (nunca sobrescreve). */
function garantirEscritorio(raiz, modelo) {
  const criados = [];
  for (const p of PASTAS) {
    const d = path.join(raiz, p);
    if (!fs.existsSync(d)) { garantirDir(d); criados.push(p + '/'); }
  }
  if (modelo && fs.existsSync(modelo)) copiarSemSobrescrever(modelo, raiz, raiz, criados);
  return criados;
}
function copiarSemSobrescrever(origem, destino, raiz, criados) {
  for (const nome of fs.readdirSync(origem)) {
    const o = path.join(origem, nome), d = path.join(destino, nome);
    if (fs.statSync(o).isDirectory()) { garantirDir(d); copiarSemSobrescrever(o, d, raiz, criados); }
    else if (!fs.existsSync(d)) { fs.copyFileSync(o, d); criados.push(path.relative(raiz, d)); }
  }
}
module.exports = { PASTAS, garantirEscritorio };
