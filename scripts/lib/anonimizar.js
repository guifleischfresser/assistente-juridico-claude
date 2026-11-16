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
// ---------- nomes sem rotulo: dicionario local de prenomes/sobrenomes (scripts/lib/dados) ----------
// Candidato = prenome conhecido + prenomes/sobrenomes (conectores da/de/do/dos/das/e) ate o ultimo sobrenome
// conhecido, na mesma linha, em Title Case ou CAIXA ALTA. Lookup por Set (sem regex gigante).
const DIR_DADOS = path.join(__dirname, 'dados');
let DIC = null;
function dicionario() {
  if (DIC) return DIC;
  const ler = (n) => {
    try { return new Set(fs.readFileSync(path.join(DIR_DADOS, n), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map(dobrarRapido)); } catch (e) { return new Set(); }
  };
  DIC = { prenomes: ler('prenomes.txt'), sobrenomes: ler('sobrenomes.txt') };
  DIC.ok = DIC.prenomes.size > 0 && DIC.sobrenomes.size > 0;
  return DIC;
}
const dicionarioDisponivel = () => dicionario().ok;
const CONECTORES_DIC = new Set(['da', 'de', 'do', 'dos', 'das', 'e']);
// palavra imediatamente antes do nome que indica magistrado (Rel. Min. Fulano), lugar (Sao Jose) ou
// nome de lei/instituto/logradouro (Lei Maria da Penha, Rua Joao Silva, Fundacao Getulio Vargas)
const ANTES_MAGISTRADO = new Set(['rel', 'relator', 'relatora', 'relat', 'min', 'ministro', 'ministra', 'mins', 'des', 'desa', 'desembargador', 'desembargadora', 'desemb', 'juiz', 'juiza', 'conselheiro', 'conselheira', 'revisor', 'revisora', 'presidente', 'vice-presidente', 'redator', 'redatora']);
const MEIO_MAGISTRADO = new Set(['direito', 'federal', 'substituto', 'substituta', 'convocado', 'convocada', 'titular', 'auxiliar', 'leigo', 'leiga', 'relator', 'relatora', 'designado', 'designada', 'p', 'para', 'acordao', 'sr', 'sra', 'exmo', 'exma']);
const ANTES_LUGAR = new Set(['sao', 'santa', 'santo', 'santos', 'senhor', 'senhora', 'nossa', 'bom', 'dom', 'frei', 'padre', 'irma', 'madre', 'beato', 'beata',
  'lei', 'leis', 'instituto', 'fundacao', 'rua', 'r', 'avenida', 'av', 'alameda', 'al', 'travessa', 'tv', 'praca', 'rodovia', 'rod', 'estrada', 'largo', 'viaduto', 'ponte', 'escola', 'colegio', 'universidade', 'faculdade', 'hospital', 'edificio', 'ed', 'condominio', 'residencial', 'shopping', 'parque', 'estadio', 'aeroporto', 'ginasio', 'teatro', 'museu', 'biblioteca', 'bairro', 'vila', 'jardim', 'cidade', 'municipio', 'comarca', 'premio', 'teorema', 'programa', 'projeto', 'operacao', 'forum', 'foro', 'distrito', 'estado', 'capela', 'igreja', 'paroquia', 'creche', 'centro', 'loteamento', 'conjunto', 'sitio', 'fazenda', 'chacara', 'servidao', 'ladeira', 'beco', 'vale', 'morro', 'porto', 'catedral', 'santuario', 'tribunal', 'camara', 'turma', 'secao', 'sala', 'auditorio', 'plenario', 'medalha', 'ordem', 'cadeira', 'catedra', 'campus', 'termo', 'comunidade', 'associacao', 'sociedade', 'clube', 'grupo', 'instituicao', 'empresa', 'banco', 'hotel', 'pousada', 'mercado', 'supermercado', 'farmacia', 'clinica', 'laboratorio', 'policlinica', 'maternidade', 'ubs', 'upa', 'posto']);
// candidatos inteiros que sao lugar, lei ou figura historica (comparacao pela chave inteira, nao por pedaco)
const EXCECOES_DIC = new Set(['joao pessoa', 'maria da penha', 'getulio vargas', 'rui barbosa', 'ruy barbosa', 'oswaldo cruz', 'osvaldo cruz', 'carlos chagas', 'jose bonifacio', 'pedro alvares cabral', 'teixeira de freitas', 'mario covas', 'paulo afonso', 'presidente prudente', 'juscelino kubitschek', 'leopoldo de bulhoes', 'joaquim nabuco', 'tancredo neves', 'ulysses guimaraes', 'ulisses guimaraes', 'marechal deodoro', 'benjamin constant', 'nilo pecanha', 'washington luis', 'afonso pena', 'epitacio pessoa', 'campos sales', 'prudente de morais', 'floriano peixoto', 'tome de sousa', 'duque de caxias', 'francisco morato', 'jose de alencar', 'machado de assis', 'castro alves', 'olavo bilac', 'carlos drummond de andrade', 'cecilia meireles', 'clarice lispector', 'monteiro lobato', 'santos dumont']);
const PARE_DIC = /^(autora?|reu|re|requerente|requerid[oa]|reclamante|reclamad[oa]|exequente|executad[oa]|apelante|apelad[oa]|agravante|agravad[oa]|vara|tribunal|turma|camara|secao|comarca|juizo|juiz|juiza|forum|estado|municipio|uniao|republica|federal|estadual|justica|ministerio|ministro|ministra|desembargador[a]?|relator[a]?|poder|processo|autos|acao|recurso|lei|codigo|sumula|tema|ltda|eireli|epp|me|sa|cpf|cnpj|rg|oab|cep|banco|empresa|governo|prefeitura|secretaria|delegacia|policia|cartorio|tabelionato|registro|edital|sentenca|decisao|despacho|acordao|peticao|contestacao|excelentissim[oa]|senhor[a]?|doutor[a]?|dr|dra|sr|sra)$/;
const ABREV_FIM = new Set(['rel', 'min', 'des', 'desa', 'j', 'julg', 'dje', 'dj', 'pub', 'ag', 'agrg', 'agint', 'resp', 'aresp', 'n', 'no', 'nº', 'art', 'arts', 'inc', 'al', 'p', 'pp', 'fls', 'v', 'cf', 'ed', 'red', 'proc', 'rec', 'emb', 'decl', 'ac', 'ap', 'civ', 'crim', 'cc', 'cpc', 'sr', 'sra', 'dr', 'dra', 'exmo', 'exma', 'ilmo', 'ilma', 'stj', 'stf', 'tj', 'trf', 'trt', 'tst']);
const TOKEN_DIC = /[\p{L}][\p{L}\p{M}'’-]*/gu;
const temMaiuscInicial = (w) => /^\p{Lu}/u.test(w);
/** Trechos de citacao de julgado (lib/citacoes) estendidos ate o fim do bloco: "REsp 1.234/SP, Rel. Min. X, 3ª T., j. ..." */
function trechosCitacao(texto) {
  let padroes = [];
  try { padroes = require('./citacoes').PADROES.filter((p) => p.tipo === 'jurisprudencia'); } catch (e) { return []; }
  const out = [];
  for (const p of padroes) {
    const re = new RegExp(p.re.source, p.re.flags.includes('g') ? p.re.flags : p.re.flags + 'g'); let m;
    while ((m = re.exec(texto))) {
      const ini = m.index; const lim = Math.min(texto.length, ini + m[0].length + 300);
      let fim = ini + m[0].length;
      for (; fim < lim; fim++) {
        const ch = texto[fim];
        if (ch === ')' || ch === ']' || ch === ';' || ch === '\n') break;
        if (ch === '.' && /\s/.test(texto[fim + 1] || ' ')) {
          const ant = (texto.slice(Math.max(ini, fim - 12), fim).match(/([\p{L}\d]+)$/u) || [])[1] || '';
          if (/^\d+$/.test(ant) || (ant.length >= 4 && !ABREV_FIM.has(dobrarRapido(ant)))) { if (/^\s+\p{Lu}/u.test(texto.slice(fim + 1, fim + 4)) || /^\d+$/.test(ant)) break; }
        }
      }
      out.push([ini, fim]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}
/** Chaves dobradas dos nomes do proprio advogado e do escritorio (config), sem tratamento. */
function nomesProprios(opcoes) {
  let lista = opcoes && opcoes.proprios;
  if (!lista) { try { const cf = c.config(); lista = [cf.nome, cf.nomeCurto, cf.nomeEscritorio, cf.escritorioNome]; } catch (e) { lista = []; } }
  return lista.filter((x) => typeof x === 'string' && x.trim()).map((x) => dobrarRapido(nfc(x).replace(TRATAMENTO, '').trim()).replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim()).filter((k) => k.length >= 3);
}
const contemPalavras = (maior, menor) => (' ' + maior + ' ').includes(' ' + menor + ' ');
/** Nomes soltos no texto achados pelo dicionario: [{tipo:'nome', ini, fim, valor, dicionario:true}]. */
function detectarDicionario(texto, opcoes) {
  const D = dicionario(); if (!D.ok) return [];
  const proprios = nomesProprios(opcoes);
  const cits = trechosCitacao(texto);
  const citU = []; for (const x of cits) { const u = citU[citU.length - 1]; if (u && x[0] <= u[1]) u[1] = Math.max(u[1], x[1]); else citU.push(x.slice()); }
  let pc = 0; // candidatos saem em ordem de posicao: ponteiro em vez de varrer tudo
  const dentroCitacao = (ini, fim) => { while (pc < citU.length && citU[pc][1] <= ini) pc++; return pc < citU.length && citU[pc][0] <= ini && fim <= citU[pc][1]; };
  // tokens com o espaco que os separa (para nao atravessar linha nem pontuacao)
  const tk = []; TOKEN_DIC.lastIndex = 0; let m;
  while ((m = TOKEN_DIC.exec(texto))) {
    const w = m[0]; const cap = temMaiuscInicial(w);
    tk.push({ w, ini: m.index, fim: m.index + w.length, cap, k: cap || w.length <= 3 ? dobrarRapido(w) : null });
  }
  const gap = (i) => texto.slice(tk[i - 1].fim, tk[i].ini); // espaco entre o token i-1 e o i
  const juntos = (i) => i > 0 && /^[ \t]+$/.test(gap(i)) || (i > 0 && tk[i - 1].w.length === 1 && tk[i - 1].cap && /^\.[ \t]+$/.test(gap(i))); // "João C. Silva"
  const conector = (t) => !t.cap || t.w === t.w.toUpperCase() ? CONECTORES_DIC.has(t.k || dobrarRapido(t.w)) : false;
  // palavra anterior (mesma linha), pulando conectores; devolve o indice ou -1
  const anterior = (i) => {
    let j = i - 1;
    while (j >= 0) {
      const g = gap(j + 1); if (/\n/.test(g) || /[,;()\[\]"“”]/.test(g)) return -1;
      if (CONECTORES_DIC.has(tk[j].k || dobrarRapido(tk[j].w))) { j--; continue; }
      return j;
    }
    return -1;
  };
  const excluidoPeloContexto = (i) => {
    const j = anterior(i); if (j < 0) return false;
    const kj = tk[j].k || dobrarRapido(tk[j].w);
    if (ANTES_LUGAR.has(kj)) return true;
    if (ANTES_MAGISTRADO.has(kj)) return true;
    if (MEIO_MAGISTRADO.has(kj)) { // "Juiz de Direito X", "Desembargador Federal X", "Rel. p/ acórdão Min. X"
      let q = j;
      for (let n = 0; n < 4; n++) { q = anterior(q); if (q < 0) return false; const kq = tk[q].k || dobrarRapido(tk[q].w); if (ANTES_MAGISTRADO.has(kq)) return true; if (!MEIO_MAGISTRADO.has(kq)) return false; }
    }
    return false;
  };
  const out = [];
  for (let i = 0; i < tk.length; i++) {
    const t0 = tk[i];
    if (!t0.cap || !D.prenomes.has(t0.k)) continue;
    // estende pela mesma linha: nomes conhecidos, conectores, iniciais e ate 2 palavras desconhecidas seguidas
    let j = i + 1; let ultSob = -1; let desconh = 0; const sobs = [];
    while (j < tk.length && juntos(j) && j - i < 10) {
      const t = tk[j];
      if (conector(t)) {
        const prox = tk[j + 1];
        if (!prox || !juntos(j + 1) || !prox.cap) break;
        if ((t.k || dobrarRapido(t.w)) === 'e' && !(D.sobrenomes.has(prox.k) && !D.prenomes.has(prox.k))) break; // "Maria Souza e Pedro Lima" = duas pessoas
        j++; continue;
      }
      if (!t.cap || PARE_DIC.test(t.k)) break;
      if (D.sobrenomes.has(t.k)) { ultSob = j; sobs.push(t.k); desconh = 0; } else if (D.prenomes.has(t.k)) { desconh = 0; } else if (t.w.length === 1 || ++desconh <= 2) { /* inicial ou desconhecida */ } else break;
      j++;
    }
    if (ultSob < 0) continue;
    // so sobrenomes que tambem sao prenomes ("Ana Rosa") e pouco: exige 3 palavras
    if (sobs.every((k) => D.prenomes.has(k)) && tk.slice(i, ultSob + 1).filter((t) => t.cap).length < 3) continue;
    const ini = t0.ini, fim = tk[ultSob].fim;
    const valor = texto.slice(ini, fim).replace(/[ \t]+/g, ' ');
    const chave = dobrarRapido(valor);
    const pula = EXCECOES_DIC.has(chave) || excluidoPeloContexto(i) || dentroCitacao(ini, fim) || proprios.some((p) => contemPalavras(p, chave) || contemPalavras(chave, p));
    if (!pula) out.push({ tipo: 'nome', ini, fim, valor: nfc(valor), dicionario: true });
    i = ultSob; // o proximo candidato comeca depois deste
  }
  return out;
}

/** Candidatos encontrados no texto: [{tipo, ini, fim, valor}]. opcoes.dicionario === false: so os
 *  detectores por rotulo/qualificacao/sufixo (saida identica a de antes do dicionario). */
function detectar(texto, opcoes) {
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
  if (opcoes && opcoes.dicionario === false) return out;
  // dicionario: so o que nenhum outro detector pegou (nao muda o que ja funcionava)
  const uniao = []; // trechos ja ocupados, fundidos e em ordem
  for (const o of out.slice().sort((a, b) => a.ini - b.ini)) {
    const u = uniao[uniao.length - 1];
    if (u && o.ini <= u[1]) u[1] = Math.max(u[1], o.fim); else uniao.push([o.ini, o.fim]);
  }
  let p = 0;
  for (const x of detectarDicionario(texto, opcoes)) { // em ordem de posicao
    while (p < uniao.length && uniao[p][1] <= x.ini) p++;
    if (p < uniao.length && uniao[p][0] < x.fim) continue;
    out.push(x);
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
  delete e.origem; // informado pelo advogado: deixa de ser "achado pelo dicionario"
  for (const a of alts.slice(1)) {
    const k = chaveDe(tipo, a);
    if (k !== e.chave && !(e.chaves || []).includes(k)) { e.chaves = (e.chaves || []).concat([k]); }
    if (!e.formas.includes(a)) e.formas.push(a);
  }
  return e;
}
const marcadorDe = (e, i) => '[' + e.id + (i > 0 ? '#' + (i + 1) : '') + ']';

/** Ocorrencias (no texto) das entradas de nome/endereco da tabela, por comparacao dobrada.
 *  Uma varredura so pelas palavras do texto, com as chaves indexadas pela 1a palavra (com milhares de
 *  nomes na tabela, um indexOf por chave ficava lento). Mesmo resultado e mesma ordem do indexOf. */
function ocorrenciasTabela(texto, t, pular) {
  const dob = dobrar(texto); const s = dob.s; const achados = [];
  const letra = /[\p{L}\p{N}]/u;
  const porPalavra = new Map(); const lentas = [];
  t.entradas.forEach((e, ei) => {
    if (e.tipo !== 'nome' && e.tipo !== 'endereco') return;
    if (pular && pular(e)) return;
    // chave (sem pontuacao final) e cada grafia conhecida (com ela): a mais longa vence na sobreposicao
    const ks = Array.from(new Set([e.chave].concat(e.chaves || [], e.formas.map(chaveNome))));
    ks.forEach((k, ki) => {
      if (!k || k.length < 3) return;
      const it = { e, ei, ki, k, ult: 0 }; const m = k.match(/^[\p{L}\p{N}]+/u);
      if (m) { if (!porPalavra.has(m[0])) porPalavra.set(m[0], []); porPalavra.get(m[0]).push(it); } else lentas.push(it);
    });
  });
  const achou = (it, p) => {
    const fimD = p + it.k.length;
    const ini = dob.ini[p]; const fim = fimD < s.length ? dob.ini[fimD] : dob.fim;
    let f = fim; while (f > ini && /\s/.test(texto[f - 1])) f--; // espaco dobrado no fim nao entra
    achados.push({ ei: it.ei, ki: it.ki, p, x: { tipo: it.e.tipo, ini, fim: f, valor: texto.slice(ini, f), entrada: it.e } });
    it.ult = fimD;
  };
  if (porPalavra.size) {
    const re = /[\p{L}\p{N}]+/gu; let m;
    while ((m = re.exec(s))) {
      const lista = porPalavra.get(m[0]); if (!lista) continue;
      const p = m.index;
      for (const it of lista) {
        if (p < it.ult || !s.startsWith(it.k, p)) continue;
        const fimD = p + it.k.length;
        if (fimD < s.length && letra.test(s[fimD])) continue;
        achou(it, p);
      }
    }
  }
  for (const it of lentas) { // chave que nao comeca por letra/digito: busca direta
    let p = 0;
    while ((p = s.indexOf(it.k, p)) >= 0) {
      const fimD = p + it.k.length;
      if ((p > 0 && letra.test(s[p - 1])) || (fimD < s.length && letra.test(s[fimD]))) { p += 1; continue; }
      achou(it, p); p = fimD;
    }
  }
  achados.sort((a, b) => a.ei - b.ei || a.ki - b.ki || a.p - b.p);
  return achados.map((a) => a.x);
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
  const comDicionario = opcoes.dicionario !== false;
  const opDet = { dicionario: detectarNovos && comDicionario, proprios: opcoes.proprios };
  texto = String(texto);
  const novas = [];
  // 1) entradas novas na ordem de aparicao (marcadores seguem a ordem do texto)
  const cand = detectar(nfc(texto), opDet).sort((a, b) => a.ini - b.ini || (b.fim - b.ini) - (a.fim - a.ini));
  const confirmadas = new Set(); // entradas que algum detector por rotulo achou neste texto
  for (const x of cand) {
    const ja = acharEntrada(t, x.tipo, chaveDe(x.tipo, x.valor));
    if (ja) { if (!x.dicionario) { confirmadas.add(ja); delete ja.origem; } continue; } // com rotulo: confirmado
    if (!detectarNovos) continue;
    const e = criarEntrada(t, x.tipo, x.valor);
    if (x.dicionario) e.origem = 'dicionario'; // campo opcional (tabela versao 1 continua compativel)
    else confirmadas.add(e);
    novas.push(e.id);
  }
  // 1b) documentos/contatos: posicoes no texto original (ASCII: NFC e NFD coincidem)
  const docs = (texto === nfc(texto) ? cand : detectar(texto, { dicionario: false })).filter((x) => x.tipo !== 'nome' && x.tipo !== 'endereco');
  for (const x of docs) x.entrada = acharEntrada(t, x.tipo, chaveDe(x.tipo, x.valor));
  // 2) ocorrencias de nomes/enderecos ja na tabela (inclui os recem-criados). Sem dicionario, o que so
  //    ele tinha achado (e ninguem confirmou) fica como estava: a saida e a mesma de antes do dicionario.
  const pular = comDicionario ? null : (e) => e.origem === 'dicionario' && !confirmadas.has(e);
  const todos = docs.filter((x) => x.entrada).concat(ocorrenciasTabela(texto, t, pular));
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
    trocas.push(e.origem === 'dicionario' ? { id: e.id, tipo: e.tipo, dicionario: true } : { id: e.id, tipo: e.tipo });
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
/** "N nome(s) achado(s) pelo dicionário — confira na cópia" (sem o nome real), ou '' se nenhum. */
function resumoDicionario(trocas) {
  const n = new Set(trocas.filter((x) => x.dicionario).map((x) => x.id)).size;
  return n ? n + ' nome(s) achado(s) pelo dicionário — confira na cópia' : '';
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
  valoresReais, contemReal, casosComTabela, caminhoCopia, lerParaAnonimizar, resumoContagem, resumoDicionario, limparNome,
  detectarDicionario, dicionarioDisponivel, DIR_DADOS,
  avaliarLeitura, avaliarBusca, avaliarComando, avaliarGravacao,
};
