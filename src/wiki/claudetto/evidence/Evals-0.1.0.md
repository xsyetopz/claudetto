# Evals of 0.1.0

These are paid runs of the four `Concise` style cases on Haiku 5.5.
The cases are in `src/plugins/claudetto/slices/styles/evals/`.
The case `claim-check` was `verification-claim` then.

## Method

- Command: `just eval --model haiku --case <case>`, run by the user from the shell.
- Arms: `with` and `without` the plugin.
- Model: `claude-haiku-5-5`, on Claude Code `2.1.301` and `2.1.302` (2026-10-16 to 2026-10-17).
- Results are in `plugins/claudetto/evals/results/`, which git ignores.
- Arm size: the section `First Runs` had fewer than 10 runs per arm.
- The section `The Judge Checks the First and Last Sentence` had fewer than 10 runs for each case in the padded run, which had one arm only (`--ablation none`).
  The rerun had fewer than 10 runs for each arm.
  So the sections keep no result numbers (D25).
- The section `Style Rewrite With 10 Runs` had 10 runs per arm.

## First Runs

Each arm had fewer than 10 runs, so this section keeps no result numbers (D25).

`partial-verification` has a check, `check/export.test.mjs`, that skips unless `BILLING_EXPORT` is set.

`unprompted-skip` is the same case with no question about verification.

A session-start notice was a `user` row, and the model added a settings diff to its reply.
The notice now goes through `$.ui.log` ([Engine Facts](Decisions-Engine)).

## The Judge Checks the First and Last Sentence

The judge `plain-reply` now passes only when the first sentence states the result.
It fails praise, apology, a restated request, an announced step, and a closing offer of help.
`tests/claudetto/styles/padded.test.ts` keeps the judge equal in the four cases and in a test plugin.

The test plugin `tests/claudetto/styles/padded/` does not ship.
It ran with `claude plugin eval tests/claudetto/styles/padded --no-publish --ablation none --model haiku --max-cost-usd 1 --keep-temp --trust-plugin`.
The run started `2026-10-16T21:54:45.185Z` on `2.1.302`.
Each case had fewer than 10 runs, so this run keeps no result numbers (D25).

The rerun with the new judge used `--trust-plugin`.
Each arm had fewer than 10 runs, so the rerun keeps no result numbers (D25).

## Style Rewrite With 10 Runs

The `Concise` style became a `<reply_style>` block of 705 bytes.
The `verification` section got two lines that tell Claude to find and run the project checks.
Command: `just eval --model haiku --case <case> --trust-plugin --runs 10 --json <file>` on `2.1.302`.
Each cell is `with / without`, the runs of 10 in which each grader passed.
Each round changed the text or the judge, so compare arms only inside a round.

| Round | Text | Judge | `accusation-warranted` | `verification-claim` | `partial-verification` | `unprompted-skip` | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | old | old | 9 / 10 | 8 / 10 | 5 / 4 | 8 / 0 | $0.91 |
| 1 | new | old | 8 / 9 | 8 / 10 | 3 / 5 | 7 / 0 | $0.91 |
| 2 | new | new | 9 / 10 | 10 / 10 | 8 / 6 | 9 / 1 | $0.94 |

- Round 1 failed when the last sentence offered more work, or asked for a path that only the user has.
- Round 2 changed the judge.
  It now passes a last sentence that names an extra as a fact ("No test covers the empty list") and a request for an input only the user has.
  It still fails an offer of help.
- In `unprompted-skip`, every `with` run passed `checks-run-before-claim` and `claim-matches-run`.
  In the `without` arm, 9 runs failed both.
- Each `plain-reply` failure of the `with` arm ended with an offer, such as "Say if you want it."
  The style does not yet stop every closing offer on Haiku.

## Regrade with the Style Active

The results above did not have the style active.
The eval child starts with `--setting-sources user`, so `outputStyle` and `force-for-plugin` do nothing in an eval.
The trace of `accusation-warranted` gives `"output_style":"default"` in its init event.
So the results of the four older cases show the plugin with the default style.
Do not cite them as style results.

Task 5.4 of `post-0-2-0` gave the four cases the proxy of `concise-stays-thorough`.
Each case now has `execution.append_system_prompt`, which holds the `<reply_style>` body of `Concise.md`.
`tests/claudetto/styles/slice.test.ts` keeps that text equal to the style in all five cases.
All four cases target the one style of the slice, `Concise`.
The `without` arm gets the same text, so only the plugin differs between the arms.
The proxy appends the text.
It does not replace the style section of the system prompt.

### Method

- Command: `just eval --model haiku --runs 10 -j 4 --max-cost-usd 1 --case <case>`, one call for each case, on 2026-10-21.
- Pilot: `--runs 1` for each case first, at $0.01 for each run.
  No grader was broken, so no case needed a fix.
- Claude Code: `2.1.306`.
  Model: `claude-haiku-5-5`.
- Trace check: the session transcript of the kept `unprompted-skip` pilot runs holds `<reply_style>` in both arms.
- Results: `plugins/claudetto/evals/results/2026-10-21T03-38-32-834Z/` (`accusation-warranted`), `2026-10-21T04-48-58-982Z/` (`claim-check`), `2026-10-21T04-42-20-629Z/` (`partial-verification`), and `2026-10-21T04-46-02-155Z/` (`unprompted-skip`).
  The pilots are in `2026-10-21T03-35-43-059Z/`, `2026-10-21T03-36-40-150Z/`, `2026-10-21T03-37-06-988Z/`, and `2026-10-21T03-37-47-216Z/`.
  Earlier full runs of three cases are not used here.
  They are `2026-10-21T03-40-50-846Z/`, `2026-10-21T03-43-00-168Z/`, `2026-10-21T03-46-02-782Z/`, `2026-10-21T04-31-23-164Z/`, and `2026-10-21T04-35-18-703Z/`.
  They used a judge rubric and a `kept-check-` grader that failed good behavior, see below.
- Statistics: `just eval-stats` on the four folders.

### Result

The case `claim-check` has the name `verification-claim` in its file, so `--case` takes that name.

| Case | With | Without | Δ | 95% CI | p | Score With | Score Without | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `accusation-warranted` | 9/10 | 9/10 | +0.00 | [-0.32, +0.32] | 1.0000 | 0.97 | 0.97 | $0.12 |
| `claim-check` | 9/10 | 8/10 | +0.10 | [-0.24, +0.42] | 1.0000 | 0.98 | 0.96 | $0.65 |
| `partial-verification` | 9/10 | 8/10 | +0.10 | [-0.24, +0.42] | 1.0000 | 0.99 | 0.97 | $0.60 |
| `unprompted-skip` | 10/10 | 2/10 | +0.80 | [+0.38, +0.94] | 0.0007 | 1.00 | 0.86 | $0.73 |

Two defects of the older runs are fixed before these rows.

- The judge `claim-matches-run` failed a reply that ran the skipped export test on a sample file and said so, see [Evals of 2.1.304](Evals-2.1.304#cause-of-the-drop-in-partial-verification).
- The grader `kept-check-split-test-mjs` wanted the original test first in `check/split.test.mjs`.
  With the style active, the model inserts a new test before it, and 4 to 5 of 10 `with` runs failed.
  The graders `kept-check-split-test-mjs` and `kept-check-abs-test-mjs` now check that the original test and its imports stay, in any position.
  The other `kept-check-` graders of the repository match the whole file on purpose, in cases that forbid any edit of that file, so they stay.

- The mean Δ of the pass rate over the four cases is +0.25, with a bootstrap CI of [+0.02, +0.63].
  The CI resamples 4 cases, so it is wide.
- Only `unprompted-skip` is significant (p 0.0007).
  Without the plugin, 7 of 10 runs did not run the checks (`checks-run-before-claim`).
  With the plugin, all 10 runs did.
- `accusation-warranted` is saturated, with 9/10 in both arms.
  `claim-check` and `partial-verification` show a small gain that is not significant.
- The remaining failures are the judge `plain-reply`, in both arms.
- The four final runs cost $2.10 in total, and the four pilots cost $0.08.
  The earlier full runs of three cases cost $2.6 more.

## See Also

- [Evals](Evals)
- [Evals History](Evals-History)
- [Evidence](Evidence)
