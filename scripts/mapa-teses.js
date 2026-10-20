#!/usr/bin/env node
'use strict';
/*
 * Mapa de teses da defesa (por pedido): valor, risco, teses e precedentes — salvo na pasta do caso.
 * Uso: node mapa-teses.js modelo <pasta-do-caso> [--titulo "Reclamação trabalhista — defesa"]
 *      node mapa-teses.js validar <mapa.md>      (todo precedente: [A VERIFICAR] ou conferido no original)
 *      node mapa-teses.js marcar <mapa.md>       (põe [A VERIFICAR] onde falta; troca por CONFERIDO/DIVERGENTE conforme julgados.js)
 *      node mapa-teses.js totalizar <mapa.md>    (soma os valores por risco: provável/possível/remota)
 *      node mapa-teses.js imprimir <mapa.md>     (gera .html pronto para imprimir/salvar em PDF)
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
  for (const l of linhas) {
    if (/^\|\s*#\s*\|\s*Pedido/i.test(l)) { dentro = true; continue; }
    if (!dentro) continue;
    if (/^\|\s*-{2,}/.test(l)) continue;
    if (!/^\|/.test(l)) { if (out.length) break; continue; }
    const cel = l.split('|').slice(1, -1).map((x) => x.trim());
    if (cel.length < 6) continue;
    out.push({ n: cel[0], pedido: cel[1], valorTxt: cel[2], valor: valorDe(cel[2]), risco: cel[3].toLowerCase().normalize('NFC'), teses: cel[4], precedentes: cel[5] });
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
    else if (reg) { marca = ' [🔴 ' + (reg.status === 'inexistente' ? 'NÃO EXISTE' : 'DIVERGENTE') + ': ' + reg.fonte + ']'; n.divergentes++; }
    else n.aVerificar++;
    if (m) t = t.slice(0, x.fim) + marca + t.slice(x.fim + m[0].length); else t = t.slice(0, x.fim) + marca + t.slice(x.fim);
  }
  fs.writeFileSync(arq, t, 'utf8');
  return n;
}

function totalizar(arq) {
  const t = fs.readFileSync(arq, 'utf8');
  const q = quadro(t);
  const soma = { alto: 0, 'médio': 0, baixo: 0 }; let iliquidos = 0;
  for (const p of q) { const r = p.risco.replace(/[^a-zéê]/g, '').replace('medio', 'médio'); if (p.valor == null) iliquidos++; else if (soma[r] != null) soma[r] += p.valor; }
  const total = soma.alto + soma['médio'] + soma.baixo;
  const bloco = [MARCA_RES_INI, '**Resumo do risco** (valores da inicial; ' + q.length + ' pedido(s)' + (iliquidos ? ', ' + iliquidos + ' ilíquido(s) fora da soma' : '') + '):', '',
    '| Risco | Classificação (CPC 25) | Soma (R$) |', '|---|---|---|',
    '| Alto | provável | ' + brl(soma.alto) + ' |', '| Médio | possível | ' + brl(soma['médio']) + ' |', '| Baixo | remota | ' + brl(soma.baixo) + ' |', '| **Total pedido** | | **' + brl(total) + '** |', MARCA_RES_FIM].join('\n');
  const re = new RegExp(MARCA_RES_INI + '[\\s\\S]*?' + MARCA_RES_FIM);
  const novo = re.test(t) ? t.replace(re, bloco) : t.trimEnd() + '\n\n' + bloco + '\n';
  const esc = c.config().escritorio; if (c.dentroDe(arq, esc)) c.versionar(arq, path.join(esc, '_versoes'), esc);
  fs.writeFileSync(arq, novo, 'utf8');
  return { soma, total, iliquidos, pedidos: q.length };
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
  else { console.log('Uso: mapa-teses.js modelo <pasta-do-caso> | validar|marcar|totalizar|imprimir <mapa.md>'); process.exit(1); }
}
module.exports = { modelo, quadro, validar, marcar, totalizar, imprimir, valorDe };
