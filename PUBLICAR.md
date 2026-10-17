# Publicar (mantenedor)

Repositório: `guifleischfresser/assistente-juridico-claude` (público). Licença MIT.

1. Crie o repositório no GitHub. Ele precisa ser **público**, porque o advogado baixa `INSTALAR.md` e a release sem login.
2. Troque os marcadores e regenere a skill:
   ```bash
   node ferramentas/definir-repo.js DONO/REPOSITORIO
   node ferramentas/sincronizar-bootstrap.js
   node testes/rodar-testes.js && node testes/simular-bootstrap.js
   ```
3. Envie para a branch `main`, que é o caminho usado na frase: `raw.githubusercontent.com/DONO/REPOSITORIO/main/INSTALAR.md`.
4. **Fixe a versão e o SHA256** (com tudo já commitado) e faça commit do arquivo gerado:
   ```bash
   node ferramentas/empacotar.js --fixar
   git add release/estavel.json && git commit -m "release: fixar v0.4.0"
   ```
   `release/estavel.json` guarda `{versao, tag, arquivo, sha256}` e fica **fora** do zip, então não há dependência circular. O INSTALAR.md lê esse arquivo da `main`, baixa `releases/download/<tag>/<arquivo>` (tag exata, não `latest`) e só aceita se o SHA256 bater com o fixado **e** com o `.sha256` da release. O zip é reprodutível (lista do git, ordem e data fixas, sem compressão), então o hash é o mesmo em qualquer máquina.
5. Envie para a `main` e crie e envie a tag da versão. Ela precisa ser igual a `VERSAO` em `scripts/lib/comum.js` e à `version` em `.claude-plugin/plugin.json`:
   ```bash
   git push origin main
   git tag v0.4.0 && git push origin v0.4.0
   ```
   O workflow `.github/workflows/release.yml` então:
   - roda os testes em Linux, Windows (PowerShell 5.1 real) e macOS;
   - gera `advogado-claude-mod.zip` + `.sha256` (nomes fixos, para o link `releases/latest/download`), a cópia com a versão no nome e `SHA256SUMS.txt`;
   - publica um atestado de procedência (SLSA) e cria a Release.
   Ele **falha** se a tag não bater com a versão, se ainda houver marcadores de dono/repositório sem trocar, ou se o zip reconstruído no CI não tiver exatamente o SHA256 de `release/estavel.json`.
6. Teste num computador limpo, colando a frase do README numa conversa nova do Claude Code (ou na aba Code do Claude Desktop, ambiente Local).

## Recomendações de segurança
- Ative **proteção da branch `main`** e das tags `v*`, com revisão obrigatória. Quem altera `INSTALAR.md` controla o que o Claude executa na máquina dos advogados.
- Ative **releases imutáveis** nas configurações do repositório, se disponível.
- O SHA256 fixado no repositório (`release/estavel.json`) e o publicado na release precisam coincidir, então trocar só o arquivo da release não basta. Isso **não** protege contra o comprometimento do próprio repositório. Para isso servem a proteção de branch e o atestado de procedência (`gh attestation verify advogado-claude-mod.zip -R DONO/REPOSITORIO`).
