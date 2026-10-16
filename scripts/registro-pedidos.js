#!/usr/bin/env node
'use strict';
// Hook UserPromptSubmit: detector de TAREFAS REPETIDAS (gatilho da criacao automatica de skills).
// Privacidade: o texto do pedido NAO e guardado. Guardamos so radicais de palavras comuns, sem
// numeros e sem palavras com inicial maiuscula (provaveis nomes de pessoas/empresas).
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');

const PARADAS = new Set(('para pelo pela pelos pelas como mais menos muito muita esse essa este esta isso isto aquele aquela aqui agora ' +
  'voce voces fazer faca favor porfavor quero queria preciso precisa poderia pode podes gostaria ajuda ajude sobre entre depois antes ' +
  'tambem ainda sempre nunca todo toda todos todas cada qual quais quando onde porque pois entao assim minha meu meus minhas nosso nossa ' +
  'dele dela deles delas numa num uma umas uns com sem que dos das nos nas aos ate obrigado obrigada oi ola bom boa dia tarde noite ' +
  'claude assistente arquivo arquivos pasta documento').split(/\s+/));

function semAcento(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function radical(p) {
  p = p.replace(/(coes|cao|mente|idades|idade|ismos|ismo|istas|ista|veis|vel|ados|adas|ado|ada|idos|idas|ido|ida|ar|er|ir|es|s)$/, '');
  return p.slice(0, 7);
}
function assinatura(texto) {
  const palavras = String(texto).split(/\s+/);
  const out = new Set();
  palavras.forEach((w, i) => {
    const limpo = w.replace(/[^\p{L}]/gu, '');
    if (!limpo || /\d/.test(w)) return;
    if (i > 0 && /^\p{Lu}/u.test(limpo) && !/^\p{Lu}+$/u.test(limpo)) return; // provavel nome proprio
    const n = semAcento(limpo.toLowerCase());
    if (n.length < 4 || PARADAS.has(n)) return;
    out.add(radical(n));
  });
  return Array.from(out).slice(0, 10).sort();
}
function jaccard(a, b) { const A = new Set(a), B = new Set(b); let i = 0; A.forEach((x) => { if (B.has(x)) i++; }); return i / (A.size + B.size - i || 1); }

function descricoesSkills() {
  const lista = [];
  try {
    for (const n of fs.readdirSync(c.P.skillsVivas)) {
      const f = path.join(c.P.skillsVivas, n, 'SKILL.md');
      if (!fs.existsSync(f)) continue;
      const d = c.lerFrontmatter(fs.readFileSync(f, 'utf8')).dados;
      lista.push({ nome: n, k: assinatura((d.description || '') + ' ' + (d.when_to_use || '')) });
    }
  } catch (e) { /* ignora */ }
  return lista;
}

function principal() { c.rodarHook('registro-pedidos', (ent) => {
  const prompt = String(ent.prompt || '').trim();
  if (!prompt || prompt.startsWith('/') || prompt.length < 15) return {};
  const k = assinatura(prompt);
  if (k.length < 3) return {};
  const cfg = c.config();
  const arq = path.join(c.P.estado, 'pedidos.jsonl');
  const limite = Date.now() - 30 * 864e5;
  let hist = [];
  try { hist = fs.readFileSync(arq, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.ts > limite); } catch (e) { /* novo */ }
  const parecidos = hist.filter((x) => jaccard(x.k, k) >= 0.5);
  hist.push({ ts: Date.now(), k });
  c.garantirDir(c.P.estado);
  fs.writeFileSync(arq, hist.slice(-400).map((x) => JSON.stringify(x)).join('\n') + '\n', 'utf8');

  if (parecidos.length + 1 < cfg.limites.repeticoesParaSugerir) return {};
  const cobertura = descricoesSkills().find((s) => jaccard(s.k, k) >= 0.34);
  if (cobertura) return {};
  const arqC = path.join(c.P.hab, 'candidatas.json');
  const cand = c.lerJSON(arqC, []);
  if (cand.some((x) => jaccard(x.k, k) >= 0.5 && x.status !== 'descartada')) {
    const x = cand.find((y) => jaccard(y.k, k) >= 0.5); x.ocorrencias = parecidos.length + 1; x.ultima = c.hojeISO(); c.gravarJSON(arqC, cand);
    return {};
  }
  const id = 'c' + Date.now().toString(36);
  cand.push({ id, k, assinatura: k.join(' '), ocorrencias: parecidos.length + 1, primeira: c.hojeISO(), ultima: c.hojeISO(), status: 'sugerida' });
  c.gravarJSON(arqC, cand);
  return { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext:
    'Detector de tarefas repetidas: pedidos com estes termos já apareceram ' + (parecidos.length + 1) + ' vezes em 30 dias (' + k.join(', ') + '), e nenhuma skill existente cobre o assunto. Candidata registrada com id ' + id + '. Depois de atender este pedido, aplique a skill criar-skill-automatica para transformar o procedimento em habilidade (sem pedir aprovação; siga as salvaguardas e informe o usuário em uma linha ao final).' } };
}); }
if (require.main === module) principal();
module.exports = { assinatura, jaccard };
