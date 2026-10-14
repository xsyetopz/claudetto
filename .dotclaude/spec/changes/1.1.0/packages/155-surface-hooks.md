---
schema: dotclaude-spec/2
kind: package
id: P155
title: Prompt surface: hook texts and fragments
wave: 6
deps: ["P57","P70","P76","P80","P142","P148","P149","P160"]
owns: ["the hook texts of the slices in src/plugins/","the fragments in src/fragments/ other than search-route.md and shared-tree.md",".dotclaude/spec/changes/1.1.0/evidence/surface-hooks.md"]
satisfies: ["REQ-23"]
verify: just test && just lab
agent: implementer
status: planned
---

## Goal

Each text that a hook gives Claude, as `additionalContext`, a deny reason, or a `systemMessage`, and each fragment follow the guidance of Anthropic and name their source.

## Context

- The prompt-audit guide `.claude/skills/claude-api/shared/prompt-audit.md`, and `.claude/skills/claude-api/shared/model-migration.md`, read from disk.
- The hook `additionalContext` cap of 10,000 characters for each string, `PreToolUse` `updatedInput`, and `PostToolUse` `updatedToolOutput`.
- REQ-10: each text names its source and fits the role of the agent.
- The texts of the 1.1.0 hooks: P57, P70, P76, P142, and P148.
- `src/fragments/`, with `report-size.md`, `evidence-line.md`, `read-from-project.md`, and `usage-figures.md`.

## Steps

1. List each hook text of each plugin with `file:line`, and run the prompt-audit flow on each one and on each fragment.
   Write it and a proposed diff to the evidence file.
2. Rewrite each text to `model-migration.md` and `.claude/rules/ste-messages.md`, and start each hook text with its source.
3. Where a text tells Claude to change a tool input or output, check whether `updatedInput` or `updatedToolOutput` does the work without a model turn, and record each choice.
4. Run `just generate`.

## Acceptance

- Each text of this package meets its budget of P160 (`tests/tools/context-budget.test.ts`).
- The verify command passes.
- Each text has a line in the evidence file.

## Boundaries

- Change the words only, not the decisions of a hook.
- Do not change `search-route.md` (P149) or `shared-tree.md` (P80).
- No test asserts the words of a hook text (REQ-17).
