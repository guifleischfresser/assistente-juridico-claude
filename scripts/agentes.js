#!/usr/bin/env node
'use strict';
/*
 * Portabilidade: gera o AGENTS.md do ESCRITORIO com as mesmas regras do CLAUDE.md, para usar o mesmo
 * escritorio no Codex (OpenAI) ou no Cursor. O Claude Code continua sendo o principal: so ele tem as
 * guardas automaticas (hooks); nos outros, o AGENTS.md lista as conferencias para fazer a mao.
 * Uso: node agentes.js gerar [--skills] [--codex-global] [--simular]
 *        --skills        copia as skills para ESCRITORIO/.agents/skills (formato lido pelo Codex)
 *        --codex-global  grava tambem um bloco marcado em ~/.codex/AGENTS.md (respeita CODEX_HOME)
 *      node agentes.js mostrar
 * So texto local; nada sai do computador. Conteudo fora das marcas e do usuario e nunca e alterado.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const c = require('./lib/comum');

const INI = '<!-- advogado-claude-mod:agents:inicio -->';
const FIM = '<!-- advogado-claude-mod:agents:fim -->';
const barra = (p) => String(p).replace(/\\/g, '/');

function dirSkills() {
  const cand = [path.join(c.P.base, 'pacote', 'skills'), path.join(__dirname, '..', 'skills')];
  const pl = c.lerJSON(path.join(c.P.base, 'plugin.json'), null); if (pl && pl.raiz) cand.unshift(path.join(pl.raiz, 'skills'));
  return cand.find((d) => fs.existsSync(path.join(d, 'nova-peca', 'SKILL.md'))) || c.P.skillsVivas;
}
function modeloGlobal() {
  const cand = [path.join(__dirname, '..', 'templates', 'claude-global', 'CLAUDE.md'), path.join(c.P.base, 'pacote', 'templates', 'claude-global', 'CLAUDE.md')];
  const f = cand.find((x) => fs.existsSync(x));
  return f ? fs.readFileSync(f, 'utf8') : '';
}
/** Regras inegociaveis do CLAUDE.md global (mesmo texto, para nao divergir). */
function regrasNucleo(texto) {
  const m = texto.match(/## Regras inegociáveis\n([\s\S]*?)\n## /);
  return m ? m[1].trim() : '';
}

function conteudo(esc, nome, sk) {
  const base = barra(c.P.base);
  const S = base + '/scripts';
  const regras = regrasNucleo(modeloGlobal());
  return [INI,
    '# Assistente jurídico — Advogado Claude Mod (AGENTS.md)',
    '',
    '> Gerado por `node "' + S + '/agentes.js" gerar` a partir das mesmas regras do CLAUDE.md. Vale para Codex, Cursor e outros agentes que leem AGENTS.md. O principal continua sendo o **Claude Code** (lá as proteções rodam sozinhas). Edite só fora destas marcas.',
    '',
    '## Quem atendo',
    '- Usuário: ' + (nome ? nome + ', advogado(a)' : 'advogado(a)') + ' no Brasil, **sem conhecimento técnico**. Português simples, uma pergunta por vez, sem jargão de informática.',
    '- Escritório: `' + barra(esc) + '` (esta pasta). Mapa em `ESTRUTURA.md`; perfil do escritório em `CLAUDE.md`; estilo em `ESTILO/perfil-de-escrita.md` (leia antes de redigir).',
    '',
    '## Regras inegociáveis',
    regras || '1. Sigilo profissional e LGPD: nada sai do computador sem pedido explícito. 2. Nunca invente julgado; sem fonte conferida, [NÃO VERIFICADO].',
    '',
    '## Aqui não há as proteções automáticas do Claude Code — faça à mão',
    '- **Internet:** antes de qualquer pesquisa ou acesso a site, peça confirmação ao advogado, salvo sites que ele já autorizou (`node "' + S + '/julgados.js" politica`). Nunca pesquise com nome, CPF, CNPJ ou número de processo do cliente.',
    '- **Antes de sobrescrever** um arquivo do escritório, copie a versão atual para `_versoes/`. Nunca apague.',
    '- **Antes de entregar uma peça:** `node "' + S + '/checar-peca.js" "<arquivo>"` (citações e formatação) e `node "' + S + '/erros.js" testar "<arquivo>"` (erros que o advogado já corrigiu: 🛑 = não entregue assim).',
    '- **Mapa de teses:** `node "' + S + '/mapa-teses.js" validar "<mapa>"` até ✅.',
    '- **Uma conversa por processo:** `node "' + S + '/processo.js" abrir "<caso>"`; dados do cliente só no `DOSSIE.md` do caso (`processo.js anotar`), nunca em memória global.',
    '- **Contexto perto do limite:** salve um handoff no `HANDOFF.md` do caso e em `HANDOFFS/`.',
    '- Não crie nem altere skills automaticamente fora do Claude Code (a auto-melhoria depende das salvaguardas dele).',
    '',
    '## Procedimentos (skills)',
    '- Ficam em `' + barra(sk) + '/<nome>/SKILL.md`' + (fs.existsSync(path.join(esc, '.agents', 'skills')) ? ' e, para o Codex, em `.agents/skills/`' : '') + '. Quando a tarefa pedir, **leia o SKILL.md correspondente** e siga-o: `processo`, `novo-caso`, `nova-peca`, `mapa-de-teses`, `revisar`, `advogado-do-diabo`, `verificar-citacoes`, `preparar-autos`, `prazos`, `casos`, `handoff`, `erros`.',
    '- Os comandos das skills usam `$HOME/.claude/advogado/scripts/` (no Windows: `$env:USERPROFILE\\.claude\\advogado\\scripts\\`).',
    '',
    '## Como abrir',
    '- Codex: abra **dentro desta pasta** (`cd "' + barra(esc) + '"` e `codex`). Ele lê este AGENTS.md (da raiz do git até a pasta atual; fora de git, só a pasta atual). Limite de 32 KiB: mantenha curto.',
    '- Cursor: abra esta pasta como projeto; ele também lê AGENTS.md.',
    FIM, ''].join('\n');
}

function mesclar(arq, bloco, simular) {
  const atual = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : '';
  const re = new RegExp(INI + '[\\s\\S]*?' + FIM + '\\n?');
  const novo = re.test(atual) ? atual.replace(re, bloco) : (atual.trim() ? atual.trimEnd() + '\n\n' + bloco : bloco);
  if (!simular && novo !== atual) {
    if (atual) c.versionar(arq, path.join(path.dirname(arq), '_versoes'), path.dirname(arq));
    c.garantirDir(path.dirname(arq)); fs.writeFileSync(arq, novo, 'utf8');
  }
  return novo !== atual;
}

function copiarSkills(origem, destino) {
  let n = 0;
  for (const nome of fs.readdirSync(origem)) {
    const o = path.join(origem, nome); if (!fs.existsSync(path.join(o, 'SKILL.md'))) continue;
    const d = path.join(destino, nome); fs.rmSync(d, { recursive: true, force: true });
    (function cp(a, b) { c.garantirDir(b); for (const f of fs.readdirSync(a)) { const x = path.join(a, f), y = path.join(b, f); if (fs.statSync(x).isDirectory()) cp(x, y); else fs.copyFileSync(x, y); } })(o, d);
    n++;
  }
  return n;
}

function gerar(o) {
  o = o || {};
  const cfg = c.config();
  const esc = o.escritorio || cfg.escritorio;
  if (!fs.existsSync(esc)) throw new Error('ESCRITORIO não existe: ' + esc);
  const sk = dirSkills();
  const r = { arquivo: path.join(esc, 'AGENTS.md'), skills: 0, codex: null };
  if (o.skills && !o.simular) r.skills = copiarSkills(sk, path.join(esc, '.agents', 'skills'));
  const bloco = conteudo(esc, cfg.nome, sk);
  if (Buffer.byteLength(bloco) > 30000) throw new Error('AGENTS.md passaria de 30 KB');
  r.mudou = mesclar(r.arquivo, bloco, o.simular);
  if (o.codexGlobal) {
    r.codex = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'AGENTS.md');
    mesclar(r.codex, bloco.replace('(esta pasta)', '(abra o Codex dentro dela)'), o.simular);
  }
  return r;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === 'gerar') {
    const r = gerar({ skills: a.includes('--skills'), codexGlobal: a.includes('--codex-global'), simular: a.includes('--simular') });
    console.log((r.mudou ? '✅ AGENTS.md gerado: ' : '✅ AGENTS.md já estava atualizado: ') + r.arquivo + (r.skills ? '\n   ' + r.skills + ' skill(s) copiadas para .agents/skills (Codex)' : '') + (r.codex ? '\n   Bloco global do Codex: ' + r.codex : '') + '\nNo Codex ou no Cursor, abra a pasta do escritório; as proteções automáticas só existem no Claude Code.');
  } else if (a[0] === 'mostrar') {
    console.log(conteudo(c.config().escritorio, c.config().nome, dirSkills()));
  } else { console.log('Uso: agentes.js gerar [--skills] [--codex-global] [--simular] | mostrar'); process.exit(1); }
}
module.exports = { gerar, conteudo, INI, FIM };
