---
id: P45
deps: [P42, P43, P44, P47]
owns: ["src/wiki/dotclaude/Agent-Choices.md", "wiki/_Sidebar.md", "docs/research/agents-models/"]
verify: just check and bun run lint:md
agent: main session
---

# P45 Wiki: Agent Choices

## Goal

One wiki page gives each choice of 1.0.0 about the agents a short reason, and the alternatives that dotclaude did not take, with the reason for each.

## Context

- The decision of the user: `change.md`, decisions, 2026-10-13.
- The reports: `docs/research/agents-models/`.
  The page cites the external sources, and it does not copy the reports.

## Steps

1. Write the page: the roster, the models and efforts, no `maxTurns`, no nested agents, the resume mandate, and the advisor opt-in.
2. For each choice, give the alternatives, such as a high `maxTurns` of 150, Fable in a subagent, Sonnet for `debugger`, and a dotclaude advisor agent.
3. Link the page from `_Sidebar.md` and from the page about the agents.
4. Commit `docs/research/agents-models/`.

## Acceptance

- The page is in `_Sidebar.md`, and each link of it is valid.
- `just check` and `bun run lint:md` pass.

## Boundaries

- Do not copy the reports into the wiki.
  Cite the external sources.
