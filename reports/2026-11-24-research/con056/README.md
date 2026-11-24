# CON-055 and CON-056: The Case Commit Behind Each Eval Score

Checked on 2026-11-24 with claude 2.1.331 installed, against the local, gitignored
`plugins/*/evals/results/*/aggregate-result.json` files (293 run-and-case pairs, 2026-11-21 to 2026-11-24).

## Cause

Before this change, `just eval` started a paid run on whatever the working tree held. A probe on
2026-11-24 (an untracked file in `plugins/claudetto/evals/trivial-typo/`, a fake `claude` on PATH, then
`just --no-deps eval claudetto`) exited 0 and reached `claude`. No step tied a run to a commit, so a
score could not name the case commit it ran on.

## Cure

`just eval` now stops before `claude` starts when `git status` shows any change in a case folder
(`plugins/<plugin>/evals/<case>/`), and prints `case commit: <case> <hash>` for each
case. `tools/__tests__/eval-recipe.test.ts` covers both.

## The Runs Before the Gate

`match.ts <plugin>` compares the prompt and graders that each run recorded with the case at the last
commit before the run. When those differ, or no commit exists yet, it compares them with the first commit
after the run. `runs.txt` holds its output for both plugins, one line per run and case:
result dir, start, model, case, case commit, `committed` or `uncommitted`, `same` or `DIFF`.

`scaffold.sh` is not in the result, so it is not compared.

| Outcome | Pairs |
| --- | --- |
| committed: matches the last commit before the run | 176 |
| uncommitted: matches the first commit after the run | 88 |
| differs from both commits | 29 |

The 29 that differ come from three groups:

- Cases that were never committed (`probe-ask`, `spec-review-command`, three `-cmd` cases).
- Cases under development whose working tree matched neither neighbouring commit: the `spec-fix-*`
  rounds of 2026-11-23 07:31 to 07:35, the 17:22 and 17:36 sweeps of the harder cases, one `run-once`
  round, and one `watch-run` round.
- The three `correction-opener` rounds before the opener line. They ran a `no-agree-opener` pattern
  without `you were`, and the committed pattern adds it.

Each score in the two eval READMEs now names its case commit from this table. The `correction-opener`
grader is `not_contains`, so the committed pattern rejects every reply the earlier one rejected, and the
vanilla 0.50 scores stand. ADR-0197 (proposed) settles how the constraints apply to runs before the gate.
