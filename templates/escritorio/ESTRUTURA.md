# ESTRUTURA do ESCRITÓRIO — mapa oficial

> Este é o mapa que o assistente segue. **As pastas indicam a fase (maturidade), não o assunto.**
> O assistente lê este arquivo antes de criar ou mover qualquer coisa.

```
ESCRITORIO/
├── ESTRUTURA.md          ← este mapa
├── CLAUDE.md             ← perfil e regras da casa (curto; aponta para MEMORIA/)
├── AGENTS.md             ← as mesmas regras para Codex/Cursor (gerado; edite só fora das marcas)
├── MEMORIA/              ← preferências e cuidados aprendidos sozinho, erros-a-nao-repetir.json + CHANGELOG (nunca dados de clientes)
├── mapa-de-pastas.md    ← pastas ORIGINAIS do advogado fora daqui (petições, modelos, casos): só apontadas, nunca copiadas
├── PRAZOS.md             ← agenda de prazos (tabela). A linha de status avisa o próximo
├── CASOS/
│   ├── Em análise/       ← consulta, triagem, ainda sem contratação ou estratégia
│   ├── Ativos/           ← casos em andamento (sempre versionar antes de editar)
│   ├── Arquivados/       ← encerrados. Edição pede confirmação
│   └── _MODELO-DE-CASO/  ← molde copiado pelo /novo-caso
├── PECAS/
│   ├── modelos/          ← modelos-base por tipo (inicial, contestação, recurso, contrato, parecer)
│   └── minhas-pecas/     ← suas peças prontas, por tipo (banco de peças do escritório)
├── ESTILO/
│   ├── amostras/         ← FONTES BRUTAS: suas peças reais. Nunca editadas
│   └── perfil-de-escrita.md ← DERIVADO das amostras (/aprender-meu-estilo), sempre citando as fontes
├── WIKI/
│   ├── raw/              ← FONTES BRUTAS: inteiro teor, leis, artigos baixados. Nunca editadas
│   ├── paginas/          ← resumos DERIVADOS (jurisprudencia/, legislacao/, doutrina/), sempre com fonte
│   ├── julgados-verificados.json ← livro de conferência dos julgados (confere/divergente/inexistente + fonte)
│   └── schema/           ← regras de como escrever uma página da WIKI
├── HANDOFFS/             ← espelho central de todos os handoffs (cada handoff é gravado em 2 lugares)
├── EXPORTADOS/           ← .docx gerados para protocolo/envio
└── _versoes/             ← cópias automáticas feitas antes de cada alteração (não mexer)
```

## Pasta de cada caso
`CASOS/<fase>/<AAAA>-<cliente-abreviado>-<assunto>/`
- `DOSSIE.md` — memória do caso: partes, fatos, teses, documentos, pendências, histórico, uso de IA.
- `HANDOFF.md` — onde paramos e próximos passos (cópia em HANDOFFS/).
- `documentos/` — originais recebidos (PDF, DOCX). Não editar.
- `autos-md/` — autos convertidos para texto por `/preparar-autos` (economiza limite de uso), com `INDICE.md`.
- `pecas/` — minutas e versões das peças deste caso (`.md`), inclusive o `mapa-de-teses-AAAA-MM-DD.md`; a versão final vai para EXPORTADOS/ em `.docx`.

## Regras de movimentação (fases)
- Em análise → Ativos: quando houver contratação/estratégia definida (`/casos ativar`).
- Ativos → Arquivados: trânsito em julgado, acordo cumprido ou desistência (`/casos arquivar`).
- Nunca apagar casos. Arquivar.

## Sistema do assistente (fora do escritório)
- `~/.claude/CLAUDE.md` — instruções globais curtas.
- `~/.claude/skills/` — habilidades vivas (núcleo + `auto-*`).
- `~/.claude/advogado/` — ferramentas, configuração, estado, logs e:
  - `habilidades/CHANGELOG.md` — histórico de toda habilidade criada/alterada/aposentada
  - `habilidades/versoes/` — backups · `habilidades/_aposentadas/` — habilidades retiradas
