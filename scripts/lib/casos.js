'use strict';
// Casos do escritorio e vinculo "uma conversa = um processo" (estado/sessoes-casos.json, local).
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const arqVinculos = () => path.join(c.P.estado, 'sessoes-casos.json');
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function listar(esc) {
  const raiz = path.join(esc || c.config().escritorio, 'CASOS'); const out = [];
  let fases = []; try { fases = fs.readdirSync(raiz, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch (e) { return out; }
  for (const f of fases) {
    let casos = []; try { casos = fs.readdirSync(path.join(raiz, f.name), { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.')); } catch (e) { continue; }
    for (const k of casos) out.push({ fase: f.name, nome: k.name, rel: f.name + '/' + k.name, pasta: path.join(raiz, f.name, k.name) });
  }
  return out;
}
/** Acha casos pelo nome (todas as palavras, sem acento) ou pelo numero do processo no DOSSIE. */
function buscar(termo, esc) {
  const todos = listar(esc); const t = semAcento(termo).trim();
  if (!t) return [];
  const exato = todos.filter((k) => semAcento(k.nome) === t || semAcento(k.rel) === t);
  if (exato.length) return exato;
  const pal = t.split(/[\s_\-/]+/).filter(Boolean);
  const porNome = todos.filter((k) => pal.every((p) => semAcento(k.rel).includes(p)));
  if (porNome.length) return porNome;
  const dig = t.replace(/\D/g, '');
  if (dig.length >= 7) return todos.filter((k) => { try { return fs.readFileSync(path.join(k.pasta, 'DOSSIE.md'), 'utf8').replace(/\D/g, '').includes(dig); } catch (e) { return false; } });
  return [];
}
/** Caso a que pertence um arquivo (CASOS/<fase>/<caso>/...). */
function casoDoArquivo(arquivo, esc) {
  const raiz = path.join(esc || c.config().escritorio, 'CASOS');
  if (!c.dentroDe(arquivo, raiz)) return null;
  const m = path.relative(path.resolve(raiz), path.resolve(String(arquivo))).split(/[\\/]/); // preserva maiusculas (Windows)
  return m.length > 2 ? m[0] + '/' + m[1] : null;
}
function lerVinculos() { return c.lerJSON(arqVinculos(), {}) || {}; }
function vincular(sessao, rel) {
  if (!sessao || !rel) return;
  const v = lerVinculos(); v[sessao] = { caso: rel, em: new Date().toISOString() };
  const chaves = Object.keys(v).sort((a, b) => String(v[b].em).localeCompare(String(v[a].em)));
  const out = {}; chaves.slice(0, 300).forEach((k) => { out[k] = v[k]; });
  c.gravarJSON(arqVinculos(), out);
}
function vinculado(sessao) { const v = lerVinculos()[sessao]; return v ? v.caso : null; }

module.exports = { listar, buscar, casoDoArquivo, vincular, vinculado, lerVinculos, semAcento, arqVinculos };
