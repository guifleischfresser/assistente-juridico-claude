'use strict';
// Padroes de "prompt injection" (instrucoes escondidas para a IA em pecas da parte contraria,
// PDFs de autos, paginas web). Detectar != bloquear: o assistente avisa e trata como conteudo.
const PADROES = [
  /ignore (all |any |the )?(previous|prior|above|earlier) (instructions|prompts|rules)/i,
  /disregard (all |the )?(previous|prior|above) /i,
  /ignor[ea]r? (todas |quaisquer )?(as )?(instru[cç][oõ]es|orienta[cç][oõ]es|regras) (anteriores|acima|pr[eé]vias)/i,
  /desconsider[ea]r? (todas )?(as )?(instru[cç][oõ]es|orienta[cç][oõ]es)/i,
  /(you are now|act as|aja como|finja que|a partir de agora,? voc[eê] (é|e|deve))/i,
  /(system prompt|prompt do sistema|<\/?system>|\[INST\]|<\|im_start\|>)/i,
  /(note|nota|instru[cç][aã]o) (to|para) (the )?(ai|ia|llm|assistente|modelo|chatgpt|claude|gemini)/i,
  /(se voc[eê] (é|for) (uma )?(ia|intelig[eê]ncia artificial|modelo de linguagem)|if you are an? (ai|language model|llm))/i,
  /(julgue|decida|conclua|declare|opine)[^.\n]{0,40}(procedente|improcedente|favor[aá]vel|a favor d)/i,
  /(send|envie|mande|encaminhe|upload)[^.\n]{0,60}(to|para)\s+(https?:\/\/|[\w.+-]+@[\w-]+\.)/i,
  /(do not|don't|n[aã]o) (tell|mention|reveal|informe|mencione|revele|conte|avise) (the user|o usu[aá]rio|ao usu[aá]rio)/i,
];
function detectarInjecao(texto) {
  texto = String(texto || '');
  const achados = [];
  for (const re of PADROES) {
    const m = texto.match(re);
    if (m) {
      const i = Math.max(0, m.index - 60);
      achados.push(texto.slice(i, m.index + m[0].length + 60).replace(/\s+/g, ' ').trim());
    }
  }
  return achados;
}
module.exports = { detectarInjecao };
