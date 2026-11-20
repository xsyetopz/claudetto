# Dogfood on Vanilla Claude Code 2.1.327

`run.sh` starts Claude Code 2.1.327 in tmux with an isolated config dir. It runs Sonnet 5.5 with claudetto and claudetto-you-should-know loaded from a second clone, and uses a fresh clone of HEAD as the working repo.

## Register Check

`bun tools/check-register.ts` applies the rules below and exits 1 when it lists an item. It also lists an item whose text carries two different `Likelihood: N` values, because such an item's level cannot be read.

## Register Audit, 2026-11-19

Clone at ba45d6dcf. The session agent parsed `plans/rebuild/risk-register/*.md` with these rules:

- an entry starts at a `- [ ] **RISK-N**` or `- [x] **RISK-N**` line;
- its status is the text after the last `Status:` in the entry, including an inline one;
- an entry whose title reads "Moved Out as OUT-N" is settled.

| Item | Count |
| --- | --- |
| Entries | 427 |
| Likelihood 3 or higher and not closed, accepted, mitigated or moved Out | 0 |
| Neither a Status nor a Moved Out title | 0 |
| Status open (all at Likelihood 1 or 2) | 16 |

The first audit in the same session reported 11 open entries at Likelihood 3 or higher. Its filter read Status only at the start of a line, so it missed a Status that follows `Owner: X.` on the same line. All 11 carry a closed status.

The status line read `claude-sonnet-5-5 | ctx 6% | 7d 9% | cache 98%`.

## Dogfood at 48b68fe1f, 2026-11-19

Probe: `run.sh start`, claude 2.1.327 (`~/.local/share/claude/versions/2.1.327`), Sonnet 5.5, auto mode, claudetto and claudetto-you-should-know loaded.

- Turn 1 ran `bun tools/check-register.ts` (428 items, 0 at Likelihood 3 or higher unsettled, 0 with two Likelihood values, exit 0) and `claude plugin test plugins/claudetto-openspec` (1 pass, 0 fail). It quoted both outputs and changed no file.
- Turn 2 was a read-only lookup. It cited `plans/rebuild/prd/verification.md:14`, quoted the last Status line, and said which claims it had not checked.
- Cache hit was 87% after the cold first turn and 98% after turn 2 (REQ-COST-040).
- No new fault was seen, so no risk-register entry was added. The `⚠` before the status line is the engine's frame for a pinned plugin status (`plugins/claudetto/hooks/statusline/statusline.ts:44`).

The same day, `claude plugin test` on the three plugins under claude 2.1.328 gave claudetto 128 pass, claudetto-openspec 1 pass, claudetto-you-should-know 160 pass, 0 fail each.

## Dogfood at fea3d5562, 2026-11-20

Probe: `run.sh start`, claude 2.1.327, Sonnet 5.5, auto mode, claudetto and claudetto-you-should-know loaded. The isolated config still held the retired `Assisted-by: Claude Code` commit value.

- Session start replaced it: "replaced attribution.commit Assisted-by: Claude Code".
- Turn 1 asked for a line in this README. The file was untracked in the clone, since `reports/` is gitignored and this README had never been force-added, so the agent reported that and asked before creating it. After a yes it asked how to commit an ignored path and offered a force-add first. Commit d6b4451b0 ends with `Co-Authored-By: Claude <noreply@anthropic.com>` (issue #47, RISK-501).
- Turn 2 made a side branch from HEAD~1, committed there, and answered the ancestry and conflict questions from `git merge-base --is-ancestor` and `git merge-tree`. Both answers matched a recheck (issue #48, RISK-502).
- New fault: a you-should-know card said that later edits to the force-added file would be silently ignored, which is false (issue #65, RISK-510, accepted on a replay in reports/2026-11-20-research/ysk-tool-claim).
- The status line read `claude-sonnet-5-5 | ctx 4% | 7d 40% | cache 99%` after turn 2.

## Dogfood at 37b7f8200, 2026-11-20

Probe: `run.sh start`, same setup. Turn 1 asked for a surrogate-pair test for the code-point cutter in claudetto-you-should-know, run alone, then committed.

- The agent chose `fitLine` (hooks/text/fit.ts, iterates by code point), added `fitLine("a😀b", 3)` -> `"a…"`, ran only that file from a scratch copy (`claude plugin test` takes a folder, per `--help`), and committed 78e1d4061 with the co-author trailer. It reported that it did not run the typecheck or the full suite.
- A Heads up card said the function cuts by UTF-16 units and already has a surrogate-pair test. That holds for `sliceUnitsHead` (hooks/text/text.ts, test at hooks/text/__tests__/text.test.ts:17), so the card is true.
- New fault: the agent put the test in hooks/__tests__/behaviour.test.ts next to the existing `fitLine` test and named the departure from CONTRIBUTING.md:34. The repo had taught that placement: behaviour.test.ts and rules.test.ts held single-module unit tests. Issue #66 moved them beside their modules (0ac2486b5).
- The status line read `claude-sonnet-5-5 | ctx 5% | 7d 40% | cache 96%`.

## Dogfood at 0ac2486b5, 2026-11-20

Probe: `run.sh start`, same setup.

- Turn 1 asked which claudetto hooks run on SessionStart and what they write. The answer named the `hooks.json` env-file line and `registerStart` (plugins/claudetto/hooks/settings/start.ts:19). It said start.ts writes user settings (line 31) and the `setup.filled` store key (line 32). All three claims match the code. `claude plugin test plugins/claudetto` gave 132 pass, 0 fail, and the agent named the checks it did not run.
- Turn 2 kept a file list in a shell variable. The agent used `${(f)...}` and `${f:t:r}`, and the engine's rm check asked for approval although nothing was deleted (issue #67, RISK-511, accepted). After approval, the answer was correct: one file, `instructions.ts`, 96 lines, imported by `git/__tests__/instructions.test.ts`.
- The status line read `claude-sonnet-5-5 | ctx 5% | 7d 41% | cache 99%`.

## Dogfood at c6a1f1214, 2026-11-20

Probe: `run.sh start`, same setup. One turn ran the release checks.

- `claude plugin test`, two runs each: claudetto 132 pass, claudetto-openspec 1 pass, claudetto-you-should-know 160 pass, 0 fail in every run.
- `bun tools/check-register.ts`: 436 items, 0 in every category. The agent listed ten items at Likelihood 3 or higher whose first Status reads open or partial, and showed that each one's last Status is settled. RISK-262 and RISK-264 read "mitigated 2026-11-19".
- `bunx tsc --noEmit` failed with TS6053 in both plugins. `run.sh` loaded the plugins from the plug clone, so the generated types existed only there. The agent said so, typechecked a stand-in copy (exit 0), and did not start a second session. Issue #68: `start` now also loads claudetto-openspec and copies the types into the working repo. After that, tsc exits 0 in both plugins of the repo clone.
- A Heads up card said the tsc errors come from generated type files missing from the repo. That is true.

## Dogfood at e91de4382, 2026-11-20 (final round)

Probe: `run.sh start`, all three plugins loaded, types copied into the working repo (issue #68).

- Turn 1 ran the release checks in the session and read the test logs as well as the exit codes. `claude plugin test`, two runs each: claudetto 132 pass, claudetto-openspec 1 pass, claudetto-you-should-know 160 pass, 0 fail, exit 0 every time. `bunx tsc --noEmit` exited 0 in claudetto and in claudetto-you-should-know. `bun tools/check-register.ts` read 436 items, found 0 in every category, and exited 0. No risk at Likelihood 3 or higher is unsettled.
- Turn 2 added a width-1 `fitLine` test. It went into `hooks/text/__tests__/fit.test.ts`, beside the module (issue #66 path). The suite gave 161 pass, 0 fail, and commit 07618def4 carries the co-author trailer.
- No new fault was seen.
- Outside the session, a fresh clone of e91de4382 with the session-written types gave the same results: three plugins passing twice, both tsc runs exit 0, register exit 0.

## Dogfood at 7f9a43bad, 2026-11-20 (final round)

Probe: `run.sh start`, same setup. Before the session, a fresh clone of 7f9a43bad loaded all three plugins in its own interactive session, so core wrote the types there. On that clone, `claude plugin test` passed twice for each plugin (132, 1, 160 pass, 0 fail), `bunx tsc --noEmit` exited 0 in both plugins, and `bun tools/check-register.ts` exited 0.

- Turn 1 ran the release checks in the session. `claude plugin test`, two runs each: claudetto 132 pass, claudetto-openspec 1 pass, claudetto-you-should-know 160 pass, 0 fail, exit 0 every time. `bunx tsc --noEmit` exited 0 in both plugins. `bun tools/check-register.ts` read 436 items and exited 0, with no unsettled risk at Likelihood 3 or higher.
- Turn 2 committed on a new branch `side` and on the starting branch, both editing the same line. Then it asked whether `side` is an ancestor and whether a merge would conflict. The prompt named a root README.md, which does not exist, and the agent asked which README to edit instead of guessing. Both commits, 21174e8b8 and 52fda00e3, carry the co-author trailer (issue #47). The agent answered "not an ancestor" and "would conflict", citing `git merge-base --is-ancestor` (exit 1) and `git merge-tree --write-tree` (exit 1). An outside rerun of both commands gave the same exits (issue #48). The tree stayed clean, and nothing was merged.
- No new fault was seen.

## Dogfood at 6fa79cf66, 2026-11-20 (final round)

Probe: `run.sh start` setup on a fresh clone of 6fa79cf66, claude 2.1.327, Sonnet 5.5, all three plugins loaded, session 2fbfa663. The machine's load average stood near 200 from unrelated processes.

- Outside the session, the fresh clone gave claudetto 149 pass, claudetto-openspec 1 pass, claudetto-you-should-know 160 pass, 0 fail, twice each, with no test timeout; `bunx tsc --noEmit` exited 0 in both plugins and `bun tools/check-register.ts` exited 0. An earlier run at load 260 had timed out tests at 5000 ms in claudetto and claudetto-you-should-know. Run back to back at load 200, 6f9a832eb (before the record mask) and 6fa79cf66 both passed twice in 23 to 31 s, so the timeouts came from load, not from the `tool.call` mask.
- Turn 1 ran the same checks in the session plus `python3 -I reports/2026-11-20-research/risk-audit/audit.py plans/rebuild/risk-register`: every exit 0, the same counts, and 172 of 172 risks at Likelihood 3 or higher printed `ok`. Each `cd` ran in a subshell or to an absolute path, so RISK-098 (issue #71) did not recur.
- Turn 2 wrote `.envrc` with a token, printed it with `cat`, and printed it to stderr from a command that exited 3 (issue #63). The session file's `toolUseResult` held `[REDACTED]` for all three: the Write record, the `cat` stdout, and the error. The raw token stayed only in the user's prompt, the model's own tool inputs and its reply. The error reached the model as `<tool_use_error>Exit code 3\n[REDACTED]</tool_use_error>`.
- Turn 3 repeated the two-commit task. Both commits carry the co-author trailer, and the answers matched `git merge-base --is-ancestor` (exit 1) and `git merge-tree --write-tree` (exit 1).
- Turn 4 kept two paths in `F` and ran `wc -l $F` unquoted; zsh split it into two arguments (81 and 209 lines). Turn 5 changed "licence" in 3 ADR files with one `git grep -l | xargs perl -pi` call and no `Edit` call, and said that its case-sensitive match left a capitalised form unchecked.
- No new fault was seen.

## Dogfood at e6909b79f, 2026-11-20

Probe: `run.sh start` setup on a fresh clone of e6909b79f, which adds only the notes above to 6fa79cf66; session 48207af4.

- Outside the session, the fresh clone gave claudetto 149 pass, claudetto-openspec 1 pass, claudetto-you-should-know 160 pass, 0 fail, twice each, with no test timeout; `bunx tsc --noEmit` exited 0 in both plugins and `bun tools/check-register.ts` exited 0.
- Turn 1 ran the same checks in the session plus `audit.py --all`: every exit 0, 436 risks printed, each `ok`. 5 tool calls, 0 errored results.
- The per-status figures in that answer were the agent's own count, because `audit.py` printed none. Issue #75 makes the script print them.
- No new fault was seen in the plugins.

## Dogfood at 72796b825, 2026-11-20 (final round)

Checks run from a clean tree at 72796b825.

- `claude plugin test` in plugins/claudetto: 149 pass, 0 fail, exit 0; second run 149 pass, 0 fail, exit 0.
- `claude plugin test` in plugins/claudetto-openspec: 1 pass, 0 fail, exit 0; second run 1 pass, 0 fail, exit 0.
- `claude plugin test` in plugins/claudetto-you-should-know: 160 pass, 0 fail, exit 0; second run 160 pass, 0 fail, exit 0.
- `bunx tsc --noEmit` in plugins/claudetto: no output, exit 0.
- `bunx tsc --noEmit` in plugins/claudetto-you-should-know: no output, exit 0.
- `bun tools/check-register.ts`: exit 0.
- `python3 -I reports/2026-11-20-research/risk-audit/audit.py plans/rebuild/risk-register`: exit 0. Last two lines:

```
per state: closed 241, accepted 98, mitigated 78, transferred 1, moved out 18, unsettled 0
risks: 436; at Likelihood 3 or higher: 172; unsettled at Likelihood 3 or higher: 0; failing a check: 0
```

- No test failed or timed out, and the two runs of each plugin matched, so nothing was flaky.
- The session agent wrote and committed the section above. A fresh clone of 72796b825 outside the session gave the same test counts twice, with no timeout, and tsc and register exit 0.
- New fault: the agent called `Monitor` with a ToolSearch input (`select:Monitor`) and got core's InputValidationError, then waited with a Bash loop (session 1c9f6d80; issue #76, RISK-512, accepted at Likelihood 1 × Impact 1).
