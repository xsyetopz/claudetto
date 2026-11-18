# Solution Strategy

## Rebuild Order

- [ ] **STR-001** claudetto shall be rebuilt top down: `plugin.json` and the hook entry, then hooks, scripts, statusline, rules, agents, output style, commands, and skills; then `claudetto-you-should-know`, the other plugins, `tools/`, and `tests/`.
  Acceptance: each layer lands before the layers under it. Verification: inspection.
  Basis: cited. Status: missing at 088a227c.
  Source: user decision, 2026-11-16 (old plan, What We Can Do).

## Handover Not Compaction

- [ ] **STR-002** claudetto shall keep Claude Code's compaction call and its cached prefix, replace the core summary with the handover text through the `session.compact` hook, and renew the session only at a task boundary above break-even ([ADR-0178](../adr/0178-renewal-at-task-boundaries.md)), without breaking the user's `/clear`.
  Acceptance: after a compaction the first request holds the handover text; a renewal happens only at a boundary signal above the threshold of RT-027; a user-typed `/clear` writes a handover first. Verification: demonstration.
  Basis: user decision; revised 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:272). Status: partial at 088a227c (`features/compaction/handoff.ts` forks a handoff on session age; no clear, resume, or `/clear` pass-through exists: `git grep -n -E "command\.run|prompt\.context" 088a227c -- plugins/claudetto/hooks/features/compaction` finds nothing).
  Source: user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369).
