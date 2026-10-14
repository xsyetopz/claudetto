---
schema: dotclaude-spec/2
kind: package
id: P153
title: Prompt surface: output styles
wave: 4
deps: ["P97","P123","P157","P160"]
owns: ["src/plugins/dotclaude/slices/styles/styles/",".dotclaude/spec/changes/1.1.0/evidence/surface-styles.md"]
satisfies: ["REQ-4","REQ-23"]
verify: just test tests/dotclaude/styles && just lab
agent: implementer
status: planned
---

## Goal

Each output style of dotclaude follows the guidance of Anthropic, and a reply under `dotclaude:Concise` starts with the answer.

## Context

- The trigger: a reply of the main session under `dotclaude:Concise` opened with "You're right." (I06).
- `src/plugins/dotclaude/slices/styles/styles/*.md`.
- The override point `keep-coding-instructions` of an output style.
- The prompt-audit guide `.claude/skills/claude-api/shared/prompt-audit.md`, and `.claude/skills/claude-api/shared/model-migration.md`, read from disk.
- I14: `STYLE_MAX_BYTES` changes only after the user names the new value (SL 1213c32c).

## Steps

1. Run the prompt-audit flow on each style: an inventory with `file:line`, each dated pattern, each contradiction, and each outgrown instruction.
   Write it and a proposed diff to the evidence file.
2. Rewrite each style to `model-migration.md`, with the STE rules: start with the answer, no padding, and an agreement names its fact.
3. Set `keep-coding-instructions` on each style, and write the reason for its value.
4. Run the P157 cases with each style, and record the runs.

## Acceptance

- Each text of this package meets its budget of P160 (`tests/tools/context-budget.test.ts`).
- The verify command passes.
- The P157 opener cases pass with `dotclaude:Concise`.

## Boundaries

- Do not raise a bound of the slice; ask the user for a new value (REQ-16).
- No test asserts the words of a style (REQ-17).
