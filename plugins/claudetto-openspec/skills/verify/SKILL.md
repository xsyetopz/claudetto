---
name: verify
description: Check that an implementation matches its OpenSpec change before archiving. Use for "openspec verify" or "opsx verify".
---

The tool is `mcp__claudetto-openspec__openspec`.

1. `{action:"validate", change}` and `{action:"status", change}`. Report each validation issue and each unticked task.
2. For each requirement in `specs/<capability>/spec.md`, find the code or test that meets it and each scenario's WHEN/THEN. Name the file and line. A requirement with no match is a gap.
3. Read design.md and note each decision the code does not follow.
4. Report three lists: critical (a missing requirement, an unticked task, a validation error), warnings (a decision not followed), notes. Each item names the artifact and the file. Edit nothing.
