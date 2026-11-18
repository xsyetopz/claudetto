# User Rules

- [x] **CON-011** Moved Out as OUT-2544: plugins/claudetto-you-should-know still holds hyphenated names (session-rows, view-actions, view-row, propose-text, card-draw.test) and some are files the user holds uncommitted.

- [ ] **CON-012** claudetto shall use the dossier `external/please-use-me-often/` as the spec for the rebuild.
  Acceptance: each rebuild item names a dossier or other source line. Verification: inspection.
  Basis: cited. Status: missing at 088a227c.
  Source: user decision, 2026-11-16 (old plan, What We Can Do); external/please-use-me-often/.

- [ ] **CON-013** claudetto keeps every feature the user chose and cuts code, overhead, latency, and tokens; small in code does not mean fewer features. A removal needs a measured reason or a user decision.
  Acceptance: a feature list before and after a rebuild shows no loss; after a cleanup, every feature of the start state still has a test or probe, and the code size does not grow past the start size (13,373 lines at the cleanup end against 13,389 at the base and 13,740 at the peak). Verification: inspection.
  Basis: reported. Status: have.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10891); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, User's Words); the same words repeat at :8215; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (code size 13,373 lines, base 13,389, peak 13,740).

- [ ] **CON-014** claudetto rebuilds from a clean slate for Claude Code 2.1.327 (the 2026-11-14 decision named 2.1.325; the target moved to 2.1.326 on 2026-11-16 and to 2.1.327 on 2026-11-18): no engineering around the current code or its architecture; the agent fixes the code or architecture itself.
  Acceptance: no replaced path survives with its tests, settings, or docs; a fix touches the faulty code and the diff holds no wrapper or bypass of it. Verification: inspection.
  Basis: reported. Status: have.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10928); user decision, 2026-11-16 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:10743`); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, User's Words); user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7).

- [x] **CON-015** The root agent stays opus-5-5[medium].
  Acceptance: root model reads opus-5-5[medium]. Verification: inspection.
  Basis: reported. Status: have.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, User's Words); the goal line repeats at :8215.
  Verified: plugins/claudetto/hooks/settings/defaults.ts sets no root model, only CLAUDE_CODE_SUBAGENT_MODEL (2.1.327, 2026-11-19).

- [ ] **CON-016** A count or list that a source already defines is computed from that source, not written by hand.
  Basis: reported, user. Status: missing at 088a227c.
  Source: reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:719`).

- [ ] **CON-017** Each identifier in code is a headlinese noun phrase.
  Basis: reported, user. Status: have at 088a227c (plugins/claudetto/rules/useHeadlineseNames.md@088a227c).
  Source: reported, user, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/05884638-c1a2-4b41-83af-50464f374189.jsonl:17`).

- [x] **CON-018** claudetto shall not hard-bake Bun rules into its hooks.
  Basis: reported, user rule, 2026-11-13. Status: missing at 088a227c: `git grep` of the baseline hooks finds Bun hard-coded in `plugins/claudetto/hooks/features/setup/settings.ts:27-45` (the statusline command runs `bun --no-env-file`), `key.ts:24` (the Context7 use text is `bunx ctx7`) and `starter-families.ts:49` (`bun test --bail --dots`); `hold.ts` holds `bunx` only in its tests.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13.
  Verified: grep -rniw bun over plugins/ non-test sources -> 0 hits (2.1.327, 2026-11-19).

- [ ] **CON-019** No plan or repo file shall quote the user verbatim.
  Acceptance: a search for the user's quoted phrases in the repo finds none. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (`git grep -n -i verbatim 088a227c -- AGENTS.md CLAUDE.md docs` finds no such rule).
  Source: user decision, 2026-11-16 17:42 UTC, no verbatim user quotes (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4177).

- [ ] **CON-020** Each fact in the plan shall be verified against `claude` 2.1.327.
  Acceptance: each fact names its probe or build search. Verification: inspection.
  Basis: user decision. Status: unchecked: the plan files are not in the 088a227c tree.
  Source: user decision, 2026-11-16 22:33 UTC, 2.1.326 replaces 2.1.325 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:10743); user decision, 2026-11-18, 2.1.327 replaces 2.1.326 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7).
  Conflicts with: none; 2.1.327 replaces the earlier 2.1.325 and 2.1.326 targets (user decisions, 2026-11-16 and 2026-11-18).

- [ ] **CON-021** The plan shall attribute every external and internal source and hold no ambiguity.
  Acceptance: each item has a Source line. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (`git ls-tree --name-only 088a227c plans` prints nothing: no plan file exists).
  Source: user decision, 2026-11-16 21:15 UTC, attribute every external and internal source (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9002).
