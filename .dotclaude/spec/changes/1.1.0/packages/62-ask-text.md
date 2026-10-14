---
schema: dotclaude-spec/2
kind: package
id: P62
title: Prompt surface: skill descriptions and bodies
wave: 4
deps: ["P91","P117","P94","P120","P100","P101","P102","P103","P104","P105","P106","P157","P160"]
owns: ["the skills folders of src/plugins/",".dotclaude/spec/changes/1.1.0/evidence/surface-skills.md"]
satisfies: ["REQ-3","REQ-23"]
verify: just validate && just lab && bun run lint:md
agent: implementer
status: planned
---

## Goal

The description and the body of each skill of each plugin follow the guidance of Anthropic, and each skill that asks the user names `AskUserQuestion`.

## Context

- The prompt-audit guide `.claude/skills/claude-api/shared/prompt-audit.md`, and `.claude/skills/claude-api/shared/model-migration.md`, read from disk.
- "Ask the user" in `spec/skills/archive/SKILL.md`, `spec/skills/merge/SKILL.md`, `spec/skills/implement/SKILL.md`, and `rules/skills/rules-creator/SKILL.md`.
- The spec skills set `disable-model-invocation: true`, and P147 owns that key (D10).
- A skill argument string replaces `$0`, `$1`, and the others in the skill body (Claude Code behavior, seen with `claude-api`).
- `.claude/rules/ste-messages.md`.

## Steps

1. List each `SKILL.md` under `src/plugins/`, and run the prompt-audit flow on each description and body: an inventory with `file:line`, each dated pattern, each contradiction, and each outgrown instruction.
   Write it and a proposed diff to the evidence file.
2. Rewrite each description so that it says when to use the skill, and each body to `model-migration.md`, with the STE rules.
3. Change each "ask the user" into "ask with `AskUserQuestion`", with the I13 rule: try first, and bundle the questions.
4. Find each `$` with a digit in a skill body that is not an argument, such as a price, and rewrite it so that the argument string does not replace it.
5. Run `just generate`.

## Acceptance

- Each text of this package meets its budget of P160 (`tests/tools/context-budget.test.ts`).
- The verify command passes.
- Each skill has a line in the evidence file.

## Boundaries

- Do not change the `disable-model-invocation` key, which P147 owns.
- Do not change the new `/diagnose` skill, which P67 writes in the same wave to the same guidance.
- No test asserts the words of a skill (REQ-17).
