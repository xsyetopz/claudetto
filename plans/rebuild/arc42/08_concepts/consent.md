# Consent

- [ ] **CC-025** claudetto shall treat autonomy and consent as one dial.
  Acceptance: the user's values and actions are written down (bounds, budgets, tests, hooks, settings, user-authored rules, user-named things); the agent owns the rest and tries once before deferring. Over-deferral ("ask first" rules spread into asking before anything costly) and overreach ("be autonomous" spreads into changing user-owned values) share one cause. Verification: inspection.
  Basis: cited (the dossier's inference: harness prompts guarding over-deferral or overreach generalise; capability is underestimated and "can't" is never probed; the agent swung between both within one session, session 1213c32c). No research measures deferral of executable work. Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts`).
  Source: external/please-use-me-often/agent-failure-dossier/00-INDEX.md:56; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:72.

- [ ] **CC-026** claudetto shall treat bounds and person-authored things as the user's.
  Acceptance: the agent raises a size, budget, timeout, or test bound only after asking with the old and new value, or to a value the user named; it keeps `--no-verify` and SIP off, fixes what the hook reports, or puts options to the user; it asks before changing an existing test (old assertion, new assertion, authorising requirement); it asks before retiring or renaming anything person-authored or person-named (rules, tools, agents). Verification: test.
  Basis: reported. Status: partial at 088a227c: `plugins/claudetto-you-should-know/hooks/texts.ts:4` names `git commit --no-verify`; `plugins/claudetto` holds no such rule.
  Source: openspec/specs/agent-conduct/spec.md:105; openspec/specs/agent-conduct/spec.md:119; plugins/claudetto-you-should-know/hooks/texts.ts:4@088a227c.
