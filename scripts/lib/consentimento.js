'use strict';
/*
 * Registro de consentimento do cliente por caso (LGPD; Recomendacao CFOAB nº 001/2024).
 * Arquivo: CASOS/<fase>/<caso>/_consentimento/registro.json — so na pasta do caso, nunca global, sem rede.
 *   {"tipo":"registro-consentimento","versao":1,"caso":"Ativos/x","eventos":[...]}
 * Historico so cresce: registrar, revogar e gerar modelo ACRESCENTAM eventos; nada e apagado.
 *   registro : {n, evento:'registro', data:'AAAA-MM-DD' (dia local), registradoEm, quem:'cliente'|'representante',
 *               nome, autorizou:{usoIA, envioDocumentos, anonimizacaoObrigatoria}, forma:'escrito'|'email'|'verbal',
 *               comprovante:'<relativo ao caso>'|null, observacao?}
 *   revogacao: {n, evento:'revogacao', data, registradoEm, forma, comprovante, observacao?}
 *   modelo   : {n, evento:'modelo', data, registradoEm, arquivo}
 * A situacao e o ultimo registro/revogacao. Datas mostradas sempre pelo dia LOCAL (lib/prazos.agora()).
 * Os avisos nunca travam o trabalho (fail-open, como os demais hooks).
 */
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const PASTA = '_consentimento';
const ASSINATURA = 'registro-consentimento';
const FORMAS = { escrito: 'por escrito', email: 'por e-mail', verbal: 'verbalmente' };

const arquivoDe = (pastaCaso) => path.join(pastaCaso, PASTA, 'registro.json');
const nfc = (s) => String(s || '').normalize('NFC');
/** O caminho e o proprio registro (qualquer caixa)? */
const ehRegistro = (p) => /(^|[\\/])_consentimento[\\/]registro\.json$/i.test(nfc(p));

// ---------- datas (dia local; nunca toISOString().slice(0,10)) ----------
function agora() { return require('./prazos').agora(); }
const hoje = () => c.hojeISO(agora());
const dataBR = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); };
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataExtenso = (iso) => { const m = String(iso).match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? (+m[3]) + ' de ' + MESES[+m[2] - 1] + ' de ' + m[1] : String(iso); };
/** "29/10/2026", "29/10/26", "2026-10-29" ou "hoje"/"ontem" => 'AAAA-MM-DD' (dia local) ou null. */
function lerData(s) {
  s = String(s || '').trim().toLowerCase();
  if (!s || s === 'hoje') return hoje();
  if (s === 'ontem') { const d = agora(); return c.hojeISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)); }
  let a, m, d;
  let x = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (x) { a = +x[1]; m = +x[2]; d = +x[3]; } else if ((x = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) { d = +x[1]; m = +x[2]; a = +x[3] < 100 ? 2000 + +x[3] : +x[3]; } else return null;
  const dt = new Date(a, m - 1, d);
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return c.hojeISO(dt);
}

// ---------- leitura e gravacao ----------
function novo(rel) { return { tipo: ASSINATURA, versao: 1, caso: rel || '', eventos: [] }; }
/** null = sem registro; {invalido:true} = arquivo ilegivel (nunca gravamos por cima). */
function ler(pastaCaso) {
  const arq = arquivoDe(pastaCaso);
  if (!fs.existsSync(arq)) return null;
  const r = c.lerJSON(arq, null);
  if (!r || r.tipo !== ASSINATURA || !Array.isArray(r.eventos)) return { invalido: true, eventos: [] };
  return r;
}
/** Acrescenta um evento (nunca remove nem reescreve os anteriores). */
function acrescentar(pastaCaso, rel, evento) {
  const atual = ler(pastaCaso);
  if (atual && atual.invalido) throw new Error('registro ilegível');
  const r = atual || novo(rel);
  if (rel) r.caso = rel;
  const ev = Object.assign({ n: r.eventos.length + 1 }, evento, { registradoEm: agora().toISOString() });
  r.eventos.push(ev);
  c.gravarJSON(arquivoDe(pastaCaso), r);
  return ev;
}

// ---------- situacao ----------
/** {situacao: 'sem-registro'|'autorizado'|'nao-autorizado'|'revogado'|'ilegivel', ultimo, autorizacao, eventos} */
function situacao(pastaCaso) {
  let r = null; try { r = ler(pastaCaso); } catch (e) { r = { invalido: true, eventos: [] }; }
  if (!r) return { situacao: 'sem-registro', eventos: [] };
  if (r.invalido) return { situacao: 'ilegivel', eventos: [] };
  const decisivos = r.eventos.filter((e) => e.evento === 'registro' || e.evento === 'revogacao');
  const ultimo = decisivos[decisivos.length - 1] || null;
  const autorizacao = r.eventos.filter((e) => e.evento === 'registro').pop() || null;
  if (!ultimo) return { situacao: 'sem-registro', eventos: r.eventos };
  if (ultimo.evento === 'revogacao') return { situacao: 'revogado', ultimo, autorizacao, eventos: r.eventos };
  return { situacao: ultimo.autorizou && ultimo.autorizou.usoIA === false ? 'nao-autorizado' : 'autorizado', ultimo, autorizacao, eventos: r.eventos };
}
const quemTxt = (e) => (e && e.quem === 'representante' ? 'o representante do cliente' : 'o cliente');
const formaTxt = (f) => FORMAS[f] || f || 'forma não informada';
/** Uma linha, sem nome de pessoa (vai para /processo, statusline de avisos, doutor). */
function resumo(st) {
  const u = st.ultimo;
  if (st.situacao === 'sem-registro') return 'sem registro de consentimento do cliente para uso de IA';
  if (st.situacao === 'ilegivel') return 'o registro de consentimento ficou ilegível (não mexi nele)';
  if (st.situacao === 'revogado') return 'REVOGADO em ' + dataBR(u.data) + ' (' + formaTxt(u.forma) + ')';
  if (st.situacao === 'nao-autorizado') return 'o cliente NÃO autorizou o uso de IA (' + dataBR(u.data) + ', ' + formaTxt(u.forma) + ')';
  const a = u.autorizou || {};
  return 'autorizado em ' + dataBR(u.data) + ', ' + formaTxt(u.forma) + ' (uso de IA' + (a.envioDocumentos === false ? '; sem envio de documentos ao Claude' : '; envio de documentos ao Claude') + (a.anonimizacaoObrigatoria ? '; anonimização OBRIGATÓRIA' : '') + ')' + (u.comprovante ? '; comprovante: ' + u.comprovante : '; sem comprovante anotado');
}
/** Avisos para o assistente repassar ao advogado (nunca bloqueiam). opts.anonimizada: boolean (senao consulta a tabela). */
function avisos(pastaCaso, opts) {
  opts = opts || {};
  const st = opts.st || situacao(pastaCaso);
  const nome = path.basename(pastaCaso);
  const out = [];
  if (st.situacao === 'sem-registro') out.push('O caso ' + nome + ' não tem consentimento do cliente para uso de IA registrado. Se o cliente já autorizou, anote com /consentimento; se ainda não, posso gerar o termo para ele assinar (/consentimento modelo). Não trava o trabalho.');
  else if (st.situacao === 'revogado') out.push('⚠️ O cliente revogou a autorização de uso de IA neste caso (' + dataBR(st.ultimo.data) + '). Avise o advogado antes de seguir; o trabalho não fica travado, mas o recomendável é parar de enviar documentos do caso à conversa ou, no mínimo, ligar a anonimização (/anonimizar ' + nome + ').');
  else if (st.situacao === 'nao-autorizado') out.push('⚠️ O cliente não autorizou o uso de IA neste caso (' + dataBR(st.ultimo.data) + '). Avise o advogado antes de seguir; o trabalho não fica travado, mas o recomendável é não enviar documentos do caso à conversa ou, no mínimo, ligar a anonimização (/anonimizar ' + nome + ').');
  else if (st.situacao === 'ilegivel') out.push('O registro de consentimento do caso ' + nome + ' ficou ilegível. Não mexi nele; o advogado pode abrir a pasta _consentimento do caso para conferir, e dá para registrar de novo com /consentimento.');
  if (st.situacao === 'autorizado' && st.ultimo.autorizou && st.ultimo.autorizou.anonimizacaoObrigatoria) {
    let anon = opts.anonimizada;
    if (anon == null) { try { anon = require('./anonimizar').ativa(pastaCaso); } catch (e) { anon = true; } }
    if (!anon) out.push('⚠️ O cliente só autorizou o uso de IA com anonimização, e ela está desligada neste caso. Ligue antes de ler documentos: /anonimizar ' + nome + '.');
  }
  if (st.situacao === 'autorizado' && st.ultimo.autorizou && st.ultimo.autorizou.envioDocumentos === false) out.push('O cliente autorizou o uso de IA, mas não o envio de documentos do caso ao Claude: trabalhe com o que o advogado escrever na conversa, sem abrir os documentos do caso.');
  return out;
}

// ---------- DOSSIE ----------
const PLACEHOLDER = /^\[.*\]$|^\s*$|a confirmar/i;
/** Nome do cliente (ou do representante) como esta no DOSSIE.md; null se ausente/placeholder. */
function nomeDoDossie(pastaCaso, papel) {
  let t = ''; try { t = fs.readFileSync(path.join(pastaCaso, 'DOSSIE.md'), 'utf8'); } catch (e) { return null; }
  const rot = papel === 'representante' ? /^(Representante(?: legal)?|Respons[aá]vel legal)$/i : /^(Cliente|Clientes)$/i;
  for (const linha of t.replace(/\r/g, '').split('\n')) {
    for (const seg of linha.replace(/^\s*[-*>]\s*/, '').split(/\s+·\s+/)) {
      const m = seg.match(/^\s*\**([^:*]{2,30}?)\**\s*:\s*(.+)$/);
      if (!m || !rot.test(m[1].trim())) continue;
      const v = m[2].replace(/\([^)]*\)/g, '').replace(/[*_]/g, '').trim().replace(/[,.;]$/, '');
      if (!PLACEHOLDER.test(v) && /\p{L}{2}/u.test(v) && v.length <= 120) return v;
    }
  }
  return null;
}

// ---------- termo ----------
function termo(o) {
  const cliente = o.cliente || '[NOME DO CLIENTE]';
  const quem = o.representante ? o.representante + ', representante legal de ' + cliente : cliente;
  return [
    '---',
    'tipo: documento-conformidade',
    'observacao: "modelo de apoio gerado pelo assistente; ajuste ao seu contrato de honorários e confira o texto oficial da Recomendação CFOAB nº 001/2024."',
    '---',
    '# TERMO DE CIÊNCIA E CONSENTIMENTO SOBRE USO DE FERRAMENTAS DE INTELIGÊNCIA ARTIFICIAL',
    '',
    '<!-- sem-recuo -->',
    'Eu, ' + quem + ', [QUALIFICAÇÃO], declaro estar ciente de que o(a) advogado(a) ' + (o.advogado || '[NOME DO ADVOGADO]') + ', ' + (o.oab || 'OAB/[UF] nº [NÚMERO]') + ', poderá utilizar ferramentas de inteligência artificial como **apoio** na organização de documentos, pesquisa e redação de minutas do meu caso, nas condições que marco abaixo:',
    '',
    '( ) Autorizo o uso de ferramentas de inteligência artificial como apoio no meu caso.',
    '( ) Autorizo o envio de documentos do caso ao assistente de IA utilizado pelo escritório (Claude, da empresa Anthropic), que processa o texto em servidores fora do escritório.',
    '( ) Exijo que, antes de qualquer envio, meus dados (nome, CPF/CNPJ, número do processo, endereço, e-mail e telefone) sejam trocados por marcadores (anonimização).',
    '( ) Não autorizo o uso de inteligência artificial no meu caso.',
    '',
    '1. Toda manifestação é revisada e assinada pelo(a) advogado(a), que permanece integralmente responsável pelo trabalho técnico.',
    '2. Os documentos do caso ficam guardados no computador do escritório; dados pessoais só são enviados a ferramentas externas dentro do que autorizei acima e com as cautelas da Lei nº 13.709/2018 (LGPD).',
    '3. Posso revogar este consentimento a qualquer tempo, por escrito, sem prejuízo da prestação dos serviços.',
    '',
    '<!-- centralizar -->',
    (o.cidade || '[CIDADE]') + ', ' + dataExtenso(o.data || hoje()) + '.',
    '',
    '<!-- centralizar -->',
    '____________________________________',
    '',
    '<!-- centralizar -->',
    quem,
    '',
  ].join('\n');
}

// ---------- guarda de escrita ----------
const MSG = 'O registro de consentimento do cliente só é gravado pela ferramenta do assistente (consentimento.js), dentro da pasta do caso, e o histórico nunca é apagado. Para registrar, revogar ou ver: /consentimento.';
/** Gravacao direta (Write/Edit) no registro ou copia do registro para fora do caso => deny. */
function avaliarGravacao(arquivo, texto) {
  try {
    if (ehRegistro(arquivo)) return { decisao: 'deny', motivo: MSG };
    if (texto && texto.includes('"' + ASSINATURA + '"')) return { decisao: 'deny', motivo: 'Isso parece o registro de consentimento do cliente (ou um pedaço dele) indo para outro arquivo. Ele só existe em <caso>/' + PASTA + '/ e não é copiado. ' + MSG };
    return null;
  } catch (e) { c.log('erros', 'consentimento avaliarGravacao: ' + e.message); return null; }
}

module.exports = { PASTA, ASSINATURA, FORMAS, arquivoDe, ehRegistro, hoje, dataBR, dataExtenso, lerData, ler, acrescentar, situacao, resumo, avisos, quemTxt, formaTxt, nomeDoDossie, termo, avaliarGravacao };
