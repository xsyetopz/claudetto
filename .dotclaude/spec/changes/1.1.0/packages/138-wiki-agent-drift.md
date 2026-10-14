---
schema: dotclaude-spec/2
kind: package
id: P138
title: Wiki drift on agent models and maxTurns
wave: 6
deps: ["P135","P149","P64","P158","P160"]
owns: ["wiki/evidence/Usage-Evidence.md","wiki/claude-code/Subagents.md","wiki/claude-code/Undocumented-Settings.md"]
satisfies: ["REQ-14"]
verify: bun run lint:md && just check
agent: implementer
status: planned
---

## Goal

The wiki gives the model, the effort, and the tools of each agent of 1.1.0, and it says that no agent sets `maxTurns`.

## Context

- `wiki/evidence/Usage-Evidence.md:28` gives `debugger` as `claude-sonnet-5-5` `high`.
- `wiki/claude-code/Subagents.md:71` says that dotclaude sets `maxTurns` in each agent file, `:75` has a table of `maxTurns`, and `:136` says each agent file sets `maxTurns`.
- D2: no agent has a `maxTurns`.
- The routes of P135 and the tools of P149.

## Steps

1. Change the agent table of `Usage-Evidence.md` to the front matter of the agent files.
2. In `Subagents.md`, say that no dotclaude agent sets `maxTurns`, with D2 as the reason, and remove the table of `:75` or mark each row as not set.
3. Search the wiki for each other line that gives a model, an effort, or a `maxTurns` of an agent, and fix it.
4. Add each undocumented override point from the evidence files of P64 and P158 to `wiki/claude-code/Undocumented-Settings.md`, with its name, its values, its default, its bundle offset, and whether dotclaude uses it.

## Acceptance

- `bun run lint:md` and `just check` pass.
- A search of `wiki/` finds no `maxTurns` value for a dotclaude agent.

## Boundaries

- Do not change `wiki/archive/`.
- Do not run `just wiki`, which P82 does after the user approves it.
