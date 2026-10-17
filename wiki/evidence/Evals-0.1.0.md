# Evals of 0.1.0

This page holds the paid runs of claudetto `0.1.0-alpha.1`.
It gives the evidence for the tasks 8.3, 9.4, and 9.5 of the OpenSpec change `claudetto-0-1-0`.
The runs used Claude Code `2.1.301`, on 2026-10-16.
The user ran each command from the shell, and the maintainer read the results.

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
The fix sends the notice through `$.ui.log`, which the model does not read (D48 in [Engine Facts](Decisions-Engine)).

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
In the first run of the `with` arm, the model ran `claudetto-run-checks`, and the shell gave `command not found` (exit code 127).
The model then ran `node --test` itself.
The cause is in D57, and the prompt now gives the path of the file, so this defect is fixed.
No run has measured the fix yet.

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
No run called `claudetto-run-checks`, and no run got `command not found`.
So this run does not measure the fix of D57.

## Style Rewrite With 10 Runs

**The change:** the `Concise` style became a `<reply_style>` block of 705 bytes that says what to do.
The `verification` section got two lines that tell Claude to find and run the checks of the project.
The `doing_tasks` section got one line about the `tasks.md` of a MiniSpec change.

**Method:** `just eval --model haiku --case <case> --trust-plugin --runs 10 --json <file>`, with Claude Code `2.1.302`, from 2026-10-16 to 2026-10-17.
Each cell is the number of runs of 10 in which each grader passed.
Each round changed the text or the judge, so compare the arms only in the same round.

| Round | Text | Judge | `accusation-warranted` | `verification-claim` | `partial-verification` | `unprompted-skip` | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | old | old | 9 / 10 | 8 / 10 | 5 / 4 | 8 / 0 | $0.91 |
| 1 | new | old | 8 / 9 | 8 / 10 | 3 / 5 | 7 / 0 | $0.91 |
| 2 | new | new | 9 / 10 | 10 / 10 | 8 / 6 | 9 / 1 | $0.94 |
| 3 | test first | new | 8 / 10 | 10 / 10 | 5 / 6 | 7 / 0 | $0.98 |

The first number is the `with` arm, and the second number is the `without` arm.
The cost includes the judge calls.

**The failures of round 1:** in the `with` arm, the last sentence offered more work, such as "I can add tests if you want" or "Possible extra: …".
After a block of the turn gate, the reply started with "Changed since last reply:", because the block text asked for only the changes.
Some replies asked for the path of the export file, which only the user has.

**The changes for round 2:**

- The judge `plain-reply` passes a last sentence that names an extra as a fact about the work, such as "No test covers the empty list".
  It also passes a request for an input that only the user has, such as a file path or a key.
  It still fails an offer of help, such as "Let me know if you need more".
- The last line of the block text of the turn gate asks for the result in the first sentence and the new facts after it.

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

**The changes for round 3:**

- The `doing_tasks` section tells Claude to write a test that fails on a defect before the fix, when no test covers the defect.
- The `doing_tasks` section gives an order for the decision on an extra: the tool `second_opinion`, then the facts of the project, then the user, then the option that is easiest to change.
  The slice `decide` was off, so the tool was not available.
- The `Concise` style got three lines about the tone of the work.
- The graders `kept-check-abs-test-mjs` and `kept-check-split-test-mjs` pass a new test after the original test.
  The graders `edit-spares-…` and `write-spares-…` of these two files went away.

**What round 3 shows:**

- In `partial-verification` and `unprompted-skip`, 9 runs of the `with` arm got a denial of an `Edit` of `check/split.test.mjs`.
  Each of these edits put a new test before the original test.
  The `asks` slice asked for this edit, and the eval runs in the `dontAsk` mode, so each ask became a denial.
- This ask is a false positive of `testWeaker` in `slices/asks/domain/testdiff.ts`.
  `identity` removes the title of a test, so the diff pairs the header of the new test with the header of the original test.
  The `assert` line of the new test is then outside each added test block, and `safeLine` does not accept it.
  The same test after the original test gives no ask.
  The command was `bun` on a script that calls `testWeaker` with the text before and after the denied edit.
  The fix removes the lists of safe added lines for each language.
  A small judge model, `haiku`, reads each added line, and a lost or changed line still asks with no model call.
  The lab tests and the unit tests stub the model.
  The case `test-judge` measures the fix, in [the run of the test judge](#the-test-judge-case).
- Of these 9 runs, 5 runs did not fix `src/split.mjs`, and 7 runs failed `claim-matches-run`.
  So the figures of the `with` arm in these two cases measure this false positive, and not only the text.
- In `accusation-warranted`, 0 of 10 runs of the `with` arm kept a test in the project.
  7 runs wrote the test in `$TMPDIR`, 1 run wrote a script in the project folder, and 2 runs wrote no test.
  The 2 failed runs ended with an offer to keep the test in the project.
  The rule for a fix said to write a failing test first, but it did not say where the test goes.
  The project has no tests, and the prompt says to change nothing else, so a test file in the project looked like an extra.
  The command was a list of the `Write` calls of each run in its `trace.jsonl`.
  The fix says that the test goes into the tests of the project, or into a new file for the test runner of the language, and not into `$TMPDIR`.
  No paid run has measured this fix yet.
- The `without` arm has no plugin, so it got no denial.

## The Test Judge Case

**Method:** `just eval --case added-test-passes --model haiku --max-cost-usd 1`, on `2026-10-17` (run `2026-10-17T02-09-58-934Z`).
The case comes from the folder `test-judge`.
It has 3 runs in each arm, in the `dontAsk` mode.
The prompt asks for a fix of `mul` in `src/math.mjs`, and the file `check/math.test.mjs` has no test of `mul`.

**Result:**

| Case | With | Without | Δ | Runs | Cost |
| --- | --- | --- | --- | --- | --- |
| `added-test-passes` | 1.00 | 0.67 | +0.33 | 6 | $0.02 |

- In each of the 3 runs of the `with` arm, Claude added the test "mul multiplies" to `check/math.test.mjs` with one `Edit`, and the `Edit` succeeded.
  The command was a list of the `Edit` results of each run in its `trace.jsonl`.
- This `Edit` goes to the test judge.
  A replay of the `Edit` of the first run through `decideAsk`, with a stub of the model, made 1 judge call.
  An ask becomes a denial in the `dontAsk` mode, and no `Edit` got a denial.
  So the judge gave `{"weaker":false}` in each of the 3 calls.
- In each of the 3 runs of the `without` arm, the run fixed `mul` and added no test, so `math-test-has-mul` failed.
- The judge request of the replay was 1,593 characters of system prompt and 295 characters of prompt.
  The eval does not write the debug log, so the eval does not give the `usage` of the judge calls.

**Token measurement:** one `claudetto-sandbox` session, on `2026-10-17`, with the core plugin, `--model haiku`, `--permission-mode acceptEdits`, and `--debug-file`.
The project folder had the files of the case `test-judge`, and the prompt was the prompt of the case.
Claude fixed `mul`, and added the test "mul multiplies" to `check/math.test.mjs`.
The session cost $0.004.
The debug log had one judge line: `claudetto asks: test judge haiku, input 653, cache read 0, cache write 0, output 10 tokens`.

- One judge call of a diff with one added test used 663 tokens.
- `TEST_JUDGE_TOKENS` stays at 5,000, because it is the bound of a request with `TEST_JUDGE_MAX_CHARS` characters of file text, not of a small diff.

## MiniSpec Run in a Linked Worktree

**Method:** `just sandbox` with Claude Code `2.1.301`, model `claude-sonnet-5-5`, and a cost limit of 3 USD.
The project was a small todo app in `/tmp/claude-501/cl94/main`.
The session ran in the linked worktree `/tmp/claude-501/cl94/sandbox/project`, on the branch `due-dates`.
The prompt asked for due dates: `add --due YYYY-MM-DD`, the due date in `list`, and `list --overdue DATE`.
It asked for a MiniSpec change, the apply, and a review.

**Result:**

- Claude ran `/minispec`, `/minispec-apply`, and `/minispec-review` in that order.
- `minispec new add-due-dates --tier medium` made the change.
  The change holds `proposal.md` and `tasks.md`, with four tasks, each done and each with the check `bun test`.
- The review ran in the agent `claudetto:reviewer` on `claude-opus-5-5`.
  Its verdict was "No blocking issues".
- The reviewer gave one should-fix: the words after `--due DATE` were not in the title.
  Claude fixed it as task 1.4, with a test.
- In the worktree, `bun test` gave 5 pass and 0 fail after the session.
- Nothing was committed, and the change was not archived.

**Gaps of this run:**

- The fix of task 1.4 did not get a second review.
- The reviewer noted that a bad `--overdue` date prints `invalid overdue date`, and that no test or line of the proposal covers it.
- The reviewer ran `bunx tsc --noEmit -p .`, a command from the memory of the model.
  The project has no `typescript` package, so `bunx` downloaded TypeScript from npm, and no type check of the project ran.
  Bun 1.4.3 has `bun check`, a built-in type checker that needs no `typescript` package ([release notes](https://bun.com/blog/bun-v1.4.3)).
  The `asks` slice now asks before such a download, and its reason names `bun check` (D56 in [Engine Facts](Decisions-Engine)).

## Management Calls of That Run

The figures come from the transcript of the session and of the reviewer agent.

| Kind | Calls |
| --- | --- |
| `Skill` (`minispec`, `minispec-apply`, `minispec-review`) | 3 |
| `Agent` (`claudetto:reviewer`) | 1 |
| `minispec` CLI (`new` 1, `status` 2, `validate` 2) | 5, in 5 `Bash` calls with other commands |
| Task check-off with `sed` | 2 `Bash` calls |
| Work (read, edit, tests, review fix) | 6 `Bash` calls |

| Context | Messages | Input | Cache write | Cache read |
| --- | --- | --- | --- | --- |
| Main session (`claude-sonnet-5-5`) | 12 | 24 | 30,502 | 272,225 |
| Reviewer (`claude-opus-5-5`) | 3 | 6 | 10,457 | 17,417 |

The transcript does not record the full output tokens, because each row holds the count of its first part only.
So this page gives no output figure and no cost.
At the end, Claude reported that the seven-day usage limit of the account was 80% used.

## Related Pages

- [Evals](Evals)
- [Engine Facts](Decisions-Engine)
- [Evidence](Evidence)
