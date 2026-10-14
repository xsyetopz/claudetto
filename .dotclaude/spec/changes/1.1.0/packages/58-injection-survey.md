---
schema: dotclaude-spec/2
kind: package
id: P58
title: Survey of instruction text in tool results
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/injected-instructions.md"]
satisfies: ["REQ-10","REQ-18"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/injected-instructions.md && bun run lint:md
agent: researcher
status: planned
---

## Goal

The evidence file names each file under `external/` and each transcript under `~/.claude/projects/` that put instruction-shaped text into a tool result, with its source and a count that a tested counter gives.

## Context

- `design.md`, "Instruction text in tool results": one source is `reportNote` of the `handoff` slice.
- The structured field `hook_additional_context` of a transcript row holds the text that a hook adds.
  The engine shows it with the prefix `tool.call hook additional context:`.
- The I10 row of `external/agent-failure-dossier/00-INDEX.md` and its section in `03-safety-and-trust-boundaries.md`.
- D6 is decided: origin tags and role-aware text only, so the survey informs P57.
- `external/` holds `export-*.jsonl` files, and a run reads them by search only.

## Steps

1. Read the `hook_additional_context` field and the `tool_result` blocks of the transcripts, and the files of `external/`.
   Look for instruction-shaped text: "commit", "words or fewer", "ignore", "you must", "IMPORTANT", "do not tell", and an imperative to the model.
2. Give the counter one known-good and one known-bad row, and show that it counts each one right before the full run.
3. For each hit, record the file, the line, and the source: a dotclaude hook, another plugin, a file in the repository, a web page, or a command output.
4. Count the hits by source, and name each dotclaude text that P57 must also tag.
5. Write the method, the commands, the fixture check, and the counts.

## Acceptance

- The evidence file has the method, the fixture check, the commands, and the counts.
- `bun run lint:md` passes.

## Boundaries

- Read only.
- Do not quote a secret or a token from a transcript.
- A search that fails or is denied is not a count of zero: record it as unknown.
