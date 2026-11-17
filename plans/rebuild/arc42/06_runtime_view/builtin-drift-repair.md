# Builtin Drift Repair

- [ ] **RT-040** claudetto shall write the builtin disable once in setup, and repair drift at session start by writing `false` and telling the user to run `/reload-plugins` or restart.
  Acceptance: see REQ-SETUP for the drift repair. Verification: test.
  Basis: user decision. Status: partial at 088a227c (`setup/settings.ts:65-70` lists the `cc-plugin-*@builtin` disables; the only `session.start` hook, `register.ts:115`, does no drift repair).
  Source: user answer through AskUserQuestion, 2026-11-16 18:04 UTC, all 14 builtins off, perl allowed with a diff hook, settings rewritten (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5034); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).
