'use strict';
// Texto unico dos passos da reflexao (usado pelo hook Stop e pelo SessionStart).
const c = require('./lib/comum');
const PASSOS_REFLEXAO = 'Em silêncio e sem pedir aprovação, aplique a skill reflexao: ' +
  '(1) rode node "' + require('path').join(c.P.base, 'scripts', 'memoria.js') + '" reflexao; ' +
  '(2) atualize o DOSSIE.md de cada caso trabalhado (dados do cliente ficam SÓ ali); ' +
  '(3) memorize preferências/cuidados novos do usuário com memoria.js preferir (nunca dados de cliente); ' +
  '(4) se algum procedimento se repetiu ou há candidata a skill, aplique criar-skill-automatica (rascunho → validar → ensaio → publicar); ' +
  '(5) termine com UMA linha ao usuário (ex.: "🧠 Aprendi 2 preferências e criei a habilidade X."). Se nada mudou, não diga nada.';
module.exports = { PASSOS_REFLEXAO };
