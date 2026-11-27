Implementei o formato comum em `skills/revisar/references/entrega.md` e atualizei os `SKILL.md` de `/revisar`, `/nova-peca`, `/mapa-de-teses` e `/advogado-do-diabo`. O worktree está pronto para revisão. O Git recusou a criação de `index.lock` porque seus metadados estão montados como somente leitura. O commit ficou pendente.

**Título sugerido do PR**

Expõe conferências, pendências e premissas na entrega de peças

**Corpo do PR**

Adiciona as listas **Conferi**, **Não consegui conferir** e **Assumi** à entrega dos quatro fluxos. As duas últimas listas destacam, juntas, até três pontos por impacto provável, cada um com a consequência concreta e o próximo passo de validação. A presença de uma fonte não equivale à conferência da citação no original. As saídas específicas, os marcadores e o frontmatter foram preservados.

- **Validação local.** `node ferramentas/sincronizar-bootstrap.js --verificar`, `git diff --check` e os três exemplos sintéticos passaram. Os exemplos cobrem lista vazia, quatro candidatos para três destaques e citação com fonte cujo original está pendente.
- **Linux.** A suíte normal e a de fuso foram interrompidas após erros `EPERM` em subprocessos. A mesma falha foi reproduzida no `HEAD` sem as alterações. O instalador silencioso concluiu, o doutor falhou nos testes de hooks e o bootstrap Bash foi bloqueado ao abrir a porta local.
- **CI.** Os jobs `testes` e `testes-fuso` ainda precisam ser conferidos em Linux, macOS e Windows, incluindo os jobs tolerantes a erro. O instalador silencioso com doutor e o bootstrap em PowerShell 5.1 seguem pendentes no Windows.
- **Sobreposição.** As referências locais disponíveis não mostraram edição concorrente nos cinco arquivos. O `CHANGELOG.md` ficou fora do diff para evitar sobreposição com #18.