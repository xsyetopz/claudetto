# Prompt Text

## Echo Workarounds

- [x] **CC-001** Moved Out as OUT-2651: third-party report with no probe.

## Rules

- [x] **CC-002** Moved Out as OUT-2652: third-party report with no probe.

- [x] **CC-003** Moved Out as OUT-2653: third-party report with no probe.

- [x] **CC-004** Moved Out as OUT-2654: third-party report with no probe.

- [x] **CC-005** Moved Out as OUT-2655: third-party report with no probe.

- [ ] **CC-006** Each text a hook injects lands in the newest turn, so the cache prefix and preserved thinking hold: the `additionalContext` of a hook, and the Stop feedback, arrive with the event and continue the turn, not as an edit of earlier turns. The pin note is dropped with the constraint ledger, and the Stop block is dropped with ADR-0104 (the advisor tool stays disabled and there is no constraint ledger; user decision, recorded in the 2026-11-17 handover (day of decision not recorded)). The silent-turn reminder is a Claude Code setting that setup turns off (`groups.test.ts:121@088a227c`). `planModeText` has no baseline code (REQ-SETUP-042) and no Claude Code side in 2.1.327, so its landing is a build-time check on the engine's own plan-mode path.
  Basis: cited (clawdipedia extend/mod-api/types/classic/result-config-elicitation: `additionalContext` is text handed to the model with the event; extend/hooks/session-events: Stop `additionalContext` is feedback that continues the turn; read on 2.1.327). Status: partial at 088a227c (the silent-turn setting exists; no `planModeText`, no pin note in the plugin tree).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:328.
