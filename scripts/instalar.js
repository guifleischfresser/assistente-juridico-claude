#!/usr/bin/env node
'use strict';
/*
 * Instalador multiplataforma (chamado por instalar.ps1 / instalar.sh / instalar.bat).
 * Uso: node scripts/instalar.js [--escritorio "<pasta>"] [--nome "Dra. Ana"] [--simular] [--forcar]
 *      node scripts/instalar.js --desinstalar        (nunca apaga o ESCRITORIO)
 * Faz backup de ~/.claude/settings.json e CLAUDE.md antes de qualquer mudanca.
 * --silencioso: aceito por compatibilidade (este script nunca faz perguntas).
 * Retencao: define cleanupPeriodDays = 14 SOMENTE se o usuario nao tiver valor proprio
 * (transcripts locais guardam trechos de documentos de clientes; menos tempo = menos exposicao).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const c = require('./lib/comum');

const RAIZ = path.resolve(__dirname, '..');
const MARCA_INI = '<!-- advogado-claude-mod:inicio -->';
const MARCA_FIM = '<!-- advogado-claude-mod:fim -->';
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const SIMULAR = args.includes('--simular');
const barra = (p) => p.replace(/\\/g, '/');
const RETENCAO_DIAS = 14;
const PACOTE_ITENS = ['scripts', 'skills', 'templates', 'output-styles', 'hooks', '.claude-plugin', 'README.md', 'INSTALAR.md', 'ARQUITETURA.md', 'CHANGELOG.md'];

/** "node" se estiver no PATH (>=18); senao o caminho completo do Node atual (ex.: logo apos instalar o Node). */
function comandoNode() {
  try {
    const r = require('child_process').spawnSync('node', ['-v'], { encoding: 'utf8', timeout: 10000 });
    const m = !r.error && r.status === 0 && String(r.stdout).match(/^v(\d+)/);
    if (m && parseInt(m[1], 10) >= 18) return 'node';
  } catch (e) { /* */ }
  return barra(process.execPath);
}

function copiarDir(o, d) {
  if (SIMULAR) return;
  c.garantirDir(d);
  for (const n of fs.readdirSync(o)) {
    const a = path.join(o, n), b = path.join(d, n);
    if (fs.statSync(a).isDirectory()) copiarDir(a, b); else fs.copyFileSync(a, b);
  }
}
function escrever(arq, txt) { if (!SIMULAR) { c.garantirDir(path.dirname(arq)); fs.writeFileSync(arq, txt, 'utf8'); } }

/** Copia scripts e modelo do escritorio para ~/.claude/advogado (usado tambem pelo modo plugin). */
function instalarArquivosBase(raiz) {
  raiz = raiz || RAIZ;
  copiarDir(path.join(raiz, 'scripts'), path.join(c.P.base, 'scripts'));
  copiarDir(path.join(raiz, 'templates', 'escritorio'), path.join(c.P.base, 'modelo-escritorio'));
  for (const d of ['estado', 'logs', 'habilidades/rascunhos', 'habilidades/versoes', 'habilidades/_aposentadas']) if (!SIMULAR) c.garantirDir(path.join(c.P.base, d));
  if (!SIMULAR) c.gravarJSON(path.join(c.P.base, 'versao.json'), { versao: c.VERSAO, instaladoEm: new Date().toISOString(), origem: raiz });
}

/** Guarda uma copia do pacote em ~/.claude/advogado/pacote: o doutor (/consertar) reinstala sem internet. */
function guardarPacote(raiz) {
  const dest = path.join(c.P.base, 'pacote');
  // Compara caminhos REAIS: no macOS /var -> /private/var (e HOME com symlink) faria o pacote
  // se apagar antes de se copiar ao reparar a partir da propria copia local.
  const real = (p) => { try { return c.norm(fs.realpathSync(p)); } catch (e) { return c.norm(path.resolve(p)); } };
  if (SIMULAR || real(raiz) === real(dest) || real(raiz).startsWith(real(dest) + '/')) return;
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  for (const n of PACOTE_ITENS) {
    const o = path.join(raiz, n);
    if (!fs.existsSync(o)) continue;
    if (fs.statSync(o).isDirectory()) copiarDir(o, path.join(dest, n)); else { c.garantirDir(dest); fs.copyFileSync(o, path.join(dest, n)); }
  }
}

function regraCaminho(p) {
  const home = barra(os.homedir()); const b = barra(path.resolve(p));
  if (b.toLowerCase().startsWith(home.toLowerCase() + '/')) return '~/' + b.slice(home.length + 1);
  if (/^[A-Za-z]:\//.test(b)) return '//' + b[0].toLowerCase() + b.slice(2);
  return '/' + b; // => //caminho/absoluto
}

function mesclarSettings(esc, forcar) {
  const arq = path.join(c.P.claude, 'settings.json');
  const atual = c.lerJSON(arq, {}) || {};
  const modelo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'templates', 'settings.modelo.json'), 'utf8')
    .split('{{ESCRITORIO_REGRA}}').join(regraCaminho(esc))
    .split('{{ESCRITORIO}}').join(barra(esc))
    .split('{{BASE}}').join(barra(c.P.base)));
  const nodeCmd = comandoNode();
  for (const grupos of Object.values(modelo.hooks)) for (const g of grupos) for (const h of g.hooks) if (h.command === 'node') h.command = nodeCmd;
  if (nodeCmd !== 'node') modelo.statusLine.command = modelo.statusLine.command.replace(/^node /, '"' + nodeCmd + '" ');
  const novo = Object.assign({}, atual);
  let retencaoNossa = false;
  if (novo.cleanupPeriodDays == null) { novo.cleanupPeriodDays = RETENCAO_DIAS; retencaoNossa = true; }
  for (const k of ['$schema', 'language', 'effortLevel', 'theme', 'outputStyle']) if (novo[k] == null || forcar) novo[k] = modelo[k];
  const ehNosso = (sl) => sl && /advogado[\\/]scripts[\\/]statusline/.test(sl.command || '');
  if (!novo.statusLine || ehNosso(novo.statusLine) || forcar) novo.statusLine = modelo.statusLine;
  novo.permissions = novo.permissions || {};
  for (const k of ['allow', 'ask', 'deny', 'additionalDirectories']) {
    const conj = new Set(novo.permissions[k] || []);
    (modelo.permissions[k] || []).forEach((x) => conj.add(x));
    novo.permissions[k] = Array.from(conj);
  }
  novo.hooks = removerNossosHooks(novo.hooks || {});
  for (const [ev, grupos] of Object.entries(modelo.hooks)) novo.hooks[ev] = (novo.hooks[ev] || []).concat(grupos);
  return { arq, novo, retencaoNossa, nodeCmd };
}
function removerNossosHooks(hooks) {
  const r = {};
  for (const [ev, grupos] of Object.entries(hooks || {})) {
    const g2 = (grupos || []).map((g) => Object.assign({}, g, { hooks: (g.hooks || []).filter((h) => !/advogado[\\/]scripts[\\/]/.test(JSON.stringify(h.args || h.command || ''))) })).filter((g) => g.hooks.length);
    if (g2.length) r[ev] = g2;
  }
  return r;
}

function blocoClaudeMd(esc, nome) {
  const t = fs.readFileSync(path.join(RAIZ, 'templates', 'claude-global', 'CLAUDE.md'), 'utf8')
    .split('{{ESCRITORIO}}').join(barra(esc)).split('{{BASE}}').join(barra(c.P.base)).split('{{NOME}}').join(nome || '(a definir no /boas-vindas)');
  return MARCA_INI + '\n' + t.trim() + '\n' + MARCA_FIM + '\n';
}
function mesclarClaudeMd(esc, nome) {
  const arq = path.join(c.P.claude, 'CLAUDE.md');
  const atual = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : '';
  const bloco = blocoClaudeMd(esc, nome);
  const re = new RegExp(MARCA_INI + '[\\s\\S]*?' + MARCA_FIM + '\\n?');
  return { arq, novo: re.test(atual) ? atual.replace(re, bloco) : (atual.trim() ? atual.trimEnd() + '\n\n' + bloco : bloco) };
}

function backup() {
  const dir = path.join(c.P.base, 'backup-instalacao', c.carimbo());
  for (const n of ['settings.json', 'CLAUDE.md']) {
    const a = path.join(c.P.claude, n);
    if (fs.existsSync(a) && !SIMULAR) { c.garantirDir(dir); fs.copyFileSync(a, path.join(dir, n)); }
  }
  return dir;
}

function instalar() {
  const cfgAnt = c.lerJSON(c.P.config, {}) || {};
  const esc = path.resolve(opt('--escritorio') || cfgAnt.escritorio || path.join(os.homedir(), 'ESCRITORIO'));
  const nome = opt('--nome') || cfgAnt.nome || '';
  console.log('\n⚖️  Advogado Claude Mod v' + c.VERSAO + (SIMULAR ? '  (SIMULAÇÃO: nada será gravado)' : ''));
  console.log('   Pasta do escritório: ' + esc);
  if (/OneDrive|Dropbox|Google Drive|iCloud/i.test(esc)) console.log('   ⚠️  Essa pasta parece sincronizar com a nuvem. Por sigilo, prefira uma pasta local.');
  const dirBk = backup();
  console.log('1/6 Backup das configurações atuais: ' + dirBk);
  instalarArquivosBase(RAIZ);
  guardarPacote(RAIZ);
  console.log('2/6 Ferramentas do assistente copiadas para ' + c.P.base);
  if (!SIMULAR) {
    const { garantirEscritorio } = require('./lib/escritorio');
    const criados = garantirEscritorio(esc, path.join(RAIZ, 'templates', 'escritorio'));
    console.log('3/6 Escritório pronto (' + criados.length + ' item(ns) criado(s); nada existente foi alterado)');
  } else console.log('3/6 (simulação) criaria a estrutura do ESCRITORIO');
  const dirSk = path.join(RAIZ, 'skills');
  for (const n of fs.readdirSync(dirSk)) {
    const destino = path.join(c.P.skillsVivas, n);
    if (fs.existsSync(destino) && !SIMULAR) copiarDir(destino, path.join(c.P.hab, 'versoes', 'nucleo', n, c.carimbo()));
    copiarDir(path.join(dirSk, n), destino);
  }
  escrever(path.join(c.P.claude, 'output-styles', 'advogado.md'), fs.readFileSync(path.join(RAIZ, 'output-styles', 'advogado.md'), 'utf8'));
  console.log('4/6 Habilidades (skills) e estilo de resposta instalados');
  const md = mesclarClaudeMd(esc, nome); escrever(md.arq, md.novo);
  const st = mesclarSettings(esc, args.includes('--forcar'));
  if (!SIMULAR) c.gravarJSON(st.arq, st.novo);
  console.log('5/6 CLAUDE.md e settings.json atualizados (suas configurações anteriores foram mantidas)');
  if (!SIMULAR) {
    if (st.retencaoNossa) console.log('   Histórico de conversas: guardado por ' + RETENCAO_DIAS + ' dias (cleanupPeriodDays), por sigilo. Seu valor anterior seria mantido se existisse.');
    if (st.nodeCmd !== 'node') console.log('   Node fora do PATH desta sessão: os hooks usarão o caminho completo ' + st.nodeCmd);
    c.gravarJSON(c.P.config, Object.assign({}, cfgAnt, { retencaoDefinidaPeloMod: cfgAnt.retencaoDefinidaPeloMod || st.retencaoNossa, escritorio: esc, nome, versao: c.VERSAO, instaladoEm: cfgAnt.instaladoEm || new Date().toISOString(), atualizadoEm: new Date().toISOString(), onboardingConcluido: !!cfgAnt.onboardingConcluido, limiteContexto: cfgAnt.limiteContexto || 75 }));
    require('child_process').execFileSync(process.execPath, [path.join(c.P.base, 'scripts', 'habilidades.js'), 'registrar-nucleo', dirSk], { stdio: 'ignore' });
  }
  console.log('6/6 Configuração salva em ' + c.P.config);
  const ferramentas = [['pdftotext', 'ler PDFs dos autos'], ['pandoc', 'exportação alternativa .docx'], ['tesseract', 'OCR local de PDFs escaneados']].map(([f, u]) => {
    try { require('child_process').execFileSync(process.platform === 'win32' ? 'where' : 'which', [f], { stdio: 'ignore' }); return '   ✅ ' + f + ' (' + u + ')'; } catch (e) { return '   ➖ ' + f + ' não encontrado (opcional: ' + u + ')'; }
  });
  console.log('\nFerramentas opcionais:\n' + ferramentas.join('\n'));
  console.log('\n✅ Pronto! Abra o Claude Code dentro da pasta do escritório:\n   cd "' + esc + '"\n   claude\nNa primeira conversa o assistente vai se apresentar e configurar tudo com você (/primeira-execucao).\n');
}

function desinstalar() {
  console.log('Removendo o Advogado Claude Mod (o ESCRITORIO e seus documentos NÃO serão tocados)...');
  const dirBk = backup();
  const arq = path.join(c.P.claude, 'settings.json');
  const s = c.lerJSON(arq, null);
  if (s) {
    s.hooks = removerNossosHooks(s.hooks); if (!Object.keys(s.hooks).length) delete s.hooks;
    if (s.statusLine && /advogado[\\/]scripts/.test(s.statusLine.command || '')) delete s.statusLine;
    if (s.outputStyle === 'Advogado') delete s.outputStyle;
    const cfgD = c.lerJSON(c.P.config, {}) || {};
    if (cfgD.retencaoDefinidaPeloMod && s.cleanupPeriodDays === RETENCAO_DIAS) delete s.cleanupPeriodDays;
    const externas = new Set((cfgD.pastasExternas || []).map((p) => barra(p.caminho)));
    if (s.permissions && Array.isArray(s.permissions.additionalDirectories)) s.permissions.additionalDirectories = s.permissions.additionalDirectories.filter((d) => !externas.has(barra(d)) && barra(d) !== barra(cfgD.escritorio || ''));
    if (s.permissions) for (const k of Object.keys(s.permissions)) if (Array.isArray(s.permissions[k])) s.permissions[k] = s.permissions[k].filter((x) => !/advogado[\\/]scripts|advogado$/.test(x));
    if (!SIMULAR) c.gravarJSON(arq, s);
  }
  const md = path.join(c.P.claude, 'CLAUDE.md');
  if (fs.existsSync(md)) escrever(md, fs.readFileSync(md, 'utf8').replace(new RegExp('\\n*' + MARCA_INI + '[\\s\\S]*?' + MARCA_FIM + '\\n?'), '\n'));
  const guardar = path.join(c.P.base, '_desinstaladas', c.carimbo());
  for (const n of fs.existsSync(c.P.skillsVivas) ? fs.readdirSync(c.P.skillsVivas) : []) {
    const reg = c.lerJSON(path.join(c.P.hab, 'registro.json'), { skills: {} });
    if ((reg.skills && reg.skills[n]) || n.startsWith('auto-')) { if (!SIMULAR) { c.garantirDir(guardar); fs.renameSync(path.join(c.P.skillsVivas, n), path.join(guardar, n)); } }
  }
  const os2 = path.join(c.P.claude, 'output-styles', 'advogado.md'); if (fs.existsSync(os2) && !SIMULAR) fs.unlinkSync(os2);
  console.log('✅ Removido. Backup das configurações: ' + dirBk + '\n   Habilidades guardadas em: ' + guardar + '\n   Seu ESCRITORIO continua intacto.');
}

if (require.main === module) { if (args.includes('--desinstalar')) desinstalar(); else instalar(); }
module.exports = { instalarArquivosBase, mesclarSettings, regraCaminho, removerNossosHooks, comandoNode, RETENCAO_DIAS };
