---
name: novo-caso
description: "Abre um caso novo no ESCRITORIO com pasta padronizada, DOSSIE.md (memória do caso), HANDOFF.md e prazos. Use quando o usuário disser que tem um cliente/caso/processo novo, uma consulta nova, ou digitar /novo-caso."
argument-hint: "[nome do cliente ou assunto]"
---

# Novo caso

1. Pergunte (uma de cada vez, pulando o que já foi dito em $ARGUMENTS): cliente (nome curto), assunto, parte contrária, se já existe processo (número, juízo, sistema), fase (**Em análise** = consulta/triagem; **Ativos** = contratado/em andamento), prazos conhecidos.
2. Nome da pasta: `AAAA-<cliente-curto>-<assunto>` em minúsculas, sem acentos, com hífens (ex.: `2026-silva-revisional-banco`). Confira se já existe caso parecido em `CASOS/*/` antes (Glob) e pergunte se é o mesmo.
3. Copie `CASOS/_MODELO-DE-CASO/` para `CASOS/<fase>/<pasta>/` (use o shell: `Copy-Item -Recurse` no PowerShell ou `cp -r` no bash; se não houver shell disponível, crie os arquivos com Write).
4. Preencha o `DOSSIE.md` com o que foi informado. Campos desconhecidos ficam como `[A CONFIRMAR]`.
5. Pergunte se o cliente já foi informado sobre o uso de IA (Recomendação CFOAB nº 001/2024). Se não, ofereça o modelo `PECAS/modelos/termo-consentimento-ia.md` e registre a resposta na seção "Uso de IA" do dossiê.
6. Prazos informados → acrescente linhas em `PRAZOS.md` (use `/prazos calcular` se o usuário der só a data da intimação).
7. Peça que o usuário coloque os documentos recebidos em `documentos/` da pasta do caso. Quando houver PDFs, ofereça `/preparar-autos`.
8. Termine com um resumo de 4 linhas e o próximo passo sugerido.

Regras: dados do cliente ficam só na pasta do caso (nunca em CLAUDE.md, skills ou memória). Nunca crie caso fora de `CASOS/`.
