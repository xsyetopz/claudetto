# machine

## Machine, Shell, And Disk

- [ ] **CTX-524** Git Bash heredocs collapse double backslashes before Python sees them, so a Windows path with \t silently becomes a tab; the browser upload tool caps files at 16 MB, so render under that instead of retrying; a quoted rate applies to its job only.
  Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbnwcw-a-month-of-my-claude-code-agen-20261022T044334Z.md:66 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbnwcw/a_month_of_my_claude_code_agents_writing_down/>).

## Machine, Shell, And Disk

- [ ] **CTX-525** `additionalDirectories`: `"$TMPDIR"` is not expanded and the read is refused; `"~/side"` expands to `$HOME` and reads (SIDE-CANARY returned); an absolute path reads. `blockReadsExemptPaths` is ignored in every `settings.json` and has no temp-dir exemption
  Basis: measured, fake API.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:827.

## Machine, Shell, And Disk

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
  Basis: measured (2.1.319). Status: unchecked (not re-measured on 2.1.326).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:420; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:421; openspec/changes/archive/2026-11-10-release-2-1-319-1/proposal.md:9.

- [ ] **CTX-531** Static `tsc` over the plugin checked nothing (`include` pointed at missing folders; `bun check` found 99 errors, 26 after generated tool declarations); Bun 1.4.4 `bun check` equals tsc; `NotebookEdit` carries `notebook_path`. Measured. Tool NotebookEdit is present in 2.1.326 (cc-inspect `surface` tool list, 2026-11-17). The `fold.ts` screen is recorded under Hooks and Events.
  Basis: measured. Status: unchecked (Bun 1.4.4 and the `fold.ts` screen not re-run).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:412.

- [ ] **CTX-532** git `diff`, `log`, and `show` accept `--output=<file>` and write it (exit 0) while `status` rejects it (exit 129): measured, 2.1.314 era.
  Basis: measured. Status: have at 088a227c (the Bash gate treats `--output=` as a write; unchecked in code).
  Source: openspec/specs/low-hitl/spec.md:87; openspec/specs/low-hitl/spec.md:117.

## Machine, Shell, And Disk

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

## Machine, Shell, And Disk

- [ ] **CTX-538** `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` turns off the built-in advisor tool; setup writes it with the value `1` so the claudetto decide tool is the only advisor. Present in 2.1.326 (bool; cc-inspect `surface` env, 2026-11-17).
  Basis: cited. Status: have at 088a227c.
  Source: openspec/specs/decide/spec.md:229; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/decide/spec.md:112; user decision, recorded in the 2026-11-17 handover (day of decision not recorded) (advisor tool stays disabled).

- [ ] **CTX-539** The `claude-<uid>` temp folder, under `CLAUDE_CODE_TMPDIR`, `/tmp`, or the system temp, holds `-<project path>`, `bash-edit-diff`, `plugin-tool-staging`, and `cc-socks`. Present in 2.1.326 (`CLAUDE_CODE_TMPDIR` str; cc-inspect `surface` env, 2026-11-17).
  Basis: reported. Status: have at 088a227c.
  Source: openspec/specs/session-hygiene/spec.md:203; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/session-hygiene/spec.md:34.

- [ ] **CTX-540** Silent-turn reminder text: env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` > server flag `tengu_hushed_lark_text` > default (2.1.319, read). 2.1.326: env present (also `_REMINDER` triBool, `_SECONDS`, `_TURNS`), and the gates `tengu_hushed_lark` and `tengu_hushed_lark_text` are present, the text default being "The user hasn't heard from you in a while. As you continue, keep them updated when there's something to tell — a finding, a change of plan." (cc-inspect `surface` env and gate, 2026-11-17); the order env over flag over default is unverified in 2.1.326. `DISABLE_TELEMETRY=1` makes `cc-plugin-telemetry` unavailable (read 2.1.318): unverified in 2.1.326, where the release notes say a command turned off by an environment variable such as `DISABLE_TELEMETRY` now says why instead of "Unknown command". `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` also stops updates and refuses `$.http.fetch` with `auth`: env (bool) and `$.http.fetch` present in 2.1.326, the refusal unverified in 2.1.326. On 2.1.325 `CLAUDE_CODE_SILENT_TURN_REMINDER:"0"` and `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` are not alternatives (`chunk-wqb2b4v0.js:3789361`; `$defaults` semantics in `DZn`, `chunk-sk365049.js:435`). On 2.1.325 `CLAUDE_CODE_SILENT_TURN_REMINDER` is read through `LR("silent_turn_reminder", ..., env)`, which returns the env override.
  Acceptance: the code at the offsets matches. Verification: inspection. The binary holds the call. Verification: inspection.
  Basis: cited. Status: partial at 088a227c.
  Source: openspec/specs/surface-trim/spec.md:337; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:388; openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:129; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes); `chunk-wqb2b4v0.js:3789361` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); claude 2.1.325 binary (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

- [ ] **CTX-541** Engine inputs (cited, 2.1.319 source): `/restart` needs GrowthBook flag `tengu_fancy_wand` (default off), an interactive terminal, and macOS or Linux (unverified); on Linux sandbox `allowWrite` -> `--bind`, `denyWrite` -> `--ro-bind`, `denyRead` -> `--tmpfs` or `--ro-bind /dev/null`; `allowMachLookup` and `allowLocalBinding` are macOS-only; `excludedCommands` matches before the wrapper (no Linux run).
  Basis: cited. Status: unchecked (engine behaviour, no baseline code to check).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:145; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:164.

## Machine, Shell, And Disk

- [ ] **CTX-542** A stray `tsc --lsp --stdio` (TypeScript 7.0.2, pid 48197, running 27 hours at 127% CPU, parent launchd) was not started by the session. The user ran `! kill -9 48197`, and `ps -p 48197` then found no process (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:412.

## Machine, Shell, And Disk

- [ ] **CTX-543** Eight commits that commitlint rejected (4 headers over 100 characters, 4 body lines over 100) were reworded by `git rebase -r --exec` with the same trees. All 365 signatures stayed (`G`), `bunx commitlint` exited 0, and `git push --force-with-lease` replaced the remote head. The `just validate` check reports README_MISSING (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:413; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:415.

## Machine, Shell, And Disk

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

## Machine, Shell, And Disk

- [ ] **CTX-552** One `Bash` call `perl -0pi -e 's/.../.../g' a b c` replaces many `Edit` calls. Under `acceptEdits` it is denied: "The following part requires approval: perl -0pi -e ...".
  Acceptance: the probe prints the denial. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: probe on Claude Code 2.1.325 as the old plan states (probe name, date, and command not given).

- [ ] **CTX-553** With `permissions.allow: ["Bash(perl -0pi -e *)"]`, the perl call runs with no prompt (`permission_decision: accept, source: config`) and the files change.
  Acceptance: the probe prints `accept` with `source: config`. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: probe on Claude Code 2.1.325 as the old plan states (probe name, date, and command not given).

## Machine, Shell, And Disk

- [ ] **CTX-554** The CLI schema accepts `autoCompactWindow` only in the range 100000 to 1000000.
  Acceptance: a value of 99999 is rejected by the settings schema. Verification: probe.
  Basis: observed in transcript, 2026-11-16 (found with cc-inspect search). Status: unchecked at 088a227c (not reproduced in this audit).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:4092 (handoff, `38ae62d0` notes).

- [ ] **CTX-555** A `claude` run under a fresh `CLAUDE_CONFIG_DIR` is not logged in.
  Acceptance: `CLAUDE_CONFIG_DIR=<empty dir> claude -p` reports no login. Verification: probe.
  Basis: observed in transcript, 2026-11-16. Status: unchecked at 088a227c (not reproduced in this audit).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Ruled Out).
