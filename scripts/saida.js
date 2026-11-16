#!/usr/bin/env node
'use strict';
/*
 * "O que saiu da maquina?" — resumo honesto, por caso, do que o assistente ja leu da pasta do caso
 * (e portanto foi enviado ao modelo nas conversas do Claude Code). Tudo local, sem rede, Node puro.
 * O registro (<caso>/_saida/registro.jsonl) e anotado sozinho pelo hook PostToolUse (pos-ferramenta.js).
 * Uso: node saida.js resumo <caso> [--desde AAAA-MM-DD|DD/MM/AAAA] [--json]
 *      node saida.js estado [--json]                 todos os casos: so contagens, sem nomes
 *      node saida.js exportar <caso> [--desde ...]   grava <caso>/_saida/resumo-AAAA-MM-DD.md (dossie/cliente)
 * A saida nunca traz CPF/CNPJ/numero de processo/nome real: nomes de arquivo passam pela mascara
 * (marcador da anonimizacao no caso anonimizado; [CLIENTE]/[PARTE]/[CPF]... nos demais).
 * Codigos: 0 ok, 1 uso, 3 caso nao encontrado.
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const k = require('./lib/casos');
const L = require('./lib/saida');

const a = process.argv.slice(2);
const esc = () => c.config().escritorio;
const sair = (msg, cod) => { console.log(msg); process.exit(cod); };
const op = (n) => { const i = a.indexOf('--' + n); return i >= 0 ? (a[i + 1] != null && !a[i + 1].startsWith('--') ? a[i + 1] : true) : null; };
const posicionais = () => { const out = []; for (let i = 1; i < a.length; i++) { if (a[i] === '--desde') { i++; continue; } if (!a[i].startsWith('--')) out.push(a[i]); } return out; };

function unico(termo) {
  if (!termo) sair('Uso: node saida.js resumo <caso> [--desde AAAA-MM-DD] [--json] | estado | exportar <caso>', 1);
  // aceita a pasta do caso (CASO_ATIVO=…) ou o nome/número, como os outros scripts
  if (fs.existsSync(termo) && fs.statSync(termo).isDirectory()) {
    const pasta = require('./lib/anonimizar').pastaDoCaso(path.join(termo, 'x'), esc());
    if (pasta) return { pasta, nome: path.basename(pasta) };
  }
  const r = k.buscar(termo, esc()).filter((x) => !x.nome.startsWith('_'));
  if (r.length === 1) return r[0];
  if (!r.length) sair('Não achei caso com "' + termo + '". Use o nome da pasta do caso (veja /casos).', 3);
  sair('Mais de um caso combina com "' + termo + '". Qual deles?\n' + r.slice(0, 15).map((x) => '- ' + x.rel).join('\n'), 3);
}
function desde() {
  const v = op('desde');
  if (v == null) return null;
  const d = require('./lib/consentimento').lerData(v === true ? '' : v);
  if (!d || v === true) sair('Não entendi a data "' + (v === true ? '' : v) + '". Use AAAA-MM-DD ou DD/MM/AAAA.', 1);
  return d;
}

const LIMITES = 'Limites: só conta o que passou pelas ferramentas do Claude Code com o assistente instalado (leitura de arquivo, busca, terminal quando o comando cita um caminho do caso, ferramentas externas). O terminal é heurístico: um comando que chega ao arquivo sem citar o caminho do caso não aparece. O que o advogado colar ou digitar na conversa também vai para o Claude e não está aqui.';

switch (a[0]) {
  case 'resumo': {
    const x = unico(posicionais().join(' '));
    const r = L.resumo(x.pasta, { desde: desde() });
    if (op('json')) { console.log(JSON.stringify(r.json, null, 2)); break; }
    console.log(r.mensagem);
    if (r.linhas.length) console.log('\n' + r.linhas.join('\n'));
    console.log('\n' + LIMITES);
    break;
  }
  case 'estado': {
    const n = L.estado(esc());
    if (op('json')) { console.log(JSON.stringify(n, null, 2)); break; }
    if (!n.comRegistro) { console.log('Nenhum caso tem registro do que saiu da máquina ainda (' + n.casos + ' caso(s) no escritório). O registro começa sozinho quando o assistente lê um arquivo de um caso.'); break; }
    console.log('O que saiu da máquina (todos os casos, só contagens): ' + n.comRegistro + ' de ' + n.casos + ' caso(s) com registro; ' + n.arquivos + ' arquivo(s) lido(s) em ' + n.conversas + ' conversa(s) — ' + n.original + ' original(is), ' + n['copia-anonimizada'] + ' cópia(s) anonimizada(s), ' + n.derivado + ' derivado(s).');
    if (n.originalComCopia) console.log('🔶 ' + n.originalComCopia + ' original(is) lido(s) havendo cópia anonimizada, em ' + n.casosOriginalComCopia + ' caso(s).');
    if (n.aposRevogacao) console.log('⚠️ ' + n.aposRevogacao + ' arquivo(s) lido(s) após revogação ou sem autorização do cliente, em ' + n.casosAposRevogacao + ' caso(s).');
    if (n.semConsentimento) console.log('⚠️ ' + n.semConsentimento + ' arquivo(s) lido(s) sem consentimento registrado, em ' + n.casosSemConsentimento + ' caso(s).');
    if (n.internet) console.log(n.internet + ' consulta(s) à internet durante conversas de casos (o registro não guarda o que foi pesquisado).');
    if (n.ilegiveis) console.log(n.ilegiveis + ' registro(s) com linhas ilegíveis (não mexi neles).');
    console.log('Detalhe de um caso: node saida.js resumo <caso>.');
    break;
  }
  case 'exportar': {
    const x = unico(posicionais().join(' '));
    const ds = desde();
    const r = L.resumo(x.pasta, { desde: ds });
    const hoje = c.hojeISO(require('./lib/prazos').agora());
    const arq = path.join(x.pasta, L.PASTA, 'resumo-' + hoje + '.md');
    const md = [
      '# O que saiu da máquina — ' + L.mascarar(path.basename(x.pasta), r.ctx),
      '',
      'Gerado em ' + L.dataBR(hoje) + ' pelo assistente, a partir do registro local do caso (`_saida/registro.jsonl`). Nada deste resumo saiu do computador para ser gerado.' + (ds ? ' Período: desde ' + L.dataBR(ds) + '.' : ''),
      '',
      '## Resumo',
      '',
      r.mensagem,
      '',
      '## Arquivos lidos pelo assistente',
      '',
      r.linhas.length ? r.linhas.map((l) => (l.startsWith('- ') ? l : '\n**' + l + '**\n')).join('\n').trim() : 'Nenhum arquivo lido.',
      '',
      '## Como ler',
      '',
      '- **Original**: o documento como veio do cliente ou do processo. **Cópia anonimizada**: versão com os dados pessoais trocados por marcadores (/anonimizar). **Derivado**: autos convertidos, dossiê, handoff, peças.',
      '- 🔶 marca um original lido quando já havia cópia anonimizada dele; ⚠️ marca leitura sem consentimento registrado, após revogação ou quando o cliente exigia anonimização.',
      '- ' + LIMITES,
      '',
    ].join('\n');
    if (fs.existsSync(arq)) c.versionar(arq, path.join(esc(), '_versoes'), esc());
    c.garantirDir(path.dirname(arq));
    fs.writeFileSync(arq, md, 'utf8');
    console.log('Gerei o resumo do que saiu da máquina: ' + path.relative(x.pasta, arq).split(path.sep).join('/') + ' (na pasta do caso). Dá para anexar ao dossiê ou mostrar ao cliente; exporte para Word com /formatar-peca se quiser.');
    console.log(r.mensagem);
    break;
  }
  default: sair('Uso: node saida.js resumo <caso> [--desde AAAA-MM-DD] [--json] | estado [--json] | exportar <caso> [--desde AAAA-MM-DD]', 1);
}
