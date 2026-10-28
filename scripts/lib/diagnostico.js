'use strict';
/*
 * Diagnostico compartilhado entre o hook SessionStart (sessao-inicio.js) e o doutor (doutor.js),
 * para os dois nunca divergirem. Detecta quando o Claude Code "perdeu o fio":
 *  1. modo auto desligado (permissions.defaultMode !== "auto" / sessao aberta em Manual);
 *  2. pastas registradas (ESCRITORIO, pastas externas, "Pasta original" dos casos) sumiram ou nao abrem;
 *  3. acessos gravados pelo instalador sumiram (additionalDirectories, permissions.allow, hooks, bloco do CLAUDE.md).
 * Cada problema: { id, nivel: 'erro'|'aviso', aviso (texto coloquial para o advogado: causa + 1 passo),
 *   tecnico (detalhe para o doutor/Claude), conserto ('reinstalar'|'mapa'|'reconectar'|'pastas'|'modo'|null) }.
 * REGRA DE LINGUAGEM: o campo "aviso" e lido pelo advogado. Nada de jargao (settings, hook, JSON, permissao...).
 * Rapido (so fs) e sem rede; nunca lanca.
 */
const fs = require('fs');
const path = require('path');
const c = require('./comum');

const ID_PLUGIN = 'advogado-claude@advogado-claude-mod';
const EVENTOS = { SessionStart: 'sessao-inicio.js', UserPromptSubmit: 'registro-pedidos.js', PreToolUse: 'guarda-escrita.js', Stop: 'gatilho-handoff.js', PostToolUse: 'pos-ferramenta.js', SessionEnd: 'memoria.js' };
const CONSERTAR = 'digita /consertar que eu devolvo';

function lerSettings(arq) {
  if (!fs.existsSync(arq)) return { existe: false, valido: false, s: null };
  try { return { existe: true, valido: true, s: JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^\uFEFF/, '')) }; } catch (e) { return { existe: true, valido: false, s: null }; }
}
function legivel(p) {
  try { fs.accessSync(p, fs.constants.R_OK); return fs.statSync(p).isDirectory() || fs.statSync(p).isFile(); } catch (e) { return false; }
}
/** Nome amigavel de uma pasta registrada: "Petições antigas (peças já escritas)". */
function nomeAmigavel(p) {
  let rotulo = '';
  try { rotulo = { 'pecas-antigas': 'suas peças já escritas', modelos: 'seus modelos', 'casos-ativos': 'seus casos em andamento', 'documentos-clientes': 'documentos dos clientes', 'amostras-estilo': 'amostras do seu jeito de escrever', prazos: 'sua agenda de prazos', nuvem: 'pasta da nuvem' }[p.tipo] || ''; } catch (e) { /* */ }
  return '“' + path.basename(String(p.caminho || '').replace(/[\\/]+$/, '')) + '”' + (rotulo ? ' (' + rotulo + ')' : '');
}

/** Modo de permissao efetivo: sessao (entrada do hook) > settings.local > settings do projeto > settings do usuario. */
function modoEfetivo(sUser, cwd, permissionMode) {
  if (permissionMode) return { modo: permissionMode, fonte: 'sessao' };
  const cand = [];
  if (cwd) cand.push(path.join(cwd, '.claude', 'settings.local.json'), path.join(cwd, '.claude', 'settings.json'));
  for (const a of cand) { const r = lerSettings(a); const m = r.s && r.s.permissions && r.s.permissions.defaultMode; if (m) return { modo: m, fonte: a }; }
  return { modo: (sUser && sUser.permissions && sUser.permissions.defaultMode) || 'default', fonte: 'usuario' };
}

/** Regras "allow" que o instalador grava (Read/Glob/Grep, Edit do ESCRITORIO e os scripts do assistente). */
function regrasEsperadas(esc) {
  try {
    const inst = require(path.join(__dirname, '..', 'instalar.js'));
    return ['Read', 'Glob', 'Grep', 'Edit(' + inst.regraCaminho(esc) + '/**)'].concat(inst.regrasScripts());
  } catch (e) { return ['Read', 'Glob', 'Grep']; }
}

/** Pastas de origem apontadas nos DOSSIE.md dos casos (casos importados). Limitado para ser rapido. */
function pastasOriginaisDosCasos(esc, limite) {
  const r = [];
  for (const fase of ['Ativos', 'Em análise']) {
    const d = path.join(esc, 'CASOS', fase);
    let nomes = []; try { nomes = fs.readdirSync(d); } catch (e) { continue; }
    for (const n of nomes) {
      if (r.length >= (limite || 300) || n.startsWith('_') || n.startsWith('.')) continue;
      let t = ''; try { t = fs.readFileSync(path.join(d, n, 'DOSSIE.md'), 'utf8'); } catch (e) { continue; }
      const m = t.match(/Pasta original[^`\n]*`([^`]+)`/);
      if (m) r.push({ caso: n, fase, caminho: m[1] });
    }
  }
  return r;
}

/**
 * Roda as checagens. opts: { entrada (JSON do hook), cwd, sessao (true no SessionStart: so o essencial) }.
 * Retorna lista de problemas (vazia = tudo certo) e "oks" (para o doutor mostrar o que esta funcionando).
 */
function diagnosticarSessao(opts) {
  opts = opts || {};
  const problemas = [], oks = [];
  const prob = (id, nivel, aviso, tecnico, conserto) => problemas.push({ id, nivel, aviso, tecnico, conserto: conserto || null });
  const ok = (id, msg) => oks.push({ id, msg });
  try {
    const cfgBruta = c.lerJSON(c.P.config, null);
    const cfg = c.config();
    const esc = cfg.escritorio;
    const ent = opts.entrada || {};
    const arqS = path.join(c.P.claude, 'settings.json');
    const rs = lerSettings(arqS);
    const s = rs.s;
    // Plugin ainda sem configurar (instalar-plugin nao rodou): a primeira execucao cuida de tudo.
    const instalado = !!cfgBruta;

    // ---- 3a. configuracoes legiveis
    if (!rs.existe || !rs.valido) {
      if (instalado) prob('settings', 'erro', 'As configurações do Claude ' + (rs.existe ? 'ficaram embaralhadas' : 'sumiram') + ' (acontece depois de uma atualização) e por isso as proteções do assistente podem não estar ligadas — ' + CONSERTAR + '.', 'settings.json ' + (rs.existe ? 'com erro de sintaxe' : 'não existe') + ': ' + arqS, 'reinstalar');
    } else ok('settings', 'Configurações do Claude em ordem');

    // ---- 1. modo automatico
    const me = modoEfetivo(s, opts.cwd || ent.cwd, ent.permission_mode);
    const avisoModo = cfg.avisos && cfg.avisos.modoAuto === false;
    // Na sessao, so "default" (Manual) e problema: plan/acceptEdits escolhidos na hora sao decisao do usuario.
    const ruim = me.fonte === 'sessao' ? me.modo === 'default' : me.modo !== 'auto' && me.modo !== 'bypassPermissions';
    const configurado = !!(s && s.permissions && s.permissions.defaultMode === 'auto');
    if (me.modo === 'auto') ok('modo-auto', 'Modo automático ligado');
    else if (!ruim) ok('modo-auto', 'Modo escolhido nesta conversa: ' + me.modo);
    else if (instalado && !avisoModo) {
      prob('modo-auto', 'aviso', 'Tô no modo manual, por isso vou ficar te pedindo licença a toda hora — aperta Shift+Tab até aparecer “auto” (no aplicativo, escolha Auto no seletor de modo). Se o “auto” não aparecer, tudo bem: é só clicar Sim quando eu pedir.',
        'Modo de permissão ' + (me.fonte === 'sessao' ? 'desta sessão' : 'inicial') + ': ' + me.modo + (me.fonte === 'sessao' ? '' : ' (de ' + me.fonte + ')') + '. Esperado: permissions.defaultMode = "auto".' + (configurado ? ' O settings já pede auto: a sessão abriu em Manual (plano/modelo/empresa pode não liberar o modo auto).' : ''), configurado ? null : 'modo');
      problemas[problemas.length - 1].jaConfigurado = configurado;
    }

    // ---- 2. pastas registradas
    if (!legivel(esc)) {
      prob('escritorio', 'erro', 'Não tô conseguindo abrir a pasta do escritório “' + path.basename(esc) + '”, onde ficam seus casos e peças — ela foi apagada, renomeada ou mudou de lugar. ' + (fs.existsSync(esc) ? 'Digita /consertar que eu tento devolver o acesso.' : 'Se você mudou ela de lugar, digita /consertar e me diz onde ela está agora.'), 'ESCRITORIO ' + (fs.existsSync(esc) ? 'sem permissão de leitura' : 'não existe') + ': ' + esc, fs.existsSync(esc) ? 'reinstalar' : 'reconectar');
    } else ok('escritorio', 'Pasta do escritório acessível');
    for (const p of cfg.pastasExternas || []) {
      if (!legivel(p.caminho)) prob('externa', 'aviso', 'Não tô achando a pasta ' + nomeAmigavel(p) + ' — ela foi apagada, renomeada ou mudou de lugar. Se você mudou ela de lugar, digita /consertar e me diz onde ela está agora.', 'Pasta registrada inacessível: ' + p.caminho + ' (' + p.tipo + ')', 'reconectar');
    }
    if (legivel(esc)) {
      const origens = pastasOriginaisDosCasos(esc);
      const sumidas = origens.filter((o) => !legivel(o.caminho));
      if (sumidas.length) {
        const nomes = sumidas.slice(0, 3).map((o) => '“' + o.caso + '”').join(', ') + (sumidas.length > 3 ? ' e mais ' + (sumidas.length - 3) : '');
        prob('pasta-caso', 'aviso', 'Não acho mais os documentos ' + (sumidas.length > 1 ? 'dos casos ' : 'do caso ') + nomes + ' no lugar de antes — a pasta deles mudou de lugar ou foi apagada. Digita /consertar e me diz onde eles estão agora.', 'Pasta original do DOSSIE inacessível: ' + sumidas.map((o) => o.fase + '/' + o.caso + ' -> ' + o.caminho).join('; '), 'reconectar');
      }
    }

    // ---- 3b. acessos que o instalador grava
    if (s && instalado) {
      const dirs = (s.permissions && s.permissions.additionalDirectories) || [];
      const tem = (p) => dirs.some((d) => c.norm(d) === c.norm(p));
      if (!tem(esc)) prob('diretorios', 'aviso', 'O Claude perdeu a chave da pasta do escritório, onde ficam suas peças — quando você abrir o Claude fora dela eu não consigo ler seus casos. ' + CONSERTAR.charAt(0).toUpperCase() + CONSERTAR.slice(1) + '.', 'ESCRITORIO fora de permissions.additionalDirectories', 'reinstalar');
      else ok('diretorios', 'Acesso à pasta do escritório liberado');
      const semChave = (cfg.pastasExternas || []).filter((p) => legivel(p.caminho) && !tem(p.caminho));
      if (semChave.length) prob('diretorios-externos', 'aviso', 'O Claude perdeu a chave ' + (semChave.length > 1 ? 'das pastas ' : 'da pasta ') + semChave.slice(0, 3).map(nomeAmigavel).join(', ') + ' — por isso não consigo abrir o que tem lá. ' + CONSERTAR.charAt(0).toUpperCase() + CONSERTAR.slice(1) + '.', 'Pastas registradas fora de additionalDirectories: ' + semChave.map((p) => p.caminho).join('; '), 'mapa');
      const allow = new Set((s.permissions && s.permissions.allow) || []);
      const faltam = regrasEsperadas(esc).filter((r) => !allow.has(r));
      if (faltam.length) prob('permissoes', 'aviso', 'Uma atualização do Claude apagou as licenças que eu tinha pra usar as ferramentas do assistente, por isso vou te pedir autorização mais vezes — ' + CONSERTAR + '.', faltam.length + ' regra(s) de permissions.allow ausente(s) (ex.: ' + faltam.slice(0, 3).join(', ') + ')', 'reinstalar');
      else ok('permissoes', 'Licenças das ferramentas do assistente presentes');
      if (cfg.modoPlugin) {
        if (!(s.enabledPlugins && s.enabledPlugins[ID_PLUGIN])) prob('plugin', 'erro', 'O assistente jurídico foi desligado no Claude (acontece depois de uma atualização) — digita /plugin, ativa o “advogado-claude” e depois /reload-plugins.', 'Plugin ' + ID_PLUGIN + ' desativado em enabledPlugins', null);
      } else {
        const nossos = [];
        for (const [ev, grupos] of Object.entries(s.hooks || {})) for (const g of grupos || []) for (const h of g.hooks || []) {
          const m = (JSON.stringify(h.args || []) + ' ' + (h.command || '')).match(/advogado[\\/]+scripts[\\/]+([\w-]+\.js)/);
          if (m) nossos.push({ ev, script: m[1], matcher: g.matcher || '' });
        }
        const faltamEv = Object.entries(EVENTOS).filter(([ev, sc]) => !nossos.some((n) => n.ev === ev && n.script === sc)).map(([ev]) => ev);
        if (!nossos.some((n) => n.script === 'guarda-sigilo.js')) faltamEv.push('PreToolUse(guarda-sigilo)');
        // anonimizacao: a guarda de sigilo precisa ver as leituras (Read/Grep) para proteger o original e a tabela
        else if (!nossos.some((n) => n.script === 'guarda-sigilo.js' && /\bRead\b/.test(n.matcher))) faltamEv.push('PreToolUse(guarda-sigilo: Read|Grep)');
        if (faltamEv.length) prob('hooks', 'erro', 'Algumas proteções do assistente (sigilo, cópia de segurança das peças, aviso de prazo) foram desligadas por uma atualização do Claude — ' + CONSERTAR.replace('devolvo', 'religo') + '.', 'Hooks faltando: ' + faltamEv.join(', '), 'reinstalar');
        else ok('hooks', 'Proteções do assistente ligadas');
      }
      if (!cfg.modoPlugin) {
        let temBloco = false; try { temBloco = fs.readFileSync(path.join(c.P.claude, 'CLAUDE.md'), 'utf8').includes('<!-- advogado-claude-mod:inicio -->'); } catch (e) { /* */ }
        if (!temBloco) prob('claude-md', 'erro', 'As regras do assistente (sigilo, não inventar julgado) sumiram das instruções do Claude — ' + CONSERTAR.replace('devolvo', 'coloco de volta') + '.', 'Bloco do assistente ausente em ~/.claude/CLAUDE.md', 'reinstalar');
      }
    }
  } catch (e) { c.log('erros', 'diagnostico: ' + (e && e.stack || e)); }
  return { problemas, oks };
}

/** Bloco para o topo do additionalContext do SessionStart (vazio se tudo certo). */
function avisoSessao(problemas, max) {
  if (!problemas || !problemas.length) return '';
  const ord = problemas.slice().sort((a, b) => (a.nivel === 'erro' ? 0 : 1) - (b.nivel === 'erro' ? 0 : 1));
  const lista = ord.slice(0, max || 3);
  return '⚠️ AVISO PARA O ADVOGADO — algo mudou desde a última conversa. NA PRIMEIRA RESPOSTA, antes de qualquer outra coisa, diga ao advogado (com estas palavras simples, sem termos técnicos, sem caminhos de pasta):\n' +
    lista.map((p) => '- ' + p.aviso).join('\n') +
    (ord.length > lista.length ? '\n- Achei mais ' + (ord.length - lista.length) + ' coisinha(s) — o /consertar mostra tudo.' : '') +
    '\n(Para você, assistente — detalhe técnico, NÃO repita ao advogado: ' + lista.map((p) => p.id + ': ' + p.tecnico).join(' | ') + '. Se ele pedir para consertar, use a skill consertar.)';
}

module.exports = { diagnosticarSessao, avisoSessao, modoEfetivo, regrasEsperadas, pastasOriginaisDosCasos, nomeAmigavel, EVENTOS, ID_PLUGIN };
