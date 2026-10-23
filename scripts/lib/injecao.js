'use strict';
// Padroes de "prompt injection" (instrucoes escondidas para a IA em pecas da parte contraria,
// PDFs de autos, paginas web) e de TEXTO OCULTO (fonte branca, minuscula, "vanish", caracteres
// de largura zero, CSS que esconde). Dois usos:
//  - o que ENTRA (autos, Read, WebFetch): detectar != bloquear — o assistente avisa e trata como conteudo;
//  - o que SAI (gravar/exportar peca): texto oculto e barrado (nunca inserir texto escondido em peca).

// Caracteres invisiveis: largura zero, juntores, marcas de direcao (bidi) e o BOM fora do inicio.
// O hifen discricionario (U+00AD) fica de fora: o Word o usa legitimamente para hifenizar.
const INVISIVEIS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u180E\uFEFF]/g;
const NOMES_INVISIVEIS = { '200b': 'espaço de largura zero', '200c': 'separador invisível', '200d': 'juntor invisível', '2060': 'juntor de palavra invisível', 'feff': 'caractere invisível (BOM)' };

const PADROES = [
  /ignore (all |any |the )?(previous|prior|above|earlier) (instructions|prompts|rules)/i,
  /disregard (all |the )?(previous|prior|above) /i,
  /ignor[ea]r? (todas |quaisquer )?(as )?(instru[cç][oõ]es|orienta[cç][oõ]es|regras) (anteriores|acima|pr[eé]vias)/i,
  /desconsider[ea]r? (todas )?(as )?(instru[cç][oõ]es|orienta[cç][oõ]es)/i,
  /esque[cç]a (tudo|todas as (suas )?(instru[cç][oõ]es|regras)|o que (te|lhe) (disseram|mandaram))/i,
  /(novas|nova) instru[cç](?:[oõ]es|[aã]o)( do sistema| para (a ia|o assistente))?\s*:/i,
  /(n[aã]o (obede[cç]a|siga|cumpra)|ignore) (o|os|ao|aos) (pedidos?|comandos?|instru[cç](?:[oõ]es|[aã]o)) (do|da) (usu[aá]ri[oa]|advogad[oa])/i,
  /(you are now|act as|aja como|finja que|a partir de agora,? voc[eê] (é|e|deve))/i,
  /(system prompt|prompt do sistema|<\/?system>|\[INST\]|<\|im_start\|>)/i,
  /(note|nota|instru[cç][aã]o) (to|para) (the )?(ai|ia|llm|assistente|modelo|chatgpt|claude|gemini)/i,
  /(se voc[eê] (é|for) (uma )?(ia|intelig[eê]ncia artificial|modelo de linguagem)|if you are an? (ai|language model|llm))/i,
  /(julgue|decida|conclua|declare|opine)[^.\n]{0,40}(procedente|improcedente|favor[aá]vel|a favor d)/i,
  /(send|envie|mande|encaminhe|upload)[^.\n]{0,60}(to|para)\s+(https?:\/\/|[\w.+-]+@[\w-]+\.)/i,
  /(do not|don't|n[aã]o) (tell|mention|reveal|informe|mencione|revele|conte|avise) (the user|o usu[aá]rio|ao usu[aá]rio|ao advogado|o advogado)/i,
];

/** Remove caracteres invisiveis (atacantes os usam para quebrar palavras: "ig\u200Bnore"). */
function limparInvisiveis(texto) { return String(texto || '').replace(INVISIVEIS, ''); }

function detectarInjecao(texto) {
  texto = limparInvisiveis(texto);
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

/** Caracteres invisiveis no texto (ignora um BOM no inicio do arquivo). */
function detectarInvisiveis(texto) {
  // BOM no inicio do arquivo (ou logo apos o numero de linha da ferramenta de leitura) e normal
  const t = String(texto || '').replace(/(^|\n)(\s*\d+\t)?\uFEFF/g, '$1$2');
  const m = t.match(INVISIVEIS) || [];
  if (!m.length) return [];
  const tipos = new Set(m.map((ch) => NOMES_INVISIVEIS[ch.charCodeAt(0).toString(16).padStart(4, '0')] || 'caractere invisível de direção do texto'));
  return [m.length + ' caractere(s) invisível(is): ' + Array.from(tipos).join(', ')];
}

// Run do Word "invisivel": vanish/specVanish/webHidden, cor quase branca (FxFxFx) ou tamanho <= 2 pt (w:sz em meios-pontos).
const RUN_OCULTO = [
  [/<w:(vanish|specVanish|webHidden)(?:\s+w:val="(?:true|1|on)")?\s*\/>/, 'texto marcado como oculto'],
  [/<w:color\s+w:val="(?:F[0-9A-F]){3}"/i, 'fonte branca'],
  [/<w:sz\s+w:val="[0-4]"\s*\/>/, 'fonte minúscula'],
];
/** Texto oculto no XML de um .docx (word/document.xml). Retorna [{motivo, texto}]. */
function ocultoNoDocx(xml) {
  const achados = [];
  for (const r of String(xml || '').split(/<\/w:r>/)) {
    const txt = (r.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join('');
    if (!txt.trim()) continue;
    const rpr = (r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
    const hit = RUN_OCULTO.find(([re]) => re.test(rpr) && !/<w:(vanish|specVanish|webHidden)\s+w:val="(?:false|0|off)"/.test(rpr));
    if (hit) achados.push({ motivo: hit[1], texto: decodificar(txt.trim()) });
  }
  return achados;
}
function decodificar(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); }

// HTML/CSS/Markdown que esconde texto (em paginas web e em pecas escritas em .md/.html).
const CSS_OCULTO = [
  [/display\s*:\s*none/i, 'texto escondido (display:none)'],
  [/visibility\s*:\s*hidden/i, 'texto escondido (visibility:hidden)'],
  [/opacity\s*:\s*0(?:\.0+)?\s*(?:[;"']|$)/i, 'texto transparente'],
  [/font-size\s*:\s*(?:0+(?:\.0+)?\s*(?:px|pt|em|rem|%)?|[0-2](?:\.\d+)?\s*(?:px|pt)|0?\.0\d*\s*(?:em|rem))\s*(?:[;"'!]|$)/i, 'fonte minúscula'],
  [/(?:^|[;"'\s])color\s*:\s*(?:#f{3}\b|#f{6}\b|white\b|rgba?\(\s*25[0-5]\s*,\s*25[0-5]\s*,\s*25[0-5])/i, 'fonte branca'],
  [/<\s*font[^>]*color\s*=\s*["']?(?:#?f{6}|#?f{3}|white)\b/i, 'fonte branca'],
  [/\\(?:color|textcolor)\{white\}/i, 'fonte branca'],
  [/<\s*[a-z]+[^>]*\shidden(?:\s|>|=)/i, 'texto escondido (hidden)'],
];
/** Texto oculto num texto/HTML/Markdown (o que vai ser gravado como peca ou o que chegou da web). */
function ocultoNoTexto(texto) {
  const t = String(texto || '');
  const achados = detectarInvisiveis(t).map((m) => ({ motivo: m, texto: '' }));
  // CSS/HTML so dentro de tags ou atributos style (evita falso positivo em texto juridico comum)
  const trechos = (t.match(/<[^>]{0,600}>|style\s*=\s*["'][^"']{0,600}["']|\\(?:color|textcolor)\{[^}]*\}/gi) || []);
  for (const tr of trechos) for (const [re, motivo] of CSS_OCULTO) if (re.test(tr) && !achados.some((a) => a.motivo === motivo)) achados.push({ motivo, texto: tr.slice(0, 120) });
  // marcas de Word coladas cruas no texto
  for (const [re, motivo] of RUN_OCULTO) if (re.test(t) && !achados.some((a) => a.motivo === motivo)) achados.push({ motivo, texto: '' });
  return achados;
}

/** Analise completa de um documento que CHEGOU (autos, pagina web, arquivo lido). */
function analisarEntrada(texto, opts) {
  opts = opts || {};
  const oculto = (opts.xmlDocx ? ocultoNoDocx(opts.xmlDocx) : []).concat(ocultoNoTexto(texto));
  const textoOculto = oculto.map((o) => o.texto).filter(Boolean).join(' ');
  return { injecao: detectarInjecao(String(texto || '') + '\n' + textoOculto), oculto };
}

/** Frase coloquial para o advogado quando o assistente se recusa a gravar/exportar texto oculto. */
function avisoGravacao(achados, onde) {
  const tipos = Array.from(new Set(achados.map((a) => a.motivo.replace(/^\d+ /, '')))).slice(0, 3).join('; ');
  return '🛑 Achei texto escondido ' + (onde || 'na peça') + ' (' + tipos + ') e não gravei — isso pode ser visto como trapaça no processo. Tira o trecho oculto e tenta de novo.';
}

module.exports = { detectarInjecao, detectarInvisiveis, limparInvisiveis, ocultoNoDocx, ocultoNoTexto, analisarEntrada, avisoGravacao, INVISIVEIS };
