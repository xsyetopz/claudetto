# Builtin Drift Repair

- [ ] **RT-040** claudetto shall write the builtin disable once in setup, and repair drift at session start by writing `false` and telling the user to run `/reload-plugins` or restart.
  Acceptance: see REQ-SETUP for the drift repair. Verification: test.
  Basis: user decision. Status: partial at 088a227c (`setup/settings.ts:65-70` lists the `cc-plugin-*@builtin` disables; the only `session.start` hook, `register.ts:115`, does no drift repair).
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).
