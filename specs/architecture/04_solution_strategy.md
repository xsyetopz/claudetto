# Solution Strategy

## Rebuild Order

- [x] **STR-001** Moved Out as OUT-2545: describes a part that plugins/ does not ship: a build-order rule for the rebuild work.

## Handover Not Compaction

- [x] **STR-002** claudetto shall keep Claude Code's compaction call and its cached prefix, replace the core summary with the handover text through the `session.compact` hook, and renew the session only at a task boundary above break-even ([ADR-0178](../adr/0178-renewal-at-task-boundaries.md)), without breaking the user's `/clear`.
  Acceptance: after a compaction the first request holds the handover text; a renewal happens only at a boundary signal above the threshold of RT-027; a user-typed `/clear` writes a handover first. Verification: demonstration.
  Basis: user decision; revised 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:272). Status: partial at 088a227c (`features/compaction/handoff.ts` forks a handoff on session age; no clear, resume, or `/clear` pass-through exists: `git grep -n -E "command\.run|prompt\.context" 088a227c -- plugins/claudetto/hooks/features/compaction` finds nothing).
  Source: user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369).
  Verified: claude plugin test plugins/claudetto -> 54 pass; compact.ts answers session.compact with the handover, renewal.ts renews at a task boundary above a threshold (2.1.327, 2026-11-19).
  Verified: re-run on claude 2.1.327, 2026-11-19: inspection: ADR plans/rebuild/adr/0178-renewal-at-task-boundaries.md exists (rejects forced clock clear, keeps user /clear); plugins/claudetto/hooks/handover/{compact.ts,renewal.ts} + compact.test.ts/renewal.test.ts reference session.compact (not executed)
