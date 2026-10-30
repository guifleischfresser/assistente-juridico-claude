#!/usr/bin/env node
'use strict';
/*
 * Consentimento do cliente para uso de IA, por caso (LGPD; Recomendacao CFOAB nº 001/2024).
 * Registro so na pasta do caso: <caso>/_consentimento/registro.json (historico; nada e apagado).
 * Uso: node consentimento.js registrar <caso> --forma escrito|email|verbal [--data DD/MM/AAAA]
 *                [--quem cliente|representante] [--nome "Nome"] [--ia sim|nao] [--documentos sim|nao]
 *                [--anonimizacao obrigatoria|opcional] [--comprovante <arquivo na pasta do caso>] [--obs "..."]
 *        quem autorizou vem do DOSSIE.md (linha "Cliente:" ou "Representante:"); --nome so se faltar la
 *      node consentimento.js modelo <caso> [--representante]   termo .md para o cliente assinar (na pasta do caso)
 *      node consentimento.js revogar <caso> [--forma ...] [--data ...] [--comprovante ...] [--obs "..."]
 *      node consentimento.js estado [<caso>]
 * Nada sai do computador. A saida nao traz dado do cliente alem do nome que ja esta no DOSSIE
 * (e nem esse, se o caso estiver anonimizado). Codigos: 0 ok, 1 uso, 2 recusa/pendencia, 3 caso.
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const k = require('./lib/casos');
const L = require('./lib/consentimento');

const esc = () => c.config().escritorio;
const SCRIPT = () => 'node "' + path.join(c.P.base, 'scripts', 'consentimento.js') + '"';
const VALOR = new Set(['forma', 'data', 'quem', 'nome', 'ia', 'documentos', 'anonimizacao', 'comprovante', 'obs']);

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
    if (a.startsWith('--')) { const n = a.slice(2); op[n] = VALOR.has(n) && argv[i + 1] != null ? argv[++i] : true; } else pos.push(a);
  }
  return { pos, op };
}
const sair = (msg, cod) => { console.log(msg); process.exit(cod); };
const simNao = (v, padrao) => { if (v == null || v === true) return padrao; const s = String(v).trim().toLowerCase(); if (/^(s|sim|yes|true|1)$/.test(s)) return true; if (/^(n|nao|não|no|false|0)$/.test(s)) return false; return null; };
function forma(v) {
  const s = String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/^(por )?escrit|^termo|^assinad|^document/.test(s)) return 'escrito';
  if (/^(por )?e-?mail|^mensagem|^whats/.test(s)) return 'email';
  if (/^(verbal|oral|falad|pessoalmente|telefone)/.test(s)) return 'verbal';
  return null;
}
/** Data: padrao hoje (dia local); nao aceita data futura. */
function data(v) {
  const d = L.lerData(v === true ? '' : v);
  if (!d) sair('Não entendi a data "' + v + '". Use DD/MM/AAAA (ex.: 29/10/2026).', 1);
  if (d > L.hoje()) sair('A data ' + L.dataBR(d) + ' ainda não chegou. Informe a data em que o cliente autorizou (ou revogou).', 1);
  return d;
}
/** Comprovante: arquivo que JA esta na pasta do caso; guardado como caminho relativo ao caso. */
function comprovante(v, x) {
  if (v == null || v === true) return null;
  const cand = [path.resolve(x.pasta, v), path.resolve(v)].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!cand) sair('Não achei o arquivo do comprovante "' + v + '". Guarde o termo assinado (ou o e-mail salvo) na pasta do caso e informe o nome dele; ou registre sem comprovante.', 2);
  if (!c.dentroDe(cand, x.pasta)) sair('O comprovante precisa estar na pasta do caso (' + x.rel + '), para os dados do cliente ficarem num lugar só. Copie o arquivo para lá (por exemplo, em documentos/) e registre de novo.', 2);
  if (L.ehRegistro(cand)) sair('O comprovante não pode ser o próprio registro.', 2);
  return path.relative(x.pasta, cand).split(path.sep).join('/');
}
const anonimizada = (pasta) => { try { return require('./lib/anonimizar').ativa(pasta); } catch (e) { return false; } };
const naoGravavel = (x) => { const r = L.ler(x.pasta); if (r && r.invalido) sair('O registro de consentimento do caso ' + x.rel + ' está ilegível e eu não gravo por cima dele (é o histórico do cliente). Peça ao advogado para conferir o arquivo registro.json na pasta _consentimento do caso; se quiser recomeçar, ele renomeia esse arquivo e registra de novo.', 2); };

function registrar(argv) {
  const { pos, op } = opcoes(argv);
  if (!pos.length) sair('Uso: registrar <caso> --forma escrito|email|verbal [--data DD/MM/AAAA] [--quem cliente|representante] [--ia sim|nao] [--documentos sim|nao] [--anonimizacao obrigatoria|opcional] [--comprovante <arquivo>]', 1);
  const x = unico(pos.join(' '));
  naoGravavel(x);
  const f = forma(op.forma);
  if (!f) sair('Como o cliente autorizou: por escrito (termo assinado), por e-mail ou verbalmente? Repita com --forma escrito|email|verbal.', 1);
  const quem = /^rep/i.test(String(op.quem || '')) ? 'representante' : 'cliente';
  const doDossie = L.nomeDoDossie(x.pasta, quem);
  const nome = doDossie || (typeof op.nome === 'string' ? op.nome.replace(/\s+/g, ' ').trim() : '');
  if (!nome) sair(quem === 'cliente' ? 'O DOSSIE.md do caso ' + x.rel + ' não tem o nome do cliente (linha "Cliente:"). Peça ao advogado para preencher a linha no dossiê, ou diga o nome com --nome "<nome>".' : 'O DOSSIE.md do caso ' + x.rel + ' não tem a linha "Representante:" com o nome de quem representa o cliente. Peça ao advogado para escrever no dossiê, ou diga o nome com --nome "<nome>".', 2);
  const ia = simNao(op.ia, true), docs = simNao(op.documentos, true);
  const anonOp = op.anonimizacao == null || op.anonimizacao === true ? 'opcional' : String(op.anonimizacao).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (ia === null || docs === null || !/^(obrigatori|opcional|sim|nao)/.test(anonOp)) sair('Use sim ou não em --ia e --documentos, e obrigatoria ou opcional em --anonimizacao.', 1);
  const obrig = /^(obrigatori|sim)/.test(anonOp);
  const ev = { evento: 'registro', data: data(op.data), quem, nome, autorizou: { usoIA: ia, envioDocumentos: ia && docs, anonimizacaoObrigatoria: ia && obrig }, forma: f, comprovante: comprovante(op.comprovante, x) };
  if (typeof op.obs === 'string') ev.observacao = op.obs.slice(0, 500);
  L.acrescentar(x.pasta, x.rel, ev);
  const anon = anonimizada(x.pasta);
  const sujeito = L.quemTxt(ev) + ' do caso ' + x.nome;
  console.log('📝 Anotei: ' + sujeito + (ia ? ' autorizou o uso de IA' : ' NÃO autorizou o uso de IA') + ' em ' + L.dataBR(ev.data) + ', ' + L.formaTxt(f) + '.' + (ev.comprovante ? ' O comprovante está na pasta do caso (' + ev.comprovante + ').' : ''));
  if (ia) console.log('O que foi autorizado: uso de IA no caso ✅ · envio de documentos ao Claude ' + (ev.autorizou.envioDocumentos ? '✅' : '❌ (não)') + ' · anonimização ' + (obrig ? 'OBRIGATÓRIA' : 'opcional') + '.');
  console.log('Quem autorizou: ' + (anon ? 'o nome ficou só no registro (caso anonimizado)' : nome + (doDossie ? ' (como está no dossiê)' : ' (informado agora)')) + (quem === 'representante' ? ', como representante do cliente' : '') + '.');
  console.log('O registro ficou só na pasta do caso (_consentimento/registro.json), com o histórico guardado.');
  if (!ev.comprovante && f !== 'verbal') console.log('Sem comprovante anotado. Quando tiver o termo assinado ou o e-mail salvo na pasta do caso, registre de novo com --comprovante "<arquivo>".');
  if (f === 'verbal') console.log('Autorização verbal: se der, peça a confirmação por escrito (/consentimento modelo gera o termo).');
  for (const a of L.avisos(x.pasta, { anonimizada: anon })) console.log(a);
}

function revogar(argv) {
  const { pos, op } = opcoes(argv);
  if (!pos.length) sair('Uso: revogar <caso> [--forma escrito|email|verbal] [--data DD/MM/AAAA] [--comprovante <arquivo>]', 1);
  const x = unico(pos.join(' '));
  naoGravavel(x);
  const antes = L.situacao(x.pasta);
  const f = op.forma == null ? null : forma(op.forma);
  if (op.forma != null && !f) sair('Forma não reconhecida: use escrito, email ou verbal.', 1);
  const ev = { evento: 'revogacao', data: data(op.data), forma: f, comprovante: comprovante(op.comprovante, x) };
  if (typeof op.obs === 'string') ev.observacao = op.obs.slice(0, 500);
  L.acrescentar(x.pasta, x.rel, ev);
  console.log('📝 Anotei: o cliente do caso ' + x.nome + ' revogou a autorização de uso de IA em ' + L.dataBR(ev.data) + (f ? ', ' + L.formaTxt(f) : '') + '.' + (ev.comprovante ? ' O comprovante está na pasta do caso (' + ev.comprovante + ').' : ''));
  if (antes.situacao === 'sem-registro') console.log('(Não havia autorização registrada antes; anotei a revogação mesmo assim.)');
  console.log('O histórico continua na pasta do caso (_consentimento/registro.json); nada foi apagado.');
  console.log('Daqui em diante, ao abrir este caso eu aviso que a autorização foi revogada. O trabalho não fica travado, mas o recomendável é não enviar mais documentos do caso à conversa' + (anonimizada(x.pasta) ? ' (a anonimização já está ligada).' : ' ou, no mínimo, ligar a anonimização: /anonimizar ' + x.nome + '.'));
}

function modelo(argv) {
  const { pos, op } = opcoes(argv);
  if (!pos.length) sair('Uso: modelo <caso> [--representante]', 1);
  const x = unico(pos.join(' '));
  naoGravavel(x);
  const cfg = c.config();
  let cidade = null; try { cidade = require('./lib/calendario').foroDoCaso(x.pasta).comarca || null; } catch (e) { /* */ }
  const d = L.hoje();
  const txt = L.termo({ cliente: L.nomeDoDossie(x.pasta, 'cliente'), representante: op.representante ? (L.nomeDoDossie(x.pasta, 'representante') || '[NOME DO REPRESENTANTE]') : null, advogado: cfg.nome, oab: cfg.oab ? 'OAB/' + String(cfg.oab).replace(/^OAB\/?\s*/i, '') : null, cidade, data: d });
  const dir = path.join(x.pasta, L.PASTA);
  const arq = path.join(dir, 'termo-consentimento-ia-' + d + '.md');
  if (fs.existsSync(arq)) c.versionar(arq, path.join(esc(), '_versoes'), esc());
  c.garantirDir(dir);
  fs.writeFileSync(arq, txt, 'utf8');
  const rel = path.relative(x.pasta, arq).split(path.sep).join('/');
  L.acrescentar(x.pasta, x.rel, { evento: 'modelo', data: d, arquivo: rel });
  console.log('📄 Gerei o termo de consentimento do caso ' + x.nome + ' para o cliente assinar: ' + rel + ' (na pasta do caso).');
  console.log('Ele já vem com o nome do cliente' + (L.nomeDoDossie(x.pasta, 'cliente') ? '' : ' em branco (o dossiê não tem a linha "Cliente:")') + ' e as opções para o cliente marcar: uso de IA, envio de documentos ao Claude e anonimização obrigatória. Confira os campos entre colchetes antes de imprimir.');
  console.log('Para gerar o Word: node "' + path.join(c.P.base, 'scripts', 'exportar-docx.js') + '" "' + arq + '". Depois de assinado, guarde a cópia na pasta do caso e registre: /consentimento (com o arquivo como comprovante).');
}

function estado(argv) {
  const { pos } = opcoes(argv);
  if (!pos.length) {
    const casos = k.listar(esc()).filter((x) => !/^[_.]/.test(x.fase)); // _MODELO-DE-CASO nao e fase
    if (!casos.length) sair('Nenhum caso no escritório ainda.', 0);
    const l = casos.map((x) => ({ x, st: L.situacao(x.pasta) }));
    const cont = {}; l.forEach((i) => { cont[i.st.situacao] = (cont[i.st.situacao] || 0) + 1; });
    const NOMES = { autorizado: 'autorizado(s)', 'nao-autorizado': 'não autorizado(s)', revogado: 'revogado(s)', 'sem-registro': 'sem registro', ilegivel: 'ilegível(is)' };
    console.log('Consentimento do cliente para uso de IA — ' + l.length + ' caso(s): ' + Object.keys(NOMES).filter((s) => cont[s]).map((s) => cont[s] + ' ' + NOMES[s]).join(', ') + '.');
    l.forEach((i) => { const av = L.avisos(i.x.pasta, { st: i.st }).some((a) => /obrigat|desligada/.test(a)); console.log('- ' + i.x.rel + ': ' + L.resumo(i.st) + (av ? ' ⚠️ anonimização exigida e desligada' : '')); });
    return;
  }
  const x = unico(pos.join(' '));
  const st = L.situacao(x.pasta);
  const anon = anonimizada(x.pasta);
  console.log('Caso ' + x.rel + ' — consentimento do cliente: ' + L.resumo(st) + '.');
  if (st.autorizacao && st.situacao !== 'ilegivel') console.log('Quem autorizou: ' + (anon ? 'o nome ficou só no registro (caso anonimizado)' : st.autorizacao.nome) + ' (' + (st.autorizacao.quem === 'representante' ? 'representante do cliente' : 'cliente') + ').');
  if (st.eventos.length) {
    const T = { registro: 'autorização registrada', revogacao: 'revogação', modelo: 'termo gerado' };
    console.log('Histórico (' + st.eventos.length + '):\n' + st.eventos.map((e) => '- ' + L.dataBR(e.data) + ': ' + (e.evento === 'registro' && e.autorizou && e.autorizou.usoIA === false ? 'cliente NÃO autorizou' : T[e.evento] || e.evento) + (e.forma ? ', ' + L.formaTxt(e.forma) : '') + (e.comprovante ? ' (comprovante: ' + e.comprovante + (fs.existsSync(path.join(x.pasta, e.comprovante)) ? '' : ' — ⚠️ o arquivo sumiu da pasta') + ')' : '') + (e.arquivo ? ' (' + e.arquivo + ')' : '')).join('\n'));
  }
  const av = L.avisos(x.pasta, { st, anonimizada: anon });
  if (av.length) console.log(av.join('\n'));
  if (st.situacao === 'sem-registro') console.log('Para anotar: ' + SCRIPT() + ' registrar "' + x.nome + '" --forma escrito|email|verbal');
}

if (require.main === module) {
  const [cmd, ...resto] = process.argv.slice(2);
  const f = { registrar, revogar, modelo, estado }[cmd];
  if (!f) sair('Uso: consentimento.js registrar <caso> --forma escrito|email|verbal [...] | modelo <caso> | revogar <caso> [...] | estado [<caso>]', 1);
  try { f(resto); } catch (e) { c.log('erros', 'consentimento: ' + (e && e.stack || e)); sair('Não consegui concluir (' + (e && e.message || e) + '). Nada foi apagado.', 2); }
}
