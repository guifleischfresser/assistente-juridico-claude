#!/usr/bin/env node
'use strict';
/*
 * Anonimizacao opcional por caso: troca nomes das partes, CPF/CNPJ, nº CNJ, RG, e-mails, telefones,
 * enderecos e CEPs por marcadores estaveis ([PARTE_A], [CPF_1], [PROCESSO_1]...) ANTES de o assistente
 * ler o documento, e devolve os dados reais no rascunho final. Tudo local; a tabela fica SO na pasta do caso.
 * Uso: node anonimizar.js preparar <caso> [--nome "Nome|Outra grafia"]... [--cpf X] [--endereco "..."]
 *        cria/atualiza a tabela (DOSSIE: Cliente, Parte contrária, "Anonimizar também:" + o que os
 *        documentos do caso mostrarem) e LIGA a anonimização do caso
 *      node anonimizar.js aplicar <caso> [arquivo ...]   copias anonimizadas em <caso>/anonimizado/ (original intacto)
 *      node anonimizar.js reverter <arquivo> [--saida <arq>] [--caso <caso>]
 *                                         grava <arquivo>-dados-reais.md com os dados reais (marcador sem
 *                                         correspondencia fica como esta e e avisado; codigo 2)
 *      node anonimizar.js conferir <arquivo> [--caso <caso>]   marcadores que restam / sem correspondencia
 *      node anonimizar.js estado [<caso>]
 *      node anonimizar.js desligar <caso>   (a tabela continua, para reverter o que ja foi escrito)
 * Nunca imprime dado real (a saida vai para a conversa). Codigos: 0 ok, 1 uso, 2 recusa/pendencia, 3 caso.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const c = require('./lib/comum');
const k = require('./lib/casos');
const A = require('./lib/anonimizar');

const esc = () => c.config().escritorio;
const ROTULOS_DOSSIE = /^(Cliente|Clientes|Parte contrária|Partes contrárias|Partes|Autora?|Réu|Ré|Requerente|Requerid[oa]|Reclamante|Reclamad[oa]|Exequente|Executad[oa]|Representante(?: legal)?|Anonimizar também)$/i;

function unico(termo) {
  const r = k.buscar(termo, esc());
  if (r.length === 1) return r[0];
  if (!r.length) { console.log('Não achei caso com "' + termo + '". Use o nome da pasta do caso (veja /casos).'); process.exit(3); }
  console.log('Mais de um caso combina com "' + termo + '". Qual deles?\n' + r.slice(0, 15).map((x) => '- ' + x.rel).join('\n')); process.exit(3);
}
function opcoes(argv) {
  const pos = [], op = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const n = a.slice(2); const v = argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[++i] : true; (op[n] = op[n] || []).push(v); } else pos.push(a);
  }
  return { pos, op };
}
const sha = (arq) => crypto.createHash('sha256').update(fs.readFileSync(arq)).digest('hex');
const relCaso = (pasta, arq) => path.relative(pasta, arq).split(path.sep).join('/');

/** Nomes que o advogado pos no DOSSIE: "Cliente: X · Parte contrária: Y" e "Anonimizar também: A; B". */
function nomesDoDossie(pasta) {
  let t = ''; try { t = fs.readFileSync(path.join(pasta, 'DOSSIE.md'), 'utf8'); } catch (e) { return []; }
  const out = [];
  for (const linha of t.replace(/\r/g, '').split('\n')) {
    for (const seg of linha.replace(/^\s*[-*>]\s*/, '').split(/\s+·\s+/)) {
      const m = seg.match(/^\s*\**([^:*]{2,30}?)\**\s*:\s*(.+)$/);
      if (!m || !ROTULOS_DOSSIE.test(m[1].trim())) continue;
      for (let v of m[2].split(/\s*;\s*/)) {
        v = v.replace(/\([^)]*\)/g, '').replace(/[*_]/g, '').trim().replace(/,$/, '');
        if (!v || /^\[.*\]$/.test(v) || /^\[/.test(v) || !/\p{L}{2}/u.test(v) || v.length > 120) continue;
        out.push(v);
      }
    }
  }
  return out;
}
/** Arquivos do caso que viram copia: documentos/ e autos-md/ (texto, PDF, Word, pagina salva). */
function arquivosDoCaso(pasta) {
  const out = [];
  const andar = (d) => {
    let ns = []; try { ns = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const n of ns.sort((p, q) => p.name.localeCompare(q.name))) {
      const a = path.join(d, n.name);
      if (n.isDirectory()) { if (!/^(_|\.)/.test(n.name) && n.name !== A.PASTA_COPIAS) andar(a); } else if (A.TEXTO_EXT.test(n.name) || A.CONVERTE_EXT.test(n.name)) out.push(a);
    }
  };
  for (const sub of ['documentos', 'autos-md']) andar(path.join(pasta, sub));
  return out;
}

function preparar(argv) {
  const { pos, op } = opcoes(argv);
  if (!pos.length) { console.log('Uso: preparar <caso> [--nome "Nome|Outra grafia"] [--cpf X] [--endereco "..."]'); process.exit(1); }
  const x = unico(pos.join(' '));
  let t = A.lerTabela(x.pasta); const nova = !t;
  if (!t) t = A.novaTabela(x.rel);
  const antes = t.entradas.length;
  t.ativa = true; t.caso = x.rel;
  for (const n of nomesDoDossie(x.pasta)) {
    if (/\d{3}/.test(n)) { A.anonimizarTexto(n, t); continue; }
    A.adicionar(t, 'nome', n);
  }
  const tipos = { nome: 'nome', cpf: 'cpf', cnpj: 'cnpj', processo: 'cnj', rg: 'rg', email: 'email', telefone: 'telefone', endereco: 'endereco', cep: 'cep' };
  for (const [o, tipo] of Object.entries(tipos)) for (const v of op[o] || []) if (typeof v === 'string') A.adicionar(t, tipo, v);
  // o resto vem dos detectores, lendo DOSSIE e documentos (sem gravar copia nenhuma)
  const fontes = [path.join(x.pasta, 'DOSSIE.md')].concat(arquivosDoCaso(x.pasta));
  let lidos = 0;
  for (const f of fontes) {
    if (!fs.existsSync(f)) continue;
    const r = A.lerParaAnonimizar(f); if (r.erro) continue;
    A.anonimizarTexto(r.texto, t); lidos++;
  }
  A.gravarTabela(x.pasta, t);
  const porTipo = {}; for (const e of t.entradas) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
  console.log('🔒 Anonimização LIGADA no caso ' + x.rel + '. ' + (nova ? 'Tabela criada' : 'Tabela atualizada') + ' com ' + t.entradas.length + ' dado(s) (' + (t.entradas.length - antes) + ' novo(s)): ' + descrever(porTipo) + '. Li ' + lidos + ' arquivo(s) do caso para achar os dados.');
  console.log('A tabela (com os dados reais) ficou só na pasta do caso: ' + path.join(x.rel, A.PASTA_TABELA, 'tabela.json') + ' — eu não leio esse arquivo; o advogado pode abrir para conferir.');
  console.log('Próximo passo: node "' + path.join(c.P.base, 'scripts', 'anonimizar.js') + '" aplicar "' + x.nome + '"');
}
function descrever(porTipo) {
  const R = { nome: 'parte(s)', cpf: 'CPF', cnpj: 'CNPJ', cnj: 'nº de processo', rg: 'RG', email: 'e-mail', telefone: 'telefone', endereco: 'endereço', cep: 'CEP' };
  const p = Object.keys(R).filter((q) => porTipo[q]).map((q) => porTipo[q] + ' ' + R[q]);
  return p.length ? p.join(', ') : 'nenhum ainda';
}

function aplicar(argv) {
  const { pos } = opcoes(argv);
  if (!pos.length) { console.log('Uso: aplicar <caso> [arquivo ...]'); process.exit(1); }
  // o caso e o 1º argumento; o resto, arquivos (se existirem)
  const arquivos = pos.slice(1).filter((p) => fs.existsSync(p));
  const termo = arquivos.length ? pos[0] : pos.join(' ');
  const x = unico(termo);
  const t = A.lerTabela(x.pasta);
  if (!t || t.ativa === false) { console.log('A anonimização do caso ' + x.rel + ' está desligada. Ela só liga quando o advogado pede: node "' + path.join(c.P.base, 'scripts', 'anonimizar.js') + '" preparar "' + x.nome + '"'); process.exit(2); }
  const lista = arquivos.length ? arquivos.map((p) => path.resolve(p)) : arquivosDoCaso(x.pasta);
  if (!lista.length) { console.log('Não achei documentos em ' + x.rel + '/documentos nem em autos-md/. Indique os arquivos: aplicar "' + x.nome + '" <arquivo>'); process.exit(2); }
  const trocas = [], feitos = [], falhas = [];
  for (const f of lista) {
    if (A.ehDaTabela(f) || A.dentroDasCopias(f, x.pasta)) continue;
    const r = A.lerParaAnonimizar(f);
    if (r.erro) { falhas.push(path.basename(f) + ': ' + r.erro); continue; }
    const an = A.anonimizarTexto(r.texto, t);
    const destino = A.caminhoCopia(f, x.pasta);
    c.garantirDir(path.dirname(destino));
    fs.writeFileSync(destino, an.texto, 'utf8');
    const chave = c.dentroDe(f, x.pasta) ? relCaso(x.pasta, f) : 'externo/' + path.basename(f);
    t.documentos[chave] = { sha256: sha(f), copia: relCaso(x.pasta, destino), em: new Date().toISOString() };
    trocas.push(...an.trocas); feitos.push(relCaso(x.pasta, destino));
  }
  A.gravarTabela(x.pasta, t);
  if (!feitos.length) { console.log('Nenhum documento anonimizado em ' + x.rel + (falhas.length ? ': ' + falhas.join('; ') : '.')); process.exit(2); }
  console.log('🔒 Anonimizei ' + feitos.length + ' documento' + (feitos.length > 1 ? 's' : '') + ' do caso ' + x.nome + ': ' + A.resumoContagem(trocas) + '. A tabela ficou só na pasta do caso.');
  console.log('Cópias para trabalhar (leia só estas):\n' + feitos.slice(0, 30).map((f) => '- ' + f).join('\n') + (feitos.length > 30 ? '\n- … e mais ' + (feitos.length - 30) : ''));
  if (falhas.length) console.log('Não consegui ler: ' + falhas.join('; '));
  console.log('⚠️ A detecção de nomes não é perfeita (apelidos, nome só com o sobrenome, nomes no meio de frases). Peça ao advogado para passar o olho nas cópias antes; o que escapou entra na linha "Anonimizar também:" do DOSSIE.md (ou preparar --nome) e depois aplicar de novo.');
}

function tabelaPara(arquivo, op) {
  let pasta = null;
  if (op.caso && typeof op.caso[0] === 'string') pasta = unico(op.caso[0]).pasta;
  else pasta = A.pastaDoCaso(arquivo, esc());
  if (!pasta) { console.log('Esse arquivo não está dentro de um caso. Diga de qual caso é: --caso "<caso>"'); process.exit(3); }
  const t = A.lerTabela(pasta);
  if (!t) { console.log('O caso ' + path.basename(pasta) + ' não tem tabela de anonimização (nunca foi anonimizado).'); process.exit(3); }
  return { pasta, t };
}

function reverter(argv) {
  const { pos, op } = opcoes(argv);
  const arq = pos[0];
  if (!arq || !fs.existsSync(arq)) { console.log('Uso: reverter <arquivo com marcadores> [--saida <arquivo>] [--caso <caso>]'); process.exit(1); }
  const { pasta, t } = tabelaPara(arq, op);
  const texto = fs.readFileSync(arq, 'utf8');
  const r = A.reverterTexto(texto, t);
  const ext = path.extname(arq) || '.md';
  const saida = op.saida && typeof op.saida[0] === 'string' ? path.resolve(op.saida[0]) : path.join(path.dirname(arq), path.basename(arq, ext).replace(/-dados-reais$/, '') + '-dados-reais' + ext);
  if (c.norm(saida) === c.norm(arq)) { console.log('A saída não pode ser o próprio arquivo com marcadores (ele continua sendo o rascunho de trabalho). Use outro --saida.'); process.exit(1); }
  if (A.ehDaTabela(saida)) { console.log('Não gravo nada dentro da pasta da tabela.'); process.exit(2); }
  if (fs.existsSync(saida)) c.versionar(saida, path.join(esc(), '_versoes'), esc());
  fs.writeFileSync(saida, r.texto, 'utf8');
  const rel = c.dentroDe(saida, pasta) ? relCaso(pasta, saida) : saida;
  console.log('✅ Devolvi ' + r.trocados + ' dado(s) real(is) em ' + rel + ' (o rascunho com marcadores ficou como estava). Não leio esse arquivo: ele tem os dados do cliente.');
  if (r.orfaos.length) {
    console.log('⚠️ ' + r.orfaos.length + ' marcador(es) sem correspondência na tabela deste caso — deixei como estão, não inventei nada:');
    r.orfaos.slice(0, 15).forEach((m) => console.log('  - ' + m.marcador + ' (linha ' + m.linha + ')'));
    console.log('Corrija no rascunho (troque pelo marcador certo ou pelo dado) e reverta de novo. A exportação para Word recusa enquanto sobrar marcador.');
    process.exit(2);
  }
  console.log('Para gerar o Word: node "' + path.join(c.P.base, 'scripts', 'exportar-docx.js') + '" "' + saida + '"');
}

function conferir(argv) {
  const { pos, op } = opcoes(argv);
  const arq = pos[0];
  if (!arq || !fs.existsSync(arq)) { console.log('Uso: conferir <arquivo> [--caso <caso>]'); process.exit(1); }
  const ms = A.marcadores(fs.readFileSync(arq, 'utf8'));
  if (!ms.length) { console.log('✅ Nenhum marcador de anonimização em ' + path.basename(arq) + '.'); return; }
  const { t } = tabelaPara(arq, op);
  const orf = ms.filter((m) => { const e = t.entradas.find((x) => x.id === m.id); return !e || !e.formas[m.variante - 1]; });
  console.log(path.basename(arq) + ': ' + ms.length + ' marcador(es) a reverter (' + Array.from(new Set(ms.map((m) => m.id))).length + ' dado(s) diferentes)' + (orf.length ? '; ⚠️ ' + orf.length + ' sem correspondência: ' + orf.slice(0, 10).map((m) => m.marcador + ' (linha ' + m.linha + ')').join(', ') : '; todos têm correspondência') + '.');
  process.exit(orf.length ? 2 : 0);
}

function estado(argv) {
  const { pos } = opcoes(argv);
  if (!pos.length) {
    const l = A.casosComTabela(esc());
    if (!l.length) { console.log('Nenhum caso anonimizado. A anonimização é opcional, por caso: /anonimizar <caso>.'); return; }
    l.forEach((x) => { const t = A.lerTabela(x.pasta) || { entradas: [], documentos: {} }; console.log('- ' + x.rel + ': ' + (t.ativa === false ? 'desligada' : 'LIGADA') + ' · ' + t.entradas.length + ' dado(s) · ' + Object.keys(t.documentos || {}).length + ' documento(s)'); });
    return;
  }
  const x = unico(pos.join(' '));
  const t = A.lerTabela(x.pasta);
  if (!t) { console.log('O caso ' + x.rel + ' não está anonimizado (a anonimização é opcional: /anonimizar ' + x.nome + ').'); return; }
  const porTipo = {}; for (const e of t.entradas) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
  console.log('Caso ' + x.rel + ': anonimização ' + (t.ativa === false ? 'desligada (a tabela continua para reverter)' : 'LIGADA') + '. Tabela: ' + descrever(porTipo) + '. Marcadores: ' + t.entradas.map((e) => '[' + e.id + ']').slice(0, 40).join(' '));
  const docs = Object.entries(t.documentos || {});
  if (docs.length) console.log('Documentos:\n' + docs.map(([o, d]) => { const abs = o.startsWith('externo/') ? null : path.join(x.pasta, o); const mudou = abs && fs.existsSync(abs) && sha(abs) !== d.sha256; return '- ' + d.copia + (mudou ? ' ⚠️ o original mudou depois — rode aplicar de novo' : '') + (fs.existsSync(path.join(x.pasta, d.copia)) ? '' : ' (cópia apagada)'); }).join('\n'));
}

function desligar(argv) {
  const { pos } = opcoes(argv);
  const x = unico(pos.join(' '));
  const t = A.lerTabela(x.pasta);
  if (!t) { console.log('O caso ' + x.rel + ' não está anonimizado.'); return; }
  t.ativa = false; A.gravarTabela(x.pasta, t);
  console.log('Anonimização desligada no caso ' + x.rel + '. A tabela continua na pasta do caso (para reverter rascunhos já escritos com marcadores); para religar: preparar "' + x.nome + '".');
}

if (require.main === module) {
  const [cmd, ...resto] = process.argv.slice(2);
  const f = { preparar, aplicar, reverter, conferir, estado, desligar }[cmd];
  if (!f) { console.log('Uso: anonimizar.js preparar <caso> | aplicar <caso> [arquivo...] | reverter <arquivo> [--saida X] | conferir <arquivo> | estado [<caso>] | desligar <caso>'); process.exit(1); }
  f(resto);
}
module.exports = { nomesDoDossie, arquivosDoCaso };
