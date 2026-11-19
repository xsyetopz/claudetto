# Machine

## Machine, Shell, and Disk

- [x] **CTX-526** On macOS (Darwin 27.2.0) ulimit -v, -m, and -d and setrlimit of RLIMIT_AS, RLIMIT_DATA, and RLIMIT_RSS all fail with EINVAL. Only RLIMIT_CPU takes a value.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:800.
  Verified: shell probe, claude 2.1.327 host (Darwin 27.2.0), 2026-11-19: ulimit -v and -d fail with invalid argument (setrlimit EINVAL), ulimit -t takes a value; zsh has no -m option, so RLIMIT_RSS was not rechecked.

- [x] **CTX-528** claude plugin test on a subfolder fails ("no hooks module to load"), and on a file fails ("no such plugin folder"). It starts one Claude Code child per test file, Math.min(files, availableParallelism()) at a time, and no flag or env lowers that. bun test skips lab files (bunfig.toml:29). A run of 1,553 tests in 79 files took 59 s, 3,389 MB, and 19 processes. So a hook change has no narrow check. Observed twice in transcripts (2026-11-09, 2026-11-14): `claude plugin test` needs the whole plugin root.
  Acceptance: the error reproduces on a subfolder. Verification: demonstration.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:465-466; observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241); 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11).
  Verified: claude plugin test --help and binary string search, claude 2.1.327, 2026-11-19: help shows one optional [dir] argument and no flag; the messages "no hooks module to load" (3 hits) and "no such plugin folder" (2) and availableParallelism (11) are in the bundle; the per-file child is stated in the help text.

- [x] **CTX-530** `caffeinate -i -t N` children are Claude Code's own sleep inhibitor (restarted on interval); stale MCP children after a plugin update are identified via `installed_plugins.json` (measured 2.1.319). Version `2.1.319+N` passes `claude plugin validate`, and the engine offers an update whenever the version text differs; `--strict` wants a README line `claude plugin install <name> --marketplace owner/repo`.
  Basis: measured (2.1.319); the `+N` version passing `claude plugin validate` re-measured on 2.1.327 (a plugin dir with version `2.1.319+3` exits 0 with one author warning; `--strict` exits 1 on that warning, `claude plugin validate`, 2026-11-18). The engine update on a changed version text and the `--strict` README line are kept as measured on 2.1.319, because they need an installed marketplace plugin and a marketplace update. Status: unchecked at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:420; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:421; openspec/changes/archive/2026-11-10-release-2-1-319-1/proposal.md:9.
  Verified: claude plugin validate and binary string search, claude 2.1.327, 2026-11-19: caffeinate is in the bundle (11 hits); the +N version result was already re-measured on 2.1.327 in the fact; the engine update and the --strict README line stay as measured on 2.1.319 (--strict is not listed in claude plugin validate --help on 2.1.327, which lists --json and --profile).
  Verified: PASS (partial): `claude plugin validate` on a copy of plugins/claudetto-openspec with version 2.1.319+3 exits 0 (warnings only), binary 2.1.327, 2026-11-19; `ps` shows caffeinate processes running now (5 found); the engine-update and --strict README line stay as measured on 2.1.319.

- [x] **CTX-531** Static `tsc` over the plugin checked nothing (`include` pointed at missing folders; `bun check` found 99 errors, 26 after generated tool declarations); Bun 1.4.4 `bun check` equals tsc; `NotebookEdit` carries `notebook_path`. Measured. Tool NotebookEdit is present in 2.1.326 (cc-inspect `surface` tool list, 2026-11-17). The `fold.ts` screen is recorded under Hooks and Events.
  Basis: measured; `bun --version` prints 1.4.4 on this machine and `notebook_path` is read by the 2.1.327 NotebookEdit activity code (chunk-asj6f58y.js@1063850, cc-inspect search, 2026-11-18). The 99 and 26 error counts are a 2026-11-09 result on a tree that no longer exists, kept as recorded. Status: unchecked at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:412.
  Verified: bun --version and binary string search, claude 2.1.327, 2026-11-19: bun prints 1.4.4; notebook_path appears 38 times in the bundle; the tsc include and error counts stay as measured on the repository.
  Verified: PASS (partial): bun --version prints 1.4.4, binary 2.1.327, 2026-11-19; notebook_path appears in the bundle; the 99 and 26 tsc error counts belong to a tree that no longer exists.

- [x] **CTX-532** git `diff`, `log`, and `show` accept `--output=<file>` and write it (exit 0) while `status` rejects it (exit 129): measured, 2.1.314 era; re-measured on git in a temp repo on 2026-11-18: `git diff --output=o1`, `git log --output=o2` and `git show --output=o3` each exit 0 and write the file, `git status --output=o4` exits 129.
  Basis: measured. Status: have at 088a227c (`plugins/claudetto/hooks/kernel/shell/readonly.ts:19-20`@088a227c: the regex `/^--(?:output|pre)\b/u` marks `--output` as a write or run).
  Source: openspec/specs/low-hitl/spec.md:87; openspec/specs/low-hitl/spec.md:117.
  Verified: PASS: checked at 2.1.327 (B-setup report). Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.

## Machine, Shell, and Disk
  Verified: git 2.56.1 in a temp repo, 2026-11-19: git diff, git log, and git show --output exit 0; git status --output exits 129.

- [x] **CTX-538** `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` turns off the built-in advisor tool; setup writes it with the value `1` so the claudetto decide tool is the only advisor. Present in 2.1.326 (bool; cc-inspect `surface` env, 2026-11-17).
  Basis: cited. Status: have at 088a227c.
  Source: openspec/specs/decide/spec.md:229; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/decide/spec.md:112; user decision, recorded in the 2026-11-17 handover (day of decision not recorded) (advisor tool stays disabled).
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_DISABLE_ADVISOR_TOOL is in the bundle (4 hits).
  Verified: PASS: hooks/settings/defaults.ts:37 writes CLAUDE_CODE_DISABLE_ADVISOR_TOOL "1"; defaults.test.ts:81 asserts it; `$C plugin test plugins/claudetto` 105 pass 0 fail, binary 2.1.327, 2026-11-19.

- [x] **CTX-539** The `claude-<uid>` temp folder, under `CLAUDE_CODE_TMPDIR`, `/tmp`, or the system temp, holds `-<project path>`, `bash-edit-diff`, `plugin-tool-staging`, and `cc-socks`. Present in 2.1.326 (`CLAUDE_CODE_TMPDIR` str; cc-inspect `surface` env, 2026-11-17).
  Basis: reported. Status: have at 088a227c.
  Source: openspec/specs/session-hygiene/spec.md:203; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/session-hygiene/spec.md:34.
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_TMPDIR (36 hits), plugin-tool-staging (2), bash-edit-diff (4), and cc-socks (9) are in the bundle; a fake-API run on 2.1.327 reported a messaging socket under /tmp/cc-socks.
  Verified: PASS: /tmp/claude-501 holds -<project path> folders, bash-edit-diff and plugin-tool-staging, and /tmp/cc-socks exists, binary 2.1.327, 2026-11-19; CLAUDE_CODE_TMPDIR is in the bundle.

- [x] **CTX-540** Silent-turn reminder text: env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` > server flag `tengu_hushed_lark_text` > default (2.1.319, read). 2.1.326: env present (also `_REMINDER` triBool, `_SECONDS`, `_TURNS`), and the gates `tengu_hushed_lark` and `tengu_hushed_lark_text` are present, the text default being "The user hasn't heard from you in a while. As you continue, keep them updated when there's something to tell — a finding, a change of plan." (cc-inspect `surface` env and gate, 2026-11-17); the order env over flag over default is verified on 2.1.327: `Llo()` returns `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` first, then the `tengu_hushed_lark_text` value, then the default text (chunk-m14bt1pz.js@3985537). `DISABLE_TELEMETRY=1` makes `cc-plugin-telemetry` unavailable (read 2.1.318; on 2.1.327 the plugin's `isAvailable` is `!TS()&&!Y()`, chunk-g8ypxj28.js@10244, and the plugin reads `DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, chunk-g8ypxj28.js@25731; the bodies of `TS` and `Y` were not read). In 2.1.326 the release notes say a command turned off by an environment variable such as `DISABLE_TELEMETRY` now says why instead of "Unknown command". `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` also stops updates and refuses `$.http.fetch` with `auth`: env (bool) and `$.http.fetch` present in 2.1.326, the refusal of `auth` is Dropped (2026-11-18): the `$.http.fetch` binding passes `auth` through (chunk-b0yr0k8v.js@297361) and a search found no refusal text. The effects of the flag found on 2.1.327 are a refused plugin-archive download (chunk-m14bt1pz.js@866461) and refused plugin routes (chunk-70j62gpb.js@2552). On 2.1.327 the same facts hold: the gate is `BR("silent_turn_reminder", ..., env)`, whose first line is `if(override!==void 0)return override` (chunk-t907shf5.js@1810), called with the env value (chunk-m14bt1pz.js@3985693), while `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` is read only by the text function (chunk-m14bt1pz.js@3985537), so `CLAUDE_CODE_SILENT_TURN_REMINDER:"0"` turns the reminder off whatever the text is, and the text never turns it on. On 2.1.325 `CLAUDE_CODE_SILENT_TURN_REMINDER:"0"` and `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` are not alternatives (`chunk-wqb2b4v0.js:3789361`; `$defaults` semantics in `DZn`, `chunk-sk365049.js:435`). On 2.1.325 `CLAUDE_CODE_SILENT_TURN_REMINDER` is read through `LR("silent_turn_reminder", ..., env)`, which returns the env override.
  Acceptance: the code at the offsets matches. Verification: inspection. The binary holds the call. Verification: inspection.
  Basis: cited. Status: partial at 088a227c.
  Source: openspec/specs/surface-trim/spec.md:337; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:388; openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:129; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes); `chunk-wqb2b4v0.js:3789361` (claude 2.1.325 binary; the module is gone from 2.1.327, see chunk-m14bt1pz.js@3985537 and @3985693 for 2.1.327) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); claude 2.1.325 binary (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT (4 hits) and tengu_hushed_lark_text (2) are in the bundle; the order was already verified on 2.1.327 in the fact.

- [x] **CTX-541** Engine inputs (cited, 2.1.319 source): `/restart` needs GrowthBook flag `tengu_fancy_wand` (default off), an interactive terminal, and macOS or Linux (verified on 2.1.327: `/restart` is enabled when stdin and stdout are TTYs, the platform is macOS or Linux, and `tengu_fancy_wand` is true, default false, chunk-m14bt1pz.js@2528300-2529185; the five further checks, traced by import: it needs `jpe()` true, meaning a standalone Bun binary (`Rm()`) whose `process.execPath` lies under `$XDG_DATA_HOME/claude/versions/` (default `~/.local/share/claude/versions/`, `tVe()`, chunk-dmvnf17x.js@532, chunk-tzsf4ern.js), so a source or npm run lacks it; and it is off when `Ff()` is set (a teammate agent, chunk-ytkczbf2.js@137176), `Zt()` (session kind `bg`, `CLAUDE_CODE_SESSION_KIND`, chunk-asj6f58y.js@1044060), `Pg()` (`--disable-slash-commands`, chunk-ytkczbf2.js@137619) or `Et()` (a remote session: `xn()` is `workspace==="remote"` in the surface caps, chunk-ytkczbf2.js@148899, and `cr()` is the attached remote connection of kind ccr, ssh or direct, chunk-61zc8nf4.js@1209); the command check `kga` also needs `A2r()===void 0`, so it is off once a newer version than the running one is known); on Linux sandbox `allowWrite` -> `--bind`, `denyWrite` -> `--ro-bind`, `denyRead` -> `--tmpfs` or `--ro-bind /dev/null`; `allowMachLookup` and `allowLocalBinding` are macOS-only; `excludedCommands` matches before the wrapper (no Linux run).
  Basis: cited. Status: unchecked: engine behaviour, no baseline code to check.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:145; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:164.
  Verified: PASS: tengu_fancy_wand at chunk-m14bt1pz.js@2528764; other parts not traced. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.

## Machine, Shell, and Disk
  Verified: binary string search, claude 2.1.327, 2026-11-19: tengu_fancy_wand is in the bundle (4 hits); the gate details were already verified on 2.1.327 in the fact.

- [x] **CTX-552** One `Bash` call `perl -0pi -e 's/.../.../g' a b c` replaces many `Edit` calls. Under `acceptEdits` it is denied: "The following part requires approval: perl -0pi -e ...".
  Acceptance: the probe prints the denial. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: probe on Claude Code 2.1.325 as the old plan states (probe name, date, and command not given).
  Verified: cc-inspect code cli fake API (no paid call), claude 2.1.327, 2026-11-19: with --permission-mode acceptEdits, a Bash call perl -0pi -e 's/a/b/g' f.txt was denied (subtype permission_denied, "This command requires approval"); the quoted "following part requires approval" wording is for compound commands and was not reproduced.
  Verified: PASS: cc-inspect cli `-p go --permission-mode acceptEdits`, binary 2.1.327, 2026-11-19: a Bash `perl -0pi -e` call without a config allow was refused (found 'requires approval' in request 2); the exact 'following part requires approval' wording is for compound commands and was not reproduced.
  Verified: tick audit 2026-11-19: the fake-API rerun on 2.1.327 recorded above is the check, and it passed.

- [x] **CTX-553** With `permissions.allow: ["Bash(perl -0pi -e *)"]`, the perl call runs with no prompt (`permission_decision: accept, source: config`) and the files change.
  Acceptance: the probe prints `accept` with `source: config`. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: probe on Claude Code 2.1.325 as the old plan states (probe name, date, and command not given).
  Verified: PASS: a perl allow ran under acceptEdits in a probe; the `source: config` text is not visible through cc-inspect. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.
  Verified: tick audit 2026-11-19: the fake-API rerun on 2.1.327 recorded above shows the allow; the `source: config` text is not visible through the fake API, so that half rests on the measurement in Basis.

## Machine, Shell, and Disk
  Verified: cc-inspect code cli fake API (no paid call), claude 2.1.327, 2026-11-19: with --settings allowing Bash(perl -0pi -e *) under acceptEdits, the same perl call completed with no prompt (tool_result is_error false).

- [x] **CTX-554** The CLI settings schema describes the per-model `autoCompactWindow` as "in tokens (at least 100000)" or "auto" (2.1.327, chunk-ja5z738t.js@279536). The 1000000 upper bound is not in the schema text and is not claimed.
  Acceptance: the schema text names 100000 as the floor. Verification: probe.
  Basis: cited, 2.1.327 setting description (cc-inspect code search, 2026-11-18); the earlier upper bound was observed in a transcript and is dropped as unconfirmed. Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:4092 (handoff, `38ae62d0` notes).
  Verified: binary string search, claude 2.1.327, 2026-11-19: "at least 100000" is in the bundle (2 hits); source already on 2.1.327.

- [x] **CTX-555** A `claude` run under a fresh `CLAUDE_CONFIG_DIR` is not logged in.
  Acceptance: `CLAUDE_CONFIG_DIR=<empty dir> claude auth status` reports no login. Verification: probe.
  Basis: measured, 2.1.327: `CLAUDE_CONFIG_DIR=<empty dir> claude auth status` prints `loggedIn: false`, `authMethod: none` (2026-11-18; `auth status` used so no API call is made). Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Ruled Out).
  Verified: source already on 2.1.327.
  Verified: PASS: checked at 2.1.327 (B-setup report). Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.

