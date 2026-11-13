'use strict';
/*
 * Registro local "o que sai da maquina" por caso (LGPD). Complementa a anonimizacao (§17) e o
 * consentimento (§18): diz, caso a caso, o que a sessao do Claude Code ja LEU da pasta do caso
 * (e portanto foi enviado ao modelo) e se havia copia anonimizada daquele arquivo na hora.
 *
 * Arquivo: CASOS/<fase>/<caso>/_saida/registro.jsonl — so acrescimo, uma linha JSON por evento:
 *   {"reg":"registro-saida","v":1,"em":"2026-10-27T23:30:05-03:00","data":"2026-10-27","sessao":"a1b2c3d4",
 *    "ferramenta":"Read","arquivo":"documentos/contrato.pdf","tipo":"original",
 *    "anonimizacao":true,"copiaDisponivel":true,"consentimento":"autorizado"}
 *   tipo: original | copia-anonimizada | derivado (autos-md, DOSSIE, HANDOFF, pecas, mapa de teses, _consentimento)
 *         | internet (WebFetch/WebSearch com caso aberto; so o site, nunca o que foi pesquisado)
 *   consentimento: autorizado | exige-anonimizacao | sem-registro | revogado | nao-autorizado | ilegivel
 * Nunca guarda conteudo, trecho ou hash do texto: so o caminho RELATIVO ao caso.
 * Gravado pelo hook PostToolUse (pos-ferramenta.js), fail-open. Mesmo arquivo + mesma sessao + mesmo tipo
 * = uma linha so. Registro estragado: nao grava (nem por cima nem no fim), registra em log e segue.
 * So LE o estado da anonimizacao (lib/anonimizar) e do consentimento (lib/consentimento); nao altera nada deles.
 * Bash/PowerShell e heuristico: so conta quando o comando CITA um caminho do caso.
 */
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const PASTA = '_saida';
const ASSINATURA = 'registro-saida';
const TIPOS = ['original', 'copia-anonimizada', 'derivado', 'internet'];
const nfc = (s) => String(s || '').normalize('NFC');
const arquivoDe = (pastaCaso) => path.join(pastaCaso, PASTA, 'registro.jsonl');
/** O caminho e o proprio registro (qualquer caixa, / ou \)? */
const ehRegistro = (p) => /(^|[\\/])_saida[\\/]+registro\.jsonl$/i.test(nfc(p).trim());
const ASSINATURA_RE = /"reg"\s*:\s*"registro-saida"/;

// ---------- datas (dia LOCAL; nunca toISOString().slice(0,10)) ----------
function agora() { return require('./prazos').agora(); }
function isoLocal(d) {
  const z = (n) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset(); const s = off >= 0 ? '+' : '-'; const a = Math.abs(off);
  return c.hojeISO(d) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds()) + s + z(Math.floor(a / 60)) + ':' + z(a % 60);
}
const dataBR = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); };

// ---------- classificacao ----------
/** Tipo pelo caminho relativo ao caso ('/' como separador). */
function tipoDe(rel) {
  const p = String(rel || '').split('/'); const prim = (p[0] || '').toLowerCase(); const ult = p[p.length - 1] || '';
  if (prim === 'anonimizado') return 'copia-anonimizada';
  if (prim === 'autos-md' || prim === 'pecas' || prim === '_consentimento' || /^(DOSSIE|HANDOFF)\.md$/i.test(rel) || /^mapa-de-teses/i.test(ult)) return 'derivado';
  return 'original';
}
/** Arquivos internos que nunca entram no registro (o proprio registro e a tabela de anonimizacao). */
const ignorado = (rel) => /^(_saida|_anonimizacao)(\/|$)/i.test(rel);

/** {pasta, rel} do caso que contem o arquivo, ou null (modelo de caso "_..." fica de fora). */
function localizar(arquivo, esc) {
  if (!arquivo || typeof arquivo !== 'string') return null;
  const pasta = require('./anonimizar').pastaDoCaso(arquivo, esc);
  if (!pasta) return null;
  let rel = path.relative(nfc(pasta), nfc(path.resolve(arquivo))).split(path.sep).join('/');
  if (!rel) rel = '.';
  if (rel.startsWith('..')) return null;
  return { pasta, rel };
}

/** Estado do consentimento NA HORA (so leitura). */
function estadoConsentimento(pasta) {
  try {
    const st = require('./consentimento').situacao(pasta);
    if (st.situacao === 'autorizado' && st.ultimo && st.ultimo.autorizou && st.ultimo.autorizou.anonimizacaoObrigatoria) return 'exige-anonimizacao';
    return st.situacao;
  } catch (e) { return 'ilegivel'; }
}
/** Anonimizacao ligada e se existe copia anonimizada daquele arquivo (so leitura). */
function estadoAnonimizacao(pasta, rel, tipo) {
  const an = require('./anonimizar');
  let ligada = false, copia = false;
  try {
    const t = an.lerTabela(pasta); ligada = !!(t && t.ativa !== false);
    if (tipo === 'original' && rel !== '.') {
      const doc = t && t.documentos && t.documentos[rel];
      copia = !!(doc && doc.copia && fs.existsSync(path.join(pasta, doc.copia))) || fs.existsSync(an.caminhoCopia(path.join(pasta, rel), pasta));
    }
  } catch (e) { /* fail-open */ }
  return { ligada, copia };
}

// ---------- leitura do registro ----------
/** {eventos, invalido:boolean, existe:boolean}. Linha que nao e evento nosso => invalido (nunca gravamos por cima). */
function ler(pastaCaso) {
  const arq = arquivoDe(pastaCaso);
  let txt;
  try { txt = fs.readFileSync(arq, 'utf8'); } catch (e) { return { eventos: [], invalido: false, existe: false }; }
  const eventos = []; let invalido = false;
  const linhas = txt.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].replace(/\r$/, '');
    if (!l.trim()) continue;
    let o = null; try { o = JSON.parse(l); } catch (e) { o = null; }
    if (!o || o.reg !== ASSINATURA || !TIPOS.includes(o.tipo)) { invalido = true; continue; }
    eventos.push(o);
  }
  if (txt && !txt.endsWith('\n')) invalido = true; // linha cortada no meio
  return { eventos, invalido, existe: true };
}

const chave = (e) => [e.sessao, e.tipo, e.arquivo || '', e.site || ''].join('|');
/** Acrescenta os eventos novos (dedup por arquivo/sessao/tipo). Devolve quantos gravou. Nunca lanca. */
function acrescentar(pastaCaso, eventos) {
  try {
    if (!eventos.length) return 0;
    const atual = ler(pastaCaso);
    if (atual.invalido) { c.log('erros', 'saida: registro ilegivel em ' + path.basename(pastaCaso) + '/' + PASTA + ' (nao gravei)'); return 0; }
    const vistos = new Set(atual.eventos.map(chave));
    const novos = [];
    for (const e of eventos) { const k = chave(e); if (!vistos.has(k)) { vistos.add(k); novos.push(e); } }
    if (!novos.length) return 0;
    c.garantirDir(path.join(pastaCaso, PASTA));
    fs.appendFileSync(arquivoDe(pastaCaso), novos.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    return novos.length;
  } catch (e) { c.log('erros', 'saida acrescentar: ' + e.message); return 0; }
}

// ---------- extracao de caminhos (heuristica para terminal, MCP e saida do Grep) ----------
const TERMINA = /[\s"'`|;&<>()$]/;
/** Caminhos de arquivos de casos citados num texto: [{pasta, rel}]. opcoes.ate: caractere extra que encerra o caminho. */
function caminhosNoTexto(texto, esc, opcoes) {
  opcoes = opcoes || {};
  const out = [];
  try {
    let s = nfc(String(texto || '')).replace(/\\/g, '/');
    if (!s) return out;
    const win = process.platform === 'win32';
    const cmp = win ? s.toLowerCase() : s;
    const casos = require('./casos').listar(esc).filter((k) => !k.nome.startsWith('_'));
    for (const k of casos) {
      const abs = nfc(path.resolve(k.pasta)).replace(/\\/g, '/');
      for (const alvo of [abs, 'CASOS/' + nfc(k.rel)]) {
        const a = win ? alvo.toLowerCase() : alvo;
        let i = 0;
        while ((i = cmp.indexOf(a, i)) >= 0) {
          const ini = i; i += a.length;
          if (alvo !== abs && ini > 0 && /[\w/.-]/.test(s[ini - 1]) && !(s.slice(0, ini).toLowerCase().endsWith('/'))) continue;
          const prox = s[i];
          if (prox && !TERMINA.test(prox) && prox !== '/' && !(opcoes.ate && prox === opcoes.ate)) continue; // outro caso com prefixo igual
          let resto = '';
          if (prox === '/') {
            const q = ini > 0 ? s[ini - 1] : '';
            let j = i + 1;
            while (j < s.length) {
              const ch = s[j];
              if (ch === '\n' || (opcoes.ate && ch === opcoes.ate)) break;
              if (q === '"' || q === "'") { if (ch === q) break; } else if (TERMINA.test(ch)) break;
              j++;
            }
            resto = s.slice(i + 1, j);
          }
          // curinga (*, ?) => fica a pasta antes dele
          const segs = resto.split('/').filter(Boolean); const corte = segs.findIndex((g) => /[*?[\]{}]/.test(g));
          let rel = path.posix.normalize((corte >= 0 ? segs.slice(0, corte) : segs).join('/') || '.').replace(/\/+$/, '');
          if (!rel || rel === '') rel = '.';
          if (rel.startsWith('..')) continue;
          out.push({ pasta: k.pasta, rel });
        }
      }
    }
  } catch (e) { c.log('erros', 'saida caminhos: ' + e.message); }
  return out;
}

// ---------- montagem dos eventos a partir do hook ----------
const sessaoCurta = (id) => String(id || 'sem-id').replace(/[^\w-]/g, '').slice(0, 8) || 'sem-id';
const respostaTexto = (tr) => (typeof tr === 'string' ? tr : tr && typeof tr === 'object' ? [tr.content, tr.output, tr.stdout, tr.result].filter((x) => typeof x === 'string').join('\n') : '');

/** Alvos {pasta, rel} lidos pela ferramenta + rotulo da ferramenta. Nunca lanca. */
function alvosDaFerramenta(ent, esc, sessao) {
  const nome = String(ent.tool_name || '');
  const inp = ent.tool_input && typeof ent.tool_input === 'object' ? ent.tool_input : {};
  const tr = ent.tool_response;
  const alvos = [];
  if (nome === 'Read' || nome === 'NotebookRead') {
    const l = localizar(inp.file_path || inp.notebook_path, esc); if (l) alvos.push(l);
  } else if (nome === 'Grep') {
    const lista = [];
    if (tr && typeof tr === 'object' && Array.isArray(tr.filenames)) lista.push(...tr.filenames.filter((x) => typeof x === 'string'));
    for (const f of lista.slice(0, 300)) { const l = localizar(path.resolve(String(ent.cwd || '.'), f), esc); if (l) alvos.push(l); }
    if (!alvos.length) alvos.push(...caminhosNoTexto(respostaTexto(tr), esc, { ate: ':' }).slice(0, 300));
    if (!alvos.length && inp.path) { const l = localizar(path.resolve(String(ent.cwd || '.'), String(inp.path)), esc); if (l) alvos.push(l); }
  } else if (nome === 'Bash' || nome === 'PowerShell') {
    const cmd = String(inp.command || '');
    if (!/saida\.js/.test(cmd)) alvos.push(...caminhosNoTexto(cmd, esc));
    // /processo abrir manda o DOSSIE e o HANDOFF do caso para a conversa
    const m = respostaTexto(tr).match(/CASO_ATIVO=([^\r\n"]+)/);
    if (m && /processo\.js/.test(cmd)) {
      const pasta = m[1].trim();
      for (const f of ['DOSSIE.md', 'HANDOFF.md']) if (fs.existsSync(path.join(pasta, f))) { const l = localizar(path.join(pasta, f), esc); if (l) alvos.push(l); }
    }
  } else if (/^mcp__/.test(nome)) {
    let txt = ''; try { txt = JSON.stringify(inp); } catch (e) { txt = ''; }
    alvos.push(...caminhosNoTexto(txt.replace(/\\\\/g, '\\'), esc));
  }
  return alvos.filter((a) => !ignorado(a.rel));
}

/**
 * Chamado pelo PostToolUse. Grava (no maximo) uma linha por arquivo/sessao/tipo em cada caso tocado.
 * Devolve o numero de linhas gravadas. Fail-open: qualquer erro vira log.
 */
function registrar(ent, esc) {
  try {
    if (!ent || typeof ent !== 'object') return 0;
    const nome = String(ent.tool_name || '');
    if (!nome) return 0;
    esc = esc || c.config().escritorio;
    const d = agora(); const base = { reg: ASSINATURA, v: 1, em: isoLocal(d), data: c.hojeISO(d), sessao: sessaoCurta(ent.session_id), ferramenta: nome };
    const porCaso = new Map();
    const add = (pasta, ev) => { if (!porCaso.has(pasta)) porCaso.set(pasta, []); porCaso.get(pasta).push(ev); };
    if (nome === 'WebFetch' || nome === 'WebSearch') {
      // so com caso aberto nesta conversa; guarda o site (WebFetch), nunca a pesquisa
      const s = c.lerSessao(ent.session_id);
      const pasta = s && s.casoAtivo && fs.existsSync(s.casoAtivo) ? s.casoAtivo : null;
      if (!pasta) return 0;
      let site = null; if (nome === 'WebFetch') { try { site = new URL(String((ent.tool_input || {}).url)).hostname; } catch (e) { site = null; } }
      const st = estadoAnonimizacao(pasta, '.', 'internet');
      add(pasta, Object.assign({}, base, { arquivo: null, site, tipo: 'internet', anonimizacao: st.ligada, copiaDisponivel: false, consentimento: estadoConsentimento(pasta) }));
    } else {
      for (const a of alvosDaFerramenta(ent, esc)) {
        const tipo = tipoDe(a.rel);
        const st = estadoAnonimizacao(a.pasta, a.rel, tipo);
        const ev = Object.assign({}, base, { arquivo: a.rel, tipo, anonimizacao: st.ligada, copiaDisponivel: st.copia, consentimento: estadoConsentimento(a.pasta) });
        if (/^mcp__/.test(nome)) ev.externo = true;
        add(a.pasta, ev);
      }
    }
    let n = 0;
    for (const [pasta, evs] of porCaso) n += acrescentar(pasta, evs);
    return n;
  } catch (e) { c.log('erros', 'saida registrar: ' + e.message); return 0; }
}

// ---------- mascaras (a saida nunca traz CPF/CNPJ/processo/nome real) ----------
const dobra = (s) => nfc(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CONECTORES = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'del', 'van', 'von', 'ltda', 'sa', 's', 'a', 'me', 'epp', 'eireli', 'cia']);
const palavrasNome = (v) => dobra(v).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !CONECTORES.has(w) && !/^\d+$/.test(w));
const ROTULOS_DOSSIE = [
  [/^(Cliente|Clientes|Representante(?: legal)?|Respons[aá]vel legal)$/i, '[CLIENTE]'],
  [/^(Parte contr[aá]ria|Autora?|R[ée]u|R[ée]|Requerente|Requerid[oa]|Reclamante|Reclamad[oa]|Exequente|Executad[oa]|Anonimizar tamb[ée]m)$/i, '[PARTE]'],
];
/** Nomes do DOSSIE (Cliente, Parte contraria, Representante...) => [{palavras, marca}]. So em memoria. */
function nomesDoDossie(pasta) {
  let t = ''; try { t = fs.readFileSync(path.join(pasta, 'DOSSIE.md'), 'utf8'); } catch (e) { return []; }
  const out = [];
  for (const linha of t.replace(/\r/g, '').split('\n')) {
    for (const seg of linha.replace(/^\s*[-*>]\s*/, '').split(/\s+·\s+/)) {
      const m = seg.match(/^\s*\**([^:*]{2,30}?)\**\s*:\s*(.+)$/); if (!m) continue;
      const r = ROTULOS_DOSSIE.find(([re]) => re.test(m[1].trim())); if (!r) continue;
      for (const v of m[2].replace(/\([^)]*\)/g, '').replace(/[*_[\]]/g, ' ').split(/;|\s+e\s+/)) { const p = palavrasNome(v); if (p.length) out.push({ palavras: p, marca: r[1] }); }
    }
  }
  return out;
}
/** Contexto de mascara de um caso (tabela de anonimizacao so em memoria; nunca impressa). */
function contextoMascara(pasta) {
  const ctx = { tabela: null, nomes: [] };
  try { ctx.tabela = require('./anonimizar').lerTabela(pasta); } catch (e) { ctx.tabela = null; }
  if (ctx.tabela) for (const e of ctx.tabela.entradas || []) if (e.tipo === 'nome' || e.tipo === 'endereco') for (const f of e.formas || []) { const p = palavrasNome(f); if (p.length) ctx.nomes.push({ palavras: p, marca: '[' + e.id + ']' }); }
  ctx.nomes.push(...nomesDoDossie(pasta));
  return ctx;
}
const DIGITOS = [
  [/(?<!\d)\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}(?!\d)/g, '[Nº PROCESSO]'],
  [/(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/g, '[CNPJ]'],
  [/(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g, '[CPF]'],
  [/(?<!\d)\d{9,}(?!\d)/g, '[NÚMERO]'],
];
/** Troca dado de cliente no nome do arquivo: marcador da tabela (caso anonimizado) ou [CLIENTE]/[PARTE]/[CPF]... */
function mascarar(texto, ctx) {
  let s = nfc(String(texto == null ? '' : texto));
  ctx = ctx || { tabela: null, nomes: [] };
  if (ctx.tabela) { try { s = require('./anonimizar').anonimizarTexto(s, JSON.parse(JSON.stringify(ctx.tabela)), { detectar: false }).texto; } catch (e) { /* segue com as outras mascaras */ } }
  for (const [re, m] of DIGITOS) s = s.replace(re, m);
  if (ctx.nomes.length) {
    const mapa = new Map(); for (const n of ctx.nomes) for (const w of n.palavras) if (!mapa.has(w)) mapa.set(w, n.marca);
    const partes = s.split(/(\[[^\]]*\]|[^\p{L}\p{N}]+)/u);
    s = partes.map((p) => (p && !p.startsWith('[') && mapa.has(dobra(p)) ? mapa.get(dobra(p)) : p)).join('');
    s = s.replace(/(\[[^\]]+\])(?:[\s_.-]+\1)+/g, '$1'); // "[CLIENTE]-[CLIENTE]" => "[CLIENTE]"
  }
  return s;
}

// ---------- resumo ----------
/** Junta os eventos por arquivo. opcoes.desde: 'AAAA-MM-DD' (dia local). */
function analisar(pastaCaso, opcoes) {
  opcoes = opcoes || {};
  const reg = ler(pastaCaso);
  const evs = reg.eventos.filter((e) => !opcoes.desde || String(e.data || '') >= opcoes.desde);
  const sessoes = new Set(); const arqs = new Map(); const internet = { consultas: 0, sites: new Set(), sessoes: new Set() };
  for (const e of evs) {
    sessoes.add(e.sessao);
    if (e.tipo === 'internet') { internet.consultas++; internet.sessoes.add(e.sessao); if (e.site) internet.sites.add(e.site); continue; }
    const k = e.arquivo || '.';
    const a = arqs.get(k) || { arquivo: k, tipo: e.tipo, sessoes: new Set(), copiaDisponivel: false, consentimentos: new Set(), ferramentas: new Set(), primeiraData: e.data, externo: false };
    a.sessoes.add(e.sessao); a.ferramentas.add(e.ferramenta); a.consentimentos.add(e.consentimento);
    if (e.copiaDisponivel) a.copiaDisponivel = true;
    if (e.externo) a.externo = true;
    if (String(e.data) < String(a.primeiraData)) a.primeiraData = e.data;
    arqs.set(k, a);
  }
  const lista = Array.from(arqs.values()).sort((x, y) => x.arquivo.localeCompare(y.arquivo));
  const porTipo = { original: [], 'copia-anonimizada': [], derivado: [] };
  for (const a of lista) (porTipo[a.tipo] || porTipo.original).push(a);
  return {
    existe: reg.existe, ilegivel: reg.invalido, conversas: sessoes.size, arquivos: lista, porTipo, internet,
    originalComCopia: porTipo.original.filter((a) => a.copiaDisponivel),
    semConsentimento: lista.filter((a) => a.consentimentos.has('sem-registro') || a.consentimentos.has('ilegivel')),
    aposRevogacao: lista.filter((a) => a.consentimentos.has('revogado') || a.consentimentos.has('nao-autorizado')),
    exigiaAnonimizacao: porTipo.original.filter((a) => a.consentimentos.has('exige-anonimizacao')),
    externos: lista.filter((a) => a.externo),
  };
}
const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);
const listaCurta = (arr, max) => { max = max || 5; return arr.slice(0, max).join(', ') + (arr.length > max ? ' e mais ' + (arr.length - max) : ''); };
const nomeCurto = (a, ctx) => (a.arquivo === '.' ? '(pasta do caso)' : mascarar(a.arquivo.split('/').pop(), ctx));
const FORMAS = { escrito: 'por escrito', email: 'por e-mail', verbal: 'verbalmente' };
function consentimentoAtual(pasta) {
  try {
    const st = require('./consentimento').situacao(pasta); const u = st.ultimo || {};
    const forma = FORMAS[u.forma] || 'forma não informada';
    let txt;
    if (st.situacao === 'autorizado') txt = 'autorizado ' + forma + ' em ' + dataBR(u.data) + (u.autorizou && u.autorizou.anonimizacaoObrigatoria ? ', com anonimização obrigatória' : '') + (u.autorizou && u.autorizou.envioDocumentos === false ? ', sem envio de documentos ao Claude' : '');
    else if (st.situacao === 'revogado') txt = 'REVOGADO em ' + dataBR(u.data) + ' (' + forma + ')';
    else if (st.situacao === 'nao-autorizado') txt = 'o cliente NÃO autorizou o uso de IA (' + dataBR(u.data) + ')';
    else if (st.situacao === 'ilegivel') txt = 'o registro de consentimento está ilegível';
    else txt = 'sem registro';
    return { situacao: st.situacao, data: u.data || null, forma: u.forma || null, texto: txt };
  } catch (e) { return { situacao: 'ilegivel', data: null, forma: null, texto: 'não consegui ler o registro de consentimento' }; }
}

/** Resumo de um caso: { mensagem, linhas (detalhe agrupado), json }. Nunca traz dado real do cliente. */
function resumo(pastaCaso, opcoes) {
  opcoes = opcoes || {};
  const r = analisar(pastaCaso, opcoes); const ctx = contextoMascara(pastaCaso); const cs = consentimentoAtual(pastaCaso);
  const nome = (a) => nomeCurto(a, ctx);
  const desde = opcoes.desde ? ' desde ' + dataBR(opcoes.desde) : '';
  const M = [];
  if (!r.arquivos.length) M.push('Neste caso, não há registro de arquivo lido pelo assistente' + desde + '.');
  else {
    M.push('Neste caso, o assistente já leu ' + plural(r.arquivos.length, 'arquivo', 'arquivos') + ' em ' + plural(r.conversas, 'conversa', 'conversas') + desde + '.');
    const nc = r.porTipo['copia-anonimizada'].length, no = r.porTipo.original.length, nd = r.porTipo.derivado.length;
    if (nc) M.push(nc + (nc === 1 ? ' era cópia anonimizada.' : ' eram cópias anonimizadas.'));
    const kc = r.originalComCopia.length; const quais = kc ? ' cópia anonimizada disponível (' + listaCurta(r.originalComCopia.map(nome)) + ').' : '';
    if (no === 1) M.push('1 era original' + (kc ? ' e tinha' + quais : '.'));
    else if (no) M.push(no + ' eram originais' + (kc ? ': ' + kc + (kc === 1 ? ' deles tinha' : ' deles tinham') + quais : '.'));
    if (nd) M.push(nd + (nd === 1 ? ' era derivado' : ' eram derivados') + ' (autos convertidos, dossiê, handoff ou peças).');
  }
  if (r.externos.length) M.push('⚠️ ' + plural(r.externos.length, 'arquivo foi citado', 'arquivos foram citados') + ' numa ferramenta externa conectada ao Claude (' + listaCurta(r.externos.map(nome)) + '); confira se era isso mesmo.');
  else if (r.internet.consultas) M.push('Nenhum arquivo foi enviado pela internet além da conversa com o Claude; houve ' + plural(r.internet.consultas, 'consulta', 'consultas') + ' à internet durante conversas deste caso' + (r.internet.sites.size ? ' (sites: ' + listaCurta(Array.from(r.internet.sites)) + ')' : '') + ' — o registro não guarda o que foi pesquisado.');
  else M.push('Nenhum arquivo foi enviado pela internet além da conversa com o Claude.');
  M.push('Consentimento: ' + cs.texto + '.');
  if (r.aposRevogacao.length) M.push('⚠️ ' + plural(r.aposRevogacao.length, 'arquivo foi lido', 'arquivos foram lidos') + ' depois da revogação (ou sem autorização) do cliente: ' + listaCurta(r.aposRevogacao.map(nome)) + '.');
  if (r.semConsentimento.length) M.push('⚠️ ' + plural(r.semConsentimento.length, 'arquivo foi lido', 'arquivos foram lidos') + ' sem consentimento registrado: ' + listaCurta(r.semConsentimento.map(nome)) + '.');
  if (r.exigiaAnonimizacao.length) M.push('⚠️ ' + plural(r.exigiaAnonimizacao.length, 'original foi lido', 'originais foram lidos') + ' quando o cliente exigia anonimização: ' + listaCurta(r.exigiaAnonimizacao.map(nome)) + '.');
  if (r.ilegivel) M.push('O registro deste caso (_saida/registro.jsonl) tem linhas ilegíveis: não mexi nele e parei de anotar até alguém conferir.');
  const mensagem = M.join(' ');

  const L = [];
  const rotulo = { original: 'Originais', 'copia-anonimizada': 'Cópias anonimizadas', derivado: 'Derivados (autos convertidos, dossiê, handoff, peças)' };
  for (const tp of ['original', 'copia-anonimizada', 'derivado']) {
    const arr = r.porTipo[tp]; if (!arr.length) continue;
    L.push(rotulo[tp] + ' (' + arr.length + '):');
    for (const a of arr) {
      const marcas = [];
      if (tp === 'original' && a.copiaDisponivel) marcas.push('🔶 havia cópia anonimizada');
      if (a.consentimentos.has('revogado') || a.consentimentos.has('nao-autorizado')) marcas.push('⚠️ após revogação/sem autorização');
      if (a.consentimentos.has('sem-registro') || a.consentimentos.has('ilegivel')) marcas.push('⚠️ sem consentimento registrado');
      if (tp === 'original' && a.consentimentos.has('exige-anonimizacao')) marcas.push('⚠️ cliente exigia anonimização');
      if (a.externo) marcas.push('⚠️ ferramenta externa');
      L.push('- ' + (a.arquivo === '.' ? '(pasta do caso)' : mascarar(a.arquivo, ctx)) + ' — ' + plural(a.sessoes.size, 'conversa', 'conversas') + ', desde ' + dataBR(a.primeiraData) + (marcas.length ? ' — ' + marcas.join('; ') : ''));
    }
  }
  const json = {
    desde: opcoes.desde || null, conversas: r.conversas, arquivos: r.arquivos.length,
    porTipo: Object.fromEntries(Object.entries(r.porTipo).map(([k, v]) => [k, v.map((a) => ({ arquivo: a.arquivo === '.' ? '.' : mascarar(a.arquivo, ctx), conversas: a.sessoes.size, desde: a.primeiraData, copiaDisponivel: a.copiaDisponivel, consentimento: Array.from(a.consentimentos), ferramentas: Array.from(a.ferramentas), externo: a.externo }))])),
    destaques: {
      originalComCopia: r.originalComCopia.map((a) => mascarar(a.arquivo, ctx)), semConsentimento: r.semConsentimento.map((a) => mascarar(a.arquivo, ctx)),
      aposRevogacao: r.aposRevogacao.map((a) => mascarar(a.arquivo, ctx)), exigiaAnonimizacao: r.exigiaAnonimizacao.map((a) => mascarar(a.arquivo, ctx)), externos: r.externos.map((a) => mascarar(a.arquivo, ctx)),
    },
    internet: { consultas: r.internet.consultas, sites: Array.from(r.internet.sites) },
    consentimento: { situacao: cs.situacao, data: cs.data, forma: cs.forma },
    registroIlegivel: r.ilegivel, mensagem,
  };
  return { mensagem, linhas: L, json, analise: r, ctx };
}

/** Uma linha para o /processo abrir (null se ainda nao ha registro). */
function linhaProcesso(pastaCaso) {
  try {
    const r = analisar(pastaCaso);
    if (!r.arquivos.length && !r.ilegivel) return null;
    const no = r.porTipo.original.length, nc = r.porTipo['copia-anonimizada'].length, nd = r.porTipo.derivado.length;
    const partes = [];
    partes.push(plural(no, 'original', 'originais') + (no && r.originalComCopia.length ? ' (' + r.originalComCopia.length + (r.originalComCopia.length === 1 ? ' tinha' : ' tinham') + ' cópia anonimizada)' : ''));
    if (nc) partes.push(plural(nc, 'cópia anonimizada', 'cópias anonimizadas'));
    if (nd) partes.push(plural(nd, 'derivado', 'derivados'));
    let l = 'O que já saiu da máquina: li ' + (partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes[0]) + ' deste caso, em ' + plural(r.conversas, 'conversa', 'conversas') + '.';
    if (r.aposRevogacao.length || r.semConsentimento.length) l += ' ⚠️ ' + plural(r.aposRevogacao.length + r.semConsentimento.length, 'leitura', 'leituras') + ' sem consentimento registrado ou após revogação.';
    if (r.ilegivel) l += ' (O registro tem linhas ilegíveis; não mexi nele.)';
    return l + ' Detalhes: pergunte "o que saiu da máquina?"';
  } catch (e) { c.log('erros', 'saida linhaProcesso: ' + e.message); return null; }
}

/** Contagens de todos os casos (sem nomes). */
function estado(esc) {
  const casos = require('./casos').listar(esc || c.config().escritorio).filter((k) => !k.nome.startsWith('_'));
  const n = { casos: casos.length, comRegistro: 0, conversas: 0, arquivos: 0, original: 0, 'copia-anonimizada': 0, derivado: 0, originalComCopia: 0, casosOriginalComCopia: 0, semConsentimento: 0, casosSemConsentimento: 0, aposRevogacao: 0, casosAposRevogacao: 0, internet: 0, ilegiveis: 0 };
  for (const k of casos) {
    const r = analisar(k.pasta);
    if (!r.existe) continue;
    n.comRegistro++; if (r.ilegivel) n.ilegiveis++;
    n.conversas += r.conversas; n.arquivos += r.arquivos.length; n.internet += r.internet.consultas;
    for (const tp of ['original', 'copia-anonimizada', 'derivado']) n[tp] += r.porTipo[tp].length;
    n.originalComCopia += r.originalComCopia.length; if (r.originalComCopia.length) n.casosOriginalComCopia++;
    n.semConsentimento += r.semConsentimento.length; if (r.semConsentimento.length) n.casosSemConsentimento++;
    n.aposRevogacao += r.aposRevogacao.length; if (r.aposRevogacao.length) n.casosAposRevogacao++;
  }
  return n;
}

// ---------- guardas ----------
const MSG = 'O registro do que saiu da máquina (<caso>/_saida/registro.jsonl) é anotado sozinho pelo assistente, só por acréscimo, e não é editado, apagado nem copiado. Para ver: node saida.js resumo <caso> (ou pergunte "o que saiu da máquina?").';
/** Write/Edit no registro, ou conteudo dele indo para outro arquivo => deny. */
function avaliarGravacao(arquivo, texto) {
  try {
    if (ehRegistro(arquivo)) return { decisao: 'deny', motivo: MSG };
    if (texto && ASSINATURA_RE.test(String(texto))) return { decisao: 'deny', motivo: 'Isso parece o registro do que saiu da máquina (ou um pedaço dele) indo para outro arquivo (memória, CLAUDE.md, skills…). Ele só existe em <caso>/' + PASTA + '/ e não é copiado. ' + MSG };
    return null;
  } catch (e) { c.log('erros', 'saida avaliarGravacao: ' + e.message); return null; }
}
/** Terminal que apaga, move ou reescreve o registro => deny (ler continua livre). */
const ALTERA = /\b(rm|del|erase|rmdir|rd|unlink|shred|truncate|mv|move|ren|rename|cp|copy|Remove-Item|Move-Item|Rename-Item|Copy-Item|Set-Content|Clear-Content|Out-File|Add-Content|tee)\b|>|\bsed\s+(-\w*\s+)*-i/i;
function avaliarComando(cmd) {
  try {
    const s = nfc(String(cmd || ''));
    if (!/_saida([\\/]+registro\.jsonl|[\\/]*["'\s]|[\\/]*$)/i.test(s)) return null;
    return ALTERA.test(s) ? { decisao: 'deny', motivo: MSG } : null;
  } catch (e) { return null; }
}

module.exports = {
  PASTA, ASSINATURA, TIPOS, arquivoDe, ehRegistro, isoLocal, dataBR, tipoDe, localizar, estadoConsentimento, estadoAnonimizacao,
  ler, acrescentar, caminhosNoTexto, alvosDaFerramenta, registrar, mascarar, contextoMascara, nomesDoDossie,
  analisar, resumo, linhaProcesso, estado, avaliarGravacao, avaliarComando,
};
