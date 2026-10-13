---
schema: dotclaude-spec/2
kind: package
id: P52
title: Spec Store Docs
wave: 9
deps: ["P51"]
owns: ["wiki/dotclaude/Spec-Store.md","wiki/dotclaude/Skills.md","wiki/dotclaude/Architecture.md","wiki/Quickstart.md","wiki/claude-code/Subagents.md","wiki/development/Development.md","wiki/rationale/Decisions-Architecture.md","wiki/rationale/Design.md","src/wiki/dotclaude/Architecture.md","src/wiki/reference/Bounds.md","wiki/Attributions.md","README.md","CHANGELOG.md"]
satisfies: []
verify: just check && bun run lint:md
agent: main session
status: planned
---

## Goal

The wiki tells a reader the files, the IDs, the states, the gates, and the commands of schema 2, and gives the source of each choice.

## Context

- The design: `design-spec.md`.
- The research: `docs/research/spec-driven/01-sdd-sources.md`, and the sources on the wiki page `Attributions`.

## Steps

1. Rewrite `Spec-Store.md` for schema 2, and split it into linked pages when it is over 300 lines.
2. Give each choice its source, and name the alternatives that dotclaude did not take, such as a separate `tasks` phase.
3. Update the skill list of `Architecture.md`, the bounds, the README, and the CHANGELOG.
4. Change the column of the research table on `Attributions` from what the plan takes to what dotclaude uses.

## Acceptance

- `just check` and `bun run lint:md` pass, and no page names a removed command or the lanes of schema 1.

## Boundaries

- Do not copy text from the sources.
