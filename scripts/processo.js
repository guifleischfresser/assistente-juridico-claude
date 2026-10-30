#!/usr/bin/env node
'use strict';
/*
 * Uma conversa por processo/cliente: abre (ou retoma) o contexto de UM caso.
 * Uso: node processo.js abrir <nome ou número do processo>   resumo do caso + CASO_ATIVO=<pasta>
 *      node processo.js listar
 *      node processo.js anotar <caso> "<texto>"               grava no DOSSIE.md do caso (dados do cliente ficam só lá)
 *      node processo.js atual                                 casos abertos recentemente (por conversa)
 *      node processo.js foro <caso> [--tribunal TJPR] [--comarca Curitiba]
 *                                    tribunal/comarca do caso (linha "Tribunal: … · Comarca: …" no DOSSIE.md);
 *                                    o /prazos usa esse foro para escolher o calendário forense (v0.7)
 * Caso anonimizado (/anonimizar): abrir mostra DOSSIE e HANDOFF já com marcadores.
 * Consentimento do cliente (/consentimento): abrir mostra o estado e avisa (sem travar) se falta, foi revogado
 * ou exige anonimização desligada.
 * Tudo local. A memória global (MEMORIA/) nunca recebe dados do cliente.
 */
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');
const k = require('./lib/casos');

const a = process.argv.slice(2);
const esc = c.config().escritorio;
const ler = (f, max) => { try { const t = fs.readFileSync(f, 'utf8'); return t.length > max ? t.slice(0, max) + '\n[…continua no arquivo]' : t; } catch (e) { return null; } };
function unico(termo) {
  const r = k.buscar(termo, esc);
  if (r.length === 1) return r[0];
  if (!r.length) { const t = k.listar(esc); console.log('Não achei caso com "' + termo + '".' + (t.length ? ' Casos do escritório:\n' + t.slice(0, 30).map((x) => '- ' + x.rel).join('\n') : ' Nenhum caso ainda — use /novo-caso.')); process.exit(3); }
  console.log('Mais de um caso combina com "' + termo + '". Qual deles?\n' + r.slice(0, 15).map((x) => '- ' + x.rel).join('\n')); process.exit(3);
}

switch (a[0]) {
  case 'abrir': {
    const termo = a.slice(1).join(' ');
    if (!termo) { console.log('Uso: abrir <nome do caso ou número do processo>'); process.exit(1); }
    const x = unico(termo);
    let dossie = ler(path.join(x.pasta, 'DOSSIE.md'), 5000);
    let handoff = ler(path.join(x.pasta, 'HANDOFF.md'), 2500);
    // caso anonimizado: dossie e handoff chegam a conversa com marcadores (tabela so na pasta do caso)
    const an = require('./lib/anonimizar'); const tab = an.lerTabela(x.pasta); const anonimo = !!(tab && tab.ativa !== false);
    if (anonimo) {
      if (dossie) dossie = an.anonimizarTexto(dossie, tab).texto;
      if (handoff) handoff = an.anonimizarTexto(handoff, tab).texto;
      an.gravarTabela(x.pasta, tab);
    }
    let pecas = []; try { pecas = fs.readdirSync(path.join(x.pasta, 'pecas')).filter((f) => /\.(md|docx)$/i.test(f)).sort().reverse().slice(0, 6); } catch (e) { /* */ }
    const autos = fs.existsSync(path.join(x.pasta, 'autos-md', 'INDICE.md'));
    console.log('CASO_ATIVO=' + x.pasta);
    console.log('📁 Processo aberto: ' + x.nome + ' (' + x.fase + ')\n');
    console.log('=== DOSSIE.md ===\n' + (dossie || '(sem DOSSIE.md — crie com /novo-caso)'));
    if (handoff) console.log('\n=== HANDOFF.md (onde paramos) ===\n' + handoff);
    console.log('\n=== Peças recentes ===\n' + (pecas.length ? pecas.map((f) => '- pecas/' + f).join('\n') : '(nenhuma)'));
    const foro = require('./lib/calendario').foroDoCaso(x.pasta);
    console.log('\nCalendário forense do caso: ' + (foro.tribunal || foro.comarca ? require('./lib/calendario').descreverContexto(foro) + ' (prazos deste caso usam os feriados e suspensões desse foro)' : 'tribunal/comarca não informados — pergunte ao advogado e grave com processo.js foro "' + x.nome + '" --tribunal <sigla> --comarca <cidade>'));
    // consentimento do cliente (LGPD): mostra sempre; avisa sem travar (sem registro, revogado, anonimizacao exigida e desligada)
    try {
      const cs = require('./lib/consentimento'); const stc = cs.situacao(x.pasta);
      console.log('\nConsentimento do cliente para uso de IA: ' + cs.resumo(stc) + '.');
      for (const av of cs.avisos(x.pasta, { st: stc, anonimizada: anonimo })) console.log(av);
    } catch (e) { c.log('erros', 'consentimento abrir: ' + e.message); }
    console.log('\nAutos convertidos: ' + (autos ? 'sim (autos-md/INDICE.md)' : 'não — use /preparar-autos se precisar ler o processo'));
    if (anonimo) console.log('\n🔒 Caso ANONIMIZADO: leia só as cópias em anonimizado/ (dossiê acima já com marcadores), escreva a peça com os marcadores ([PARTE_A], [CPF_1]…) e nunca abra _anonimizacao/. Dados reais só no fim: /anonimizar reverter <peça>.');
    console.log('\nRegras desta conversa: trabalhe só neste caso; leia outros casos apenas se o advogado pedir; anotações do cliente vão para o DOSSIE.md deste caso (processo.js anotar), nunca para MEMORIA/.');
    break;
  }
  case 'listar': { const t = k.listar(esc); console.log(t.length ? t.map((x) => '- ' + x.rel).join('\n') : 'Nenhum caso ainda.'); break; }
  case 'anotar': {
    const x = unico(a[1] || ''); const texto = a.slice(2).join(' ').trim();
    if (!texto) { console.log('Uso: anotar <caso> "<texto>"'); process.exit(1); }
    const f = path.join(x.pasta, 'DOSSIE.md');
    let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch (e) { t = '# DOSSIÊ — ' + x.nome + '\n'; }
    c.versionar(f, path.join(esc, '_versoes'), esc);
    const linha = '- ' + c.hojeISO() + ': ' + texto.replace(/\s+/g, ' ');
    const m = t.match(/^##\s+Notas da conversa.*$/m);
    t = m ? t.slice(0, m.index + m[0].length) + '\n' + linha + t.slice(m.index + m[0].length) : t.trimEnd() + '\n\n## Notas da conversa\n' + linha + '\n';
    fs.writeFileSync(f, t, 'utf8');
    console.log('📝 Anotado no DOSSIE.md de ' + x.rel);
    break;
  }
  case 'atual': {
    const v = k.lerVinculos(); const l = Object.values(v).sort((p, q) => String(q.em).localeCompare(String(p.em))).slice(0, 8);
    console.log(l.length ? 'Casos abertos recentemente (uma conversa cada):\n' + l.map((x) => '- ' + x.caso + ' (' + String(x.em).slice(0, 10) + ')').join('\n') : 'Nenhuma conversa vinculada a caso ainda. Use /processo <nome>.');
    break;
  }
  case 'foro': {
    const cl = require('./lib/calendario');
    const iT = a.indexOf('--tribunal'), iC = a.indexOf('--comarca');
    const tribunal = iT > 0 ? cl.limparTribunal(a[iT + 1]) : '', comarca = iC > 0 ? cl.limparComarca(a[iC + 1]) : '';
    const fim = [iT, iC].filter((n) => n > 0).sort((p, q) => p - q)[0];
    const x = unico(a.slice(1, fim > 0 ? fim : undefined).join(' '));
    const f = path.join(x.pasta, 'DOSSIE.md');
    if (!tribunal && !comarca) { const fo = cl.foroDoCaso(x.pasta); console.log('Foro de ' + x.rel + ': ' + (fo.tribunal || fo.comarca ? cl.descreverContexto(fo) : 'não informado') + '\nPara gravar: processo.js foro "' + x.nome + '" --tribunal <sigla> --comarca <cidade>'); break; }
    let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch (e) { t = '# DOSSIÊ — ' + x.nome + '\n\n## Identificação\n'; }
    const atual = cl.foroDoCaso(x.pasta);
    const linha = '- Tribunal: ' + (tribunal || atual.tribunal || '[TRIBUNAL]') + ' · Comarca: ' + (comarca || atual.comarca || '[COMARCA]') + ' (calendário forense dos prazos)';
    c.versionar(f, path.join(esc, '_versoes'), esc);
    const re = /^[ \t]*[-*]?[ \t]*\**Tribunal\**[ \t]*:.*$/m;
    if (re.test(t)) t = t.replace(re, linha);
    else { const m = t.match(/^##\s+Identifica.*$/m); t = m ? t.slice(0, m.index + m[0].length) + '\n' + linha + t.slice(m.index + m[0].length) : t.trimEnd() + '\n\n' + linha + '\n'; }
    fs.writeFileSync(f, t, 'utf8');
    console.log('⚖️ Foro de ' + x.rel + ': ' + cl.descreverContexto(cl.foroDoCaso(x.pasta)) + ' — os prazos deste caso passam a usar esse calendário forense.');
    break;
  }
  default: console.log('Uso: processo.js abrir <caso> | listar | anotar <caso> "<texto>" | atual | foro <caso> [--tribunal X] [--comarca Y]'); process.exit(1);
}
