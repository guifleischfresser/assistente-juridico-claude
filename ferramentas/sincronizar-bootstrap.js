#!/usr/bin/env node
'use strict';
// Gera skills/primeira-execucao/SKILL.md a partir de INSTALAR.md (fonte unica).
// Uso: node ferramentas/sincronizar-bootstrap.js [--verificar]   (--verificar: sai 1 se estiver dessincronizado)
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const FRONT = [
  '---',
  'name: primeira-execucao',
  'description: "Instalação e configuração inicial autônoma do assistente jurídico: verifica o computador, baixa o pacote do GitHub com SHA256, instala em modo silencioso, roda o doutor e conduz a entrevista (uma pergunta por vez) para registrar onde ficam petições, modelos, casos, amostras de estilo e prazos, por apontamento. Retomável e idempotente. Use na primeira vez, quando o SessionStart indicar ONBOARDING PENDENTE ou PRIMEIRA EXECUÇÃO INCOMPLETA, quando o usuário quiser refazer a configuração ou digitar /primeira-execucao."',
  'argument-hint: "[retomar | refazer]"',
  '---',
  '',
  '<!-- GERADO de INSTALAR.md por ferramentas/sincronizar-bootstrap.js. Não edite aqui. -->',
  '> Se o assistente já está instalado, comece pela **Etapa 0** (ela pula o que já foi feito). Com o argumento `refazer`, rode antes `PE reiniciar`.',
  '',
].join('\n');
function gerar() { return FRONT + fs.readFileSync(path.join(RAIZ, 'INSTALAR.md'), 'utf8'); }
const destino = path.join(RAIZ, 'skills', 'primeira-execucao', 'SKILL.md');
if (process.argv.includes('--verificar')) {
  const ok = fs.existsSync(destino) && fs.readFileSync(destino, 'utf8') === gerar();
  console.log(ok ? 'primeira-execucao sincronizada com INSTALAR.md' : 'DESSINCRONIZADO: rode node ferramentas/sincronizar-bootstrap.js');
  process.exit(ok ? 0 : 1);
}
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, gerar(), 'utf8');
console.log('Gerado: ' + path.relative(RAIZ, destino));
