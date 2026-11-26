---
status: accepted
date: 2026-11-16
---
# Trim the Mutation Rule Then Run Round 6

## Context and Problem Statement

Round 5 dev cost 2.3 times stock, mostly from the mutation rule. How should round 6 run?

## Considered Options

- Trim the mutation rule, then run.
- Run unchanged.
(Only the chosen option is recorded in the handoff.)

## Decision Outcome

Chosen: The user chose "Trim mutation rule, then run". The rule now reads: when the project has a mutation tool, run it on the lines the change touched; install none in a project without one.

## Consequences

Good: dev cost fell to 1.36 times stock. Bad: the round was paid, and benchmark rounds are now out of scope ([ADR-0087](0087-product-first-no-benchmarks.md)).

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1871 (handoff User's words); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (the 2.3 times figure); user answer through AskUserQuestion, 2026-11-16 16:10 UTC, trim the mutation rule (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1750).
