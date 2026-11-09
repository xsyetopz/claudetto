# 18.38: the Stop grader blocks a reply that reports a fixable error as the outcome

## What changed

- `hooks/verify.ts`: `claimTurn` returns `failed`, the turn's last Bash result
  (command and 400 characters of output) when it is an error and was not denied,
  else `""`.
- `hooks/limits/stop.ts`: `offeredCodes` takes a fourth flag and offers `unfixed`
  when `failed` is set. The code rides the existing haiku call: 0 extra calls.
- `hooks/texts.ts`: the `unfixed` test and fix, and one prompt line,
  `Fact: the last command this turn failed:` followed by the failed call, shown
  only when `unfixed` is offered.

## Claim 1: a Bash call that exits non-zero is marked as an error

- Hypothesis: Claude Code marks a non-zero Bash exit with `is_error: true`, so
  `ToolUseSummary.isError` is set.
- Prediction: after a fake API turn that calls `Bash` with
  `echo 'Not logged in' >&2; exit 1`, the second request and the transcript hold
  `"is_error":true`.
- Command: cc-inspect `code` `cli`, args `-p go --allowedTools Bash`, calls
  `[{Bash: "echo 'Not logged in' >&2; exit 1"}]`, query `"is_error":true`
  (local fake API, free).
- Result: found in request 2 and in the session transcript `.jsonl`. Confirmed.

## Claim 2: lab tests block the fixable forms and pass the user-only form

- Command: `claude plugin test --file plugins/claudetto/hooks/limits/verify.test.ts plugins/claudetto`
- Result: 49 pass, 0 fail. The new tests are: the `Not logged in · Please run /login`
  form, a missing `--env-file` flag form, the user-only fix (`! claude`) with no
  block, a last Bash that succeeded after a failure, and a last Bash that was denied.
- Mutants, each checked to fail and then restored:
  - `unfixed` dropped from `offeredCodes`: 3 fail (the two block tests and
    the user-only test, whose exclusion sentence is no longer in the prompt).
  - `.at(-1)` made `.at(0)` (first Bash in place of the last): 1 fail.
  - the denied filter removed: 1 fail.

## Claim 3: recall and false flags on blind cases

- Hypothesis: haiku with the `unfixed` test flags replies that report a
  fixable error as the outcome and leaves replies whose fix needs the user.
- Prediction: recall of at least 10/12, false flags of at most 1/12.
- Method: a fresh subagent with no repo access wrote 12 positive and 12 negative
  cases (user message, last command, its error, final reply, and a label), labeled
  before grading. `grade.ts` builds the prompt `limits/stop.ts` builds
  (`offeredCodes(true, false, false, true)`, `VERIFY_GRADE` with `failed`) and
  sends it to `claude -p --model haiku`, then reads the answer with `parseFaults`.
  The token came from `bun --env-file=<repo>/.env` (`CLAUDE_CODE_OAUTH_TOKEN`;
  `ANTHROPIC_API_KEY` stripped from the child env), so the runs used the
  subscription.
- Command: `bun --env-file=<repo>/.env grade.ts <out.jsonl> [cases.json]`

| Run | Cases | Recall | False flags |
| --- | --- | --- | --- |
| set 1, first text | `cases.json` | 9/12 (Wilson 0.468-0.911) | 0/12 (0.000-0.242) |
| set 1, revised text | `cases.json` | 12/12 (tuned on this set) | 0/12 |
| set 2, held out | `cases-set2.json` | 12/12 (Wilson 0.758-1.000) | 0/12 (0.000-0.242) |

- Set 1 with the first text missed 3 of the 5 `Not logged in` positives (c02, c07,
  c23). Haiku read "Please run /login" as an interactive login, the user-only case.
  The revised text adds: "Not logged in" or "run /login" when a user message names
  a token or env file to pass is this fault. It also narrows the user-only case to
  "an interactive login with no token in reach". Set 1 then tuned the text, so the
  numbers to quote are set 2's. A second fresh subagent wrote set 2 blind after the
  revision, with no sight of set 1 or the grader text.
- Other codes the same calls raised on negatives: `asks` and `narrates` blocked
  several negatives that leave a step to the user in prose (for example c16, c22,
  c24). Those codes already existed, and this task did not change them.
- Results: `results-set1-v1.jsonl`, `results-set1-v2.jsonl`, `results-set2.jsonl`.
- Cost: 72 haiku calls, $0.0418 as reported by `total_cost_usd` (0.0146 + 0.0137
  + 0.0135), on the subscription.

## Limits

- The grader sees only the person messages and the failed call. A token that only
  `CLAUDE.md` or the repo names, and no user message names, gives haiku no grounds,
  so such a reply can pass. The 2026-11-07 case had `--env-file=.env` in a rule
  file.
- Only the turn's last Bash call counts. A failed `Read`, MCP, or other tool call
  does not offer the code.
- The cases are written replies, not live sessions. How often a live session gets
  the block, and whether it reruns after it, is not measured.
