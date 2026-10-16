# Como escrever uma página da WIKI

1. `WIKI/raw/` guarda a fonte original (PDF/HTML do inteiro teor, lei, artigo). **Nunca editar.**
2. `WIKI/paginas/<jurisprudencia|legislacao|doutrina>/<assunto>.md` é o resumo derivado.
3. Toda página começa com:
   ```
   ---
   fonte: WIKI/raw/<arquivo>  (ou link oficial: stj.jus.br, stf.jus.br, planalto.gov.br...)
   conferido-em: AAAA-MM-DD
   conferido-por: (advogado | assistente a partir da fonte)
   ---
   ```
4. Julgados: tribunal, classe e número, relator, órgão julgador, data de julgamento e publicação, ementa literal entre aspas, tese em 1 linha.
5. Nas peças, cite assim: `REsp 1.234.567/SP [fonte: WIKI/paginas/jurisprudencia/assunto.md]` — o verificador de citações aceita.
6. Sem fonte = não entra na WIKI.
