# Tasks

## 1. Audit

- [x] 1.1 Map each item of `ISSUES-2026-11-09-1422.md` to the spec in `openspec/specs/` and the code it touches, and record the map in `design.md`.
- [x] 1.2 Re-audit each rule, gate, and hook against `openspec/specs/` (issue item 16), and list what no spec or issue keeps.
- [x] 1.3 Write the spec deltas for what 1.2 finds, then validate the change.

## 2. Fixes, One Slice and One Commit Each, Failing Test First

- [x] 2.1 claim-check: read popup answers in `credited` (`texts.ts:473-475`), per `specs/claim-check/spec.md`.
- [x] 2.2 lean-openspec: validate the main specs with no change (`openspec.ts:97-104`, reuse `validateSpec` at `spec-rules.ts:329`), add `init`, `new`, the status graph, and `list`; replace `justfile:46`.
- [x] 2.3 constraint-ledger: quote the person for each entry, drop unsupported ones, lift allowed ones (`PIN_EXTRACT` `texts.ts:445`, `pin.ts:162-174, 206-211`).
- [x] 2.4 run-limits: count only writes that ran (`slices.ts:128-139`), and replace `SLICE_OTHERS` (`texts.ts:66-69`) with the commit-under-its-source text.
- [x] 2.5 permission-policy: branch gate asks or allows (`processes.ts:286-293`), fix the Read redirect parse (`gate/rules.ts:120-121`), add the protected-path check before a switch, and read standing instructions in the work gate.
- [x] 2.6 agent-conduct: one channel per question across `Concise.md:23`, `limits/open-items.ts:12`, and `claudetto-you-should-know`.
- [x] 2.7 session-handoff: date the git state in the handoff and the fallback, and add the `git status -sb` line to the read-back.
- [x] 2.8 Removals from 1.2: delete `GATE_ENV_VALUES`, `GATE_ENV_DUMP` (`texts.ts:335-342`) and the grader faults `asks`, `jargon`, `confesses`, `narrates` (`texts.ts:485-504`) with their tests and CHANGELOG lines.
- [x] 2.9 Walls (item A): setup writes `Read(<wall>/**)` to `permissions.deny` for each `protectedPaths` entry, so the start notice (`gate.ts:221-229`) stays silent after setup.
- [x] 2.11 Removals (item C): the injected rules say a removal deletes the feature's code, tests, and docs and adds no test that it stays gone, and that a pre-release project (version below 1.0.0, or the person says so) keeps no compatibility path for what it drops (`texts.ts:32`).
- [x] 2.12 One command at a time (item D): `Concise.md:23` asks for at most one `- ! <command>` bullet per reply, with no checkbox (the person, 2026-11-09), and the Stop check (`limits/open-items.ts`, text at `texts.ts:245-247`) blocks a reply with two or more, per `specs/agent-conduct/spec.md` and `specs/run-limits/spec.md`; failing test first in `limits/open-items.test.ts`.
- [x] 2.10 Setup (item B): keep one popup per step; Haiku explains each and recommends an option, listed first (the person's choice, 2026-11-09).

- [x] 2.13 Auto-mode classifier (ISSUES 2026-11-09 item 5): `Agent` denies an off-form call and `ToolSearch` rewrites only its result, so no hook changes a call input (the "no verdict" case); the missing reason is out of reach, as the server gives no explanation.
- [x] 2.14 permission-policy, session-hygiene: `385dd89c` reads the sandbox TMPDIR `/tmp/claude-<uid>` as a temp base and expands variables in made paths (`processes.ts`).
- [x] 2.15 dangerous-commands: `1057652f` denies a linter's unsafe fixes by `claudetto:lint-unsafe-fix`.
- [x] 2.16 permission-policy: `e3ae2525` asks with the failure text when the gate itself fails.
- [x] 2.17 claim-check: `96b6838b` adds the plain-text `options` fault (interactive only); `6ecff6d7` removes the padding fault it first added, and `Concise.md` states the reply form positively.
- [x] 2.18 agent-conduct: `d229220b`, `5dbbd84b` set the root prompt's dispute, credential, and waited-on task wording and the `Concise.md` text; the pin extractor reads a fault list as a task.
- [x] 2.19 surface-trim: `08ea9a56` names `cat`, `head`, `tail`, `sed`, `awk`, and `echo` in the Bash text.
- [x] 2.20 setup, subagent-prompts: `16ae5c74` added a hook deny for a nested agent and `5444dcfc` removed it, so setup writes `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` as 1 and the engine caps nesting.
- [x] 2.21 constraint-ledger: `f82eb074` resets the message kind to `task` on `session.compact`.
- [x] 2.22 Docs and build: `ffc48ca9`, `0d55975b` record the changes in `CHANGELOG.md`; `8d7a7260` loads the handover probe's `.env` with `--env-file`; `e11debed` updates `bun.lock` for jscpd 5.4.3.

## 3. Handover Probe

- [x] 3.1 Run the fake-API `/compact` probe with `--debug-file` and record the summarizer's `cache_control`, per `specs/compaction-path/spec.md`.
- [x] 3.2 Build the four-arm probe harness and run it with no paid call against the fake API.
- [x] 3.3 Run the paid arms after the person approves, record the rows under `docs/`, and set `handoverThresholdTokens` from them.

## 4. Research Slices

- [x] 4.1 Sandbox (issue item 17): in the setup "Sandbox" group, write the deny-list block of `specs/sandbox/spec.md`: home-wide `allowWrite` with `denyWrite` for files that run later, `allowMachLookup` `["*"]`, the wider `denyRead`, and the four read-only `excludedCommands`; drop the per-tool cache entries.
- [x] 4.1.1 Check on the real install that `gh api user` passes TLS under `allowMachLookup` `["*"]` (the fake API answered "Bad Gateway" with and without it, so TLS was not reached), and drop `enableWeakerNetworkIsolation` if it does.
- [x] 4.1.2 Find why `open -R` and `osascript -e 'return 1'` passed in the probe, when the session's sandbox text says they are blocked and no `allowAppleEvents` is set.
- [x] 4.1.3 On Linux, find the bubblewrap form of each rule, since `allowMachLookup` is macOS only.
- [x] 4.2 Subagents (issue item 18): move the TTL into `subagentPromptCacheTtl` and drop `cacheTtl` from the agent files, add the run log and the check-on-return rule, and remove the stale `Hephaestus` name from `openspec/specs/subagent-prompts/spec.md`, per `specs/subagent-prompts/spec.md`.
- [x] 4.2.1 Run the free fake-API probes: fork against fresh prefix sharing with `CLAUDE_CODE_FORK_SUBAGENT=1`, and the `ttl` on each request under `subagentPromptCacheTtl` `5m` and `1h`.
- [x] 4.3 Display (issue item 19): delete `plugins/claudetto/hooks/fold.ts` and its `register.ts` entry, per `specs/surface-trim/spec.md`, and check in a fresh session that a grouped `grep` result folds.
- [x] 4.4 Status line window: write the window file from the mod after each response, read it in `contextText` (`statusline/segments.ts:94-109`), and name it in the line's file reads, per `specs/status-line/spec.md`.
- [x] 4.5 Status line flow: replace the fixed row groups of `rowsOf` (`statusline/rows.ts:24-39`) with one item sequence wrapped at the width, up to `MAX_ROWS`.
- [x] 4.6 Status line colours: write the `theme` name into the session file, add the palettes to `statusline/color.ts` (`:11-13, 49, 64-65`) for the six built-in themes from `chunk-w5ysqthb.js`, and add the palette-drift test.

- [x] 4.7 Reply quote: add `hooks/reply.ts` and its test, register `/reply` at `session.start`, per `specs/reply-quote/spec.md`.

## 5. Release

- [x] 5.1 Add the release entry to `CHANGELOG.md` with the version string unchanged at `2.1.319`.
## 6. Carried to 2.1.321

Archived on 2026-11-10 with these two items open; the 2.1.321 change takes them over.

- 4.2.2 After 3 or more logged edit runs, set the delegation cut-offs and the TTL from the log.
- 5.2 Delete `ISSUES-2026-11-09-1422.md` once each item is fixed or recorded as out of reach.
