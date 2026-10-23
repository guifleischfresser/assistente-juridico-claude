<!-- GERADO de INSTALAR.md por ferramentas/sincronizar-bootstrap.js. Não edite aqui. -->

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Muitas janelas de permissão | Diga: "Tô no modo manual, por isso fico te pedindo licença — aperta Shift+Tab até aparecer “auto” (no aplicativo, escolha **Auto**)." Se o modo auto não aparecer, o plano/modelo/empresa não o libera: "tudo bem, é só clicar Sim" (as regras do instalador reduzem as próximas). |
| `node` não encontrado logo após instalar | Use o caminho completo (Regra 11). Depois de reabrir o Claude Code, `node` passa a funcionar. |
| "execução de scripts desabilitada" | Política da empresa: não contorne. Oriente procurar o TI. |
| CHECKSUM DIFERENTE | Pare. Não instale. Peça para tentar mais tarde. |
| Antivírus bloqueou | Os arquivos são scripts de texto abertos; sugira liberar a pasta temporária ou instalar manualmente pelo README. |
| Conversa caiu no meio | Cole a mesma frase de novo: a Etapa 0 retoma de onde parou. |
| Algo parou de funcionar depois (ex.: depois de atualizar o Claude) | Cada conversa nova confere sozinha o modo auto, as pastas registradas e os acessos, e abre com "⚠️ AVISO PARA O ADVOGADO" se algo sumiu. O conserto é `/consertar`. |
| Uma pasta registrada mudou de lugar | Pergunte uma vez onde ela está agora e reconecte com `PE remover` + `PE registrar` (skill `/consertar`). Nunca mova nem copie a pasta. |
