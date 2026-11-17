# Solution Strategy

## Rebuild Order

- [ ] **STR-001** claudetto shall be rebuilt top down: `plugin.json` and the hook entry, then hooks, scripts, statusline, rules, agents, output style, commands, and skills; then `claudetto-you-should-know`, the other plugins, `tools/`, and `tests/`.
  Acceptance: each layer lands before the layers under it. Verification: inspection.
  Basis: cited. Status: missing at 088a227c.
  Source: user decision, 2026-11-16 (old plan, What We Can Do).

## Handover Not Compaction

- [ ] **STR-002** claudetto shall let Claude Code's own compaction give way to a handover cycle that claudetto runs: write a handover, clear, resume, without breaking the user's `/clear`.
  Acceptance: a long session continues across a clear with the handover in its first request. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (`features/compaction/handoff.ts` forks a handoff on session age; no clear, resume, or `/clear` pass-through exists: `git grep -n -E "command\.run|prompt\.context" 088a227c -- plugins/claudetto/hooks/features/compaction` finds nothing).
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).
