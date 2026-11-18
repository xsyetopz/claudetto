# Kernel Requirements

## Guard Time Budget


## Hook Logging and Notice


- [x] **REQ-KERNEL-003** claudetto shall register one `classic.StopFailure` hook that calls `$.ui.notify` on the user's `preferredNotifChannel`, only on an API-error stop, behind the option `notificationsEnabled` (default true), with none for permission, idle, or elicitation (native handles those).
  Decision: ADR-0190, StopFailure notice stays in kernel after a code search confirms vanilla lacks it.
  Acceptance: An API-error stop notifies once; a permission prompt notifies nothing from claudetto. Verification: test.
  Basis: read. Status: have at 088a227c. claude 2.1.327: `classic.StopFailure` (chunk-m14bt1pz.js@4444295), `ui.notify` (chunk-dafpvz32.js@3391) and `preferredNotifChannel` (chunk-ja5z738t.js@294945) present (code search).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:150; plugins/claudetto/hooks/features/stop-notice/stop-notice.ts@088a227c. Idea only: external/2026-10-14/export-attention-sound- A Claude Code mod that plays a sound when Claude needs you, so you (Notification event present).
  Verified: test, claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto` (hooks/notice/stop.test.ts): a StopFailure notifies once with the error, a normal Stop notifies nothing. Code search: vanilla sends only the generic idle notice after the idle threshold (chunk-cfxefa64.js@56794). Revised: no `notificationsEnabled` option; the user's `preferredNotifChannel: notifications_disabled` already turns `$.ui.notify` off.




## Agent Conduct Rules



- [x] **REQ-KERNEL-009** Moved Out as OUT-2733: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).



- [ ] **REQ-KERNEL-013** claudetto shall put these rules in the root prompt: weigh a disputed claim as a third party's; drop an act the user says nobody asked for; look up a credential in the repo `.env`, then the environment, never ask the user for a new file; probe where undoing is free, but a needed dependency goes into the project (`bun add`); write a URL or name into a file only from a source read; report and wait after `! <command>` or a correction; announce a paid or background run; mark a guess. A paid tool must not pass the shell `ANTHROPIC_API_KEY` into a spawned `claude` (the key is billed before the subscription login).
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: none of these rules conflicts with never-search-for-secrets, block-is-final, one-line pre-call notice or corrections-as-context (the 2.1.322 dossier flagged them). The agent verifies a claim of the user against the repo or a probe before it relies on it; it stops when told to stop and starts no work the user has not named, including an inquiry into what vanished from the repo or from `~/.Trash`. Verification: inspection.
  Basis: read. Status: partial at 088a227c (`hooks/features/prompt/texts.ts:10` holds the message-sorting rule; a `git grep` of that folder for "nobody asked", ".env" and "bun add" finds none of the other rules; the conflict check is this item's acceptance and runs at build).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:119; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:281; reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204); user decision, 2026-11-16 (date of the handoff that records it.

## Env File and Shell Setup at SessionStart

- [x] **REQ-KERNEL-014** claudetto shall append `renice 10 -p $$` (children nice 10) and zsh `[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals` to `CLAUDE_ENV_FILE` at SessionStart only if absent (12 duplicate copies made each Bash command take 58.6 ms against 11.8 ms; `renice` is refused in the sandbox and its redirect hides that; read niceness with `perl -e 'print getpriority(0,0)'`). On a 10-core Mac, 10 two-second busy loops gave 26-27M by default, 23.7M under `nice -n 10`, 5.3M under `taskpolicy -c utility`, and 0 under `background`.
  Decision (ADR-0175, ADR-0190): only the zsh line ships, as a plugin SessionStart command hook in hooks/hooks.json, because `CLAUDE_ENV_FILE` reaches command hooks only and `renice` is refused in the sandbox. Verified 2026-11-18 on Claude Code 2.1.327 (cc-inspect cli, Bash calls): vanilla `grep -rn --include=*.ts x .` failed with "no matches found", exit 1; with the plugin it printed the match, exit 0, and `$options[nomatch]` read off.
  Acceptance: Two SessionStart runs leave one copy of each line in the env file. Verification: test.
  Basis: measured. Status: have at 088a227c. claude 2.1.327: `CLAUDE_ENV_FILE` (chunk-2ew0jg68.js@40538) and `classic.SessionStart` (chunk-m14bt1pz.js@1004602) present (code search).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:405; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:15; plugins/claudetto/hooks/hooks.json:10@088a227c; plugins/claudetto/scripts/session-start.ts@088a227c (as named by the old plan).

## Prompt





## Models and Context





## Order of Authority

- [x] **REQ-KERNEL-023** Moved Out as OUT-2734: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-KERNEL-024** Moved Out as OUT-2771: ADR-0177 and ADR-0190: on its fault prompts vanilla 2.1.327 passed in 6 of 6 Sonnet 5.5 runs, so no line ships (reports/2026-11-19-research/risks-kernel).

## Doing the Work

- [x] **REQ-KERNEL-025** Moved Out as OUT-2735: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-KERNEL-026** Moved Out as OUT-2736: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-KERNEL-027** Moved Out as OUT-2737: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [ ] **REQ-KERNEL-028** claudetto shall make the agent call tools by their exact case, such as `Bash`.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: no "No such tool available" error from case. Verification: transcript scan.
  Basis: reported. Status: missing at 088a227c (`git grep -n -i "exact case" 088a227c -- plugins/claudetto/hooks/features/prompt` finds none).
  Source: reported, user, 2026-11-16 18:24 UTC, tool names keep their case, `Bash` not `bash` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5608).

- [ ] **REQ-KERNEL-029** claudetto shall tell the agent to stop after two failed tries of the same approach, state what failed in its reply, and then switch approach or ask, provided a behavioural test shows it beats vanilla.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: on a task whose obvious fix cannot work, N=5 runs per arm count attempts of the same approach; the text ships only if the median is lower than vanilla Opus 5.5 and Sonnet 5.5 at medium, and its characters stay inside the root-prompt budget. No hook and no refusal is added (ADR-0154 stands). Verification: test.
  Basis: reported (one user; older runs repeated a broken fix five or six times). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-ai-agents-comments-1xx5l8s-im-tired-of-ai-explaining-thing-20261118T123732Z.md:344 (url: <https://www.reddit.com/r/AI_Agents/comments/1xx5l8s/im_tired_of_ai_explaining_things_instead_of/>); reports/2026-11-18-research/dossier.md:184.
