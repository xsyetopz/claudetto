---
schema: dotclaude-spec/2
kind: package
id: P47
title: Agent Prompts
wave: 10
deps: ["P42"]
owns: ["the body of the agent files in src/plugins/dotclaude/slices/agents/agents/","the delegation text of src/plugins/dotclaude/slices/prompt/","tests/dotclaude/agents/prompts.test.ts","evidence/agent-prompts.md"]
satisfies: []
verify: just check, just lab, and one session in just sandbox for each agent with a task of its kind
agent: main session
status: planned
---

# P47 Agent Prompts

## Goal

The prompt of each agent follows the prompt guidance of Anthropic for its model, prevents the failures of `external/agent-failure-dossier/`, and uses XML tags in Markdown.

## Context

- The prompt guidance: `.claude/skills/claude-api/shared/model-migration.md`, the sections "Behavioral shifts (prompt-tunable)" of Opus 5.5, Sonnet 5.5, and Haiku 5.5, and `shared/prompt-audit.md`.
- Points of the guidance (reports 01 and 02):
  - Sonnet 5.5 at `low` and `medium` "sometimes checks in before the work is done", and one prompt line fixes it.
  - Sonnet 5.5 at `xhigh` and `max` may start its own review rounds.
  - Haiku 5.5 at `low` can skip a search, stop early, or skip a check.
  - Opus 5.5 can draw a conclusion from part of the evidence (report 11, F1).
- The failures: `external/agent-failure-dossier/00-INDEX.md` and its parts 01 to 08.
- The decisions of the user: `change.md`, decisions, 2026-10-13.

## Steps

1. Read the guidance and the dossier, and write the rules that apply to each agent, with the source of each rule, to `evidence/agent-prompts.md`.
2. Run the `prompt-audit` of the `claude-api` skill on the six agent files, and keep its report in the same evidence file.
3. Write each agent body again with XML tags in Markdown, in the style of the output style and the system prompt of dotclaude.
   - The `investigator` quotes only the numbers that a tool returned.
   - Each worker commits or writes its result before its report, so a stop loses no work.
4. Add to the delegation text of the root: when the same check of an `implementer` fails two times, send the work again with `model: opus`.

## Acceptance

- Each rule of the evidence file has a line in an agent body or a reason why it has none.
- `just check` passes, and one sandbox task of each kind gets a report that follows the body.

## Boundaries

- Do not change the model, the effort, or the tools of an agent, because P42 owns them.
