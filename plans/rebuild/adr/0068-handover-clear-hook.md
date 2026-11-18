---
status: accepted
date: 2026-11-16
---
# Handover through a command.run Clear Hook

## Context and Problem Statement

A typed `/clear` loses the work. A handover written before the clear must survive it and reach the first request after it.

Transcript record tx-x02/clear-fork-failure-extract-fallback: The user was asked what to do when the fork before /clear fails (nothing-to-fork, an API error).

Transcript record tx-x02/manual-clear-writes-handover: The user wants the user's own /clear kept, with a handover made before it runs, or the session forgets.

## Considered Options

- A `command.run` hook on `{command:'clear'}` that writes the handover with `$.model.fork`, stores it in `$.store`, returns `next(e)`, and a `prompt.context` block that injects it.
- Read `$.session.messages()` instead of forking (zero model cost; the fallback writer).
- Skip the handover.
- Inject a zero-cost extract from $.session.messages().
- Retry the fork.
- Replace /clear with a compact.
- Hook the clear: a command.run hook on clear writes the handover, then calls next(e).

## Decision Outcome

Chosen: the hook with a fork writer and the messages extract as fallback. The clear runs unchanged after the write, and no extra request follows the clear (probe A).

## Consequences

- The clear waits on the fork (2.4 s on Haiku 5.5).
- `prompt.context` fires again after a compaction and re-sends its blocks, so blocks stay small.

Transcript record tx-x02/clear-fork-failure-extract-fallback decided: the extract fallback. A clear never goes without a handover.

Transcript record tx-x02/manual-clear-writes-handover decided: the hook. A prompt.context block injects the handover into the first message after the clear. The hook skips clears whose origin is plugin. Replacing /clear is ruled out by the user's word. The handover costs one fork, or none with the extract fallback.

Source: handover probe A, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); handover probe B, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); handover probe E, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); user decision, 2026-11-16; user decision, 2026-11-16 19:00 UTC, handover mimics the compaction settings; a manual /clear gets a handover first (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6412).
