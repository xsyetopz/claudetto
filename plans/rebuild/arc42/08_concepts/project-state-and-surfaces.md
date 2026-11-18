# Project State and Surfaces

- [x] **CC-066** Moved Out as OUT-2648: third-party report with no probe.

- [ ] **CC-067** claudetto shall set the settings route rule: the plugin root `settings.json` applies only `agent` and `subagentStatusLine`; a `settings.read` hook changes only `disableBundledSkills`, `outputStyle` (tier keys) and sandbox `enabled`/`allowUnsandboxedCommands`; `model`, `effortLevel`, `permissions`, `env`, `enabledPlugins` and sandbox filesystem and network go through a setup write to user settings, applied at the next start. `subagentStatusLine` goes to plugin settings.json; otherwise setup writes and tells the user to restart, because a hook route silently does nothing for most keys. In 2.1.326 some worktree sessions skip some plugin settings and show a notice that names what was skipped.
  Basis: measured 2.1.319. Status: have at 088a227c (hooks/features/surface). Claude 2.1.326: the `settings.read` mod event is present (chunk-dafpvz32.js@3690 (2.1.327)); on 2.1.327 `$.settings.read` takes `{ source }`, `{ key }` or nothing (chunk-b0yr0k8v.js@306434; https://clawdipedia.cc/extend/mod-api/calls/clock-http-process-env-settings, Documented) and returns the merged settings; the 2.1.319 key list was not re-enumerated.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:23; openspec/specs/version-floor/spec.md:10; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **CC-068** Moved Out as OUT-2649: third-party report with no probe.

- [ ] **CC-069** claudetto shall pick the first surface that can do a job (tool deferral, command hiding, settings key, classic hook, skill, output style, rule file, mod); a call outside the agent form is denied with the exact form and never rewritten (a rewrite sends the call and later ones to the local classifier); `fork` and `statusline-setup` pass unchanged; `search`, `plan`, `sweep` carry `run_in_background`. Decision D323 supersedes the D321 mapping of built-in agents (`Explore` to `claudetto:search`, `Plan` to `claudetto:plan`, `general-purpose` to `claudetto:work`, withheld via `agent.offer`); see [ADR-0126](../../adr/0126-builtin-agent-offer-mapping-superseded.md).
  Basis: measured. Status: partial at 088a227c (hooks/features/delegation). Claude 2.1.327: `agent.offer` present (chunk-dafpvz32.js@3925).
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:56; openspec/changes/archive/2026-11-16-2-1-323/specs/surface-trim/spec.md:38; openspec/changes/archive/2026-11-16-2-1-323/design.md:99.

- [x] **CC-070** Moved Out as OUT-2650: third-party report with no probe.
