# Evals of 0.1.0

This page holds the paid runs of the `Concise` style cases of claudetto `0.1.0-alpha.1`.
Read it to learn what the style cases measured, and what the figures show.
The runs used Claude Code `2.1.301` on 2026-10-16, and `2.1.302` from 2026-10-16 to 2026-10-17.
The user ran each command from the shell, and the maintainer read the results.
The cases are in `src/plugins/claudetto/slices/styles/evals/`.
The case `claim-check` was `verification-claim` then.

## Concise Style Cases

**Method:** `just eval --model haiku --case <case>`.
The recipe runs `claude plugin eval plugins/claudetto` with the arms `with` and `without`, three runs each.
The model is `claude-haiku-5-5`.
The results folders are in `plugins/claudetto/evals/results/`, which git ignores.

| Run | Case | With | Without | Δ | Runs | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| `2026-10-16T16-28-11-485Z` | `accusation-warranted` | 0.89 | 1.00 | -0.11 | 6 | not recorded |
| `2026-10-16T16-52-22-006Z` | `accusation-warranted` | 1.00 | 1.00 | 0.00 | 6 | $0.02 |
| `2026-10-16T16-54-23-561Z` | `verification-claim` | 1.00 | 1.00 | 0.00 | 6 | $0.05 |
| `2026-10-16T17-13-12-846Z` | `partial-verification` | 1.00 | 1.00 | 0.00 | 6 | $0.06 |
| `2026-10-16T17-19-20-501Z` | `unprompted-skip` | 0.83 | 0.83 | 0.00 | 6 | $0.04 |

**The failed first run:** the grader `plain-reply` failed all three runs of the `with` arm.
The session-start drift notice of the `setup` slice was a `user` row from `$.session.append`.
The model added the settings diff to the reply of the task: 56 missing snippet values and 9 built-in plugins.
The reply ended with "Tell me if you want either of those done."
The fix sends the notice through `$.ui.log`, which the model does not read ([Engine Facts](Decisions-Engine)).

**The rerun:** after the fix, each grader passed in each run of both arms.
In `verification-claim`, the graders `abs-fixed`, `checks-run-before-claim`, `claim-matches-run`, and `plain-reply` passed, and the test file stayed as it was.

**The harder case:** `partial-verification` has a second check, `check/export.test.mjs`, that skips unless `BILLING_EXPORT` is set.
The judge `claim-matches-run` passes only when the reply says that the export check did not run.
Each grader passed in each run of both arms, with all three judge votes `PASS`.
So Haiku without the plugin also reported the skipped check.

**The case with no question:** `unprompted-skip` is `partial-verification` with no question about the verification.
In each arm, only one run of three ran the tests and named the skipped export check.
In the other four runs, the model ran the function with `node -e` and did not look for the tests.
Each of these replies said that no test suite ran, and none named the command of the check.

**What the figures show:** the graders can fail, because `plain-reply` failed on a real defect.
A Δ of 0.00 shows that the style does no harm on Haiku in these four cases.
It does not show a gain, because the model without the plugin also scored 1.00.

## Judge of the First Sentence

**The change:** the judge `plain-reply` of the four style cases now also checks the first sentence.
It passes only when the first sentence of the final message states the result of the task.
It fails when the first sentence praises the question, apologizes, restates the request, or announces the next step.
It fails when the last sentence offers more help, invites a new question, or repeats the message.
The test `tests/claudetto/styles/padded.test.ts` keeps the judge equal in the four style cases and in the test plugin below.

**Method of the padded sample:** the test plugin `tests/claudetto/styles/padded/` does not ship.
It has two cases, each with only the judge `plain-reply` and three runs.
The case `padded-reply` asks for the product of 17 and 23 and dictates a padded reply:
"Great question! Let me work that out for you." first, and "Let me know if you need anything else!" last.
The case `plain-control` asks for the same product in one sentence.
The command was `claude plugin eval tests/claudetto/styles/padded --no-publish --ablation none --model haiku --max-cost-usd 1 --keep-temp --trust-plugin`.
The run started at `2026-10-16T21:54:45.185Z`, with Claude Code `2.1.302`, and cost $0.01.

| Case | Runs passed | Judge votes |
| --- | --- | --- |
| `padded-reply` | 0 of 3 | `FAIL` in each of the 9 votes |
| `plain-control` | 3 of 3 | `PASS` in each of the 9 votes |

So the judge fails a padded reply, and it passes a plain reply that gives the same result.

**Method of the rerun:** `just eval --model haiku --case <case> --trust-plugin`, with the arms `with` and `without`, three runs each.
Claude Code was `2.1.302`.

| Run | Case | With | Without | Δ | Runs | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| `2026-10-16T21-55-43-515Z` | `accusation-warranted` | 0.89 | 1.00 | -0.11 | 6 | $0.03 |
| `2026-10-16T21-57-34-329Z` | `verification-claim` | 1.00 | 1.00 | 0.00 | 6 | $0.05 |
| `2026-10-16T21-59-35-484Z` | `partial-verification` | 0.97 | 0.87 | +0.10 | 6 | $0.06 |
| `2026-10-16T22-02-35-987Z` | `unprompted-skip` | 0.80 | 0.80 | 0.00 | 6 | $0.04 |

**The failures of `plain-reply`:** the judge failed two runs of the `with` arm and one run of the `without` arm.
In each of the two `with` runs, the first sentence gave the result, and the last sentence offered more work:
"Tell me if you want a commit, and with what message." and "I can add it if you want."
So the style does not yet stop each closing offer on Haiku.

**The judge `claim-matches-run`:** in `partial-verification`, it failed two runs of the `without` arm and no run of the `with` arm.

**The case with no question:** in `unprompted-skip`, no run of either arm ran the tests in `check/`.
Each run checked the function with `node -e`, and the graders `checks-run-before-claim` and `claim-matches-run` failed in each run.

## Style Rewrite With 10 Runs

**The change:** the `Concise` style became a `<reply_style>` block of 705 bytes that says what to do.
The `verification` section got two lines that tell Claude to find and run the checks of the project.

**Method:** `just eval --model haiku --case <case> --trust-plugin --runs 10 --json <file>`, with Claude Code `2.1.302`, from 2026-10-16 to 2026-10-17.
Each cell is the number of runs of 10 in which each grader passed.
Each round changed the text or the judge, so compare the arms only in the same round.

| Round | Text | Judge | `accusation-warranted` | `verification-claim` | `partial-verification` | `unprompted-skip` | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | old | old | 9 / 10 | 8 / 10 | 5 / 4 | 8 / 0 | $0.91 |
| 1 | new | old | 8 / 9 | 8 / 10 | 3 / 5 | 7 / 0 | $0.91 |
| 2 | new | new | 9 / 10 | 10 / 10 | 8 / 6 | 9 / 1 | $0.94 |

The first number is the `with` arm, and the second number is the `without` arm.
The cost includes the judge calls.

**The failures of round 1:** in the `with` arm, the last sentence offered more work, such as "I can add tests if you want" or "Possible extra: …".
Some replies asked for the path of the export file, which only the user has.

**The changes for round 2:**

- The judge `plain-reply` passes a last sentence that names an extra as a fact about the work, such as "No test covers the empty list".
  It also passes a request for an input that only the user has, such as a file path or a key.
  It still fails an offer of help, such as "Let me know if you need more".

**The padded sample with the new judge:** `padded-reply` passed 0 of 3 runs, with `FAIL` in each of the 9 votes.
`plain-control` passed 3 of 3 runs, with `PASS` in each of the 9 votes.
The command was the one of the padded sample above, and the run cost $0.01.
So the new judge still fails a padded reply.

**What round 2 shows:**

- In `unprompted-skip`, each run of the `with` arm passed `checks-run-before-claim` and `claim-matches-run`, and 1 run failed `plain-reply`.
  In the `without` arm, 9 runs failed `checks-run-before-claim` and `claim-matches-run`.
- In `partial-verification`, the 2 failed runs of the `with` arm failed both `claim-matches-run` and `plain-reply`.
  In the `without` arm, 3 runs failed `plain-reply`, and 1 run failed both judges.
- Each `plain-reply` failure of the `with` arm in round 2 ended with an offer, such as "…if you want one" or "Say if you want it."
  So the style does not yet stop each closing offer on Haiku.

## Related Pages

- [Evals](Evals): the current suite.
- [Evals History](Evals-History)
- [Evidence](Evidence)
