#!/usr/bin/env node
'use strict';
/*
 * Manutencao periodica das HABILIDADES (skills) e da memoria: mantem tudo saudavel e ocupando
 * o minimo de contexto. Roda sozinha a cada 15 dias (gatilho no SessionStart) ou com /manutencao.
 * Tudo com backup, changelog e desfazer.
 *
 * Como o Claude Code carrega skills (code.claude.com/docs/en/skills, out/2026):
 *  - name + description (+ when_to_use) de cada skill ficam no contexto em TODA conversa (lista de
 *    skills; corte de 1.536 caracteres por skill; orcamento ~1% da janela). Skills com
 *    disable-model-invocation: true nao entram na lista.
 *  - o corpo do SKILL.md so entra quando a skill e invocada, e fica no contexto ate o fim da conversa.
 *  - arquivos de apoio (references/*.md) so entram quando o Claude os le.
 *  - skill movida para fora de ~/.claude/skills sai da lista.
 *
 * Uso: node manutencao.js medir [--pasta <dir>] [--json]
 *      node manutencao.js revisar [--simular] [--automatica] [--pasta <dir>] [--json]
 *      node manutencao.js desfazer [<carimbo>]
 *      node manutencao.js estado [--json]
 * Posse: so auto-* criadas pelo assistente sao mescladas/aposentadas/enxugadas. v0.6: sobreposicao que
 * envolve skill do nucleo ou do advogado vai so para o relatorio ("Atalhos parecidos — não mexi").
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const prov = require('./lib/proveniencia');
const { validarSkill, NUCLEO } = require('./lib/validar');

const PADRAO = { intervaloDias: 15, descricaoAlvo: 200, corpoAlvo: 2500, diasSemUso: 45, similaridade: 0.6, memoryLinhas: 200, memoryAlvo: 150, memoryBytes: 25 * 1024, claudeLinhas: 200, blocoLinhas: 60, claudeEscLinhas: 80, prefsItens: 80 };
function limites() { return Object.assign({}, PADRAO, (c.config().manutencao) || {}); }
const PROTEGIDO = /\b(nunca|jamais|proibid[oa]s?|não pode|nao pode|sigilo|lgpd|obrigat[óo]ri[oa]s?|inegoci[áa]ve(l|is))\b/i;
const DETALHE = /exemplo|modelo|template|formato|refer[êe]ncia|detalh|anexo|tabela|checklist|gloss[áa]rio|perguntas|dicas|casos especiais|observa|variante|hist[óo]rico|se falhar|depois de publicada/i;
const TOK = 3.5; // caracteres por token (estimativa conservadora para portugues)

function arqEstado() { return path.join(c.P.estado, 'revisao-skills.json'); }
function lerEstado() { return c.lerJSON(arqEstado(), {}) || {}; }
function agora() { return process.env.ADVOGADO_AGORA ? new Date(process.env.ADVOGADO_AGORA) : new Date(); }
function dias(a, b) { return (b - a) / 864e5; }
function ler(a) { try { return fs.readFileSync(a, 'utf8'); } catch (e) { return null; } }
function copiarDir(o, d) { c.garantirDir(d); for (const x of fs.readdirSync(o)) { const a = path.join(o, x), b = path.join(d, x); if (fs.statSync(a).isDirectory()) copiarDir(a, b); else fs.copyFileSync(a, b); } }
function removerDir(d) { if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true }); }
function moverDir(o, d) { c.garantirDir(path.dirname(d)); try { fs.renameSync(o, d); } catch (e) { copiarDir(o, d); removerDir(o); } }
function arquivosRec(d, base) { let r = []; for (const x of fs.existsSync(d) ? fs.readdirSync(d) : []) { const a = path.join(d, x); if (fs.statSync(a).isDirectory()) r = r.concat(arquivosRec(a, base || d)); else r.push(a); } return r; }

// ---------------------------------------------------------------- medicao
function infoSkill(dir) {
  const texto = ler(path.join(dir, 'SKILL.md'));
  if (texto == null) return null;
  const fm = c.lerFrontmatter(texto);
  const nome = fm.dados.name || path.basename(dir);
  const desc = String(fm.dados.description || '') + (fm.dados.when_to_use ? ' ' + fm.dados.when_to_use : '');
  const listada = String(fm.dados['disable-model-invocation'] || '') !== 'true';
  const refs = arquivosRec(path.join(dir, 'references'));
  return {
    nome, dir, texto, fm, desc, listada,
    auto: /^auto-/.test(path.basename(dir)), nucleo: NUCLEO.includes(path.basename(dir)),
    gerada: /<!-- GERADO/.test(fm.corpo),
    fixo: listada ? nome.length + 4 + Math.min(desc.length, 1536) : 0,
    corpo: fm.corpo.length,
    refs: refs.reduce((s, a) => s + fs.statSync(a).size, 0),
  };
}
function listarSkills(pasta) {
  const r = [];
  for (const n of fs.existsSync(pasta) ? fs.readdirSync(pasta).sort() : []) {
    if (n.startsWith('.') || n.startsWith('_')) continue;
    const i = infoSkill(path.join(pasta, n)); if (i) r.push(i);
  }
  return r;
}
function medir(pasta, filtro) {
  const sk = listarSkills(pasta).filter(filtro || (() => true));
  const fixo = sk.reduce((s, x) => s + x.fixo, 0), corpo = sk.reduce((s, x) => s + x.corpo, 0);
  return { skills: sk.map((x) => ({ nome: x.nome, listada: x.listada, descricao: x.desc.length, fixo: x.fixo, corpo: x.corpo, refs: x.refs })), total: sk.length, fixo, corpo, tokensFixo: Math.round(fixo / TOK), tokensCorpo: Math.round(corpo / TOK) };
}
const nossas = (x) => x.auto || x.nucleo;

// ---------------------------------------------------------------- descricao minima
const INICIO_CLAUSULA = /^(quando|ao|antes|depois|após|apos|se|o usuário|a usuária|digitar|aparecer|algo|sempre|houver|na|no|em|um|uma|para)\b/i;
function encurtarDescricao(desc, nome, alvo) {
  let d = String(desc).replace(/\s+/g, ' ').trim();
  if (d.length <= alvo) return d;
  d = d.replace(/\s*\([^()]*\)/g, '').replace(/\s+([,.;:])/g, '$1').replace(/\s+/g, ' ').trim();
  const frases = d.split(/(?<=[.!?])\s+(?=["“]?[A-ZÀ-Ú\u{1F300}-\u{1FAFF}\u2600-\u27BF])/u).map((f) => f.trim()).filter(Boolean);
  const iG = frases.findIndex((f) => /^(Use|Usar)\b/i.test(f));
  let oque = (iG > 0 ? frases.slice(0, iG) : [frases[0]]).join(' ');
  const gatFrase = iG >= 0 ? frases[iG] : '';
  const montar = (o, g) => (o + (g ? ' ' + g : '')).trim();
  if (montar(oque, gatFrase).length <= alvo) return montar(oque, gatFrase);
  oque = frases[0] === gatFrase ? '' : frases[0];
  if (montar(oque, gatFrase).length <= alvo || !gatFrase) return montar(oque, gatFrase).length <= alvo ? montar(oque, gatFrase) : cortarOque(oque, alvo);
  // clausulas do gatilho ("Use quando A, B ou C.")
  const pref = gatFrase.match(/^(?:Use|Usar)\s+(?:quando\s+)?/i)[0];
  const corpo = gatFrase.slice(pref.length).replace(/[.\s]+$/, '');
  const pedacos = corpo.split(/,\s+(?:ou\s+)?|\s+ou\s+/);
  const seps = corpo.match(/,\s+(?:ou\s+)?|\s+ou\s+/g) || [];
  const clausulas = [];
  pedacos.forEach((x, k) => { if (!clausulas.length || INICIO_CLAUSULA.test(x)) clausulas.push(x); else clausulas[clausulas.length - 1] += seps[k - 1] + x; });
  const prior = (x, k) => (k === 0 ? 3 : (x.includes('/' + nome) || /(^|\s)\/[a-z0-9][a-z0-9-]*/i.test(x)) ? 2 : /["“”]|\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}\b/.test(x) ? 1 : 0);
  let sel = clausulas.map((x, k) => ({ x, p: prior(x, k) }));
  const gat = () => pref + (sel.length > 1 ? sel.slice(0, -1).map((e) => e.x).join(', ') + ' ou ' + sel[sel.length - 1].x : sel[0].x) + '.';
  const cortar = (nivel) => { while (montar(oque, gat()).length > alvo) { const k = sel.map((e) => e.p).lastIndexOf(nivel); if (k < 0) break; sel.splice(k, 1); } };
  cortar(0);
  if (montar(oque, gat()).length > alvo) oque = cortarOque(oque, Math.max(25, alvo - gat().length - 1));
  cortar(1);
  // enumeracoes longas dentro de uma clausula: fica com os primeiros itens
  for (const e of sel) {
    const itens = e.x.split(/,\s+/);
    while (itens.length > 1 && montar(oque, gat()).length > alvo) { itens.pop(); e.x = itens.join(', ').replace(/\s+(ou|e)$/i, ''); }
  }
  cortar(2);
  const o2 = oque;
  return montar(o2, gat());
}
/** Corta a frase "o que faz" num limite natural (":", ",", " com ", " para "...) que caiba em max. */
function cortarOque(oque, max) {
  if (oque.length <= max) return oque;
  const re = /:\s|,\s|;\s|\s—\s|\s(?:com|para|a partir|apontando|inclusive|sem|e)\s/g; let m; let melhor = null;
  while ((m = re.exec(oque))) if (m.index >= 20 && m.index + 1 <= max) melhor = m.index;
  if (melhor == null) { const p0 = oque.indexOf(': '); if (p0 >= 15) melhor = p0; else { re.lastIndex = 0; while ((m = re.exec(oque))) if (m.index >= 20) { melhor = m.index; break; } } }
  if (melhor == null) return oque;
  const dp = oque.lastIndexOf(': ', melhor - 1); if (dp >= 20 && melhor - dp < 30) melhor = dp;
  return oque.slice(0, melhor).replace(/[,:;\s]+$/, '') + '.';
}
function trocarDescricao(texto, nova) {
  const val = '"' + nova.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m || !/^description:\s*["'][^\n]*$/m.test(m[1])) return null; // so descricoes de uma linha
  return texto.replace(m[0], m[0].replace(/^description:.*$/m, () => 'description: ' + val));
}

// ---------------------------------------------------------------- divulgacao progressiva
function secoes(corpo) {
  const linhas = corpo.split('\n'); const r = [{ titulo: null, linhas: [] }]; let cerca = false;
  for (const l of linhas) {
    if (/^\s*```/.test(l)) cerca = !cerca;
    if (!cerca && /^## /.test(l)) r.push({ titulo: l.replace(/^##\s*/, '').trim(), linhas: [l] }); else r[r.length - 1].linhas.push(l);
  }
  return r;
}
function slug(t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'detalhes'; }
function progressiva(info, alvo) {
  if (info.gerada || info.corpo <= alvo) return null;
  const sec = secoes(info.fm.corpo);
  const exigidas = info.auto ? /^(quando usar|passos)\b/i : /^$/;
  const cands = sec.map((s, i) => ({ s, i, tam: s.linhas.join('\n').length }))
    .filter((x) => x.i > 1 && x.s.titulo && !exigidas.test(x.s.titulo) && !x.s.linhas.some((l) => PROTEGIDO.test(l)) && x.tam >= 400 && (DETALHE.test(x.s.titulo) || x.tam > 700))
    .sort((a, b) => (DETALHE.test(b.s.titulo) - DETALHE.test(a.s.titulo)) || b.tam - a.tam);
  if (!cands.length) return null;
  let tam = info.corpo; const mover = new Set(); const refs = {};
  for (const x of cands) {
    if (tam <= alvo) break;
    let nomeArq = 'references/' + slug(x.s.titulo) + '.md'; let k = 2; while (refs[nomeArq]) nomeArq = 'references/' + slug(x.s.titulo) + '-' + k++ + '.md';
    const conteudo = x.s.linhas.slice(1).join('\n').trim();
    refs[nomeArq] = '# ' + x.s.titulo + '\n\n> Parte da skill /' + info.nome + ', carregada só quando necessária (divulgação progressiva).\n\n' + conteudo + '\n';
    const ponteiro = ['## ' + x.s.titulo, 'Detalhes em [' + nomeArq + '](' + nomeArq + '): leia quando precisar desta parte.', ''];
    tam -= x.s.linhas.join('\n').length - ponteiro.join('\n').length;
    mover.add(x.i); x.ponteiro = ponteiro;
  }
  if (!mover.size) return null;
  const novoCorpo = sec.map((s, i) => (mover.has(i) ? cands.find((x) => x.i === i).ponteiro : s.linhas).join('\n')).join('\n');
  const cab = info.texto.slice(0, info.texto.length - info.fm.corpo.length);
  return { texto: cab + novoCorpo, refs };
}

// ---------------------------------------------------------------- ensaio (dry-run) de uma skill alterada
function ensaio(antes, dirNovo) {
  const erros = [];
  const depois = infoSkill(dirNovo);
  if (!depois) return { ok: false, erros: ['SKILL.md sumiu'] };
  const v = validarSkill(dirNovo, { auto: antes.auto });
  erros.push(...v.erros);
  for (const k of Object.keys(antes.fm.dados)) if (k !== 'description' && JSON.stringify(antes.fm.dados[k]) !== JSON.stringify(depois.fm.dados[k])) erros.push('frontmatter "' + k + '" mudou');
  if (depois.desc.length > antes.desc.length) erros.push('descrição ficou maior');
  if (/use quando|usar quando/i.test(antes.desc) && !/use quando|usar quando/i.test(depois.desc)) erros.push('descrição perdeu o "Use quando"');
  const cmds = (s) => (s.match(/(?:^|\s)\/[a-z0-9][a-z0-9-]*/gi) || []).map((x) => x.trim());
  for (const cm of cmds(antes.desc)) if (!cmds(depois.desc).includes(cm)) erros.push('descrição perdeu o comando ' + cm);
  if (depois.desc.length < 40) erros.push('descrição curta demais');
  // nada se perde: toda linha do corpo original continua no SKILL.md ou em references/
  const refsTxt = arquivosRec(path.join(dirNovo, 'references')).map((a) => ler(a)).join('\n');
  const conj = new Set((depois.fm.corpo + '\n' + refsTxt).split('\n').map((l) => l.trim()));
  const perdidas = antes.fm.corpo.split('\n').map((l) => l.trim()).filter((l) => l && !conj.has(l));
  if (perdidas.length) erros.push(perdidas.length + ' linha(s) do corpo se perderiam (ex.: "' + perdidas[0].slice(0, 60) + '")');
  // regras de seguranca ficam no SKILL.md (sempre carregadas com a skill)
  const corpoNovo = new Set(depois.fm.corpo.split('\n').map((l) => l.trim()));
  const regras = antes.fm.corpo.split('\n').filter((l) => PROTEGIDO.test(l)).map((l) => l.trim()).filter((l) => !corpoNovo.has(l));
  if (regras.length) erros.push('regra de segurança sairia do SKILL.md: "' + regras[0].slice(0, 60) + '"');
  // ponteiros validos
  for (const m of depois.fm.corpo.matchAll(/\]\((references\/[^)]+)\)/g)) if (!fs.existsSync(path.join(dirNovo, m[1]))) erros.push('ponteiro quebrado: ' + m[1]);
  return { ok: !erros.length, erros, depois };
}

// ---------------------------------------------------------------- duplicadas
const VAZIAS = new Set('para com uma use quando usuario usuário pedir pede fazer faz gera gerar skill auto que dos das nos nas pelo pela sem por como mais este esta isso'.split(' '));
function termos(i) { return new Set(((i.nome.replace(/^auto-/, '') + ' ' + i.desc).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]{4,}/g) || []).filter((w) => !VAZIAS.has(w))); }
function similaridade(a, b) { const A = termos(a), B = termos(b); let n = 0; for (const w of A) if (B.has(w)) n++; return n / (A.size + B.size - n || 1); }

// v0.6: sobreposicao envolvendo nucleo ou skill do advogado => SO RELATORIO (nunca mescla, aposenta ou enxuga).
// Pares auto-*(nossa) x auto-*(nossa) seguem para a mescla automatica acima; nucleo x nucleo e projeto do pacote.
const DONOS = { nucleo: 'do assistente', advogado: 'que você criou ou instalou', automatica: 'automático, criado por mim' };
function dono(x, podeMexer) { return x.nucleo ? 'nucleo' : (x.auto && podeMexer(x)) ? 'automatica' : 'advogado'; }
function sobreposicoes(lista, lim, podeMexer, ignorar) {
  const r = [];
  const sk = lista.filter((x) => !(ignorar && ignorar.has(x.nome)));
  for (let a = 0; a < sk.length; a++) for (let b = a + 1; b < sk.length; b++) {
    const A = sk[a], B = sk[b]; const dA = dono(A, podeMexer), dB = dono(B, podeMexer);
    if ((dA === 'automatica' && dB === 'automatica') || (dA === 'nucleo' && dB === 'nucleo') || A.nome === B.nome) continue;
    const sim = similaridade(A, B); if (sim < lim.similaridade) continue;
    r.push({ a: A.nome, donoA: dA, b: B.nome, donoB: dB, similaridade: Math.round(sim * 100) / 100 });
  }
  return r;
}

// ---------------------------------------------------------------- memoria e CLAUDE.md
function orcamentos(lim, aplicar, backup) {
  const r = { itens: [], acoes: [] };
  let mem = null; try { mem = require('./memoria'); } catch (e) { /* */ }
  if (aplicar && mem) { try { const m = mem.manter({ forcar: true }); r.acoes.push(...m.feito); } catch (e) { r.itens.push('manutenção da memória falhou: ' + e.message); } }
  const linhas = (a) => { const t = ler(a); return t == null ? null : t.split(/\r?\n/).length; };
  const g = path.join(c.P.claude, 'CLAUDE.md'); const lg = linhas(g);
  if (lg != null) {
    const t = ler(g); const b = (t.match(/<!-- advogado-claude-mod:inicio -->[\s\S]*?<!-- advogado-claude-mod:fim -->/) || [''])[0].split('\n').length;
    r.itens.push('CLAUDE.md global: ' + lg + ' linhas (limite ' + lim.claudeLinhas + '), bloco do assistente ' + b + ' (limite ' + lim.blocoLinhas + ')' + (lg > lim.claudeLinhas || b > lim.blocoLinhas ? ' ⚠️' : ' ✅'));
  }
  const esc = c.config().escritorio;
  const le = linhas(path.join(esc, 'CLAUDE.md')); if (le != null) r.itens.push('CLAUDE.md do ESCRITORIO: ' + le + ' linhas (limite ' + lim.claudeEscLinhas + ')' + (le > lim.claudeEscLinhas ? ' ⚠️' : ' ✅'));
  if (mem) {
    const prefs = mem.lerPrefs();
    if (aplicar && prefs.length > lim.prefsItens) {
      // excesso: arquiva os menos confirmados/mais antigos
      const ord = prefs.slice().sort((a, b) => a.n - b.n || (a.data < b.data ? -1 : 1));
      const sai = new Set(ord.slice(0, prefs.length - lim.prefsItens));
      const k = mem.caminhos(); copiarSeExiste(k.pref, backup); copiarSeExiste(k.morto, backup); registrarCriado(k.morto, backup);
      fs.appendFileSync(k.morto, (ler(k.morto) ? '' : '# Arquivo morto da memória\n\n') + [...sai].map((i) => '- [' + i.data + '] (' + i.tipo + ') ' + i.texto + ' · arquivado pela manutenção ' + c.hojeISO(agora())).join('\n') + '\n', 'utf8');
      const ficam = prefs.filter((i) => !sai.has(i));
      // regrava via preferir-like
      fs.writeFileSync(k.pref, ''); for (const i of ficam) { mem.preferir(i.texto, i.tipo); }
      r.acoes.push(sai.size + ' preferência(s) pouco usadas arquivadas (limite ' + lim.prefsItens + ')');
    }
    r.itens.push('Preferências memorizadas: ' + Math.min(prefs.length, lim.prefsItens) + ' (limite ' + lim.prefsItens + ')');
  }
  // MEMORY.md (memoria automatica): so as primeiras 200 linhas / 25 KB carregam
  const base = path.join(c.P.claude, 'projects');
  for (const p of fs.existsSync(base) ? fs.readdirSync(base) : []) {
    const a = path.join(base, p, 'memory', 'MEMORY.md'); const t = ler(a); if (t == null) continue;
    const ls = t.split(/\r?\n/); const bytes = Buffer.byteLength(t);
    let ok = ls.length <= lim.memoryLinhas && bytes <= lim.memoryBytes;
    if (!ok && aplicar) {
      copiarSeExiste(a, backup);
      const extra = path.join(path.dirname(a), 'arquivo-' + c.hojeISO(agora()) + '.md');
      const ficam = ls.slice(0, lim.memoryAlvo); const vao = ls.slice(lim.memoryAlvo);
      copiarSeExiste(extra, backup); registrarCriado(extra, backup);
      fs.appendFileSync(extra, vao.join('\n') + '\n', 'utf8');
      fs.writeFileSync(a, ficam.join('\n') + '\n- Entradas antigas: ver ' + path.basename(extra) + '\n', 'utf8');
      r.acoes.push('MEMORY.md (' + p.slice(-24) + ') enxugado: ' + vao.length + ' linha(s) movidas para ' + path.basename(extra));
      ok = true;
    }
    r.itens.push('MEMORY.md ' + p.slice(-24) + ': ' + ls.length + ' linhas, ' + Math.round(bytes / 1024) + ' KB (carrega até ' + lim.memoryLinhas + ' linhas/25 KB)' + (ok ? ' ✅' : ' ⚠️'));
  }
  return r;
}
/** Arquivo que a manutencao vai criar: o desfazer o remove. */
function registrarCriado(a, backup) {
  if (!backup || !a || fs.existsSync(a)) return;
  const man = path.join(backup, 'criados.json'); const l = c.lerJSON(man, []); if (!l.includes(a)) { l.push(a); c.gravarJSON(man, l); }
}
function copiarSeExiste(a, backup) {
  if (!backup || !a || !fs.existsSync(a)) return;
  const d = path.join(backup, 'arquivos', path.relative(path.parse(a).root, a).replace(/[\\/:]/g, '__'));
  if (!fs.existsSync(d)) { c.garantirDir(path.dirname(d)); fs.copyFileSync(a, d); }
  const man = path.join(backup, 'arquivos.json'); const l = c.lerJSON(man, []); if (!l.some((x) => x.origem === a)) { l.push({ origem: a, copia: d }); c.gravarJSON(man, l); }
}

// ---------------------------------------------------------------- revisao completa
function changelogHab(titulo, linhas) {
  const log = path.join(c.P.hab, 'CHANGELOG.md'); c.garantirDir(c.P.hab);
  if (!fs.existsSync(log)) fs.writeFileSync(log, '# Histórico de habilidades do assistente\n', 'utf8');
  fs.appendFileSync(log, '\n## ' + agora().toLocaleString('pt-BR') + ' — ' + titulo + '\n' + linhas.map((l) => '- ' + l).join('\n') + '\n', 'utf8');
}

function revisar(opts) {
  opts = opts || {};
  const lim = limites();
  const simular = !!opts.simular;
  const pasta = opts.pasta || c.P.skillsVivas;
  const carimbo = c.carimbo(agora());
  const backup = path.join(c.P.base, 'backups', 'revisoes', carimbo);
  const regArq = path.join(c.P.hab, 'registro.json');
  const reg = c.lerJSON(regArq, { skills: {} }) || { skills: {} }; reg.skills = reg.skills || {};
  const filtro = opts.pasta ? () => true : nossas;
  // Posse (v0.5): fora do modo de teste (--pasta), so mexe nas auto-* criadas pelo proprio assistente.
  const podeMexer = opts.pasta ? () => true : (x) => prov.ehNossa(path.basename(x.dir), x.dir);
  const antes = medir(pasta, filtro);
  const res = { carimbo, simulado: simular, antes, enxugadas: [], progressivas: [], aposentadas: [], mescladas: [], sobrepostas: [], revertidas: [], memoria: null, backup: simular ? null : backup };

  if (!simular) {
    c.garantirDir(backup);
    for (const i of listarSkills(pasta).filter(filtro)) copiarDir(i.dir, path.join(backup, 'skills', path.basename(i.dir)));
    if (fs.existsSync(regArq)) fs.copyFileSync(regArq, path.join(backup, 'registro.json'));
    c.gravarJSON(path.join(backup, 'manifesto.json'), { carimbo, pasta, aposentadas: [] });
  }
  const manifesto = () => c.lerJSON(path.join(backup, 'manifesto.json'), { aposentadas: [] });
  const aposentar = (i, motivo) => {
    const chave = path.basename(i.dir);
    const destino = path.join(c.P.hab, '_aposentadas', chave + '__' + carimbo);
    res.aposentadas.push({ nome: chave, motivo });
    if (simular) return;
    moverDir(i.dir, destino);
    const s = reg.skills[chave] || { origem: 'automatica', versao: 1 };
    s.status = 'aposentada'; s.atualizadoEm = agora().toISOString(); s.historico = (s.historico || []).concat([{ data: agora().toISOString(), acao: 'aposentada', motivo: 'manutenção: ' + motivo }]);
    reg.skills[chave] = s;
    const m = manifesto(); m.aposentadas.push({ nome: chave, destino }); c.gravarJSON(path.join(backup, 'manifesto.json'), m);
    prov.registrar(chave, 'aposentada', { motivo: 'manutenção: ' + motivo });
    changelogHab(chave + ' aposentada pela manutenção', ['Motivo: ' + motivo, 'Guardada em: ' + destino, 'Para trazer de volta: /habilidades restaurar ' + chave.replace(/^auto-/, '')]);
  };

  // 1. aposentar auto-* sem uso ha 45+ dias (nucleo nunca e aposentado)
  for (const i of listarSkills(pasta).filter((x) => x.auto && podeMexer(x))) {
    const s = reg.skills[path.basename(i.dir)] || {};
    const ref = s.ultimoUso || s.atualizadoEm || s.criadaEm || fs.statSync(i.dir).mtime.toISOString();
    const d = dias(new Date(ref), agora());
    if (d >= lim.diasSemUso) aposentar(i, 'sem uso há ' + Math.floor(d) + ' dias (' + (s.usos || 0) + ' uso(s) no total)');
  }

  // 2. mesclar auto-* duplicadas/sobrepostas: a mais usada fica; a outra vira referencia dela e e aposentada
  const autos = listarSkills(pasta).filter((x) => x.auto && podeMexer(x));
  const usadas = new Set();
  for (let a = 0; a < autos.length; a++) for (let b = a + 1; b < autos.length; b++) {
    const A = autos[a], B = autos[b]; if (usadas.has(A.nome) || usadas.has(B.nome)) continue;
    const sim = similaridade(A, B); if (sim < lim.similaridade) continue;
    const uA = (reg.skills[path.basename(A.dir)] || {}).usos || 0, uB = (reg.skills[path.basename(B.dir)] || {}).usos || 0;
    const [P, S] = uA >= uB ? [A, B] : [B, A];
    const tmp = path.join(c.P.estado, 'revisao-tmp', path.basename(P.dir)); removerDir(tmp); copiarDir(P.dir, tmp);
    const ref = 'references/variante-' + S.nome.replace(/^auto-/, '') + '.md';
    c.garantirDir(path.join(tmp, 'references'));
    fs.writeFileSync(path.join(tmp, ref), '# Variante incorporada: /' + S.nome + '\n\n> Mesclada em /' + P.nome + ' pela manutenção (' + c.hojeISO(agora()) + '). Descrição original: ' + S.desc + '\n\n' + S.fm.corpo.trim() + '\n', 'utf8');
    const t = fs.readFileSync(path.join(tmp, 'SKILL.md'), 'utf8').trimEnd() + '\n\n## Variantes\n- Caso parecido com o da antiga /' + S.nome + ': ver [' + ref + '](' + ref + ').\n';
    fs.writeFileSync(path.join(tmp, 'SKILL.md'), t, 'utf8');
    const e = ensaio(P, tmp);
    if (!e.ok) { res.revertidas.push({ nome: P.nome, etapa: 'mesclar com ' + S.nome, erros: e.erros }); removerDir(tmp); continue; }
    usadas.add(A.nome); usadas.add(B.nome);
    res.mescladas.push({ ficou: P.nome, entrou: S.nome, similaridade: Math.round(sim * 100) / 100 });
    if (!simular) {
      removerDir(P.dir); copiarDir(tmp, P.dir);
      const sp = reg.skills[path.basename(P.dir)] || {}; sp.usos = (sp.usos || 0) + ((reg.skills[path.basename(S.dir)] || {}).usos || 0);
      sp.historico = (sp.historico || []).concat([{ data: agora().toISOString(), acao: 'mesclada', motivo: 'incorporou ' + S.nome }]); reg.skills[path.basename(P.dir)] = sp;
      prov.registrar(path.basename(P.dir), 'mesclada', { de: S.nome, motivo: 'manutenção: semelhança ' + Math.round(sim * 100) + '%' }); prov.registrar(path.basename(S.dir), 'absorvida', { para: P.nome });
      changelogHab(P.nome + ' incorporou ' + S.nome + ' (manutenção)', ['Semelhança: ' + Math.round(sim * 100) + '%', 'Detalhes da antiga em ' + ref]);
      aposentar(S, 'mesclada em ' + P.nome);
    } else res.aposentadas.push({ nome: S.nome, motivo: 'mesclada em ' + P.nome });
    removerDir(tmp);
  }

  // 2b. sobreposicao com nucleo ou skill do advogado: so anota no relatorio, nao mexe em nada
  try {
    let lista = listarSkills(pasta);
    if (!opts.pasta) {
      // modo plugin: o nucleo vem da pasta do plugin, nao de ~/.claude/skills
      const raiz = (c.lerJSON(path.join(c.P.base, 'plugin.json'), null) || {}).raiz;
      if (c.config().modoPlugin && raiz && fs.existsSync(path.join(raiz, 'skills'))) lista = lista.concat(listarSkills(path.join(raiz, 'skills')).filter((x) => x.nucleo && !lista.some((y) => y.nome === x.nome)));
    }
    const fora = new Set(res.aposentadas.map((x) => x.nome));
    res.sobrepostas = sobreposicoes(lista, lim, podeMexer, fora);
  } catch (e) { c.log('erros', 'sobreposicoes: ' + e.message); }

  // 3. enxugar descricoes e aplicar divulgacao progressiva; ensaio de cada uma; reverte as que falham
  for (const i of listarSkills(pasta).filter((x) => filtro(x) && podeMexer(x))) {
    const tmp = path.join(c.P.estado, 'revisao-tmp', path.basename(i.dir)); removerDir(tmp); copiarDir(i.dir, tmp);
    let texto = i.texto; const feito = [];
    if (i.listada && i.desc.length > lim.descricaoAlvo && !i.fm.dados.when_to_use) {
      const nova = encurtarDescricao(i.fm.dados.description, i.nome, lim.descricaoAlvo);
      const t2 = nova.length < i.desc.length ? trocarDescricao(texto, nova) : null;
      if (t2) { texto = t2; feito.push('descricao'); }
    }
    let p = null;
    if (!i.gerada && i.corpo > lim.corpoAlvo) {
      const info2 = Object.assign({}, i, { texto, fm: c.lerFrontmatter(texto) });
      p = progressiva(info2, lim.corpoAlvo);
      if (p) { texto = p.texto; for (const [rel, cont] of Object.entries(p.refs)) { c.garantirDir(path.dirname(path.join(tmp, rel))); fs.writeFileSync(path.join(tmp, rel), cont, 'utf8'); } feito.push('progressiva'); }
    }
    if (!feito.length) { removerDir(tmp); continue; }
    fs.writeFileSync(path.join(tmp, 'SKILL.md'), texto, 'utf8');
    const e = ensaio(i, tmp);
    if (!e.ok) { res.revertidas.push({ nome: i.nome, etapa: feito.join('+'), erros: e.erros }); removerDir(tmp); continue; }
    if (feito.includes('descricao')) res.enxugadas.push({ nome: i.nome, de: i.desc.length, para: e.depois.desc.length, nova: e.depois.desc });
    if (feito.includes('progressiva')) res.progressivas.push({ nome: i.nome, de: i.corpo, para: e.depois.corpo, referencias: Object.keys(p.refs) });
    if (!simular) {
      removerDir(i.dir); copiarDir(tmp, i.dir);
      const chave = path.basename(i.dir);
      if (/^auto-/.test(chave)) prov.registrar(chave, 'enxugada', { motivo: 'manutenção: ' + feito.join('+') });
      if (reg.skills[chave]) reg.skills[chave].historico = (reg.skills[chave].historico || []).concat([{ data: agora().toISOString(), acao: 'enxugada', motivo: 'manutenção: ' + feito.join('+') }]);
    }
    removerDir(tmp);
  }
  if (!simular) { c.gravarJSON(regArq, reg); if (res.enxugadas.length || res.progressivas.length) changelogHab('manutenção: ' + res.enxugadas.length + ' descrição(ões) enxugada(s), ' + res.progressivas.length + ' com detalhes em references/', res.enxugadas.map((x) => x.nome + ': descrição ' + x.de + ' → ' + x.para + ' caracteres').concat(res.progressivas.map((x) => x.nome + ': corpo ' + x.de + ' → ' + x.para + ' caracteres (' + x.referencias.join(', ') + ')')).concat(['Desfazer tudo: /manutencao desfazer'])); }

  // 4. orcamentos de CLAUDE.md e memoria
  res.memoria = opts.pasta ? { itens: [], acoes: [] } : orcamentos(lim, !simular, simular ? null : backup);

  res.depois = medir(pasta, filtro);
  res.reducaoFixo = antes.fixo ? Math.round((1 - res.depois.fixo / antes.fixo) * 100) : 0;
  res.resumo = resumoLinha(res);
  if (!simular && !opts.pasta) {
    res.relatorio = gravarRelatorio(res, lim);
    const est = lerEstado();
    Object.assign(est, { ultima: agora().toISOString(), proxima: new Date(agora().getTime() + lim.intervaloDias * 864e5).toISOString(), ultimoResumo: res.resumo, resumoPendente: !!opts.automatica, backup, relatorio: res.relatorio, automatica: !!opts.automatica });
    c.gravarJSON(arqEstado(), est);
    try { require('./memoria'); changelogMemoria('manutenção de habilidades: ' + res.resumo + ' (relatório: MEMORIA/revisoes/' + path.basename(res.relatorio) + ')'); } catch (e) { /* */ }
  }
  removerDir(path.join(c.P.estado, 'revisao-tmp'));
  return res;
}
function changelogMemoria(msg) {
  const k = require('./memoria').caminhos();
  const atual = ler(k.changelog) || '# Changelog da memória do assistente\n\n';
  c.garantirDir(path.dirname(k.changelog));
  fs.writeFileSync(k.changelog, atual + '- ' + c.carimbo(agora()).replace('_', ' ').replace(/(\d\d)(\d\d)\d\d$/, '$1:$2') + ' ' + msg + '\n', 'utf8');
}
function resumoLinha(r) {
  const p = [];
  const enx = new Set(r.enxugadas.map((x) => x.nome).concat(r.progressivas.map((x) => x.nome)));
  p.push(enx.size + ' skill(s) enxugada(s)');
  if (r.mescladas.length) p.push(r.mescladas.length + ' mesclada(s)');
  p.push(r.aposentadas.length + ' aposentada(s)');
  if (r.revertidas.length) p.push(r.revertidas.length + ' alteração(ões) revertida(s) no ensaio');
  if (r.sobrepostas && r.sobrepostas.length) p.push(r.sobrepostas.length + ' par(es) de atalhos parecidos só anotado(s) no relatório, sem mexer');
  p.push('contexto fixo das skills ' + (r.reducaoFixo > 0 ? '-' + r.reducaoFixo + '%' : 'sem mudança') + ' (' + r.antes.fixo + ' → ' + r.depois.fixo + ' caracteres)');
  return 'Manutenção feita: ' + p.join(', ') + '.';
}
function gravarRelatorio(r, lim) {
  const esc = c.config().escritorio;
  const dir = path.join(esc, 'MEMORIA', 'revisoes'); c.garantirDir(dir);
  let arq = path.join(dir, c.hojeISO(agora()) + '.md');
  if (fs.existsSync(arq)) arq = path.join(dir, c.carimbo(agora()) + '.md');
  const L = ['# Manutenção de habilidades — ' + c.hojeISO(agora()), '', '> ' + r.resumo, '',
    '- Contexto fixo (descrições carregadas em toda conversa): **' + r.antes.fixo + ' → ' + r.depois.fixo + ' caracteres** (~' + r.antes.tokensFixo + ' → ' + r.depois.tokensFixo + ' tokens).',
    '- Corpo das skills (carregado só quando a skill é usada): ' + r.antes.corpo + ' → ' + r.depois.corpo + ' caracteres.',
    '- Metas: descrição ≤ ' + lim.descricaoAlvo + ' caracteres; corpo ≤ ' + lim.corpoAlvo + ' (detalhes em references/); aposentar auto-* sem uso há ' + lim.diasSemUso + '+ dias.', ''];
  if (r.enxugadas.length) L.push('## Descrições enxugadas', ...r.enxugadas.map((x) => '- /' + x.nome + ': ' + x.de + ' → ' + x.para + ' — "' + x.nova + '"'), '');
  if (r.progressivas.length) L.push('## Detalhes movidos para references/ (carregados sob demanda)', ...r.progressivas.map((x) => '- /' + x.nome + ': ' + x.de + ' → ' + x.para + ' caracteres (' + x.referencias.join(', ') + ')'), '');
  if (r.mescladas.length) L.push('## Mescladas', ...r.mescladas.map((x) => '- /' + x.entrou + ' → incorporada em /' + x.ficou + ' (semelhança ' + Math.round(x.similaridade * 100) + '%)'), '');
  if (r.aposentadas.length) L.push('## Aposentadas (não carregam mais; dá para restaurar)', ...r.aposentadas.map((x) => '- /' + x.nome + ': ' + x.motivo), '');
  if (r.sobrepostas && r.sobrepostas.length) L.push('## Atalhos parecidos — anotei, mas NÃO mexi neles', '> Achei atalhos que fazem coisas parecidas. Como pelo menos um deles é do assistente ou foi você que criou, eu não juntei, não apaguei e não encurtei nenhum. Se quiser, me peça para comparar os dois, ou apague o que você não usa.', ...r.sobrepostas.map((x) => '- /' + x.a + ' (' + DONOS[x.donoA] + ') e /' + x.b + ' (' + DONOS[x.donoB] + '): parecidos em ' + Math.round(x.similaridade * 100) + '%.'), '');
  if (r.revertidas.length) L.push('## Revertidas no ensaio (nada foi alterado nelas)', ...r.revertidas.map((x) => '- /' + x.nome + ' (' + x.etapa + '): ' + x.erros.join('; ')), '');
  L.push('## CLAUDE.md e memória', ...r.memoria.itens.map((x) => '- ' + x), ...r.memoria.acoes.map((x) => '- Feito: ' + x), '');
  L.push('## Desfazer', '- Tudo: `/manutencao desfazer` (backup em `' + r.backup.replace(/\\/g, '/') + '`).', '- Uma habilidade aposentada: `/habilidades restaurar <nome>`.', '');
  fs.writeFileSync(arq, L.join('\n'), 'utf8');
  return arq;
}

// ---------------------------------------------------------------- desfazer
function desfazer(carimbo) {
  const raiz = path.join(c.P.base, 'backups', 'revisoes');
  const lista = fs.existsSync(raiz) ? fs.readdirSync(raiz).filter((x) => !/__desfeita$/.test(x)).sort() : [];
  const alvo = carimbo || lista[lista.length - 1];
  if (!alvo || !fs.existsSync(path.join(raiz, alvo))) return { ok: false, erro: 'nenhuma manutenção para desfazer' };
  const b = path.join(raiz, alvo); const man = c.lerJSON(path.join(b, 'manifesto.json'), {});
  const pasta = man.pasta || c.P.skillsVivas;
  for (const a of man.aposentadas || []) removerDir(a.destino);
  for (const n of fs.existsSync(path.join(b, 'skills')) ? fs.readdirSync(path.join(b, 'skills')) : []) { removerDir(path.join(pasta, n)); copiarDir(path.join(b, 'skills', n), path.join(pasta, n)); }
  if (fs.existsSync(path.join(b, 'registro.json'))) fs.copyFileSync(path.join(b, 'registro.json'), path.join(c.P.hab, 'registro.json'));
  for (const f of c.lerJSON(path.join(b, 'criados.json'), [])) { try { fs.rmSync(f, { force: true }); } catch (e) { /* */ } }
  for (const f of c.lerJSON(path.join(b, 'arquivos.json'), [])) if (fs.existsSync(f.copia)) { c.garantirDir(path.dirname(f.origem)); fs.copyFileSync(f.copia, f.origem); }
  fs.renameSync(b, b + '__desfeita');
  changelogHab('manutenção ' + alvo + ' desfeita', ['Skills, registro e memória voltaram ao estado anterior à manutenção.']);
  try { changelogMemoria('manutenção de habilidades ' + alvo + ' desfeita (tudo restaurado do backup).'); } catch (e) { /* */ }
  const est = lerEstado(); est.desfeita = alvo; est.resumoPendente = false; c.gravarJSON(arqEstado(), est);
  return { ok: true, carimbo: alvo };
}

// ---------------------------------------------------------------- agendamento (chamado pelo SessionStart)
/** Verifica se a manutencao venceu (>= 15 dias). Primeira vez: so marca a data de referencia. */
function verificarAgenda() {
  const lim = limites(); const est = lerEstado();
  if (!est.ultima) { est.ultima = agora().toISOString(); est.proxima = new Date(agora().getTime() + lim.intervaloDias * 864e5).toISOString(); est.referencia = 'instalação'; c.gravarJSON(arqEstado(), est); return { devida: false, inicializada: true }; }
  const d = dias(new Date(est.ultima), agora());
  return { devida: d >= lim.intervaloDias, diasDesde: Math.floor(d) };
}
function aoIniciarSessao() {
  const ag = verificarAgenda();
  let r = null;
  if (ag.devida) {
    // trava simples: duas conversas abertas ao mesmo tempo nao rodam a manutencao em dobro
    const e0 = lerEstado();
    if (!(e0.emAndamento && dias(new Date(e0.emAndamento), agora()) * 1440 < 10)) {
      e0.emAndamento = agora().toISOString(); c.gravarJSON(arqEstado(), e0);
      try { r = revisar({ automatica: true }); } finally { const e1 = lerEstado(); delete e1.emAndamento; c.gravarJSON(arqEstado(), e1); }
    }
  }
  const est = lerEstado();
  if (est.resumoPendente) { est.resumoPendente = false; est.mostradoEm = agora().toISOString(); c.gravarJSON(arqEstado(), est); return { executada: !!r, resumo: est.ultimoResumo, relatorio: est.relatorio }; }
  return { executada: !!r, resumo: null };
}

module.exports = { medir, revisar, desfazer, verificarAgenda, aoIniciarSessao, encurtarDescricao, progressiva, infoSkill, similaridade, sobreposicoes, ensaio, PADRAO };

if (require.main === module) {
  const a = process.argv.slice(2); const cmd = a[0] || 'estado'; const json = a.includes('--json');
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const pasta = opt('--pasta') ? path.resolve(opt('--pasta')) : null;
  if (cmd === 'medir') {
    const m = medir(pasta || c.P.skillsVivas, pasta ? () => true : nossas);
    if (json) console.log(JSON.stringify(m, null, 1));
    else { console.log(m.skills.map((s) => (s.nome.padEnd(28) + String(s.listada ? s.descricao : '—').padStart(6) + String(s.corpo).padStart(8) + (s.refs ? '  +' + s.refs + ' em references/' : ''))).join('\n')); console.log('TOTAL: ' + m.total + ' skills · contexto fixo ' + m.fixo + ' caracteres (~' + m.tokensFixo + ' tokens, em toda conversa) · corpos ' + m.corpo + ' caracteres (só quando usadas)'); }
  } else if (cmd === 'revisar') {
    const r = revisar({ simular: a.includes('--simular'), automatica: a.includes('--automatica'), pasta });
    if (json) console.log(JSON.stringify(Object.assign({}, r, { antes: { fixo: r.antes.fixo, corpo: r.antes.corpo }, depois: { fixo: r.depois.fixo, corpo: r.depois.corpo } }), null, 1));
    else console.log((r.simulado ? '(SIMULAÇÃO — nada foi alterado) ' : '') + r.resumo + (r.relatorio ? '\nRelatório: ' + r.relatorio : '') + (r.sobrepostas.length ? '\nAtalhos parecidos (não mexi): ' + r.sobrepostas.map((x) => '/' + x.a + ' ~ /' + x.b).join('; ') : '') + (r.revertidas.length ? '\nRevertidas: ' + r.revertidas.map((x) => x.nome + ' (' + x.erros[0] + ')').join('; ') : '') + (r.simulado ? '' : '\nDesfazer: node "' + __filename + '" desfazer'));
  } else if (cmd === 'desfazer') {
    const r = desfazer(a[1] && !a[1].startsWith('--') ? a[1] : null);
    console.log(r.ok ? '↩️ Manutenção ' + r.carimbo + ' desfeita: tudo voltou ao estado anterior.' : 'Nada desfeito: ' + r.erro); if (!r.ok) process.exitCode = 2;
  } else if (cmd === 'estado') {
    const est = lerEstado(); const ag = est.ultima ? dias(new Date(est.ultima), agora()) : null;
    if (json) console.log(JSON.stringify(est, null, 1)); else console.log(est.ultima ? 'Última manutenção/referência: ' + est.ultima.slice(0, 10) + ' (há ' + Math.floor(ag) + ' dia(s)) · próxima: ' + String(est.proxima || '').slice(0, 10) + (est.ultimoResumo ? '\nÚltimo resultado: ' + est.ultimoResumo : '') : 'Nenhuma manutenção registrada ainda (a contagem começa na próxima conversa).');
  } else { console.log('Uso: manutencao.js medir | revisar [--simular] | desfazer [carimbo] | estado'); process.exitCode = 1; }
}
