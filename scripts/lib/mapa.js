'use strict';
// Pastas externas do advogado (registradas por apontamento, nunca copiadas).
// Fonte unica: config.json -> pastasExternas [{tipo, caminho, obs, nuvem, registradoEm}]
// Espelhos: ESCRITORIO/mapa-de-pastas.md (leitura humana) e settings.json permissions.additionalDirectories.
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const TIPOS = {
  'pecas-antigas': 'Peças/petições já escritas',
  modelos: 'Modelos (templates)',
  'casos-ativos': 'Pastas de casos em andamento',
  'documentos-clientes': 'Documentos de clientes',
  'amostras-estilo': 'Amostras de estilo (originais)',
  prazos: 'Controle de prazos / agenda',
  nuvem: 'Pasta sincronizada com a nuvem',
  outro: 'Outro',
};
const NUVEM = /OneDrive|Dropbox|Google Drive|GoogleDrive|My Drive|Meu Drive|iCloud|CloudStorage|Mobile Documents|Box Sync|pCloud|MEGA/i;

function lerCfg() { return c.lerJSON(c.P.config, {}) || {}; }
function listar() { return (lerCfg().pastasExternas || []).slice(); }
const mesmo = (a, b) => c.norm(path.resolve(a)) === c.norm(path.resolve(b));

function regraDir(p) { return p.replace(/\\/g, '/'); }

function sincronizarSettings(antes, depois) {
  const arq = path.join(c.P.claude, 'settings.json');
  const s = c.lerJSON(arq, null);
  if (!s) return false;
  s.permissions = s.permissions || {};
  const atual = new Set(s.permissions.additionalDirectories || []);
  for (const p of antes) atual.delete(regraDir(p));
  for (const p of depois) atual.add(regraDir(p));
  s.permissions.additionalDirectories = Array.from(atual);
  c.gravarJSON(arq, s);
  return true;
}

function escreverMapa(lista, esc) {
  esc = esc || c.config().escritorio;
  const linhas = [
    '# Mapa de pastas do escritório',
    '',
    '> Gerado por `primeira-execucao.js registrar`. **Estas pastas NÃO foram copiadas**: o assistente só aponta para elas e lê quando precisa.',
    '> Os originais são tratados como somente leitura (gravar nelas pede sua confirmação). Para mudar, peça ao assistente ou rode `primeira-execucao.js registrar/remover`.',
    '',
    '| Tipo | Caminho | Nuvem? | Observação | Registrado em |',
    '|---|---|---|---|---|',
  ];
  for (const p of lista) linhas.push('| ' + (TIPOS[p.tipo] || p.tipo) + ' | `' + p.caminho + '` | ' + (p.nuvem ? '⚠️ sim' : 'não') + ' | ' + (p.obs || '').replace(/\|/g, '/') + ' | ' + p.registradoEm + ' |');
  if (!lista.length) linhas.push('| — | (nenhuma pasta registrada ainda) | | | |');
  linhas.push('', '⚠️ Pastas na nuvem: os arquivos já são sincronizados pelo serviço de nuvem do escritório; o assistente não envia nada para lá nem de lá.', '');
  c.garantirDir(esc);
  fs.writeFileSync(path.join(esc, 'mapa-de-pastas.md'), linhas.join('\n'), 'utf8');
}

function gravarLista(lista) {
  const cfg = lerCfg();
  const antes = (cfg.pastasExternas || []).map((p) => p.caminho);
  cfg.pastasExternas = lista;
  c.gravarJSON(c.P.config, cfg);
  sincronizarSettings(antes, lista.map((p) => p.caminho));
  escreverMapa(lista, cfg.escritorio);
}

/** Registra (idempotente). Retorna {ok, novo, item, erro}. */
function registrar(tipo, caminho, obs) {
  if (!TIPOS[tipo]) return { ok: false, erro: 'tipo inválido. Use: ' + Object.keys(TIPOS).join(', ') };
  const abs = path.resolve(caminho);
  if (!fs.existsSync(abs)) return { ok: false, erro: 'caminho não existe: ' + abs };
  const dir = fs.statSync(abs).isDirectory() ? abs : path.dirname(abs);
  const esc = c.config().escritorio;
  if (c.dentroDe(dir, esc) || mesmo(dir, esc)) return { ok: false, erro: 'essa pasta já fica dentro do ESCRITORIO; não precisa registrar' };
  const lista = listar();
  const ja = lista.find((p) => mesmo(p.caminho, dir) && p.tipo === tipo);
  if (ja) { if (obs && ja.obs !== obs) { ja.obs = obs; gravarLista(lista); } else escreverMapa(lista, esc); return { ok: true, novo: false, item: ja }; }
  const item = { tipo, caminho: dir, obs: obs || '', nuvem: NUVEM.test(dir), registradoEm: c.hojeISO() };
  lista.push(item);
  gravarLista(lista);
  return { ok: true, novo: true, item };
}
function remover(caminho) {
  const lista = listar();
  const resto = lista.filter((p) => !mesmo(p.caminho, caminho));
  gravarLista(resto);
  return lista.length - resto.length;
}
/** Verdadeiro se o arquivo esta numa pasta externa registrada. */
function emPastaExterna(arq) {
  return listar().find((p) => c.dentroDe(arq, p.caminho) || mesmo(arq, p.caminho)) || null;
}
module.exports = { TIPOS, NUVEM, listar, registrar, remover, emPastaExterna, escreverMapa, sincronizarSettings };
