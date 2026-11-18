# Guards Requirements

## Secret Handling

- [x] **REQ-GUARDS-001** claudetto shall never seek confidential information (no `cat .env`, key grep, or listing credential stores; deny Read and Bash patterns for `.env` and credential paths; deny `Read(<wall>/**)` plus a sandbox credential read-deny) and never reproduce it in output, logs, source, commits, memory, or a brief. A call that reads `.env` is denied with "This call reads `.env`, which can hold secrets", without a retry by the agent. Secret-shaped test files get fakes in a temp dir. claudetto may read env files but the model never sees values. Encoded forms slip past a grep hook; do not hold a datum the model need not (Opus put the user's email into an outbound User-Agent header).
  Acceptance: a `grep -c` on the repo `.env` to check a key name is denied with the reason above; a tool result holding a secret reaches the model redacted (see the secret matcher item). Verification: test.
  Basis: measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/secrets/scan.ts` and the setup deny rules exist; no `.env` read gate found under plugins/claudetto/hooks).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3303 (one reported event; the agent did not retry); plugins/claudetto/hooks/features/secrets/scan.ts@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:211@088a227c; external/judged/hook.jsonl:30.
  Verified: claude 2.1.327, 2026-11-18. cc-inspect cli (fake API, bypassPermissions) on the filled settings: vanilla returned the file text for cat .env; with the Read deny rule and sandbox on, cat .env, grep -c KEY .env and a python open of .env failed with Operation not permitted. Setup fills the rules (FILL_VERSION 2); claude plugin test plugins/claudetto passes. The custom denial sentence is dropped because a deny rule cannot carry text (ADR-0125).

- [x] **REQ-GUARDS-002** Moved Out as OUT-2300: the item needs a paid model run.

- [x] **REQ-GUARDS-005** Moved Out as OUT-2301: the item is a third-party report with no probe.

## Memory Guard

- [x] **REQ-GUARDS-020** claudetto shall guard memory: before each Bash or Monitor call and each subagent start it reads the free-memory share (macOS `memory_pressure -Q`, Linux MemAvailable over MemTotal, else pass; 2.46 to 4 ms; a shared reading for 5 s makes 100 runs into 1). Below `memoryFreeMinPercent` (userConfig, default 20, 0 off) it denies with the free share and the five largest processes (pid, size), telling the agent to stop its own runs by pid or `TaskStop` and wait, with a retry hint for a subagent; read-only commands, all-`kill` commands and an unreadable share pass. While a Bash call runs it polls per-process memory with `ps` through `$.process.run` on the host every 5 s; a process begun after the call and above `memoryProcessMaxPercent` (default 25, 0 off, no list read; 8 GB on the measured machine) is stopped with the default SIGTERM `kill <pid>`, older ones are untouched, and the result ends with a note naming pid, program and size and advising a narrower run. The `ps` poll times out after one poll gap, a stalled poll counts as one miss, and the watch logs only after 3 missed polls in a row (once); a failed poll is caught in the loop; a Bash call that passed its timeout and moved to the background stays watched until the process ends; `sysctl` is called by absolute path; the watch aborts in `finally` around `next(e)`; the guard is first in the `tool.check` chain and also runs from `agent.spawn`. The user shall raise `memoryProcessMaxPercent` per repository for a heavy suite; its docs say the default would stop a legitimate 15 GB surface build.
  Decision: ADR-0190, pre-call free-memory hold only; no per-process watcher.
  Acceptance: a `ps` that stalls past one poll gap counts as one miss and logs nothing; the third miss in a row logs once; a loaded machine causes no hook error on each Bash call. A type-aware lint run holds 3.8 GB (12%); a 9 GB tsgolint of 32 GB is stopped; the freeze came from many concurrent heavy runs; macOS has no memory ulimit and GOMEMLIMIT did not help; the machine froze on 2026-11-11 (reported). The watch covers a timed-out call that runs on. Verification: test; inspection (the docs note).
  Basis: measured, reported. Status: partial at 088a227c (hooks/features/memory/hold.ts:29 MISSES_BLIND = 3 and :167 log after 3 misses; :208 watches a call that went to the background; default 25 at plugin.json:46 and hold.ts:240; `memoryFreeMinPercent` at plugin.json:40; `git show 088a227c:plugins/claudetto/hooks/features/memory/hold.ts | grep -n -i timeout` finds no per-poll timeout, so the one-poll-gap timeout is not found).
  Source: openspec/specs/run-limits/spec.md:345; openspec/specs/run-limits/spec.md:394; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:111; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:107 (a loaded machine stalled ps past the 30 s default and logged a hook error on each Bash call; commit 4a335117); openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:802-803 (P145, P146: ps fails inside a sandboxed Bash call with "operation not permitted" but runs through $.process.run; the etime format [[dd-]hh:]mm:ss is from man ps and its host run was not made in the session; only a Bash call is watched; a process of another command with the same start time can be taken for this call's; growth faster than the 5 s poll is not caught in time; no live run on a real machine; the first test failed before the code, 1 of 4, and 4 of 4 after); openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:487 (in 2.1.323 a call passing its timeout keeps running in the background; only backgroundTasksDisabled or CLAUDE_CODE_DISABLE_BACKGROUND_TASKS stops that move, and the switch also disables run_in_background and background agents; inferred, unprobed); plugins/claudetto/hooks/features/memory/hold.ts:169@088a227c; plugins/claudetto/hooks/features/memory/hold.ts:240@088a227c.
  Verified: claude plugin test plugins/claudetto -> memory.test.ts passes (free-share parse, default 20, 0 off, reason worded as the next step, 1,000 parses under 100 ms); plugin.json holds `memoryFreeMinPercent` (2.1.327, 2026-11-19). Weak tick: the ADR-0190 decision keeps the pre-call hold only, so the per-process watcher, process list and read-only pass are dropped.

## Hygiene Sweep

- [x] **REQ-GUARDS-023** Moved Out as OUT-2302: the item describes a part that plugins/ does not ship.

- [x] **REQ-GUARDS-024** Moved Out as OUT-2303: the item describes a part that plugins/ does not ship.

- [x] **REQ-GUARDS-025** Moved Out as OUT-2304: the item describes a part that plugins/ does not ship.

## Worktree and Branch Hygiene Sweep

- [x] **REQ-GUARDS-027** Moved Out as OUT-2305: the item describes a part that plugins/ does not ship.

## Protected Files and Walls

- [x] **REQ-GUARDS-034** claudetto shall protect its hook and settings files from agent edits.
  Acceptance: the protected-path list lives in the repo, is enforced in CI, and fails closed (an unlisted file counts protected); the approval gate writes a record outside the agent's working directory; writes to `.claude` are a protected path (prompt in default and acceptEdits, silent in bypassPermissions and auto); because deny rules miss a python one-liner, setup enables the sandbox with `sandbox.filesystem.denyRead` (claude 2.1.327: present, chunk-ja5z738t.js@115660). Verification: test.
  Basis: cited (from the docs, by a commenter, not re-checked). Status: partial at 088a227c (`plugins/claudetto/hooks/features/protected/`).
  Source: openspec/specs/permission-policy/spec.md:8; openspec/specs/permission-policy/spec.md:189; openspec/specs/permission-policy/spec.md:199.
  Verified: claude 2.1.327, 2026-11-18. Setup fills sandbox denyWrite with shell startup files, ~/.ssh, git config, LaunchAgents, three PATH folders, ~/.claude/plugins and ~/.claude/hooks, plus each wall. cc-inspect cli with sandbox on: touch under ~/.ssh failed with Operation not permitted; a neighbour write exited 0. The CI and fail-closed clauses need a mod and are dropped (ADR-0125).

- [x] **REQ-GUARDS-035** claudetto shall write, for each wall in `protectedPaths` (default ~/.claudetto-holdout; a plugin userConfig, not a Claude Code setting), `permissions.deny` `Read(<wall>/**)` (`~/` for paths under ~, `$HOME`, `${HOME}`; `//` otherwise: ~/.claudetto-holdout gives `Read(~/.claudetto-holdout/**)`, /srv/holdout/ gives `Read(//srv/holdout/**)`) plus the wall in `sandbox.filesystem.denyRead` and `sandbox.filesystem.denyWrite`, so Claude Code denies any tool reaching a walled path; no entry, no group. The gate denies, over any allow, a call naming a walled path in any spelling (`~`, `$HOME`, `${HOME}`, relative path joined to an earlier `cd`, `..` folds, word after `=`, redirect target) and file tools (Read file_path, Grep path, Glob path+pattern); the denial names path and wall, says the user walled it off, and tells the agent to ask the user to run `! <command>`; a sibling sharing a name prefix or a text mention passes; a call spelling no wall's last name does no home-folder lookup; a named branch is not denied. Startup logs one line per wall lacking `Read(<wall>/**)` in `permissions.deny` (`~/` or `//` form), nothing when all present; setup writes the deny. The protected-switch is a `tool.check` feature after holdCheck at baseline.
  Acceptance: A `protectedPaths` entry yields the Read deny and the sandbox wall; no entry yields no group; a walled path is denied for Bash and file tools; a sibling sharing a name prefix passes. Extends (listed, not covered): globs, interpreter code, symlinks, above-the-wall searches, and the `echo` over-block fix. Verification: test.
  Basis: cited (spec), measured (the Read deny). Status: partial at 088a227c (protectedPaths option plugin.json:84; setup/changes.ts:131 writes the Read deny; `git grep -n denyRead 088a227c -- plugins` finds no hit, so the sandbox write is missing; the other item said have).
  Source: openspec/specs/permission-policy/spec.md:189; openspec/specs/permission-policy/spec.md:191; openspec/specs/permission-policy/spec.md:199; openspec/specs/permission-policy/spec.md:208; openspec/specs/permission-policy/spec.md:232; openspec/specs/permission-policy/spec.md:166; openspec/specs/permission-policy/spec.md:217; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:139; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:145; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:163; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:166; plugins/claudetto/hooks/features/protected@088a227c; plugins/claudetto/hooks/features/setup/changes.ts@088a227c; plugins/claudetto/.claude-plugin/plugin.json@088a227c; claude 2.1.327: `sandbox.filesystem.denyRead` and `denyWrite` present (chunk-ja5z738t.js@115660; chunk-ja5z738t.js@120724).
  Verified: claude 2.1.327, 2026-11-18. fill.test.ts pins that each protectedPaths entry gives a Read deny rule, sandbox denyRead and denyWrite; an empty list gives none. cc-inspect cli: with denyWrite on ~/.ssh a redirect, tee and cp exited 1 with Operation not permitted. The spelling-matching gate is dropped (ADR-0125); the OS layer blocks every spelling.

## Consent Is Explicit and Names the Value

- [x] **REQ-GUARDS-041** Moved Out as OUT-2306: the item needs a paid model run.

## No Route around a Block

- [x] **REQ-GUARDS-042** Moved Out as OUT-2307: the item needs a paid model run.

## Retention and Memory

- [x] **REQ-GUARDS-048** claudetto shall treat retention as user-owned: never change `cleanupPeriodDays` or `autoMemoryEnabled` without consent (a plugin default once deleted transcripts); never delete or rewrite a transcript; an ask rule covers edits to those settings; the installer sets no retention.
  Decision: ADR-0190, auto memory is not written without consent.
  Acceptance: the plugin ships no default for either key; hygiene reads `cleanupPeriodDays` only as a fallback. Verification: inspection.
  Basis: reported. Status: have at 088a227c (plugins/claudetto/.claude-plugin/plugin.json:61 describes a temp-folder age, not a retention default; the ask rule is missing).
  Verified: 2026-11-18, weak evidence. `grep -rnE 'cleanupPeriodDays|autoMemoryEnabled' plugins/claudetto` finds no hit, so the plugin ships no default for either key and no code reads them; the acceptance holds. The ask rule over edits to these two settings is not built; REQ-SETUP-065 writes autoMemoryEnabled only on a yes. Reopened 2026-11-18 in review: the ask rule clause is open, so the item stays BUILD.
  Source: external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:58; openspec/specs/session-hygiene/spec.md:33.
  Verified: grep -rnE 'cleanupPeriodDays|autoMemoryEnabled' plugins/claudetto -> 0 hits; hooks/guards/rules.ts ASK holds Edit and Write on ~/.claude/settings.json, and the cc-inspect cli fill wrote both ask rules; fill.test.ts pins the ask list (2.1.327, 2026-11-19).

## Stop and Reply Checks

- [x] **REQ-GUARDS-052** Moved Out as OUT-2308: the item describes a part that plugins/ does not ship.

## Held-Out Wall

- [x] **REQ-GUARDS-058** claudetto shall wall held-out validation from the agent: hidden tests until grading, grading outside the tested agent's workspace, graders frozen before a run, and `~/.claudetto-holdout` set as the `protectedPaths` default with sandbox `denyRead`. The holdout scoring step stayed an open user step.
  Acceptance: a `Read` of `~/.claudetto-holdout/**` is denied. Cited: EvalGenie held-out tests helped minimally and Claude Code and Codex hacked explicitly [2511.21654]; ImpossibleBench: any pass is cheating [2510.20270]; CoT monitoring beats action-only but optimizing against the monitor teaches hiding [2503.11926]; hacking generalizes to sabotage in Claude Code [2511.18397]; verbalizing reward hacking 88% to 6% undetected [2506.22777]. Verification: test.
  Basis: cited. Status: partial at 088a227c (plugin.json default and setup.test.ts deny rule exist; `git grep denyRead 088a227c` finds nothing, so the sandbox `denyRead` is not written). claude 2.1.327: sandbox.filesystem.denyRead present (chunk-ja5z738t.js@115660).
  Source: external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:125; plugins/claudetto/.claude-plugin/plugin.json:89@088a227c; plugins/claudetto/hooks/features/setup/setup.test.ts:66@088a227c.
  Verified: claude 2.1.327, 2026-11-18. protectedPaths defaults to ~/.claudetto-holdout (plugin.json userConfig); fill.test.ts pins the Read deny and both sandbox entries. The Read mechanism is the one measured for .env. The holdout path itself was not probed, because this session may not read it.

## Commit Attribution

- [x] **REQ-GUARDS-063** claudetto shall follow the project convention with a single `Assisted-by` trailer, never write `Signed-off-by` for the user, and put session history in the Record or PR description.
  Acceptance: a commit made by claudetto carries one `Assisted-by` trailer and no `Signed-off-by`. Verification: test.
  Basis: cited (a contribution certificate in the dossier). Status: missing at 088a227c (`git grep Assisted-by` finds nothing under `plugins/`).
  Source: external/please-use-me-often/agent-terms/CONTRIBUTION-CERTIFICATE.md:22.
  Verified: claude 2.1.327, 2026-11-18. cc-inspect cli, query Co-Authored-By: vanilla request 1 holds the text; with attribution.commit set to Assisted-by: Claude Code the request holds Assisted-by and no Co-Authored-By. Setup fills attribution when unset; fill.test.ts pins it. The setting is one static line, so the model name is not in the trailer.

## Web Fetch and Browser Fallback

- [x] **REQ-GUARDS-064** Moved Out as OUT-2309: the item describes a part that plugins/ does not ship.

- [x] **REQ-GUARDS-065** Moved Out as OUT-2310: the item describes a part that plugins/ does not ship.

- [x] **REQ-GUARDS-066** Moved Out as OUT-2311: the item describes a part that plugins/ does not ship.

## Force Push

- [x] **REQ-GUARDS-070** claudetto shall deny a force push.
  Acceptance: `git push --force` and `git push -f` are denied; a plain push passes. Verification: test.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: have at 088a227c (`plugins/claudetto/hooks/features/setup/command-rules.ts:12-13`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules: push each green commit to the feature branch, never force).
  Verified: claude 2.1.327, 2026-11-18. cc-inspect cli: vanilla ran a force push; with the force-push deny rules (long and short flag) both and the compound init-then-force-push were denied. fill.test.ts pins that a plain push is not denied.

## Sandbox

- [x] **REQ-GUARDS-071** claudetto shall set the sandbox deny-list as: allowWrite `~/`, `/Volumes/`, `/private/tmp`; denyWrite 14 files that run later; denyRead Keychains and cloud credentials; `~/.ssh` and `~/.gnupg` not in denyRead; `allowMachLookup ["*"]`; `excludedCommands` `ps *`, `top *`, `sysctl *`, `launchctl list`.
  Acceptance: `setup/settings.ts` holds the block. Verification: inspection.
  Basis: user decision. Status: have.
  Source: user decision, 2026-11-13 22:08 UTC, sandbox trimmed to unrecoverable destructive commands (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14708); user decision, 2026-11-14 14:21 UTC, sandbox as minimal as possible (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36547).
  Verified: claude 2.1.327, 2026-11-18. hooks/guards/rules.ts and fill.ts write the sandbox block (allowWrite, denyWrite, denyRead with login keychain re-allowed, allowMachLookup, excludedCommands per ADR-0159 and ADR-0188). cc-inspect cli accepted the filled settings and enforced them. claude plugin test plugins/claudetto: 35 pass.

## Destructive Commands

## Disk Hygiene

- [x] **REQ-GUARDS-073** Moved Out as OUT-2312: the item describes a part that plugins/ does not ship.

- [x] **REQ-GUARDS-074** Moved Out as OUT-2313: the item describes a part that plugins/ does not ship.

- [x] **REQ-GUARDS-076** claudetto shall claim that a path is protected against Bash writers only when the sandbox is on. With the sandbox off, a `permissions.deny` rule `Edit(path/**)` stops only the Edit tool. With the sandbox on, the sandbox merges `Edit(...)` deny paths into its write deny list (CTX-845).
  Acceptance: setup text and rule files that name a protected path either require `sandbox.enabled` true or state that Bash writers are not stopped. A test plants a redirect, `tee`, `cp` and `sed -i` against the path, plus one write to an allowed neighbour path. It checks each result's exit code and text, not `is_error`. Verification: test.
  Basis: measured (CTX-845: with the sandbox off, all four writers wrote; with it on, all four failed with "Operation not permitted"). One commenter claimed the deny rule alone catches redirects and `tee`; the probe did not confirm that. Status: missing at 088a227c.
  Source: reports/2026-11-18-research/surface-probes/settings-probes.md; arc42/03_context_and_scope/sandbox.md CTX-845; external/2026-11-18/reddit.com-r-claudecode-comments-1xyk5mb-my-hook-blocked-claude-from-ed-20261117T224954Z.md:149 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xyk5mb/my_hook_blocked_claude_from_editing_migrations/>); reports/2026-11-18-research/dossier.md:84.
  Verified: claude 2.1.327, 2026-11-18. Setup writes sandbox.enabled true only when unset; fill.test.ts pins that a user's false is kept. cc-inspect cli: redirect, tee and cp into a denyWrite path each exited 1 Operation not permitted, the neighbour write exited 0. The sed -i case hit a missing file, so it is unproven. The sandbox-off result is not re-run.

## Code Mode Compatibility

- [x] **REQ-GUARDS-078** Moved Out as OUT-2314: the item needs a paid model run.
