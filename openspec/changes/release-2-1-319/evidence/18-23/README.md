# 18.23: no denial-and-retry turn for a compound read

## Cause (from 18-22/final.txt, n=30)
Base runs `bun test ...; cat src/lib.ts` in one Bash call. The gate denies the `cat` (user rule: Bash only where the other tools cannot handle it), so the plugin arm spent one denied call and one turn, then a Bash test call plus a Read: 4.07 turns, 5.00 calls, 1.00 denial per session.

## Change
`hooks/gate/read-split.ts` (registered in `hooks/gate.ts`): a `tool.call` hook on Bash. When the line ends in `; cat <file>` (also `&&` or a newline), it reads the file with `$.tool.call({ tool: "Read" })` (through the same hooks and permission check as a model's Read), runs the rest of the line alone, and returns the Read text as `context` after the result. The model gets the test output and the file in its first turn, and the read went through the Read tool, not the shell. Any other shell read is still denied as before. If the Read fails, the whole line goes on to the gate unchanged.

## Prediction (written before any paid session)
Hypothesis: the denial disappears, so plugin turns equal base's (about 3.07) and job-op calls equal base's (Bash counted once per `;`/`&&` part, so `test; cat` = 2). Raw calls: plugin = base (the model's Bash call is one raw call; the hook's Read does not show as a model call).
Prediction: turns <= 1.1x base, job-op calls <= 1.1x base, denials 0.00 per session, fixes 30/30 in both arms, output about 372 to 400 (<= 1.25x base = 465), since the denial turn (about 160 tokens) is gone and the Read text enters as input, not output.
Reason to re-scope the calls metric: under the user's rule, `test; cat` is two jobs (run tests, read a file), so raw call counts reward a model for packing a read into Bash. Job-op calls count each part.
Setup: `PROBE_NAME=probe-18-23 PROBE_ROOT=/tmp/probe-18-23 PROBE_ARMS=base,change`, n=30 per arm, `claude-sonnet-5-5`, fresh run ids; pilot of 1 first (init `apiKeySource` must be `none`).

## Run 1 (text in `context`): prediction failed
Pilot (1 session): init `apiKeySource` `none`, real reply, fixed; the denial was gone. Run of 60 (`sessions-run1.jsonl`, `final-run1.txt`): denials 0.00, fixes 30/30 in both arms, but turns 3.97 against base 3.00, output 692.2 against 355.8 (1.95x), Stop blocks 0.43 per session against 0. Cause (hypothesis; run 2's 0.33 blocks show it was at most part of it): the Read text sat in the Bash result's `context`, which the user never sees; the reply then quoted the file (`x + 33 + 1`), and the Stop grader (`names something the user has not seen`) blocked it, one more turn and a longer reply each time. Base's `cat` output is in the result, so no block.
Fix: the Read text ends the Bash result's `stdout` (`withRead` in `read-split.ts`), as `cat` would print it. This is a change made after seeing run 1's numbers, so run 2 below is a new run of both arms with new sessions; run 1 is kept as evidence and is not the result.

## Run 2 prediction (written before run 2)
Same as above: turns about 3.0 (<= 1.1x), job-op calls equal to base's, denials 0, Stop blocks near 0, output <= 1.25x base, fixes 30/30.

## Run 2 result (60 sessions, `claude-sonnet-5-5`, subscription: every row passed the arm check, init `apiKeySource` `none`)
`sessions.jsonl`, `report.txt`, `final.txt` (`scripts/final.ts`), `blocks.txt` (`scripts/blocks.ts`). $2.61, largest session 103,018 tokens.

| | base | change | ratio |
| --- | --- | --- | --- |
| turns per session | 3.13 | 3.43 | 1.096 |
| raw tool calls per session | 3.13 | 3.07 | 0.98 |
| job-op calls per session (Bash counted per `;`/`&&`/newline part) | 4.47 | 4.20 | 0.94 |
| denials per session | 0.00 | 0.00 | |
| Stop blocks per session | 0.00 | 0.33 | |
| output tokens, mean (bootstrap 95%) | 378.3 (363.5-397.3) | 551.8 (460.7-646.6) | 1.46 |
| fixed (Wilson 95%) | 30/30 (0.886-1.000) | 30/30 (0.886-1.000) | Fisher p = 1 |

Turns and calls pass, fixes pass. Output misses 1.25x (1.46x). Remaining source, measured from `blocks.txt`: the Stop grader's `names something the user has not seen` block (`run-limits`, graded reply check). 10 of 30 plugin sessions got it: those average 918.9 output tokens and 4.30 turns; the 20 with none average 368.3 output and 3.00 turns, equal to base (378.3, 3.13). So the excess is 10/30 x (918.9 - 368.3) = 183.5 tokens per session, all of the 173.5 gap. Cause not verified (hypothesis, no run): the grader reads the first `RESULT_CHARS` of each tool result, and the file text now ends a long test output, past that cut; the replies it blocked quote the file's `+ 1`. In 18-22 the grader fired 0.03 per session; here 0.33. Not changed (run 1 and run 2 already cost a re-measure; a third run on the grader's view needs its own prediction).

Raw calls: base 3.13, plugin 3.07. The user's rule makes base's `test; cat` two jobs, so job-op counts are the honest metric: 4.47 against 4.20.
Run 1 (`context`) for the record: turns 3.97 vs 3.00, job-ops 5.23 vs 4.07, raw 3.37 vs 2.97, output 692.2 vs 355.8 (1.95x), Stop blocks 0.43, denials 0.
