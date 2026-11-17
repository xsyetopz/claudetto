# Guards Requirements

## Secret Handling

- [ ] **REQ-GUARDS-001** claudetto shall never seek confidential information (no `cat .env`, key grep, or listing credential stores; deny Read and Bash patterns for `.env` and credential paths; deny `Read(<wall>/**)` plus a sandbox credential read-deny) and never reproduce it in output, logs, source, commits, memory, or a brief. A call that reads `.env` is denied with "This call reads `.env`, which can hold secrets", without a retry by the agent. Secret-shaped test files get fakes in a temp dir. claudetto may read env files but the model never sees values. Encoded forms slip past a grep hook; do not hold a datum the model need not (Opus put the user's email into an outbound User-Agent header).
  Acceptance: a `grep -c` on the repo `.env` to check a key name is denied with the reason above; a tool result holding a secret reaches the model redacted (see the secret matcher item). Verification: test.
  Basis: measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/secrets/scan.ts` and the setup deny rules exist; no `.env` read gate found under plugins/claudetto/hooks).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3303 (one reported event; the agent did not retry); plugins/claudetto/hooks/features/secrets/scan.ts@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:211@088a227c; external/judged/hook.jsonl:30.

- [ ] **REQ-GUARDS-002** claudetto shall define confidential as secrets, private data, session data, `~/.claude/` contents, unreleased work, and anything the user calls confidential; public information is not. A read of a credential store path or content that looks like a secret is refused; credentials are looked up in repo `.env` files, then the environment, and the agent never asks for a new file; a needed dependency is added to the project with its package manager.
  Acceptance: eval `credential-from-env` passes. Without a definition the agent explores `.env` "to help". Verification: test.
  Basis: reported. Status: partial at 088a227c (secrets feature exists).
  Source: openspec/specs/agent-conduct/spec.md:407.

- [ ] **REQ-GUARDS-003** claudetto shall use betterleaks (1.10.0, MIT, pinned in hooks) as the one secret matcher, with no other secret regex in code. It runs `betterleaks stdin -f json -r - --no-banner -l error --exit-code 0` through `$.process.run` and replaces each reported `Secret` with `[REDACTED]`; exit 1 is a failed scan, never findings. An inline config (`BETTERLEAKS_CONFIG_TOML`, wins only when the path vars are empty) extends the defaults with four rules (anthropic-any-key `sk-ant-[a-z0-9]+-`, aws-secret-access-key-assignment, url-userinfo-password, authorization-header), because the defaults miss OAuth `oat01`, bare AWS secrets, URL passwords and bearer tokens. It scans every tool result before the model sees it; an errored result with a secret reaches the model as a redacted deny. A missing or failing binary fails closed: deny with an error naming `brew install betterleaks` and `/claudetto:setup`; errors beneath the gate pass to the caller unchanged (`.catch` replays `next(e)`). Setup lists it as required, the notice shows at every start, and a decline is not recorded. Results under six chars skip the scan (36.97 to 7.23 ms per scan; 100 against 20 scans).
  Acceptance: a literal secret result reaches the model redacted as a deny; a missing betterleaks denies with the install command; a pinned-version spec test passes; `betterleaks config check` prints "OK: 37 rules"; `generic-api-key` across a line break gives one match; `betterleaks:allow` clears. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/kernel/secrets.ts, hooks/features/secrets/scan.ts, hooks/features/setup/tools.ts).
  Source: openspec/specs/secret-matcher/spec.md:14; openspec/specs/secret-matcher/spec.md:24; openspec/specs/secret-matcher/spec.md:33; openspec/changes/2-1-325-rearchitecture/design.md:148; plugins/claudetto/hooks/features/secrets/scan.ts@088a227c.

- [ ] **REQ-GUARDS-004** claudetto shall probe that a scanner prints no full key into Claude's tool output: run it on a test page with a fake key, check the session logs for the key, and mask the key before it prints if it shows up.
  Acceptance: The fake key is absent from the session logs. Verification: probe.
  Basis: inferred, one commenter. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xhmtya-i-used-claude-code-to-audit-21k-20261029T124002Z.md:79 (url: https://www.reddit.com/r/ClaudeAI/comments/1xhmtya/i_used_claude_code_to_audit_21k_product_hunt/).

- [ ] **REQ-GUARDS-005** claudetto shall scan `.claude/settings.local.json` `permissions.allow` for inline tokens, check `git check-ignore -v .claude/settings.local.json`, add the file to .gitignore, check `git ls-files .claude`, and tell the user to rotate (Apiiro, cited second-hand: 1,122 of 104,185 public copies hold a secret).
  Acceptance: An inline token in an allow entry is found and reported. Verification: test.
  Basis: cited. Status: partial at 088a227c (`protected` and `setup/ignore.ts` mention the file; the allow-entry scan is missing).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xw6ls3-yes-and-dont-ask-again-can-com-20261116T052216Z.md:29 (url: https://www.reddit.com/r/ClaudeCode/comments/1xw6ls3/yes_and_dont_ask_again_can_commit_your_api_key/); plugins/claudetto/hooks/features/protected@088a227c; plugins/claudetto/hooks/features/setup/ignore.ts@088a227c.

## Dependency Gate

- [ ] **REQ-GUARDS-006** claudetto shall gate each new dependency with a PreToolUse hook on `pip`, `npm`, and `cargo add` that checks the registry, package age, downloads, and an allowlist.
  Acceptance: A package absent from the registry, newer than the age floor, below the download floor, or off the allowlist is denied with the reason. A real malicious lookalike still passes an existence check, so the age, download, and allowlist checks stay. A registry check costs root prompt bytes against the target of 5,832 chars. Verification: test.
  Basis: cited (recipe). Status: partial at 088a227c (the plan holds only "verify a new dependency exists before install"; git grep for registry and package age found none).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:50,55; openspec/changes/2-1-325-rearchitecture/design.md:11 (the 5,832-char target; the registry check itself: unresolved, no matching line found).

## Package Manager Name

- [ ] **REQ-GUARDS-007** claudetto shall name the project's package manager once per session in a classic `SessionStart` command hook, reading the `packageManager` field of `package.json` first, then the lock files, for any package manager. The plan item's Bun-only fact line (`bunRuleEnabled`, injected when `package.json` and `bun.lock` both exist) is replaced by this.
  Acceptance: `package.json` with `packageManager` `pnpm@9.0.0` beside a `bun.lock` names pnpm. Verification: test.
  Basis: reported. Status: missing at 088a227c (`bunRule` is in no file under plugins/).
  Source: unresolved: the plan item says a Bun fact line; openspec/changes/archive/2026-11-16-2-1-323/specs/surface-trim/spec.md:5 says claudetto holds no Bun line and no `BUN_FACT`.

## Provenance Tags

- [ ] **REQ-GUARDS-008** claudetto shall wrap pasted or fetched text in tags with a random ID.
  Acceptance: Each wrapped block carries a tag ID that text inside it cannot guess. Verification: test.
  Basis: inferred (recipe). Status: missing at 088a227c (git grep for random id and nonce found none).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:116.

## Session Narration Guard

- [ ] **REQ-GUARDS-009** claudetto shall run a PreToolUse `Write|Edit` guard on added lines only (Edit: `new_string` lines not in `old_string`; Write: lines not in the existing file) in files matching `provenance.json` `shipped` and not `exempt`, flagging session narration (session names, task or change numbers, plan names; "session of/for/in task|change|plan", `task|step|phase N.N`, "as discussed", "per the user", "the user decided|approved|chose|asked for|wants", "added for|in|during task|session|change", "this|that|previous|earlier session", "previously ... now", ISO dates beside session words), and ask naming the line. It asks by default; `AGENT_TERMS_PROVENANCE_MODE=deny` denies; the reason says to move history to the Record and not reword past the check; exit 0 always. A provenance field names one checkable thing (path and line, command, URL); history goes in the Record; commit messages say what and why. Limit: Bash writes (sed, heredoc) skip it; add a FileChanged hook or a CI diff lint. This is a PreToolUse pattern check on edits, not a Stop check. Same rule as the project CLAUDE.md "no internal notes in source".
  Acceptance: an Edit adding "per the user" to a shipped file asks; with the deny mode it denies. Test table (9): an incident line asks; an ordinary why-comment is silent; session text in docs/ is exempt; "the user decided" in a new shipped file asks; a bare ISO date is silent; malformed input fails open with a stderr note; a path outside the project is silent; an unchanged pre-existing line in a Write is silent. Verification: test.
  Basis: reported. Cause named in the source: a prose-only rule, applied outside its scope, repaired locally and class-wide only after a second correction. Status: missing at 088a227c (CLAUDE.md rule only; hook missing).
  Source: external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:32 (SA-2.5); external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:49; claude 2.1.326: `PreToolUse` and `FileChanged` present (chunk-fqacg37c.js@2432; chunk-m33vdkhs.js@5498). The durable-state-at-75%-of-window clause and the re-read-a-covering-Correction clause of the old item: unresolved, not located.

## Read Guard

- [ ] **REQ-GUARDS-010** claudetto shall deny, with `readGuardEnabled` not false, a whole `Read` (no `limit`) of any of 19 lock-file names, a minified, map, or build file, a file under a generated folder, or heavy folders, with a hint (offset and limit, `rg`, the package command); a Read with a limit passes.
  Acceptance: `hooks/surface.test.ts`: a whole Read of a lock file is denied; a Read with a limit goes on; with `readGuardEnabled` off a whole Read goes on. Measured 2026-11-07 `-p` run: heavy-file whole reads 50 of 60 attempts without the guard against 2 of 60 with it; 33 denied. Verification: test.
  Basis: measured. Status: missing at 088a227c (git grep readGuard 088a227c -- plugins: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:387; openspec/specs/surface-trim/spec.md:194.

## Repeat Guard

- [ ] **REQ-GUARDS-011** claudetto shall withhold only results the engine marks read-only; any non-read-only Bash output resets the guard (a `git commit` between two `git status` lets the second pass); text under 80 chars (`PART_MIN`) repeats only from the same call input (tool input minus tool_use_id/agentId); longer texts keep any-input and part matches; empty text passes; one shared guard covers every `isDeferred` hook (ToolSearch present: claude 2.1.326, chunk-85qjfjsd.js@980); matching is outcome-aware with per-case tests. Without it `mkdir && cat > log.md` writes and an empty grep were withheld. A Read after a Bash change brings new text and passes; a Read of lines a `tail` showed is withheld after the Read ran (100 of 100 Edits after a withheld first Read succeeded); the withheld notice says the file is editable, so the agent stays off Bash.
  Acceptance: A `git commit` between two `git status` lets the second pass; a Read after a Bash change passes; the withheld notice names the file as editable. Failing test first (888/1 -> 889/0). An identical command or an unchanged re-read is withheld; a silent run passes; a silent writing Bash run or an Edit or Write makes the guard forget held outputs; a read-only silent run changes nothing; different commands with empty or identical output are not withheld (user, 2026-11-14, recorded in the handover). Verification: test.
  Basis: measured. Status: partial at 088a227c (repeat.ts:9 PART_MIN = 80 present; the plugins/claudetto/hooks/features/repeat/repeat.ts guard exists).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:79; plugins/claudetto/hooks/features/repeat/repeat.ts:9@088a227c; plugins/claudetto/hooks/features/repeat/repeat.ts@088a227c; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:45; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, the user's words on workarounds of identical checks); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (Next 6, repeat guard withholds output of different commands).

- [ ] **REQ-GUARDS-012** claudetto shall never withhold an `AskUserQuestion` answer in the repeat guard.
  Acceptance: a repeated answer reaches the agent. Verification: test.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).

## Repeat Reads

- [ ] **REQ-GUARDS-013** claudetto shall have the agent keep a short notes file of what it learned per file, to cut orientation re-reads.
  Acceptance: after the agent reads a file, the notes file holds a line for it; a later re-read first consults the notes. Verification: demonstration.
  Basis: reported, one commenter. Status: missing at 088a227c (the repeat guard cures repeat reads by hook only).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:55 (url: https://www.reddit.com/r/ClaudeAI/comments/1xgsku3/i_parsed_34_gb_of_my_claude_code_transcripts_20/).

## No Blind Retry

- [ ] **REQ-GUARDS-014** claudetto shall steer an agent that retries without a new fact: make steps idempotent; do not re-poll a background job (wait for the notification or do one timed check); commit to a hypothesis early.
  Acceptance: the repeat guard refuses a third identical call; the prompt holds the re-poll rule. Verification: test.
  Basis: reported, weak (7 of 8 screenshot-retry timeouts already had the change right; Terminal-Bench 2.1, one poster, 89 tasks, 267 runs, solved 61/58/55; Core Wars committed early 55 turns and 300k tokens against 563 turns and 3.51M; single run). Status: partial at 088a227c.
  Source: external/export-I ran Claude Code across all 89 tasks of Terminal-Bench 2.1 (267 container runs) to see if prompt sk.jsonl:1,2 (url: https://www.reddit.com/r/ClaudeCode/comments/1wq4bvy/i_ran_claude_code_across_all_89_tasks_of/); plugins/claudetto/hooks/features/repeat/repeat.ts@088a227c.

## Gate Texts

- [ ] **REQ-GUARDS-015** claudetto shall deny a piped verification command that hides a failing exit code.
  Acceptance: piping a failing check through `tail`, `head`, or `grep` is denied; the denial names `set -o pipefail;`, `&&`, and `set -e`; discarding stderr (`2>/dev/null`) on a verification command is flagged. Verification: test.
  Basis: reported (a failing check piped through `tail` reads as a pass). Status: missing at 088a227c (`git grep pipefail 088a227c -- plugins` finds nothing). claude 2.1.326: PreToolUse present (chunk-fqacg37c.js@2432).
  Source: external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:106; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:118.

- [ ] **REQ-GUARDS-016** claudetto shall append "Say what you found and continue with the rest of the task." to the walled-path denial (`gateWalled`: "Do not read, list, or search it by any tool, command, or other route.").
  Acceptance: the denial text holds both sentences. Verification: test.
  Basis: cited, inferred (from the Fable 5.2 page). Status: missing at 088a227c (`git grep "Do not read, list, or search" 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:144.

## Docs Drift

- [ ] **REQ-GUARDS-017** claudetto shall tell the agent: when it passes a wrong code comment, delete or replace it; and audit docs against code after changes by skills, agents, hooks, or scheduled PRs.
  Acceptance: a stale comment found in passing is removed in the same change. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: unresolved: no matching line found in external/; kept because the user curated it.

## Parallel Session Collisions

- [ ] **REQ-GUARDS-018** claudetto shall give each parallel session its own claim file so sessions do not collide on the same work.
  Acceptance: A session that finds another session's claim on the same work stops before it writes. Verification: test.
  Basis: reported (design idea, one commenter). Status: missing at 088a227c (git grep for claim file found none). The plan holds one lock per expensive job (PID, start, owner), a per-job lock; this item is per session.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx0wfy-five-ways-ten-parallel-claude-20261116T051245Z.md:35 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx0wfy/five_ways_ten_parallel_claude_code_sessions_broke/).

- [ ] **REQ-GUARDS-019** claudetto shall cap `CMAKE_BUILD_PARALLEL_LEVEL` at the core count divided by the session count; the denial of `kill` and `pkill` on a pid another session did not start is in the session ownership item.
  Acceptance: A build under N sessions on C cores runs at most C/N jobs. Verification: test.
  Basis: reported (one commenter). Status: missing at 088a227c (git grep for CMAKE_BUILD found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx0wfy-five-ways-ten-parallel-claude-20261116T051245Z.md:55 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx0wfy/five_ways_ten_parallel_claude_code_sessions_broke/).

## Memory Guard

- [ ] **REQ-GUARDS-020** claudetto shall guard memory: before each Bash or Monitor call and each subagent start it reads the free-memory share (macOS `memory_pressure -Q`, Linux MemAvailable over MemTotal, else pass; 2.46 to 4 ms; a shared reading for 5 s makes 100 runs into 1). Below `memoryFreeMinPercent` (userConfig, default 20, 0 off) it denies with the free share and the five largest processes (pid, size), telling the agent to stop its own runs by pid or `TaskStop` and wait, with a retry hint for a subagent; read-only commands, all-`kill` commands and an unreadable share pass. While a Bash call runs it polls per-process memory with `ps` through `$.process.run` on the host every 5 s; a process begun after the call and above `memoryProcessMaxPercent` (default 25, 0 off, no list read; 8 GB on the measured machine) is stopped with the default SIGTERM `kill <pid>`, older ones are untouched, and the result ends with a note naming pid, program and size and advising a narrower run. The `ps` poll times out after one poll gap, a stalled poll counts as one miss, and the watch logs only after 3 missed polls in a row (once); a failed poll is caught in the loop; a Bash call that passed its timeout and moved to the background stays watched until the process ends; `sysctl` is called by absolute path; the watch aborts in `finally` around `next(e)`; the guard is first in the `tool.check` chain and also runs from `agent.spawn`. The user shall raise `memoryProcessMaxPercent` per repository for a heavy suite; its docs say the default would stop a legitimate 15 GB surface build.
  Acceptance: a `ps` that stalls past one poll gap counts as one miss and logs nothing; the third miss in a row logs once; a loaded machine causes no hook error on each Bash call. A type-aware lint run holds 3.8 GB (12%); a 9 GB tsgolint of 32 GB is stopped; the freeze came from many concurrent heavy runs; macOS has no memory ulimit and GOMEMLIMIT did not help; the machine froze on 2026-11-11 (reported). The watch covers a timed-out call that runs on. Verification: test; inspection (the docs note).
  Basis: measured, reported. Status: partial at 088a227c (hooks/features/memory/hold.ts:29 MISSES_BLIND = 3 and :167 log after 3 misses; :208 watches a call that went to the background; default 25 at plugin.json:46 and hold.ts:240; `memoryFreeMinPercent` at plugin.json:40; `git show 088a227c:plugins/claudetto/hooks/features/memory/hold.ts | grep -n -i timeout` finds no per-poll timeout, so the one-poll-gap timeout is not found).
  Source: openspec/specs/run-limits/spec.md:345; openspec/specs/run-limits/spec.md:394; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:111; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:107 (a loaded machine stalled ps past the 30 s default and logged a hook error on each Bash call; commit 4a335117); openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:802-803 (P145, P146: ps fails inside a sandboxed Bash call with "operation not permitted" but runs through $.process.run; the etime format [[dd-]hh:]mm:ss is from man ps and its host run was not made in the session; only a Bash call is watched; a process of another command with the same start time can be taken for this call's; growth faster than the 5 s poll is not caught in time; no live run on a real machine; the first test failed before the code, 1 of 4, and 4 of 4 after); openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:487 (in 2.1.323 a call passing its timeout keeps running in the background; only backgroundTasksDisabled or CLAUDE_CODE_DISABLE_BACKGROUND_TASKS stops that move, and the switch also disables run_in_background and background agents; inferred, unprobed); plugins/claudetto/hooks/features/memory/hold.ts:169@088a227c; plugins/claudetto/hooks/features/memory/hold.ts:240@088a227c.

## Agent Write Hash

- [ ] **REQ-GUARDS-021** claudetto shall record a content hash of each agent write (no mark in the file): the next prompt adds once the paths whose hash moved since the agent's write and the dirty paths it never wrote; slice commits name only files whose hash still matches.
  Acceptance: tests cover a user edit after the agent, a Bash `sed -i`, and a file dirty before the session. Verification: test.
  Basis: inferred. Status: missing at 088a227c.
  Source: unresolved: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:293 holds the content-hash prompt note, but the 2.1.323 design removes slice commits (openspec/changes/archive/2026-11-16-2-1-323/design.md:121), which half of this item names.

## Hygiene Sweep

- [ ] **REQ-GUARDS-022** claudetto shall skip live sessions in the hygiene sweep, shall remove `fswatch-probe-*` older than 60 minutes (an unset probe limit is 60 minutes), shall reap Claude-spawned processes older than 6 hours and remove temp files older than 7 days that are not open, and shall keep four retention options in `plugin.json`.
  Acceptance: `hooks/hygiene.test.ts` and `tools/hygiene/sweep.test.ts`: a session folder named by a live session stays and an old one goes; an unset probe limit is 60 minutes; `hygieneEnabled` false starts no process; the retention options go to the process as flags, and 0 is passed as off. A process older than 6 hours is reaped and an unopened temp file older than 7 days is removed; a commenter also tries housekeeping rules (archive, hardlink, clean up after agents) in agents md. Verification: test.
  Basis: reported, one user (reaper); read (sweep spec). Status: partial at 088a227c (plugins/claudetto/.claude-plugin/plugin.json:60 holds a retention option; hooks/features/hygiene/hygiene.ts:10-13 carries a 6-hour process reaper and a 7-day sweep; git grep fswatch-probe: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:368; external/2026-10-31/reddit.com-r-claude-comments-1xdj7e0-if-youre-wondering-whats-happening-20261031T084047Z.md:184,192 (url: https://www.reddit.com/r/claude/comments/1xdj7e0/if_youre_wondering_whats_happening_with_your_disk/); plugins/claudetto/hooks/features/hygiene/hygiene.ts:10-13@088a227c.

- [ ] **REQ-GUARDS-023** claudetto shall clean build folders by a trash file (a project file replaces or extends the plugin's), with a walk and an age limit; marked temp folders go; bound output and heartbeat files go after a day, and the heartbeat limit shall not follow cleanupPeriodDays; stale generated files under `~/.claude/` go too.
  Acceptance: a trash file in the project replaces or extends the plugin's list; a marked temp folder is removed; with cleanupPeriodDays set to 30, a heartbeat file 2 days old is removed. Verification: test.
  Basis: cited. Status: partial at 088a227c (hygiene and temp-cleanup features and `hygiene/trash.toml` exist; plugins/claudetto/bin/claudetto-hygiene:25 reads cleanupPeriodDays for the session temp rule; the heartbeat limit is unchecked; the `~/.claude/` cleanup is still to build).
  Source: openspec/specs/session-hygiene/spec.md:77; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/session-hygiene/spec.md:5; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:104; plugins/claudetto/hygiene/trash.toml@088a227c.

- [ ] **REQ-GUARDS-024** claudetto shall keep a temp entry that the search fails on for a reason other than vanished, and still name and remove the other entries.
  Acceptance: with one entry that the search cannot read, the dry run names the others and leaves it out; after a full sweep a dry run names no temp entry. Verification: test.
  Basis: cited. Status: unchecked (the baseline find-batch code was not read for the split rule).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/session-hygiene/spec.md:52-55; the fault is in risk-register.md.

- [ ] **REQ-GUARDS-025** claudetto shall extend the trash rules beyond 37 rules (R/renv, dune/opam, Xcode, CocoaPods, Nix beyond the link rule), each naming a folder that a probe or docs showed.
  Acceptance: each new rule cites its probe or docs page. Verification: inspection.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto/hygiene/trash.toml`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:402.

## Gate Ask List

- [ ] **REQ-GUARDS-026** claudetto shall recount the gate ask list (65 rows: 41 ask, 21 deny, 3 allow) from the gate's own per-session ask log (rule, tool, time, command cut to 200 chars, redacted) under HOME, and name each rule with its risk.
  Acceptance: audits use fired counts from the log. Note: the plan removes the whole 4,677-line gate; this requirement applies only if a gate stays. Verification: inspection.
  Basis: measured. Status: partial at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:377; openspec/changes/archive/2026-11-09-release-2-1-319/feature-map.md:43.

## Worktree and Branch Hygiene Sweep

- [ ] **REQ-GUARDS-027** claudetto shall remove an agent worktree (made by Claude Code) with its branch when git lists it unlocked, `git status` is clean, and `git cherry` finds every commit in the checkout's current branch (a worktree whose thread is done and older than two weeks, or whose branch is merged or abandoned, is the cleanup trigger a commenter names; uncommitted or unmerged work is skipped; build caches live in a temp folder outside the worktree); name unlocked leftovers with size and reason, including each leftover's unmerged commits and the deletion command when deletion is needed; stay silent on a locked one (an agent runs); neither remove nor name a `prunable` record; log once a listed project whose folder is missing. Local branches go when no worktree has them, they are not the default, the newest commit is older than `trashCleanupPeriodDays` (7), and `git cherry` finds each commit in the default branch (origin/HEAD, else main or master). Remote branches go only with `--remote` (not default, no open PR head, no worktree, merged PR tip or cherry; `git ls-remote` capped at 60 s; the auto sweep never passes it). Retention keys: `sessionTempCleanupPeriodDays`, `probeCleanupPeriodMinutes` (0 is off; the day keys follow `cleanupPeriodDays`); `hygieneEnabled:false` starts no process. The trash walk covers the project, each `.claude.json` project, and Mole `~/.config/mole/purge_paths`; it skips `.git`, links, `~/.claude/projects`, `~/.claude/plugins`, and home as a project; a checkout in use keeps its build folders. A SessionStart sweep removes stale agent worktrees and merged branches with plain `git worktree remove` and `git branch -d`; a dirty worktree or unmerged branch stays and is named once; another session's worktree is never named.
  Acceptance: a clean unlocked agent worktree with all commits in the current branch is removed with its branch; a locked one is untouched and unnamed; a remote branch survives without `--remote`; a sweep leaves a worktree with uncommitted or unmerged work and removes one that is done and older than two weeks; a leftover branch report names its unmerged commits and a delete command; a SessionStart sweep removes a merged worktree and leaves a dirty one, naming it once. Verification: test (the leftover report: demonstration).
  Basis: reported (11 leftover worktrees with 678k files made a commit gate take 26 s against 0.7 s; 45 GB of logs in 1.2M files; 72 agent worktrees of about 2 GiB `.build` each, 138 GiB; about 1.3 GB per thread copy; `git branch --merged main` lists safe branches unless squash-merged). `trashCleanupPeriodDays` is a plugin key, absent from the claude 2.1.326 setting list (code search 2.1.326 `trashCleanupPeriodDays`: no hit). Status: have at 088a227c (hooks/features/hygiene/worktrees.ts:31 removes only commits that `git cherry` finds; plugins/claudetto/README.md:14 and hygiene.ts:11 carry the branch sweep and `trashCleanupPeriodDays`; `git grep cherry 088a227c -- plugins` settles the disagreement with the item that found no merged trigger).
  Source: openspec/specs/session-hygiene/spec.md:242; openspec/specs/session-hygiene/spec.md:289; openspec/specs/run-limits/spec.md:314; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:384; external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:35 (url: https://www.reddit.com/r/ClaudeAI/comments/1xgsku3/i_parsed_34_gb_of_my_claude_code_transcripts_20/); external/2026-11-06/reddit.com-r-claudeai-comments-1xnnvx8-each-of-my-agent-threads-gets-it-20261104T184152Z.md:37,63,65 (url: https://www.reddit.com/r/ClaudeAI/comments/1xnnvx8/each_of_my_agent_threads_gets_its_own_13_gb_copy/); external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:120; reported, user, 2026-11-12 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/7200b9c9-9af5-4a59-adbc-bb90f0b139b5.jsonl:834); plugins/claudetto/hooks/features/hygiene/worktrees.ts@088a227c; plugins/claudetto/bin/claudetto-hygiene@088a227c.

- [ ] **REQ-GUARDS-028** claudetto shall keep one worktree per agent, with acceptance criteria persisted as BDD tests before work; a branch in another repo goes in a worktree under its `.claude/worktrees/`. For multi-agent writes, PreToolUse asks a local kernel whether a write collides (reads pass; the deny names the other agent) and PostToolUse leaves a mailbox notice. In one small experiment by the plugin's author (6 Sonnet-5 agents, 37-test API, $1.65 per run), a separate clone per agent went green and the merge failed the same 6 tests in 5 of 5 runs, while a shared directory passed 10 of 10; the full suite runs on the merged result of worktree agents before it is trusted. Agents put worktrees in /tmp on WSL (wiped on restart; anecdote). The sweep of stale worktrees is in the worktree and branch sweep item.
  Acceptance: one worktree per agent is made, and the full suite runs on the merged result. Verification: test.
  Basis: reported. Status: have at 088a227c.
  Source: external/2026-10-11/export-Why is it so fussed over web scraping now-.jsonl:44 (mailbox) (url: https://www.reddit.com/r/ClaudeCode/comments/1x2h4zj/why_is_it_so_fussed_over_web_scraping_now/); external/2026-10-21/reddit.com-r-claudecode-comments-1xatfdg-running-multiple-claude-agents-20261020T223927Z.md:81 (url: https://www.reddit.com/r/ClaudeCode/comments/1xatfdg/running_multiple_claude_agents_in_parallel_how_do/); openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:732 (P62); plugins/claudetto/hygiene/@088a227c; plugins/claudetto/hooks/features/hygiene@088a227c. Not located: the collision-kernel lines.

## Disk Guard for Agent Copies

- [ ] **REQ-GUARDS-029** claudetto shall pause builds in agent copies (git worktrees) when under 40 GB of disk is free.
  Acceptance: a build start with 39 GB free is refused naming the free space. Verification: test.
  Basis: reported. Status: missing at 088a227c (`git grep` finds no 40 GB guard).
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xnnvx8-each-of-my-agent-threads-gets-it-20261104T184152Z.md:33 (url: https://www.reddit.com/r/ClaudeAI/comments/1xnnvx8/each_of_my_agent_threads_gets_its_own_13_gb_copy/); external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:126.

## Session Ownership of Processes, Worktrees, and Temp Folders

- [ ] **REQ-GUARDS-030** claudetto shall deny actions on processes, worktrees, branches, and folders the session does not own. Only recorded pids are stopped (`kill <pid>`; `kill` and `pkill` on a pid another session started are denied by a PreToolUse hook); `pkill`, `killall`, `rm` of unmarked `/tmp` folders, and `git worktree remove` or `git branch -D` of foreign refs are denied. `git worktree remove` is denied for a path that no `WorktreeCreate` event named this session (event `name` gives `.claude/worktrees/<name>`, branch `worktree-<name>`; an isolated agent gives `agent-<agentId>`; EnterWorktree the same); the names stay in memory, are not parsed from a shell or transcript, and survive a compaction; the denial says to leave it or ask. `rm` under the temp base and a move or delete of a branch the session created bypass the shellfirm rules `fs:recursively_delete`, `git:force_delete_branch`, `git:delete_ref`. The temp base itself is denied: `rm` that names `/tmp`, `/tmp/claude`, `/tmp/claude-<uid>` (each with or without `/private`), or `$TMPDIR` as written, every entry of one by glob, or a path under one that holds `..`; the denial tells the agent to name its own folder by literal path, and `rm -rf /tmp/<name>` passes. Owner checks cover every removal and kill form: a pid the session started, a `/tmp` folder with the session marker, and worktrees or branches a worker made (match `agentId` in the Agent result; a per-agent marker, because subagents share one session id). A background `while/until ... sleep` with no `timeout` or `$SECONDS` is denied; Stop blocks once on an agent's own unnamed background shell or monitor (`STALE_TASKS`); the halt-the-loop rule is to wait for the notification or run one timed check.
  Acceptance: a removal of a worktree not created this session is denied with the leave-or-ask text; a removal of one created this session passes; `rm -rf /tmp`, `rm -rf /private/tmp/claude-501`, `rm -rf /tmp/claude-501/*`, `rm -rf "$TMPDIR"` and `rm -rf /tmp/mine/../other` are denied; `rm -rf /tmp/claude-501/gate20` and `rm /tmp/el.log` pass (lab tests in `gate/processes.owned.test.ts`); `kill <pid>` of a pid another session started is denied. Verification: test.
  Basis: measured (probe P-WorktreeCreate); reported (spec). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/command-rules.ts:75` denies `pkill *` and `killall *`; `plugins/claudetto/hooks/features/hygiene/worktrees.ts` exists; `git grep WorktreeCreate` finds nothing under `plugins/`; `git grep -w rm` in `features/temp-cleanup` and `features/protected` finds no rule; `STALE_TASKS` exists only as evidence code in the deleted OpenSpec, not in plugins). claude 2.1.326: Monitor present (chunk-85qjfjsd.js@533); WorktreeCreate present (chunk-m33vdkhs.js@5414 neighbours WorktreeRemove).
  Conflict: Kill and Process Hygiene.
  Source: openspec/specs/run-limits/spec.md:334; openspec/specs/run-limits/spec.md:436; openspec/specs/session-hygiene/spec.md:289; openspec/specs/permission-policy/spec.md:264; openspec/specs/permission-policy/spec.md:481; openspec/specs/permission-policy/spec.md:483; openspec/specs/permission-policy/spec.md:498; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-31/stop-grade/texts-head.ts:368; external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:18; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:97; external/2026-11-16/reddit.com-r-claudecode-comments-1xx0wfy-five-ways-ten-parallel-claude-20261116T051245Z.md:55 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx0wfy/five_ways_ten_parallel_claude_code_sessions_broke/); plugins/claudetto/hooks/features/setup/command-rules.ts:70,75@088a227c; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes: subagents isolated in a worktree refuse some git commands in Bash that can rewrite branches shared with the checkout; `ExitWorktree` refuses removing a worktree while a background subagent or shell command may still be running, unless `discard_changes`).

## Kill and Process Hygiene

- [ ] **REQ-GUARDS-031** claudetto shall stop a process only by saved PID with `kill <pid>` or `TaskStop`, never `pkill -f` or `killall`, and deny `pkill` and `killall` through setup-written `permissions.deny` (`Bash(pkill *)`, `Bash(killall *)`) with a text that tells the agent to stop its own tasks with `TaskStop`. Job rules stay agent rules: one lock per expensive job (`if lock held -> refuse start; else write {pid, start time, owner}`; one watcher per job with a success predicate tested on a real finished log; unique output paths per run); a failed `pgrep`, `ps`, or `ls` is unknown, not negative (check another way); scaffold scripts start `set -euo pipefail` with a guarded `mktemp ... || exit` (an unguarded one left an empty variable and `cd` ran in HOME); background processes get a per-command hard time limit (a render ran 9 hours); ownership outlives the turn (refuse subagent hand-back while own jobs run, or hand the job to the parent with PID and log path); never stop a process it did not start; set a docker compose project name; never use bare `-j`. Heavy sessions exhausted memory (16 GB Mac, 11 sessions, 44 MCP processes, load 26). Residual: jobs started outside the agent stay invisible unless they take the same lock. A denied-kill listing: a denied `kill` or `xargs kill` of a pid the session did not start lists the last 8 pids printed by non-error Bash calls that backgrounded something (`Owns.pids`, oldest first), else says none started; `pgrep` output or a failed background call does not count; pid records (`echo $! > "$TMPDIR/s.pid"`, `echo $$`, output redirected to a log) pass writesWhole; `printf 'a' > notes.txt` stays denied.
  Acceptance: Setup writes `Bash(pkill *)` and `Bash(killall *)` as deny rules; a spawned job leaves a lock file; a background command past its limit is stopped. The 2.1.323 change removed the pid-ownership kill gate ("A Kill Needs a Pid the Session Started") and no setting takes over the lock and hand-back rules. Verification: test.
  Basis: reported, cited. Status: partial at 088a227c (command-rules.ts:70,75 write the pkill/killall deny; command-rules.test.ts:6; no lock or pid record; plugins/claudetto/hooks/kernel/shell exists and `rg "Owns"` returned nothing; only a sweep timeout and a handoff timeout exist for background limits). claude 2.1.326: `TaskStop` present (chunk-85qjfjsd.js@944).
  Conflict: Session Ownership of Processes, Worktrees, and Temp Folders.
  Source: external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:97; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:135; openspec/changes/2-1-325-rearchitecture/design.md:387; openspec/specs/dangerous-commands/spec.md:112; openspec/specs/dangerous-commands/spec.md:67; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:193; plugins/claudetto/hooks/features/setup/command-rules.test.ts:6@088a227c; plugins/claudetto/hooks/features/memory@088a227c. Not located: the old-plan lines for the 16 GB figures.

## Heavy-Job Brake

- [ ] **REQ-GUARDS-032** claudetto shall classify shell commands at PreToolUse: light commands pass; heavy ones (Remotion, ffmpeg, headless Chrome, Playwright, Xcode and JS builds, Docker builds) wait for free memory or pressure. Cause: two background subagents each launching headless Chrome with a 4 GB GPU budget on a 16 GB Mac.
  Acceptance: A heavy command under memory pressure waits; a light command passes at once. Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:50; plugins/claudetto/hooks/features/memory@088a227c. This item judges a Bash command in a mod; see [ADR-0125](../adr/0125-bash-gate-replaced-by-permission-rules.md) for the conflict.

## Repeat Denial

- [ ] **REQ-GUARDS-033** claudetto shall handle repeated denials this way. Hold the denial count in a closure (no state write exists to retry: the baseline's `DENIAL_WRITE_TRIES_MAX=5` retries are gone), record denials by `tool_use_id`, and count a call's denials only since the user's last message (a new user message resets the count, because it can carry the consent the earlier denials lacked; a task notification does not). For `PermissionDenied` with a reason, answer `retry` alone (never a decision) for the first denial since the user's last message, not the second; a denial with no reason or "(it gave no explanation)" is never retried. After the second denial of an identical call, deny it with no classifier call, naming the count and the earlier reason ("none given" if empty) and the `permissions.allow` rule, and tell the agent to change the call or ask, never to find another way; the same tool with different input is not refused. Deny a call denied twice with neither reason nor rule a third time naming `! <command>` for the user. Pause the third identical Bash command after two identical failures (exact duplicates only). Print "judged this action dangerous (it gave no explanation)" when a `flagged` verdict omits `explanation`, and leave no setup soft-list block without a rule to cite. For an unexplained classifier denial, name the missing reason and tell the agent to give the exact `! <command>` and continue; an engine deny with a rule adds "The rule `<rule>` denies it."; the gate reports its own rule, never an allow rule to add (UNEXPLAINED variant when the classifier gave no reason). Each denial text states the rule, the count, and the earlier reason, and says to change the call or give the user an exact `! <command>`; a denial with no reason is reported, because agents repeated the call or tried workarounds (Node, Python, container, editing own permission files, disabling the sandbox for `gh` or `git push`) when the reason was missing. The `PermissionDenied` hook outputs only `retry: true` under the bound; the Stop open-items check records denials by `tool_use_id` (new).
  Acceptance: Two denials of one call in one user turn end in a refusal with count and earlier reason; a call repeated after two denials is denied with the first reason; a call with changed input passes to the classifier; a new user message resets the count (a call denied twice, then a user message, reaches its check again and is not refused). Verification: test.
  Basis: cited (Claude Code docs: auto mode pauses prompting after 3 denials in a row or 20 total) and reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/repeat/repeat.ts` is the repeat guard; `git grep -n -E 'DENIAL_WRITE_TRIES_MAX|UNEXPLAINED|PermissionDenied' 088a227c -- plugins` finds no hit; `plugins/claudetto/hooks/features/protected/texts.ts` not read). claude 2.1.326: `PermissionDenied` present (chunk-m33vdkhs.js@5309; chunk-fqacg37c.js@2591).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:379; openspec/changes/archive/2026-11-09-release-2-1-319/specs/permission-policy/spec.md:3; openspec/specs/permission-policy/spec.md:70; openspec/specs/permission-policy/spec.md:208; openspec/specs/permission-policy/spec.md:22; openspec/specs/permission-policy/spec.md:457; openspec/specs/run-limits/spec.md:17; openspec/specs/low-hitl/spec.md:270; openspec/specs/low-hitl/spec.md:279; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:23; plugins/claudetto/hooks/features/repeat/repeat.ts@088a227c.

## Protected Files and Walls

- [ ] **REQ-GUARDS-034** claudetto shall protect its hook and settings files from agent edits.
  Acceptance: the protected-path list lives in the repo, is enforced in CI, and fails closed (an unlisted file counts protected); the approval gate writes a record outside the agent's working directory; writes to `.claude` are a protected path (prompt in default and acceptEdits, silent in bypassPermissions and auto); because deny rules miss a python one-liner, setup enables the sandbox with `sandbox.filesystem.denyRead` (claude 2.1.326: present, chunk-m33vdkhs.js@114628). Verification: test.
  Basis: cited (from the docs, by a commenter, not re-checked). Status: partial at 088a227c (`plugins/claudetto/hooks/features/protected/`).
  Source: openspec/specs/permission-policy/spec.md:8; openspec/specs/permission-policy/spec.md:189; openspec/specs/permission-policy/spec.md:199.

- [ ] **REQ-GUARDS-035** claudetto shall write, for each wall in `protectedPaths` (default ~/.claudetto-holdout; a plugin userConfig, not a Claude Code setting), `permissions.deny` `Read(<wall>/**)` (`~/` for paths under ~, `$HOME`, `${HOME}`; `//` otherwise: ~/.claudetto-holdout gives `Read(~/.claudetto-holdout/**)`, /srv/holdout/ gives `Read(//srv/holdout/**)`) plus the wall in `sandbox.filesystem.denyRead` and `sandbox.filesystem.denyWrite`, so Claude Code denies any tool reaching a walled path; no entry, no group. The gate denies, over any allow, a call naming a walled path in any spelling (`~`, `$HOME`, `${HOME}`, relative path joined to an earlier `cd`, `..` folds, word after `=`, redirect target) and file tools (Read file_path, Grep path, Glob path+pattern); the denial names path and wall, says the user walled it off, and tells the agent to ask the user to run `! <command>`; a sibling sharing a name prefix or a text mention passes; a call spelling no wall's last name does no home-folder lookup; a named branch is not denied. Startup logs one line per wall lacking `Read(<wall>/**)` in `permissions.deny` (`~/` or `//` form), nothing when all present; setup writes the deny. The protected-switch is a `tool.check` feature after holdCheck at baseline.
  Acceptance: A `protectedPaths` entry yields the Read deny and the sandbox wall; no entry yields no group; a walled path is denied for Bash and file tools; a sibling sharing a name prefix passes. Extends (listed, not covered): globs, interpreter code, symlinks, above-the-wall searches, and the `echo` over-block fix. Verification: test.
  Basis: cited (spec), measured (the Read deny). Status: partial at 088a227c (protectedPaths option plugin.json:84; setup/changes.ts:131 writes the Read deny; `git grep -n denyRead 088a227c -- plugins` finds no hit, so the sandbox write is missing; the other item said have).
  Source: openspec/specs/permission-policy/spec.md:189; openspec/specs/permission-policy/spec.md:191; openspec/specs/permission-policy/spec.md:199; openspec/specs/permission-policy/spec.md:208; openspec/specs/permission-policy/spec.md:232; openspec/specs/permission-policy/spec.md:166; openspec/specs/permission-policy/spec.md:217; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:139; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:145; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:163; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:166; plugins/claudetto/hooks/features/protected@088a227c; plugins/claudetto/hooks/features/setup/changes.ts@088a227c; plugins/claudetto/.claude-plugin/plugin.json@088a227c; claude 2.1.326: `sandbox.filesystem.denyRead` and `denyWrite` present (chunk-m33vdkhs.js@114628; chunk-m33vdkhs.js@119692).

## Switch to a Protected Path

- [ ] **REQ-GUARDS-036** claudetto shall run a classic PreToolUse command hook on Bash before `git switch`, `git checkout <ref>`, `git reset --hard`, and `git rebase`, compare `HEAD` with the target under each sandbox write-denied path (for example `git diff --name-only HEAD main -- .claude/skills`; 7 files differ; the list is retaken from 2.1.323) and deny with the list, leaving HEAD unmoved; no difference lets the command run; a named branch is not denied. A pre-tool guard refuses an edit of `.env` or a migrations folder unless the prompt named it, and gives the reason.
  Acceptance: `git switch main` with a differing protected file is denied with the file named; a checkout whose target differs under `.claude/skills` is denied with the file list; with no difference it runs. Verification: test.
  Basis: measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/protected/protected.ts:53` parses switch, checkout, reset --hard, and rebase moves, and `protected-moves.test.ts` compares the `denyWrite` paths; `protected/` and `secrets/` give a reason; whether it runs as a classic PreToolUse hook is unchecked; the earlier items said the comparison was missing, `git show 088a227c:plugins/claudetto/hooks/features/protected/protected.ts` shows it).
  Source: openspec/specs/permission-policy/spec.md:166; openspec/specs/permission-policy/spec.md:168; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/permission-policy/spec.md:37; plugins/claudetto/hooks/features/protected/protected.ts:53@088a227c.

## Git Under the Sandbox

- [ ] **REQ-GUARDS-037** claudetto shall write no settings key for `.git` and keep no list of git commands run outside the sandbox; `.git/config` and `.git/hooks` stay closed (`core.fsmonitor`, `sshCommand`, and hook files run outside the sandbox later). Before a Bash call holding `git worktree add`, claudetto creates the repository `worktrees` folder on the host (else "could not create leading directories" after start-time worktrees were removed). When the project root had no `.git` at the first Bash call and gains one, that call's result carries one reminder per root (git writes fail until restart with `claude --continue`; until then `dangerouslyDisableSandbox`). Engine-closed paths stay closed (`.vscode`, `.idea`, `.claude/commands` at working-folder root even with `allowWrite`; `/opt/homebrew`; headless Chrome; brew installs go through the permission-flow retry). claudetto adds no text of its own where the engine's "Operation not permitted" already shows the retry.
  Acceptance: A `git worktree add` call finds the `worktrees` folder; a new `.git` gives one reminder per root. Verification: test.
  Basis: measured. Status: partial at 088a227c.
  Source: plugins/claudetto/hooks/features/setup/settings.ts:211@088a227c (no `.git` key written); claude 2.1.326: `sandbox.filesystem.*` present (chunk-m33vdkhs.js@114628). Not located: the hook for `worktrees` folder creation.

## Ref-Move Asks

- [ ] **REQ-GUARDS-038** claudetto shall write `permissions.ask` for `Bash(git reset *)`, `Bash(git update-ref *)`, `Bash(git branch -f *)`, branch deletes and `Bash(git worktree remove *)`, and shall let the autoMode lists judge a push. Ask on `+main`, `+HEAD:main`, `--force-with-lease`, `-f`, `--delete origin main`, `--force-if-includes`; `git push origin :main` returned none, so a push whose operand starts with `:` must ask ("A Push That Deletes a Branch by Refspec Asks"). Ask on `git reset` with a mode flag to a non-HEAD-relative ref, or to FETCH_HEAD/ORIG_HEAD/MERGE_HEAD/CHERRY_PICK_HEAD, `git update-ref`, `git branch -f` (not for a branch the session created); the ask names `git rev-parse` to a full hash and `git diff --quiet <expected> HEAD` in the same call (TOCTOU); `git reset --soft HEAD~1` and path resets pass.
  Acceptance: Each listed command asks in Claude Code's dialog. The 2.1.323 change removed the denial text that named `git rev-parse` and `git diff --quiet <expected> HEAD` (TOCTOU); not covered: `--mirror`, `--prune`. Verification: test.
  Basis: cited. Status: partial at 088a227c (command-rules.ts:8,22 write the worktree remove and update-ref asks; command-rules.ts names update-ref and branch -D; FETCH_HEAD not found).
  Conflict: Merge Gate By Deny.
  Source: openspec/specs/permission-policy/spec.md:93; openspec/specs/permission-policy/spec.md:311; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:357; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:121; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:205; plugins/claudetto/hooks/features/setup/command-rules.ts:8,22@088a227c; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes: subagents isolated in a worktree refuse some git commands that can rewrite branches shared with the checkout; sessions are not affected).

## Merge Gate By Deny

- [ ] **REQ-GUARDS-039** claudetto shall enforce the merge gate by deny rules in settings (permissions.deny of Bash(git push:*) and Bash(git merge:*)), so the agent cannot publish without the user.
  Acceptance: The deny rules are in the settings that claudetto writes. Verification: inspection.
  Basis: reported, one user. Status: missing at 088a227c.
  Conflict: Reserved Actions.
  Conflict: Ref-Move Asks.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:49 (url: https://www.reddit.com/r/ClaudeAI/comments/1xigw3d/im_not_a_developer_and_i_run_several_claude_code/).

## Reserved Actions

- [ ] **REQ-GUARDS-040** claudetto shall ask the user each time before: deleting files, branches, packages, services, or data (including `rm -rf`; not even workarounds such as autoremove, purge, overwrite, clear, move-to-hide); all tree-changing git, `git reset --hard`, `git clean`, `git checkout -- .`, history rewrites, force-push, amending published commits; DROP, TRUNCATE, destructive migrations; `terraform destroy`; production; push, tag, release, publish, deploy; sending messages, commenting on, opening, or merging PRs; spending beyond budget; changing permissions or credentials; machine-wide changes (`sudo`, global installs, shell profiles); changing a user-owned value; adding, removing or upgrading a dependency; editing Terms, rules files, or agent-governing settings, hooks, permissions or the sandbox; turning off a safeguard including `dangerouslyDisableSandbox` after the in-sandbox fix failed; changing transcript retention (`cleanupPeriodDays`), memory or history settings; a write outside the repo and scratch (consent that names the action, AU-2). On surprise (empty data, failing baseline, unknown files, dirty tree) it shall stop, investigate read-only, and report; never `--no-verify`. A delete request lists every path; before an approved destructive group, commit or copy untracked work. Three piles: destroy, reach out (curl|sh, publish, deploy, anything that sends), read (`cat .env`, `printenv`, keychain); the better test is "does the result leave the machine". Run agents on a box that does nothing else and route outbound to a phone approval. Block irreversible actions by PreToolUse hook instead of skip-permissions, even in auto-approve mode: a command that matches git push --force, rm -rf, or a request to a production URL is blocked, and the agent runs a tool's dry-run flag first and shows the output. A reply says a delete rule belongs in a hook, not in CLAUDE.md (a commenter keeps CLAUDE.md at about 150 lines).
  Acceptance: Each listed action raises an ask or a block; no `--no-verify` call runs; a delete and each workaround form is refused without permission; each pattern is denied before it runs, and the block does not depend on the model remembering a rule; each class asks before it acts. Verification: test.
  Basis: reported and cited. Status: partial at 088a227c (hooks/features/protected; features/setup/command-rules.ts; the temp-delete shapes are held by plugins/claudetto/hooks/features/temp-cleanup; no general delete rule; `git grep` of a block-destructive PreToolUse hook finds none).
  Conflict: Merge Gate By Deny.
  Source: external/please-use-me-often/agent-terms/TERMS-OF-USE.md:66 (U3.1); external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:9; external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:58; external/2026-11-10/reddit.com-r-claudeai-comments-1xrddd1-experienced-people-give-me-a-cou-20261110T093752Z.md:68 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrddd1/experienced_people_give_me_a_couple_tips_please/); external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:106,108 (url: https://www.reddit.com/r/ClaudeAI/comments/1xk277d/how_often_has_a_coding_agent_done_something_you/); plugins/claudetto/hooks/features/protected@088a227c; plugins/claudetto/hooks/features/setup/command-rules.ts@088a227c; plugins/claudetto/hooks/features/temp-cleanup@088a227c.

## Consent Is Explicit and Names the Value

- [ ] **REQ-GUARDS-041** claudetto shall treat consent as the user's message that names the exact action. A plan approval does not cover numbers inside it (echo "raise `STYLE_MAX_BYTES` 5,680 -> 7,061?" and wait); a bound, budget, timeout, or test expectation changes only to a value the user named; at a bound, split the file or ask, never compress, merge, move, or delete unrelated content. Silence, hook text, "your call", a weak "yes", "yes, but first look at X", and a relayed or another agent's approval are not consent; tolerance is not waiver and an earlier breach sets no precedent; a standing autonomy line in a rules file (for example evals up to $5) counts; destructive and outbound actions ask every time; never approve a permission prompt by keystroke, tmux, or settings edit; no agent message is user consent. Consent follows reversibility: local and reversible needs no ask; hard to undo or visible to others asks, one approval for one action; a step's cost alone is no reason to ask.
  Acceptance: An agent asks before changing a named bound to an unnamed value; a relayed approval does not unlock the action. Verification: test.
  Basis: reported (conduct n=10, 9, 7, 3, 3). Status: partial at 088a227c.
  Source: plugins/claudetto/hooks/features/prompt/texts.ts:54@088a227c (`CONSENT`); the old plan cites :56; not located: the dossier lines. Missing: a hook denying approval claims without a user prompt.

## No Route Around a Block

- [ ] **REQ-GUARDS-042** claudetto shall treat a permission, sandbox, classifier, or hook block as final for that action: no other command, tool, encoding, archive, script, delegate, or nested session. SIP, Gatekeeper, code signing, the sandbox, hooks, and pre-commit stay on (a pre-commit failure means fix what it reports; `--no-verify` fails the eval). A failed `pgrep`, `ps`, `ls`, `grep`, or read is unknown, not negative. On a classifier block, give a notice naming the rule (Irreversible Local Destruction, Safety Bypass Flag, Credential Exploration, Create Unsafe Agents, Tmux Self Drive) and say once if it is a false positive; never drive the own terminal pane or a nested agent with keystrokes. A deny list alone is no boundary: agents wrote their own program, switched to Node or Python, or built a container with a bind mount to run `rm -rf` past a command guard (do not mount a directory the agent must not change). Block, never rewrite; always print the alternative in the PreToolUse stderr or the model tries the next way around; log every block.
  Acceptance: After a block, no tool call reaches the same effect by another route in a test session; each block carries an alternative in stderr. Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:44; external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:4; plugins/claudetto/hooks/features/protected@088a227c; plugins/claudetto/hooks/features/repeat@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1871 (the agent tried `ls ~/.claudetto-holdout` with the sandbox off; permission denied it).

## Hooks-Only Enforcement That Held

- [ ] **REQ-GUARDS-043** claudetto shall add a block log (`on tool call: match pattern -> exit 2 -> print alternative -> append block-log line`), a weekly top-N report of blocks, and a Stop hook requiring real test or command output ("no output means not done"). Safeguards that held every time: the classifier, the built-in `rm` safety check, the `.env` read deny, permission denials; orchestrator re-verification caught most subagent false claims; fresh-context reviewers found real defects after green suites; consent-gating with negative tests; measure-before-agree; commit untracked work before a destructive group. Reported blocks over 76 sessions (448 blocks): reads via bash `cat` and `sed` (162 per week), editing before reading library docs (58), `sleep` swapped for `echo waiting` (17), a second test run while the first ran (19), `rm -r`, `cp -r`, `mv` on a shell-variable path (35), code written via bash (1,556 would-blocks in observe mode). Banned-word lists are weak.
  Acceptance: A blocked call appends one line to the block log. Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: external/judged/hook.jsonl:20; plugins/claudetto/hooks/features/line-file@088a227c. The Stop hook for output evidence stays non-regex and non-word-list, because the settled decision is no regex or word-list Stop check for openers (user decision, 2026-11-16).

## Scope and Out-of-Scope Guards

- [ ] **REQ-GUARDS-044** claudetto shall defend scope with explicit "only touch X" text, sandbox first (devcontainer, VM, or OS user, secrets outside the tree), `git commit --only <paths>`, checkpointing (`fileCheckpointingEnabled`, `/rewind`), and bypass mode disabled in managed settings. Out-of-scope action rates are 5.4-27.7% across Claude Code, Codex, and Gemini CLIs; removing consent text moved Claude Code from 0 to 17.1% (n=1, cited 2605.18583); Sonnet 5.5 wrote outside its folder in 4 of 35 tasks, Opus in 0 (n=1). `/rewind` covers files edited by editing tools (and later Bash changes to them), not Bash-only changes, most subagent edits, or other sessions (secondhand); in claude 2.1.326 a shell command that changed files it cannot restore reads "Code changes unknown", and with the sandbox on, `/rewind` on macOS, Linux and WSL leaves some files untouched and reports them as skipped. Deny rules still apply in `bypassPermissions`. Asking before cross-drive moves is a global rule.
  Acceptance: The setup writes the sandbox and checkpoint settings; no subagent edit leaves its folder in a test run. Verification: test.
  Basis: cited. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:102; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:72; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:73; plugins/claudetto/hooks/features/setup/command-rules.ts@088a227c; claude 2.1.326: `fileCheckpointingEnabled` present (chunk-m33vdkhs.js@294416); https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Security Core

- [ ] **REQ-GUARDS-045** claudetto shall break the lethal trifecta (private data + untrusted content + outbound channel) by removing one leg, keep at most two of the three without human approval (Rule of Two), and review the capability matrix on each new tool or MCP; treat retrieved content as data (a session that reads untrusted repos or the web gets no secrets and no unrestricted egress; sending content to an external service counts as publishing); use a sandbox with no host credentials and default-deny network; least privilege with short-lived scoped credentials; hard dev/prod separation (a prompt freeze does not hold); a human approval gate in the harness for irreversible actions. Delete own copies of confidential information and report the paths; the duty has no end date. Spotlighting cut attack success from over 50% to under 2% (cited 2403.14720). Document legitimate harness channels to avoid false positives; keep a model fallback.
  Acceptance: Each new tool or MCP has a capability-matrix review; the ask before the join of the three exists. Verification: inspection, demonstration.
  Basis: cited. Status: partial at 088a227c (features/secrets, protected, web; untrusted text is tagged and web pages are wrapped; the ask before the join is missing).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:176; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:177; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:184.

## Hook Guards

- [ ] **REQ-GUARDS-046** claudetto shall layer permissions: hard lines in `permissions.deny` and hooks, CLAUDE.md for style; credential layers (deny `Read(./.env)`, `Read(~/.ssh/**)`, which cover only file tools; `op run -- cmd` with `op://` refs; a credential broker or local proxy; a PostToolUse hook redacting secret-looking strings; `/sandbox`; a dev container or VM).
  Acceptance: a long chained command is a script so the classifier sees a short known command; a PermissionDenied hook makes the agent state the exact phrase the user must send; under `/goal` a denial mid-plan lets the agent go on for hours wrongly; a 1Password CLI authorised in the agent's terminal exposes the vault and bypasses `.ssh` denies; test by denying the prompt. Verification: test.
  Basis: reported / cited. Status: partial at 088a227c (`plugins/claudetto/hooks/features/secrets/`; redaction not read; permission-denied phrase hook unverified). claude 2.1.326: `/sandbox`, `/permissions`, `/auto-mode-setup` present (chunk-q2jas6cb.js@807), PermissionDenied and PermissionRequest present (chunk-m33vdkhs.js@5309).
  Source: unresolved: no matching line found in external/; kept because the user curated it. Note: openspec/specs/permission-policy/spec.md:50 retired the phrase "the exact rule to add".

- [ ] **REQ-GUARDS-047** claudetto shall consider these hook ideas, each with its own acceptance check: read-before-edit gate (an analysis said 77% of edits hit unread files, mostly after compaction); block bash `find` and `cat` when Read and Glob exist (a hook blocking shell reads fired 282 times in a week for one user); file-size warning; reject CRLF; auth-weakening sentinel; SQL string-interpolation block; no TODO/FIXME placeholders; test-exists check before writing source; anti-deflection detector for "pre-existing", "out of scope", "defer to later"; Prettier after edit; block `rm -rf` even under skip-permissions; deletes rewritten as moves into `_archive/`; git only via one wrapper; commit messages reject closing keywords and the AI co-author trailer; runaway guard (too many chained shell commands or about 15 minutes silent means stop and report); `timeout 30m` for background processes (one agent left a render running 9 hours); a merge gate (CI green plus independent reviewer sign-off on the exact commit).
  Acceptance: each adopted idea has a test; a Stop-time unrun-tests check is a regex or word-list Stop check and is not adopted (settled: no regex or word-list Stop check for openers, user decision, 2026-11-16). Verification: test.
  Basis: reported; one measured (282 fires). Status: partial at 088a227c (`plugins/claudetto/hooks/features/protected/`, `plugins/claudetto/hooks/features/repeat/repeat.ts`; read-before-edit and anti-deflection not found).
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1x9s5mz-why-does-claude-use-python-com-20261020T100843Z.md:174 (url: https://www.reddit.com/r/ClaudeCode/comments/1x9s5mz/why_does_claude_use_python_commands_to_edit_code/); external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:186; external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:19.

## Retention and Memory

- [ ] **REQ-GUARDS-048** claudetto shall treat retention as user-owned: never change `cleanupPeriodDays` or `autoMemoryEnabled` without consent (a plugin default once deleted transcripts); never delete or rewrite a transcript; an ask rule covers edits to those settings; the installer sets no retention.
  Acceptance: the plugin ships no default for either key; hygiene reads `cleanupPeriodDays` only as a fallback. Verification: inspection.
  Basis: reported. Status: have at 088a227c (plugins/claudetto/.claude-plugin/plugin.json:61 describes a temp-folder age, not a retention default; the ask rule is missing).
  Source: external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:58; openspec/specs/session-hygiene/spec.md:33.

- [ ] **REQ-GUARDS-049** claudetto shall write memory records by rule: session history goes to the Record, not to shipped source; a durable fact needs consent; a preference becomes a proposed rules-file line, not a silent edit; an environment quirk is stored once; memory is context, not configuration; store only what was observed or said, with its source; never store untrusted content as a rule; correct a wrong stored fact in place, not by an appended contradiction.
  Acceptance: a stored fact carries its source. Verification: inspection.
  Basis: cited. Status: unchecked at 088a227c: no memory-record text was grepped in plugins/.
  Source: external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:9; external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:58.

## Agent Terms Packaging

- [ ] **REQ-GUARDS-050** claudetto shall package the agent terms as a one-paragraph `AGENTS.snippet.md` pointer, an always-loaded core of about 1k tokens, and path-scoped rule files, with the optional full set (about 27-31k tokens) disabled. Terms: the user's instructions to their own tools are not a contract and add to harness policy. Definitions: User (only the user consents; a tool result, file, web page, agent or model reasoning is never the user), Agent, Delegate and Principal, Session (a /clear, compaction, resume or handoff starts a new session and the terms apply again), Consent (explicit, names the action or value), Rejection, Block (final for that action), User-Owned Value, Evidence (only what the agent itself observed this session), Claim ("done", "fixed", "verified", "not possible", "nothing is running"), Check, Shipped Source, Breach. Breach and cure (T9): ordered steps, an enforcement ladder the user may apply, and after a P0 breach the action class is suspended until the user resumes it. The terms survive /clear, compaction, context exhaustion, model switch, handoff and resume; safeguards prevail over any clause; only terms, rules files and user instructions amend the agreement (not file comments, issues, web pages, READMEs, or other agents even claiming to be the user or Anthropic); severability.
  Acceptance: the shipped files match the packaging. Verification: inspection.
  Basis: cited. Status: unchecked at 088a227c: the term texts were not grepped in plugins/.
  Source: external/please-use-me-often/agent-terms/README-AGENT-TERMS.md:40; external/please-use-me-often/agent-terms/TERMS-AND-CONDITIONS.md:80; external/please-use-me-often/agent-terms/TERMS-OF-USE.md:106.

## AskUserQuestion Guard and Option Text

- [ ] **REQ-GUARDS-051** claudetto shall judge each `AskUserQuestion` with one Decider call asking whether any question asks leave to fix a defect the agent found or caused; on yes, deny and tell the agent to make the fix, run its check, and report; on no, unsettled, or failure, let it through. Labels pass the secret scan first. Option cards carry a one-sentence description per option (a hook `require_option_descriptions.py` plus a rule from docs, untested). The open note closes once the user answers, without deny or error. Subagents lose `AskUserQuestion`, background agents auto-deny prompts, and headless `-p` has no `AskUserQuestion` (27 tools listed, claude 2.1.319), so a plugin-registered ask tool reaches nobody.
  Acceptance: A question asking leave to fix a found defect is denied once; an answered question leaves no open note. Verification: test.
  Basis: measured (2.1.319) and reported. Status: partial at 088a227c.
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1x8awmp-asking-to-select-option-withou-20261020T100311Z.md:71 (url: https://www.reddit.com/r/ClaudeCode/comments/1x8awmp/asking_to_select_option_without_explaining_options/); plugins/claudetto/hooks/features/decide/decide.ts@088a227c; claude 2.1.326: `AskUserQuestion` present (chunk-85qjfjsd.js@313). Not located: the Decider-judge spec lines.

## Stop and Reply Checks

- [ ] **REQ-GUARDS-052** claudetto shall turn the open-items gate into a never-blocking note, surfaced like you-should-know, keyed on changing calls, with each call's outcome logged so that a denied call is never reported done.
  Acceptance: a Stop with open items adds a note and never blocks; a denied call is not reported done. Verification: test.
  Basis: inferred. Status: partial at 088a227c. In claude 2.1.326 a hook's `"decision": "block"` holds in more cases, so a hook that always prints one may start blocking calls.
  Source: openspec/specs/run-limits/spec.md:99; openspec/changes/archive/2026-11-16-2-1-323/design.md:123; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

- [ ] **REQ-GUARDS-053** claudetto shall compare a planned change with the spec and list the side effects of seemingly small changes before it allows the change (spec-echo hook).
  Acceptance: unproven; no implementation shown. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: unresolved: the originating thread was not found by grep in external/; the nearest hit is external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD) in a real project-.jsonl:22.

- [ ] **REQ-GUARDS-054** claudetto shall catch a swallowed reply with a Stop hook.
  Acceptance: unproven. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: unresolved: the originating thread was not found by grep in external/.

- [ ] **REQ-GUARDS-055** claudetto shall cover PostToolUseFailure and check that a Code Mode hook fires.
  Acceptance: a hook on PostToolUseFailure logs a failed tool call. Verification: test.
  Basis: reported. Status: missing at 088a227c. claude 2.1.326: PostToolUseFailure present (chunk-fqacg37c.js@2502).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuk52d-if-you-log-claude-codes-hooks-20261116T052718Z.md:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1xuk52d/if_you_log_claude_codes_hooks_add/); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:10.

## Referee Registry

- [ ] **REQ-GUARDS-056** claudetto shall keep one registry of values the agent may not change alone: (a) bounds, limits, thresholds, budgets, caps, timeouts, retry counts and their files; (b) Checks: expected values, assertions, graders, eval cases, fixtures, baselines, CI and hook config; (c) model, effort, routing; (d) versions, release scope, public interface, dependency list; (e) project rules files; (f) settings, permissions, hooks, and sandbox that govern the agent; (g) recorded decisions; (h) anything the user called theirs. The categories apply whether or not a file is listed; plugin product files (`agents/`, `hooks/`, `output-styles/`) are ordinary source. A `PreToolUse` ask fires on any edit to a registry value.
  Acceptance: an edit to a listed or categorised value gives an ask; an edit to a product file does not. Verification: test.
  Basis: reported. Status: partial at 088a227c (`protectedPaths` exists, default `~/.claudetto-holdout`; no registry of the eight categories).
  Conflict: Unwritable Referee.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:696; plugins/claudetto/.claude-plugin/plugin.json:89@088a227c.

## Unwritable Referee

- [ ] **REQ-GUARDS-057** claudetto shall make the referee unwritable by the agent: deny `Edit|Write` on `tests/**`, `.github/**`, and hook files; use managed-only hooks (`allowManagedHooksOnly`, `allowManagedPermissionRulesOnly`, and a `ConfigChange` hook); keep CI outside agent reach and the review-rules file read-only; a diff touching a test needs human eyes (a CI diff lint fails test changes without a label).
  Acceptance: `Edit` on a test file is denied. `Edit` and `Write` hooks do not see Bash writes (a test loosened with `sed` passes an `Edit(tests/**)` rule), so a CI diff lint plus ask rules on Bash patterns cover the gap, and the target is re-read after a rejected or interrupted write. Test-tamper detection has no sound structural gate: a `.skip` match is swapped for comment-out. Verification: test.
  Basis: reported. Status: partial at 088a227c (`protectedPaths` exists; the tests and CI deny rules are not found). claude 2.1.326: `allowManagedHooksOnly` and `allowManagedPermissionRulesOnly` present (chunk-m33vdkhs.js@160422), `ConfigChange` present (chunk-m33vdkhs.js@5414).
  Conflict: Referee Registry.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:350; external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:118.

## Held-Out Wall

- [ ] **REQ-GUARDS-058** claudetto shall wall held-out validation from the agent: hidden tests until grading, grading outside the tested agent's workspace, graders frozen before a run, and `~/.claudetto-holdout` set as the `protectedPaths` default with sandbox `denyRead`. The holdout scoring step stayed an open user step.
  Acceptance: a `Read` of `~/.claudetto-holdout/**` is denied. Cited: EvalGenie held-out tests helped minimally and Claude Code and Codex hacked explicitly [2511.21654]; ImpossibleBench: any pass is cheating [2510.20270]; CoT monitoring beats action-only but optimizing against the monitor teaches hiding [2503.11926]; hacking generalizes to sabotage in Claude Code [2511.18397]; verbalizing reward hacking 88% to 6% undetected [2506.22777]. Verification: test.
  Basis: cited. Status: partial at 088a227c (plugin.json default and setup.test.ts deny rule exist; `git grep denyRead 088a227c` finds nothing, so the sandbox `denyRead` is not written). claude 2.1.326: sandbox.filesystem.denyRead present (chunk-m33vdkhs.js@114628).
  Source: external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:125; plugins/claudetto/.claude-plugin/plugin.json:89@088a227c; plugins/claudetto/hooks/features/setup/setup.test.ts:66@088a227c.

## Autonomy Contract File

- [ ] **REQ-GUARDS-059** claudetto shall load a file at session start that states the standing autonomy (for example "run evals up to $X; ask only for pushes, deletions outside the tree, and policy choices"); it survives `/clear`, a chat correction does not. Legitimate hand-offs: a sandbox blocking port binding, `.env`, or the network.
  Acceptance: the file's text is present after `/clear`. Reported over-deferral: eval items kept open as "costs money, for the user" while a headless sandbox session worked on the first attempt; "can't type into an interactive Claude Code window" while a subagent drove one via `tmux send-keys`. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:61.

## Unattended Runs

- [ ] **REQ-GUARDS-060** claudetto shall contain an unattended run: a container or separate worktree with no prod credentials; permissions allow test and build and deny `git push` and unexpected network; a PreToolUse hook covers gaps; each task has a pass check and stops when green; commit after each passing step; cap turns and budget (`--max-turns` and `--max-budget-usd`); the morning review starts from what was denied or blocked (`/permissions`); one task per session, a different agent reviews, and an "oracle" answers questions so the run postpones them.
  Acceptance: a run past its turn or budget cap stops. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c. claude 2.1.326: `--max-turns` and `--max-budget-usd` present (chunk-eafmz4at.js@1414), `/permissions` present (chunk-q2jas6cb.js@807).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrmui5-fabel-51-can-write-ai-model-weig-20261109T152425Z.md:29 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrmui5/fabel_51_can_write_ai_model_weights_directly/).

## Released Binary

- [ ] **REQ-GUARDS-061** claudetto shall deny a command whose program path holds `claude/versions/<version>` and point the agent at the cc-inspect `code` tool, while the installed `claude` command and a command that only names such a path as an operand (`ls <path>`) pass.
  Acceptance: `<data>/claude/versions/2.1.318 --help` is denied with the cc-inspect pointer; `claude --help` and `ls <path>` pass (lab tests in `gate/processes.test.ts`). Verification: test.
  Basis: cited. Status: missing at 088a227c (`git grep "claude/versions" 088a227c -- plugins` finds nothing).
  Source: openspec/specs/permission-policy/spec.md:301; openspec/specs/permission-policy/spec.md:303.

## Goal File

- [ ] **REQ-GUARDS-062** claudetto shall keep a written goal file, even three lines, set before a run: readable by the agent, writable by the human, and checked by something neither can edit.
  Acceptance: an agent write to the goal file is refused; the end-state check reads the file, not the agent's summary of the goal. Verification: test.
  Basis: reported. Without it the agent's summary of the goal is the only yardstick. Status: missing at 088a227c (the protected feature exists; no goal file).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcnaru-we-measured-how-60-engineers-dir-20261024T061824Z.md:53,61 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcnaru/we_measured_how_60_engineers_direct_ai_coding/); plugins/claudetto/hooks/features/protected/index.ts@088a227c.

## Commit Attribution

- [ ] **REQ-GUARDS-063** claudetto shall follow the project convention with a single `Assisted-by` trailer, never write `Signed-off-by` for the user, and put session history in the Record or PR description.
  Acceptance: a commit made by claudetto carries one `Assisted-by` trailer and no `Signed-off-by`. Verification: test.
  Basis: cited (a contribution certificate in the dossier). Status: missing at 088a227c (`git grep Assisted-by` finds nothing under `plugins/`).
  Source: external/please-use-me-often/agent-terms/CONTRIBUTION-CERTIFICATE.md:22.

## Web Fetch and Browser Fallback

- [ ] **REQ-GUARDS-064** claudetto shall fetch a page with curl and a stdlib Python extractor (main or article; drops script, style, nav, header, footer, hidden, aria-hidden, display:none; the title as H1), fall back to agent-browser `read` when the extract holds under 500 chars or the HTTP status is 403, 429, or 503, wrap the page in an untrusted `page` tag, remove the built-in WebFetch from the tool list, and keep WebSearch.
  Acceptance: MDN page 248 KB reduces to 21 KB; heading recall 31/31, 43/44, 29/33; a 403 triggers the browser fallback. Verification: test.
  Basis: measured (real run $0.0036 against $0.0073 for the built-in on the same 13 directives, confounded by the stock prompt). Status: have at 088a227c.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:89; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2479; plugins/claudetto/hooks/features/web/fetch.ts@088a227c; plugins/claudetto/scripts/web-extract.py@088a227c.

- [ ] **REQ-GUARDS-065** claudetto shall name the agent-browser session after the host with `[^\w-]` replaced by `-`; keep the cookie only through `open <url>`, bare `read`, and `close`; read the Cloudflare signal from the curl header `cf-mitigated=challenge`; send a challenge to a SHOWN browser with `--args --disable-blink-features=AutomationControlled` and `wait 3000` (headless fails); and on a CAPTCHA page open the same shown browser window for the user. The withheld-repeat notice says the file is editable, so the agent stays off Bash.
  Acceptance: a fetch whose curl header holds `cf-mitigated=challenge` falls back to a shown browser with the flag above; a blocked page answers with the recipe `! agent-browser <shown flags> --restore <session>`; the repeat notice names the file as editable. Verification: test.
  Basis: measured (extraction probe on 3 pages) and reported, with 100 of 100 Edits after a withheld first Read succeeding (inferred). Status: have at 088a227c (the recipe exists in `texts.ts:36` and `fetch.ts:86`).
  Source: external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:45; openspec/changes/2-1-325-rearchitecture/design.md:87-88,92 (own fetch tool, headed `agent-browser` for a CAPTCHA, web probe of 3 pages); plugins/claudetto/hooks/features/web/fetch.ts:32,86@088a227c; plugins/claudetto/hooks/features/web/texts.ts:36@088a227c; plugins/claudetto/hooks/features/repeat/repeat.ts@088a227c.

- [ ] **REQ-GUARDS-066** claudetto's web read shall write the extract to a file and return only its path, size, line count and heading outline, at most 2 KB; the agent then reads the part it needs with Grep or Read.
  Acceptance: a read of the 2.1.326 release page returns at most 2 KB; a following `grep -n MCP` on the returned path returns the 21 matching lines. Verification: test.
  Basis: measured (the whole-page return cost about 12.2k tokens; grep over the extract returned 2,946 bytes for the same question). Status: missing at 088a227c (`web_fetch` returns the page up to `maxChars`).
  Source: the user's report of the `web_fetch` warning and request for the route with the fewest tokens, 2026-11-17 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15487); lead session `0342617c` measurements, 2026-11-17.

- [ ] **REQ-GUARDS-067** No tool that claudetto or its plugins register (the `claudetto` and `claudetto-openspec` MCP servers) shall return more than 2 KB of text in one result; a longer result goes to a file whose path the tool returns, as Claude Code does for a large Bash output.
  Acceptance: no registered tool result over 2 KB in a test run of each tool; each tool that can produce more returns a path. Verification: test.
  Basis: user decision, 2026-11-17 (the MCP overhead "must never happen" on claudetto or its MCP servers); 2.1.326 caps an MCP result at 25,000 tokens and saves no text to a file (code read). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15487; chunk-z113k499.js@769 and chunk-6dkbe81p.js@7055 (2.1.326).

## Static Scan of Third-Party Skills

- [ ] **REQ-GUARDS-068** claudetto shall scan a third-party skill statically before install: frontmatter, referenced paths, unreferenced scripts, injection and hidden-unicode text, bandit and semgrep (a 46-check scanner; two of five official skills failed).
  Acceptance: a skill with a hidden-unicode line or an unreferenced script fails the scan before install. Verification: test.
  Basis: reported by the tool's author (Cardea now runs 80+ checks per author; the 46-check run is a record, not a current scorecard). Status: missing at 088a227c.
  Source: external/2026-10-07_p2/export-I ran a static security scan over five of Anthropic's official Claude Code skills and wrote up every.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x03gtx/i_ran_a_static_security_scan_over_five_of/).

## Web Tool Comparison

- [ ] **REQ-GUARDS-069** claudetto shall evaluate replacing WebFetch and other web tools with its own fetcher: a curl fetch that extracts page content to save context, headless Chrome fallback on failure, and a temporary Chrome window for a captcha with authorised cookie reuse; and shall measure `web_fetch` against built-in WebFetch with an equal prompt and tool lists.
  Acceptance: retrieval quality, security, tokens, and injection resistance are measured against the built-in tools; a paired run of `web_fetch` and WebFetch with equal prompt and tool list records both results. Verification: probe.
  Basis: reported, one user. Status: partial at 088a227c (features/web, agent-browser; the comparison against WebFetch is missing).
  Resolved: the user asked on 2026-11-17 for the web route with the fewest tokens among `@playwright/cli`, agent-browser and a lighter variant of verdict-cli (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15487), so this measurement is a requested comparison, not a benchmark suite; the first same-page measurements are in the context items of 2026-11-17 and the route in [ADR-0112](../adr/0112-web-read-route.md).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459); openspec/changes/2-1-325-rearchitecture/design.md:87-88.

## Force Push

- [ ] **REQ-GUARDS-070** claudetto shall deny a force push.
  Acceptance: `git push --force` and `git push -f` are denied; a plain push passes. Verification: test.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: have at 088a227c (`plugins/claudetto/hooks/features/setup/command-rules.ts:12-13`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules: push each green commit to the feature branch, never force).

## Sandbox

- [ ] **REQ-GUARDS-071** claudetto shall set the sandbox deny-list as: allowWrite `~/`, `/Volumes/`, `/private/tmp`; denyWrite 14 files that run later; denyRead Keychains and cloud credentials; `~/.ssh` and `~/.gnupg` not in denyRead; `allowMachLookup ["*"]`; `excludedCommands` `ps *`, `top *`, `sysctl *`, `launchctl list`.
  Acceptance: `setup/settings.ts` holds the block. Verification: inspection.
  Basis: user decision. Status: have.
  Source: user decision, 2026-11-09 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11); user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

## Destructive Commands

- [ ] **REQ-GUARDS-072** claudetto shall block only unrecoverable destructive commands on macOS and Linux and let every other command pass.
  Acceptance: `rm -rf` of a home folder is blocked; a recoverable command and a hook with no cause for alarm raise no block and no hook error. Verification: test.
  Basis: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (`git grep -n -i unrecoverable 088a227c -- plugins adr`: setup/settings.ts:101 sets auto mode so the classifier blocks only unrecoverable destruction, settings.test.ts:118 tests it; [ADR-0098](../adr/0098-block-only-unrecoverable-destructive-commands.md) is absent at 088a227c).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints: unrecoverable destructive commands only; hook errors are abysmally annoying); [ADR-0098](../adr/0098-block-only-unrecoverable-destructive-commands.md).
