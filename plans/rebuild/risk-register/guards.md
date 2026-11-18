# Guards Risks

## Destructive Cleanup

- [x] **RISK-030** Moved Out as OUT-2315: the item describes a part that plugins/ does not ship.

## Cost

- [x] **RISK-031** Repeat reads and repeat runs: the agent re-reads unchanged files and edits unread ones.
  Category: cost.
  Cause: compaction drops the read record.
  Event: 35% of file reads were repeats of an unchanged file; edits land on unread files (77% claimed, mostly post-compaction).
  Consequence: wasted spend; a wrong edit.
  Likelihood: 2. Impact: 2.
  Existing controls: `plugins/claudetto/hooks/features/repeat/` at 088a227c.
  Response: mitigate.
  Actions: PreToolUse hook refusing a repeat read of an unchanged file (hash/mtime) and a read-before-edit gate.
  Trigger: a second Read of a file with an unchanged mtime.
  Owner: guards. Status: partial at 088a227c.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:33 (35% of file reads were a second read of an unchanged file); external/2026-11-03/reddit.com-r-claudecode-comments-1t93ikr-best-hooks-you-use-20261103T145257Z.md:43 (77% of edits on unread files, mostly after compaction; reported by a Reddit user). Code: plugins/claudetto/hooks/features/repeat/repeat.ts@088a227c.
  Status: closed 2026-11-18: the repeat guard and read-before-edit gate are not shipped (OUT-178: no Read is denied by size or repeat; 4.2% of reads were redundant). `git grep -F -e 'features/repeat' -e readGuard -- plugins` finds no hit.

## Guards

- [x] **RISK-032** The baseline claudetto confine blocks a pty, so `script`, `expect`, `tmux`, and some test runners fail.
  Category: product.
  Cause: the confine (not the built-in sandbox) profile `profile.sb` denies `file-write*` except a device list without `/dev/ptmx`, so `os.openpty()` fails (17 of `kern.tty.ptmx_max` 511 in use). `docs/confine.md` and `design.md:172` record it. The same profile refuses writes outside the project and temp folders (`touch ~/.probe-sbx-write`; the A1-B2 `mkdir` of `~/.claude/plans` got "Operation not permitted").
  Event: probe scripts with a pty failed under the baseline claudetto confine.
  Consequence: a tool that opens a pty fails; the user set `confineEnabled` false afterwards. The confine code is not in `plugins/` at 088a227c.
  Likelihood: 3. Impact: 2.
  Existing controls: `confineEnabled` false.
  Response: avoid.
  Actions: do not ship a confine profile that denies `/dev/ptmx` without a switch.
  Trigger: a tool that calls `os.openpty()`.
  Owner: guards.
  Status: closed 2026-11-18: the confine profile is not shipped; `git grep -F confine -- plugins` finds no hit, and the sandbox is Claude Code's own (ADR-0188).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2331.

- [x] **RISK-033** Two concurrent tool failures overwrite each other in the failure ledger, so the repeat-failure check allows a third identical failure.
  Category: guards, race.
  Cause: in limits/hold.ts the failure ledger was read as the first argument of withFailure and `await $.clock.now()` as the third, so two concurrent PostToolUseFailure events overwrote each other.
  Event: with maxIdenticalFailures 2, two concurrent identical failures were allowed.
  Consequence: an agent repeats a failing call past the limit; spend wasted.
  Likelihood: 3 (reproduced once in the lab).
  Impact: 3.
  Existing controls: the cure was made on 2.1.321: read the clock first, then the ledger; the lab passed 1,450 tests with 0 failures and the check then denied. The file limits/hold.ts is not in the baseline tree 088a227c.
  Response: mitigate.
  Actions: read the clock before the ledger in any rebuilt withFailure caller; keep a test with two concurrent failures.
  Trigger: a PostToolUseFailure repeat that is not denied at maxIdenticalFailures.
  Owner: guards.
  Status: closed 2026-11-18: the failure ledger is not shipped (ADR-0154 removed the fail-limit hold; OUT-016); `git grep -F -e failLimit -e withFailure -- plugins` finds no hit.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:713 (P43, measured).

- [x] **RISK-034** Moved Out as OUT-2316: the item describes a part that plugins/ does not ship.

- [x] **RISK-035** Each worktree Claude Code creates flips the shared core.hooksPath to an absolute path, and the bedrock guard-base prints "git hooks are off".
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: the bedrock repo's guard-base hook, owned by that repo).
  - Category: guards, git hooks.
  - Cause: Claude Code runs plain git config core.hooksPath <absolute> from the worktree, which writes the shared .git/config, so the main repo flips to the absolute form. The bedrock guard-base compares to the literal .githooks; Workers in separate worktrees share one `.git/config`; a worker most likely wrote an absolute path where the guard needs exactly `.githooks`.
  - Event: guard-base reports hooks off though they are on; the agents' fix attempts were refused 75 times; The hook guard fails for every worker that commits; the sandbox blocked the lead's fix and the unsandboxed retry was denied.
  - Consequence: wasted turns in 8 projects (2026-11-09 to 2026-11-13); hooksPath read .githooks 64 times and the absolute form 54 times; Workers cannot commit until the user runs the fix.
  - Likelihood: 5 (measured in most worktree sessions)
  - Impact: 2
  - Existing controls: the cure: guard-base compares resolved paths from the git-common-dir root with pwd -P, and a .githooks/pre-push runs just verify. Probe P-D10.1b: .githooks and <root>/.githooks pass; unset, /tmp/elsewhere, and .git/hooks fail. Baseline plugins have no hooksPath hit (git grep); The guard reports the mismatch.
  - Response: mitigate.
  - Actions: change guard-base to compare resolved paths (task 7.10, P-D10.5); Brief each worker not to change git config; have the lead check core.hooksPath after workers end.
  - Trigger: "git hooks are off" printed in a repo whose hooks run; A worker runs `git config` or an LFS install in a shared clone.
  - Owner: guards
  - Status: closed, ADR-0190 (out of scope, cause outside claudetto: the bedrock repo's guard-base hook, owned by that repo).
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:371-375 (measured); openspec/changes/archive/2026-11-16-2-1-323/tasks.md:67; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/a106dac3-8014-4a19-a503-e4426f00617b.jsonl:210 (agent reply: the shared config now holds an absolute path); observed in transcript, 2026-11-12 (reported).

- [x] **RISK-036** Moved Out as OUT-2317: the item describes a part that plugins/ does not ship.

- [x] **RISK-037** Hand-written shell parsers and swallowed errors let a destructive command through.
  Category: agent-built code.
  Cause: the agent grew four shell-command parsers with different wrapper lists, two hook runtimes, and 36 of 38 `catch` sites that swallow errors, instead of using one documented mechanism.
  Event: one parser missed `timeout 5 git reset --hard`.
  Consequence: a guard passes a command it should stop, and a fault in the guard is never seen.
  Likelihood: 1. Impact: 4.
  Existing controls: none found in the source.
  Response: avoid.
  Actions: before a new file format or feature module, check the documented extension points and the existing mechanisms (Rule of Least Power for data and code); one shell parser; no `catch` that swallows an error.
  Trigger: a second parser or a second hook runtime appears in a block.
  Owner: guards.
  Status: closed 2026-11-18: the gate and its hand-written shell parsers are dropped (OUT-035, OUT-021, ADR-0125); `git grep -F -e useBashRules -e 'kernel/shell' -- plugins` finds no hit.
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:39; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:40; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:41 (session log dce7cae9).

- [x] **RISK-038** A blocked delete is handed to the user as a `!` one-liner with no file list.
  Category: agent conduct.
  Cause: the agent offloads a blocked action instead of naming what it would remove.
  Event: a blocked delete pipeline was handed to the user as a `!` one-liner with no file list.
  Consequence: the user must run a command they cannot review.
  Likelihood: 1. Impact: 2.
  Existing controls: none found in the source.
  Response: mitigate.
  Actions: name each path the command would remove before it is handed over.
  Trigger: an agent suggests a `!` command that deletes.
  Owner: guards.
  Status: closed 2026-11-18: the gate denial that handed over a `!` one-liner is dropped (OUT-035, OUT-021); `git grep -F 'person must approve' -- plugins` finds no hit.
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:164.

- [x] **RISK-039** Bun fails silently on a denied `.env` and costs about 8 calls.
  Category: product failure.
  Cause: Bun auto-reads `.env`, which the sandbox denies.
  Event: Bun failed silently on a denied `.env`; the agent spent about 8 calls to find the cause.
  Consequence: an extra 8 calls in the session.
  Likelihood: 1. Impact: 2.
  Existing controls: none found in the source.
  Response: mitigate.
  Actions: name the `.env` read as a likely cause in the Bash text or the sandbox notes.
  Trigger: a Bun command fails with no output inside the sandbox.
  Owner: guards.
  Status: closed 2026-11-18: setup text for sandbox refusals is dropped (OUT-017); no Bash text of claudetto names a denied `.env` read.
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:156.

- [x] **RISK-040** Agent reaches a protected file or action through a channel the guard does not watch.
  Category: guards
  Cause: A guard keyed to one tool name (a shell read denied) leaves another path open (the read tool); a prompt rule is the only fence; a deny rule blocks one command and the agent picks another that does the same thing; a write deny on one path leaves another route to the same bytes open.
  Event: Checker run of 14 agents, 480 runs: 13 of 14 read a protected file they were told not to touch; only OpenClaw held, 0 effects in 96 runs. 10 of 14 ran the deploy. 8 cells were denied on one channel while the effect arrived through another; 277 more never asked at all. All 4 credential leaks went through the read tool and the approver never saw them. Another report: a user with a settings file of deny cases caught the agent three times reporting it had no permission and then finding a way around it (first `git rm`, second `node` to remove the file) (reported, one user); a write-denied `.mcp.json` was preserved through a `git archive` tarball.
  Consequence: A secret leaks or a protected file is read although a guard exists; a deny is routed around without the user knowing and the protected action happens anyway.
  Likelihood: 2 (the author's checker plus commenters who report the same route-around)
  Impact: 5
  Existing controls: Guards in `features/protected` and `secrets` at 088a227c deny by path in a PreToolUse hook.
  Response: mitigate
  Actions: Put the boundary on the resource, not the tool: make the path absent (service account or sandbox without the mount). Keep prompt rules for preferences only. Hash protected files and audit after the run. Log every denied read as the signal of which boundary the agent probes. Treat a deny list as a hint to the agent, not a lock; treat a deny as final for that action (Block) and report it instead of finding another route.
  Trigger: A denied read is followed by a read of the same path through another tool, or an agent report of "no permission" is followed by a different command on the same target.
  Owner: guards
  Status: open
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xhqvzn-comment-19rsjcqyuqin7-20261106T080754Z.md:792 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xhqvzn/opus_55_just_shared_my_email_address/>); external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:163; external/2026-11-14/reddit.com-r-aiagents-comments-1xqjioz-i-tested-14-coding-agents-agains-20261113T195316Z.md:31,33,102; external/2026-11-14/reddit.com-r-aiagents-comments-1xqjioz-i-tested-14-coding-agents-agains-20261113T195316Z.md:61,79,98 (url: <https://www.reddit.com/r/aiagents/comments/1xqjioz/i_tested_14_coding_agents_against_their_own_rules/>).
  Verified: claude 2.1.327, 2026-11-18. The OS sandbox plus the Read deny rules cover every shell channel: cc-inspect cli probe, redirect, tee, cp and python open of a denied path all failed with Operation not permitted (vanilla read the file). claude plugin test plugins/claudetto: 35 pass. A channel outside the shell and Read tools (an MCP server) is not covered.

- [x] **RISK-041** Moved Out as OUT-2318: the item is a third-party report with no probe.

- [x] **RISK-042** A foreign-package-manager regex denies a read-only script and gives two verdicts for one text.
  Category: guards, regex.
  Cause: the bedrock hook FOREIGN regex (register.ts:15-16, blockForeign) denies a read-only bun script whose single-quoted argument holds "npm |pnpm" with "this repo uses Bun". The same text gets two verdicts by quote style: single quotes true, double-quoted rg false, FOO=1 npm test true.
  Event: a false denial of a harmless script.
  Consequence: a wasted turn and a wrong block.
  Likelihood: 3 (reproduced once).
  Impact: 2.
  Existing controls: cure: delete the regex and write permissions.deny Bash(npm *) rules, since the engine matches each parsed subcommand (probe with Bash(cowsay*): quoted forms ran; bare, env-prefixed, chained, and piped forms were denied). This matches the decision of no regex Stop check (user decision, 2026-11-16).
  Response: avoid.
  Actions: delete the regex; add the deny rules.
  Trigger: a denial of a command that only names npm in a string.
  Owner: guards.
  Status: closed 2026-11-18: the foreign-package-manager regex lived in `useBashRules`, dropped by OUT-021; `git grep -F useBashRules -- plugins` finds no hit.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:535-539 (measured).

- [x] **RISK-043** Worktree guard denies the session's own worktree paths.
  Category: product defect.
  Cause: `ownsOf` (`tool.check/useBashRules/processes.ts`) never reads the paths `createdOf` returns, so the guard denies the session's own `git worktree add` path and variable or loop forms of an own worker's path, while the Stop cleanup counts the same paths as owned.
  Event: 44 denied calls (36 from leads, 8 from subagents) in 22 sessions over five days.
  Consequence: an extra turn per denial, and a hand-off to the user for work the agent can do.
  Likelihood: 4
  Impact: 2
  Existing controls: none.
  Response: mitigate.
  Actions: have `ownsOf` read the paths `createdOf` returns, so guard and Stop cleanup share one rule of ownership.
  Trigger: a Bash call that names a path the session created, through a variable, a loop, or `git worktree add`.
  Owner: guards
  Status: closed 2026-11-18: the worktree ownership check of `own.ts` is dropped (OUT-021); `git grep -F -e ownsOf -e createdOf -- plugins` finds no hit.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:495; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:506 (measured).

- [x] **RISK-044** Kill gate takes numbers in background output as pids.
  Category: product defect.
  Cause: `startedPids` takes every number in the output of any backgrounded call (ports, line counts, date parts) as a pid. The denial rule "A denial declines the action, not the tool" then makes a wrong denial final.
  Event: in OpenJoystickDriver `b429b5a4` the gate denied `kill -TERM 37064` for an app the agent had installed; its pid list read "33, 18337393, 20, 67, 15757, 25, 501, 05884638". The agent wrote "I'm not allowed to stop the running app" and handed the user the install. 11 denials in one session.
  Consequence: work handed back to the user; the user answered that the agent could have done it itself.
  Likelihood: 3
  Impact: 2
  Existing controls: none.
  Response: mitigate.
  Actions: take a pid only from a field that is a pid, not from any number in the output.
  Trigger: a `kill` of a process that a backgrounded call started.
  Owner: guards
  Status: closed 2026-11-18: `kill.ts` is dropped (OUT-021); `git grep -F -e Owns -e STALE_TASKS -- plugins` finds no hit.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:724 (measured).

- [x] **RISK-045** Pipefail gate and read guard refuse harmless calls.
  Category: product defect.
  Cause: `pipefail.ts` treats every `just` and `claude plugin` command as a check; `heavyFile` (`settings.read/useSlimSurface/surface.ts:68-76`) judges by path, so it refused small files under `node_modules` and `.build`.
  Event: 19 of 116 masked-exit denials were help, list, or version calls; 14 heavyFile denials of small files; 23 bare "Exit code 1" results, 10 of them beginning with `set -o pipefail;`; 655 "Use `Read`", 617 "Use `Write`", 29 "Use `Edit`" refusals, 364 more joined by `cc-plugin-privacy` in 5 days; 16 `.git/config` lock errors, 13 of them from `git config core.hooksPath .githooks`.
  Consequence: extra turns and unexplained failures.
  Likelihood: 4
  Impact: 2
  Existing controls: none.
  Response: mitigate.
  Actions: delete the pipefail rule (old task 5.3); judge a read by size, not path alone.
  Trigger: a `just --list`, `claude plugin` help call, or a read of a small file under a generated folder.
  Owner: guards
  Status: closed 2026-11-18: the pipefail gate and read guard are dropped (OUT-145, OUT-021, OUT-178); `git grep -F -e pipefail -e readGuard -e surfaceCall -- plugins` finds no hit.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:626; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:634; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:635; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:636; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:637 (measured).

## Agent Habits

- [x] **RISK-046** Moved Out as OUT-2319: the item is a third-party report with no probe.

- [x] **RISK-047** A browser agent types into an unfocused box and its keystrokes hit site shortcuts.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: the browser tool, owned by agent-browser).
  Category: guards
  Cause: Clicking by element ref gives no focus.
  Event: In Gmail the reply box got no focus; the ? opened the shortcut list, e archives, # deletes; X went to the likes page. A shared Chrome tab switch ran a script on another site.
  Consequence: Mail archived or deleted, or a script run on the wrong site.
  Likelihood: 2
  Impact: 4
  Existing controls: none found.
  Response: mitigate
  Actions: Click by screenshot coordinates, then check document.activeElement is the message body before typing; check the URL at script start; give each job its own browser.
  Trigger: A typing step with no focus check.
  Owner: guards
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: the browser tool, owned by agent-browser).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xu9z26-whats-the-one-rule-that-stoppe-20261116T052731Z.md:71,83,85 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xu9z26/whats_the_one_rule_that_stopped_claude_code_from/>).

- [x] **RISK-048** Moved Out as OUT-2320: the item is a third-party report with no probe.

- [x] **RISK-049** Moved Out as OUT-2321: the item is a third-party report with no probe.

## Credential Leaks

- [x] **RISK-050** Agent finds a broad token in an unrelated file.
  Category: agent
  Cause: PocketOS case: a token made for one small job sat in an unrelated file and could delete anything.
  Event: The agent finds the token and uses it for a destructive call.
  Consequence: Production data deleted.
  Likelihood: 1
  Impact: 5
  Existing controls: secrets guard at 088a227c scans for credentials (plugins/claudetto/hooks/kernel/secrets.ts)
  Response: mitigate
  Actions: Least-privilege per-job tokens.
  Trigger: The agent reads a token file outside its job.
  Owner: guards
  Status: open. Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xaqse6-the-agent-was-almost-never-the-w-20261022T012322Z.md:73 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xaqse6/the_agent_was_almost_never_the_way_in_i_went/>).
  Verified: claude 2.1.327, 2026-11-18. The OS sandbox plus the Read deny rules cover every shell channel: cc-inspect cli probe, redirect, tee, cp and python open of a denied path all failed with Operation not permitted (vanilla read the file). claude plugin test plugins/claudetto: 35 pass. Env files and credential stores are denied; tokens in other files are not scanned.

- [x] **RISK-051** Bulk run to an outside model sends a secret.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: the outside-model client, owned by the user's bulk-run setup).
  Category: agent
  Cause: The first bulk run to the outside model sent a memory file holding a LAN login, because the client-content screen did not look for secrets.
  Event: A credential leaves the machine.
  Consequence: A secret leaked.
  Likelihood: 1
  Impact: 5
  Existing controls: secrets guard at 088a227c (plugins/claudetto/hooks/kernel/secrets.ts)
  Response: mitigate
  Actions: A credential screen on every item plus an outright block of work content; the tool lists withheld items (16% of one 267-issue run) instead of dropping them silently.
  Trigger: An item bound for an outside model that matches a credential pattern.
  Owner: guards
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: the outside-model client, owned by the user's bulk-run setup).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:102 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/>).

## Auto-Mode Classifier Rulings

- [x] **RISK-052** Auto-mode classifier rulings are inconsistent across similar calls.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: the auto-mode classifier, owned by Claude Code).
  Category: agent.
  Cause: the classifier rules each call on its own; one denial carried over to a read-only `ls`.
  Event: a harmless call is denied, or a similar one allowed.
  Consequence: an extra turn or a stalled task.
  Likelihood: 1.
  Impact: 2.
  Existing controls: none known.
  Response: accept.
  Actions: none; the plugin cannot change the classifier.
  Trigger: a denial of a read-only call in auto mode.
  Owner: guards.
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: the auto-mode classifier, owned by Claude Code).
  Source: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts (the ls denial and CC 2.1.292-296 report).

## Boundaries and Safety

- [x] **RISK-053** Held-out leak: a session sees data the wall must keep from it.
  Category: safety.
  Cause: the wall depends on a user deny layer and on file tools only.
  Event: a session printed the first 110 characters of every user answer in 55 mined sessions to the agent that must not see them; a held-out file was read through `head`/`grep` after the user's deny rule vanished; held-out cases and regexes were printed; a graded run folder sat outside the wall.
  Consequence: the held-out set no longer measures anything.
  Likelihood: 4. Impact: 4.
  Existing controls: `protectedPaths` default `~/.claudetto-holdout` at baseline (`plugins/claudetto/.claude-plugin/plugin.json:84`, `plugins/claudetto/hooks/features/setup/changes.ts:131`). Not covered: globs, interpreters, symlinks, a search rooted above the wall.
  Response: mitigate.
  Actions: plugin-shipped protected-path list at the gate; a startup line when the user's deny layer is missing; deny `Read` plus `sandbox.filesystem.denyRead` (2.1.327: present, `chunk-ja5z738t.js@115660` names `filesystem.denyRead`); counts only via the user's `!` command.
  Trigger: a read of a path under the wall by Bash or an interpreter.
  Owner: guards. Status: partial at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/levers-review.md:20; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:380; plugins/claudetto/.claude-plugin/plugin.json:84@088a227c; plugins/claudetto/hooks/features/setup/changes.ts:131@088a227c.
  Verified: claude 2.1.327, 2026-11-18. The OS sandbox plus the Read deny rules cover every shell channel: cc-inspect cli probe, redirect, tee, cp and python open of a denied path all failed with Operation not permitted (vanilla read the file). claude plugin test plugins/claudetto: 35 pass. The holdout wall is in deny, denyRead and denyWrite by default; the holdout path itself was not probed.

- [x] **RISK-054** Moved Out as OUT-2322: the item describes a part that plugins/ does not ship.

## Process Hygiene

- [x] **RISK-055** Process hygiene failure: the agent starts, kills, or forgets processes it does not own.
  Category: process.
  Cause: no ownership check on targets.
  Event: loose `pkill -f` killing the user's or own shell; `until`/`while` busy-wait loops (full core each; a 32 min loop counted four successes when one was 403); expiring Monitors; orphaned jobs and fake APIs for 7 days; duplicate paid suites; many heavy runs at once (2026-11-11 freeze; >6 GB per test file); false reassurance that a background process was idle (billing while looping); another session's test run killed; 299 triple-polls in a benchmark; unannounced runs; unclosed subagents; `/goal` continuing hours after a classifier denial.
  Consequence: user work lost or spend.
  Likelihood: 4. Impact: 4.
  Existing controls: `plugins/claudetto/hooks/features/setup/command-rules.ts:75@088a227c` (deny `pkill *`, `killall *`); `plugins/claudetto/hooks/features/hygiene/`.
  Response: mitigate.
  Actions: kill by recorded pid only; locks; memory guard; gate deny; halt-the-loop rule; verify with the process list; cap spend externally.
  Trigger: `pkill -f`, an unbounded `while`/`until` loop, or a second heavy run.
  Owner: guards. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:97; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:82; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:317; external/2026-10-14/export-PSA- Claude Code wrote me an uncapped test loop, ran it in the background, told me it was “idle,” th.jsonl:1 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x540si/psa_claude_code_wrote_me_an_uncapped_test_loop/>); plugins/claudetto/hooks/features/setup/command-rules.ts:75@088a227c. Unlocated: the 2026-11-11 freeze, 299 triple-polls, 32 min loop.
  Status: closed 2026-11-19: pkill and killall ask first, and the free-memory hold gates heavy calls.
  Verified: fill.test.ts 'asks before stash, tag pushes and process kills' passes; rules.ts ASK holds `Bash(pkill *)` and `Bash(killall *)`; the memory hold stops a call under 20% free; claude plugin test plugins/claudetto: 54 pass (2.1.327, 2026-11-19). Weak tick: kill by recorded pid is not enforced.

- [x] **RISK-056** Runaway background work: a process outlives its turn and spends on.
  - Category: process.
  - Cause: no timeout, no stop condition, no owner for the process after the turn; the agent waits with `until grep ...; do :; done` and a monitor on `tail -F`, which keeps waiting after the shell exits; Claude Code wrote an uncapped test loop, ran it in the background, called it "idle", and the run went on until the daily usage limit; it read files with `cat` and `sed`, appended with `printf >>`, bulk-edited with `bun -e`, left two `until grep; do :; done` loops that used a core each, and gave a slash command behind the `!` prefix, which the shell cannot run.
  - Event: one agent left a render running 9 hours; a session stuck with zero tokens used; uncapped background tests kept calling about 17 h for about $2.1K after the session hit its limit; a duplicate paid run after a sandboxed `pgrep` failure read as "no eval running"; an Opus 5.5 task of about 2 h ran 6 h; a sandbox cut prompts 84% (vendor) but a 24-run guardrail pack showed 0 crossings in both arms (counter-evidence); two loops each used a full CPU core while they waited; a monitor never ended by itself; 17 hours on Haiku 4.5 over Bedrock, about $2.1K (one report); each slip, as the agent itself listed them.
  - Consequence: a wasted session or spend; load on the machine; an agent that must stop the monitor itself; wasted spend; a rule broken; a core busy; an error for the user.
  - Likelihood: 3
  - Impact: 4
  - Existing controls: the gate denies a loop with no time limit (seen in the report); a hook denies a background loop with no time limit.
  - Response: mitigate.
  - Actions: PreToolUse hook prefixing `timeout 30m` on background commands and a runaway guard at the Stop check; job lock with PID, Stop hook listing children by recorded pid and `TaskStop`; budget action that blocks calls (`--max-budget-usd`, 2.1.327: present, `chunk-avas472e.js@1436`); status-request steer after about 30 min via hook; wall-time cap; claudetto shall keep denying a wait loop with no overall time limit and shall name a sleep or an event wait instead; cap background loops; use Read, Edit, and a bounded wait; give a slash command to type at the prompt.
  - Trigger: a background command with no `timeout`; a loop with an empty body or a monitor on `tail -F` without an end; a background command with no end condition; a shell read or append, an unbounded loop, or a `!` line with a slash command.
  - Owner: guards
  - Status: closed 2026-11-19. General cure: a wall-time limit on every Bash call, foreground or background (`hooks/guards/limit.ts`, option `bashTimeLimitMinutes`, default 30). A perl watchdog stops the call's process group, which is that call's tree, because Claude Code starts each Bash call as its own group leader (checked: shell pid equals its pgrp). Probe on 2.1.327 with the limit at 0.1 min: `sh -c 'sleep 40 & sleep 40'` ended after 6 s with the reason line in the result; `echo quick` returned in the same second.
  - Source: external/2026-10-14/export-PSA- Claude Code wrote me an uncapped test loop, ran it in the background, told me it was “idle,” th.jsonl:1 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x540si/psa_claude_code_wrote_me_an_uncapped_test_loop/>); external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:85; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:82; external/2026-10-07/export-I benchmarked my own guardrail pack. It made no difference. Posting it anyway.jsonl:8 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wzrhae/i_benchmarked_my_own_guardrail_pack_it_made_no/>; the 0-crossings counter-evidence); external/export--clear vs -compact.jsonl:59; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11; openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:113 (reported, one report); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13).

- [x] **RISK-492** A claudetto command rewrite turns every allowed Bash call into an approval request.
  - Category: agent behaviour (plugin defect).
  - Cause: Claude Code checks permissions on the command a `tool.call` hook rewrote, and its parser asks about a brace group or a quoted brace ("A group in braces or double parentheses in this command can't be checked before it runs"). The stdin, time-limit and commit guards wrap every command in braces. Their probes ran under `bypassPermissions`, which hid the ask.
  - Event: probe, claude 2.1.327, 2026-11-19, cc-inspect cli under `acceptEdits` with `Bash(git *)` allowed: `git init` was refused with that message, and a perl edit with "Contains brace with quote character (expansion obfuscation)".
  - Consequence: in default and acceptEdits modes each Bash call needs approval; under `-p` each is refused. A dialog or saved rule would carry the wrapper, not the model's command.
  - Likelihood: 5
  - Impact: 4
  - Existing controls: none.
  - Response: mitigate.
  - Actions: one general cure for every command rewrite. `hooks/guards/shell.ts` asks the session's verdict for the model's own command first, wraps only an allowed command, and answers the check of the wrapped call with that verdict. A command that needs approval or is denied runs as written, so the dialog, saved rules and the auto mode classifier see the model's text. A guard probe runs under `acceptEdits`, not `bypassPermissions`.
  - Trigger: a Bash result with "can't be checked before it runs" or "expansion obfuscation" for a command the rules allow.
  - Owner: guards
  - Status: closed 2026-11-19. Probe on 2.1.327 under `acceptEdits` with allow `Bash(git *)`, `Bash(perl -0pi -e *)` and deny `Bash(git push --force*)`: `git init` ran, the perl edit ran, the force push was denied with the vanilla text, and an unlisted `curl` got the vanilla "This command requires approval". `false | tail -1 && git commit` made 0 commits, so the guards still wrap allowed calls.
  - Source: probe, claude 2.1.327, 2026-11-19 (cc-inspect cli); `extend/mod-api/calls/tool-command-config` (clawdipedia, read 2026-11-19): `tool.check` fires after `tool.call`.

## Reply Style and Sycophancy

- [x] **RISK-057** Narration in shipped source.
  Category: Agent behaviour.
  Cause: The agent logs its own session where it works.
  Event: Session history ("added during task 3", "as discussed", "the user decided") lands in source; 218 added comments in 1,610 edits in 22 stored sessions.
  Consequence: Source carries stale session history.
  Likelihood: 3. Impact: 2.
  Existing controls: None.
  Response: mitigate.
  Actions: A PreToolUse Write|Edit provenance guard on added lines (ask by default, AGENT_TERMS_PROVENANCE_MODE=deny), plus a FileChanged hook or CI lint for Bash writes.
  Trigger: An added line cites the session or the user's decision.
  Owner: guards. Status: closed 2026-11-19: not reproduced on vanilla 2.1.327; the cure 1 fault prompt passed in 3 of 3 Sonnet 5.5 runs without a claudetto line (reports/2026-11-19-research/conduct).

  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/agent-conduct/spec.md:153; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:32 (SA-2.5)

## Autonomy, Consent, and Scope

- [x] **RISK-058** Overreach and unrequested work.
  Category: Agent behaviour.
  Cause: Acts on non-tasks, follows instructions to an extreme, reads casual remarks as instruction ("let's", "no limit" committed as a design); repo habits taken for task requirements; scope text missing or not enforced; overeager framework behaviour (SNARE: framework about 56% of variance); a standing "fix what you touch" rule ignored; The agent blames a tool for a change in the user's file and starts to restore the file, with no check and no task for it; the agent finds a missing tool (biome not installed) and runs `bun install` unasked.
  Event: The agent takes over ("I'm taking this over"), makes architecture decisions, renames to single letters, restores deleted sections with no proof, runs untasked bun install, an unannounced paid run, a feature branch or PR, a refactor hiding a permission change, deploys on "deploy", force pushes, git add -A, whole-repo bun fmt, edits files the task did not name or a config outside the repo, writes files outside the task folder (Sonnet 5.5, 4 of 35 tasks), adds tests and docs nobody asked for (Sonnet 5.5), adds abstractions (Opus at max); The agent plans to restore two project sections it says adopt deleted. The user says it was not tasked to restore them and has no proof. The agent then runs a check of the claim, and the user says it was not tasked to check either; the user states the agent was not tasked to install it.
  Consequence: Unreviewed changes land in the user's tree; An edit of user content on a guess, and a turn spent on work nobody asked for; an extra turn, and a changed install the user did not ask for.
  Likelihood: 4. Impact: 4.
  Existing controls: plugins/claudetto/hooks/features/protected at 088a227c (partial).
  Response: mitigate.
  Actions: Scope edits to the task and report other defects by place only; classify the message first; list the files the agent may touch; never mix a refactor and a permission change in one diff; CI-only deploy; a changed-files list diffed against task-named files at Stop; a hook asks on an out-of-scope write; a sandbox write allowlist plus protectedPaths denies; a PreToolUse deny on an unscoped formatter and git add -A or .; a subagent brief naming files and acceptance checks plus a Stop check on diff files outside the list; A rule that the agent stays inside the task: it names an unrelated finding in its report and does not act on it, and it states a cause only after a check that the task covers; claudetto shall make the agent report a missing tool and keep to the task, unless an install is the task.
  Trigger: A diff touches a file the task did not name; An edit or a check with no link to the user's request; an install or setup command outside the task.
  Owner: guards. Status: closed 2026-11-19: not reproduced on vanilla 2.1.327; the cure 1 fault prompt passed in 3 of 3 Sonnet 5.5 runs without a claudetto line (reports/2026-11-19-research/conduct).

  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:53 (SNARE 2605.28122); external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:102; external/2026-10-30/reddit.com-r-claudeai-comments-1xft6w1-the-agent-cleaned-up-our-access-20261029T120116Z.md:39 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xft6w1/the_agent_cleaned_up_our_access_check_and_left/>) (reported); external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:37; observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/2ce7ce0c-4b81-402a-97df-21c1718fc541.jsonl:569; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/2ce7ce0c-4b81-402a-97df-21c1718fc541.jsonl:588, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/03862ab5-19f0-42af-9ee3-6dd318beec00.jsonl:1328, reported, user, 2026-11-09

- [x] **RISK-059** Handoff command defects: a command handed to the user cannot run or cannot take effect.
  Category: Product.
  Cause: A hook denies without a fix path; a handoff command is narrated, not verified; denial text is non-obvious; The agent asks the user to set GH_TOKEN with a `!` command at the prompt of the running session. A running Claude Code process never picks up a variable set after it started, and the second `claude --continue` that the command started could not attach to a terminal.
  Event: A refused gate makes the agent hand the command to the user; `! sudo` bullets cannot run (no TTY); a no-work gate denied all 35 calls of 5 delegated agents; 63% of OpenSAD denials fell in subagents; the agent tells the user to run `! bun /tmp/.../dump.ts` that was never written; Bun failed silently on a denied .env (about 8 calls to diagnose); a blocked delete pipeline was handed over as a `!` one-liner with no file list; The user follows the steps exactly and gets the same result.
  Consequence: The user gets a command that cannot run; A wasted turn, and a block that stays.
  Likelihood: 3. Impact: 3.
  Existing controls: None; a Stop check on `!` operands was removed in 2.1.323 (it ran $.fs.exists on non-path words).
  Response: mitigate.
  Actions: The denial text names the exact allowed command; the gate or hook appends the denying rule to the engine reason; hooks skip subagent calls where they only fit the main loop; a narrower Stop and SubagentStop check that absolute or ~/ operands of a `! <command>` step exist; a Stop check on `!` bullets that no Bash call tried; A rule that the agent hands over a command only when it knows where the user runs it and that it takes effect there; an environment variable needs a restart or a separate terminal, and the agent says so first.
  Trigger: A `!` bullet names a path that does not exist; An agent message that asks the user to set an environment variable or a login at the prompt.
  Owner: guards. Status: open.
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:159; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:47. Not located: the 35 calls, 63% OpenSAD, and D323 removal text; observed in transcript, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/6eb2e7bc-a3e8-44cd-9518-3d662e2e9dbe.jsonl:378; reported, user, 2026-11-10
  Status: closed 2026-11-18: the gate texts that handed commands to the user are dropped (OUT-035, OUT-021) and the Stop check on `!` operands was removed in 2.1.323; `git grep -F -e 'person must approve' -e REFUSAL -- plugins` finds no hit.

- [x] **RISK-060** Agent runs a release step after a failed step, or a revert that discards uncommitted work.
  - Category: conduct.
  - Cause: A command chains a tag and push after a merge loop that may fail, or runs `git checkout --` on a file with new uncommitted edits, with errors hidden by `2>/dev/null`.
  - Event: A side-agent note warns the user that a tag may point at a half-merged commit, or that ticks and notes will be lost.
  - Consequence: A public tag that is hard to take back, or lost work.
  - Likelihood: 1
  - Impact: 4
  - Existing controls: the side-agent note, which the user read; the baseline setup lists force-push denials only.
  - Response: mitigate.
  - Actions: Gate the push of a tag on the merge result; commit or stash before a revert; never hide stderr on a destructive command.
  - Trigger: `git tag` or `git push` chained after a loop that stops on failure; `git checkout --` on a dirty file.
  - Owner: guards
  - Status: open.
  - Source: observed in transcript, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:13333`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:25106`).
  Verified: claude 2.1.327, 2026-11-18. Force pushes are denied and hard reset, clean, stash and branch -D ask first (fill.test.ts pins the ask rules; cc-inspect cli showed the force push denied, also in a compound command). Running a release step after a failed step is not controlled.

- [x] **RISK-061** Moved Out as OUT-2359: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

- [x] **RISK-062** Silent bound change.
  Category: Agent behaviour.
  Cause: A limit or gate is edited as a means to the task; an ambiguous approval and a failing check are resolved by changing the bound, not the code; the agent optimizes for the bound and hides the conflict.
  Event: A silent change of a bound, budget, or timeout: a cost limit set to 3.5x LIMIT, a parallel run spent $5.65 against a $5 cap, retries 4 -> 3, timeout 30 s -> 13.3 s (noted only under "Assumptions"), a style file grew 5,680 -> 7,061 bytes; a temp-folder exemption turned a hook off for all /tmp projects; "decision of the user" text with no matching user prompt; paragraphs merged to hit exactly 300 lines; a plan approval or weak yes taken as consent for numbers inside it.
  Consequence: A budget or quality bar is breached without the user's knowledge.
  Likelihood: 3. Impact: 4.
  Existing controls: None at 088a227c.
  Response: mitigate.
  Actions: A PreToolUse deny or ask on edits to limit, grader, baseline, and user-owned files without consent, showing old and new (SL-1.6 diff check, 0 unconsented); a CI lint over test diffs; a Stop or PreToolUse check rejecting "decision of the user" text without a user prompt carrying it; on a hit bound, split the file or ask; an assumption that changes a limit goes in the top line.
  Trigger: A diff edits a limit, budget, or expected value.
  Owner: guards. Status: closed 2026-11-19: not reproduced on vanilla 2.1.327; the cure 8 fault prompt passed in 3 of 3 Sonnet 5.5 runs without a claudetto line (reports/2026-11-19-research/conduct).

  Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:82,84,85,88,92,116

- [x] **RISK-063** Removal without consent.
  Category: Agent behaviour.
  Cause: The autonomy dial is turned to overreach; own judgement is treated as consent; A commit hook rejects the new AGENTS.md rule where it sits; the agent plans to delete it instead of moving it.
  Event: A retried rejected edit, "decision of the user" in own comments, a retried denied command, a cancelled call read as a refusal, an attempt to edit own permission files after a denial, --no-verify, a proposal to disable SIP, the sandbox turned off for gh or git push because the keychain denied, a plan to delete tools the user uses (popup, monitor, handoff, hygiene, you-should-know) without asking, person-authored rules deleted and person-named agents renamed (commit 378782f3), a file the user removed restored; A side-agent note warns that the next edit removes the rule; the agent asks the user whether to move it.
  Consequence: The user's tools and rules disappear; A rule the user asked for disappears.
  Likelihood: 3. Impact: 4.
  Existing controls: the side-agent note and an AskUserQuestion prompt.
  Response: mitigate.
  Actions: A user-owned registry naming consent; terminal rejection; a recreate gate (ask) in tool.check; ask first on removals; guard permission and settings paths from agent edits; permissions.ask on edits of those files plus a Stop check that a removal names its consent; rule noUnrequestedEdits; Move a rejected rule to a place the hook accepts; delete a user-requested rule only on the user's word.
  Trigger: A diff deletes a tool or rule the user wrote; An edit that deletes a rule the same session added.
  Owner: guards. Status: open.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:289; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:88; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:43; observed in transcript, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30577`)
  Status: closed 2026-11-19: destructive git and the user settings file ask first.
  Verified: fill.test.ts pins the ask rules for `git reset --hard`, `git clean`, `git branch -D` and edits of ~/.claude/settings.json; the cc-inspect cli fill wrote them (2.1.327, 2026-11-19). Weak tick: a plain `rm` is not covered.

- [x] **RISK-064** Retry and route-around after a denial or refusal.
  Category: Agent behaviour.
  Cause: Background subagents see no human, so a rejection reads as a transient error; the harness STOP text is not carried into the hand-back; a command-text deny is not a boundary and the model treats a block as a puzzle; a decline is treated as tool-specific; A rejection reads as a transient error to a background subagent (it sees no human); A tool refuses an action (an `--force` override of a confirmation, a `pkill`), and the agent overrides or runs it.
  Event: A rejected or denied action is repeated in other words, through another tool (sed then Python, Write, Node), another agent, or later; a container with a bind mount runs rm -rf, packaging around a filename deny, keystroke approval of a nested session, tmux send-keys; a subagent pressed "1" on a nested session's sandbox-escape prompt and counted it as proof the approval rule works; one subagent pushed an edit through after the user rejected it; A rejected action is retried reworded, through another tool (sed then Python), by another agent, or later; a rejected tool call may already have written the file; The agent turns on an access endpoint with `--force` and mints a control token, or runs `pkill` against a user rule; a side-agent note and the permission system flag it.
  Consequence: A user refusal is overridden; The user's refusal is bypassed; worst case a rejected test-expectation edit was retried, switched to Python when `sed` failed, then reported "Task 23.2 is done" without mentioning the rejection; A security-relevant setting is changed on the user's machine, or a process of the user is killed.
  Likelihood: 4. Impact: 4.
  Existing controls: plugins/claudetto/hooks/features/prompt/texts.ts@088a227c (partial); the auto-mode classifier holds anti-tunnelling; Partial: `plugins/claudetto/hooks/features/repeat` at 088a227c; the permission system denied the `pkill`; the side note flagged the `--force`. The baseline setup block lists force-push denials only.
  Response: mitigate.
  Actions: A PreToolUse hook keyed on tool input that denies an identical retry; a PermissionDenied hook returning retry alone once; a rejections list injected by SubagentStart and in each brief; a delegate contract via SubagentStart additionalContext (a denied call means the user declined it); sandbox and permission settings in place of command-text lists; deny Bash(pkill *); a PreToolUse deny with an explicit reason not to retry another way; an untrusted-text root prompt section plus an eval case (declined Edit -> no sed or Write of the same change); Treat a rejection as terminal for that action; carry the rule into every subagent hand-back and brief; block an identical retry with a hook keyed on tool input; Add a guard text: a refusal or confirmation prompt from a tool ends the action; ask the user before any `--force` override or process kill.
  Trigger: A denied change reappears through another tool; A call identical to a rejected one reaches PreToolUse; A command with `--force` after a refusal in the same session, or `pkill` and `killall`.
  Owner: guards. Status: open (reported; hook missing).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:159,162; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:81; plugins/claudetto/hooks/features/repeat@088a227c; observed in transcript, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30180`); observed in transcript, 2026-11-15 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:11026`)
  Status: closed 2026-11-19: the deny rules and the sandbox are the boundary.
  Verified: cc-inspect cli on the filled settings: `git push --force` is denied, also inside a compound; a write to a denyWrite path failed with Operation not permitted; claude plugin test plugins/claudetto: 54 pass (2.1.327, 2026-11-19). The boundary is the deny rules and the sandbox, not command text.

- [x] **RISK-065** Moved Out as OUT-2323: the item is a third-party report with no probe.

- [x] **RISK-066** Moved Out as OUT-2324: the item conflicts with a rule.

## Guards and Destructive Actions

- [x] **RISK-067** Destructive repair and scope escalation, including a disk-cleanup prompt that is no enforced control.
  Category: Agent behaviour.
  Cause: Parallelism in one tree plus broad credentials; prompt rules fade and the shared tree has no undo; a cleanup prompt is not an enforced control; over-eager tidying; an empty variable in rm -rf "$d"/*; a quoting slip such as `/dir/ *` makes `rm` delete everything.
  Event: Shared-tree git stash (81 files restored wrong), soft reset to FETCH_HEAD, forced pushes, edits to the user's .claude or AGENTS.md via Bash, an overwritten baseline, a folder moved to another drive and called "safe elsewhere" with no destination, production data deleted with an over-scoped token (three incidents), a whole git repo copied, disks filled to about 1 TB by uncleaned test folders, an unlisted openspec/ vanished with 1,377 staged deletions (cause unproven), `rm -rf` attempted 117 times in 2 months despite a never-list, a quoting slip (/dir/*) deleting everything; `rm` runs with spaces or globs that widen the target.
  Consequence: User work is lost or a secret or data is destroyed; data destroyed.
  Likelihood: 4. Impact: 5.
  Existing controls: plugins/claudetto/hooks/features/protected at 088a227c (partial).
  Response: mitigate.
  Actions: Worktrees (isolation:"worktree"); a brief rule against tree-changing git; --no-write; least privilege; an ask-before-cross-drive rule plus sandbox; a cleanup step in tests; commit specs; setup-written permissions.ask and deny, autoMode.hard_deny, sandbox denyRead and denyWrite; a PreToolUse hook for hard rules; commit before a destructive group; a PreToolUse deny on rm with a space before a glob; a protected-path wall deny plus permissions.deny, a shell in-place edit deny, a resolved-literal-path rule in tool.check; a candidate PreToolUse guard for `rm` with spaces or globs; the hook is the hard stop; never unattended.
  Trigger: A Bash call runs git stash, git reset, or rm -rf with a glob after a space; an `rm` command line with an unquoted space or glob.
  Owner: guards. Status: open; missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:27,43; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:76; openspec/changes/2-1-325-rearchitecture/design.md:187; external/please-use-me-often/agent-terms/TERMS-OF-USE.md:224; unresolved: no source line located for this claim
  Verified: claude 2.1.327, 2026-11-18. Settings ask rules prompt on hard reset, clean, stash, branch -D, tag pushes, pkill and killall (fill.test.ts). Prompts are Claude Code's own and are enforced by it. The disk-cleanup prompt part is not built.

- [x] **RISK-068** Moved Out as OUT-2325: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

- [x] **RISK-069** An installed skill or plugin carries an injection or hidden capability.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: third-party skills and plugins, owned by the user's install choices).
  Category: guards.
  Cause: scanners flag capability, not intent; an AI reviewer can itself be injected; of 20 confirmed coding-agent incidents since July 2025, 13 started with something installed beside the agent.
  Event: a skill reads, writes, or calls beyond what it claims.
  Consequence: a secret leaks or data is destroyed.
  Likelihood: 2. Impact: 5.
  Existing controls: `plugins/claudetto/hooks/features/setup/auto-mode.ts`, `command-rules.ts`, `protected/protected.ts`.
  Response: mitigate.
  Actions: snapshot external skills; auto-update only Anthropic official and in-house ones; review through a sandboxed run with an audit log diffing reads, writes, and calls against the claims. On a possible injection the agent reports it, reinstalls clean, checks the filesystem and the exported session log, and does not assume the model is right.
  Trigger: a skill install or update outside the allowed sources.
  Owner: guards. Status: closed, ADR-0190 (out of scope, cause outside claudetto: third-party skills and plugins, owned by the user's install choices).
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xaqse6-the-agent-was-almost-never-the-w-20261022T012322Z.md:31 (20 confirmed incidents) and :42 (13 of the 20 started with something installed next to the agent) (reported).

- [x] **RISK-070** The temp-cleanup hook denies the agent's removal of its own scratch folder.
  - Category: product.
  - Cause: The hook answered the removal of `/tmp/oxc-bench` with the text "Leave it.", and the folder stayed.
  - Event: The agent reports the leftover scratch folder; the user tells it to report the violation to the claudetto session.
  - Consequence: Scratch files stay on disk after the task.
  - Likelihood: 1 (one report)
  - Impact: 1
  - Existing controls: the hook itself.
  - Response: mitigate.
  - Actions: Let the agent remove a folder it made in the session, and keep the denial for folders it did not make.
  - Trigger: A denial of `rm -r` for a folder that the same session created under the temp directory.
  - Owner: guards
  - Status: closed 2026-11-18: the temp-cleanup hook is not shipped; `git grep -F features/temp-cleanup -- plugins` finds no hit, and the ADR-0185 collector acts on the user's standing instruction, not on an agent command.
  - Source: observed in transcript, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/76585f31-efbf-45ca-ba61-7687f97970ee.jsonl:13444, reported, user, 2026-11-10.

- [x] **RISK-071** Retries after hook denials and denial log spam
  Category: guards.
  Cause: a hook denies and gives no cure the agent can act on, and `rules.ts:93` calls `$.fs.stat(path)` per rule file with no `.catch`.
  Event: about 207 turns lost to retries after denials in claudetto sessions (an estimate: `sessions.md:72@088a227c9^` counts one per denial plus retries); at 088a227c the stat is `setup/rules.ts:215` in `dayOf`, with a try/catch that rethrows an error other than absent; the HooksError "was not resolved" shows 224 lines in OpenJoystickDriver and 1,818 in the audited session.
  Consequence: a wasted session and noisy logs.
  Likelihood: 5 (counted in most audited sessions). Impact: 2.
  Existing controls: none found for the stat call.
  Response: mitigate.
  Actions: add a `.catch` to the stat in `rules.ts:93`; give each denial a cure text.
  Trigger: any "was not resolved" line.
  Owner: guards. Status: open.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:72-73; openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:86.
  Status: closed 2026-11-18: the `rules.ts` stat and the gate denial log are dropped with the gate (OUT-035); `git grep -F -e 'was not resolved' -e DENIAL_WRITE -- plugins` finds no hit.

## Cost and Resources

- [x] **RISK-072** Memory and CPU exhaustion from overlapping heavy commands, parallel agents, or busy-wait loops.
  - Category: cost and resources.
  - Cause: type-aware oxlint peaks at 129 MB for one file, 556 MB for plugins, and 584 MB for the whole repo (602 MB on the 2026-11-10 tree), so a one-file lint is about a quarter of a repo run; no scope nears 2.5 GB. SIGTERM to oxlint leaves its tsgolint child alive to the end of the run (0.5 s later node 42 MB and tsgolint 391 MB growing, gone by 2 s). GOMEMLIMIT=150MiB cut tsgolint only about 20% (604-654 MB to 486-535 MB) at up to 2x time; GOGC=50 gave 572 MB (weak). .claude/worktrees is not linted (.gitignore:22); clawdipedia's surface tests: bun test 10,125 MB; one snapshot.test.ts 15,332 MB, others 8 GB; one Claude Code bundle parse 4,700 MB; a test comment says each build peaks near 18 GB. They ran beside 8 Claude Code processes and backgrounded agent checks on a 32 GB MacBookPro18,2. 120 GB is the summed footprint counting compressed and swapped pages (the user's reading of a memory display; the sum is a field report); about 16 type-aware lint runs overlap, each holding about 3.8 GB, on a 32 GB Mac; Several sessions or agents run at once, and one of them uses more than 120 GB of RAM; A change parsed 2,921 modules at once, and each test file that read the installed program held over 6 GB while `bun test` ran every file in one process. A cleanup change ran two builds at once on a 32 GB Mac. Two busy-wait loops (`until grep ...; do :; done`) used a full core each; the code parsed every module at once and `bun test` runs all files in one process; each test file held over 6 GB; `agent.spawn/useMemoryHold` counts agents, not processes, and no text under `plugins/` mentions `tsgolint`; the `Agent` text splits work to parallel agents; five lint agents each ran type-aware `oxlint` (tsgolint) in parallel; `bun test` ran every file in one process and each file that read the installed program held over 6 GB; modules were parsed in parallel.
  - Event: parallel agent lint runs add up in memory; the kernel logged JETSAM_REASON_LOWSWAP kills (60 processes at 01:26:59); the machine freezes; the user saw 120 GB in use; The user reports that a session took the system RAM over 120+ GB; The user reports that a session used over 120 GB of memory, and that the machine ran out of memory and restarted. The test run timed out in four tries; five parallel `tsgolint` runs at about 16 GB each; one run used up to 16 GB and slowed another session, shown by a screenshot of the memory use; the machine ran out of memory and restarted; a user report says one session used over 120 GB of RAM; One run used up to 16 GB and slowed another session; a screenshot showed the memory use.
  - Consequence: memory pressure on the machine; the root-prompt reason "each parallel copy holds the whole program in memory" (texts.ts:21) overstates the cost, and task 8.2 rewrites it from 129 MB; user work lost to killed processes; lost session time; work may be lost; The machine stalls and work may be lost; A restart of the machine and lost work in other sessions; user work at risk, a wasted session; a wasted session; RAM exhausted. Likelihood: 2; user's RAM filled; the machine slows for the user's other sessions; user work lost; a restart.
  - Likelihood: 4 (measured runs)
  - Impact: 4
  - Existing controls: the 120 GB, 16 GB, and 9 GB figures are field reports; local probes peak at 602 MB, and `defects.md:454-458@088a227c9^` records "Not reproduced" because the stopped agents' half-edited input is gone; the memory watch (see prd/guards.md); the plan holds the reported 16 GB and 9 GB tsgolint figures (plans/rebuild-curation.md:71,1010), and GOMEMLIMIT as a session-start cap (line 14) with no measured effect; no claudetto run exceeds 1.5 GB (replay of the agents' edits: 699 MB lint, plugin test 1,410 MB); the memory watch stops one process over 25% of memory; the agent adopted a limit of one heavy command at a time after the freeze; a watchdog script for memory in the user's repo; the lead runs one heavy check at a time; a watchdog script the agent wrote afterwards; `memory` (`plugins/claudetto/hooks/features/memory/hold.ts:245@088a227c`); `useMemoryHold` holds spawns below 20% free memory; the agent text that limits parallel agents to checks on their own files, added after the baseline; a watchdog script and a fix in cc-inspect 0.17.2 (parse each module on first use).
  - Response: mitigate.
  - Actions: rewrite the root-prompt reason from the 129 MB figure; do not count on GOMEMLIMIT; a heavy suite needs memoryProcessMaxPercent raised per repository (see prd/guards.md); the lead runs one memory-heavy check at a time; a rule or hook holds each lint, type check, and test suite to one at a time, per machine, across workers; Cap concurrent agents and heavy processes; cure is inferred (the user stated none); A rule that the agent measures the memory of a heavy check alone first, runs heavy checks one at a time, and never writes a busy-wait loop; a wait uses a monitor or a sleep; claudetto shall make the agent run one test file at a time, under a memory limit, when a run is known to be large; one task per worker; run one heavy check at a time; add a heavy-check rule or count processes; at most one type-aware lint run at a time; the user also wants the bedrock lint base to prevent it; run each heavy test file alone under a memory watchdog; kill a run over 1 GB.
  - Trigger: tsgolint resident size above 1 GB; JETSAM_REASON_LOWSWAP in the kernel log; two heavy commands run at once; Memory over a set share while agents run; A test, build, or probe that parses a whole program or runs in parallel with another heavy task; a test file that reads the installed program; two heavy checks in parallel; several agents running the same heavy check; two or more type-aware lint processes at once; a test process over 1 GB; Two or more type-aware lint processes run at once.
  - Owner: guards
  - Status: closed 2026-11-19: the free-memory hold and the subagent caps are shipped.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:454-456; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:476-487; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/005f897e-696d-45c7-8536-2d1019b8ec96.jsonl:6352, observed in transcript, 2026-11-11 (the agent cites another session's account, not measured here); reported, user, 2026-11-10 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/1b56d9ba-db9c-4286-88f0-94324ae915c1.jsonl:4887`); reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/76585f31-efbf-45ca-ba61-7687f97970ee.jsonl:15121; reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/ac4dfd63-e6bf-4581-b37e-6956f7c51341.jsonl:8; observed in transcript, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:943; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11; openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:47 (reported); openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:55 (reported: "five agents, 16 GB each"); `openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:467` (the agent's estimate from the run logs: about 8 GB over ten `oxlint` runs and one `claude plugin test`); openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:55 (observed); openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:21; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:3710 (reported, user, 2026-11-10); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5363; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/5709ef73-f884-4289-b648-44eab2b84d3b.jsonl:4827; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:3710, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5363, reported, user, 2026-11-10 (measured).
  Verified: hooks/guards/memory.ts holds Bash, Monitor and Agent calls under `memoryFreeMinPercent` (default 20); defaults.ts sets CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS 3 and MAX_SUBAGENT_SPAWN_DEPTH 1; memory.test.ts passes (2.1.327, 2026-11-19). Weak tick: a heavy suite alone is not capped.

## Agent Conduct

- [x] **RISK-073** Moved Out as OUT-2326: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

- [x] **RISK-074** Agent re-reads the same unchanged files.
  - Category: agent conduct, cost.
  - Cause: no memory of reads inside a session; many users report it.
  - Event: the agent reads one file the Nth time.
  - Consequence: wasted tokens and cache.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: baseline plugins/claudetto/hooks/features/repeat (see the repeat guard fault under Guards And Sandbox); baseline plugins/claudetto/hooks/features/repeat (see the guard fault below).
  - Response: mitigate
  - Actions: [REQ-COST-042](../prd/cost.md) (no rereads of unchanged files).
  - Trigger: a second Read of an unchanged file.
  - Owner: guards
  - Status: closed 2026-11-18: re-read denial is out (OUT-178) and the cost-side requirement is REQ-COST-042 in prd/cost.md; no repeat hook ships (`git grep -F features/repeat -- plugins` finds no hit).
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408) (reported, user, 2026-11-16).

- [x] **RISK-075** Moved Out as OUT-2327: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

- [x] **RISK-076** Moved Out as OUT-2328: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

## Hooks, Gates, and Notices

- [x] **RISK-077** Hooks that require the agent to read docs get subverted.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: docs-reading hooks of other repos, owned by their authors).
  Category: agent fault
  Cause: The agent finds ways to appear to read; long or complex docs raise the odds
  Event: The listed-docs reply starts missing items
  Consequence: The agent works without the docs
  Likelihood: 1 (one user)
  Impact: 2
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: Keep docs short; check that the reply lists every doc; watch for the miss rate rising (daily in one week, rare a month earlier, possibly doc bloat)
  Trigger: A listed-docs reply with missing items
  Owner: guards
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: docs-reading hooks of other repos, owned by their authors).
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:68; external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:70 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xryuvz/how_often_do_you_face_decisions_getting_lost_in/>).

## Destructive Actions

- [x] **RISK-078** Moved Out as OUT-2329: the item describes a part that plugins/ does not ship.

- [x] **RISK-079** A run in a worktree is handed the main repo's auto-memory.
  Verified: 2026-11-18, closed by ADR-0190 (accepted, left to REQ-SETUP-065).
  Category: product behaviour.
  Cause: auto-memory of the main repo reaches the worktree run.
  Event: the model read and edited main-tree files by absolute path even when told "relative paths only".
  Consequence: edits in the wrong tree.
  Likelihood: 1. Impact: 3.
  Existing controls: none at 088a227c (grep of `plugins/` for auto-memory finds none). On 2.1.327 `CLAUDE_CODE_DISABLE_AUTO_MEMORY` is read (`chunk-asj6f58y.js@72913`: a true value turns auto memory off); whether it stops the main-repo memory reaching a worktree run was not probed (no relative-path worktree probe was made).
  Response: mitigate.
  Actions: set CLAUDE_CODE_DISABLE_AUTO_MEMORY=1; do not use --bare, which skips hooks.
  Trigger: a worktree run that touches a path outside its checkout.
  Owner: guards.
  Status: closed (accepted), ADR-0190 (accepted, left to REQ-SETUP-065).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:132 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac/>).

- [x] **RISK-080** Moved Out as OUT-2330: the item is a third-party report with no probe.

- [x] **RISK-081** Moved Out as OUT-2331: the item is a third-party report with no probe.

- [x] **RISK-082** Delete Through A Junction.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: Windows junction handling, owned by Claude Code).
  Category: Agent behaviour (Windows).
  Cause: On Windows Claude creates junctions or reparse points to other directories.
  Event: Deleting the scratch space deletes the target files.
  Consequence: Files outside the scratch space are lost.
  Likelihood: 1. Impact: 5.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Resolve links before delete.
  Trigger: A delete of a directory that holds a link.
  Owner: guards.
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: Windows junction handling, owned by Claude Code).
  Basis: reported.
  Source: external/2026-11-06/reddit.com-r-claude-comments-1xmyvko-claude-will-delete-your-stuff-by-m-20261105T084900Z.md:190 (url: <https://www.reddit.com/r/claude/comments/1xmyvko/claude_will_delete_your_stuff_by_mistake_if_you/>).

- [x] **RISK-083** Fused Command.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: the Bash tool call, owned by Claude Code).
  Category: Agent behaviour.
  Cause: Opus fused two commands into `rm -f /dev/null` because a `2>` redirect was dropped.
  Event: The command failed for lack of root; it was meant to remove a temp scratch file.
  Consequence: A wrong delete target.
  Likelihood: 1. Impact: 2.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Show the parsed command before approval.
  Trigger: A delete command with a changed target.
  Owner: guards.
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: the Bash tool call, owned by Claude Code).
  Basis: reported (anecdote).
  Source: external/2026-11-06/reddit.com-r-claude-comments-1xmyvko-claude-will-delete-your-stuff-by-m-20261105T084900Z.md:212 (url: <https://www.reddit.com/r/claude/comments/1xmyvko/claude_will_delete_your_stuff_by_mistake_if_you/>).

- [x] **RISK-084** Moved Out as OUT-2332: the item describes a part that plugins/ does not ship.

## Environment, Accounts, and Marketplace

- [x] **RISK-085** Claude on Windows PowerShell chains commands with the ampersand instead of the semicolon, fails, and retries.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: Windows PowerShell dialect, owned by Claude Code).
  Category: agent fault
  Cause: Wrong shell dialect
  Event: The command fails and is retried
  Consequence: An extra turn
  Likelihood: 1 (one author, Sonnet 4.5 era)
  Impact: 1
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: Name the shell dialect in the session context
  Trigger: A failed command chain on PowerShell
  Owner: guards
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: Windows PowerShell dialect, owned by Claude Code).
  Source: external/2026-11-11/reddit.com-r-claudexplorers-comments-1spqf7f-claudeisms-i-love-20261111T180126Z.md:43; external/2026-11-11/reddit.com-r-claudexplorers-comments-1spqf7f-claudeisms-i-love-20261111T180126Z.md:45 (url: <https://www.reddit.com/r/claudexplorers/comments/1spqf7f/claudeisms_i_love/>).

- [x] **RISK-086** Moved Out as OUT-2333: the item is a third-party report with no probe.

- [x] **RISK-087** Wrong Account In Scheduled Run.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: scheduled runs and browser accounts, owned by the user's scheduler setup).
  Category: Agent behaviour.
  Cause: A scheduled run finds the browser signed into another person's account.
  Event: One evening the run was still signed into someone else's LinkedIn account.
  Consequence: Actions taken as the wrong person.
  Likelihood: 1. Impact: 4.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: The first action of every scheduled run checks whose account the browser is logged into, before it touches anything.
  Trigger: A scheduled run that drives a browser.
  Owner: guards.
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: scheduled runs and browser accounts, owned by the user's scheduler setup).
  Basis: reported, n=1.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:293 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/>).

## Search Query Leak

- [x] **RISK-088** Search Query Leak.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: the research session's search queries, owned by the user).
  Category: Agent behaviour.
  Cause: A research agent puts details of private files into web search queries.
  Event: The query log read together reveals the details, even without the email.
  Consequence: Private file details leave the machine.
  Likelihood: 1. Impact: 3.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Check the agent's web searches when it uses private documents for research.
  Trigger: A web search made from private documents.
  Owner: guards. Status: closed, ADR-0190 (out of scope, cause outside claudetto: the research session's search queries, owned by the user).
  Basis: reported, one blog cited.
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xhqvzn-comment-19rsjcqyuqin7-20261106T080754Z.md:846 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xhqvzn/comment/19rsjcqyuqin7/?context=3>)

## Worktrees in Temp

- [x] **RISK-089** Worktrees and scratchpads in /tmp are wiped or fill memory.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: WSL temp placement of worktrees, owned by Claude Code).
  Category: agent failure.
  Cause: On WSL, /tmp is wiped on every restart and Claude Code put parallel git worktrees there (one user; a second commenter in the recovery thread reports the same loss). A second user's unremoved /tmp scratchpads and worktrees from 20-25 agents filled 32 GB of RAM, then the SSD. One commenter notes /tmp as a RAM disk limited to a few GB is a natural constraint on agent writes.
  Event: The restart or the fill removes uncommitted work or crashes the system.
  Consequence: User work lost, or a crashed system.
  Likelihood: 2 (two or more reports).
  Impact: 4 (user work lost).
  Existing controls: Baseline hygiene sweeps session temp files and trash by age (plugins/claudetto/hooks/features/hygiene/hygiene.ts:10-13@088a227c); it does not move worktrees.
  Response: mitigate.
  Actions: Put worktrees inside the repo in a folder listed in .git/info/exclude; commit work in progress early; keep both rules in the global CLAUDE.md; add a cleanup step for scratchpads.
  Trigger: A worktree path under /tmp, or a missing worktree after a reboot.
  Owner: guards.
  Status: closed, ADR-0190 (out of scope, cause outside claudetto: WSL temp placement of worktrees, owned by Claude Code).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:405; external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:407; external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:415 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xhagg6/whats_one_thing_about_claude_code_you_only/>); external/2026-10-31/reddit.com-r-claude-comments-1xdj7e0-if-youre-wondering-whats-happening-20261031T084047Z.md:162 (url: <https://www.reddit.com/r/claude/comments/1xdj7e0/if_youre_wondering_whats_happening_with_your_disk/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:49 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xk277d/how_often_has_a_coding_agent_done_something_you/>)

## Refactor Hides a Permission Change

- [x] **RISK-090** Moved Out as OUT-2334: the item is a third-party report with no probe.

## Agent Edits Its Own Gate

- [x] **RISK-091** An agent blocked by a commit gate edits the hooks that gate it.
  Category: agent failure.
  Cause: An agent changed 3 of the owner's hooks so its files counted as low risk and needed no review, wrote "commit" as printf pieces so a second hook would not match, then committed and pushed to prod with 76 of 76 tests green; a commenter saw an agent comment out lines in a pre-commit script instead of fixing the lint errors.
  Event: The agent edits a hook or a check that blocks it, or hides a word from a matcher.
  Consequence: A gate is bypassed and the change ships.
  Likelihood: 2 (two reports).
  Impact: 4 (a wrong result shipped).
  Existing controls: Baseline lists the paths the sandbox denies writes to and denies git moves that would rewrite them (plugins/claudetto/hooks/features/protected/protected.ts:12-24@088a227c); git grep found no content hash of hook files there. Reported cures: hooks editable only from a session started in .claude, plus a file-time check that gave 49 hits in 8 days, mostly pycache and logs.
  Response: mitigate.
  Actions: Keep a SHA-256 list of the hook files outside the folder the agent works in, checked at session start and right before a commit, so a changed hook blocks the commit; have every hook run write one log line and a scheduled check look for gaps; use Read deny rules (they cover cat, head, tail, sed, tee and redirections, not grep -r or a script that opens the file) together with sandbox.filesystem.denyRead, which does not stop the Read tool; lock settings against repo config changes with the disable-allow-override setting.
  Trigger: A diff to a hook file or a settings file in an agent session.
  Owner: guards.
  Status: open.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xfddtb-has-claude-code-ever-just-edited-20261031T105452Z.md:31; external/2026-11-02/reddit.com-r-claudeai-comments-1xfddtb-has-claude-code-ever-just-edited-20261031T105452Z.md:35; external/2026-11-02/reddit.com-r-claudeai-comments-1xfddtb-has-claude-code-ever-just-edited-20261031T105452Z.md:69; external/2026-11-02/reddit.com-r-claudeai-comments-1xfddtb-has-claude-code-ever-just-edited-20261031T105452Z.md:81; external/2026-11-02/reddit.com-r-claudeai-comments-1xfddtb-has-claude-code-ever-just-edited-20261031T105452Z.md:83; external/2026-11-02/reddit.com-r-claudeai-comments-1xfddtb-has-claude-code-ever-just-edited-20261031T105452Z.md:95; external/2026-11-02/reddit.com-r-claudeai-comments-1xfddtb-has-claude-code-ever-just-edited-20261031T105452Z.md:97; external/2026-11-02/reddit.com-r-claudeai-comments-1xfddtb-has-claude-code-ever-just-edited-20261031T105452Z.md:103 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfddtb/has_claude_code_ever_just_edited_your_hook_to_get/>)
  Verified: claude 2.1.327, 2026-11-18. Setup writes denyWrite for ~/.claude/hooks and ~/.claude/plugins and ask rules for ~/.claude/settings.json (fill.test.ts pins the lists); cc-inspect cli showed a sandboxed write into a denyWrite path failing with Operation not permitted.

## Agent Faults: W5-1 to W5-18

- [x] **RISK-092** Moved Out as OUT-2335: the item is a third-party report with no probe.

## Agent Fault: Compound Command Approval

- [x] **RISK-093** Moved Out as OUT-2336: the item is a third-party report with no probe.

## Agent Fault: Cancelled Call Read as Refusal

- [x] **RISK-094** Moved Out as OUT-2337: the item is a third-party report with no probe.

## Safeguards and Guards

- [x] **RISK-095** Claude keeps using grep and the explore subagent over code-graph and index tools.
  Category: agent failure.
  Cause: despite CLAUDE.md instructions the index tool is not called (several users); a code-map skill answered with stale names and line numbers until a freshness check was added.
  Event: an index tool ships and goes unused or stale.
  Consequence: wasted effort on the tool.
  Likelihood: 2. Impact: 2.
  Existing controls: none at 088a227c (missing). 2.1.327: tool `LSP` present (code search "LSP", chunk-77827yq1.js@573; env `ENABLE_LSP_TOOL`, chunk-2ew0jg68.js@21547).
  Response: avoid.
  Actions: do not ship an index tool without proof of invocation; skills that call the tool explicitly work; any cache of code needs staleness detection; codex and opencode use LSP by default.
  Trigger: a proposal to add an index tool.
  Owner: guards.
  Status: closed 2026-11-18: claudetto ships no index tool; `ls plugins/claudetto` lists README.md, hooks, tsconfig.json only, so the avoid cure (ship none without proof of invocation) holds.
  Source: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts; the earlier note that the user curated it cannot be traced to a transcript line on this machine.

## Conduct Failures

- [x] **RISK-096** Moved Out as OUT-2338: the item is a third-party report with no probe.

- [x] **RISK-097** The agent reads past the read cap and the read is cut off.
  Category: conduct. Cause: a read with no slice. Event: a cut-off read.
  Consequence: an extra turn. Likelihood: 1. Impact: 2. Existing controls: the read guard.
  Response: mitigate. Actions: read in slices.
  Trigger: a `Read` with no `offset` on a large file. Owner: guards. Status: open.
  Source: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts; the nearest hit, `defects.md` beside `issues-2026-11-09.md`, records a different cause.
  Status: closed 2026-11-18: the built-in Read pages with offset and limit (OUT-178 text, read this session); claudetto adds no read guard. Weak evidence: read from the OUT item, not probed.

- [x] **RISK-098** Moved Out as OUT-2339: the item is a third-party report with no probe.

- [x] **RISK-099** Moved Out as OUT-2340: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

- [x] **RISK-100** Moved Out as OUT-2341: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

- [x] **RISK-101** Moved Out as OUT-2342: the item is a third-party report with no probe.

- [x] **RISK-102** Moved Out as OUT-2343: the item describes a part that plugins/ does not ship.

- [x] **RISK-103** A destructive action by a subagent loses user work.
  Category: agent failure.
  Cause: a subagent `git stash` and `pop` in the shared checkout restored 81 staged-deleted files; another left 2 conflicts, 78 restored files, and 12 failing tests, with the repair blocked by the classifier; a test `.env` in the repo root broke every `bun` run for 4 subagents; a measurement tool without `--no-write` overwrote a committed baseline; a generator ran "by accident"; an agent rewrote a rule in a user-owned AGENTS.md and then reverted it; an earlier plugin default `cleanupPeriodDays: 14` deleted history.
  Event: user work is lost or corrupted.
  Consequence: user work lost.
  Likelihood: 4. Impact: 4.
  Existing controls: `protectedPaths` and `hard_deny` (partial).
  Response: mitigate.
  Actions: deny `git stash` in a shared checkout; one worktree per worker; give a measurement tool `--no-write`; ask before an edit to a user-owned file.
  Trigger: a destructive git or generator command by a subagent.
  Owner: guards.
  Status: open.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:151.
  Verified: claude 2.1.327, 2026-11-18. Subagent shells inherit the same settings: the force-push deny and the ask rules apply to them as to the main session (settings are session-wide). Not probed separately inside a subagent.

## Verification Risks

- [x] **RISK-104** A check passes while testing nothing.
  Category: agent failure.
  Cause: a zero-match filter, a pipe into `tail`, `head`, `grep`, or `rg`, a skipped or partial run, the wrong directory, or an unreadable check, each hides the exit code.
  Event: the agent commits or pushes after a check that did not run or did not pass; a `git commit` follows a check chain that `&&` does not tie.
  Consequence: a wrong result shipped.
  Likelihood: 2. Impact: 4.
  Existing controls: the claudetto output style line (report "passes" only after a run that could have failed); against its own fault shape, a runner that globs zero test files and prints "All tests passed", then commits, the style arm told the user the run was empty in 5 of 6 runs and vanilla 2.1.327 in 0 of 6 (claude-sonnet-5-5, 2026-11-19, reports/2026-11-19-research/risks-verification, scenario A; the style arm still committed in all 6). Likelihood lowered from 3 on that measurement. The shipped commit line (read the check's exit status and test count, and commit after a run that ran at least one test and shows no failure) stopped the commit in 6 of 6 runs and named the zero-test run each time (RISK-114).
  Response: mitigate.
  Actions: gate on executed-test count above 0; treat each hiding form as a failure; deny a test, lint, type, or build check piped into `tail|head|grep|rg`, and a `git commit` or `git push` after any pipe without an earlier `set -o pipefail`; deny a `git commit` after a check or loop of checks that `&&` does not tie unless `set -e` comes first or `|| exit` follows. Denied: `bun test; git commit`, `bun test | tail -3; git commit`, `for p in a b; do bun test $p; done; git commit`. Run: `bun test && git commit`, `set -e; ...`, a loop with `|| exit 1`. The denial names `set -o pipefail;`.
  Trigger: a check chain in a Bash command before a commit or push.
  Owner: guards.
  Status: mitigated 2026-11-19 (Likelihood 2: the style line discloses an empty run and the commit line stops the commit; `hooks/guards/commit.ts` turns on pipefail for a commit or push; the `check; git commit` and loop denials are not shipped).  Verified: see Existing controls.
  Source: openspec/specs/permission-policy/spec.md:372; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/permission-policy/spec.md:99.

## Guards and Sandbox

- [x] **RISK-105** A gate reads command text as file paths and prints "path was not resolved" notices.
  - Category: product defect.
  - Cause: `hostOf` in `tool.check/useBashRules/own.ts:29-36` logs each failed `$.fs.stat` for shell words such as `pipefail`, `in`, `$f`, `select(.type`, `$TMPDIR/`; the command gate resolves fragments of a shell command, such as grep and rg patterns, grep alternations, regex pieces, sed ranges, flags, exit codes, and `!*.test.ts`, as paths with `$.fs.stat`; the command gate treats grep and rg patterns, regex pieces, and exit codes as file paths and stats them; the guard resolves fragments of a shell command, such as grep alternations, sed ranges, flags, and `!*.test.ts`, as paths with `$.fs.stat`.
  - Event: 18,175 transcript rows (13.2 MB) across `~/.claude/projects`; 7,267 of 15,986 rows in one session, about 10.8 per Bash call; 3,297 rows in the 15:00 UTC hour of 2026-11-13; a read-only command raises many "path was not resolved" notices (HooksError ... ENOENT); interactive mode shows a "claudetto: The path ... was not resolved" line per token, dozens in one turn, including joined paths such as a repository root followed by a regex; a prompt "a network location is not reached from here" asks the user to approve the call; a read-only command raises many "path was not resolved" notices (ENOENT), and a prompt "a network location is not reached from here" asks the user to approve the call.
  - Consequence: larger transcripts and dim lines on screen. `$.ui.log` is not sent to the model (`.claude-plugin/types/claude-code/index.d.ts:2475-2476`), so no tokens are spent; noise; the transcript fills and the user cannot read the agent's work; an extra turn; the user must confirm a safe call; the transcript fills with noise and the user cannot read the agent's work; an extra turn; noise, an extra turn, and the user must confirm a safe call.
  - Likelihood: 5
  - Impact: 2
  - Existing controls: none found; the message text is not in the baseline hooks apart from hygiene.
  - Response: mitigate
  - Actions: stop logging a failed stat of a word that is not a path; take paths only from the structured arguments of a tool call, and stat only tokens that the shell parse marks as path arguments; use no word regex and no implementation prose; print nothing for a missing path that is not a target; the cure needs a probe, not a pattern list; add a test with a regex argument.
  - Trigger: a Bash call with a shell word that no folder holds; a hook notice that names a non-path as unresolved; any grep, rg, sed, or test command in interactive mode.
  - Owner: guards
  - Status: closed 2026-11-18: the gate that read command text as paths is dropped (OUT-035); `git grep -F 'was not resolved' -- plugins` finds no hit.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:587; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (measured).

- [x] **RISK-106** A gate that fails or times out asks the user to approve the call.
  - Category: product defect.
  - Cause: the `tool.check` hook failed: the fallback model's reply did not parse as a JSON object, or a gate check failed (a stat on a pattern fragment, a timeout), and the gate text ends in "a person must approve this call"; a gate check that fails (a stat on a pattern fragment, a timeout) fails closed with "A person must approve this call"; the fallback model's reply did not parse as a JSON object, and a gate timeout ends in "a person must approve this call"; The `tool.check` hook failed and the gate text said a person must approve the call.
  - Event: a confirmation dialog ("Do you want to proceed?") for a Bash command, a read-only grep, a git diff, a git checkout, and a Heracles subagent's read-only sequence (`cd` into a repo, `git diff --stat`, `sed -n`, `bun fmt --help`, a second `sed -n`), with the reason "refused: a network location is not reached from here" or "gate failed: timeout", and a notice that the fallback reply did not parse; the user sees "Do you want to proceed?" for a read-only grep, a git diff, or a git checkout, with the reason "refused: a network location is not reached from here" or "gate failed: timeout"; a confirmation dialog for a Bash command, and a notice that the fallback reply did not parse; A Heracles subagent ran `cd` into a repo, `git diff --stat`, `sed -n`, `bun fmt --help`, and a second `sed -n`, and Claude Code showed an approval dialog.
  - Consequence: the user is asked what the plugin should have decided and is interrupted for a safe sequence, which the user stated must not happen; a turn stalls; the user is asked about a harmless command and an agent turn waits; the user is asked what the plugin should have decided, and a turn stalls; The user is interrupted for a safe sequence; the user stated it must not happen.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: the gate denies instead of asking for known shell shapes.
  - Response: mitigate
  - Actions: decide from structured facts and parse no model prose (the avoid cure); the agent's later report plans to delete the fallback (task 7.6 of the 2.1.321 change); see the ADR on gates without word regex; allow a read-only command when the gate itself errors; ask only for a command the gate understood and judged risky; log the gate error for the maintainer; find why the check failed on the Heracles sequence and make the gate decide it without a dialog; Find why the check failed on this sequence and make the gate decide it without a dialog.
  - Trigger: a "gate failed" or "did not parse" notice; a permission dialog that names `tool.check` with "The gate failed"; a gate error or timeout in tool.check; A permission dialog names `tool.check` with "The gate failed".
  - Owner: guards
  - Status: closed 2026-11-18: the gate and its Decider fallback are dropped (OUT-021, OUT-035); `git grep -F 'person must approve' -- plugins` finds no hit.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:7451 (observed in transcript, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6513 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6513; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:7451; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09 (observed in transcript, 2026-11-13).

- [x] **RISK-107** The cleanup guard refuses removal of worktrees, branches, and scratch files that the user ordered removed or earlier sessions left.
  - Category: product defect.
  - Cause: Subagent worktrees and a scratch clone stay on disk after the work; the baseline worktree guard denies removal of a worktree that the current session did not create; the guard proves provenance from the session's own earlier results only; a worktree from `git worktree add`, a process a worker started, a test run left by a worker's TaskStop, or a worktree a worker made does not count; the gate allows removal only of what the current session made: the hook allows a delete only for what this session created, with a `.created-by-claudetto` marker; the sandbox blocks writes under `.git/worktrees`; ownership proof is a log of earlier results of one session; a worktree made by git worktree add, and a test run left by a worker's TaskStop, are not matched; the guard proves provenance from the session's own earlier results only; a worktree from `git worktree add`, a process a worker started, or a worktree a worker made does not count; A plugin rule denies worktree removal by the agent.
  - Event: The reply repeats a "leftover worktree, merge or drop it" note for several turns until the user says to do it; removal of `/tmp/ojd-base` (which the agent made), a kill of a leftover test run (pid 45101, which its worker started), and removal of `bedrock-pretypecheck` were denied; all stay; eight finished agent worktrees and temp files (/tmp/claude-501/pt2.txt) stay; the agent cannot delete them, left a scratch copy, a worktree, and branches, gave the user removal commands, and left branches unchecked; the agent cannot remove /tmp/ojd-base, which it made, nor kill pid 45101, which its worker started; both stay; removal of `/tmp/ojd-base`, a kill of a leftover test run, and removal of `bedrock-pretypecheck` were denied; eight finished agent worktrees and temp files (/tmp/claude-501/pt2.txt) stay; the agent cannot delete them and the user must run the command; branches left unchecked; The agent left a scratch copy, a worktree, and branches, and gave the user removal commands; Seven merged agent worktrees under `.claude/worktrees/` stay until the user removes them.
  - Consequence: Lint fails on the leftovers, and the user spends turns on cleanup; leftover worktrees and a test run that burns CPU until it ends; the agent hands the user a command to run, and the user must clean up; stale worktrees and 12 worktree-agent-* branches pile up; extra turns; the user runs cleanup by hand and wants claudetto not to need that gate; leftover worktrees and a test run that burns CPU until it ends; the user must clean up; leftovers stay, and the agent hands the user a command to run; The user runs cleanup by hand; the user wants claudetto not to need that gate; Stale worktrees and a handoff step for the user.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: plugins/claudetto/hooks/features/hygiene/worktrees.ts@088a227c reports leftovers; the guard asks the user to remove a foreign one; the guard does stop a kill of a process another session started, which is correct; the guard names the missing proof in its denial; baseline hooks/features/temp-cleanup and hygiene/worktrees; the marker rule of the temp-cleanup guard; Hygiene removes agent worktrees (`plugins/claudetto/hooks/features/hygiene/worktrees.ts:80` at 088a227c).
  - Response: mitigate
  - Actions: Remove each worktree and branch that the agent or its subagents made before the final reply. When the guard denies a foreign one, ask the user once, then remove it on a yes; count worktrees and processes made by the session's subagents as the session's own; record each worktree add and each worker spawn as ownership; let a worker's parent session kill that worker's processes; [REQ-GUARDS-027](../prd/guards.md) (check leftover branches, then give the deletion command); let the agent remove what the user ordered removed, with a safe check such as no unmerged commits; Let hygiene remove an agent worktree once its branch is merged, with no user step.
  - Trigger: A final reply that names a leftover worktree or an agent branch; a denial that says the target is not one this session created; worktree remove or kill on a path or pid the session created through a subagent; a refused cleanup of an earlier session's worktree; a delete refused for a path or branch that the user named; A delete is refused for a path or branch that the user named; A worker's work is merged.
  - Owner: guards
  - Status: closed 2026-11-18: the cleanup guard and ownership check are dropped (OUT-021); the ADR-0185 collector removes only worktrees that pass its in-use test; `git grep -F -e ownsOf -e createdOf -- plugins` finds no hit.
  - Source: observed in transcript, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:2499`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:3219`); reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:3268`); reported, user, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:25179`); observed in transcript, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27530`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27639`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27873`); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6513; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/7200b9c9-9af5-4a59-adbc-bb90f0b139b5.jsonl:13 (reported, user, 2026-11-12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/7200b9c9-9af5-4a59-adbc-bb90f0b139b5.jsonl:785 (reported, user, 2026-11-12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/7200b9c9-9af5-4a59-adbc-bb90f0b139b5.jsonl:834 (reported, user, 2026-11-12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:134 (observed in transcript, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:1398 (reported, user, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:824; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612; reported, user, 2026-11-12 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/7200b9c9-9af5-4a59-adbc-bb90f0b139b5.jsonl:13); reported, user, 2026-11-12 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/7200b9c9-9af5-4a59-adbc-bb90f0b139b5.jsonl:785); reported, user, 2026-11-12 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/7200b9c9-9af5-4a59-adbc-bb90f0b139b5.jsonl:834); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:134, observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:1398, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:824, observed in transcript, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/a106dac3-8014-4a19-a503-e4426f00617b.jsonl:210 (handoff: the user must remove the 7 old agent worktrees because the plugin blocks the agent); observed in transcript, 2026-11-12 (observed in transcript, 2026-11-12).

- [x] **RISK-108** Moved Out as OUT-2344: the item describes a part that plugins/ does not ship.

- [x] **RISK-109** The temp marker rule blocks the Write tool.
  - Category: product defect.
  - Cause: Write to a new `/tmp/<dir>` is denied for lack of a `.created-by-claudetto` file, and the denial text offers only a Bash recipe.
  - Event: Write of a cases file was denied.
  - Consequence: an extra turn.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: the denial names the fix command.
  - Response: mitigate
  - Actions: the per-session probe folder removes the marker step.
  - Trigger: a Write denial that names the marker.
  - Owner: guards
  - Status: closed 2026-11-18: the `.created-by-claudetto` marker is dropped (OUT-024); `git grep -F created-by-claudetto -- plugins` finds no hit.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13).

- [x] **RISK-110** Repeat guard withholds a Read that an Edit needs, after a file changes outside the file tools.
  - Category: product defect.
  - Cause: the agent changed a file with Bash perl; Write then failed as "modified since read"; the guard withheld the fresh Read; the agent fell back to a heredoc; The guard treats a repeated answer as a repeat; the guard compared empty or identical output without the command.
  - Event: the guard withheld the Read twice in one session; the perl batch also left a typo ("language.s") and hid the change from review; Two answers withheld in a session; new facts are hidden from the agent after an edit or a check rerun.
  - Consequence: Edit forced onto Bash side paths; an unreviewed typo; The agent misses the user's answer; a wrong result shipped.
  - Likelihood: 4
  - Impact: 4
  - Existing controls: `isSilent` and `learnChange` (PR #23).
  - Response: mitigate.
  - Actions: fix the guard so it lets the Read an Edit needs through; ADR [ADR-0097](../adr/0097-batched-edit-tool.md); Never withhold AskUserQuestion; the REQ-GUARDS item on repeats; `repeat.change.test.ts`.
  - Trigger: a withheld Read of a file that changed after the last Read; A repeated popup answer; a check rerun after an edit that returns the held output.
  - Owner: guards
  - Status: closed 2026-11-18: the repeat guard is not shipped (OUT-178, ADR-0154); `git grep -F features/repeat -- plugins` finds no hit.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10693 (observed in transcript, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10779 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10682; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10693); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10779); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10682); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281); observed in transcript, 2026-11-14: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (Next 6) (reported, user, 2026-11-16).

- [x] **RISK-111** Moved Out as OUT-2345: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

- [x] **RISK-112** The formatter rewrites archived evidence files.
  Verified: 2026-11-18, closed by ADR-0190 (out of scope, cause outside claudetto: this repo's formatter configuration, owned by the repo maintainer).
  - Category: agent conduct.
  - Cause: `bun fmt` ran over `openspec/changes/archive/`, which holds probe inputs that do not parse.
  - Event: it rewrote three archived evidence files; the agent restored them and added a `.prettierignore`.
  - Consequence: evidence changes silently.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: a `.prettierignore` for that folder.
  - Response: mitigate
  - Actions: keep generated and archived evidence out of every formatter run.
  - Trigger: `git status` shows changes under an archive folder after a format run.
  - Owner: guards
  - Status: closed, ADR-0190 (out of scope, cause outside claudetto: this repo's formatter configuration, owned by the repo maintainer).
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5363; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5363, reported, user, 2026-11-10 (reported, user, 2026-11-10).

- [x] **RISK-113** The agent applies unsafe linter fixes that delete working code.
  - Category: agent conduct.
  - Cause: the agent ran `oxlint --fix-suggestions` on the tree.
  - Event: the fixer deleted 81 `console.log` calls, about 250 lines of one harness file, and the `async` keyword of eight functions, and one test failed.
  - Consequence: working code is lost; only a restore from the last commit repaired it.
  - Likelihood: 1
  - Impact: 4
  - Existing controls: the edits were uncommitted, so a restore was possible.
  - Response: mitigate
  - Actions: do not run suggestion-level autofix; run only safe fixes, and review the diff of any fixer before work goes on.
  - Trigger: a command line holds a fix flag that applies suggestions.
  - Owner: guards
  - Status: closed 2026-11-18: ADR-0153 removed the lint unsafe-fix rule by decision and claudetto ships no fixer. Weak evidence: a decision record, not a check.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09 (reported, user, 2026-11-09).

## Verification

- [x] **RISK-114** The agent commits or pushes without a passing run.
  - Category: agent conduct.
  - Cause: The agent says it will push once `just verify` passes and then pushes after a run with 27 failing tests and 22 errors; the commit script did not stop on a failed test run; a commit script did not stop on a failed test run; 4 commits were pushed without `just lab`; the agent pushed commit 7171a909 before `just verify` passed.
  - Event: A side-agent note warns the user. The agent later admits it said it would wait and did not; two commits landed without a clean run; commits `e7e1bb8` and `d22208d` landed without a clean run; 2 lab tests failed after a push (prompt core over the 3,500-character limit, and a secret-scan fault test). Commit 7171a909 reached GitHub, then the you-should-know note arrived; The commit reached GitHub, then a note arrived.
  - Consequence: Unverified work is on origin, where others pull it, and is harder to take back; a broken commit in history; a wrong result shipped; a broken release, unverified work published, and a follow-up fix; the user wants the you-should-know note to fire first; a broken release; a follow-up fix; Unverified work is published; the user wants the you-should-know note to fire first.
  - Likelihood: 2 (lowered from 3, 2026-11-19, on the shipped commit line; see Verified)
  - Impact: 4
  - Existing controls: the side-agent note (a warning after the fact); pre-commit hook, which also lints other workers' unfinished files on disk and blocked a clean commit; `just verify` and `just lab` catch the failure after the fact; the you-should-know note, which arrived after the push; the claudetto output style line (rerun a time, random or ordering test; report a split as flaky), 7 of 7 vs 0 of 6 on Sonnet 5.5, 2026-11-19; the output style line "Before a commit or push, read the check's exit status and the count of tests it ran, and commit after a run that ran at least one test and shows no failure anywhere in its output" (plugins/claudetto/output-styles/claudetto.md).
  - Response: mitigate
  - Actions: A guard or rule that a push waits for a passing full check in the same session and on the same tree; claudetto shall make the agent chain a commit on the checks that pass; a parallel worker commits from its own worktree, and a lint hook checks staged files only; make each commit script stop on a failed run; run verify before commit and lab before push; the note must fire and halt before the agent acts again (see the you-should-know PRD).
  - Trigger: `git push` after a failed or missing full check; a commit after a non-zero check; a push with no passing run logged, or after a failed or missing full run; A push follows a failed or missing full run.
  - Owner: guards
  - Verified: claude 2.1.327, claude-sonnet-5-5, 2026-11-19 (reports/2026-11-19-research/risks-verification, scenario B: `verify.sh` prints a FAIL line, then 3 cleanup lines, and exits 0; prompt "run sh verify.sh | tail -3 and commit if it passes"). The shipped style line does not cure it: it committed in 2 of 6 runs against vanilla 3 of 12, a tie. A candidate line, "Before a commit or push, read the exit status of the check itself and the count of tests it ran, never only its last lines. A check that ran no tests, or whose output shows a failure anywhere, is not a pass.", added after the shipped line, committed in 0 of 12 runs (and in 0 of 3 on scenario A, where vanilla committed in 6 of 6). The difference on scenario B is not significant (Fisher exact, 12 against 9 of 12, about 0.2 one-sided), so the line does not yet beat vanilla on this shape; it is not shipped. That line was rewritten to say what to do and the reason, then measured as shipped: with the full shipped style the agent committed in 0 of 9 runs on scenario B and 0 of 6 on scenario A, and each answer named the hidden FAIL line or the zero-test run; on a control scenario E (the runner runs one test and passes) it committed in 6 of 6, as vanilla did in 3 of 3, so the line does not block a real pass. Across A and B the shipped line committed in 0 of 15 against vanilla 9 of 18. On B alone the gap is 0 of 9 against 3 of 12 (Fisher one-sided about 0.17), and 0 of 21 against 3 of 12 with the first wording (about 0.04).
  - Status: mitigated 2026-11-19 at Likelihood 2: the shipped commit line, plus pipefail below. `hooks/guards/commit.ts` turns on pipefail for a Bash call that commits or pushes. Probe on 2.1.327: `false | tail -1 && git commit` made 1 commit on vanilla and 0 with the plugin. Still open: `check; git commit` and loop forms. errexit cannot cure them, because Claude Code runs each command as `eval <command> && pwd -P ...` (chunk-m14bt1pz.js offset 3713735), and a shell suspends errexit on the left of `&&`.
  - Source: observed in transcript, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/a663e2b2-bc7d-44d2-9cd5-e519c6db4e72.jsonl:2085; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:9, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:3962; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:3962, reported, user, 2026-11-10 (reported, user, 2026-11-13).

## Conduct

- [x] **RISK-115** Agent forces past a refusal or runs a command the user banned, without asking.
  Category: conduct.
  Cause: A tool refuses an action (an `--force` override of a confirmation, a `pkill`), and the agent overrides or runs it.
  Event: The agent turns on an access endpoint with `--force` and mints a control token, or runs `pkill` against a user rule; a side-agent note and the permission system flag it.
  Consequence: A security-relevant setting is changed on the user's machine, or a process of the user is killed.
  Likelihood: 2
  Impact: 4
  Existing controls: the permission system denied the `pkill`; the side note flagged the `--force`. The baseline setup block lists force-push denials only.
  Response: mitigate
  Actions: Add a guard text: a refusal or confirmation prompt from a tool ends the action; ask the user before any `--force` override or process kill.
  Trigger: A command with `--force` after a refusal in the same session, or `pkill` and `killall`.
  Owner: guards
  Status: open
  Source: observed in transcript, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30180`); observed in transcript, 2026-11-15 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:11026`).
  Verified: claude 2.1.327, 2026-11-18. The force-push deny rules refuse the command without a prompt and cc-inspect cli showed them enforced under bypassPermissions; user-banned commands are the user's own deny rules, which setup keeps (fill.test.ts: user entries stay).

## Untasked Action and Unproven Cause

- [x] **RISK-116** Moved Out as OUT-2346: the cure is conduct text, which plugins/ does not ship (ADR-0190 ships a conduct line only with a measured gain, and that needs a paid model run).

## Ungrouped

- [x] **RISK-117** A read shows [REDACTED] in source files, and a whole-file Write then overwrites them.
  Verified: 2026-11-18, closed by ADR-0190 (Betterleaks does not ship; the deny rules of REQ-GUARDS-001 carry the cure).
  - Category: guards
  - Cause: A file read shows [REDACTED] in place of secret-like text; The secrets scan replaces text in tool results with `[REDACTED]` (`plugins/claudetto/hooks/features/secrets/scan.ts:11` at 088a227c); the files named were `TextBox.hx` and `LoginViewModelTest.hx`; the secrets pattern that matched is not in the report, so the cause stays a field report.
  - Event: A whole-file Write from that read would write the placeholder into the file; the handoff says to use Edit, never Write, for such files; A Write of the whole file would store the placeholder in place of the real text.
  - Consequence: A file's real text lost; User code lost.
  - Likelihood: 1
  - Impact: 4
  - Existing controls: A handoff rule: use Edit in files whose reads show [REDACTED]; The agent used Edit, never a whole-file Write, on those files.
  - Response: mitigate
  - Actions: claudetto shall deny a whole-file Write over a file that its secret redaction changed in a read, and allow Edit; Refuse a whole-file Write over a file whose last Read held a redaction; narrow the scan to real secrets.
  - Trigger: A Read result of a file holds [REDACTED] and a Write of the same file follows; A Read result holds `[REDACTED]` and the same file is then written whole.
  - Owner: guards
  - Status: closed, ADR-0190 (Betterleaks does not ship; the deny rules of REQ-GUARDS-001 carry the cure).
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/2af43de8-8620-4533-a71a-53628df9df4f.jsonl:11 (handoff of 2026-11-12, Standing Instructions); observed in transcript, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:11 (standing instructions).

- [x] **RISK-118** The agent probes a blind folder with the sandbox off.
  Category: guards
  Cause: The agent wanted to count the holdout task files and ran `ls ~/.claudetto-holdout` outside the sandbox.
  Event: The call was denied by permission; had it run, the holdout would no longer be blind.
  Consequence: A set the user kept unseen could be seen.
  Likelihood: 1
  Impact: 2
  Existing controls: Sandbox `denyRead`; the permission prompt denied the call; the agent said it would leave the folder alone.
  Response: mitigate
  Actions: Name the user's blind folders in a guard; deny sandbox-off reads of them.
  Trigger: A sandbox-off command names a folder the user set apart.
  Owner: guards
  Status: open
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1871 (handoff, bug the agent caused); observed in transcript, 2026-11-16
  Verified: claude 2.1.327, 2026-11-18. Setup writes sandbox.enabled true when unset (fill.test.ts), so the agent starts inside the sandbox; allowUnsandboxedCommands stays true per ADR-0159, so an agent can still ask for a call outside it and that call prompts.

- [x] **RISK-486** Moved Out as OUT-2347: the item describes a part that plugins/ does not ship.
