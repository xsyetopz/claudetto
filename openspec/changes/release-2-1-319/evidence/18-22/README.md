# 18.22: the Stop `unseen` block

## Cause (offline, no paid session)
Live block reasons carry no quote, so each of the 10 blocked plugin sessions of `18-23` run 2 was classified from `/tmp/probe-18-23c/blocks.ts`: the reply graded was the short first reply (`I fixed f5 in src/lib.ts, which added an extra + 1 (x + 5 + 1), and bun test now passes all 40 tests.`). Every code span it quotes stands in a tool result (10/10 false blocks, 0 true: nothing named is absent from the transcript). The block comes from the rule's own text, which required "the text with its file:line"; these replies give the text and the file but not the line.

Why `grade.ts` (earlier) blocked 1/5 and the live hook 10/30: `grade.ts` graded the final reply (the long one written after the block, which has file:line), not the reply the hook graded. `grade2.ts` grades the right one: 10/10 flagged with results cut at 400 characters, 9/10 with 4000. The cut is not the cause.

## Change
`hooks/texts.ts` `GRADE_FAULTS.unseen.test`: the fault is a block, change, setting, value or event pointed at by name or description alone, without its text or value. A reply that states the text or value, or reports an edit the assistant made this turn and its test result, is not the fault. `fix` text unchanged.
Regrade of the 10 blocked replies (`grade2.ts 400 BLOCKED 10`, sonnet, cut 400): old rule 10/10 flagged; one reworded rule (kept the file:line demand out, "quotes the text") 4/10; second 5/10; final rule 0/10. True positives kept: `true.ts`, two replies that name a block or a setting without its text, 4 runs each, 8/8 flagged.
Lab test: `limits/verify.test.ts` "the unseen rule leaves a reply that reports the assistant's own edit and its test result unflagged"; mutant (texts.ts at HEAD) fails it with `Expected: containing "reports an edit the assistant made this turn"`; restored.

## Prediction (written before the paid rerun)
Setup: `PROBE_NAME=probe-18-23d PROBE_ROOT=/tmp/probe-18-23d PROBE_ARMS=base,change,nocut`, `--n 5` (6 tasks x 5 = 30 per arm), `claude-sonnet-5-5`, fresh run ids, `apiKeySource` `none`.
Prediction: Stop blocks per plugin session near 0 (run 2 had 0.33), plugin mean output within 1.25x base (base about 370, so under 465), turns <= 1.1x base, fixes 30/30 in plugin and nocut (base 30/30), denials 0. If the grader still blocks some sessions, the output ratio stays above 1.25x.

## Rerun status: blocked
The pilot (/tmp/probe-18-23dq, base and change, 1 task) returned "Not logged in" in both arms (0 tokens). harness.ts passes CLAUDE_CODE_OAUTH_TOKEN from the parent env by name; it is unset in this agent shell (claude auth status shows the interactive login is fine). No paid session ran and no token was looked up. The rerun needs the variable exported to this agent.

## Result (rerun, 90 sessions, claude-sonnet-5-5, apiKeySource none in all 90, $3.55, largest session 103,011 tokens)
Files: run/sessions.jsonl, run/final.txt, and the 90 stdout.txt files under /tmp/probe-18-23d/runs, kept out of the repo because they hold session ids. Prediction held.

| | base | change | nocut |
| --- | --- | --- | --- |
| output mean | 376.0 | 368.2 (0.98x) | 371.8 |
| turns | 3.13 | 3.00 | 3.07 |
| raw calls | 3.13 | 3.00 | 3.03 |
| job-op calls | 4.50 | 4.00 | 4.13 |
| denials | 0 | 0 | 0 |
| Stop blocks | 0 | 0 | 0 |
| fixed | 30/30 | 30/30 | 30/30 (Wilson 0.886-1.000 each) |
