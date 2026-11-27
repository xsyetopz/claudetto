---
status: accepted
date: 2026-11-16
---
# No Constraint Ledger

## Context and Problem Statement

The standing-constraint ledger measured well but the user decided it stays out.

A constraint ledger gate denied calls against recorded constraints. It denied work the user had asked for: 132 denials in three days of sessions, eight recorded as false.

The ledger made a model call on every prompt and denied tool calls on a model's reading of old messages. Does claudetto keep a constraint ledger?

The ledger cost a model call per prompt and denied tool calls on a model's reading of old messages. A correction still has to survive a compaction.

Transcript record tx-x02/no-constraint-ledger: One old spec kept a constraint ledger; another removed it.

## Considered Options

- Ledger (see [ADR-0133](0133-constraint-ledger.md)).
- No ledger; the permission dialog and judge calls cover it.
- Keep the ledger.
- Delete it with its classifier question and its tests.
- Keep the per-prompt ledger with runtime enforcement.
- Remove it; keep the compaction keep text as a classic `PreCompact` hook text.
- A classic `PreCompact` command hook that prints one keep line (`PIN_COMPACT_KEEP`).
- Drop it.

## Decision Outcome

Chosen: no ledger (user decision: no constraint ledger).

Same decision, other record: dropped (user decision, 2026-11-16; the spec records the user's choice on 2026-11-12).

Same decision, other record: remove the ledger. `useConstraintPin` and `useAskFix` go; `PIN_COMPACT_KEEP` becomes a classic `PreCompact` hook text. Removed with it: constraints from the user's words, the ledger riding prompts, runtime enforcement, the no-questions hold on ask tools, each-constraint-quotes, and the resumed-session ledger wait. This supersedes every D321 ledger Keep.

Same decision, other record: the `PreCompact` keep line. No model call, no read of earlier messages.

## Consequences

Drift across turns and compaction is accepted; handover keeps corrections instead.

No constraint ledger ships.

- No constraint ledger exists in `plugins/` at 088a227c.
- A constraint survives compaction only through the `PreCompact` text.
- Good: no per-prompt cost and no denial from a model's reading.
- Bad: no stored constraint list; only the keep line and the compaction instruction carry corrections.

## Confirmation

No ledger feature in the target block list.

Transcript record tx-x02/no-constraint-ledger decided: drop it.

Source: user decision, undated in the audit brief; user decision, 2026-11-16 (User Answers); openspec/changes/archive/2026-11-13-feat-2-1-321/specs/constraint-ledger/spec.md:99 at 088a227c^; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:424 at 088a227c^; openspec/changes/archive/2026-11-16-2-1-323/design.md:129-133 (decision 7); openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:109-110,122; openspec/changes/archive/2026-11-16-2-1-323/design.md:131; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352.
