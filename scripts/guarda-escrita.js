#!/usr/bin/env node
'use strict';
// Hook PreToolUse (Write|Edit|MultiEdit|NotebookEdit): guardas de escrita.
//  1. Fontes brutas (ESTILO/amostras, WIKI/raw) nunca sao editadas.
//  2. Skills do mod (nucleo e auto-*) nao sao editadas direto: rascunho + publicar (versiona e registra).
//  3. Arquivos de "harness" (CLAUDE.md, skills, memoria) nao recebem dados de clientes (CPF, processo...).
//  4. CLAUDE.md global fica curto (aponte, nao copie).
//  5. Ler antes de sobrescrever (Write em arquivo existente nao lido nesta sessao).
//  1a. v0.6: texto oculto (fonte branca/minuscula, vanish, largura zero) em peca/documento => nega.
//  1b. Pastas originais registradas (mapa-de-pastas) => pede confirmacao.
//  6. Caso arquivado => pede confirmacao. 7. Versiona (backup) antes de alterar arquivo existente.
//  0. Anonimizacao: a tabela (dados reais) so e gravada pelo anonimizar.js, nunca sai da pasta do caso
//     e nada dela vai para CLAUDE.md, skills, memoria ou perfil de estilo.
//  0b. Consentimento: o registro (<caso>/_consentimento/registro.json) so e gravado pelo consentimento.js
//      (historico nunca apagado) e o conteudo dele nao e copiado para nenhum outro arquivo.
const fs = require('fs');
const path = require('path');
const c = require('./lib/comum');

const deny = (m) => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: m } });
const ask = (m) => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: m } });
const SIGILO_FORTE = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;

c.rodarHook('guarda-escrita', (ent) => {
  const inp = ent.tool_input || {};
  const arq = inp.file_path || inp.notebook_path;
  if (!arq) return {};
  const cfg = c.config();
  const esc = cfg.escritorio;
  const existe = fs.existsSync(arq);
  const novoTexto = [inp.content, inp.new_string].concat((inp.edits || []).map((e) => e.new_string)).filter(Boolean).join('\n');

  // 0. Tabela de anonimizacao: so o script grava; conteudo dela fora da pasta do caso e negado
  const ehHarness = /CLAUDE\.md$/i.test(arq) || c.dentroDe(arq, path.join(esc, 'MEMORIA')) || c.dentroDe(arq, c.P.hab) || c.dentroDe(arq, c.P.skillsVivas) || /[\\/]memory[\\/]/.test(arq) || /[\\/]ESTILO[\\/]perfil-de-escrita\.md$/i.test(arq);
  const an = require('./lib/anonimizar').avaliarGravacao(arq, novoTexto, ehHarness, esc);
  if (an) { c.log('guardas', 'anonimizacao: gravacao negada em ' + path.basename(arq)); return deny(an.motivo); }
  // 0b. Registro de consentimento: so o consentimento.js grava, dentro da pasta do caso; nunca copiado para fora
  const cs = require('./lib/consentimento').avaliarGravacao(arq, novoTexto);
  if (cs) { c.log('guardas', 'consentimento: gravacao negada em ' + path.basename(arq)); return deny(cs.motivo); }

  // 1. Fontes brutas
  for (const bruto of ['ESTILO/amostras', 'WIKI/raw']) {
    if (c.dentroDe(arq, path.join(esc, bruto)) && existe) {
      return deny('A pasta ' + bruto + ' guarda FONTES ORIGINAIS e nunca é editada. Crie um arquivo derivado (ex.: ESTILO/perfil-de-escrita.md ou WIKI/paginas/...) citando a fonte.');
    }
  }

  // 1a. v0.6: NUNCA inserir texto oculto em peca/documento juridico (fonte branca, minuscula, vanish,
  // caracteres de largura zero, CSS que esconde). Bloqueio duro, antes de qualquer "ask".
  try {
    const ehDocJuridico = /\.(md|txt|html?|rtf|xml)$/i.test(arq) && (require('./memoria').ehPeca(arq) ||
      ['PECAS', 'EXPORTADOS', 'MODELOS'].some((p) => c.dentroDe(arq, path.join(esc, p))) ||
      (c.dentroDe(arq, path.join(esc, 'CASOS')) && !/[\\/](autos-md|_versoes)[\\/]/i.test(arq)) || !!require('./lib/mapa').emPastaExterna(arq));
    if (ehDocJuridico && novoTexto) {
      const inj = require('./lib/injecao');
      const oc = inj.ocultoNoTexto(novoTexto);
      if (oc.length) {
        c.log('guardas', 'texto oculto barrado em ' + path.basename(arq) + ': ' + oc.map((o) => o.motivo).join(','));
        return deny(inj.avisoGravacao(oc, 'no texto que eu ia gravar em "' + path.basename(arq) + '"') + ' (Para o assistente: remova os caracteres invisíveis e qualquer formatação que esconda texto; diga isso ao advogado em uma linha, sem termos técnicos.)');
      }
    }
  } catch (e) { c.log('erros', 'oculto pre: ' + e.message); }

  // 1b. Pastas originais do advogado (registradas por apontamento): somente leitura por padrao
  try {
    const ext = require('./lib/mapa').emPastaExterna(arq);
    if (ext) return ask('Esse arquivo fica numa pasta sua, ' + require('./lib/diagnostico').nomeAmigavel(ext) + ', que eu normalmente só leio. Quer mesmo que eu grave nela? (O normal é eu salvar no escritório.)');
  } catch (e) { /* sem mapa */ }

  // 2. Skills do mod
  if (c.dentroDe(arq, c.P.skillsVivas)) {
    const rel = path.relative(c.P.skillsVivas, arq).split(/[\\/]/);
    const nomeSkill = rel[0];
    const reg = c.lerJSON(path.join(c.P.hab, 'registro.json'), { skills: {} });
    if (nomeSkill && (nomeSkill.startsWith('auto-') || (reg.skills && reg.skills[nomeSkill]))) {
      const rasc = path.join(c.P.hab, 'rascunhos', nomeSkill.replace(/^auto-/, ''));
      return deny('Skills do Advogado Claude Mod não são editadas direto (salvaguarda: versão + teste + registro). Escreva o rascunho em "' + rasc + '/SKILL.md", depois rode: node "' + path.join(c.P.base, 'scripts', 'habilidades.js') + '" validar ' + path.basename(rasc) + ' && node "' + path.join(c.P.base, 'scripts', 'habilidades.js') + '" publicar ' + path.basename(rasc) + ' "motivo". Skills do núcleo não podem ser alteradas; crie uma auto-* complementar.');
    }
  }

  // 2b. Antes de o assistente mexer numa peca que o advogado pode ter editado: aprende com as edicoes dele
  try { const mem = require('./memoria'); if (existe && mem.ehPeca(arq)) mem.aprenderEdicoes(arq); } catch (e) { c.log('erros', 'aprender pre: ' + e.message); }

  // 2c. Erros ja corrigidos pelo advogado (guarda de erros repetidos): bloqueio => nega; aviso => PostToolUse avisa
  try {
    const mem = require('./memoria');
    if (mem.ehPeca(arq) || /\.(md|txt)$/i.test(arq) && c.dentroDe(arq, esc)) {
      const er = require('./lib/erros');
      const hits = er.verificar(novoTexto, { ehPeca: mem.ehPeca(arq) }).filter((h) => h.nivel === 'bloqueio');
      if (hits.length) {
        er.marcarDisparos(hits.map((h) => h.id));
        c.log('guardas', 'erro repetido bloqueado em ' + path.basename(arq) + ': ' + hits.map((h) => h.id).join(','));
        return deny('🛑 Erro que o advogado já corrigiu mais de uma vez (não repita): ' + hits.map((h) => require('./lib/erros').texto(h)).join(' | ') + '. Corrija o texto e grave de novo. (Lista: node "' + path.join(c.P.base, 'scripts', 'erros.js') + '" listar)');
      }
    }
  } catch (e) { c.log('erros', 'erros repetidos pre: ' + e.message); }

  // 3. Harness/memoria global sem dados de clientes
  if (ehHarness && SIGILO_FORTE.test(novoTexto)) {
    return deny('Arquivos de configuração e memória do assistente (CLAUDE.md, skills, memória automática, MEMORIA/, perfil de escrita) não podem conter CPF, CNPJ ou número de processo. Substitua por marcadores como [CLIENTE], [CPF], [Nº PROCESSO]. Dados de clientes ficam só em CASOS/.');
  }

  // 4. CLAUDE.md global curto
  if (c.norm(arq) === c.norm(path.join(c.P.claude, 'CLAUDE.md')) && inp.content && inp.content.split(/\r?\n/).length > 80) {
    return deny('O CLAUDE.md global deve ficar curto (até 80 linhas). Mova detalhes para uma skill, para ESTRUTURA.md ou para o CLAUDE.md do ESCRITORIO e apenas aponte para eles.');
  }

  // 5. Ler antes de sobrescrever
  const relevante = c.dentroDe(arq, esc) || /CLAUDE\.md$/i.test(arq);
  if (existe && relevante && ent.tool_name === 'Write') {
    const s = c.lerSessao(ent.session_id);
    if (!s.lidos.includes(c.norm(arq))) {
      return deny('Leia o arquivo "' + path.basename(arq) + '" (ferramenta Read) antes de sobrescrevê-lo, para não perder conteúdo do advogado.');
    }
  }

  // 6. Caso arquivado
  if (existe && c.dentroDe(arq, path.join(esc, 'CASOS', 'Arquivados'))) {
    return ask('Esse caso está arquivado. Quer mesmo que eu mexa nele? (Para reabrir o caso, use /casos.)');
  }

  // 7. Versionar antes de alterar
  if (existe) {
    let destino = null;
    if (c.dentroDe(arq, esc) && !c.dentroDe(arq, path.join(esc, '_versoes'))) destino = c.versionar(arq, path.join(esc, '_versoes'), esc);
    else if (/CLAUDE\.md$/i.test(arq) || /[\\/]memory[\\/]/.test(arq)) {
      destino = c.versionar(arq, path.join(c.P.base, 'versoes-harness'), c.P.claude);
      try {
        c.garantirDir(c.P.hab);
        fs.appendFileSync(path.join(c.P.hab, 'changelog-harness.md'), '- ' + new Date().toISOString() + ' alterado ' + arq + ' (backup: ' + destino + ')\n', 'utf8');
      } catch (e) { /* ignora */ }
    }
    if (destino) c.log('versoes', arq + ' -> ' + destino);
  }
  return {};
});
