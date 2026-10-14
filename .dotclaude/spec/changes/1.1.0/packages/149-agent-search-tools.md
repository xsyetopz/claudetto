---
schema: dotclaude-spec/2
kind: package
id: P149
title: Agent search tools and the search-route fragment (I18)
wave: 5
deps: ["P135","P80"]
owns: ["the tools key of the agent files in src/plugins/dotclaude/slices/agents/agents/","src/fragments/search-route.md","tests/dotclaude/agents/search-tools.test.ts"]
satisfies: ["REQ-19"]
verify: just test tests/dotclaude/agents/search-tools.test.ts && just lab
agent: implementer
status: planned
---

## Goal

Each read-only agent that needs no shell gets the real `Grep` and `Glob`, and the search text of each agent names the tool that it has.

## Context

- `design.md`, "Search tools": a subagent gets `Grep` and `Glob` when its `tools` lists them and leaves out `Bash`.
- The tools today: `reviewer.md:4` and `investigator.md:4` list `Bash`, `Read`, `Grep`, and `Glob`.
- `src/fragments/search-route.md` tells six agents "Search with `Grep`", which is wrong when they have `Bash`.
- D12 decides whether `reviewer` keeps `Bash` (`reviewer.md:19`: it runs fast test, lint, or type-check commands).
- `investigator` and `researcher` keep `Bash` for `git` and `gh`.

## Steps

1. Apply D12 to `reviewer`.
   Give `searcher` `Grep`, `Glob`, and `Read`.
   For each other agent, keep `Bash` when the review of P83 shows it needs a shell.
2. Rewrite `search-route.md`: with `Grep`, use `Grep` and then `Read` with `offset` and `limit`.
   With `Bash` only, use `grep -n` and then `Read` with `offset` and `limit`.
   The shell `grep` skips git-ignored and binary files, and `command grep` finds them.
3. Run `just generate`.
4. Tests `search-tools.test.ts`: the `tools` of each agent file against one table in the test, and no agent that lists `Grep` and `Bash` and needs only one of them by the table.

## Acceptance

- The verify command passes.

## Boundaries

- Tests check the tool lists, not prose (REQ-17).
- Do not change the model or the effort, which P135 owns.
