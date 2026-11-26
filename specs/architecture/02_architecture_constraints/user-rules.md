# User Rules

- [x] **CON-011** Moved Out as OUT-2544: plugins/claudetto-you-should-know still holds hyphenated names (session-rows, view-actions, view-row, propose-text, card-draw.test) and some are files the user holds uncommitted.

- [x] **CON-012** Moved Out as OUT-2704: governs how the rebuild agent works or writes the plan; no shipped part of plugins/ carries it, so no check on plugins/ ticks it, and the goal still binds the work to it.

- [x] **CON-013** Moved Out as OUT-2705: governs how the rebuild agent works or writes the plan; no shipped part of plugins/ carries it, so no check on plugins/ ticks it, and the goal still binds the work to it.

- [x] **CON-014** Moved Out as OUT-2706: governs how the rebuild agent works or writes the plan; no shipped part of plugins/ carries it, so no check on plugins/ ticks it, and the goal still binds the work to it.

- [x] **CON-015** The root agent stays opus-5-5[medium].
  Acceptance: root model reads opus-5-5[medium]. Verification: inspection.
  Basis: reported. Status: have.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, User's Words); the goal line repeats at :8215.
  Verified: plugins/claudetto/hooks/settings/defaults.ts sets no root model, only CLAUDE_CODE_SUBAGENT_MODEL (2.1.327, 2026-11-19).
  Verified: 2026-11-24, claude 2.1.329, `grep -n -i model plugins/claudetto/hooks/settings/defaults.ts`: only CLAUDE_CODE_SUBAGENT_MODEL (line 45) and a comment (line 44); no root model key.

- [x] **CON-016** Moved Out as OUT-2707: governs how the rebuild agent works or writes the plan; no shipped part of plugins/ carries it, so no check on plugins/ ticks it, and the goal still binds the work to it.

- [x] **CON-017** Moved Out as OUT-2708: governs how the rebuild agent works or writes the plan; no shipped part of plugins/ carries it, so no check on plugins/ ticks it, and the goal still binds the work to it.

- [x] **CON-018** claudetto shall not hard-bake Bun rules into its hooks.
  Basis: reported, user rule, 2026-11-13. Status: missing at 088a227c: `git grep` of the baseline hooks finds Bun hard-coded in `plugins/claudetto/hooks/features/setup/settings.ts:27-45` (the statusline command runs `bun --no-env-file`), `key.ts:24` (the Context7 use text is `bunx ctx7`) and `starter-families.ts:49` (`bun test --bail --dots`); `hold.ts` holds `bunx` only in its tests.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13.
  Verified: grep -rniw bun over plugins/ non-test sources -> 0 hits (2.1.327, 2026-11-19).
  Verified: grep -rniw bun plugins (non-test), 2026-11-19: 4 hits, none a Bun rule. README.md:53 and hooks/guards/shell/commit.ts:6,9 use bun test as an example of a piped test command; hooks/guards/wall/rules.ts:77 lists ~/.bun/bin among the PATH folders in sandbox denyWrite, which protects the folder without requiring Bun. Supersedes the earlier 0-hit line.
  Evidence: 2026-11-24, claude 2.1.329, `grep -rniw bun plugins --exclude-dir=__tests__ --exclude-dir=evals --exclude-dir=types`: 6 hits, not 4: README.md:56, hooks/guards/redact/redact.ts:16 (a timing comment), hooks/guards/wall/rules.ts:208 (~/.bun/bin), hooks/guards/shell/notes.ts:27 (bun in a list of runners), hooks/guards/shell/commit.ts:6 and :9; none is a Bun-specific rule.
  Verified: 2026-11-24, claude 2.1.329, `grep -rniw bun plugins --exclude-dir=__tests__ --exclude-dir=evals --exclude-dir=types` -> 6 hits, none a Bun rule: README.md:56, hooks/guards/shell/commit.ts:6 and :9 (comment examples), hooks/guards/shell/notes.ts:27 (runner list), hooks/guards/wall/rules.ts:208 (~/.bun/bin), hooks/guards/redact/redact.ts:16 (timing comment).

- [x] **CON-019** Moved Out as OUT-2709: governs how the rebuild agent works or writes the plan; no shipped part of plugins/ carries it, so no check on plugins/ ticks it, and the goal still binds the work to it.

- [x] **CON-020** Moved Out as OUT-2710: governs how the rebuild agent works or writes the plan; no shipped part of plugins/ carries it, so no check on plugins/ ticks it, and the goal still binds the work to it.

- [x] **CON-021** Moved Out as OUT-2711: governs how the rebuild agent works or writes the plan; no shipped part of plugins/ carries it, so no check on plugins/ ticks it, and the goal still binds the work to it.
