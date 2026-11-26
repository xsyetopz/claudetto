---
status: accepted
date: 2026-11-14
---
# Paid Runs Approved without a Budget Figure

## Context and Problem Statement

Task 10.3 is a paid A/B run of per-model prompts. The agent kept asking the user for a budget figure and for approval.

Exact token counts and paid plan-mode runs cost money. Did the user require approval or a cap per run?

A new session continued the plans, and paid probe runs needed approval.

The agent listed four open decisions: the "Approved by the User" rule, the popup rewording, a spec or deletion for the SessionStart renice hook and the UserPromptSubmit setup block, and the paid handover probe (`--paid B35`, estimated at $2 to $3).

## Considered Options

- Ask the user for a cap before each paid run.
- Run the paid eval on the agent's own judgement, and report cost and weekly share afterwards.
- Ask before each paid run, with a dollar cap.
- Run without asking and without a cap.
- Approve paid runs when done cheaply
- Ask before each paid run
- Allow no paid run
- Approve each
- Decline each
- Ask for an explanation first

## Decision Outcome

The user gave no budget figure and told the agent to proceed. The agent runs the paid eval and reports actual cost and weekly share. Supersedes [ADR-0039](0039-paid-eval-cap-approved.md).

Chosen (2026-11-05): exact token counts and paid plan-mode runs are approved with no dollar cap; run them. The same answer told the agent to stop asking for what it can do itself.

The user approved paid runs on the condition that they are done on the cheap. This supersedes no earlier rule in this chunk.

The user approved the paid handover probe `--paid B35` and the popup rewording, and asked for an explanation of the rule and of the renice hook and setup block, so those two stay open.

Conflict: [ADR-0105](0105-no-weekly-limit-fixed-goal.md) (proposed, dated 2026-11-16 by its handoff) keeps a paid run behind the user's word first; no date orders the two.

## Consequences

The agent no longer waits on a figure. Spend is visible only after the run.

An approval rule in a plugin prompt for in-scope, reversible, or budgeted work causes the ask-instead-of-act failure (see the friction risks).

The agent runs a paid probe without a new ask if it is cheap; a costly run still needs a price check.

The probe runs with a paid login in a terminal; two decisions wait for the agent's explanation.

Source: user decision, 2026-11-14; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:25116; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2250; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2254; user decision, 2026-11-05; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/af16e315-dba7-4cce-89fc-1a2c14776540.jsonl:9, reported, user, 2026-11-09 (user decision, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:927, reported, user, 2026-11-09 (user decision, 2026-11-09).
