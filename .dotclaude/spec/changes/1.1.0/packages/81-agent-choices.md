---
schema: dotclaude-spec/2
kind: package
id: P81
title: Wiki: agent choices (moved from 1.0.0 P45)
wave: 6
deps: ["P79","P80"]
owns: ["src/wiki/dotclaude/Agent-Choices.md","wiki/_Sidebar.md","docs/research/agents-models/"]
satisfies: ["REQ-11"]
verify: just check && bun run lint:md
agent: main session
status: planned
---

## Goal

One wiki page gives each agent choice of dotclaude a short reason, and each alternative that dotclaude did not take, with its reason.

## Context

- The brief of 1.0.0: `.dotclaude/spec/changes/1.0.0/packages/45-wiki-choices.md`.
- The reports: `docs/research/agents-models/`.
- The results of P71, P79, and P80.

## Steps

1. Write the page: the roster, the models and efforts, the turn budget of D2, no nested agents, the resume mandate, and the advisor opt-in.
2. Give the alternatives of each choice, with their reasons.
3. Link the page from `_Sidebar.md` and from the page about the agents.
4. Commit `docs/research/agents-models/`.

## Acceptance

- `just check` and `bun run lint:md` pass, and each link is valid.

## Boundaries

- Cite the external sources, and do not copy the reports.
