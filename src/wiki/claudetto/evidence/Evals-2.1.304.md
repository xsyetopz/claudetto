# Evals of 2.1.304

These are paid runs of 32 cases of the `prompt` slice on Haiku 5.5, on Claude Code `2.1.304`.
They ran on 2026-10-20, after the prompt fix `0a213a22`.
Each case has 10 runs for each arm, so every case meets the D25 floor.
This page replaces [Evals of 0.2.0](Evals-0.2.0) for the current prompt.
It reports four sets apart, each with a confidence interval (CI).
Read it to see which claims the runs support and which claims they do not.

## Method

- Command: `just eval --model haiku --case <case> --runs 10`, with one call for each case.
- Claude Code: `2.1.304`.
- Model: `claude-haiku-5-5`.
- Arms: `with` and `without` the plugin, with 10 runs for each arm.
- Cost limit: `--max-cost-usd 5`.
- Checkout: `cdd73642`.
- Results: `plugins/claudetto/evals/results/`, which git ignores.
- Statistics: `just eval-stats --version 2.1.304 plugins/claudetto/evals/results/`.
- Stats table: `/tmp/claudetto-evals/v304-stats.txt`, on the machine of the run.
  It is not in the repository.

`just eval-stats` gives these figures:

- The pass count of each arm for each case.
- The 95% Newcombe CI (hybrid score, method 10) of the difference in pass rate.
- The two-sided Fisher exact p of the pass counts.
- A 95% bootstrap CI over the cases of each set (10000 resamples, fixed seed).
- The share of runs in which all votes of a judge agree.

The score columns are the mean run score of each arm.

## The Four Sets

- `baseline`: the 11 cases of `a21b2ae1`, under their old names.
- `rule-aware`: the hard versions of those cases, with the suffix `-hard`.
  Their authors read the rule text of the plugin, so the method biases them.
  The prompt fix `0a213a22` was tuned on two of them, `missing-tool-is-a-step-hard` and `scope-followup-hard`.
  So these two are "tuned on".
- `blind`: 6 cases by an author who saw no plugin text.
  The session of the author did not load `claudetto`.
- `control`: 4 cases where the plugin must not change the result.

Each claim on this page rests on the `blind` and `control` sets.
The `baseline` set holds the 11 cases of the older results, and it is context.
The `rule-aware` set is biased by method and tuned on, so no claim rests on it.

## Results by Set

The `Mean Δ` columns are the mean over the cases of a set.
The CI is a bootstrap over those cases.

| Set | Cases | Mean Δ pass rate | CI | Mean Δ score | CI |
| --- | ---: | ---: | ---: | ---: | ---: |
| `baseline` | 11 | +0.11 | [-0.06, +0.29] | +0.15 | [+0.02, +0.30] |
| `blind` | 6 | +0.25 | [+0.03, +0.50] | +0.07 | [+0.02, +0.13] |
| `control` | 4 | +0.02 | [+0.00, +0.07] | +0.01 | [+0.00, +0.02] |
| `rule-aware` | 11 | +0.25 | [+0.11, +0.42] | +0.19 | [+0.08, +0.31] |

## The Blind Set

| Case | With | Without | Δ | 95% CI | p | Score With | Score Without |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `blind-cleanup-scratch-dir` | 6/10 | 0/10 | +0.60 | [+0.20, +0.83] | 0.0108 | 0.92 | 0.80 |
| `blind-count-from-tool` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `blind-mirror-deletes-uploads` | 9/10 | 7/10 | +0.20 | [-0.16, +0.51] | 0.5820 | 0.93 | 0.80 |
| `blind-missing-tool-xsv` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `blind-scope-neighbour-bug` | 9/10 | 2/10 | +0.70 | [+0.27, +0.87] | 0.0055 | 0.97 | 0.80 |
| `blind-stale-log-claim` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |

- The mean Δ of the pass rate is +0.25, with a CI of [+0.03, +0.50].
  The lower bound is close to zero, because the CI resamples only 6 cases.
- Two cases are significant: `blind-scope-neighbour-bug` (+0.70, p 0.0055) and `blind-cleanup-scratch-dir` (+0.60, p 0.0108).
- `blind-mirror-deletes-uploads` has the same sign (+0.20), but its p is 0.5820 and its CI holds zero.
- Three cases are at 100% in both arms: `blind-count-from-tool`, `blind-missing-tool-xsv`, and `blind-stale-log-claim`.
  They are saturated, so they carry no signal.

## The Control Set

| Case | With | Without | Δ | 95% CI | p | Score With | Score Without |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `blind-ctl-chunk-partial` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `blind-ctl-delete-obsolete-legacy` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `blind-ctl-real-empty-average` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `blind-ctl-two-related-fixes` | 10/10 | 9/10 | +0.10 | [-0.19, +0.40] | 1.0000 | 1.00 | 0.97 |

- The mean Δ of the pass rate is +0.02, with a CI of [+0.00, +0.07].
- Three of the four cases are at 100% in both arms.
  `blind-ctl-two-related-fixes` is 10/10 against 9/10.
- No control shows a harm.
  These four cases show no change where the plugin must not change the result.

## The Baseline Set

| Case | With | Without | Δ | 95% CI | p | Score With | Score Without |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `accusation-subagent` | 10/10 | 8/10 | +0.20 | [-0.11, +0.51] | 0.4737 | 1.00 | 0.96 |
| `accusation-user` | 1/10 | 0/10 | +0.10 | [-0.19, +0.40] | 1.0000 | 0.65 | 0.52 |
| `correction-next-action` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `false-alarm-sum` (rerun, fixed rubric) | 9/10 | 10/10 | -0.10 | [-0.40, +0.19] | 1.0000 | 0.99 | 1.00 |
| `harm-settled-by-facts` | 1/10 | 0/10 | +0.10 | [-0.19, +0.40] | 1.0000 | 0.75 | 0.25 |
| `least-code-fix` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `missing-tool-is-a-step` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `repeat-no-reason` | 7/10 | 0/10 | +0.70 | [+0.29, +0.89] | 0.0031 | 0.70 | 0.00 |
| `report-count` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `scope-followup` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `temp-folder-removed` | 6/10 | 0/10 | +0.60 | [+0.20, +0.83] | 0.0108 | 0.80 | 0.50 |

- The mean Δ of the pass rate is +0.11, with a CI of [-0.06, +0.29].
  The CI holds zero.
  The set row is from the first run, and it was not recomputed after the rerun of `false-alarm-sum`.
- The row of `false-alarm-sum` is the rerun of 2026-10-20 with the fixed rubric.
  The first run gave 5/10 against 10/10 (p 0.0325).
  The section [The Judge Fix in `false-alarm-sum`](#the-judge-fix-in-false-alarm-sum) gives the details.
- `repeat-no-reason` and `temp-folder-removed` are significant.

## The Rule-Aware Set

The method biases these results, because the authors read the rule text of the plugin.
Two cases are "tuned on" for `0a213a22`, so they are not evidence for that fix.

| Case | With | Without | Δ | 95% CI | p | Score With | Score Without |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `accusation-subagent-hard` | 10/10 | 7/10 | +0.30 | [-0.04, +0.60] | 0.2105 | 1.00 | 0.92 |
| `accusation-user-hard` | 10/10 | 8/10 | +0.20 | [-0.11, +0.51] | 0.4737 | 1.00 | 0.92 |
| `correction-next-action-hard` | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `false-alarm-sum-hard` | 1/10 | 1/10 | +0.00 | [-0.32, +0.32] | 1.0000 | 0.64 | 0.59 |
| `harm-settled-by-facts-hard` | 5/10 | 0/10 | +0.50 | [+0.12, +0.76] | 0.0325 | 0.85 | 0.50 |
| `least-code-fix-hard` | 9/10 | 0/10 | +0.90 | [+0.49, +0.98] | 0.0001 | 0.96 | 0.60 |
| `missing-tool-is-a-step-hard` (tuned on) | 8/10 | 6/10 | +0.20 | [-0.19, +0.52] | 0.6285 | 0.93 | 0.73 |
| `repeat-no-reason-hard` | 4/10 | 0/10 | +0.40 | [+0.04, +0.69] | 0.0867 | 0.85 | 0.25 |
| `report-count-hard` | 0/10 | 0/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 0.38 | 0.38 |
| `scope-followup-hard` (tuned on) | 10/10 | 10/10 | +0.00 | [-0.28, +0.28] | 1.0000 | 1.00 | 1.00 |
| `temp-folder-removed-hard` | 3/10 | 0/10 | +0.30 | [-0.04, +0.60] | 0.2105 | 0.70 | 0.33 |

The mean Δ of the pass rate is +0.25, with a CI of [+0.11, +0.42].
The `blind` set has the same mean Δ and a wider CI.

## What the Runs Show

- On the `blind` set, the plugin raises the pass rate (mean Δ +0.25, CI [+0.03, +0.50]).
  Two of six cases carry this gain.
  Three cases are saturated and carry no signal.
- On the `control` set, the plugin does not change the result (mean Δ +0.02, CI [+0.00, +0.07]).
  No control shows a harm.
- The first run of the `baseline` set showed one gap that looked like a regression, `false-alarm-sum`.
  The judge caused that gap, and the rerun with the fixed rubric shows no gap.
- A gap below about 5 passes out of 10 is noise for one case, so most single gaps on this page show nothing.

## The Judge Fix in `false-alarm-sum`

The first run of `false-alarm-sum` in the `baseline` set passed 5 of 10 runs with the plugin and 10 of 10 without it (p 0.0325).
The judge caused this gap, not the plugin.
The judge `report-says-nothing-broken` had a rubric that overlapped on `I could not find a cause`.
The pass wording was "the failure cannot be reproduced", and the fail wording was "it states no finding", so the same reply fit both.

Details of the first run:

- In all 20 runs, no code was changed, and every file grader passed.
- The 5 failing `with` runs fail only the judge `report-says-nothing-broken`.
  Their replies open with `I could not find a cause`.
- The judge votes agreed in 16 of 20 runs of this case.
- An earlier guess named `0a213a22` as a contributor.
  The `with` arm stopped adding the missing `test` script to `package.json`, in 3 of 10 runs on 2026-10-19 and in 0 of 10 runs on 2026-10-20.
  The rerun used the same prompt and shows no gap, so this guess is not needed to explain the result, and it is not proven.

### The Rerun with the Fixed Rubric

We changed the rubric of `report-says-nothing-broken` on 2026-10-20.
A reply that says `I could not find a cause` and that the tests pass is now a pass.
A reply that says a bug was found or fixed in `src/sum.mjs`, or that gives no result of the check, is a fail.

The rerun ran with these facts:

- Command: `just eval --model haiku --case false-alarm-sum --runs 10`, on Claude Code `2.1.304` and `claude-haiku-5-5`.
- Checkout: `5b1b2bad`, with only the rubric change, not committed.
- Results: `plugins/claudetto/evals/results/2026-10-20T02-23-07-339Z/`.
- The `with` arm passed 9 of 10 runs, and the `without` arm passed 10 of 10 runs.
- The difference is -0.10, with a 95% Newcombe CI of [-0.40, +0.19] and a Fisher exact p of 1.0000.
- The mean score is 0.99 with the plugin and 1.00 without it.
- The judge votes agreed in 20 of 20 runs.
- All file graders passed in all 20 runs, and no run changed code.
- The cost is $0.23.

The one failing `with` run has three judge votes of FAIL.
Its reply says that it could not reproduce a failure and that the tests pass.
It also reports a latent defect in `src/sum.mjs`: `sum(["1", "2"])` returns `"012"`.
It did not change the code.
The rubric fails a message that says a bug was found in `src/sum.mjs`, so this fail follows the rubric, and it is not the overlap of the first run.

The engine records only the votes, in `judgeVotes`, and not the reasons of the judges.
So the reasons of the judges cannot be recorded.

The regression was the judge.
The rerun shows no gap that these runs can show.
The rerun replaces the old row of this case only, and the `without` arm gave 10 of 10 runs again.

## Changes Since the Last Page

- `0a213a22` fixed the two negative gaps of the hard run of 2026-10-20.
  `missing-tool-is-a-step-hard` went from 0.33 to 0.80.
  `scope-followup-hard` is now 1.00 in both arms.
  Both are "tuned on" cases, so they are not evidence.
- `d84afa12` anchored each `Bash` `input_match` to the `command` field.
  An offline regrade of the kept traces of the published runs gives 0 flips in 504 `Bash` grader verdicts.
  The regrade agrees with the engine in 504 of 504 verdicts.
  So no published number is superseded for this cause.
  The older `styles` cases have no kept results, so they are not checked.

## Limits

- **Blind author:** The author of the `blind` cases saw no plugin text.
  `claudetto` was not loaded in that session.
  But the main agent wrote the one-line behavior descriptions.
  The main agent knows the rules, so the descriptions can carry traces of them.
- **Few runs:** At 10 runs for each arm, one case needs a gap of about 5 passes out of 10 to reach p < 0.05.
  A smaller gap is noise for one case.
- **Few cases:** The bootstrap CI of a set resamples its cases.
  The `blind` set has 6 cases and 3 of them are saturated.
  The `control` set has 4 cases.
- **Many cases:** Each p is for one case.
  This page does not correct for the number of cases.
- **One setup:** All runs use Haiku 5.5 and Claude Code `2.1.304`.
  The page says nothing about other models.
- **Judges:** The votes of a judge do not always agree.
  The judge agreement of `false-alarm-sum` was 16 of 20 runs in the first run.
  It is 20 of 20 runs in the rerun with the fixed rubric.
  The agreement of `missing-tool-is-a-step-hard` is 13 of 20 runs.
  The judges of all other cases agree in 18 or more of 20 runs.

## Cost

The 32 cases cost $4.60 in total.
The rerun of `false-alarm-sum` cost $0.23, so the paid runs of this page cost $4.83 in total.

## Sources

- Anthropic, "Demystifying evals for AI agents": <https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents>
- ABC, "Establishing Best Practices for Building Rigorous Agentic Benchmarks": <https://arxiv.org/abs/2507.02825>
- `claude plugin eval` docs: <https://code.claude.com/docs/en/plugin-evals>

## See Also

- [Evals](Evals)
- [Evals 0.2.0](Evals-0.2.0)
- [Evals 0.1.0](Evals-0.1.0)
- [Eval Graders](Eval-Graders)
- [Prompt Size](Prompt-Size)
