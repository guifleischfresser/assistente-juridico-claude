#!/usr/bin/env node
'use strict';
/*
 * Simula o fluxo "cole uma frase" seguindo LITERALMENTE os blocos de comando do INSTALAR.md:
 * release local (empacotar.js) servida por HTTP em 127.0.0.1 (layout raw/estavel.json + download por tag)
 * -> bloco *-ambiente -> *-baixar (SHA256 fixado + publicado)
 * -> *-instalar (silencioso, atalho) -> doutor -> nome inferido -> PILOTO AUTOMATICO (varredura + registro +
 * dossies + amostras sozinhos; uma pergunta unica respondida com "ok") -> estilo -> concluir -> re-execucao (idempotencia) -> checksum adulterado (deve recusar).
 * Tudo num HOME temporario. Nada sai da maquina.
 * Uso: node testes/simular-bootstrap.js [--shell bash|pwsh|powershell] [--manter]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, spawn } = require('child_process');
const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SHELL = (args.includes('--shell') && args[args.indexOf('--shell') + 1]) || (process.platform === 'win32' ? 'powershell' : 'bash');
const PS = SHELL !== 'bash';
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'simular-bootstrap-'));
const HOME = path.join(T, 'casa'); const TMP = path.join(T, 'tmp'); const SRV = path.join(T, 'srv'); const DIST = path.join(T, 'dist');
[HOME, TMP].forEach((d) => fs.mkdirSync(d, { recursive: true }));
const env = Object.assign({}, process.env, { HOME, USERPROFILE: HOME, TMPDIR: TMP, TEMP: TMP, TMP });
delete env.CLAUDE_CONFIG_DIR; delete env.CLAUDE_CODE_REMOTE;
let ok = 0, falhas = 0;
const t = (nome, cond, info) => { if (cond) { ok++; console.log('  ✅ ' + nome); } else { falhas++; console.log('  ❌ ' + nome + (info ? '\n     ' + String(info).slice(0, 1500).replace(/\n/g, '\n     ') : '')); } };

// 1. release local + servidor HTTP (processo separado)
const emp = spawnSync(process.execPath, [path.join(RAIZ, 'ferramentas', 'empacotar.js'), '--saida', DIST], { encoding: 'utf8' });
if (emp.status !== 0) { console.log(emp.stdout + emp.stderr); process.exit(1); }
// Layout do servidor local imitando o GitHub: /raw/release/estavel.json e /dl/<tag>/<arquivo>(.sha256)
const VER = require(path.join(RAIZ, 'scripts', 'lib', 'comum.js')).VERSAO; const TAG = 'v' + VER; const ARQ = 'advogado-claude-mod-v' + VER + '.zip';
const SHA = fs.readFileSync(path.join(DIST, ARQ + '.sha256'), 'utf8').split(/\s+/)[0];
const DL = path.join(SRV, 'dl', TAG); fs.mkdirSync(DL, { recursive: true }); fs.mkdirSync(path.join(SRV, 'raw', 'release'), { recursive: true });
[ARQ, ARQ + '.sha256'].forEach((n) => fs.copyFileSync(path.join(DIST, n), path.join(DL, n)));
const fixar = (sha) => fs.writeFileSync(path.join(SRV, 'raw', 'release', 'estavel.json'), JSON.stringify({ versao: VER, tag: TAG, arquivo: ARQ, sha256: sha }, null, 2) + '\n');
fixar(SHA);
const SERV = "const h=require('http'),f=require('fs'),p=require('path');const d=process.argv[1];const s=h.createServer((q,r)=>{const a=p.join(d,decodeURIComponent(q.url.split('?')[0]));if(!a.startsWith(d)||!f.existsSync(a)){r.writeHead(404);return r.end()}r.writeHead(200);f.createReadStream(a).pipe(r)});s.listen(0,'127.0.0.1',()=>console.log('PORTA='+s.address().port))";
const srv = spawn(process.execPath, ['-e', SERV, SRV], { stdio: ['ignore', 'pipe', 'inherit'] });

function blocos() {
  const md = fs.readFileSync(path.join(RAIZ, 'INSTALAR.md'), 'utf8');
  const r = {}; const re = /```(bash|powershell)\r?\n# bloco: ([\w-]+)[^\n]*\n([\s\S]*?)```/g; let m;
  while ((m = re.exec(md))) r[m[2]] = m[3];
  return r;
}
function rodarBloco(nome, base) {
  const b = blocos()[nome];
  if (!b) return { status: 99, out: 'bloco não encontrado: ' + nome };
  const codigo = b.replace(/https:\/\/raw\.githubusercontent\.com\/[^/"]+\/[^/"]+\/main/g, base + '/raw').replace(/https:\/\/github\.com\/[^/"]+\/[^/"]+\/releases\/download/g, base + '/dl').split('NOME_DO_USUARIO').join('Dra. Simulada');
  let r;
  if (PS) {
    const arq = path.join(T, nome + '.ps1');
    fs.writeFileSync(arq, '\ufeff' + codigo, 'utf8');
    r = spawnSync(SHELL, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', arq], { env, encoding: 'utf8', timeout: 180000 });
  } else r = spawnSync('bash', ['-c', codigo], { env, encoding: 'utf8', timeout: 180000 });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
const scripts = () => path.join(HOME, '.claude', 'advogado', 'scripts');
const PE = (...a) => { const r = spawnSync(process.execPath, [path.join(scripts(), 'primeira-execucao.js'), ...a], { env, encoding: 'utf8' }); return { status: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
const DOUTOR = (...a) => { const r = spawnSync(process.execPath, [path.join(scripts(), 'doutor.js'), ...a], { env, encoding: 'utf8', timeout: 180000 }); return { status: r.status, out: (r.stdout || '') + (r.stderr || '') }; };

function pastasFalsas() {
  const mk = (p, arqs) => { fs.mkdirSync(path.join(HOME, p), { recursive: true }); (arqs || []).forEach(([n, c]) => fs.writeFileSync(path.join(HOME, p, n), c)); };
  const peca = (i) => 'EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO\n\nI – DOS FATOS\n\nCom efeito, a parte autora celebrou contrato ' + i + ' com a requerida. Outrossim, restou demonstrado o vício. Nesse sentido, o art. 186 do CC.\n\nII – DO DIREITO\n\nDestarte, impõe-se a procedência, conforme art. 319 do CPC.\n\nTermos em que, pede deferimento.\n';
  mk('Documents/Peticoes');
  [['peticao inicial indenizacao', 1], ['contestacao consumidor', 2], ['recurso apelacao', 3]].forEach(([n, i]) => {
    const md = path.join(T, n + '.md'); fs.writeFileSync(md, peca(i));
    spawnSync(process.execPath, [path.join(scripts(), 'exportar-docx.js'), md, path.join(HOME, 'Documents', 'Peticoes', n + '.docx')], { env, encoding: 'utf8' });
  });
  mk('Documents/Modelos', [['modelo procuracao.docx', 'x'], ['minuta contrato.docx', 'y']]);
  mk('OneDrive - Escritorio/Clientes/Maria x Banco Alfa', [['inicial.pdf', 'p1']]);
  mk('OneDrive - Escritorio/Clientes/Joao x Construtora Beta', [['contrato.pdf', 'p2']]);
  mk('Desktop', [['controle de prazos.xlsx', 'z']]);
}

function cenario(base) {
  console.log('\nShell: ' + SHELL + ' · HOME temporário: ' + HOME + ' · release: ' + base);
  console.log('\n1. Etapa 0/1 — ambiente');
  const amb = rodarBloco(PS ? 'ps-ambiente' : 'sh-ambiente', base);
  t('bloco de ambiente roda e detecta Node, não instalado, não remoto', amb.status === 0 && /NODE=\S+ v\d+/.test(amb.out) && /INSTALADO=nao/.test(amb.out) && /REMOTO=\s*$/m.test(amb.out), amb.out);
  t('antes de instalar, "PE estado" não existe (instalação nova)', !fs.existsSync(path.join(scripts(), 'primeira-execucao.js')));

  console.log('\n2. Etapa 2 — download verificado e instalação silenciosa');
  const bx = rodarBloco(PS ? 'ps-baixar' : 'sh-baixar', base);
  t('download pela tag fixada + SHA256 confere + extração', bx.status === 0 && new RegExp('CHECKSUM OK ' + SHA + ' \\(' + TAG + '\\)').test(bx.out) && /PACOTE=/.test(bx.out), bx.out);
  const inst = rodarBloco(PS ? 'ps-instalar' : 'sh-instalar', base);
  t('instalador silencioso conclui', (PS ? /CODIGO=0/.test(inst.out) : inst.status === 0) && /6\/6/.test(inst.out), inst.out);
  t('ESCRITORIO criado na pasta padrão', fs.existsSync(path.join(HOME, 'ESCRITORIO', 'ESTRUTURA.md')));
  t('PE marcar instalacao', PE('marcar', 'instalacao').status === 0);

  const respostasDoUsuario = []; // tudo o que o advogado precisou responder (meta: só um "ok" final)
  t('frase/roteiro sem perguntas de licença, atalho ou nome no instalador', !/NOME_DO_USUARIO/.test(fs.readFileSync(path.join(RAIZ, 'INSTALAR.md'), 'utf8')) && /-Silencioso -Atalho/.test(blocos()['ps-instalar']));
  const sInst = JSON.parse(fs.readFileSync(path.join(HOME, '.claude', 'settings.json'), 'utf8'));
  t('instalador liga modo auto + Opus 5.5 (esforço médio) + memória automática; nada de bypass', sInst.permissions.defaultMode === 'auto' && sInst.model === 'claude-opus-5-5' && sInst.modelSettings['claude-opus-5-5'].effortLevel === 'medium' && sInst.autoMemoryEnabled === true && !JSON.stringify(sInst).includes('bypassPermissions'), JSON.stringify(sInst.permissions).slice(0, 400));

  console.log('\n3. Etapa 2 — doutor e nome (inferido, sem perguntar)');
  const d = DOUTOR();
  t('doutor: TUDO CERTO', d.status === 0 && /TUDO CERTO/.test(d.out), d.out);
  PE('marcar', 'verificacao');
  fs.writeFileSync(path.join(HOME, '.gitconfig'), '[user]\n\tname = Simulada Souza\n');
  const ns = PE('nome-sugerido'); const nome = (ns.out.match(/^NOME=(.*)$/m) || [])[1] || '';
  if (!nome.trim()) respostasDoUsuario.push('nome');
  t('nome descoberto sozinho (git config) e gravado', /NOME=Simulada Souza/.test(ns.out) && PE('definir-nome', nome.trim() || 'Dra. Simulada').status === 0, ns.out);

  console.log('\n4. Etapa 4 — descoberta autônoma das pastas (PILOTO AUTOMÁTICO)');
  pastasFalsas();
  const ap = PE('autopiloto');
  t('autopiloto registra sozinho peças, modelos e prazos e cria dossiês/amostras', ap.status === 0 && /1 de peças já escritas/.test(ap.out) && /1 de modelos/.test(ap.out) && /1 de controle de prazos/.test(ap.out) && /Amostras de estilo copiadas \(cópia local\): 3/.test(ap.out), ap.out);
  t('saída do autopiloto sem nomes de clientes, arquivos ou caminhos (sigilo)', !/Maria|Joao|Banco|Construtora|peticao inicial|controle de prazos\.xlsx|casa[\\/]/.test(ap.out), ap.out);
  const perguntaUnica = /PERGUNTA ÚNICA/.test(ap.out);
  t('no máximo UMA pergunta, em uma só mensagem (pasta de casos ambígua: só 2 subpastas)', perguntaUnica && (ap.out.match(/^- \[G\d+\]/gm) || []).length === 1 && /OneDrive - Escritorio\/Clientes: 2 pasta/.test(ap.out), ap.out);
  if (perguntaUnica) { respostasDoUsuario.push('ok'); const rs = PE('resolver', 'ok'); t('"ok" aceita as sugestões (casos registrados + dossiês)', rs.status === 0 && /dossiês criados: 2/.test(rs.out), rs.out); }
  PE('marcar', 'registro'); PE('marcar', 'dossies');
  const mapa = fs.readFileSync(path.join(HOME, 'ESCRITORIO', 'mapa-de-pastas.md'), 'utf8');
  const s = JSON.parse(fs.readFileSync(path.join(HOME, '.claude', 'settings.json'), 'utf8'));
  t('mapa-de-pastas.md + additionalDirectories (apontamento, sem cópia)', /Documents\/Peticoes/.test(mapa.replace(/\\/g, '/')) && s.permissions.additionalDirectories.some((x) => /Clientes$/.test(x)) && !fs.existsSync(path.join(HOME, 'ESCRITORIO', 'Peticoes')), mapa);
  const casosDir = path.join(HOME, 'OneDrive - Escritorio', 'Clientes');
  const ativos = fs.readdirSync(path.join(HOME, 'ESCRITORIO', 'CASOS', 'Ativos'));
  const dos = fs.readFileSync(path.join(HOME, 'ESCRITORIO', 'CASOS', 'Ativos', ativos.find((a) => /maria/.test(a)), 'DOSSIE.md'), 'utf8');
  t('dossiês criados apontando para a pasta original', ativos.length === 2 && /Pasta original/.test(dos) && dos.includes(path.join(casosDir, 'Maria x Banco Alfa')), ativos.join(','));
  const pa = spawnSync(process.execPath, [path.join(scripts(), 'preparar-autos.js'), path.join(HOME, 'ESCRITORIO', 'CASOS', 'Ativos', ativos.find((a) => /maria/.test(a)))], { env, encoding: 'utf8' });
  t('/preparar-autos lê da pasta original sem copiar', /pasta original/.test(pa.stdout) && !fs.existsSync(path.join(HOME, 'ESCRITORIO', 'CASOS', 'Ativos', ativos[0], 'documentos', 'inicial.pdf')), pa.stdout + pa.stderr);

  console.log('\n5. Etapa 5 — estilo (automático)');
  const est2 = spawnSync(process.execPath, [path.join(scripts(), 'estilo.js'), '--json'], { env, encoding: 'utf8' });
  let met = {}; try { met = JSON.parse(est2.stdout); } catch (e) { /* */ }
  t('métricas de estilo calculadas sobre as amostras copiadas sozinho', met.amostras && met.amostras.length === 3, est2.stdout.slice(0, 400));
  PE('marcar', 'estilo');

  console.log('\n6. Etapa 6 — resumo e primeiro HANDOFF');
  const cc = PE('concluir');
  const hs = fs.readdirSync(path.join(HOME, 'ESCRITORIO', 'HANDOFFS')).filter((x) => /primeira-execucao/.test(x));
  t('primeiro HANDOFF gravado e "como usar" impresso', cc.status === 0 && hs.length === 1 && /Como usar/.test(cc.out), cc.out);
  t('estado: TUDO CONCLUÍDO', /TUDO CONCLUÍDO/.test(PE('estado').out), PE('estado').out);
  const cfg = JSON.parse(fs.readFileSync(path.join(HOME, '.claude', 'advogado', 'config.json'), 'utf8'));
  t('config: onboardingConcluido e nome inferido gravados', cfg.onboardingConcluido === true && cfg.nome === 'Simulada Souza', JSON.stringify(cfg));
  t('PILOTO AUTOMÁTICO: o advogado respondeu só "ok" (zero outras respostas)', respostasDoUsuario.length === 1 && respostasDoUsuario[0] === 'ok', JSON.stringify(respostasDoUsuario));

  console.log('\n7. Re-execução (idempotência) e reparo');
  const bx2 = rodarBloco(PS ? 'ps-baixar' : 'sh-baixar', base); const in2 = rodarBloco(PS ? 'ps-instalar' : 'sh-instalar', base);
  t('rodar download+instalação de novo funciona', /CHECKSUM OK/.test(bx2.out) && /6\/6/.test(in2.out), bx2.out + in2.out);
  const s2 = JSON.parse(fs.readFileSync(path.join(HOME, '.claude', 'settings.json'), 'utf8'));
  const cfg2 = JSON.parse(fs.readFileSync(path.join(HOME, '.claude', 'advogado', 'config.json'), 'utf8'));
  t('nada duplicado: hooks, pastas registradas, dossiês, handoff; onboarding preservado', s2.hooks.Stop.length === 1 && cfg2.pastasExternas.length === 4 && fs.readdirSync(path.join(HOME, 'ESCRITORIO', 'CASOS', 'Ativos')).length === 2 && cfg2.onboardingConcluido === true && PE('concluir') && fs.readdirSync(path.join(HOME, 'ESCRITORIO', 'HANDOFFS')).filter((x) => /primeira-execucao/.test(x)).length === 1, JSON.stringify(s2.hooks.Stop));
  fs.rmSync(path.join(HOME, '.claude', 'skills', 'nova-peca'), { recursive: true, force: true });
  const dc = DOUTOR('--consertar');
  t('/consertar recupera skill apagada', dc.status === 0 && fs.existsSync(path.join(HOME, '.claude', 'skills', 'nova-peca', 'SKILL.md')), dc.out);

  console.log('\n8. Segurança do download');
  const zipTmp = () => fs.existsSync(path.join(TMP, 'advogado-claude', 'advogado-claude-mod.zip'));
  fixar('0'.repeat(64));
  const bx3 = rodarBloco(PS ? 'ps-baixar' : 'sh-baixar', base);
  t('hash fixado (estavel.json) diferente: recusado e zip descartado', bx3.status !== 0 && /CHECKSUM DIFERENTE/.test(bx3.out) && !zipTmp(), bx3.out);
  fixar(SHA); fs.writeFileSync(path.join(DL, ARQ + '.sha256'), '0'.repeat(64) + '  ' + ARQ + '\n');
  const bx4 = rodarBloco(PS ? 'ps-baixar' : 'sh-baixar', base);
  t('.sha256 publicado na release diferente: recusado mesmo com o fixado certo', bx4.status !== 0 && /CHECKSUM DIFERENTE/.test(bx4.out) && !zipTmp(), bx4.out);
  fs.writeFileSync(path.join(SRV, 'raw', 'release', 'estavel.json'), JSON.stringify({ tag: 'v1/../../x', arquivo: 'a.zip', sha256: SHA }));
  const bx5 = rodarBloco(PS ? 'ps-baixar' : 'sh-baixar', base);
  t('estavel.json malformado (tag inválida): download cancelado', bx5.status !== 0 && /estavel\.json invalido/.test(bx5.out), bx5.out);
}

let saidaSrv = '';
srv.stdout.on('data', (b) => {
  saidaSrv += b; const m = saidaSrv.match(/PORTA=(\d+)/);
  if (!m || srv._iniciado) return; srv._iniciado = true;
  try { cenario('http://127.0.0.1:' + m[1]); } catch (e) { falhas++; console.log('  ❌ exceção: ' + e.stack); }
  srv.kill();
  console.log('\nSimulação (' + SHELL + '): ' + ok + ' ok, ' + falhas + ' falha(s).');
  if (!args.includes('--manter')) try { fs.rmSync(T, { recursive: true, force: true }); } catch (e) { /* */ } else console.log('Mantido: ' + T);
  process.exit(falhas ? 1 : 0);
});
