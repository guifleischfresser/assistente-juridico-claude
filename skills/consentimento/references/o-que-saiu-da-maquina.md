# "O que já foi enviado pro Claude deste caso?"

Pergunta típica do advogado (ou do cliente, por meio dele): "o que saiu da máquina?", "o que você já leu do caso X?", "o Claude viu o contrato original?". Responda com o registro local do caso, nunca de memória.

`SD` = `node "$HOME/.claude/advogado/scripts/saida.js"`.

1. `SD resumo "<caso>"` (ou `--desde DD/MM/AAAA` para um período). Repita a mensagem do script em português simples, ex.: "Neste caso, o assistente já leu 14 arquivos em 3 conversas. 9 eram cópias anonimizadas. 5 eram originais: 2 deles tinham cópia anonimizada disponível (contrato.pdf, inicial.pdf). Nenhum arquivo foi enviado pela internet além da conversa com o Claude. Consentimento: autorizado por escrito em 29/10/2026."
2. Destaques que merecem uma linha a mais: 🔶 **original lido havendo cópia anonimizada** (sugira, daqui em diante, ler só `anonimizado/`); ⚠️ **lido sem consentimento registrado** (sugira `/consentimento`); ⚠️ **lido após revogação** ou quando o cliente exigia anonimização (avise com franqueza; não trava nada).
3. Para guardar ou mostrar ao cliente: `SD exportar "<caso>"` → `<caso>/_saida/resumo-AAAA-MM-DD.md` (dá para passar para Word com `/formatar-peca`). Visão geral do escritório, só com números: `SD estado`.

## O que o registro é (e o que não é)
- Fica em `<caso>/_saida/registro.jsonl`, só na pasta do caso, anotado sozinho a cada leitura (arquivo, busca, terminal que cita o caminho do caso, ferramenta externa, pesquisa na internet com o caso aberto). Guarda só o caminho relativo, o tipo (original, cópia anonimizada, derivado), se havia cópia anonimizada e o estado do consentimento **naquele momento** — nunca o conteúdo.
- Nunca edite, apague nem copie esse arquivo (a guarda recusa). Ele não é prova técnica: é um apoio honesto para o advogado prestar contas.
- **Limites** (diga quando fizer diferença): só conta o que passou pelas ferramentas do Claude Code com o assistente instalado; o terminal é heurístico (um comando que chega ao arquivo sem citar o caminho do caso não aparece); o que o advogado cola ou digita na conversa também vai para o Claude e não está ali; leituras feitas em outros agentes (Codex, Cursor) não são anotadas.
