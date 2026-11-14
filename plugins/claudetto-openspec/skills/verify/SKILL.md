---
name: verify
description: Check that an implementation matches its OpenSpec change before archiving, and close each gap found. Use for "openspec verify" or "opsx verify".
---

The tool is `mcp__claudetto-openspec__openspec`.

1. `{action:"validate", change}` and `{action:"status", change}`. Note each validation issue and each unticked task.
2. For each requirement in `specs/<capability>/spec.md`, find the code or test that meets it and each scenario's WHEN/THEN. Name the file and line. A requirement with no match is a gap.
3. Read design.md and note each decision the code does not follow.
4. Cover every requirement of every spec in this session. Send the Grep calls for many requirements in one message, and Read only the lines around each hit with `offset` and `limit`, because each call returns a turn of context. Start no subagent, because each one rereads the change before it searches and costs more than the search it takes over.
5. Close each gap and each decision not followed. The spec is the contract: change the code to meet it. Change the spec instead, through the update skill, only where it states a fact the repository disproves, such as a file count or a name. Ask the user only to choose between two designs that the spec and design.md both allow.
6. Report what you found and what you changed: each gap with the spec's file:line, the code's file:line, and its fix, then the check that ran and its result.
