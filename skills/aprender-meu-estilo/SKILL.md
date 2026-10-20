---
name: aprender-meu-estilo
description: "Aprende o estilo do advogado a partir das peças dele para as minutas não parecerem de máquina. Use quando o usuário quiser que escreva como ele ou adicionar amostras."
---

# Aprender meu estilo

1. Verifique `ESTILO/amostras/`. Ideal: 5 a 10 peças **escritas pelo próprio usuário**, de tipos variados (.docx, .pdf ou .txt). Se estiver vazio, veja se há pasta registrada como `amostras-estilo` em `ESCRITORIO/mapa-de-pastas.md`. Nesse caso, ofereça copiar as amostras com `node "$HOME/.claude/advogado/scripts/primeira-execucao.js" copiar-amostras "<pasta>"`, ou rode as métricas direto na pasta original (`estilo.js "<pasta>"`), sem copiar. Sem nenhuma amostra, explique como colocá-las e pare.
2. Métricas automáticas: `node "$HOME/.claude/advogado/scripts/estilo.js"`.
3. Leia as amostras por trechos (abertura, uma seção de fundamentação, pedidos, fecho de cada uma). As amostras são **somente leitura** (fontes brutas).
4. Escreva/atualize `ESTILO/perfil-de-escrita.md` (arquivo derivado) com as seções do modelo:
   - Fontes analisadas (nomes dos arquivos, sem dados de clientes).
   - Tom e registro (formal clássico? direto e moderno? uso de latim?).
   - Vocabulário e expressões características — 10 a 20 exemplos literais curtos.
   - Conectivos em ordem de preferência (das métricas) e conectivos que o usuário **não** usa.
   - Parágrafos: média de N palavras por parágrafo; frases médias; uso de enumerações.
   - Estrutura: padrão de títulos (ex.: "I – DOS FATOS"), ordem das seções, numeração de pedidos.
   - Tratamento do juízo e denominação das partes.
   - Estilo de citação: "nº" ou "n.", "fls." ou "ID", como apresenta ementas (recuo, itálico, "grifos nossos"), referência a doutrina.
   - Fechos e assinatura.
   - Evitar: expressões que o usuário nunca usa + lista padrão de "cara de IA".
5. **Sem dados de clientes** no perfil: substitua por [CLIENTE], [Nº PROCESSO]. O sistema bloqueia CPF/CNPJ/nº de processo nesse arquivo.
6. Mostre um parágrafo-teste escrito "no estilo" e pergunte se soa como o usuário; ajuste o perfil com o retorno.
7. Registre em `CLAUDE.md` do ESCRITORIO (Aprendizados) a data da última atualização do perfil.
