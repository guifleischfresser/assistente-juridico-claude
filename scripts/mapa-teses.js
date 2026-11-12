#!/usr/bin/env node
'use strict';
/*
 * Mapa de teses da defesa (por pedido): valor, risco, teses e precedentes — salvo na pasta do caso.
 * Uso: node mapa-teses.js modelo <pasta-do-caso> [--titulo "Reclamação trabalhista — defesa"]
 *      node mapa-teses.js validar <mapa.md>      (todo precedente: [A VERIFICAR] ou conferido no original)
 *      node mapa-teses.js marcar <mapa.md>       (põe [A VERIFICAR] onde falta; troca por CONFERIDO/DIVERGENTE conforme julgados.js)
 *      node mapa-teses.js totalizar <mapa.md>    (soma os valores por risco: provável/possível/remota)
 *      node mapa-teses.js imprimir <mapa.md>     (gera .html pronto para imprimir/salvar em PDF)
 *      node mapa-teses.js exportar <caso|mapa.md> [--saida x.docx] [--forcar]
 *                                                (.docx com tabela do Word + totais por risco; valida antes:
 *                                                 problema => recusa código 2, salvo --forcar; versão anterior em _versoes;
 *                                                 súmula cancelada da lista local => idem, como no exportar-docx)
 *      node mapa-teses.js importar-valores <caso|mapa.md> --planilha <arquivo.xlsx|.csv> [--simular]
 *                                         [--coluna-pedido X --coluna-valor Y] [--aba nome|nº]
 *                                                (valores do cálculo da inicial; planilha só da pasta do caso; só a
 *                                                 coluna Valor muda + resumo-risco; sem casamento/ambíguo/ilíquido: não mexe)
 * Nunca inventa precedente: este script não cria citações, só confere e marca as que existem no arquivo.
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const { analisarCitacoes } = require('./lib/citacoes');
const jg = require('./lib/julgados');

const RISCOS = { alto: 'provável', 'médio': 'possível', medio: 'possível', baixo: 'remota' };
const MARCA_RES_INI = '<!-- resumo-risco:inicio -->', MARCA_RES_FIM = '<!-- resumo-risco:fim -->';

function hoje() { return c.hojeISO(); }
function modelo(pastaCaso, titulo) {
  const dir = path.join(pastaCaso, 'pecas'); c.garantirDir(dir);
  let arq = path.join(dir, 'mapa-de-teses-' + hoje() + '.md'); let k = 2;
  while (fs.existsSync(arq)) arq = path.join(dir, 'mapa-de-teses-' + hoje() + '-' + k++ + '.md');
  const t = ['# Mapa de teses da defesa' + (titulo ? ' — ' + titulo : ''), '',
    '> Documento de trabalho interno (estratégia). Gerado em ' + hoje() + '. Precedentes marcados [A VERIFICAR] **não foram conferidos** no original e não podem ir para a peça assim.', '',
    '**Peça analisada:** [PREENCHER: petição inicial, data, nº de páginas — ver autos-md/INDICE.md]', '',
    '## Quadro por pedido', '',
    '| # | Pedido | Valor (R$) | Risco | Teses de defesa | Precedentes |',
    '|---|---|---|---|---|---|',
    '| 1 | [PREENCHER] | [valor ou "ilíquido"] | [alto/médio/baixo] | [tese 1; tese 2] | [julgado/súmula] [A VERIFICAR] |', '',
    MARCA_RES_INI, '_(rode `mapa-teses.js totalizar` para somar os valores por risco)_', MARCA_RES_FIM, '',
    '## Detalhe por pedido', '', '### 1. [PREENCHER pedido]',
    '- **O que o autor alega e prova:** [fatos, documentos, págs. dos autos]',
    '- **Risco e por quê:** [alto/médio/baixo — prova documental, ônus da prova, jurisprudência dominante]',
    '- **Teses de defesa:** [preliminares, prejudiciais (prescrição/decadência), mérito, subsidiárias (limitação/compensação)]',
    '- **Precedentes:** [tribunal, classe e número] [A VERIFICAR]',
    '- **Provas a produzir / documentos do cliente:** [listar]', '',
    '## Observações', '- Valores conforme a inicial (atualização e reflexos não calculados, salvo indicação).',
    '- Risco: alto = perda provável; médio = possível; baixo = remota (padrão de provisão do CPC 25).', ''].join('\n');
  fs.writeFileSync(arq, t, 'utf8');
  return arq;
}

/** Linhas do quadro: | # | Pedido | Valor | Risco | Teses | Precedentes | */
function quadro(texto) {
  const linhas = texto.split(/\r?\n/); const out = [];
  let dentro = false;
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (/^\|\s*#\s*\|\s*Pedido/i.test(l)) { dentro = true; continue; }
    if (!dentro) continue;
    if (/^\|\s*-{2,}/.test(l)) continue;
    if (!/^\|/.test(l)) { if (out.length) break; continue; }
    const cel = l.split('|').slice(1, -1).map((x) => x.trim());
    if (cel.length < 6) continue;
    out.push({ n: cel[0], pedido: cel[1], valorTxt: cel[2], valor: valorDe(cel[2]), risco: cel[3].toLowerCase().normalize('NFC'), teses: cel[4], precedentes: cel[5], idx: i });
  }
  return out;
}
function valorDe(t) {
  const m = String(t).replace(/R\$\s*/i, '').match(/^\s*([\d.]+(?:,\d{1,2})?)\s*$/);
  return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : null;
}
const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function validar(arq) {
  const texto = fs.readFileSync(arq, 'utf8');
  const erros = [], avisos = [];
  const q = quadro(texto);
  if (!q.length) erros.push('não encontrei o quadro "| # | Pedido | Valor (R$) | Risco | Teses de defesa | Precedentes |"');
  for (const p of q) {
    if (/PREENCHER/i.test(p.pedido)) avisos.push('pedido ' + p.n + ' ainda sem descrição');
    if (!RISCOS[p.risco.replace(/[^a-zéê]/g, '')]) erros.push('pedido ' + p.n + ': risco deve ser alto, médio ou baixo (está "' + p.risco + '")');
    if (p.valor == null && !/il[ií]quid|a apurar|n[ãa]o informad|estimad/i.test(p.valorTxt)) avisos.push('pedido ' + p.n + ': valor "' + p.valorTxt + '" não é número nem "ilíquido"');
  }
  const cits = analisarCitacoes(texto, path.dirname(arq), c.config().escritorio).filter((x) => x.tipo === 'jurisprudencia');
  for (const x of cits) {
    if (x.problema) erros.push('linha ' + x.linha + ': ' + x.texto + ' — conferido e ' + (x.problema === 'inexistente' ? 'NÃO EXISTE' : 'DIVERGENTE') + ': remova ou corrija');
    else if (!x.conferida && !/^[^\n|;]{0,40}?\[(A VERIFICAR|N[ÃA]O VERIFICAD[OA])\]/i.test(texto.slice(x.fim, x.fim + 160))) erros.push('linha ' + x.linha + ': precedente "' + x.texto + '" sem [A VERIFICAR] e não conferido no original (julgados.js)');
  }
  return { ok: !erros.length, erros, avisos, pedidos: q.length, precedentes: cits.length, conferidos: cits.filter((x) => x.conferida).length };
}

function marcar(arq) {
  let t = fs.readFileSync(arq, 'utf8');
  const cits = analisarCitacoes(t, path.dirname(arq), c.config().escritorio).filter((x) => x.tipo === 'jurisprudencia').sort((a, b) => b.fim - a.fim);
  const esc = c.config().escritorio;
  if (c.dentroDe(arq, esc)) c.versionar(arq, path.join(esc, '_versoes'), esc);
  let n = { aVerificar: 0, conferidos: 0, divergentes: 0 };
  for (const x of cits) {
    const depois = t.slice(x.fim, x.fim + 160);
    const m = depois.match(/^\s*\[(A VERIFICAR|CONFERIDO[^\]]*|🔴[^\]]*|N[ÃA]O VERIFICADO)\]/i);
    const reg = jg.consultar(x.texto);
    let marca = ' [A VERIFICAR]';
    if (reg && reg.status === 'confere') { marca = ' [CONFERIDO: ' + reg.fonte + ']'; n.conferidos++; }
    else if (reg && reg.status !== 'sem-texto') { marca = ' [🔴 ' + (reg.status === 'inexistente' ? 'NÃO EXISTE' : 'DIVERGENTE') + ': ' + reg.fonte + ']'; n.divergentes++; }
    else n.aVerificar++;
    if (m) t = t.slice(0, x.fim) + marca + t.slice(x.fim + m[0].length); else t = t.slice(0, x.fim) + marca + t.slice(x.fim);
  }
  fs.writeFileSync(arq, t, 'utf8');
  return n;
}

/** Soma por risco (sem gravar nada): { soma: {alto, médio, baixo}, total, iliquidos, pedidos }. */
function somar(texto) {
  const q = quadro(texto);
  const soma = { alto: 0, 'médio': 0, baixo: 0 }; let iliquidos = 0;
  for (const p of q) { const r = p.risco.replace(/[^a-zéê]/g, '').replace('medio', 'médio'); if (p.valor == null) iliquidos++; else if (soma[r] != null) soma[r] += p.valor; }
  return { soma, total: soma.alto + soma['médio'] + soma.baixo, iliquidos, pedidos: q.length };
}
const linhasTotais = (r) => ['| Risco | Classificação (CPC 25) | Soma (R$) |', '|---|---|---|',
  '| Alto | provável | ' + brl(r.soma.alto) + ' |', '| Médio | possível | ' + brl(r.soma['médio']) + ' |', '| Baixo | remota | ' + brl(r.soma.baixo) + ' |', '| **Total pedido** | | **' + brl(r.total) + '** |'];
/** Texto com o bloco resumo-risco recalculado por somar(); origem opcional (planilha e data da importação). */
function comResumo(t, origem) {
  const r = somar(t);
  const bloco = [MARCA_RES_INI, '**Resumo do risco** (valores da inicial' + (origem ? ' — ' + origem : '') + '; ' + r.pedidos + ' pedido(s)' + (r.iliquidos ? ', ' + r.iliquidos + ' ilíquido(s) fora da soma' : '') + '):', ''].concat(linhasTotais(r), [MARCA_RES_FIM]).join('\n');
  const re = new RegExp(MARCA_RES_INI + '[\\s\\S]*?' + MARCA_RES_FIM);
  return { texto: re.test(t) ? t.replace(re, () => bloco) : t.trimEnd() + '\n\n' + bloco + '\n', r };
}
function versionarMapa(arq) { const esc = c.config().escritorio; return c.dentroDe(arq, esc) ? c.versionar(arq, path.join(esc, '_versoes'), esc) : null; }
function totalizar(arq) {
  const x = comResumo(fs.readFileSync(arq, 'utf8'));
  versionarMapa(arq);
  fs.writeFileSync(arq, x.texto, 'utf8');
  return x.r;
}

// --- exportar para Word (.docx com tabela de verdade), reaproveitando as regras do exportar-docx.js
/** Mapa a exportar: arquivo .md, pasta do caso ou nome do caso (o mapa mais recente em <caso>/pecas). */
function acharMapa(alvo) {
  let pasta = null;
  if (alvo && fs.existsSync(alvo)) { if (fs.statSync(alvo).isFile()) return { arq: path.resolve(alvo) }; pasta = path.resolve(alvo); }
  else {
    const achados = require('./lib/casos').buscar(alvo || '');
    if (achados.length !== 1) return { erro: achados.length ? 'Mais de um caso combina com "' + alvo + '": ' + achados.map((k) => k.nome).join(', ') + '. Diga qual.' : 'Não achei o caso nem o arquivo "' + (alvo || '') + '".' };
    pasta = achados[0].pasta;
  }
  const dir = path.join(pasta, 'pecas');
  let mapas = []; try { mapas = fs.readdirSync(dir).filter((f) => /^mapa-de-teses.*\.md$/i.test(f)).map((f) => path.join(dir, f)); } catch (e) { /* sem pecas/ */ }
  if (!mapas.length) return { erro: 'O caso "' + path.basename(pasta) + '" ainda não tem mapa de teses (crie com: mapa-teses.js modelo).' };
  mapas.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs || (a < b ? 1 : -1));
  return { arq: mapas[0] };
}
/** Com --forcar: poe "[🔴 NÃO EXISTE/DIVERGENTE: fonte]" (grifado em vermelho no Word) no lugar da marca dos precedentes com problema. So na copia exportada. */
function marcarProblemas(texto, dir) {
  const cits = analisarCitacoes(texto, dir, c.config().escritorio).filter((x) => x.tipo === 'jurisprudencia' && x.problema).sort((a, b) => b.fim - a.fim);
  for (const x of cits) {
    const m = texto.slice(x.fim, x.fim + 160).match(/^\s*\[(A VERIFICAR|CONFERIDO[^\]]*|🔴[^\]]*|N[ÃA]O VERIFICAD[OA])\]/i);
    const marca = ' [🔴 ' + (x.problema === 'inexistente' ? 'NÃO EXISTE' : 'DIVERGENTE') + ': ' + (x.fonteRegistro || '?') + ']';
    texto = texto.slice(0, x.fim) + marca + texto.slice(x.fim + (m ? m[0].length : 0));
  }
  return texto;
}
/** Markdown que vai para o Word: sem o bloco de resumo (desatualiza) e com a tabela de totais recalculada antes das Observações. */
function textoExportado(texto, r) {
  const re = new RegExp('\\n*' + MARCA_RES_INI + '[\\s\\S]*?' + MARCA_RES_FIM + '\\n*');
  texto = texto.replace(re, '\n\n');
  const tot = ['## Totais por risco', '', 'Valores da inicial; ' + r.pedidos + ' pedido(s)' + (r.iliquidos ? ', ' + r.iliquidos + ' ilíquido(s) fora da soma' : '') + '.', ''].concat(linhasTotais(r));
  if (r.iliquidos) tot.push('| Ilíquidos (fora da soma) | — | ' + r.iliquidos + ' pedido(s) |');
  const bloco = tot.join('\n') + '\n\n';
  const obs = texto.search(/^## Observa/m);
  return obs >= 0 ? texto.slice(0, obs) + bloco + texto.slice(obs) : texto.trimEnd() + '\n\n' + bloco;
}
/** Retorna { codigo, linhas[], saida? }. Codigos: 0 ok; 1 uso; 2 recusa (salvo --forcar); 3 recusa sem --forcar. */
function exportar(alvo, opts) {
  opts = opts || {}; const forcar = !!opts.forcar;
  const ex = require('./exportar-docx');
  const achado = acharMapa(alvo);
  if (achado.erro) return { codigo: 1, linhas: [achado.erro] };
  const arq = achado.arq; const md = fs.readFileSync(arq, 'utf8');
  const oculto = ex.recusaOculto(md, 'no mapa de teses');
  if (oculto) return { codigo: 3, linhas: [oculto] };
  // erros ja corrigidos pelo advogado (/erros): bloqueio trava (nem --forcar libera, como na guarda de escrita); aviso so avisa
  let hits = []; try { hits = require('./lib/erros').verificar(md, { ehPeca: true }); } catch (e) { /* fail-open */ }
  const er = require('./lib/erros');
  if (hits.some((h) => h.nivel === 'bloqueio')) return { codigo: 3, linhas: ['❌ Exportação interrompida: o mapa repete um erro que você já corrigiu duas vezes:'].concat(hits.filter((h) => h.nivel === 'bloqueio').map((h) => '  - ' + er.texto(h)), ['Corrija o mapa e exporte de novo (--forcar não libera isto).']) };
  const anon = ex.checarAnonimizacao(md, arq, forcar, 'o mapa de teses');
  if (anon.recusa) return { codigo: 2, linhas: anon.recusa };
  const v = validar(arq);
  if (!v.ok && !forcar) return { codigo: 2, linhas: ['❌ Exportação interrompida: o mapa de teses tem ' + v.erros.length + ' problema(s):'].concat(v.erros.map((e) => '  - ' + e), ['Corrija (precedente divergente/inexistente: remova ou corrija; sem marca: mapa-teses.js marcar) e exporte de novo. (Para exportar mesmo assim, com as marcas grifadas: --forcar)']) };
  // sumula cancelada citada como se valesse: mesma regra do exportar-docx (codigo 2, salvo --forcar)
  const sum = ex.checarSumulas(md, analisarCitacoes(md, path.dirname(arq), c.config().escritorio), forcar, 'o mapa de teses');
  if (sum.recusa) return { codigo: 2, linhas: sum.recusa };
  const r = somar(md);
  let texto = textoExportado(forcar ? marcarProblemas(md, path.dirname(arq)) : md, r);
  if (sum.bloqueio.length) texto = ex.marcarSumulasCanceladas(texto, path.dirname(arq)).texto;
  const saida = path.resolve(opts.saida || arq.replace(/\.md$/i, '') + '.docx');
  c.garantirDir(path.dirname(saida));
  const tmp = saida + '.tmp-' + process.pid;
  const recusa = ex.gravarDocx(texto, tmp, sum.bloqueio.length ? { grifarDivergentes: true, grifarSumulas: true } : { grifarDivergentes: true });
  if (recusa) { try { fs.unlinkSync(tmp); } catch (e) { /* */ } return { codigo: 3, linhas: [recusa] }; }
  // versao anterior do .docx (talvez editada no Word) vai para _versoes antes de ser substituida
  let anterior = null;
  if (fs.existsSync(saida)) {
    const esc = c.config().escritorio;
    anterior = c.dentroDe(saida, esc) ? c.versionar(saida, path.join(esc, '_versoes'), esc) : c.versionar(saida, path.join(path.dirname(saida), '_versoes'));
    if (!anterior) { fs.unlinkSync(tmp); return { codigo: 3, linhas: ['❌ Não consegui guardar a versão anterior de ' + saida + ' em _versoes; não substituí o arquivo.'] }; }
    fs.unlinkSync(saida);
  }
  fs.renameSync(tmp, saida);
  const pecas = path.dirname(arq); const pastaCaso = path.basename(pecas).toLowerCase() === 'pecas' ? path.dirname(pecas) : pecas;
  const rel = c.dentroDe(saida, pastaCaso) ? path.relative(pastaCaso, saida).split(path.sep).join('/') : saida;
  const linhas = ['✅ Exportei o mapa de teses do caso ' + path.basename(pastaCaso) + ' para Word: ' + r.pedidos + ' pedido(s), total provável ' + brl(r.soma.alto) + '. Arquivo: ' + rel + '.'];
  if (anterior) linhas.push('A versão anterior do Word foi guardada em _versoes.');
  const aVerificar = v.precedentes - v.conferidos;
  if (!v.ok) linhas.push('⚠️ Exportado com --forcar apesar de ' + v.erros.length + ' problema(s) (precedente divergente/inexistente sai grifado em vermelho). Não use o mapa assim sem corrigir.');
  if (aVerificar > 0) linhas.push('⚠️ ' + aVerificar + ' precedente(s) ainda [A VERIFICAR] (grifados em amarelo). Confira antes de usar na peça.');
  if (anon.restantes.length) linhas.push(ex.avisoMarcadoresForcados(anon.restantes.length));
  hits.forEach((h) => linhas.push('⚠️ Erro já corrigido antes: ' + er.texto(h)));
  sum.avisos.forEach((l) => linhas.push(l));
  return { codigo: 0, linhas, saida, totais: r, versaoAnterior: anterior };
}

// --- importar os valores da planilha do cálculo da inicial (.xlsx/.csv da pasta do caso)
const normTxt = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'pela', 'pelo', 'com', 'ao', 'aos', 'sobre']);
/** Rótulo sem numeração na frente ("1.", "a)", "IV -"), sem acento, minúsculo e sem pontuação. */
const rotulo = (s) => normTxt(String(s).replace(/^\s*(?:\d+(?:\.\d+)*|[a-z]|[ivxlc]+)\s*[.)\-–—:]\s+/i, ''));
/** Singular aproximado: danos morais = dano moral, férias = féria, indenizações = indenização. */
const raiz = (p) => (p.length <= 3 || /^\d+$/.test(p) ? p : p.replace(/[oa]es$/, 'ao').replace(/ais$/, 'al').replace(/eis$/, 'el').replace(/ns$/, 'm').replace(/s$/, ''));
const fichas = (s) => new Set(rotulo(s).split(' ').filter((p) => p && !PARADAS.has(p)).map(raiz));
/** 1 = igual; 0,98 = mesmas palavras; 0,9 = um contém o outro (≥ 2 palavras, ou 1 palavra num rótulo de até 3); Dice ≥ 0,8; senão 0. */
function semelhanca(a, b) {
  const na = rotulo(a), nb = rotulo(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const A = fichas(a), B = fichas(b); if (!A.size || !B.size) return 0;
  const comum = Array.from(A).filter((x) => B.has(x)).length;
  if (comum === A.size && comum === B.size) return 0.98;
  const menor = A.size <= B.size ? A : B, maior = menor === A ? B : A;
  if (comum === menor.size && (menor.size >= 2 || (Array.from(menor)[0].length >= 3 && maior.size <= 3))) return 0.9;
  const dice = 2 * comum / (A.size + B.size);
  return dice >= 0.8 ? dice : 0;
}
const FORTE = 0.98, MINIMO = 0.8;
const CAB_PEDIDO = /^(pedido|verba|rubrica|descricao|discriminacao|item|parcela|titulo|objeto|historico)s?\b/;
const CAB_VALOR = /\b(valor|valores|total|montante|liquido|devido|importancia|quantia|r)\b/;

/** Colunas de pedido e de valor: --coluna-pedido/--coluna-valor (letra ou nome do cabeçalho) ou pelo cabeçalho. */
function colunas(linhas, opPedido, opValor) {
  const PL = require('./lib/planilha');
  const topo = linhas.slice(0, 30);
  const porNome = (nome) => {
    const alvo = normTxt(nome);
    for (const igual of [true, false]) for (let r = 0; r < topo.length; r++) for (let k = 0; k < (topo[r] || []).length; k++) {
      const n = typeof topo[r][k] === 'string' ? normTxt(topo[r][k]) : '';
      if (n && (igual ? n === alvo : n.startsWith(alvo))) return { col: k, cab: r };
    }
    return null;
  };
  const explicita = (op, papel) => {
    if (op == null || op === true) return null;
    if (/^[A-Za-z]{1,3}$/.test(op) && !porNome(op)) return { col: PL.colunaIndice(op), cab: -1 };
    return porNome(op) || { erro: 'Não achei a coluna "' + op + '" (' + papel + ') na planilha. Use a letra da coluna (ex.: --coluna-' + papel + ' B) ou o nome exato do cabeçalho.' };
  };
  let p = explicita(opPedido, 'pedido'), v = explicita(opValor, 'valor');
  if (p && p.erro) return p; if (v && v.erro) return v;
  const cabTxt = (r, k) => String(linhas[r][k]).replace(/\s+/g, ' ').slice(0, 40);
  if (!p || !v) {
    for (let r = 0; r < topo.length; r++) {
      const l = topo[r] || []; const txt = l.map((x) => (typeof x === 'string' ? normTxt(x) : ''));
      if (p && p.cab >= 0 && p.cab !== r) continue;
      if (v && v.cab >= 0 && v.cab !== r) continue;
      // "Item" costuma ser a numeração: só vale se não houver Pedido/Verba/Descrição… na mesma linha
      const ks = txt.map((x, k) => (CAB_PEDIDO.test(x) ? k : -1)).filter((k) => k >= 0);
      const kp = p ? p.col : ks.length ? (ks.find((k) => !/^ite(m|ns)\b/.test(txt[k])) ?? ks[0]) : -1;
      if (kp < 0) continue;
      if (v) { if (!p) p = { col: kp, cab: r }; break; }
      const vs = txt.map((x, k) => (k !== kp && x && CAB_VALOR.test(x) ? k : -1)).filter((k) => k >= 0);
      if (!vs.length) continue;
      let escolha = vs.length === 1 ? vs : vs.filter((k) => /\btotal\b/.test(txt[k]));
      if (escolha.length !== 1) escolha = vs.filter((k) => /^valor\b/.test(txt[k]) && !/\b(principal|original|historico)\b/.test(txt[k]));
      if (escolha.length !== 1) return { erro: 'A planilha tem mais de uma coluna de valor (' + vs.map((k) => PL.letraColuna(k) + ' "' + cabTxt(r, k) + '"').join(', ') + ') e eu não escolho por você. Diga qual usar: --coluna-valor <letra>.' };
      if (!p) p = { col: kp, cab: r };
      v = { col: escolha[0], cab: r };
      break;
    }
  }
  if (!p || !v) return { erro: 'Não achei na planilha o cabeçalho com a coluna dos pedidos (Pedido, Verba, Rubrica, Descrição…) e a do valor (Valor, Total…). Diga quais são: --coluna-pedido <letra> --coluna-valor <letra>.' };
  if (p.col === v.col) return { erro: 'A coluna do pedido e a do valor são a mesma (' + PL.letraColuna(p.col) + '). Confira --coluna-pedido e --coluna-valor.' };
  const nomeCol = (x) => PL.letraColuna(x.col) + (x.cab >= 0 && linhas[x.cab] && typeof linhas[x.cab][x.col] === 'string' ? ' ("' + cabTxt(x.cab, x.col) + '")' : '');
  return { pedido: p.col, valor: v.col, inicio: Math.max(p.cab, v.cab) + 1, descricao: 'pedido na coluna ' + nomeCol(p) + ', valor na coluna ' + nomeCol(v) };
}
/** Célula de valor: número positivo => importa; vazio, zero, texto ou negativo => ilíquido (não altera). */
function valorCelula(v) {
  if (v == null || v === '') return { motivo: 'vazio' };
  const n = typeof v === 'number' ? v : require('./lib/planilha').numeroBR(v);
  if (n == null) return { motivo: 'texto' };
  const r = Math.round(n * 100) / 100;
  if (r === 0) return { motivo: 'zero' };
  if (r < 0) return { motivo: 'negativo' };
  return { valor: r };
}
const listaE = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1] : xs[0]);
const dataBR = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
/** Planilha só da pasta do caso (como o comprovante do /consentimento): { arq } ou { erro, codigo }. */
function planilhaDoCaso(v, pastaCaso) {
  if (v == null || v === true) return { codigo: 1, erro: 'Diga qual é a planilha: --planilha "<arquivo.xlsx ou .csv na pasta do caso>".' };
  const cand = [path.resolve(pastaCaso, v), path.resolve(v)].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!cand) return { codigo: 1, erro: 'Não achei a planilha "' + v + '". Guarde o arquivo do cálculo na pasta do caso (por exemplo, em documentos/) e me diga o nome dele.' };
  let real = cand, realCaso = pastaCaso; try { real = fs.realpathSync(cand); realCaso = fs.realpathSync(pastaCaso); } catch (e) { /* */ }
  if (!c.dentroDe(cand, pastaCaso) || !c.dentroDe(real, realCaso)) return { codigo: 2, erro: 'A planilha precisa estar na pasta do caso (' + path.basename(pastaCaso) + '), para os dados do cliente ficarem num lugar só. Copie o arquivo para lá (por exemplo, em documentos/) e peça de novo.' };
  if (/(^|[\\/])_(anonimizacao|consentimento)([\\/]|$)/i.test(path.relative(pastaCaso, cand))) return { codigo: 2, erro: 'Esse arquivo é um registro interno do caso (anonimização ou consentimento), não uma planilha de cálculo.' };
  return { arq: cand };
}

/** Retorna { codigo, linhas[], mudados, ... }. Códigos: 0 ok; 1 uso/não achei; 2 recusa (planilha fora do caso, formato, colunas). */
function importarValores(alvo, opts) {
  opts = opts || {};
  const A = require('./lib/anonimizar'); const PL = require('./lib/planilha');
  const achado = acharMapa(alvo);
  if (achado.erro) return { codigo: 1, linhas: [achado.erro] };
  const arq = achado.arq; const esc = c.config().escritorio;
  const pecas = path.dirname(arq);
  const pastaCaso = A.pastaDoCaso(arq, esc) || (path.basename(pecas).toLowerCase() === 'pecas' ? path.dirname(pecas) : pecas);
  const caso = path.basename(pastaCaso);
  const pl = planilhaDoCaso(opts.planilha, pastaCaso);
  if (pl.erro) return { codigo: pl.codigo, linhas: [(pl.codigo === 2 ? '❌ ' : '') + pl.erro] };
  const nomePl = path.basename(pl.arq);
  const lida = PL.lerPlanilha(pl.arq, { aba: opts.aba });
  if (lida.erro) return { codigo: 2, linhas: ['❌ ' + lida.erro] };
  const col = colunas(lida.linhas, opts.colunaPedido, opts.colunaValor);
  if (col.erro) return { codigo: 2, linhas: ['❌ ' + col.erro] };
  const texto = fs.readFileSync(arq, 'utf8');
  const pedidos = quadro(texto).filter((p) => rotulo(p.pedido) && !/PREENCHER/i.test(p.pedido));
  if (!pedidos.length) return { codigo: 2, linhas: ['❌ O mapa de teses do caso ' + caso + ' ainda não tem pedidos preenchidos no quadro; não há onde pôr os valores.'] };
  // linhas da planilha com rótulo de texto (só o rótulo serve para casar; nada da planilha é copiado)
  const linhasPl = [];
  for (let r = col.inicio; r < lida.linhas.length; r++) {
    const l = lida.linhas[r] || []; const rot = l[col.pedido];
    if (typeof rot === 'string' && rotulo(rot)) linhasPl.push({ linha: r + 1, rotulo: rot, valor: l[col.valor] });
  }
  // casamento pedido <-> linha
  const casos = pedidos.map((p) => {
    const cands = linhasPl.map((l) => ({ l, s: semelhanca(p.pedido, l.rotulo) })).filter((x) => x.s >= MINIMO).sort((a, b) => b.s - a.s || a.l.linha - b.l.linha);
    if (!cands.length) return { p, situacao: 'sem' };
    const melhores = cands.filter((x) => x.s === cands[0].s);
    if (melhores.length > 1 || (cands[0].s < FORTE && cands.length > 1)) return { p, situacao: 'ambiguo', linhas: (melhores.length > 1 ? melhores : cands).map((x) => x.l.linha) };
    return { p, situacao: 'ok', l: cands[0].l, s: cands[0].s };
  });
  // a mesma linha da planilha não vale para dois pedidos (fica com o casamento forte, se houver só um)
  const porLinha = {};
  casos.filter((x) => x.situacao === 'ok').forEach((x) => { (porLinha[x.l.linha] = porLinha[x.l.linha] || []).push(x); });
  for (const k of Object.keys(porLinha)) {
    const g = porLinha[k]; if (g.length < 2) continue;
    const fortes = g.filter((x) => x.s >= FORTE);
    for (const x of g) if (!(fortes.length === 1 && fortes[0] === x)) { x.situacao = 'ambiguo'; x.linhas = [x.l.linha]; x.compartilhada = true; }
  }
  for (const x of casos) if (x.situacao === 'ok') { const v = valorCelula(x.l.valor); if (v.motivo) { x.situacao = 'iliquido'; x.motivo = v.motivo; } else { x.novo = v.valor; x.situacao = x.p.valor === v.valor ? 'igual' : 'muda'; } }
  // grava só a coluna Valor das linhas que mudam (o resto da linha fica byte a byte)
  const linhas = texto.split('\n');
  const mudam = casos.filter((x) => x.situacao === 'muda');
  for (const x of mudam) { const seg = linhas[x.p.idx].split('|'); seg[3] = ' ' + brl(x.novo) + ' '; linhas[x.p.idx] = seg.join('|'); }
  const hoje = dataBR(require('./lib/prazos').hojeLocal());
  const final = comResumo(linhas.join('\n'), 'planilha ' + nomePl + ', importados em ' + hoje);
  const r = final.r; const simular = !!opts.simular;
  let versao = null;
  if (!simular && mudam.length) { versao = versionarMapa(arq); fs.writeFileSync(arq, final.texto, 'utf8'); }
  // saída: só os nomes dos pedidos (do mapa; com marcadores se o caso estiver anonimizado) e números
  const tab = A.lerTabela(pastaCaso); const anon = !!(tab && tab.ativa !== false);
  const nome = (p) => { const s = p.pedido.replace(/\s+/g, ' '); return anon ? A.anonimizarTexto(s, tab, { detectar: false }).texto : s; };
  const pegos = casos.filter((x) => x.situacao === 'muda' || x.situacao === 'igual');
  const sem = casos.filter((x) => x.situacao === 'sem'), amb = casos.filter((x) => x.situacao === 'ambiguo'), ili = casos.filter((x) => x.situacao === 'iliquido');
  const iguais = pegos.length - mudam.length;
  const qtd = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  const frases = [];
  if (!pegos.length) frases.push((simular ? '🔎 Simulação: eu não pegaria' : 'Não peguei') + ' nenhum valor da planilha ' + nomePl + ' para o mapa de teses do caso ' + caso + '; ' + (simular ? 'nada mudaria.' : 'o mapa ficou como estava.'));
  else if (!mudam.length) frases.push((simular ? '🔎 Simulação: eu pegaria ' : 'Peguei ') + qtd(pegos.length, 'valor', 'valores') + ' da planilha ' + nomePl + ' e ' + (pegos.length === 1 ? 'ele já estava igual' : 'todos já estavam iguais') + ' no mapa de teses do caso ' + caso + '; ' + (simular ? 'nada mudaria.' : 'não precisei mudar nada.'));
  else frases.push((simular ? '🔎 Simulação (nada foi gravado): eu pegaria ' + qtd(pegos.length, 'valor', 'valores') + ' da planilha ' + nomePl + ' e colocaria no mapa de teses do caso ' + caso : '✅ Peguei ' + qtd(pegos.length, 'valor', 'valores') + ' da planilha ' + nomePl + ' e coloquei no mapa de teses do caso ' + caso) + (iguais ? ' (' + qtd(iguais, 'já estava igual', 'já estavam iguais') + ')' : '') + '.');
  if (sem.length) frases.push(qtd(sem.length, 'pedido', 'pedidos') + ' não achei na planilha (' + sem.map((x) => nome(x.p)).join('; ') + ') e ' + (sem.length === 1 ? 'ficou como estava.' : 'ficaram como estavam.'));
  if (amb.length) frases.push(qtd(amb.length, 'pedido', 'pedidos') + ' ' + (amb.length === 1 ? 'ficou como estava' : 'ficaram como estavam') + ' porque o casamento com a planilha é ambíguo (' + amb.map((x) => nome(x.p) + ': ' + (x.compartilhada ? 'a linha ' + x.linhas[0] + ' serve a mais de um pedido' : 'linhas ' + listaE(x.linhas.map(String)))).join('; ') + ').');
  if (ili.length) frases.push(qtd(ili.length, 'pedido', 'pedidos') + ' ' + (ili.length === 1 ? 'está' : 'estão') + ' sem valor na planilha (' + ili.map((x) => nome(x.p) + ': ' + ({ vazio: 'vazio', zero: 'zero', texto: 'texto', negativo: 'negativo' })[x.motivo] + ', linha ' + x.l.linha).join('; ') + '); tratei como ilíquido e não mexi.');
  frases.push('Total provável ' + (simular || !mudam.length ? (simular && mudam.length ? 'ficaria' : 'continua') : 'agora') + ': ' + brl(r.soma.alto) + '.');
  const out = [frases.join(' '), '', '| # | Pedido | Antes | Depois | Planilha |', '|---|---|---|---|---|'];
  const SIT = { sem: 'não achei', ambiguo: 'ambíguo', iliquido: 'ilíquido na planilha' };
  for (const x of casos) {
    const depois = x.situacao === 'muda' ? brl(x.novo) : x.situacao === 'igual' ? '(igual)' : '(sem mudança: ' + SIT[x.situacao] + ')';
    const onde = x.l && x.situacao !== 'ambiguo' ? 'linha ' + x.l.linha : x.linhas ? 'linhas ' + listaE(x.linhas.map(String)) : '—';
    out.push('| ' + x.p.n + ' | ' + nome(x.p) + ' | ' + x.p.valorTxt + ' | ' + depois + ' | ' + onde + ' |');
  }
  out.push('', 'Planilha: ' + nomePl + (lida.aba ? ', aba "' + lida.aba + '"' : '') + (lida.separador ? ' (separador ' + lida.separador + ')' : '') + '; ' + col.descricao + '.');
  out.push('Totais por risco ' + (simular ? 'depois da importação' : 'no mapa') + ': provável ' + brl(r.soma.alto) + ' · possível ' + brl(r.soma['médio']) + ' · remota ' + brl(r.soma.baixo) + ' · total ' + brl(r.total) + (r.iliquidos ? ' · ' + qtd(r.iliquidos, 'ilíquido', 'ilíquidos') + ' fora da soma' : '') + '.');
  if (simular) out.push('Nada foi gravado. Para gravar, rode de novo sem --simular.');
  else if (versao) out.push('A versão anterior do mapa ficou em _versoes.');
  if (anon) out.push('⚠️ O caso ' + caso + ' está anonimizado: só os números entraram no mapa (nada de nomes ou documentos da planilha) e os pedidos acima aparecem com os marcadores. Continue trabalhando com os marcadores; a planilha original não deve ser lida na conversa.');
  return { codigo: 0, linhas: out, arq, mudados: mudam.length, pegos: pegos.length, semCasamento: sem.length, ambiguos: amb.length, iliquidos: ili.length, totais: r, versaoAnterior: versao, gravou: !simular && mudam.length > 0 };
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inline(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/_([^_]+)_/g, '<em>$1</em>').replace(/\[(A VERIFICAR|N[ÃA]O VERIFICADO)\]/g, '<mark>[$1]</mark>').replace(/\[(🔴[^\]]*)\]/g, '<mark class="r">[$1]</mark>'); }
function imprimir(arq) {
  const linhas = fs.readFileSync(arq, 'utf8').split(/\r?\n/); const h = []; let tab = null, lista = false;
  const fechar = () => { if (tab) { h.push('</tbody></table>'); tab = null; } if (lista) { h.push('</ul>'); lista = false; } };
  for (const l of linhas) {
    if (/^<!--/.test(l)) continue;
    if (/^\|/.test(l)) {
      if (/^\|\s*-{2,}/.test(l)) continue;
      const cel = l.split('|').slice(1, -1).map((x) => inline(x.trim()));
      if (!tab) { fechar(); tab = true; h.push('<table><thead><tr>' + cel.map((x) => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>'); } else h.push('<tr>' + cel.map((x) => '<td>' + x + '</td>').join('') + '</tr>');
      continue;
    }
    if (tab) { h.push('</tbody></table>'); tab = null; }
    const m = l.match(/^(#{1,3})\s+(.*)$/);
    if (m) { fechar(); h.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); continue; }
    if (/^\s*[-*]\s+/.test(l)) { if (!lista) { h.push('<ul>'); lista = true; } h.push('<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>'); continue; }
    if (lista && !l.trim()) { h.push('</ul>'); lista = false; continue; }
    if (/^>\s?/.test(l)) { h.push('<blockquote>' + inline(l.replace(/^>\s?/, '')) + '</blockquote>'); continue; }
    if (l.trim()) h.push('<p>' + inline(l) + '</p>');
  }
  fechar();
  const css = '@page{size:A4;margin:2cm}body{font-family:"Times New Roman",serif;font-size:11pt;line-height:1.35}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #444;padding:4px 6px;vertical-align:top;font-size:10pt}th{background:#eee}mark{background:#fff3a0}mark.r{background:#f7b0b0}blockquote{margin:4px 24px;color:#333}h1{font-size:16pt}h2{font-size:13pt;margin-top:18px}h3{font-size:12pt}.rodape{margin-top:24px;font-size:9pt;color:#555}';
  const out = arq.replace(/\.md$/i, '') + '.html';
  fs.writeFileSync(out, '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>' + esc(path.basename(arq)) + '</title><style>' + css + '</style><body>' + h.join('\n') + '<p class="rodape">Documento interno de estratégia — precedentes [A VERIFICAR] não foram conferidos no original. Responsabilidade técnica do advogado.</p></body></html>', 'utf8');
  return out;
}

if (require.main === module) {
  const a = process.argv.slice(2); const cmd = a[0];
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const exige = () => { if (!a[1] || !fs.existsSync(a[1])) { console.log('Arquivo não encontrado: ' + (a[1] || '(vazio)')); process.exit(1); } };
  if (cmd === 'modelo') { exige(); console.log('📄 Mapa criado: ' + modelo(a[1], opt('--titulo'))); }
  else if (cmd === 'validar') { exige(); const r = validar(a[1]); console.log((r.ok ? '✅ Mapa válido' : '❌ Mapa com problemas') + ' — ' + r.pedidos + ' pedido(s), ' + r.precedentes + ' precedente(s), ' + r.conferidos + ' conferido(s) no original.' + (r.erros.length ? '\n- ' + r.erros.join('\n- ') : '') + (r.avisos.length ? '\nAvisos:\n- ' + r.avisos.join('\n- ') : '')); process.exit(r.ok ? 0 : 2); }
  else if (cmd === 'marcar') { exige(); const n = marcar(a[1]); console.log('🖍️ Precedentes: ' + n.aVerificar + ' [A VERIFICAR], ' + n.conferidos + ' conferido(s), ' + n.divergentes + ' divergente(s)/inexistente(s). Backup em _versoes.'); }
  else if (cmd === 'totalizar') { exige(); const r = totalizar(a[1]); console.log('Σ Alto (provável) ' + brl(r.soma.alto) + ' · Médio (possível) ' + brl(r.soma['médio']) + ' · Baixo (remota) ' + brl(r.soma.baixo) + ' · Total ' + brl(r.total) + (r.iliquidos ? ' · ' + r.iliquidos + ' ilíquido(s)' : '')); }
  else if (cmd === 'imprimir') { exige(); console.log('🖨️ Versão para imprimir: ' + imprimir(a[1]) + ' (abra no navegador e use Imprimir → Salvar como PDF)'); }
  else if (cmd === 'exportar') { const x = exportar(a[1] && !a[1].startsWith('--') ? a[1] : '', { saida: opt('--saida'), forcar: a.includes('--forcar') }); console.log(x.linhas.join('\n')); process.exit(x.codigo); }
  else if (cmd === 'importar-valores') { const x = importarValores(a[1] && !a[1].startsWith('--') ? a[1] : '', { planilha: opt('--planilha'), simular: a.includes('--simular'), colunaPedido: opt('--coluna-pedido'), colunaValor: opt('--coluna-valor'), aba: opt('--aba') }); console.log(x.linhas.join('\n')); process.exit(x.codigo); }
  else { console.log('Uso: mapa-teses.js modelo <pasta-do-caso> | validar|marcar|totalizar|imprimir <mapa.md> | exportar <caso|mapa.md> [--saida x.docx] [--forcar] | importar-valores <caso|mapa.md> --planilha <arquivo.xlsx|.csv> [--simular] [--coluna-pedido X --coluna-valor Y] [--aba nome]'); process.exit(1); }
}
module.exports = { modelo, quadro, validar, marcar, totalizar, somar, imprimir, exportar, importarValores, semelhanca, valorDe };
