'use strict';
/*
 * Anonimizacao opcional por caso (pseudonimizacao reversivel, so local).
 * Tabela: CASOS/<fase>/<caso>/_anonimizacao/tabela.json (dados REAIS; nunca sai da pasta do caso;
 *   leitura pelo assistente barrada pela guarda-sigilo, gravacao fora dali barrada pela guarda-escrita).
 * Copias anonimizadas: CASOS/<fase>/<caso>/anonimizado/<mesmo caminho relativo>(.md)
 * Marcadores estaveis por caso: [PARTE_A], [CPF_1], [CNPJ_1], [PROCESSO_1], [RG_1], [EMAIL_1],
 *   [TELEFONE_1], [ENDERECO_1], [CEP_1]. Outra grafia do mesmo dado (maiusculas, CPF sem pontos)
 *   ganha sufixo: [PARTE_A#2] — e a mesma pessoa; a reversao devolve a grafia exata.
 * Deterministico: mesma tabela + mesmo texto => mesma saida; reverter(aplicar(x)) === x.
 */
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const PASTA_TABELA = '_anonimizacao';
const PASTA_COPIAS = 'anonimizado';
const ASSINATURA = 'tabela-anonimizacao';
const TIPOS = { nome: 'PARTE', cpf: 'CPF', cnpj: 'CNPJ', cnj: 'PROCESSO', rg: 'RG', email: 'EMAIL', telefone: 'TELEFONE', endereco: 'ENDERECO', cep: 'CEP' };
const ROTULO = { nome: ['nome', 'nomes'], cpf: ['CPF', 'CPFs'], cnpj: ['CNPJ', 'CNPJs'], cnj: ['nº de processo', 'nºs de processo'], rg: ['RG', 'RGs'], email: ['e-mail', 'e-mails'], telefone: ['telefone', 'telefones'], endereco: ['endereço', 'endereços'], cep: ['CEP', 'CEPs'] };
const MARCADOR = /\[(PARTE|CPF|CNPJ|PROCESSO|RG|EMAIL|TELEFONE|ENDERECO|CEP)_([A-Z]{1,3}|\d{1,4})(?:#(\d{1,3}))?\]/gi;
const TEXTO_EXT = /\.(md|txt|markdown|csv)$/i;
const CONVERTE_EXT = /\.(pdf|docx|html?)$/i;

// ---------- caminhos e caso ----------
const nfc = (s) => String(s || '').normalize('NFC');
const tabelaDe = (pastaCaso) => path.join(pastaCaso, PASTA_TABELA, 'tabela.json');
const copiasDe = (pastaCaso) => path.join(pastaCaso, PASTA_COPIAS);
/** Pasta do caso (CASOS/<fase>/<caso>) que contem o arquivo, ou null. Tolera NFD (macOS) e caixa (Windows). */
function pastaDoCaso(arquivo, esc) {
  const raiz = path.join(esc || c.config().escritorio, 'CASOS');
  const a = nfc(c.norm(arquivo)), b = nfc(c.norm(raiz));
  if (!a.startsWith(b + '/')) return null;
  const partes = nfc(path.resolve(String(arquivo))).replace(/\\/g, '/').slice(b.length + 1).split('/');
  if (partes.length < 2 || !partes[0] || !partes[1] || partes[1].startsWith('_')) return null;
  return path.join(raiz, partes[0], partes[1]);
}
/** O caminho passa por uma pasta _anonimizacao (qualquer caixa)? */
const ehDaTabela = (p) => /(^|[\\/])_anonimizacao([\\/]|$)/i.test(nfc(String(p || '')));
const dentroDasCopias = (arquivo, pastaCaso) => c.dentroDe(nfc(arquivo), nfc(copiasDe(pastaCaso)));

// ---------- tabela ----------
function novaTabela(rel) {
  return { tipo: ASSINATURA, versao: 1, caso: rel || '', ativa: true, criadaEm: new Date().toISOString(), atualizadaEm: null, contadores: {}, entradas: [], documentos: {} };
}
function lerTabela(pastaCaso) {
  const t = c.lerJSON(tabelaDe(pastaCaso), null);
  if (!t || t.tipo !== ASSINATURA || !Array.isArray(t.entradas)) return null;
  t.contadores = t.contadores || {}; t.documentos = t.documentos || {};
  return t;
}
function gravarTabela(pastaCaso, t) {
  t.atualizadaEm = new Date().toISOString();
  c.gravarJSON(tabelaDe(pastaCaso), t);
}
function ativa(pastaCaso) { const t = lerTabela(pastaCaso); return !!(t && t.ativa !== false); }

// ---------- normalizacao ----------
/** Dobra (sem acento, minuscula, espacos unificados) com mapa para o texto original. */
function dobrar(texto) {
  const out = []; const ini = [];
  let espaco = false;
  for (let i = 0; i < texto.length;) {
    const cp = texto.codePointAt(i); const ch = String.fromCodePoint(cp); const n = ch.length;
    if (/\s/u.test(ch)) { if (!espaco) { out.push(' '); ini.push(i); espaco = true; } i += n; continue; }
    espaco = false;
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const b of base) { out.push(b); ini.push(i); }
    i += n;
  }
  return { s: out.join(''), ini, fim: texto.length };
}
const dobrarRapido = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const chaveNome = (s) => dobrar(nfc(s).trim()).s.trim();
const digitos = (s) => String(s).replace(/\D/g, '');
function chaveDe(tipo, valor) {
  if (tipo === 'nome' || tipo === 'endereco') return chaveNome(valor).replace(/[\s.,;:]+$/, ''); // "S.A." = "S.A"
  if (tipo === 'email') return nfc(valor).toLowerCase();
  if (tipo === 'telefone') { const d = digitos(valor); return d.length >= 12 && d.startsWith('55') ? d.slice(2) : d; }
  if (tipo === 'rg') return digitos(valor) + (/[xX]$/.test(valor) ? 'X' : '');
  return digitos(valor);
}
function letras(n) { let s = ''; n += 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

function cpfValido(d) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +d[9] && dv(10) === +d[10];
}
function cnpjValido(d) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (n) => { const p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < n; i++) s += +d[i] * p[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return dv(12) === +d[12] && dv(13) === +d[13];
}

// ---------- deteccao ----------
// palavra com inicial maiuscula ("Silva", "D'Ávila") ou inicial abreviada ("B."); "S/A" nao e palavra
const PALAVRA = "\\p{Lu}(?:[\\p{L}\\p{M}'’]+|\\.)(?![\\/\\p{L}])";
const CONECTOR = "(?:d[aeo]s?|e|d'|del|van|von)";
const NOME = PALAVRA + '(?:[ \\t]+(?:' + CONECTOR + '[ \\t]+)?' + PALAVRA + '){1,7}'; // nunca atravessa linha
const PAPEIS = 'Autora?|Réu|Ré|Requerente|Requerid[oa]|Reclamante|Reclamad[oa]|Exequente|Executad[oa]|Apelante|Apelad[oa]|Agravante|Agravad[oa]|Embargante|Embargad[oa]|Impetrante|Paciente|Cliente|Parte contrária|Contratante|Contratad[oa]|Locador[a]?|Locatári[oa]|Interessad[oa]|Notificante|Notificad[oa]|Promovente|Promovid[oa]';
const QUALIF = 'brasileir|estrangeir|portador|inscrit|pessoa jurídica|pessoa física|sociedade|empresa|casad|solteir|divorciad|viúv|separad|menor|maior|nascid|residente|domiciliad|natural de|com sede|já qualificad|devidamente|neste ato|CPF|CNPJ|RG';
const SUFIXO_PJ = "(?:LTDA\\.?|Ltda\\.?|S\\.\\s?A\\.?|S\\/A|EIRELI|EPP|ME)(?![\\p{L}])";
const NAO_NOME = /^(autora?|réu|ré|requerente|requerid[oa]|reclamante|reclamad[oa]|o|a|os|as|em|no|na|ao|ontem|hoje|excelent|exm|ilustr|meritiss|senhor|senhora|sr|sra|dr|dra|doutor|doutora|juiz|juíza|vara|tribunal|poder|estado|município|ministério|comarca|processo|autos|ação|recurso|petição|contestação|sentença|decisão|despacho|art|lei|código|súmula|tema|resp|cpf|cnpj|rg)\b/i;
const TRATAMENTO = /^(?:(?:(?:Sr|Sra|Srta|Dr|Dra|Exmo|Exma|Ilmo|Ilma)\.?|Senhora?|Doutora?)\s+)+/;

const DETECTORES = [
  { tipo: 'cnj', re: /(?<![\d.\-/])(?:\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}|\d{20})(?![\d])/g },
  { tipo: 'cnpj', re: /(?<![\d.\-/])(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})(?![\d])/g, valido: (v) => /\D/.test(v) || cnpjValido(v) },
  { tipo: 'cpf', re: /(?<![\d.\-/])(?:\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})(?![\d])/g, valido: (v) => /\D/.test(v) || cpfValido(v) },
  { tipo: 'email', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { tipo: 'telefone', re: /(?:\+55\s?)?(?:\(\d{2}\)\s?|(?<![\d.\-/])\d{2}\s)9?\d{4}[-\s]?\d{4}(?![\d])/g },
  { tipo: 'rg', re: /\bRG\s*(?:n[ºo°.]*\s*)?(?:[:\s]\s*)?([\d.]{5,}-?[\dxX]?)(?![\d])/gi, grupo: 1 },
  { tipo: 'cep', re: /\bCEP:?\s*(\d{5}-?\d{3})(?![\d])|(?<![\d.\-/])(\d{5}-\d{3})(?![\d])/g, grupo: [1, 2] },
  { tipo: 'endereco', re: /\b(?:Rua|R\.|Avenida|Av\.|Alameda|Al\.|Travessa|Tv\.|Rodovia|Rod\.|Estrada|Praça|Largo|Servidão)\s+[^\n,;()]{2,80}?,\s*(?:(?:n[º°o]?\.?|número)\s*)?(?:\d+[A-Za-z]?|s\/n)(?![\d])/gu },
];
const DETECTORES_NOME = [
  // "Autor: FULANO DE TAL" / "Réu – Empresa X Ltda."
  new RegExp('(?<![\\p{L}])(?:' + PAPEIS + ')[ \\t]*[:\\-–][ \\t]*\\**(' + NOME + '(?:[ \\t]+' + SUFIXO_PJ + ')?)', 'gu'),
  // qualificacao: "FULANO DE TAL, brasileiro, ..." / "Empresa X Ltda., pessoa juridica"
  new RegExp('(' + NOME + '(?:[ \\t]+' + SUFIXO_PJ + ')?)[ \\t]*,\\s*(?:' + QUALIF + ')', 'gu'),
  // pessoa juridica pelo sufixo: "BANCO EXEMPLO S.A."
  new RegExp('(' + NOME + '[ \\t]+' + SUFIXO_PJ + ')', 'gu'),
];
const CONECTOR_RE = /^(?:d[aeo]s?|e|d'|del|van|von)$/i;
const SUFIXO_RE = /^(?:LTDA\.?|Ltda\.?|S\.\s?A\.?|S\/A|EIRELI|EPP|ME)$/;
const maiusc = (w) => w === w.toUpperCase() && /\p{L}/u.test(w);
/** Limpa o nome capturado: tira tratamento ("Sr. Dr."), palavras de abertura ("Excelentíssimo", "Requerente")
 *  e, se o nome em CAIXA ALTA vier depois de palavras comuns ("Ontem JOÃO DA SILVA"), fica so com ele. */
function limparNome(n) {
  let w = nfc(n).replace(/\s+/g, ' ').trim().replace(/[*_]+$/, '').split(' ');
  const sufixo = w.length && SUFIXO_RE.test(w[w.length - 1]);
  // trecho final em maiusculas (>= 2 palavras) depois de palavras que nao sao: so ele e o nome
  let k = w.length; while (k > 0 && (maiusc(w[k - 1]) || CONECTOR_RE.test(w[k - 1]) || SUFIXO_RE.test(w[k - 1]))) k--;
  if (k > 0 && w.slice(k).filter((x) => !CONECTOR_RE.test(x)).length >= 2) w = w.slice(k);
  while (w.length && (TRATAMENTO.test(w[0] + ' ') || NAO_NOME.test(w[0]) || CONECTOR_RE.test(w[0]))) w.shift();
  if (!sufixo && w.length && /\.$/.test(w[w.length - 1]) && w[w.length - 1].replace(/\./g, '').length > 1) w[w.length - 1] = w[w.length - 1].slice(0, -1);
  const pal = w.filter((x) => !CONECTOR_RE.test(x) && !SUFIXO_RE.test(x));
  if (pal.length < 2 || pal.filter((x) => x.replace(/[^\p{L}]/gu, '').length >= 2).length < 2) return null;
  return w.join(' ');
}
/** Candidatos encontrados no texto: [{tipo, ini, fim, valor}] (nomes so pela heuristica). */
function detectar(texto) {
  const out = [];
  for (const d of DETECTORES) {
    d.re.lastIndex = 0; let m;
    while ((m = d.re.exec(texto))) {
      let v = m[0], ini = m.index;
      if (d.grupo != null) {
        const g = [].concat(d.grupo).find((k) => m[k] != null); if (g == null) continue;
        v = m[g]; ini = m.index + m[0].lastIndexOf(v);
      }
      if (d.valido && !d.valido(v)) continue;
      out.push({ tipo: d.tipo, ini, fim: ini + v.length, valor: v });
    }
  }
  for (const re of DETECTORES_NOME) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(texto))) {
      const bruto = m[1]; const nome = limparNome(bruto); if (!nome) continue;
      // valor normalizado (espacos simples); a posicao serve so para ordenar os marcadores novos
      const ini = m.index + m[0].indexOf(bruto) + Math.max(0, bruto.indexOf(nome.split(' ')[0]));
      out.push({ tipo: 'nome', ini, fim: ini + nome.length, valor: nome });
    }
  }
  return out;
}

// ---------- entradas ----------
function acharEntrada(t, tipo, chave) { return t.entradas.find((e) => e.tipo === tipo && (e.chave === chave || (e.chaves || []).includes(chave))); }
function criarEntrada(t, tipo, original) {
  const pref = TIPOS[tipo]; const n = t.contadores[pref] || 0; t.contadores[pref] = n + 1;
  const id = pref + '_' + (tipo === 'nome' ? letras(n) : String(n + 1));
  const e = { id, tipo, chave: chaveDe(tipo, original), original: nfc(original), formas: [nfc(original)] };
  t.entradas.push(e); return e;
}
/** Acrescenta um dado informado pelo advogado. "Joao da Silva|Silva" => mesma parte, com variantes. */
function adicionar(t, tipo, valor) {
  const alts = String(valor).split('|').map((s) => nfc(s).replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!alts.length) return null;
  let e = acharEntrada(t, tipo, chaveDe(tipo, alts[0]));
  if (!e) e = criarEntrada(t, tipo, alts[0]);
  for (const a of alts.slice(1)) {
    const k = chaveDe(tipo, a);
    if (k !== e.chave && !(e.chaves || []).includes(k)) { e.chaves = (e.chaves || []).concat([k]); }
    if (!e.formas.includes(a)) e.formas.push(a);
  }
  return e;
}
const marcadorDe = (e, i) => '[' + e.id + (i > 0 ? '#' + (i + 1) : '') + ']';

/** Ocorrencias (no texto) das entradas de nome/endereco da tabela, por comparacao dobrada. */
function ocorrenciasTabela(texto, t) {
  const dob = dobrar(texto); const out = [];
  const letra = /[\p{L}\p{N}]/u;
  for (const e of t.entradas) {
    if (e.tipo !== 'nome' && e.tipo !== 'endereco') continue;
    // chave (sem pontuacao final) e cada grafia conhecida (com ela): a mais longa vence na sobreposicao
    const ks = Array.from(new Set([e.chave].concat(e.chaves || [], e.formas.map(chaveNome))));
    for (const k of ks) {
      if (!k || k.length < 3) continue;
      let p = 0;
      while ((p = dob.s.indexOf(k, p)) >= 0) {
        const fimD = p + k.length;
        if ((p > 0 && letra.test(dob.s[p - 1])) || (fimD < dob.s.length && letra.test(dob.s[fimD]))) { p += 1; continue; }
        const ini = dob.ini[p]; const fim = fimD < dob.s.length ? dob.ini[fimD] : dob.fim;
        let f = fim; while (f > ini && /\s/.test(texto[f - 1])) f--; // espaco dobrado no fim nao entra
        out.push({ tipo: e.tipo, ini, fim: f, valor: texto.slice(ini, f), entrada: e });
        p = fimD;
      }
    }
  }
  return out;
}

/**
 * Troca dados reais por marcadores. opcoes.detectar (padrao true): cria entradas novas para o que
 * os detectores acharem. Devolve { texto, trocas: [{id, tipo}], novas: [ids] } e altera t.
 * A deteccao roda no texto em NFC (nomes acentuados vindos do macOS chegam em NFD); a localizacao
 * no texto original e por digitos (documentos) ou pela comparacao dobrada (nomes, enderecos).
 */
function anonimizarTexto(texto, t, opcoes) {
  opcoes = opcoes || {};
  const detectarNovos = opcoes.detectar !== false;
  texto = String(texto);
  const novas = [];
  // 1) entradas novas na ordem de aparicao (marcadores seguem a ordem do texto)
  const cand = detectar(nfc(texto)).sort((a, b) => a.ini - b.ini || (b.fim - b.ini) - (a.fim - a.ini));
  for (const x of cand) {
    if (acharEntrada(t, x.tipo, chaveDe(x.tipo, x.valor)) || !detectarNovos) continue;
    novas.push(criarEntrada(t, x.tipo, x.valor).id);
  }
  // 1b) documentos/contatos: posicoes no texto original (ASCII: NFC e NFD coincidem)
  const docs = (texto === nfc(texto) ? cand : detectar(texto)).filter((x) => x.tipo !== 'nome' && x.tipo !== 'endereco');
  for (const x of docs) x.entrada = acharEntrada(t, x.tipo, chaveDe(x.tipo, x.valor));
  // 2) ocorrencias de nomes/enderecos ja na tabela (inclui os recem-criados)
  const todos = docs.filter((x) => x.entrada).concat(ocorrenciasTabela(texto, t));
  // 3) sem sobreposicao: comeca antes; empate, o mais longo
  todos.sort((a, b) => a.ini - b.ini || (b.fim - b.ini) - (a.fim - a.ini));
  const esc = []; let fimUlt = -1;
  for (const x of todos) { if (x.ini >= fimUlt && x.fim > x.ini) { esc.push(x); fimUlt = x.fim; } }
  // 4) monta a saida guardando a grafia exata (variante => #n)
  let out = ''; let ult = 0; const trocas = [];
  for (const x of esc) {
    const e = x.entrada; const forma = texto.slice(x.ini, x.fim);
    let i = e.formas.indexOf(forma);
    if (i < 0) { e.formas.push(forma); i = e.formas.length - 1; }
    out += texto.slice(ult, x.ini) + marcadorDe(e, i); ult = x.fim;
    trocas.push({ id: e.id, tipo: e.tipo });
  }
  out += texto.slice(ult);
  return { texto: out, trocas, novas };
}

/** Marcadores no texto: [{marcador, id, variante, linha}] */
function marcadores(texto) {
  const out = []; const re = new RegExp(MARCADOR.source, 'gi'); let m;
  const s = String(texto); let linha = 1, pos = 0;
  while ((m = re.exec(s))) {
    for (; pos < m.index; pos++) if (s[pos] === '\n') linha++;
    out.push({ marcador: m[0], id: m[1].toUpperCase() + '_' + m[2].toUpperCase(), variante: m[3] ? parseInt(m[3], 10) : 1, linha, ini: m.index, fim: m.index + m[0].length });
  }
  return out;
}
/** Devolve os dados reais. Marcador sem correspondencia fica como esta e vai para "orfaos" (nunca inventa). */
function reverterTexto(texto, t) {
  texto = String(texto);
  const ms = marcadores(texto); const orfaos = []; let out = ''; let ult = 0; let trocados = 0;
  for (const m of ms) {
    const e = t && t.entradas.find((x) => x.id === m.id);
    const forma = e && e.formas[m.variante - 1];
    out += texto.slice(ult, m.ini);
    if (forma == null) { out += m.marcador; orfaos.push(m); } else { out += forma; trocados++; }
    ult = m.fim;
  }
  out += texto.slice(ult);
  return { texto: out, trocados, orfaos };
}

/** Todos os valores reais (todas as grafias) da tabela, para as guardas. */
function valoresReais(t) {
  const v = [];
  for (const e of (t && t.entradas) || []) for (const f of e.formas) v.push({ tipo: e.tipo, valor: f });
  return v;
}
/** O texto contem algum dado real da tabela? (comparacao dobrada para nomes; digitos para documentos) */
function contemReal(texto, t) {
  if (!t || !t.entradas.length || !texto) return null;
  texto = String(texto);
  const dob = dobrarRapido(texto); let semSep = null;
  const letra = /[\p{L}\p{N}]/u;
  for (const e of t.entradas) {
    if (e.tipo === 'nome' || e.tipo === 'endereco' || e.tipo === 'email') {
      for (const k of [e.chave].concat(e.chaves || []).map((x) => e.tipo === 'email' ? dobrar(x).s : x)) {
        if (!k || k.length < 4) continue;
        let p = 0;
        while ((p = dob.indexOf(k, p)) >= 0) {
          const f = p + k.length;
          if (!(p > 0 && letra.test(dob[p - 1])) && !(f < dob.length && letra.test(dob[f]))) return e;
          p += 1;
        }
      }
    } else if (e.chave && e.chave.length >= 8) {
      // documentos/telefones: a grafia exata ou a sequencia de digitos isolada
      if (e.formas.some((f) => texto.includes(f))) return e;
      if (semSep == null) semSep = texto.replace(/[.\-/()]/g, '');
      if (/^\d+X?$/.test(e.chave) && new RegExp('(?<!\\d)' + e.chave + '(?!\\d)').test(semSep)) return e;
    }
  }
  return null;
}

/** Casos com tabela (ativa ou nao) no escritorio. */
function casosComTabela(esc) {
  const out = [];
  try {
    for (const k of require('./casos').listar(esc)) if (fs.existsSync(tabelaDe(k.pasta))) out.push(k);
  } catch (e) { /* */ }
  return out;
}

/** Caminho da copia anonimizada de um arquivo do caso (ou de fora dele). */
function caminhoCopia(arquivo, pastaCaso) {
  const abs = path.resolve(arquivo);
  let rel = c.dentroDe(nfc(abs), nfc(pastaCaso)) ? path.relative(pastaCaso, abs) : path.basename(abs);
  if (!TEXTO_EXT.test(rel)) rel += '.md';
  return path.join(copiasDe(pastaCaso), rel);
}
function lerParaAnonimizar(arquivo) {
  if (TEXTO_EXT.test(arquivo)) { const t = fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, ''); return { texto: t }; }
  if (CONVERTE_EXT.test(arquivo)) {
    const r = require('./extrair').extrairTexto(arquivo);
    if (!r || !r.texto || r.semTexto) return { erro: 'sem texto legível (' + ((r && r.motivo) || 'formato') + ')' };
    return { texto: r.texto };
  }
  return { erro: 'formato não suportado (use .md, .txt, .pdf, .docx ou .html)' };
}

function resumoContagem(trocas) {
  const porTipo = {};
  for (const x of trocas) { porTipo[x.tipo] = porTipo[x.tipo] || new Set(); porTipo[x.tipo].add(x.id); }
  const partes = Object.keys(TIPOS).filter((k) => porTipo[k]).map((k) => { const n = porTipo[k].size; return n + ' ' + ROTULO[k][n === 1 ? 0 : 1]; });
  if (!partes.length) return 'nenhum dado pessoal encontrado';
  return (partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes[0]) + ' ' + (partes.length === 1 && Object.values(porTipo)[0].size === 1 ? 'virou marcador' : 'viraram marcadores');
}

// ---------- guardas (hooks) ----------
const LIMITE_LEITURA = 3 * 1024 * 1024;
const TEXTO_LEGIVEL = /\.(md|txt|markdown|csv|json|html?|xml|rtf)$/i;
const MSG_TABELA = 'A tabela de anonimização guarda os dados REAIS do cliente: só o próprio /anonimizar mexe nela, e o assistente nunca a lê nem copia. Trabalhe com os marcadores ([PARTE_A], [CPF_1]…) e, no fim, use /anonimizar reverter.';

/** Leitura de arquivo (Read): {decisao:'deny'|'ask', motivo} ou null. Fail-open: erro => null. */
function avaliarLeitura(arquivo, esc) {
  try {
    if (!arquivo) return null;
    if (ehDaTabela(arquivo)) return { decisao: 'deny', motivo: MSG_TABELA };
    const pasta = pastaDoCaso(arquivo, esc); if (!pasta) return null;
    const t = lerTabela(pasta); if (!t || t.ativa === false) return null;
    if (dentroDasCopias(arquivo, pasta) || !fs.existsSync(arquivo) || !fs.statSync(arquivo).isFile()) return null;
    const st = fs.statSync(arquivo);
    let real = true;
    if (TEXTO_LEGIVEL.test(arquivo) && st.size <= LIMITE_LEITURA) real = !!contemReal(fs.readFileSync(arquivo, 'utf8'), t);
    if (!real) return null;
    const rel = path.relative(pasta, path.resolve(arquivo)).split(path.sep).join('/');
    const doc = t.documentos && t.documentos[rel];
    const copia = doc && fs.existsSync(path.join(pasta, doc.copia)) ? doc.copia : null;
    return { decisao: 'ask', caso: path.basename(pasta), copia, motivo: 'o caso "' + path.basename(pasta) + '" está ANONIMIZADO e este arquivo tem os dados reais do cliente (nomes, CPF…). ' + (copia ? 'A cópia sem esses dados é ' + copia + '.' : 'As cópias sem esses dados ficam em ' + PASTA_COPIAS + '/ (/anonimizar aplicar gera).') + ' Só aperte Sim se você quer que eu leia o ORIGINAL.' };
  } catch (e) { c.log('erros', 'anonimizar avaliarLeitura: ' + e.message); return null; }
}
/** Busca (Grep) em modo conteudo que passa por caso anonimizado fora das copias => ask; na tabela => deny. */
function avaliarBusca(inp, cwd, esc) {
  try {
    const alvo = path.resolve(cwd || '.', String((inp && inp.path) || '.'));
    if (ehDaTabela(alvo) || ehDaTabela((inp && inp.glob) || '')) return { decisao: 'deny', motivo: MSG_TABELA };
    const conteudo = inp && (inp.output_mode === 'content' || inp['-A'] || inp['-B'] || inp['-C'] || inp.context);
    if (!conteudo) return null; // so nomes de arquivo/contagem: nao mostra dado
    const pasta = pastaDoCaso(alvo, esc);
    if (pasta) { const t = lerTabela(pasta); if (t && t.ativa !== false && !dentroDasCopias(alvo, pasta)) return { decisao: 'ask', motivo: 'a busca passa pelo caso ANONIMIZADO "' + path.basename(pasta) + '" fora das cópias, e o resultado mostraria trechos com os dados reais do cliente. O normal é buscar só em ' + PASTA_COPIAS + '/. Só aperte Sim se quer buscar nos originais.' }; }
    const afetados = casosComTabela(esc).filter((k) => c.dentroDe(nfc(k.pasta), nfc(alvo)) && ativa(k.pasta));
    if (afetados.length) return { decisao: 'ask', motivo: 'a busca inclui ' + (afetados.length > 1 ? afetados.length + ' casos ANONIMIZADOS' : 'o caso ANONIMIZADO "' + afetados[0].nome + '"') + ', e o resultado mostraria trechos com os dados reais. Restrinja a busca (ex.: só a pasta ' + PASTA_COPIAS + '/ do caso) ou aperte Sim se quer mesmo assim.' };
    return null;
  } catch (e) { c.log('erros', 'anonimizar avaliarBusca: ' + e.message); return null; }
}
/** Comando de terminal que toca a pasta da tabela => deny (o proprio anonimizar.js nunca precisa do caminho). */
function avaliarComando(cmd) {
  return /_anonimizacao/i.test(nfc(String(cmd || ''))) ? { decisao: 'deny', motivo: MSG_TABELA } : null;
}
/** Gravacao: na pasta da tabela, ou conteudo de tabela fora dela => deny. Dado real em memoria/harness => deny. */
function avaliarGravacao(arquivo, texto, ehHarness, esc) {
  try {
    if (ehDaTabela(arquivo)) return { decisao: 'deny', motivo: MSG_TABELA };
    if (texto && (texto.includes(ASSINATURA) || /"formas"\s*:\s*\[/.test(texto) && /\[(?:PARTE|CPF|CNPJ|PROCESSO)_/.test(texto) && /"original"\s*:/.test(texto))) return { decisao: 'deny', motivo: 'Isso parece a tabela de anonimização (ou um pedaço dela) indo para fora da pasta do caso. Ela só existe em <caso>/' + PASTA_TABELA + '/ e nunca é copiada. ' + MSG_TABELA };
    if (ehHarness && texto) {
      for (const k of casosComTabela(esc)) {
        const e = contemReal(texto, lerTabela(k.pasta));
        if (e) return { decisao: 'deny', motivo: 'Esse texto tem um dado real (' + (ROTULO[e.tipo] || [e.tipo])[0] + ', [' + e.id + ']) do caso anonimizado "' + k.nome + '". Arquivos de configuração e memória do assistente (CLAUDE.md, skills, memória automática, MEMORIA/, perfil de escrita) nunca recebem dados de clientes: use o marcador ou um termo genérico ([CLIENTE]).' };
      }
    }
    return null;
  } catch (e) { c.log('erros', 'anonimizar avaliarGravacao: ' + e.message); return null; }
}

module.exports = {
  PASTA_TABELA, PASTA_COPIAS, ASSINATURA, TIPOS, MARCADOR, TEXTO_EXT, CONVERTE_EXT,
  tabelaDe, copiasDe, pastaDoCaso, ehDaTabela, dentroDasCopias, novaTabela, lerTabela, gravarTabela, ativa,
  dobrar, chaveDe, cpfValido, cnpjValido, detectar, adicionar, anonimizarTexto, reverterTexto, marcadores,
  valoresReais, contemReal, casosComTabela, caminhoCopia, lerParaAnonimizar, resumoContagem, limparNome,
  avaliarLeitura, avaliarBusca, avaliarComando, avaliarGravacao,
};
