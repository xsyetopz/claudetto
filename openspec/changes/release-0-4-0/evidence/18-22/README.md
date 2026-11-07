# 18.22: the plugin's extra output

## Breakdown of the 18.6 plugin arm (free analysis of the 18.6 transcripts)

Source: `/tmp/probe-18-6/runs/probe-18-6/<runId>/stdout.txt` of each 18.6 session (stream-json). Scripts in `/tmp/probe-18-22/` (`split.ts`, `events.ts`, `split2.ts`, `turns.ts`); results below.

Why the zero setting "lowered" the fix rate: it did not. 10 nocut and 2 change sessions with `fixed` 0 on `noise14-bug33` ran at 01:32 UTC and ended with `Credit balance is too low` (`terminal_reason api_error`, 0 tokens, `turns` 1): 9 of the 10 nocut misses and 1 of the 2 change misses are billing failures of the double launch, not fix failures (18.6's own rows show `tokens` 0). Real fix failures: 1 change and 1 nocut session (both `noise14-bug33`, 3 turns, about 13,300 tokens, no Edit), base 0. Excluding the 0-token sessions: change 58/59 and nocut 50/51, base 60/60, so the zero setting fixes at the default's rate; the 50/60 was credit exhaustion.

Per-session event counts, mean over sessions that ran (base 60, change 59, nocut 51), from `events.ts`:

| Event per session | base | change | nocut |
| --- | --- | --- | --- |
| assistant messages | 3.05 | 7.44 | 7.84 |
| reply characters | 140 | 693 | 547 |
| Bash calls | 2.05 | 5.25 | 5.45 |
| ToolSearch calls (Read and Write are deferred) | 0 | 1.00 | 1.00 |
| Bash denied: `Use Read to read a file, not the shell` (gate, `cat` in a `bun test` line) | 0 | 1.00 | 1.00 |
| Bash denied: compound `git add && git commit`, then `git add`, "requires approval" | 0 | 1.38 | 1.76 |
| Stop block `These files you changed are not committed` | 0 | 0.70 | 0.88 |
| Stop block grader (`names something the user has not seen`) | 0 | 0.29 | 0.10 |
| Tool error `result does not match its output shape` (bound-output) | 0 | 0.58 | 0 |

Output tokens by source. The stream's per-message `usage` is partial and hides thinking, so the split is an estimate (characters/4 for text, characters/3.5 for tool input, plus the stream's `thinking_tokens` deltas) and sums to about 45% of the true totals; it ranks sources, it does not weigh them exactly. Estimated mean per session (`split2.ts`): base 107 before the first Stop; change 189 before the first Stop, 123 after an uncommitted-files block, 142 after a grader block; nocut 174, 148, 39. So the first turn run already costs 80 more than base (the denied `cat`, the ToolSearch, the shape-error retry), and each Stop block adds 120 to 150 (the model tries to commit, is refused, and writes an apology of about 186 tokens).

Sources and the requirement each serves:

1. Uncommitted-files Stop block and the commit retries it causes (`specs/run-limits`, "Uncommitted Session Changes Block the Stop Once"). Required, but in `-p` the permission chain answers `ask` for `git commit`, which nobody can approve; the block then asks for a step the session cannot take. Fix below.
2. bound-output returns a string where the engine needs the Bash object shape (error results arrive as strings): `tool.call step resolved Bash with a result that does not match its output shape`. No requirement; a bug. 0.58 sessions per session, each costing a retry of `bun test`. Fix below. This also lists the plugin's own saved output files `.claude/claudetto/output/output-*.txt` in the commit block (0.12 per session blocks named only those). Fix below.
3. Repo gate denial of `cat` (`specs/repo-gate`, read guard) plus ToolSearch for deferred Read: required to deny, but the deferral of Read and Write caused the `cat` attempts. Fix below: Read and Write are not deferred, and the denial names the call.
4. Grader block, 0.29 per session (`specs/run-limits`, graded reply check): required, not changed.
5. Concise.md style text: not measured here (owned by 18.20).

## Code changes (all in this worktree; lab 1223 pass, 0 fail)

| Change | File | Lab test | Mutant (revert the line, lab) |
| --- | --- | --- | --- |
| A string Bash result (a failed run) is cut into `{stdout, stderr: "", interrupted: false}` | `hooks/limits/bound-output.ts` | `bound-output.test.ts` "a failed run that arrives as a string is cut into the object shape the engine accepts" | original `boundResult`: 1218 pass, 1 fail, that test |
| The plugin's saved output dir is not a slice file | `hooks/slices.ts` (imports `BOUND_OUTPUT_DIR`) | `slices.test.ts` "the plugin's saved test output is not listed among the files to commit" | filter removed: 1221 pass, 1 fail, that test |
| A Stop block asks for a commit only when the commit can be made: `ask` counts as deny in a headless session (`session.start` `isInteractive`) | `hooks/slices.ts` | `slices.test.ts` two tests: ask blocks when interactive, passes when headless | `|| ask && !interactive` removed: 1221 pass, 1 fail, "…lets the stop pass in a headless session" |
| Read and Write leave `DEFERRED_TOOLS` | `hooks/surface.ts` | `surface.test.ts` "Read and Write are sent in full, not behind ToolSearch" | `"Read"` back in the list: 1222 pass, 1 fail, that test |
| The read denial names the call: `call Read with file_path <first operand>` and says nothing ran | `hooks/texts.ts`, `hooks/gate/rules.ts` | `rules.test.ts` "a file print is told to use Read…" gains a compound-line check | operand dropped: 1222 pass, 1 fail, that test |

Not done: splitting a compound command so only the `cat` is refused; a hook can only allow or deny a whole Bash call. The denial now says nothing ran and to send the rest alone.
Commands: `claude plugin test plugins/claudetto` for each row, with the change reverted by `/tmp/probe-18-22/mut.ts` and `mut2.ts`, then restored from `/tmp/probe-18-22/lab/`.

## Rerun: hypothesis and prediction (written before any paid session)

Hypothesis: with the five changes, the plugin arm has no shape-error retries, no commit-block turns in `-p`, no ToolSearch for Read, and one shorter denial retry per session at most.
Prediction: change arm mean output per session at most 1.25 times base (base about 365, so at most 456) and mean turns at most 1.1 times base; zero shape errors; no ToolSearch calls; Stop blocks for uncommitted files 0 in `-p`; fix rate at or above base's, with `nocut` equal to `change` within its Wilson interval. If it fails, the remaining sources are named from the transcripts with their tokens.
Setup: `PROBE_NAME=probe-18-22 PROBE_ROOT=/tmp/probe-18-22 bun --env-file=... evidence/18-6/probe.ts --run`, plugin loaded from this worktree (the harness resolves it from its own path), `claude-sonnet-5-5`, harness of main commit ac4038fa (subscription token only, init `apiKeySource` must be `none`).

## Rerun result (fresh sessions, 6 tasks x 5 per arm, 90 sessions, `claude-sonnet-5-5`)

Pilot first: one `change` session (`--only noise14-bug33`, `PROBE_ARMS=change`): init `apiKeySource` `none`, fixed, 532 output tokens, no ToolSearch, no shape error, no commit block, $0.0595. Then `PROBE_NAME=probe-18-22 PROBE_ROOT=/tmp/probe-18-22 bun --env-file=<.env> evidence/18-6/probe.ts --run --n 5 --model claude-sonnet-5-5 --out /tmp/probe-18-22/out`. Every row passed the arm check (apiKeySource `none`). `sessions.jsonl`, `report.txt` (output and fixes), `final.txt` (turns, calls, purposes), `scripts/`.

| Arm | Output tokens mean (bootstrap 95%) | vs base | Turns/session | Tool calls/session | Fixed (Wilson 95%) | Cost | Largest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| base | 371.7 (361.3-385.2) | 1.00 | 3.07 | 3.07 | 30/30 (0.886-1.000) | $1.4966 | 81,631 |
| change | 531.9 (508.6-573.2) | 1.43 | 4.07 (1.33x) | 5.00 (1.63x) | 30/30 (0.886-1.000) | $1.1685 | 54,429 |
| nocut | 552.5 (510.3-612.5) | 1.49 | 4.07 | 5.00 | 30/30 (0.886-1.000) | $1.1535 | 55,031 |

18.6 for comparison: change 1,049.7 (2.88x base), 8 turns. Output fell 49%. `change` against `nocut`: Mann-Whitney p = 0.7786, permutation p = 0.5412, so the zero setting no longer differs in output, and fixes the same 30/30. Total $3.8186 plus the $0.0595 pilot; no session capped; none near 300,000 tokens.

Bash calls per session by purpose (base / change): tests plus a read in one command 1.00 / 1.00; tests only 1.07 / 2.00; file read only 0 / 0; git commit or add 0 / 0; other 0 / 0; file writes 0 / 0. ToolSearch 0 / 0. Shape-error sessions 0. Stop blocks per session: uncommitted 0, grader 0.03 (change), 0.07 (nocut).

Prediction check: output within 1.25x FAILED (1.43x); turns within 1.1x FAILED (1.33x); calls within 1.1x FAILED (1.63x); zero shape errors, no ToolSearch, no commit block in `-p`, fix rate at base's with `nocut` equal: held.

Remaining source, measured: the repo gate's denial of `bun test 2>&1 | head -40; cat src/lib.ts`, 1.00 per session in both plugin arms. It adds one turn, two tool calls (the denied Bash call, and the `Read` that replaces the `cat`; the retried `bun test` replaces the denied one but the base ran the test and the read in one call) and about 160 output tokens per session (531.9 - 371.7). Reply text is the same length as base (172 against 140 characters). It serves `openspec/specs/repo-gate` (the read guard, measured in 18.5). Not removed: removing it would drop that requirement. Turns, calls and the 1.25x output goal would be met only if a model took `Read` first; the denial text now names the call, but this model still tries `cat` first. The grader block (0.03 per session, `run-limits` graded reply check) is the only other source. The Concise.md style was not measured here.

Not changed: the Bash gate still refuses a whole compound line (a hook allows or denies a call), so the `bun test` part does not run on the denied attempt.

## Process check

`ps -axo pid,ppid,command | grep probe-18-22 | grep -v grep` after the run printed nothing. No scratch outside `/tmp/probe-18-22/`.

Processes (18.17): scripts/*.ts read files and start no process; ps after run: checked 2026-11-07 sweep: none
