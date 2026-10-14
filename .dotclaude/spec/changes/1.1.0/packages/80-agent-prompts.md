---
schema: dotclaude-spec/2
kind: package
id: P80
title: Prompt surface: agent prompts and descriptions (moved from 1.0.0 P47, I07)
wave: 4
deps: ["P57","P83","P109","P135","P157","P160"]
owns: ["the body and description of the agent files in src/plugins/dotclaude/slices/agents/agents/","src/fragments/shared-tree.md",".dotclaude/spec/changes/1.1.0/evidence/agent-prompts.md"]
satisfies: ["REQ-4","REQ-9","REQ-11","REQ-23"]
verify: just check && just lab, and one sandbox task for each agent
agent: main session
status: planned
---

## Goal

The body and the description of each agent follow the guidance of Anthropic for its model and the dossier, and each agent that runs `git` has the shared-tree rules.

## Context

- The brief of 1.0.0: `.dotclaude/spec/changes/1.0.0/packages/47-agent-prompts.md`.
- The prompt-audit guide `.claude/skills/claude-api/shared/prompt-audit.md`, and `.claude/skills/claude-api/shared/model-migration.md`, read from disk.
- The agent bodies already have XML tags, such as 14 tag lines in `reviewer.md`.
- The shared-tree git rules are only in `debugger.md` (I07).
  The deny of `git stash`, `git checkout --`, `git reset --hard`, and `git clean` in subagents is in P148.
- The note of P57 now says "save", so the bodies use the same word.
- The session `d87f7ed2`: an agent wrote its own `check.ts`, printed "plan gate: PASS", and reported it as the gate.
- Subagent overrides by name, such as `Explore`, are a documented override point.

## Steps

1. Run the prompt-audit flow on each agent file: an inventory with `file:line`, each dated pattern, each contradiction, and each outgrown instruction.
   Write it, with the rules and their sources, to the evidence file.
2. Do steps 1 to 4 of the brief of 1.0.0, and rewrite each body and description to `model-migration.md`, with the STE rules.
3. Start each report with the answer, with no padding, and name the fact behind each agreement (I06).
4. Add the rule: never report a substitute check as the real check, and name the command that ran.
5. Move the shared-tree git rules of `debugger.md` into `src/fragments/shared-tree.md`, and include it in each agent that can run `git`.
6. Decide for `Explore` and the other built-in agents whether an override by name helps, and record it.

## Acceptance

- Each text of this package meets its budget of P160 (`tests/tools/context-budget.test.ts`).
- Each rule of the evidence file has a line in a body or a reason for none.
- `just check` and `just lab` pass, and each sandbox task gets a report that follows its body.

## Boundaries

- Keep the model, effort, tools, and `isolation` of each agent, which P135, P148, and P149 own.
- Do not add `maxTurns` (D2).
- Do not change the prompt texts, which P64 owns.
- No test asserts the words of an agent file (REQ-17).
