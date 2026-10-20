'use strict';
/*
 * Proveniencia e posse das habilidades automaticas (ideia do autoharness: "so as proprias skills").
 *  - Livro-razao por skill: ~/.claude/advogado/habilidades/proveniencia/<auto-nome>.jsonl
 *    (criada, atualizada, contexto, usada, falhou, enxugada, mesclada, absorvida, aposentada, restaurada, desfeita).
 *  - Sem dado de cliente: peca e caso entram como impressao digital (hash) + tipo da peca
 *    ("contestação", "inicial"...). O vinculo legivel fica so no DOSSIE.md do proprio caso.
 *  - ehNossa(): a automacao (reflexao, manutencao, aposentadoria por falhas) so toca skills
 *    auto-* que ELA criou: registro com origem "automatica" + metadata.origem: automatica.
 *    Nucleo e skills escritas pelo usuario (ou instaladas por outros) nunca sao tocadas.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./comum');

const dir = () => path.join(c.P.hab, 'proveniencia');
const arq = (chave) => path.join(dir(), String(chave).replace(/[^a-z0-9-]/gi, '_') + '.jsonl');
const impressao = (t) => crypto.createHash('sha256').update(c.norm(String(t))).digest('hex').slice(0, 12);

const TIPOS_PECA = [
  ['contestação', /contesta/i], ['petição inicial', /inicial|peticao-inicial|petição inicial/i], ['réplica', /replica|réplica/i],
  ['apelação', /apela/i], ['agravo', /agravo/i], ['embargos', /embargo/i], ['recurso', /recurso/i], ['contrarrazões', /contrarraz/i],
  ['contrato', /contrato/i], ['parecer', /parecer/i], ['notificação', /notifica/i], ['manifestação', /manifesta/i], ['mapa de teses', /mapa-de-teses/i],
];
function tipoPeca(arquivo) { const b = path.basename(String(arquivo || '')); const t = TIPOS_PECA.find(([, re]) => re.test(b)); return t ? t[0] : 'documento'; }

/** Registra um evento no livro-razao da skill. Recusa dados pessoais (falha silenciosa). */
function registrar(chave, evento, dados) {
  try {
    const d = Object.assign({ data: new Date().toISOString(), evento }, dados || {});
    const linha = JSON.stringify(d);
    if (c.acharSigilo(linha.replace(/"data":"[^"]*"/, '')).some((x) => ['CPF', 'CNPJ', 'numero de processo (CNJ)', 'e-mail'].includes(x))) return false;
    c.garantirDir(dir());
    fs.appendFileSync(arq(chave), linha + '\n', 'utf8');
    return true;
  } catch (e) { c.log('erros', 'proveniencia: ' + e.message); return false; }
}
function ler(chave) {
  try { return fs.readFileSync(arq(chave), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; }
}
/** Contexto de criacao vindo do hook (sessao + peca/caso como impressao digital). */
function contexto(sessaoId, sessao, escritorio) {
  const s = sessao || {};
  const r = { sessao: sessaoId ? String(sessaoId).slice(0, 36) : null };
  if (s.ultimaPeca) { r.pecaTipo = tipoPeca(s.ultimaPeca); r.pecaId = impressao(s.ultimaPeca); }
  if (s.casoAtivo) r.casoId = impressao(s.casoAtivo);
  else if ((s.casosTocados || []).length) r.casoId = impressao(path.join(escritorio || '', 'CASOS', s.casosTocados[s.casosTocados.length - 1]));
  return r;
}

/** A automacao so pode mexer nesta skill se ela mesma a criou. */
function ehNossa(chave, dirSkill) {
  chave = String(chave || '');
  if (!/^auto-[a-z0-9-]+$/.test(chave)) return false;
  const reg = c.lerJSON(path.join(c.P.hab, 'registro.json'), { skills: {} }) || { skills: {} };
  const s = (reg.skills || {})[chave];
  if (!s || s.origem !== 'automatica') return false;
  const d = dirSkill || path.join(c.P.skillsVivas, chave);
  const f = path.join(d, 'SKILL.md');
  if (fs.existsSync(f)) {
    const fm = c.lerFrontmatter(fs.readFileSync(f, 'utf8')).dados;
    const meta = fm.metadata || {};
    if (typeof meta !== 'object' || meta.origem !== 'automatica') return false;
  }
  return true;
}

/** Linha do tempo legivel (para /habilidades proveniencia <nome>). */
function linhaDoTempo(chave) {
  const reg = c.lerJSON(path.join(c.P.hab, 'registro.json'), { skills: {} }) || { skills: {} };
  const s = (reg.skills || {})[chave] || {};
  const ev = ler(chave);
  const L = ['Proveniência de /' + chave + (ehNossa(chave) ? ' (criada pelo assistente)' : ' (NÃO é do assistente: a automação não mexe nela)')];
  if (s.criadaEm) L.push('- Criada em ' + s.criadaEm.slice(0, 10) + (s.historico && s.historico[0] && s.historico[0].motivo ? ': ' + s.historico[0].motivo : ''));
  for (const e of ev) {
    const extra = [e.motivo, e.pecaTipo ? 'a partir de ' + e.pecaTipo + ' (id ' + e.pecaId + ')' : null, e.casoId ? 'caso id ' + e.casoId : null, e.sessao ? 'conversa ' + e.sessao.slice(0, 8) : null, e.linhas ? e.linhas : null, e.de ? 'de ' + e.de : null, e.para ? 'para ' + e.para : null].filter(Boolean).join(' · ');
    L.push('- ' + e.data.slice(0, 16).replace('T', ' ') + ' ' + e.evento + (extra ? ' — ' + extra : ''));
  }
  if (!ev.length) L.push('- (sem eventos no livro-razão; skills anteriores à v0.5 só têm o histórico do registro)');
  return L.join('\n');
}

/** Diferenca simples de linhas entre duas versoes (para o historico de edicoes). */
function difLinhas(antes, depois) {
  const A = new Set(String(antes || '').split('\n').map((l) => l.trim()).filter(Boolean));
  const B = new Set(String(depois || '').split('\n').map((l) => l.trim()).filter(Boolean));
  let mais = 0, menos = 0; for (const l of B) if (!A.has(l)) mais++; for (const l of A) if (!B.has(l)) menos++;
  return '+' + mais + '/-' + menos + ' linhas';
}

const VAZIAS = new Set('para com uma use quando usuario usuário pedir pede fazer faz gera gerar skill auto que dos das nos nas pelo pela sem por como mais este esta isso digitar'.split(' '));
function termos(t) { return new Set((String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]{4,}/g) || []).filter((w) => !VAZIAS.has(w))); }
function similaridadeTexto(a, b) { const A = termos(a), B = termos(b); let n = 0; for (const w of A) if (B.has(w)) n++; return n / (A.size + B.size - n || 1); }
/** Skills auto-* do assistente parecidas com um texto (nome + descricao). */
function semelhantes(texto, limiar, excluir) {
  const out = [];
  const pasta = c.P.skillsVivas;
  for (const n of fs.existsSync(pasta) ? fs.readdirSync(pasta) : []) {
    if (!/^auto-/.test(n) || n === excluir || !ehNossa(n)) continue;
    const f = path.join(pasta, n, 'SKILL.md'); if (!fs.existsSync(f)) continue;
    const d = c.lerFrontmatter(fs.readFileSync(f, 'utf8')).dados;
    const s = similaridadeTexto(texto, n.replace(/^auto-/, '').replace(/-/g, ' ') + ' ' + (d.description || ''));
    if (s >= (limiar == null ? 0.4 : limiar)) out.push({ nome: n, similaridade: Math.round(s * 100) / 100, descricao: d.description || '' });
  }
  return out.sort((a, b) => b.similaridade - a.similaridade);
}

module.exports = { similaridadeTexto, semelhantes, registrar, ler, contexto, ehNossa, linhaDoTempo, difLinhas, impressao, tipoPeca };
