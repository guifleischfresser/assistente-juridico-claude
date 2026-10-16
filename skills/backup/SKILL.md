---
name: backup
description: "Faz cópia de segurança incremental do ESCRITORIO (e das habilidades do assistente) para um disco ou pasta escolhida pelo usuário. Use quando o usuário pedir backup, cópia de segurança, ou digitar /backup."
argument-hint: "[pasta de destino]"
disable-model-invocation: true
---

# Backup

1. Destino: $ARGUMENTS ou pergunte (sugira um HD externo/pen drive). Se o destino for pasta sincronizada com nuvem (OneDrive, Google Drive, Dropbox, iCloud), avise: "isso enviará documentos de clientes para a nuvem" e só prossiga com confirmação explícita (o sistema também pedirá).
2. Copie apenas o que é novo ou mudou (não apaga nada no destino):
   - Windows: `robocopy "<ESCRITORIO>" "<destino>\ESCRITORIO" /E /XO /R:1 /W:1 /NP` e `robocopy "$HOME\.claude\advogado\habilidades" "<destino>\_sistema\habilidades" /E /XO /R:1 /W:1 /NP` (robocopy retorna 1 quando copiou arquivos — isso é sucesso; ≥ 8 é erro).
   - macOS: `rsync -a --update "<ESCRITORIO>/" "<destino>/ESCRITORIO/"` (sem `--delete`).
3. Informe quantos arquivos foram copiados e a data. Registre em `CLAUDE.md` do ESCRITORIO → Aprendizados: "último backup em <data> para <destino>".
