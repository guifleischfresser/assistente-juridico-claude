---
name: x-digest
description: >-
  Use when a routine monitors public X posts on set themes and sends Guilherme a
  short digest: time window, state file, item cap, and staying quiet.
---
# X digest

1. **Window:** only posts since the last run. Read the timestamp from the routine's state file (e.g. `/workspace/<monitor>/state.json`) and write the new one at the end. Don't reprocess old windows.
2. **Search:** use the public X read tools. Load the `x-api-mcp-guide` skill once and stay inside the call budget the routine sets.
3. **Filter:** keep only what changes a decision or brings a concrete idea for his projects. Drop memes, repeats and anything already sent (check the log).
4. **Chat output:**
   - nothing relevant: **say nothing**;
   - a slow day: **one line**;
   - otherwise **at most 5 items**, each one: link + what it is + why it matters, in one sentence.
   - Counts only when they matter. No intro or closing paragraph.
5. **Full log:** the complete findings go to the routine's log file (e.g. `log.md`), not to chat.
6. Facts from posts are "according to the post". Don't present them as confirmed.
