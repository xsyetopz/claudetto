# Tasks

## 1. Audit

- [x] 1.1 Map each item of `ISSUES-2026-11-09-1422.md` to the spec in `openspec/specs/` and the code it touches, and record the map in `design.md`.
- [ ] 1.2 Re-audit each rule, gate, and hook against `openspec/specs/` (issue item 16), and list what no spec or issue keeps.
- [ ] 1.3 Write the spec deltas for what 1.2 finds, then validate the change.

## 2. Fixes, One Slice and One Commit Each, Failing Test First

- [ ] 2.1 claim-check: read popup answers in `credited` (`texts.ts:473-475`), per `specs/claim-check/spec.md`.
- [ ] 2.2 lean-openspec: validate the main specs with no change (`openspec.ts:97-104`, reuse `validateSpec` at `spec-rules.ts:329`), add `init`, `new`, the status graph, and `list`; replace `justfile:46`.
- [ ] 2.3 constraint-ledger: quote the person for each entry, drop unsupported ones, lift allowed ones (`PIN_EXTRACT` `texts.ts:445`, `pin.ts:162-174, 206-211`).
- [ ] 2.4 run-limits: count only writes that ran (`slices.ts:128-139`), and replace `SLICE_OTHERS` (`texts.ts:66-69`) with the commit-under-its-source text.
- [ ] 2.5 permission-policy: branch gate asks or allows (`processes.ts:286-293`), fix the Read redirect parse (`gate/rules.ts:120-121`), add the protected-path check before a switch, and read standing instructions in the work gate.
- [ ] 2.6 agent-conduct: one channel per question across `Concise.md:23`, `limits/open-items.ts:12`, and `claudetto-you-should-know`.
- [ ] 2.7 session-handoff: date the git state in the handoff and the fallback, and add the `git status -sb` line to the read-back.

## 3. Handover Probe

- [ ] 3.1 Run the fake-API `/compact` probe with `--debug-file` and record the summarizer's `cache_control`, per `specs/compaction-path/spec.md`.
- [ ] 3.2 Build the four-arm probe harness and run it with no paid call against the fake API.
- [ ] 3.3 Run the paid arms after the person approves, record the rows under `docs/`, and set `handoverThresholdTokens` from them.

## 4. Research Slices

- [ ] 4.1 Sandbox (issue item 17): in the setup "Sandbox" group, add `enableWeakerNetworkIsolation`, the `~/.ssh`, `~/.gnupg`, and `~/Library/Keychains` reads to `denyRead`, the `npm config get cache` folder, and the read-only `excludedCommands`, per `specs/sandbox/spec.md`.
- [ ] 4.1.1 Re-run the pass and fail table (`/private/tmp/claude/probe-sandbox-run*.sh`) with each new key, one at a time, and keep only the entries that pass: `ps *`, `top *`, `pgrep *`, `sysctl *`, `launchctl list`, `diskutil list`, `scutil *`, and `allowMachLookup` `com.apple.pasteboard.1` for `pbcopy` and `pbpaste`.
- [ ] 4.1.2 Find why `open -R` and `osascript -e 'return 1'` passed in the probe, when the session's sandbox text says they are blocked and no `allowAppleEvents` is set.
- [ ] 4.2 Subagents (issue item 18): move the TTL into `subagentPromptCacheTtl` and drop `cacheTtl` from the agent files, add the run log and the check-on-return rule, and remove the stale `Hephaestus` name from `openspec/specs/subagent-prompts/spec.md`, per `specs/subagent-prompts/spec.md`.
- [ ] 4.2.1 Run the free fake-API probes: fork against fresh prefix sharing with `CLAUDE_CODE_FORK_SUBAGENT=1`, and the `ttl` on each request under `subagentPromptCacheTtl` `5m` and `1h`.
- [ ] 4.2.2 After 10 or more logged edit runs, set the delegation cut-offs and the TTL from the log.
- [ ] 4.3 Display (issue item 19): delete `plugins/claudetto/hooks/fold.ts` and its `register.ts` entry, per `specs/surface-trim/spec.md`, and check in a fresh session that a grouped `grep` result folds.

## 5. Release

- [ ] 5.1 Add the release entry to `CHANGELOG.md` with the version string unchanged at `2.1.319`.
- [ ] 5.2 Delete `ISSUES-2026-11-09-1422.md` once each item is fixed or recorded as out of reach.
