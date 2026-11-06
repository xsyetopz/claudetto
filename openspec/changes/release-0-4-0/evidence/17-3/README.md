# 17.3 Stop grader, measured on held-out replies

The Stop grader's Haiku call (`gradeBlock` in `hooks/limits/stop.ts`, prompt `VERIFY_GRADE` in `hooks/texts.ts`), graded on final
replies from the 17.4 narration run (`../17-4/`), which no grader prompt was tuned on.

## Data

- `cases.json`: the 17.4 cases, copied from the run.
- `grader.ts build <n>` writes `replies-<n>.json`. Split n is the n-th session of each of the 68 case/arm pairs in
  `../17-4/sessions.jsonl` (each pair has 6 sessions).
  - Each reply's offered codes come from `offeredCodes`, the plugin's own function. A call counts as a look unless its error
    text reads as a refusal. stream-json keeps no record of an ask, so a refusal is read from its wording (`REFUSAL` in
    `grader.ts`), an approximation of the hook's `denied` set.
- `labels-<n>.json`: one label per reply, written by the lead from the reply and the test sentence of each offered code, and
  committed before any grade run of that split.
  - Split 1: 73058e17. 49 clean, 11 unchecked, 8 unfiled.
  - Split 2: ced235d9. 52 clean, 8 unchecked, 8 unfiled.
  - Notes in each file explain the borderline calls.
- `grader.ts grade <n>` writes `results-<n>-<time>.json`, with every answer and reading.
  - It runs the same call the hook makes: a generated plugin's `prompt.submit` hook calls `$.model.complete` (haiku,
    `maxTokens: 300`, `timeoutMs: 15000`), six at a time.
  - It runs in batches of 20 replies per `claude -p` session, one session after another. Each session spends about 30k tokens,
    and the script stops if a session ever passes 300k.
  - Intervals are 95% Wilson.

## Harness

A first grade ran the prompt through `claude -p` with `CLAUDE_CODE_MAX_OUTPUT_TOKENS=300`, and the result was invalid:
- That variable caps thinking too: 25 of 68 calls ended with "API Error: Claude's response exceeded the 300 output token
  maximum", and the other 43 answered `{"faults":[]}`.
- It spent 300,780 tokens ($0.0722), 780 over the per-run cap, because its guard checked the total only before each call while
  six calls were in flight.

The file was deleted. The batched guard above replaced it.

Probe `/tmp/probe-17-3` (its hook and log in `probe/`):
- H: the hook's `$.model.complete` with `maxTokens: 300` is not cut by thinking.
- P: all 8 capped prompts answer.
- Result: 8/8 answered, 315 to 1005 output tokens, 2.2 to 5.4 s.

## Results

| run | prompt | unchecked recall | unfiled recall | clean flagged | tokens |
| --- | --- | --- | --- | --- | --- |
| `results-1-2026-11-06T18-36-12-073Z.json` | before this change | 2/11 [0.05, 0.48] | 1/8 [0.02, 0.47] | 2/49 [0.01, 0.14] | 108,075 |
| `results-1-2026-11-06T18-39-30-472Z.json` | after (dev split) | 10/11 [0.62, 0.98] | 8/8 [0.68, 1] | 4/49 [0.03, 0.19] | 112,888 |
| `results-2-2026-11-06T18-40-23-100Z.json` | after (held-out) | 8/8 [0.68, 1] | 8/8 [0.68, 1] | 5/52 [0.04, 0.21] | 112,355 |

All 68 calls answered in every valid run. No reply was labeled `credited`, `fallback` or `rules`.

**H:** the misses on split 1 came from two things:
- replies that say "I haven't checked" and still adopt the user's value or write the commit message, which the grader took for
  "a reply that says it must look first";
- the grader not knowing what the hook knows: that no call read the workspace, and that nothing was written to the issues file.

**P:** stating both facts and naming the admitted-but-adopted case in the `unchecked` test lifts recall on held-out split 2 to at
least 6/8 for each code, with at most 6/52 clean flagged.

**Result:** 8/8 and 8/8, with 5/52 clean flagged.

The clean replies flagged on split 2:
- Three d-lifted replies get `unchecked`. They name the pending change from the session-start git status, which the grader
  doesn't see, so the block asks for a look that costs one `git status`.
- One `sort-numbers` reply quotes a plugin denial and gets `rules`.
- One `sort-numbers` reply gets `unfiled` for a sibling note it calls intentional.

## Lab

`hooks/limits/verify.test.ts`:
- "the grader is told the turn facts that offer its codes"
- "a turn that looked is not told it made no look"
- "the grader sees the background tasks the session lists"

Lab: 1213 pass.

Mutants, each caught:
- the no-look fact dropped: 1 fail
- the issues fact dropped: 2 fail
- the background tasks not passed to the prompt: 1 fail
