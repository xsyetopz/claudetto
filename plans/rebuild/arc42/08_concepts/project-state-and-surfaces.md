# Project State And Surfaces

- [ ] **CC-066** claudetto shall treat project state as read where the agent reads it, derived by script where possible. When a rules file contradicts observable state, the agent stops the affected step, reports with evidence, proposes corrected wording and continues unaffected work (changelog `[Unreleased]` example); a rule added atop a wrong rule does not help. Precedence list: the higher wins.
  Basis: reported. Status: partial at 088a227c (root prompt).
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:102; external/please-use-me-often/agent-terms/TERMS-AND-CONDITIONS.md:80.

- [ ] **CC-067** claudetto shall set the settings route rule: the plugin root `settings.json` applies only `agent` and `subagentStatusLine`; a `settings.read` hook changes only `disableBundledSkills`, `outputStyle` (tier keys) and sandbox `enabled`/`allowUnsandboxedCommands`; `model`, `effortLevel`, `permissions`, `env`, `enabledPlugins` and sandbox filesystem and network go through a setup write to user settings, applied at the next start. `subagentStatusLine` goes to plugin settings.json; otherwise setup writes and tells the user to restart, because a hook route silently does nothing for most keys. In 2.1.326 some worktree sessions skip some plugin settings and show a notice that names what was skipped.
  Basis: measured 2.1.319. Status: have at 088a227c (hooks/features/surface). Claude 2.1.326: the `settings.read` mod event is present (chunk-qg227pzf.js@3643); the key list was measured on 2.1.319 and is unverified in 2.1.326.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:23; openspec/specs/version-floor/spec.md:10; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

- [ ] **CC-068** claudetto shall treat an absent path as an answer: ENOENT from `$.fs.stat` or `$.fs.exists` means absent, with no log; resolve only the operands a command takes as paths (`grep -v "/\.git/" list.txt` logs no "was not resolved"); mocks report untouched paths absent.
  Basis: reported, reproduced. Status: have at 088a227c (hygiene/roots.ts, kernel/absent.ts). Claude 2.1.326: `fs.stat` and `fs.exists` mod events present (chunk-qg227pzf.js@3415).
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:141; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:755.

- [ ] **CC-069** claudetto shall pick the first surface that can do a job (tool deferral, command hiding, settings key, classic hook, skill, output style, rule file, mod); a call outside the agent form is denied with the exact form and never rewritten (a rewrite sends the call and later ones to the local classifier); `fork` and `statusline-setup` pass unchanged; `search`, `plan`, `sweep` carry `run_in_background`. Decision D323 supersedes the D321 mapping of built-in agents (`Explore` to `claudetto:search`, `Plan` to `claudetto:plan`, `general-purpose` to `claudetto:work`, withheld via `agent.offer`); see [ADR-0126](../../adr/0126-builtin-agent-offer-mapping-superseded.md).
  Basis: measured. Status: partial at 088a227c (hooks/features/delegation). Claude 2.1.326: `agent.offer` present (chunk-qg227pzf.js@3878).
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:56; openspec/changes/archive/2026-11-16-2-1-323/specs/surface-trim/spec.md:38; openspec/changes/archive/2026-11-16-2-1-323/design.md:99.

- [ ] **CC-070** claudetto shall use the lead only for `claude plugin test`, once per round, because one run of the `claudetto` mod takes 3.4 GB in 19 processes; before a removal, ask the user (the D321 lesson: do not delete popup, monitor, handoff, hygiene or you-should-know unasked); worktree ownership comes from Claude Code worktree events and `.claude/worktrees/`, never from parsed shell.
  Basis: measured; reported. Status: have at 088a227c (process rule).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:35; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:517; openspec/specs/permission-policy/spec.md:264.
