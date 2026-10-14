---
schema: dotclaude-spec/2
kind: package
id: P135
title: Model routes of D11 and the searcher agent
wave: 3
deps: ["P83","P109","P136"]
owns: ["the model and effort keys of the agent files in src/plugins/dotclaude/slices/agents/agents/","src/plugins/dotclaude/slices/agents/agents/searcher.md","tests/dotclaude/agents/routes.test.ts",".dotclaude/spec/changes/1.1.0/evidence/routes.md"]
satisfies: ["REQ-14"]
verify: just test tests/dotclaude/agents/routes.test.ts && just validate && just lab
agent: implementer
status: planned
---

## Goal

Each shipped agent has the model and the effort of D11, and a new read-only `searcher` agent does pure file search on Haiku 5.5 at `high`.

## Context

- D11 and the table: `design.md`, "Model routes".
- The arm that P136 picks for `investigator` and `researcher`: `evidence/routing-arms.md`.
- The front matter: `agents/agents/*.md:4-7`, such as `model: claude-sonnet-5-5` and `effort: medium` in `implementer.md:5-6`.
- `CLAUDE_CODE_SUBAGENT_MODEL: "claude-sonnet-5-5"` at `prompt/slice.ts:63`.
- The tools of a read-only agent: `investigator.md:4-5`.

## Steps

1. Set `model` and `effort` of each agent file to the table of D11.
   For `investigator` and `researcher`, use the arm of P136 when it differs, and write the reason in the evidence file.
2. Add `searcher.md`: read-only, `model: claude-haiku-5-5`, `effort: high`, and a body for pure file search that gives paths and line numbers only.
   Its `tools` are `Grep`, `Glob`, and `Read`, with no `Bash`, so that it gets the real `Grep` (`design.md`, "Search tools").
3. Find which agents `CLAUDE_CODE_SUBAGENT_MODEL` reaches, and write the answer in the evidence file.
4. Test `routes.test.ts`: the model and the effort of each agent file against one table in the test, and no agent on `claude-sonnet-5-5`.

## Acceptance

- The verify command passes.
- The evidence file names the route of each agent and its source.

## Boundaries

- Do not change the bodies, which P80 owns, or the `tools` of other agents, which P149 owns.
- Do not change the env block of `prompt/slice.ts`.
- Do not add `maxTurns` (D2).
