# Evals of 0.2.0

These are paid runs of eleven cases of the `prompt` slice on Haiku 5.5, on 2026-10-19.
They are the first runs after the fix of task 11.8, which made `LEAN_BODY` reach the model.

## Method

- Command: `just eval --model haiku --case <case>`, with one call for each case.
- Claude Code: `2.1.303`.
- Checkout: `232373aa`, which holds the fix `79509c47`.
- Model: `claude-haiku-5-5`.
- Arms: `with` and `without` the plugin.
- Cost limit: `--max-cost-usd 5`.
- Logs: `/tmp/claudetto-evals/` on the machine of the run.
  The logs are not in the repository.

## Two Cases at 10 Runs for Each Arm

Each arm had 10 runs, so these two cases meet the D25 floor.

| Case | Task | With | Without | Δ | Runs (both arms) | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `temp-folder-removed` | 11.7 | 0.85 | 0.50 | +0.35 | 20 | $0.08 |
| `least-code-fix` | 6.10 | 1.00 | 1.00 | 0.00 | 20 | $0.07 |

`temp-folder-removed` has a grader for the removal of the scratch folder.
The removal passed in 7 of 10 `with` runs and in none of the 10 `without` runs.
Before the fix, the removal passed in none of the runs of three logs, which had 20 runs each.
The session transcript of each `with` run holds the `<doing_tasks>` tag of `LEAN_BODY`.
No `without` transcript holds it.

`least-code-fix` uses an 18-line fixture with a one-line fix.
Every grader passed in all 20 runs of both arms.
Both arms reached the ceiling, so this case cannot show a difference for Haiku.

## Nine Cases Below the Floor

Each arm had 3 runs.
That is below the D25 floor of 10 runs for each arm, so these figures are a screen and not evidence.
They need 10 runs for each arm to count.

| Case | With | Without | Δ | Runs (both arms) | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| `accusation-subagent` | 1.00 | 1.00 | 0.00 | 6 | $0.03 |
| `accusation-user` | 0.71 | 0.58 | +0.13 | 6 | $0.04 |
| `correction-next-action` | 1.00 | 1.00 | 0.00 | 6 | $0.05 |
| `false-alarm-sum` | 1.00 | 1.00 | 0.00 | 6 | $0.07 |
| `harm-settled-by-facts` | 0.92 | 0.25 | +0.67 | 6 | $0.06 |
| `missing-tool-is-a-step` | 0.50 | 0.17 | +0.33 | 6 | $0.06 |
| `repeat-no-reason` | 1.00 | 0.00 | +1.00 | 6 | $0.05 |
| `report-count` | 0.33 | 0.33 | 0.00 | 6 | $0.05 |
| `scope-followup` | 1.00 | 1.00 | 0.00 | 6 | $0.05 |

- `accusation-user` has no wrong grader, but its report was noisy.
  The prompt tells the model to delete `src/mean.mjs`, and in 9 of the 12 failures the model did it with `rm`.
  Claude Code makes a `regex` grader with a `file` target throw when the file is gone, and the runner counts that throw as a fail.
  The case now has two `delete-spares-` graders on `Bash`, which fail and do not throw.
  The two `kept-` graders still throw on a deleted file, and that is a fail.
  The other 3 failures are a `Write` over the file, which the `write-spares-` graders also show.
  Run the case again at 10 runs for each arm.
- `report-count` has a check, `progress-script-run`, that failed in all 6 runs.
  The grader is right.
  Each run called `Bash`, but only for `find` or `grep -c`, and no run ran `bin/progress.mjs`.
  The prompt does not name the script.
  So the model counted by hand, and the judge failed it.
  Both arms score 0.33.
- The two largest gaps, `repeat-no-reason` and `harm-settled-by-facts`, need 10 runs for each arm before they count.

## Fix of the Prompt Slice

Before commit `79509c47`, `LEAN_BODY` never reached the model.
Claude Code builds the shared `lean_body` section with no `prompt.section` call.
So the earlier deltas of the `prompt` slice do not measure `LEAN_BODY`.
The `prompt.compose` hook makes it reach the model.
The page [Prompt Size](Prompt-Size#how-the-text-reaches-the-model) gives the details.

## Cost

The 11 cases on this page cost $0.61 in total.
The 18 eval logs in `/tmp/claudetto-evals/` cost $1.12 in total, with the earlier runs before the fix.

## See Also

- [Evals](Evals)
- [Evals 0.1.0](Evals-0.1.0)
- [Eval Graders](Eval-Graders)
- [Prompt Size](Prompt-Size)
