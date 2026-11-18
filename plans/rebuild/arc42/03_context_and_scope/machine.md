# Machine

## Machine, Shell, and Disk

- [ ] **CTX-524** Git Bash heredocs collapse double backslashes before Python sees them, so a Windows path with \t silently becomes a tab; the browser upload tool caps files at 16 MB, so render under that instead of retrying; a quoted rate applies to its job only.
  Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbnwcw-a-month-of-my-claude-code-agen-20261022T044334Z.md:66 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbnwcw/a_month_of_my_claude_code_agents_writing_down/>).

## Machine, Shell, and Disk

- [ ] **CTX-525** `additionalDirectories`: `"$TMPDIR"` is not expanded and the read is refused; `"~/side"` expands to `$HOME` and reads (SIDE-CANARY returned); an absolute path reads. `blockReadsExemptPaths` is ignored in every `settings.json` and has no temp-dir exemption
  Basis: measured, fake API.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:827.

## Machine, Shell, and Disk

- [ ] **CTX-526** On macOS (Darwin 27.2.0) ulimit -v, -m, and -d and setrlimit of RLIMIT_AS, RLIMIT_DATA, and RLIMIT_RSS all fail with EINVAL. Only RLIMIT_CPU takes a value.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:800.

- [ ] **CTX-527** memoryGuard reads the free share at tool.check only. A 4 GB single-process growth (8 blocks of 512 MB, 1.5 s apart) moved memory_pressure -Q free share only from 47% to 52%, because macOS compresses pages and frees cache. So the share cannot follow one process, and per-process RSS is the signal.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:801.

- [ ] **CTX-528** claude plugin test on a subfolder fails ("no hooks module to load"), and on a file fails ("no such plugin folder"). It starts one Claude Code child per test file, Math.min(files, availableParallelism()) at a time, and no flag or env lowers that. bun test skips lab files (bunfig.toml:29). A run of 1,553 tests in 79 files took 59 s, 3,389 MB, and 19 processes. So a hook change has no narrow check. Observed twice in transcripts (2026-11-09, 2026-11-14): `claude plugin test` needs the whole plugin root.
  Acceptance: the error reproduces on a subfolder. Verification: demonstration.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:465-466; observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241); 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11).

- [ ] **CTX-529** The reported 120 GB RAM incident was explained as clawdipedia's surface tests (bun test 10,125 MB; one snapshot.test.ts 15,332 MB, others 8 GB; one Claude Code bundle parse 4,700 MB; a test comment says each build peaks near 18 GB) beside 8 Claude Code processes and backgrounded agent checks on a 32 GB MacBookPro18,2. The kernel logged JETSAM_REASON_LOWSWAP kills (60 processes at 01:26:59). 120 GB is the summed footprint counting compressed and swapped pages. No claudetto run exceeds 1.5 GB (replay of the agents' edits: 699 MB lint, plugin test 1,410 MB).
  Basis: measured; the 120 GB reading is inferred.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:476-487.

- [ ] **CTX-530** `caffeinate -i -t N` children are Claude Code's own sleep inhibitor (restarted on interval); stale MCP children after a plugin update are identified via `installed_plugins.json` (measured 2.1.319). Version `2.1.319+N` passes `claude plugin validate`, and the engine offers an update whenever the version text differs; `--strict` wants a README line `claude plugin install <name> --marketplace owner/repo`.
  Basis: measured (2.1.319); the `+N` version passing `claude plugin validate` re-measured on 2.1.327 (a plugin dir with version `2.1.319+3` exits 0 with one author warning; `--strict` exits 1 on that warning, `claude plugin validate`, 2026-11-18). The engine update on a changed version text and the `--strict` README line are kept as measured on 2.1.319, because they need an installed marketplace plugin and a marketplace update. Status: unchecked at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:420; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:421; openspec/changes/archive/2026-11-10-release-2-1-319-1/proposal.md:9.

- [ ] **CTX-531** Static `tsc` over the plugin checked nothing (`include` pointed at missing folders; `bun check` found 99 errors, 26 after generated tool declarations); Bun 1.4.4 `bun check` equals tsc; `NotebookEdit` carries `notebook_path`. Measured. Tool NotebookEdit is present in 2.1.326 (cc-inspect `surface` tool list, 2026-11-17). The `fold.ts` screen is recorded under Hooks and Events.
  Basis: measured; `bun --version` prints 1.4.4 on this machine and `notebook_path` is read by the 2.1.327 NotebookEdit activity code (chunk-asj6f58y.js@1063850, cc-inspect search, 2026-11-18). The 99 and 26 error counts are a 2026-11-09 result on a tree that no longer exists, kept as recorded. Status: unchecked at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:412.

- [ ] **CTX-532** git `diff`, `log`, and `show` accept `--output=<file>` and write it (exit 0) while `status` rejects it (exit 129): measured, 2.1.314 era; re-measured on git in a temp repo on 2026-11-18: `git diff --output=o1`, `git log --output=o2` and `git show --output=o3` each exit 0 and write the file, `git status --output=o4` exits 129.
  Basis: measured. Status: have at 088a227c (`plugins/claudetto/hooks/kernel/shell/readonly.ts:19-20`@088a227c: the regex `/^--(?:output|pre)\b/u` marks `--output` as a write or run).
  Source: openspec/specs/low-hitl/spec.md:87; openspec/specs/low-hitl/spec.md:117.

## Machine, Shell, and Disk

- [ ] **CTX-533** Disk on 2026-11-12: /private/tmp/claude-501 1.85 GB (474 entries, 166 older than 60 min), /private/tmp 1.98 GB, system temp folder 0.31 GB (22,123 TemporaryDirectory.* entries made by Swift, not by this repository), ~/.claude 1.44 GB, data volume 282 of 460 GiB (68%). A dry run said "would remove 0 entries, 0 B" for temp and trash, named 28 OpenJoystickDriver agent worktrees (51.4 GB), and kept 4 with uncommitted changes (2.7 GB). Most space is worktrees.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:810,831.

- [ ] **CTX-534** Tests leave no temp folder: 18 hygiene, statusline, and manifest test files left 0 entries under a fresh TMPDIR. tools/hygiene/trash.test.ts exited 1 under the changed TMPDIR and passed 12 tests under the default. The helper tools/temp.mock.ts removes each test's folder. The hygiene sweep starts only at SessionStart source startup (67 session files in 3 days, 10 spanning over 12 hours, 4 transcript records of SessionStart:startup, so at most 67 runs), and a session that compacts or resumes starts none. The later fix sweeps at startup, resume, clear, and compaction (openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:139).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:812; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:139.

- [ ] **CTX-535** Local branch survey (git cherry per branch in 12 listed projects): OpenJoystickDriver 121 local branches (36 in a worktree, 85 with a commit the default lacks, 0 merged); OpenRAC-next 19 (2 merged, both worktree-agent-*); bedrock 11 and claudetto 11, none merged; asd-ste100-skill-next 7 (4 merged); SwifterKit 1 merged. 6 would go, no upstream gone.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:813.

- [ ] **CTX-536** GitHub delete_branch_on_merge is true only for OpenJoystickDriver and false for the other 11 repositories, so merged remote heads remain (JagFx 8, bedrock 9, claudetto 2, SwifterKit 1, versionlens-redux 2, OpenJoystickDriver 1, OpenSAD 1). 9 heads have no open PR and a merged PR tip or all commits in default. git cherry misses a squash-merged head (bedrock fix/clang-format-binpack shows 2 commits, only the PR shows it). gh needs the sandbox off (HTTP 401).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:814.

- [ ] **CTX-537** Dry run with --remote after the fixes: "would remove 26 entries, 790704 B" of temp, 28 agent worktrees (51399544832 B), and "would delete 10 branches" (4 local in asd-ste100-skill-next, 6 remote). claudetto feat/2.1.319+1 is named twice because the session worktree and its checkout are both listed. The other 4 merged bedrock heads stay because a worktree has them checked out. Nothing was removed.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:815.

## Machine, Shell, and Disk

- [ ] **CTX-538** `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` turns off the built-in advisor tool; setup writes it with the value `1` so the claudetto decide tool is the only advisor. Present in 2.1.326 (bool; cc-inspect `surface` env, 2026-11-17).
  Basis: cited. Status: have at 088a227c.
  Source: openspec/specs/decide/spec.md:229; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/decide/spec.md:112; user decision, recorded in the 2026-11-17 handover (day of decision not recorded) (advisor tool stays disabled).

- [ ] **CTX-539** The `claude-<uid>` temp folder, under `CLAUDE_CODE_TMPDIR`, `/tmp`, or the system temp, holds `-<project path>`, `bash-edit-diff`, `plugin-tool-staging`, and `cc-socks`. Present in 2.1.326 (`CLAUDE_CODE_TMPDIR` str; cc-inspect `surface` env, 2026-11-17).
  Basis: reported. Status: have at 088a227c.
  Source: openspec/specs/session-hygiene/spec.md:203; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/session-hygiene/spec.md:34.

- [ ] **CTX-540** Silent-turn reminder text: env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` > server flag `tengu_hushed_lark_text` > default (2.1.319, read). 2.1.326: env present (also `_REMINDER` triBool, `_SECONDS`, `_TURNS`), and the gates `tengu_hushed_lark` and `tengu_hushed_lark_text` are present, the text default being "The user hasn't heard from you in a while. As you continue, keep them updated when there's something to tell — a finding, a change of plan." (cc-inspect `surface` env and gate, 2026-11-17); the order env over flag over default is verified on 2.1.327: `Llo()` returns `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` first, then the `tengu_hushed_lark_text` value, then the default text (chunk-m14bt1pz.js@3985537). `DISABLE_TELEMETRY=1` makes `cc-plugin-telemetry` unavailable (read 2.1.318; on 2.1.327 the plugin's `isAvailable` is `!TS()&&!Y()`, chunk-g8ypxj28.js@10244, and the plugin reads `DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, chunk-g8ypxj28.js@25731; the bodies of `TS` and `Y` were not read). In 2.1.326 the release notes say a command turned off by an environment variable such as `DISABLE_TELEMETRY` now says why instead of "Unknown command". `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` also stops updates and refuses `$.http.fetch` with `auth`: env (bool) and `$.http.fetch` present in 2.1.326, the refusal of `auth` is Dropped (2026-11-18): the `$.http.fetch` binding passes `auth` through (chunk-b0yr0k8v.js@297361) and a search found no refusal text. The effects of the flag found on 2.1.327 are a refused plugin-archive download (chunk-m14bt1pz.js@866461) and refused plugin routes (chunk-70j62gpb.js@2552). On 2.1.327 the same facts hold: the gate is `BR("silent_turn_reminder", ..., env)`, whose first line is `if(override!==void 0)return override` (chunk-t907shf5.js@1810), called with the env value (chunk-m14bt1pz.js@3985693), while `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` is read only by the text function (chunk-m14bt1pz.js@3985537), so `CLAUDE_CODE_SILENT_TURN_REMINDER:"0"` turns the reminder off whatever the text is, and the text never turns it on. On 2.1.325 `CLAUDE_CODE_SILENT_TURN_REMINDER:"0"` and `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` are not alternatives (`chunk-wqb2b4v0.js:3789361`; `$defaults` semantics in `DZn`, `chunk-sk365049.js:435`). On 2.1.325 `CLAUDE_CODE_SILENT_TURN_REMINDER` is read through `LR("silent_turn_reminder", ..., env)`, which returns the env override.
  Acceptance: the code at the offsets matches. Verification: inspection. The binary holds the call. Verification: inspection.
  Basis: cited. Status: partial at 088a227c.
  Source: openspec/specs/surface-trim/spec.md:337; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:388; openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:129; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes); `chunk-wqb2b4v0.js:3789361` (claude 2.1.325 binary; the module is gone from 2.1.327, see chunk-m14bt1pz.js@3985537 and @3985693 for 2.1.327) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); claude 2.1.325 binary (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

- [ ] **CTX-541** Engine inputs (cited, 2.1.319 source): `/restart` needs GrowthBook flag `tengu_fancy_wand` (default off), an interactive terminal, and macOS or Linux (verified on 2.1.327: `/restart` is enabled when stdin and stdout are TTYs, the platform is macOS or Linux, and `tengu_fancy_wand` is true, default false, chunk-m14bt1pz.js@2528300-2529185; the five further checks, traced by import: it needs `jpe()` true, meaning a standalone Bun binary (`Rm()`) whose `process.execPath` lies under `$XDG_DATA_HOME/claude/versions/` (default `~/.local/share/claude/versions/`, `tVe()`, chunk-dmvnf17x.js@532, chunk-tzsf4ern.js), so a source or npm run lacks it; and it is off when `Ff()` is set (a teammate agent, chunk-ytkczbf2.js@137176), `Zt()` (session kind `bg`, `CLAUDE_CODE_SESSION_KIND`, chunk-asj6f58y.js@1044060), `Pg()` (`--disable-slash-commands`, chunk-ytkczbf2.js@137619) or `Et()` (a remote session: `xn()` is `workspace==="remote"` in the surface caps, chunk-ytkczbf2.js@148899, and `cr()` is the attached remote connection of kind ccr, ssh or direct, chunk-61zc8nf4.js@1209); the command check `kga` also needs `A2r()===void 0`, so it is off once a newer version than the running one is known); on Linux sandbox `allowWrite` -> `--bind`, `denyWrite` -> `--ro-bind`, `denyRead` -> `--tmpfs` or `--ro-bind /dev/null`; `allowMachLookup` and `allowLocalBinding` are macOS-only; `excludedCommands` matches before the wrapper (no Linux run).
  Basis: cited. Status: unchecked: engine behaviour, no baseline code to check.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:145; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:164.

## Machine, Shell, and Disk

- [ ] **CTX-542** A stray `tsc --lsp --stdio` (TypeScript 7.0.2, pid 48197, running 27 hours at 127% CPU, parent launchd) was not started by the session. The user ran `! kill -9 48197`, and `ps -p 48197` then found no process (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:412.

## Machine, Shell, and Disk

- [ ] **CTX-543** Eight commits that commitlint rejected (4 headers over 100 characters, 4 body lines over 100) were reworded by `git rebase -r --exec` with the same trees. All 365 signatures stayed (`G`), `bunx commitlint` exited 0, and `git push --force-with-lease` replaced the remote head. The `just validate` check reports README_MISSING (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:413; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:415.

## Machine, Shell, and Disk

- [ ] **CTX-544** A sparse disk image (Docker.raw) showed 60 GB apparent size but 14 GB actual disk usage, so a cleanup agent must measure actual usage (du), not apparent size.
  Basis: reported (author).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xd77e8-agentic-disk-cleanup-workflow-20261024T061644Z.md:38 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xd77e8/agentic_disk_cleanup_workflow/>).

- [ ] **CTX-545** Semgrep in a commit gate took 26 s on one file because 11 leftover worktrees held 678k files; it took 0.7 s after cleanup.
  Basis: measured, one user.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:35 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xgsku3/i_parsed_34_gb_of_my_claude_code_transcripts_20/>).

- [ ] **CTX-546** An OS audit rule (Linux auditd on execve under a dedicated claude user) logs every command and the agent cannot edit it without sudo, but it sees only execs, not file reads or MCP calls.
  Basis: reported (author reply).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xcu5xq-built-a-hook-that-logs-what-cl-20261024T061657Z.md:133 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xcu5xq/built_a_hook_that_logs_what_claude_code_does_on/>).

- [ ] **CTX-547** With --permission-mode acceptEdits, an explicit allow of bare Edit or Write lets the model edit other checkouts by absolute path; acceptEdits alone confines to the working folder; allow find, bash, npx, and npm run anything, so leave them out; Read-tool rules are needed because the sandbox does not cover Read.
  Basis: reported.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:135 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac/>).

- [ ] **CTX-548** A .env deny pattern under the home folder missed worktrees outside home, letting a model-written script read .env; deny under the run's own checkout too; allow localhost binding only if tests start a server.
  Basis: reported.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:136 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac/>).

- [ ] **CTX-549** In an unattended claude -p run, Claude Code refuses edits under .claude/ (skills, hooks, settings) and asks for an approval nobody gives; the executor refuses such briefs up front and routes them to the cloud.
  Basis: reported.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:258 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac/>).

- [ ] **CTX-550** Worktrees share the object store, but node_modules and build output are untracked, so each worktree keeps its own copy; a hardlinking package manager with a shared store shrinks it.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xnnvx8-each-of-my-agent-threads-gets-it-20261104T184152Z.md:79,81 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xnnvx8/each_of_my_agent_threads_gets_its_own_13_gb_copy/>).

- [ ] **CTX-551** gitignore only affects what Git tracks; it neither removes files from the working directory nor stops an agent reading them, so raw material needs an archive outside the default reading path.
  Basis: reported, two commenters. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xra3ka-help-with-large-project-20261110T094747Z.md:88 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xra3ka/help_with_large_project/>).

## Machine, Shell, and Disk

- [ ] **CTX-552** One `Bash` call `perl -0pi -e 's/.../.../g' a b c` replaces many `Edit` calls. Under `acceptEdits` it is denied: "The following part requires approval: perl -0pi -e ...".
  Acceptance: the probe prints the denial. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: probe on Claude Code 2.1.325 as the old plan states (probe name, date, and command not given).

- [ ] **CTX-553** With `permissions.allow: ["Bash(perl -0pi -e *)"]`, the perl call runs with no prompt (`permission_decision: accept, source: config`) and the files change.
  Acceptance: the probe prints `accept` with `source: config`. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: probe on Claude Code 2.1.325 as the old plan states (probe name, date, and command not given).

## Machine, Shell, and Disk

- [ ] **CTX-554** The CLI settings schema describes the per-model `autoCompactWindow` as "in tokens (at least 100000)" or "auto" (2.1.327, chunk-ja5z738t.js@279536). The 1000000 upper bound is not in the schema text and is not claimed.
  Acceptance: the schema text names 100000 as the floor. Verification: probe.
  Basis: cited, 2.1.327 setting description (cc-inspect code search, 2026-11-18); the earlier upper bound was observed in a transcript and is dropped as unconfirmed. Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:4092 (handoff, `38ae62d0` notes).

- [ ] **CTX-555** A `claude` run under a fresh `CLAUDE_CONFIG_DIR` is not logged in.
  Acceptance: `CLAUDE_CONFIG_DIR=<empty dir> claude auth status` reports no login. Verification: probe.
  Basis: measured, 2.1.327: `CLAUDE_CONFIG_DIR=<empty dir> claude auth status` prints `loggedIn: false`, `authMethod: none` (2026-11-18; `auth status` used so no API call is made). Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Ruled Out).

- [ ] **CTX-831** On 2026-11-18 the user's 512 GB Mac had 51.6 GB free in its APFS container (about 90% used, against 68% on 2026-11-12); the Data volume used 394.2 GB. `du -xhd1 /System/Volumes/Data` outside the sandbox totals 306 GB (Users 128 GB, private 128 GB, opt 20 GB, System 15 GB, Applications 13 GB); the gap is not snapshots: the Data volume has none (the three `com.apple.os.update` snapshots belong to the system volume). `du` also counts 79 GB of Chrome clones that cost about one copy (CTX-832), so about 166 GB of real use sits in 585 folders that `du` cannot read even outside the sandbox: 280 under `~/Library/Containers`, 134 under `~/Library/Group Containers` (including OrbStack's `HUAQ24HBR6.dev.orbstack` data), 70 under `/private/var/folders/cl`, and root-owned folders under `/private/var/db` (Spotlight, biome and others). These folders and `~/.Trash` (CTX-834) are protected by macOS privacy controls (TCC), so only the user can size them: grant the terminal Full Disk Access and run `du -sh ~/Library/Containers ~/Library/Group\ Containers ~/.Trash`, run `docker system df` or `orb` outside the sandbox, or read System Settings > General > Storage. `/Volumes/DevAudioStore` is an external drive and not part of the gap. The user's `docker system df` (Docker 29.8.2 on OrbStack, 2026-11-18) reports 42.7 GB, of which 34.5 GB is reclaimable: 485 local volumes, none in use, 23.27 GB; 11 images, 7.50 GB (5.48 GB reclaimable); build cache 11.91 GB (5.76 GB reclaimable); 20 containers, 155.6 kB. Unused Docker volumes are the largest single reclaimable item measured on the machine. `docker volume prune` removes only anonymous volumes; `-a` also removes unused named ones (`docker volume prune --help`). On the user's instruction the same day, `docker image prune -a -f`, `docker builder prune -a -f` and `docker volume prune -a -f` freed 4.3, 11.9 and 23.3 GB (39.5 GB in all; `builder prune -a` also removes cache that `docker system df` counts as not reclaimable). The data volume then had 85 GB free (`df -h`, 80% used), and the running containers kept running. The collector of ADR-0185 repeats this without asking, for unused items only.
  Acceptance: `diskutil apfs list` run outside the sandbox shows the container free space. Verification: probe.
  Basis: probed (`diskutil apfs list`, `df -h`, `du` error count by folder outside the sandbox, `diskutil apfs listSnapshots` on the Data volume, 2026-11-18; inside the sandbox `diskutil` returns ERROR -69620). The sizes behind TCC are a user-held measurement. Status: n/a (machine state).
  Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:671 and :3505); probe output of this session.

- [ ] **CTX-832** `du` counts each APFS clone in full, so it overstates disk use. `/private/var/folders/*/X` held 79 GB by `du` in 55 `com.google.Chrome.code_sign_clone` copies of about 1.4 GB each, but a `getattrlist` probe of `ATTR_CMNEXT_PRIVATESIZE` gave 0.00 GB of private bytes for them: they share blocks, so their real cost is about one copy.
  Acceptance: the private-size probe reports about 0.05 GB for a fresh 50 MB file and 0 for each file of a `cp -c` clone pair, then 0.00 GB for the Chrome clone folders. Verification: probe.
  Basis: probed (C program using `fts` and `getattrlist` with `FSOPT_ATTR_CMN_EXTENDED`, built and run 2026-11-18). Status: n/a (machine state).
  Source: probes in session ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl; CTX-544.

- [ ] **CTX-833** On 2026-11-18 the largest measured consumers outside the system were: `~/CodeProjects` 55 GB (OpenJoystickDriver 26 GB, of which agent worktrees under `.claude/worktrees` 14 GB and `.build` 11 GB); `/opt/homebrew` 20 GB; `~/.gradle` 13 GB (caches 8.8 GB, jdks 3.1 GB); `/Applications` 13 GB; Xcode `iOS DeviceSupport` 6.6 GB; `~/.rustup` 5.6 GB; `~/.bun` 5.6 GB; a Swift toolchain 4.8 GB; `~/.konan` 3.2 GB; `$TMPDIR` 8.5 GB in 87,631 entries (65,295 `TemporaryDirectory.*`, 1,065 `ccdocs-cli-test`, 1,064 `claude-run`, 758 `surface`, 671 `bedrock-test`, 385 `claude-session-repo`, 133 `mutant`). The `~/.claude` folder held 899 MB and `~/.local/share/claude` 1.6 GB (versions 2.1.323, 2.1.325, 2.1.326, 2.1.327).
  Acceptance: `du -xhd1` of each named path gives the size within 10%. Verification: probe.
  Basis: probed (`du -xhd1`, `find`, 2026-11-18; apparent sizes, clones counted in full). Status: n/a (machine state).
  Source: probes in session ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl.

- [ ] **CTX-834** `~/.Trash` cannot be read by a process without Full Disk Access: listing it fails with "Operation not permitted" even outside the sandbox (macOS TCC). Its size is held by the user.
  Acceptance: `ls ~/.Trash` from the Claude Code shell fails with "Operation not permitted". Verification: probe.
  Basis: probed (2026-11-18). Status: n/a.
  Source: probes in session ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl.

## External Sweep, 2026-11-18

- [ ] **CTX-878** Two parallel background subagents re-rendered video frames, each frame starting a headless Chrome with a 4 GB GPU memory budget, and two Chrome processes never exited; with 11 sessions and 44 MCP server processes, swap reached 5.4 of 7 GB at load average 26 on a 16 GB, 10-core MacBook, which froze three times in a week. Heavy subagent jobs wait for free memory and leaked browser processes are reaped (RISK-048).
  Basis: measured (third-party, numbers shown).
  Source: external/2026-10-17/export-My Mac kept freezing while Claude Code agents ran, so I built a plugin that makes heavy jobs wait th.jsonl:2.

- [ ] **CTX-879** Disk growth from agents on one 16 GB Mac: transcripts reached 11 GB (one 262 MB log held 175 MB of base64 screenshots); setting `cleanupPeriodDays` to 7 (default 30, CTX-142) freed 7.4 GB on the first cleanup; one session left 6 copies of DerivedData (6.9 GB), one per variant. A cleanup agent once deleted two folders it judged build junk that held test-package source, so its rules became: delete only what is untouched for 3+ hours, skip folders `lsof +D` shows open, and nothing during a build. A commenter adds: check each agent worktree for uncommitted work first, then run `git worktree prune`. claudetto's hygiene step (CTX-550) follows these rules, and deletion of anything outside its own scratch paths needs the user's confirmation.
  Basis: measured (third-party, numbers shown) for the sizes; reported for the rules.
  Source: external/2026-11-18_p2/reddit.com-r-claudecode-comments-1xzgmo3-claude-code-kept-filling-my-25-20261118T181803Z.md:40; external/2026-11-18_p2/reddit.com-r-claudecode-comments-1xzgmo3-claude-code-kept-filling-my-25-20261118T181803Z.md:46; external/2026-11-18_p2/reddit.com-r-claudecode-comments-1xzgmo3-claude-code-kept-filling-my-25-20261118T181803Z.md:52-56; external/2026-11-18_p2/reddit.com-r-claudecode-comments-1xzgmo3-claude-code-kept-filling-my-25-20261118T181803Z.md:75; external/2026-11-18_p2/reddit.com-r-claudecode-comments-1xzgmo3-claude-code-kept-filling-my-25-20261118T181803Z.md:147.
