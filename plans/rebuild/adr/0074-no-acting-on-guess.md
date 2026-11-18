---
status: accepted
date: 2026-11-16
---
# Never Guess and Never Act on a Guess

## Context and Problem Statement

The agent split the plan into files from a guess about the user's complaints. The user named both guessing and acting on a guess severe violations.

## Considered Options

- Act on the likeliest reading.
- Ask through AskUserQuestion and do nothing else until the user answers.

## Decision Outcome

Chosen: ask through AskUserQuestion; touch no file until the answer.

## Consequences

Overnight goals that say decide and continue conflict with this; this rule wins.

Source: user decision, 2026-11-16 21:07 UTC, no acting on a guess (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8749).
