# Kernel Requirements

## Guard Time Budget

## Hook Logging and Notice

- [x] **REQ-KERNEL-003** claudetto shall register one `classic.StopFailure` hook that calls `$.ui.notify` on the user's `preferredNotifChannel`, only on an API-error stop, behind the option `notificationsEnabled` (default true), with none for permission, idle, or elicitation (native handles those).
  Decision: ADR-0190, StopFailure notice stays in kernel after a code search confirms vanilla lacks it.
  Acceptance: An API-error stop notifies once; a normal stop notifies nothing; claudetto registers no permission, idle or elicitation notice. Verification: test.
  Decision: no `notificationsEnabled` option, because the user's `preferredNotifChannel: notifications_disabled` already turns `$.ui.notify` off.
  Basis: read. Status: have at 088a227c. claude 2.1.327: `classic.StopFailure` (chunk-m14bt1pz.js@4444295), `ui.notify` (chunk-dafpvz32.js@3391) and `preferredNotifChannel` (chunk-ja5z738t.js@294945) present (code search).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:150; plugins/claudetto/hooks/features/stop-notice/stop-notice.ts@088a227c. Idea only: external/2026-10-14/export-attention-sound- A Claude Code mod that plays a sound when Claude needs you, so you (Notification event present).
  Verified: test, claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto` (hooks/notice/**tests**/stop.test.ts): a StopFailure notifies once with the error, a normal Stop notifies nothing. Code search: vanilla sends only the generic idle notice after the idle threshold (chunk-cfxefa64.js@56794). Revised: no `notificationsEnabled` option; the user's `preferredNotifChannel: notifications_disabled` already turns `$.ui.notify` off.
  Verified: re-run 2026-11-19, claude 2.1.327 plugin test plugins/claudetto: 105 pass, 0 fail: stop.test.ts 'an API-error stop notifies once with the error' and 'a normal stop notifies nothing' pass; the registered hook list the test run prints holds classic.StopFailure and no Notification, PermissionRequest or Elicitation hook.

## Agent Conduct Rules

- [x] **REQ-KERNEL-009** Moved Out as OUT-2733: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-KERNEL-013** Moved Out as OUT-2829: ADR-0177 and ADR-0190: the root prompt and `texts.ts` are gone (OUT-411); of the listed rules, disputed claim, scope and act-before-handoff passed on vanilla 2.1.327 in 3 of 3 Sonnet 5.5 runs each (reports/2026-11-19-research/conduct), and the rest have no measured gain, so no line ships.

## Env File and Shell Setup at SessionStart

- [x] **REQ-KERNEL-014** claudetto shall append `renice 10 -p $$` (children nice 10) and zsh `[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals sh_word_split`, and a zsh `TRAPDEBUG` that copies `$pipestatus` into `PIPESTATUS` with bash's 0-based keys (issue #82), to `CLAUDE_ENV_FILE` at SessionStart only if absent (12 duplicate copies made each Bash command take 58.6 ms against 11.8 ms; `renice` is refused in the sandbox and its redirect hides that; read niceness with `perl -e 'print getpriority(0,0)'`). On a 10-core Mac, 10 two-second busy loops gave 26-27M by default, 23.7M under `nice -n 10`, 5.3M under `taskpolicy -c utility`, and 0 under `background`.
  Decision (ADR-0175, ADR-0190): only the zsh line ships, as a plugin SessionStart command hook in hooks/hooks.json, because `CLAUDE_ENV_FILE` reaches command hooks only and `renice` is refused in the sandbox. Verified 2026-11-18 on Claude Code 2.1.327 (cc-inspect cli, Bash calls): vanilla `grep -rn --include=*.ts x .` failed with "no matches found", exit 1; with the plugin it printed the match, exit 0, and `$options[nomatch]` read off.
  Acceptance: Two SessionStart runs leave one copy of each line in the env file. Verification: demonstration.
  Decision: a hooks-module test cannot start a shell (`claude plugin test` refuses `node:child_process`: a module imports only its own files and "claude-code"), so the hooks.json command is run by hand.
  Basis: measured. Status: have at 088a227c. claude 2.1.327: `CLAUDE_ENV_FILE` (chunk-2ew0jg68.js@40538) and `classic.SessionStart` (chunk-m14bt1pz.js@1004602) present (code search).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:405; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:15; plugins/claudetto/hooks/hooks.json:10@088a227c; plugins/claudetto/scripts/session-start.ts@088a227c (as named by the old plan).
  Verified: 2026-11-19: the hooks.json SessionStart command run twice by /bin/sh with CLAUDE_ENV_FILE on a temp file exited 0 both times and left one copy of the zsh line (grep -c: 1).
  Verified: 2026-11-19, paid batchZ: claude-sonnet-5-5, zsh 5.9, plugin 71ae1e92a, $1.124. The model was asked to run a fixed command and its first Bash result was scored. `grep -rl --include=*.md TODO .` (tune, cluster A) got 0/6 on vanilla (`no matches found`) and 6/6 on claudetto. `echo ==== done` (confirm, cluster D) got 0/6 on vanilla (`=== not found`, exit 1) and 6/6 on claudetto. The control `ls *.md`, a matching glob, got 6/6 in both arms. The 24 transcript sessions with these faults had no claudetto loaded. Clusters E–H have no cure and are backlog in issue #61, because `ksh_arrays` would silently break `${pipestatus[1]}`.
  Verified: 2026-11-20, issue #61:`sh_word_split` added (RISK-508). Paid batchZE, claude-sonnet-5-5, zsh 5.9, plugin 691d4c050 plus the hooks.json change, $1.261: `C="echo hi there"; $C` (cluster E) got 0/6 on vanilla (`command not found: echo hi there`, exit 127) and 6/6 on claudetto; `F="a.txt notes.md"; wc -l $F` got 0/6 and 6/6; the control `false | true; echo "exit ${pipestatus[1]}"` printed `exit 1` in 6/6 on both arms. The hooks.json command run twice by /bin/sh left one copy of the line (grep -c: 1). Evidence: reports/2026-11-20-research/zsh/README.md.
  Verified: 2.1.331, 2026-11-24: both hooks.json SessionStart commands run twice by /bin/sh on a temp CLAUDE_ENV_FILE exited 0 each time and left 1 setopt line and 1 TRAPDEBUG line. cc-inspect cli, bypassPermissions, `echo ==== done; C="echo hi there"; $C; false | true; echo pipe=${PIPESTATUS[0]}`: vanilla printed the equals line (rc 0, no longer a fault), "command not found: echo hi there" (rc 127) and an empty pipe value; with the plugin it printed "hi there" (rc 0) and pipe=1, and ls on the unmatched glob *.nomatch got the literal (no nomatch error) -> PASS.

## Prompt

## Models and Context

## Order of Authority

- [x] **REQ-KERNEL-023** Moved Out as OUT-2734: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-KERNEL-024** Moved Out as OUT-2771: ADR-0177 and ADR-0190: on its fault prompts vanilla 2.1.327 passed in 6 of 6 Sonnet 5.5 runs, so no line ships (reports/2026-11-19-research/risks-kernel).

## Doing the Work

- [x] **REQ-KERNEL-025** Moved Out as OUT-2735: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-KERNEL-026** Moved Out as OUT-2736: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-KERNEL-027** Moved Out as OUT-2737: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-KERNEL-028** Moved Out as OUT-2830: ADR-0177 and ADR-0190: vanilla 2.1.327 made 0 wrong-case tool calls in 4 of 4 Sonnet 5.5 runs and returns a named `No such tool available` error that the model corrects on the next turn (OUT-2777, reports/2026-11-19-research/risks-verification), so no line ships.

- [x] **REQ-KERNEL-029** Moved Out as OUT-2831: ADR-0177 and ADR-0190: on a `deploy.sh` that always fails (license server unreachable) vanilla 2.1.327 stopped after one failing try in 5 of 5 Sonnet 5.5 runs, the same as the candidate line (4 of 5 after one try, 1 of 5 after two), so the median is not lower and no line ships (reports/2026-11-19-research/risks-reply-reqs, batch-act.sh, seed k).
