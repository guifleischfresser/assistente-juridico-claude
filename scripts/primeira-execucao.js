#!/usr/bin/env node
'use strict';
/*
 * Primeira execucao (onboarding autonomo) — estado retomavel e idempotente.
 * Estado: ~/.claude/advogado/estado/primeira-execucao.json
 *
 *   estado [--json]                       mostra etapas feitas e a proxima
 *   marcar <etapa> [nota]                 marca etapa como feita (idempotente)
 *   proxima-pergunta [--json]             proxima pergunta da entrevista ainda sem resposta
 *   responder <id> "<resposta>"           grava a resposta (so preferencias/caminhos; nunca dados de clientes)
 *   varrer [--raiz <pasta>]... [--json]  procura LOCALMENTE pastas com pecas, modelos, casos e prazos
 *                                         (le apenas NOMES; mostra SO a pasta-mae e contagens, com ids G1, G2...)
 *   registrar <tipo> "<caminho>" [obs]    aponta uma pasta externa (mapa-de-pastas.md + additionalDirectories)
 *   registrar <tipo> --grupo G1 [obs]     idem, usando um grupo da ultima varredura (caminho fica so no estado local)
 *   remover "<caminho>"                   desfaz um registro
 *   subpastas "<pasta>"|--grupo G1 [--json]  lista NOMES das subpastas (so com permissao do usuario: aparecem no chat)
 *   copiar-amostras <arquivo|pasta>...|--grupo G1 [--max N]
 *                                         copia SO amostras de estilo para ESCRITORIO/ESTILO/amostras
 *   dossie "<nome do caso>" ["<pasta original>"]
 *                                         cria CASOS/Ativos/<caso>/DOSSIE.md apontando para a pasta original
 *   dossies --grupo G1 | dossies "<pasta>"
 *                                         cria um dossie por subpasta SEM listar nomes no chat (so contagem)
 *   concluir                              grava o primeiro HANDOFF e imprime o resumo "como usar"
 *   reiniciar                             zera o estado (as pastas registradas e arquivos criados ficam)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const c = require('./lib/comum');
const mapa = require('./lib/mapa');

const ARQ = path.join(c.P.estado, 'primeira-execucao.json');
const ETAPAS = [
  ['instalacao', 'Instalar o assistente (download verificado + instalador silencioso)'],
  ['verificacao', 'Verificar a instalação (doutor)'],
  ['entrevista', 'Entrevista: onde ficam suas coisas'],
  ['registro', 'Registrar as pastas por apontamento (mapa-de-pastas.md)'],
  ['estilo', 'Aprender seu estilo de escrita'],
  ['dossies', 'Criar os dossiês dos casos ativos'],
  ['resumo', 'Resumo "como usar" e primeiro HANDOFF'],
];
const PERGUNTAS = [
  { id: 'area', texto: 'Qual é a sua área principal de atuação? (ex.: cível, trabalhista, família, previdenciário, criminal…)', tipo: 'texto' },
  { id: 'varrer', texto: 'Posso procurar no seu computador (Documentos, Área de Trabalho, Downloads e OneDrive/Drive/Dropbox) as pastas com petições, modelos e casos? Eu só olho os NOMES dos arquivos, não abro nada e nada sai do computador. (sim/não)', tipo: 'sim-nao', acao: 'Se sim: rode `varrer` e apresente o resultado resumido antes das próximas perguntas.' },
  { id: 'pecas-antigas', texto: 'Onde ficam as petições e peças que você já escreveu? (pode ser mais de uma pasta, ou "não sei")', tipo: 'caminho', registrar: 'pecas-antigas' },
  { id: 'modelos', texto: 'Você tem modelos (templates) que costuma reaproveitar? Em qual pasta?', tipo: 'caminho', registrar: 'modelos' },
  { id: 'casos-ativos', texto: 'Onde ficam as pastas dos seus casos em andamento?', tipo: 'caminho', registrar: 'casos-ativos' },
  { id: 'documentos-clientes', texto: 'Os documentos dos clientes (procurações, contratos, provas) ficam junto dos casos ou em outra pasta?', tipo: 'caminho', registrar: 'documentos-clientes' },
  { id: 'amostras-estilo', texto: 'Quais 5 a 10 peças representam melhor o SEU jeito de escrever? (de sua autoria; indique arquivos ou uma pasta)', tipo: 'caminho', registrar: 'amostras-estilo', acao: 'Depois pergunte se pode COPIAR só essas amostras para ESTILO/amostras (copiar-amostras).' },
  { id: 'prazos', texto: 'Como você controla os prazos hoje? (planilha, agenda do Google/Outlook, sistema do escritório, caderno…) Se for um arquivo, onde ele está?', tipo: 'caminho-ou-texto', registrar: 'prazos' },
  { id: 'nuvem', texto: 'Você usa OneDrive, Google Drive ou Dropbox para os arquivos do escritório? Qual pasta?', tipo: 'caminho-ou-texto', registrar: 'nuvem' },
  { id: 'dossies', texto: 'Quer que eu crie agora um dossiê (ficha-resumo) para cada caso ativo que encontrei? Eu só crio a ficha e aponto para a pasta original; não movo nem copio documentos. (sim/não)', tipo: 'sim-nao' },
];

function novoEstado() { return { versao: c.VERSAO, iniciadoEm: new Date().toISOString(), etapas: {}, respostas: {} }; }
function ler() { const e = c.lerJSON(ARQ, null); return e && e.etapas ? e : novoEstado(); }
function gravar(e) { e.atualizadoEm = new Date().toISOString(); c.gravarJSON(ARQ, e); }
function proximaEtapa(e) { const p = ETAPAS.find(([n]) => !(e.etapas[n] && e.etapas[n].feito)); return p ? p[0] : null; }
function proximaPergunta(e) { return PERGUNTAS.find((q) => !(q.id in e.respostas)) || null; }
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valores = (n) => { const r = []; args.forEach((a, i) => { if (a === n && args[i + 1]) r.push(args[i + 1]); }); return r; };
const posicionais = () => { const r = []; for (let i = 1; i < args.length; i++) { if (args[i].startsWith('--')) { if (['--raiz', '--max', '--grupo'].includes(args[i])) i++; continue; } r.push(args[i]); } return r; };
const sair = (msg, cod) => { console.log(msg); process.exit(cod || 0); };

// ---------- varredura local (somente nomes) ----------
const EXT_DOC = /\.(docx?|odt|rtf|pdf|pages)$/i;
const EXT_PLAN = /\.(xlsx?|ods|csv|ics)$/i;
const RE = {
  pecas: /peti[cç][aã]o|inicial|contesta|recurso|apela[cç]|agravo|embargo|manifesta|r[eé]plica|memoriai|contrarraz|parecer|impugna|habeas|mandado|notifica|defesa|alega[cç]/i,
  modelos: /modelo|template|padr[aã]o|minuta|formul[aá]rio/i,
  casos: /\bcasos?\b|clientes?|processos?|\bautos\b|a[cç][oõ]es|\d{7}-\d{2}\.\d{4}|\s(x|vs?\.?|versus)\s/i,
  prazos: /prazo|agenda|audi[eê]ncia|pauta|intima[cç]/i,
};
const PULAR = /^(\.|node_modules$|AppData$|Library$|Applications$|Program Files|Windows$|\$Recycle|System Volume|venv$|__pycache__$|Microsoft$|Adobe$|Zoom$|WhatsApp$|Steam|Games?$|My Games$|Music$|M[uú]sicas?$|Videos?$|V[ií]deos$|Pictures$|Imagens$|Fotos$)/i;

function raizesPadrao() {
  const h = os.homedir();
  const nomes = ['Documents', 'Documentos', 'Desktop', 'Área de Trabalho', 'Area de Trabalho', 'Downloads', 'Dropbox', 'Google Drive', 'GoogleDrive', 'iCloud Drive'];
  const r = nomes.map((n) => path.join(h, n));
  try { for (const n of fs.readdirSync(h)) if (/^OneDrive/i.test(n) || /^Dropbox/i.test(n)) r.push(path.join(h, n)); } catch (e) { /* */ }
  r.push(path.join(h, 'Library', 'CloudStorage'), path.join(h, 'Library', 'Mobile Documents', 'com~apple~CloudDocs'));
  if (process.platform === 'win32') for (const l of 'DEFGH') r.push(l + ':\\Google Drive', l + ':\\Meu Drive', l + ':\\My Drive');
  const vistos = new Set();
  return r.filter((p) => { try { const real = fs.realpathSync(p); if (vistos.has(real) || !fs.statSync(real).isDirectory()) return false; vistos.add(real); return true; } catch (e) { return false; } });
}

function varrer(raizes, opts) {
  const esc = c.config().escritorio;
  const LIM_DIRS = opts.limiteDirs || 6000, PROF = opts.profundidade || 5;
  const pastas = []; let visitadas = 0; const inicio = Date.now();
  const fila = raizes.map((r) => ({ p: r, d: 0, raiz: r }));
  while (fila.length && visitadas < LIM_DIRS && Date.now() - inicio < (opts.tempoMs || 20000)) {
    const { p, d, raiz } = fila.shift(); visitadas++;
    if (c.dentroDe(p, esc) || c.dentroDe(p, c.P.claude)) continue;
    let ents; try { ents = fs.readdirSync(p, { withFileTypes: true }); } catch (e) { continue; }
    const info = { caminho: p, raiz, docs: 0, planilhas: 0, subpastas: 0, hits: { pecas: 0, modelos: 0, casos: 0, prazos: 0 } };
    for (const e of ents) {
      if (e.isDirectory()) {
        if (PULAR.test(e.name)) continue;
        info.subpastas++;
        if (RE.casos.test(e.name)) info.hits.casos++;
        if (d + 1 <= PROF) fila.push({ p: path.join(p, e.name), d: d + 1, raiz });
      } else if (e.isFile()) {
        if (EXT_DOC.test(e.name)) {
          info.docs++;
          if (RE.pecas.test(e.name)) info.hits.pecas++;
          if (RE.modelos.test(e.name)) info.hits.modelos++;
        } else if (EXT_PLAN.test(e.name)) { info.planilhas++; if (RE.prazos.test(e.name)) info.hits.prazos++; }
      }
    }
    const nome = path.basename(p);
    if (RE.modelos.test(nome)) info.hits.modelos += 3;
    if (RE.pecas.test(nome)) info.hits.pecas += 3;
    if (RE.casos.test(nome)) info.hits.casos += 3;
    if (RE.prazos.test(nome)) info.hits.prazos += 3;
    if (info.docs || info.planilhas || info.hits.casos) pastas.push(info);
  }
  const top = (cat, f) => pastas.filter(f).sort((a, b) => (b.hits[cat] - a.hits[cat]) || (b.docs - a.docs)).slice(0, 12);
  const brutos = {
    pecas: top('pecas', (x) => x.hits.pecas >= 2),
    modelos: top('modelos', (x) => x.hits.modelos >= 3),
    casos: top('casos', (x) => x.hits.casos >= 3 && x.subpastas >= 2),
    prazos: top('prazos', (x) => x.hits.prazos >= 1),
  };
  // Privacidade: o resultado mostra SO contagens e o nome da pasta-mae (raiz/1o nivel).
  // Nenhum nome de subpasta ou arquivo (ex.: nomes de clientes) sai deste script.
  // Os caminhos reais ficam no estado local; o registro usa o id do grupo (registrar <tipo> --grupo G1).
  const grupos = []; const caminhos = {}; let n = 0;
  for (const cat of Object.keys(brutos)) {
    const porGrupo = new Map();
    for (const x of brutos[cat]) {
      const rel = path.relative(x.raiz, x.caminho); const seg = rel ? rel.split(/[\\/]/) : [];
      const chave = seg.length ? path.join(x.raiz, seg[0]) : x.raiz;
      const rotulo = path.basename(x.raiz) + (seg.length ? '/' + mascarar(seg[0]) : '') + (seg.length > 1 ? '/…' : '');
      const k = cat === 'casos' ? x.caminho : chave;
      const g = porGrupo.get(k) || { cat, rotulo, alvo: cat === 'casos' ? x.caminho : null, chave, pastas: [], docs: 0, pecas: 0, planilhas: 0, subpastas: 0 };
      g.pastas.push(x.caminho); g.docs += x.docs; g.pecas += Math.min(x.hits.pecas, x.docs); g.planilhas += x.planilhas; g.subpastas = Math.max(g.subpastas, x.subpastas);
      porGrupo.set(k, g);
    }
    for (const g of [...porGrupo.values()].slice(0, 6)) {
      const id = 'G' + (++n);
      caminhos[id] = g.alvo || (g.pastas.length === 1 ? g.pastas[0] : g.chave);
      const r = { id, categoria: cat, rotulo: g.rotulo };
      if (cat === 'pecas') Object.assign(r, { documentos: g.docs, comNomeDePeca: g.pecas, pastas: g.pastas.length });
      if (cat === 'modelos') Object.assign(r, { documentos: g.docs, pastas: g.pastas.length });
      if (cat === 'casos') Object.assign(r, { subpastas: g.subpastas });
      if (cat === 'prazos') Object.assign(r, { planilhas: g.planilhas });
      grupos.push(r);
    }
  }
  for (const raiz of raizes.filter((r) => mapa.NUVEM.test(r))) { const id = 'G' + (++n); caminhos[id] = raiz; grupos.push({ id, categoria: 'nuvem', rotulo: path.basename(raiz) }); }
  return { pastasVisitadas: visitadas, interrompido: fila.length > 0, grupos, _caminhos: caminhos };
}

/** Nomes de 1o nivel que parecem caso/cliente viram um rotulo generico. */
function mascarar(nome) {
  return /\s(x|vs?\.?|versus|contra|c\/)\s|\d{7}-\d{2}\.\d{4}|\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}/i.test(nome) ? '(pasta de caso)' : nome;
}

/** Caminho real de `--grupo Gn` (da ultima varredura, guardado so no estado local). */
function grupoDe(e) {
  const i = process.argv.indexOf('--grupo'); if (i < 0) return null;
  const id = String(process.argv[i + 1] || '').toUpperCase();
  return (e.varredura && e.varredura.grupos && e.varredura.grupos[id]) || null;
}

function imprimirVarredura(r) {
  const L = ['Varredura LOCAL concluída (' + r.pastasVisitadas + ' pastas olhadas; só nomes, nada foi aberto ou enviado).' + (r.interrompido ? ' Parei antes do fim para não demorar.' : ''), 'Por sigilo, mostro só a pasta-mãe e contagens (nunca nomes de subpastas ou arquivos).', ''];
  const sec = (cat, titulo, fmt) => { const arr = r.grupos.filter((g) => g.categoria === cat); L.push('## ' + titulo); if (!arr.length) L.push('- (nada encontrado)'); arr.forEach((g) => L.push('- [' + g.id + '] ' + g.rotulo + ': ' + fmt(g))); L.push(''); };
  sec('pecas', 'Possíveis PEÇAS já escritas', (g) => g.comNomeDePeca + ' documento(s) com nome de peça' + (g.pastas > 1 ? ' em ' + g.pastas + ' pastas' : ''));
  sec('modelos', 'Possíveis MODELOS', (g) => g.documentos + ' documento(s)');
  sec('casos', 'Possíveis pastas de CASOS', (g) => g.subpastas + ' pasta(s)');
  sec('prazos', 'Possível controle de PRAZOS', (g) => g.planilhas + ' planilha(s)/agenda(s)');
  sec('nuvem', 'Pastas de NUVEM', () => 'sincronizada com a nuvem');
  L.push('Próximo passo: confirme com o usuário, uma categoria por vez, e registre pelo id: `registrar <tipo> --grupo G1`.');
  return L.join('\n');
}

function contarDocs(dir, prof) {
  let n = 0; let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return 0; }
  for (const e of ents) { if (e.isFile() && (EXT_DOC.test(e.name) || EXT_PLAN.test(e.name))) n++; else if (e.isDirectory() && prof > 0 && !PULAR.test(e.name)) n += contarDocs(path.join(dir, e.name), prof - 1); }
  return n;
}

function slug(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'caso';
}

function copiarAmostras(entradas, max) {
  const destino = path.join(c.config().escritorio, 'ESTILO', 'amostras'); c.garantirDir(destino);
  const ok = /\.(docx|doc|odt|rtf|pdf|txt|md)$/i;
  const arquivos = [];
  for (const e of entradas) {
    if (!fs.existsSync(e)) { console.log('⚠️ não encontrado: ' + e); continue; }
    if (fs.statSync(e).isDirectory()) { for (const n of fs.readdirSync(e)) { const p = path.join(e, n); if (fs.statSync(p).isFile() && ok.test(n)) arquivos.push(p); } } else if (ok.test(e)) arquivos.push(e);
  }
  const hashes = new Set(fs.readdirSync(destino).filter((n) => fs.statSync(path.join(destino, n)).isFile()).map((n) => crypto.createHash('sha256').update(fs.readFileSync(path.join(destino, n))).digest('hex')));
  const copiados = [], iguais = [];
  for (const a of arquivos) {
    if (copiados.length >= max) break;
    const h = crypto.createHash('sha256').update(fs.readFileSync(a)).digest('hex');
    if (hashes.has(h)) { iguais.push(path.basename(a)); continue; }
    let nome = path.basename(a), i = 2;
    while (fs.existsSync(path.join(destino, nome))) nome = path.basename(a, path.extname(a)) + '-' + (i++) + path.extname(a);
    fs.copyFileSync(a, path.join(destino, nome)); hashes.add(h); copiados.push(nome);
    fs.appendFileSync(path.join(path.dirname(destino), 'origem-das-amostras.txt'), c.hojeISO() + '\t' + nome + '\t<= ' + a + os.EOL);
  }
  return { destino, copiados, iguais, ignorados: Math.max(0, arquivos.length - copiados.length - iguais.length) };
}

function criarDossie(nome, origem) {
  const cfg = c.config();
  const modelo = path.join(cfg.escritorio, 'CASOS', '_MODELO-DE-CASO');
  const modeloBase = fs.existsSync(modelo) ? modelo : path.join(c.P.base, 'modelo-escritorio', 'CASOS', '_MODELO-DE-CASO');
  // idempotente: se ja existe dossie apontando para a mesma origem (em qualquer fase), nao duplica
  for (const fase of ['Ativos', 'Em an\u00e1lise', 'Arquivados']) {
    const dirF = path.join(cfg.escritorio, 'CASOS', fase);
    if (!fs.existsSync(dirF)) continue;
    for (const n of fs.readdirSync(dirF)) {
      const d = path.join(dirF, n, 'DOSSIE.md');
      if (!fs.existsSync(d)) continue;
      const t = fs.readFileSync(d, 'utf8');
      if ((origem && t.includes('`' + path.resolve(origem) + '`')) || n.endsWith('-' + slug(nome))) return { criado: false, pasta: path.dirname(d) };
    }
  }
  const pasta = path.join(cfg.escritorio, 'CASOS', 'Ativos', new Date().getFullYear() + '-' + slug(nome));
  const copiar = (o, d) => { c.garantirDir(d); for (const n of fs.readdirSync(o)) { const a = path.join(o, n), b = path.join(d, n); if (fs.statSync(a).isDirectory()) copiar(a, b); else if (!fs.existsSync(b)) fs.copyFileSync(a, b); } };
  copiar(modeloBase, pasta);
  const arqD = path.join(pasta, 'DOSSIE.md');
  let t = fs.readFileSync(arqD, 'utf8').replace('[NOME DO CASO]', nome).replace('Fase: Em análise | Ativo | Arquivado · Aberto em: [DATA]', 'Fase: Ativo · Aberto em: ' + c.hojeISO() + ' (importado na primeira execução)');
  if (origem) {
    t = t.replace('## Identificação', '## Identificação\n- **Pasta original (não copiada; somente leitura):** `' + path.resolve(origem) + '`');
    t = t.replace('| | documentos/ | recebido / faltando |', '| (todos os documentos originais) | `' + path.resolve(origem) + '` | na pasta original |');
  }
  t = t.replace('## Histórico (mais recente primeiro)\n- [DATA] —', '## Histórico (mais recente primeiro)\n- ' + c.hojeISO() + ' — Dossiê criado na primeira execução a partir da pasta original. Completar fatos/partes ao abrir o caso (/casos abrir).');
  fs.writeFileSync(arqD, t, 'utf8');
  return { criado: true, pasta };
}

function comoUsar(cfg) {
  return [
    '# Como usar (resumo)',
    '',
    '- Fale normalmente, em português. Ex.: "abra um caso novo para a Maria contra o Banco X" ou "faça a contestação do caso Silva".',
    '- Atalhos: /novo-caso · /casos · /preparar-autos · /nova-peca · /revisar · /advogado-do-diabo · /verificar-citacoes · /formatar-peca · /prazos · /aprender-meu-estilo · /handoff · /consertar · /ajuda',
    '- Seus casos ficam em `' + path.join(cfg.escritorio, 'CASOS') + '`; as pastas originais continuam onde estavam (veja `mapa-de-pastas.md`).',
    '- Toda citação sem fonte aparece como [NÃO VERIFICADO]: confira antes de protocolar.',
    '- A barra de baixo mostra a memória da conversa e o próximo prazo. Em 75% eu salvo um resumo (handoff) sozinho.',
    '- Algo estranho? Digite /consertar.',
    '- Nada sai do seu computador sem você pedir.',
  ].join('\n');
}

function concluir() {
  const e = ler(); const cfg = c.config();
  const pastas = mapa.listar();
  const casosDir = path.join(cfg.escritorio, 'CASOS', 'Ativos');
  const casos = fs.existsSync(casosDir) ? fs.readdirSync(casosDir).filter((n) => fs.existsSync(path.join(casosDir, n, 'DOSSIE.md'))) : [];
  const amostras = path.join(cfg.escritorio, 'ESTILO', 'amostras');
  const nAm = fs.existsSync(amostras) ? fs.readdirSync(amostras).filter((n) => !n.startsWith('_') && n !== '.gitkeep').length : 0;
  const perfil = path.join(cfg.escritorio, 'ESTILO', 'perfil-de-escrita.md');
  const perfilFeito = fs.existsSync(perfil) && !/\[preencher|\(a preencher/i.test(fs.readFileSync(perfil, 'utf8')) && fs.statSync(perfil).size > 1500;
  const prox = [];
  if (!perfilFeito) prox.push('- [ ] Rodar /aprender-meu-estilo ' + (nAm ? '(há ' + nAm + ' amostra(s) em ESTILO/amostras)' : '(colocar 5–10 peças próprias em ESTILO/amostras)'));
  if (casos.length) prox.push('- [ ] Completar os dossiês importados (partes, fatos, prazos) ao abrir cada caso com /casos abrir');
  if (e.respostas.prazos && !/^(n[aã]o|nenhum|pular)/i.test(e.respostas.prazos)) prox.push('- [ ] Cadastrar os prazos em PRAZOS.md (controle atual: ' + String(e.respostas.prazos).slice(0, 120) + ')');
  prox.push('- [ ] Opcional: instalar leitor de PDF local (veja README, seção "Ler PDFs")');
  const txt = [
    '# HANDOFF — Primeira execução (' + c.hojeISO() + ')',
    '',
    '## O que foi feito',
    '- Assistente instalado e verificado (v' + c.VERSAO + ').',
    '- Etapas concluídas: ' + ETAPAS.filter(([n]) => e.etapas[n] && e.etapas[n].feito).map(([n]) => n).join(', ') + '.',
    '- Área de atuação: ' + (e.respostas.area || '(não informada)'),
    '- Pastas registradas por apontamento (' + pastas.length + '): ' + (pastas.map((p) => p.tipo + ' → ' + p.caminho).join('; ') || 'nenhuma'),
    '- Amostras de estilo copiadas: ' + nAm + ' · Perfil de escrita: ' + (perfilFeito ? 'gerado' : 'pendente'),
    '- Dossiês de casos ativos: ' + casos.length + (casos.length ? ' (' + casos.slice(0, 15).join(', ') + (casos.length > 15 ? '…' : '') + ')' : ''),
    '',
    '## Decisões',
    '- Originais do advogado ficam onde estão (apontamento, não cópia). Só amostras de estilo foram copiadas.',
    '- Nenhum dado saiu do computador durante a configuração.',
    '',
    '## Próximos passos',
    prox.join('\n'),
    '',
    comoUsar(cfg),
    '',
  ].join('\n');
  const dirH = path.join(cfg.escritorio, 'HANDOFFS'); c.garantirDir(dirH);
  const existente = fs.readdirSync(dirH).find((n) => /_primeira-execucao\.md$/.test(n));
  const arq = path.join(dirH, existente || (c.carimbo().slice(0, 15) + '_primeira-execucao.md'));
  if (existente) c.versionar(arq, path.join(cfg.escritorio, '_versoes'), cfg.escritorio);
  fs.writeFileSync(arq, txt, 'utf8');
  e.etapas.resumo = { feito: true, em: new Date().toISOString() }; gravar(e);
  const conf = c.lerJSON(c.P.config, {}) || {}; conf.onboardingConcluido = true; conf.primeiraExecucaoEm = conf.primeiraExecucaoEm || new Date().toISOString(); c.gravarJSON(c.P.config, conf);
  return { arq, txt: comoUsar(cfg) };
}

// ---------- CLI ----------
function principal() {
  const cmd = args[0] || 'estado';
  const pos = posicionais();
  const e = ler();
  switch (cmd) {
    case 'estado': {
      const prox = proximaEtapa(e); const perg = proximaPergunta(e);
      const r = { versao: c.VERSAO, arquivo: ARQ, etapas: ETAPAS.map(([n, d]) => ({ etapa: n, descricao: d, feito: !!(e.etapas[n] && e.etapas[n].feito) })), proximaEtapa: prox, proximaPergunta: prox === 'entrevista' && perg ? perg.id : null, respostas: Object.keys(e.respostas), pastasRegistradas: mapa.listar().length, concluido: !prox };
      if (flag('--json')) return sair(JSON.stringify(r, null, 2));
      return sair(['Primeira execução — v' + c.VERSAO, ...r.etapas.map((x) => (x.feito ? '  ✅ ' : '  ⬜ ') + x.etapa + ' — ' + x.descricao), '', r.concluido ? 'TUDO CONCLUÍDO. (Para refazer: reiniciar)' : 'PRÓXIMA ETAPA: ' + prox + (r.proximaPergunta ? ' (pergunta: ' + r.proximaPergunta + ')' : '')].join('\n'));
    }
    case 'marcar': {
      const et = pos[0];
      if (!ETAPAS.some(([n]) => n === et)) return sair('Etapa inválida. Use: ' + ETAPAS.map(([n]) => n).join(', '), 2);
      const ja = e.etapas[et] && e.etapas[et].feito;
      e.etapas[et] = { feito: true, em: (ja && e.etapas[et].em) || new Date().toISOString(), nota: pos[1] || (e.etapas[et] && e.etapas[et].nota) || '' };
      gravar(e); return sair((ja ? 'Já estava marcada: ' : 'Marcada: ') + et + '. Próxima etapa: ' + (proximaEtapa(e) || 'nenhuma (concluído)'));
    }
    case 'proxima-pergunta': {
      const q = proximaPergunta(e);
      if (flag('--json')) return sair(JSON.stringify(q ? Object.assign({ restantes: PERGUNTAS.filter((x) => !(x.id in e.respostas)).length }, q) : { fim: true }));
      if (!q) return sair('FIM DA ENTREVISTA: todas as perguntas foram respondidas. Marque a etapa: marcar entrevista');
      return sair('PERGUNTA [' + q.id + '] (' + PERGUNTAS.filter((x) => !(x.id in e.respostas)).length + ' restante(s)):\n' + q.texto + (q.acao ? '\nDEPOIS: ' + q.acao : '') + (q.registrar ? '\nSe a resposta for um caminho confirmado: registrar ' + q.registrar + ' "<caminho>"' : '') + '\nGrave com: responder ' + q.id + ' "<resposta resumida>" (ou "pular")');
    }
    case 'responder': {
      const [id, ...resto] = pos; const q = PERGUNTAS.find((x) => x.id === id);
      if (!q) return sair('Pergunta inválida. Use: ' + PERGUNTAS.map((x) => x.id).join(', '), 2);
      const resp = resto.join(' ').trim() || 'pular';
      const s = c.acharSigilo ? c.acharSigilo(resp) : [];
      if (s && s.length) return sair('Resposta recusada: parece conter dados pessoais (' + s.join(', ') + '). Grave só preferências ou caminhos de pasta.', 2);
      e.respostas[id] = resp.slice(0, 500); gravar(e);
      const q2 = proximaPergunta(e);
      return sair('Resposta gravada [' + id + ']. ' + (q2 ? 'Próxima: proxima-pergunta' : 'Entrevista completa: marcar entrevista'));
    }
    case 'varrer': {
      const raizes = valores('--raiz').map((r) => path.resolve(r)).filter((r) => fs.existsSync(r));
      const r = varrer(raizes.length ? raizes : raizesPadrao(), {});
      e.varredura = { em: new Date().toISOString(), pastas: r.pastasVisitadas, grupos: r._caminhos }; gravar(e);
      delete r._caminhos;
      return sair(flag('--json') ? JSON.stringify(r, null, 2) : imprimirVarredura(r));
    }
    case 'registrar': {
      const gi = args.indexOf('--grupo');
      let tipo, caminho, obs;
      if (gi >= 0) {
        const id = String(args[gi + 1] || '').toUpperCase();
        caminho = e.varredura && e.varredura.grupos && e.varredura.grupos[id];
        if (!caminho) return sair('Grupo ' + id + ' não encontrado. Rode varrer de novo.', 2);
        [tipo, ...obs] = pos;
      } else [tipo, caminho, ...obs] = pos;
      if (!tipo || !caminho) return sair('Uso: registrar <tipo> "<caminho>" [observação]. Tipos: ' + Object.keys(mapa.TIPOS).join(', '), 2);
      const r = mapa.registrar(tipo, caminho, obs.join(' '));
      if (!r.ok) return sair('Não registrado: ' + r.erro, 2);
      return sair((r.novo ? '✅ Registrado: ' : '✅ Já estava registrado: ') + mapa.TIPOS[tipo] + ' → ' + (gi >= 0 ? 'grupo ' + String(args[gi + 1]).toUpperCase() + ' (caminho completo no mapa-de-pastas.md, local)' : r.item.caminho) + (r.item.nuvem ? '\n⚠️ Essa pasta sincroniza com a nuvem (o serviço de nuvem já envia esses arquivos; o assistente não envia nada).' : '') + '\nMapa: ' + path.join(c.config().escritorio, 'mapa-de-pastas.md'));
    }
    case 'remover': {
      if (!pos[0]) return sair('Uso: remover "<caminho>"', 2);
      return sair('Removido(s): ' + mapa.remover(pos[0]));
    }
    case 'subpastas': {
      const gS = grupoDe(e); if (gS) pos.unshift(gS);
      const dir = pos[0]; if (!dir || !fs.existsSync(dir)) return sair('Pasta não encontrada: ' + dir, 2);
      const subs = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && !PULAR.test(d.name)).map((d) => ({ nome: d.name, caminho: path.join(dir, d.name), documentos: contarDocs(path.join(dir, d.name), 2) }));
      if (flag('--json')) return sair(JSON.stringify(subs, null, 2));
      return sair(subs.length ? subs.map((s, i) => (i + 1) + '. ' + s.nome + ' — ' + s.documentos + ' documento(s)').join('\n') : '(nenhuma subpasta)');
    }
    case 'copiar-amostras': {
      const gC = grupoDe(e); if (gC) pos.unshift(gC);
      const maxI = args.indexOf('--max'); const max = maxI >= 0 ? parseInt(args[maxI + 1], 10) || 10 : 15;
      if (!pos.length) return sair('Uso: copiar-amostras <arquivo|pasta>... [--max N]', 2);
      const r = copiarAmostras(pos, max);
      return sair('Amostras em ' + r.destino + ': ' + r.copiados.length + ' copiada(s)' + (r.iguais.length ? ', ' + r.iguais.length + ' já existiam' : '') + (r.ignorados ? ', ' + r.ignorados + ' acima do limite' : '') + '. Os originais não foram alterados.');
    }
    case 'dossie': {
      if (!pos[0]) return sair('Uso: dossie "<nome do caso>" ["<pasta original>"]', 2);
      if (pos[1] && !fs.existsSync(pos[1])) return sair('Pasta original não encontrada: ' + pos[1], 2);
      const r = criarDossie(pos[0], pos[1]);
      return sair((r.criado ? '✅ Dossiê criado: ' : 'Já existia (nada alterado): ') + path.join(r.pasta, 'DOSSIE.md'));
    }
    case 'dossies': {
      // Cria um dossie para CADA subpasta, sem listar nomes no chat (so contagens).
      const gi = args.indexOf('--grupo');
      const dir = gi >= 0 ? (e.varredura && e.varredura.grupos && e.varredura.grupos[String(args[gi + 1] || '').toUpperCase()]) : pos[0];
      if (!dir || !fs.existsSync(dir)) return sair('Pasta/grupo não encontrado. Use: dossies --grupo G1  ou  dossies "<pasta de casos>"', 2);
      const subs = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && !PULAR.test(d.name));
      let novos = 0, ja = 0;
      for (const s of subs) { const r = criarDossie(s.name, path.join(dir, s.name)); if (r.criado) novos++; else ja++; }
      return sair('Dossiês: ' + novos + ' criado(s), ' + ja + ' já existia(m), de ' + subs.length + ' pasta(s). Ficam em ESCRITORIO/CASOS/Ativos (apontando para as pastas originais, sem copiar).');
    }
    case 'concluir': { const r = concluir(); return sair('✅ Primeiro HANDOFF gravado: ' + r.arq + '\n\n' + r.txt); }
    case 'reiniciar': { gravar(novoEstado()); return sair('Estado da primeira execução zerado (pastas registradas e arquivos criados foram mantidos).'); }
    default: return sair('Comando desconhecido. Veja o cabeçalho deste arquivo.', 2);
  }
}
if (require.main === module) principal();
module.exports = { ETAPAS, PERGUNTAS, varrer, raizesPadrao, slug, mascarar };
