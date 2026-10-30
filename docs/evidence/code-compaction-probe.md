> Saved from `wiki/claudetto/evidence/Code-Compaction-Probe.md` at `HEAD`. The wiki is gone.

# Code Compaction Probe

This page holds the results of the probe of change `code-compaction`.
The probe compares 3 arms on `claude-sonnet-5-5`: B is the built-in `/compact`, C is code compaction, and H is the handover.
Each arm runs 3 forks at 2 sizes, so a round has 18 forks, and round 4 ran 5 forks of each arm (`--runs 5`), so 30 forks.
Round 7 ran every step on `claude-haiku-5-5` instead, and round 9 ran the compaction step alone on `claude-haiku-5-5` with the follow-ups on `claude-sonnet-5-5`.
The tool is `claudekit/probe/main.ts`, and the bars were in `dev/probe/bar.ts`, a module of the archived three-arm harness that is not in the tree today.
Round 1 and round 2 ran on 2026-10-26 on Claude Code `2.1.310`, rounds 3 to 7 ran on 2026-10-27 on Claude Code `2.1.311`, round 8 ran later on 2026-10-27 on Claude Code `2.1.312`, which the machine installed 21 seconds into that round, and round 9 ran on 2026-10-28 on `2.1.312` throughout.
Each version here is read from the `version` field of the rows of the round's own transcripts, not from the clock of the session that ran it.

## The Bars

The bars are defined here, so that a page of `docs/` and the requirement "Decision Rule" of `specs/compaction-path/spec.md` name the same list, and no spec line points into `claudekit/`.
Each bar compares the mean of the arm against the mean of B at the same size, over the valid forks of that size.
The arm wins only when every bar passes at every size.

| Bar | Measure | Passes when | Why |
| --- | --- | --- | --- |
| Constraints broken | `broken`, the planted constraints the files break, 0 to 3 | the arm breaks no more than B | a cheaper summary that loses a constraint is not cheaper |
| Files re-read | `rereads`, the `Read` calls of files already read | the arm reads no more again than B | a lost fact comes back as a read, which is the cost the summary saved |
| Work redone | `redone`, the `Edit` and `Write` calls on files the earlier tasks changed | the arm redoes no more than B | the same, in writes |
| Next task done | `next`, 1 when the next task is done after the follow-ups | the arm does it at least as often as B | the work must still finish |
| Cost | `cost`, the compaction step and the 2 follow-ups in the units of `total_cost_usd` | the arm costs strictly less than B | the whole reason to switch |
| First cache write | `firstWrite` over `firstPost`, the `cache_creation_input_tokens` of the first request after the compaction per token of context the compaction left | the arm writes no more per token kept than B | a new prefix is paid for once, and a larger one is a hidden cost |
| Read share, follow-up 1 and 2 | `shares[0]` and `shares[1]`, the cache read share of each follow-up turn, over the forks that saved one | the arm reads a share at least as high as B | a lower share means the follow-ups pay full input price |

The cache-write bar is read per token kept and not in absolute tokens, because the threshold sets how much context the compaction leaves and the write scales with it almost exactly.
In the round of `docs/evidence/compaction/threshold.md`, "The Round Where Every Fork Compacted", all six forks wrote between 1.740 and 1.856 tokens of cache per token kept while the two arms were left 5,980 and 11,438 tokens, so the absolute figures differ by 98.3% and the rate by 3.6%.
Only the rate is a property of the threshold; the absolute difference is the two summaries differing in length.

A bar that tests nothing is a gap, not a pass. These stop a verdict before the bars are read:

- Fewer valid forks of B or C at a size than the smoke floor of 3.
- A constraint that no check could test (`untested` above 0 for any arm).
- A fork marked invalid, with its cause.
- `next` at 0 for both B and C at a size. The bar is "at least as often as B", so 0 against 0 would pass while neither arm finished the task. Round 7 on `claude-haiku-5-5` is the case: `next` was 0 for all 18 forks. Added on 2026-10-27 with the test "Next Task Untested" of `tests/tools/probe/bar.test.ts`, which failed first.
- An arm that holds a fork which did not compact, named with the highest context that fork reached. Such a fork tests no threshold and has no post-compaction cache figures at all, so read as zeros it turns into cache problems scored against the other arm.
- Both arms' mean first compaction within 5% of the lower one. One turn then carried the context past both thresholds before the next check, so each bar reads the fixture and not the threshold.
- Every fork of both arms skipping every note task. A tick is no evidence that the work was done, so such a round measures the ticking.
- An arm that saved a read share for a follow-up in fewer forks than the smoke floor of 3. The share bars are means over the forks that saved one, and an arm below the floor on that bar is held to it rather than compared. Added on 2026-10-30 with the test "a fork that compacted but saved no follow-up share is a gap, not a cache problem" of `claudekit/probe/round/__tests__/verdict.spec.ts`, which failed first.

The round also stops at a total cost cap, 25 in the units of `total_cost_usd`, which is a guard and not a bar.

## Round 1

All 18 forks were valid.
The verdict of `bar.ts` was "No winner", with these misses of C:

- 80k: C costs no less, and C writes more cache after the compaction.
- 200k: C reads more files again, C costs no less, and C writes more cache after the compaction.

The base sessions had a context of 186,805 tokens (size `80k`) and 221,898 tokens (size `200k`).

Each value below is the mean of 3 forks.
Cost is in the units of `total_cost_usd`, and it counts the compaction step and 2 follow-up turns.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Share 1 | Share 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.168 | 0.059 | 25,162 | 4,438 | 7,699 | 0.33 | 0.893 | 0.960 |
| C | 80k | 0.523 | 0 | 73 | 18,622 | 60,282 | 0 | 0.933 | 0.993 |
| H | 80k | 0.151 | 0.110 | 22,785 | 13,562 | 6,816 | 3 | 0.973 | Not measured |
| B | 200k | 0.171 | 0.061 | 28,341 | 4,413 | 7,744 | 0 | 0.894 | 0.965 |
| C | 200k | 0.172 | 0 | 75 | 18,162 | 13,380 | 1 | 0.943 | 0.985 |
| H | 200k | 0.156 | 0.120 | 22,764 | 13,833 | 6,136 | 3 | 0.975 | Not measured |

No arm broke a planted constraint, redid a finished task, or did the next task within the 2 follow-ups.

## Why C Missed

C met each quality bar except the rereads at 200k (1 in each fork, against 0 for B).
Its cost and cache misses come from its first fork at each size, which paid a large cache write that the other 2 forks read:

| Size | Run | Cost | First cache write |
| --- | --- | --- | --- |
| 80k | 1 | 1.012 | 180,847 |
| 80k | 2 | 0.273 | 0 |
| 80k | 3 | 0.282 | 0 |
| 200k | 1 | 0.297 | 40,141 |
| 200k | 2 | 0.112 | 0 |
| 200k | 3 | 0.107 | 0 |

The transcripts of the forks show the cause.
At 80k, the first request after the code compaction had 188,650 input tokens, although the boundary row gives `postTokens` 18,622.
At 200k, it had 47,836 input tokens against `postTokens` 18,162.

- The `compact_boundary` row of C has no `compactMetadata.preservedMessages` and no `preservedSegment`. The row of B has both.
- C keeps the newest messages after the handoff message. 22 of the 34 kept `tool_result` rows of the 80k fork have a `parentUuid` before the boundary.
- Claude Code gives a `user` row that has `sourceToolAssistantUUID` that UUID as its `parentUuid` (`chunk-31gxg38t.js`, Claude Code `2.1.310`). The kept rows keep the value of the original rows, which the harness maps back through the `handle` of each message that the hook returns.
- So a `--resume` follows the chain from the newest row back into the history before the boundary. At 200k the walk stops at an earlier automatic compaction of the base session, so the leak is smaller.

The follow-up turns of the probe run with `--resume`, so each C fork carried most of the old history.
The measured cost of C is the cost of this leak, not of code compaction itself.

## Fix after Round 1

The fix is in `plugins/claudetto/modules/session/handoff/compact.ts`: `compactionOf` returns each kept message that has tool results without `handle`, so Claude Code writes it as a new row linked after the boundary.
The other kept messages keep `handle`, so they come back whole, with their thinking blocks.
A kept tool result loses its images and other content that is not text, because the hook gets no such content to check.
The test "Kept Tool Pairs Link After the Boundary" in `tests/claudetto/session/handoff/stub-compact.test.ts` runs `/compact` and a `--resume` turn against the stub of the Messages API.
It checks that the chain of each kept row reaches the boundary, and that the thinking blocks reach the request.
Before the fix, the request after `--resume` had 512,128 characters, and after it 16,932.

## Round 2

Round 2 ran on 2026-10-26 on Claude Code `2.1.310`, with the fix above.
All 18 forks were valid, and they cost 3.830 in the units of `total_cost_usd`.
The verdict of `bar.ts` was "No winner", with these misses of C:

- 80k: C reads more files again, C costs no less, and C writes more cache after the compaction.
- 200k: C reads more files again, C costs no less, and C reads a lower share of cache in follow-up 2.

The base sessions had a context of 186,190 tokens (size `80k`) and 19,167 tokens (size `200k`).
The base of size `200k` was compacted while the probe built it, so C fell back to the built-in compaction there (compaction cost 0.036, 18,146 ms), and the row of size `200k` does not measure code compaction.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Share 1 | Share 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.170 | 0.059 | 24,807 | 4,349 | 7,600 | 0.67 | 0.886 | 0.968 |
| C | 80k | 0.485 | 0 | 59 | 17,277 | 59,488 | 1 | 0.944 | 0.994 |
| H | 80k | 0.145 | 0.101 | 39,765 | 13,502 | 5,805 | 3.67 | 0.976 | Not measured |
| B | 200k | 0.144 | 0.037 | 21,816 | 4,380 | 7,745 | 0 | 0.835 | 0.964 |
| C | 200k | 0.151 | 0.036 | 18,146 | 4,348 | 7,652 | 0.33 | 0.844 | 0.959 |
| H | 200k | 0.181 | 0.118 | 18,199 | 13,783 | 6,086 | 9 | 0.981 | Not measured |

No arm broke a planted constraint, redid a finished task, or did the next task within the 2 follow-ups.
At 80k the first fork of C still paid a cache write of 178,464 tokens (cost 0.939), and the other 2 forks read it (cost 0.255 and 0.259).
So the first request after the code compaction still carries most of the history before the boundary, through a path that the stub test does not cover.

## Fix after Round 2

The chain of the first fork of C at 80k reaches the boundary with no link before it, so the leak takes another path.
After the walk of the chain, the loader of Claude Code `2.1.310` adds back the parallel tool calls of each assistant row: each row of the file with the same `message.id`, and its tool results, also from before the boundary.
The tail of C began inside a group of parallel calls, and its first rows kept `handle`, so they kept the `message.id` of the group, and the first request held 11 tool results of about 26,000 bytes each from before the boundary.

The fix drops `handle` also from the run of tool messages at the start of the tail, when the message before the cut is not a plain user prompt.
These rows lose their thinking blocks.
The test "Parallel Calls Split By The Boundary Do Not Pull Back Their Siblings" in `tests/claudetto/session/handoff/stub-compact.test.ts` fails before the fix and passes after it.
The probe now builds each base with `DISABLE_AUTO_COMPACT=1`, and it stops before any fork when a base is below its size.

## Round 3

Round 3 ran on 2026-10-27 on Claude Code `2.1.311`, with both fixes above.
All 18 forks were valid, and they cost 2.962 in the units of `total_cost_usd`.
The verdict of `bar.ts` was "No winner", with these misses of C:

- 80k: C reads more files again, C costs no less, and C writes more cache after the compaction.
- 200k: C reads more files again, and C reads a lower share of cache in follow-up 2.

The base sessions had a context of 182,216 tokens (size `80k`) and 436,223 tokens (size `200k`), so both bases were valid.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Share 1 | Share 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.155 | 0.053 | 21,880 | 4,194 | 7,351 | 0.33 | 0.867 | 0.962 |
| C | 80k | 0.193 | 0 | 57 | 15,415 | 7,752 | 0.67 | 0.967 | 0.982 |
| H | 80k | 0.151 | 0.108 | 20,540 | 13,429 | 5,685 | 3 | 0.977 | Not measured |
| B | 200k | 0.174 | 0.081 | 29,711 | 4,388 | 7,646 | 0.33 | 0.848 | 0.959 |
| C | 200k | 0.152 | 0 | 57 | 16,956 | 7,357 | 0.67 | 0.900 | 0.957 |
| H | 200k | 0.163 | 0.106 | 11,624 | 13,830 | 6,086 | 4 | 0.979 | Not measured |

No arm broke a planted constraint, redid a finished task, or did the next task within the 2 follow-ups.

The history before the boundary no longer leaks.
At 80k the first fork of C wrote 23,255 tokens of cache, against 178,464 in round 2, and the mean cost of C fell from 0.485 to 0.193.
The other 2 forks read that cache (cost 0.171 and 0.161), so their first cache write was 0.
At 200k C costs less than B (0.152 against 0.174).

The misses that remain are small:

- Rereads: 2 rereads in 3 forks for C at each size, against 1 for B.
- Cost at 80k: C keeps the newest messages as they are, so its context after the compaction is 15,415 tokens, against 4,194 for the summary of B, and each follow-up turn pays for the larger context.
- Cache: the first cache write of C at 80k is 401 tokens more than that of B, and the share of follow-up 2 at 200k is 0.002 lower.

With 3 forks for each arm, a gap of 1 reread or of 0.002 in a share is within the spread between forks.

## Round 4

Round 4 ran on 2026-10-27 on Claude Code `2.1.311`, with the code of round 3 and 5 forks of each arm, to test whether the misses of round 3 were spread between forks.
All 30 forks were valid, and they cost 5.065 in the units of `total_cost_usd`.
The verdict of `bar.ts` was "No winner", with these misses of C:

- 80k: C reads more files again, and C costs no less.
- 200k: C reads more files again.

C met each cache bar at both sizes.
The base sessions had a context of 183,732 tokens (size `80k`) and 433,193 tokens (size `200k`).
Each value below is the mean of 5 forks.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Share 1 | Share 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.173 | 0.055 | 25,747 | 4,129 | 7,539 | 0.60 | 0.891 | 0.969 |
| C | 80k | 0.196 | 0 | 50 | 15,779 | 7,385 | 1 | 0.974 | 0.989 |
| H | 80k | 0.134 | 0.096 | 26,354 | 13,570 | 5,826 | 1.80 | 0.978 | Not measured |
| B | 200k | 0.185 | 0.080 | 26,044 | 4,273 | 7,497 | 0.20 | 0.880 | 0.962 |
| C | 200k | 0.159 | 0 | 88 | 15,615 | 7,220 | 1 | 0.921 | 0.968 |
| H | 200k | 0.167 | 0.116 | 19,972 | 13,860 | 6,116 | 2.80 | 0.976 | Not measured |

No arm broke a planted constraint, redid a finished task, or did the next task within the 2 follow-ups.

The rereads of C are not spread between forks: each of the 10 forks of C read 1 file again, and that file was `demo/tasks.md` each time.
Each fork of C reads `demo/tasks.md` before its first edit of it.
2 of the 5 forks of B at 80k edited `demo/tasks.md` with no read.
In one of those forks, the built-in compaction attached 5 files of the base (`src/shout.ts`, `src/farewell.ts`, `src/greet.ts`, `package.json`, and `src/legacy.ts`), and code compaction attaches no file.

The cost miss at 80k comes from the first fork of C, which wrote 36,926 tokens of cache (cost 0.301), and the other 4 forks read that cache (cost 0.186, 0.139, 0.186, and 0.168).
At 200k C costs less than B (0.159 against 0.185).

## Fix after Round 4

The handoff of C named the open tasks by number only, such as `1.5`, while the summary of B quoted the line of each task.
So each fork of C read `demo/tasks.md` to learn what task `1.5` asks.
A read is not needed for the edit: in a stub run on Claude Code `2.1.311`, an `Edit` of a file with no `Read` after code compaction and `--resume` succeeded.

- The handoff now gives each open task with its text, cut to `TASK_CHARS_MAX` characters. The test "an open task keeps its text" in `tests/claudetto/session/handoff/format.test.ts` fails before the fix and passes after it.
- `TAIL_TOKENS` is now 5,000, down from 20,000, so the context after code compaction comes near the context after the summary of B.
  When the last message alone is over 5,000 tokens, code compaction falls back to the built-in compaction.
- The measure of the next task was 0 for each arm in rounds 1 to 4, so its bar tested nothing. The gate of claudetto ticks a box only after a passed check, and the fixture had no check that could pass. Each task of the fixture now names `bun test`, and the fixture has a test that passes. The test "Tickable Tasks" in `tests/tools/probe/measure.test.ts` fails before the fix and passes after it.

## Round 5

Round 5 ran on 2026-10-27 on Claude Code `2.1.311`, with the fixes after round 4 and 5 forks of each arm.
All 30 forks were valid, and they cost 4.016 in the units of `total_cost_usd`.
The verdict of `bar.ts` was "No winner", with one miss of C:

- 200k: C reads more files again.

C met each bar at `80k`, and each bar but the rereads at `200k`.
The base sessions had a context of 182,353 tokens (size `80k`) and 436,830 tokens (size `200k`).
Each value below is the mean of 5 forks.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Share 1 | Share 2 | Next task |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.157 | 0.053 | 20,748 | 4,273 | 7,633 | 0 | 0.908 | 0.970 | 1 |
| C | 80k | 0.090 | 0 | 51 | 2,529 | 2,082 | 0 | 0.956 | 0.978 | 1 |
| H | 80k | 0.098 | 0.071 | 29,969 | 13,984 | 6,240 | 1 | 0.963 | Not measured | 1 |
| B | 200k | 0.187 | 0.082 | 26,971 | 4,442 | 7,921 | 0 | 0.912 | 0.963 | 1 |
| C | 200k | 0.149 | 0 | 60 | 4,139 | 7,697 | 0.80 | 0.922 | 0.974 | 1 |
| H | 200k | 0.123 | 0.092 | 37,539 | 14,412 | 6,668 | 2.60 | 0.971 | Not measured | 1 |

No arm broke a planted constraint or redid a finished task, and each fork did the next task.
At `80k` C cost 0.090 against 0.157 for B.
At `200k` 4 of the 5 forks of C read `demo/tasks.md` again.
The handoff of those forks shows two faults that rounds 1 to 4 could not show, because no box was ticked before round 5:

- The line of task `1.5` was cut at `TASK_CHARS_MAX` (160 characters), so its end and its check were missing.
- The done list marked each done task "(box checked, no passed check)", so it said that each done task had no passed check.

## Fix after Round 5

- The mark "(box checked, no passed check)" is on an open task only.
- `TASK_CHARS_MAX` is now 400, the same as `CONSTRAINT_CHARS_MAX`, so the line of a task keeps its check.

## Round 6

Round 6 ran on 2026-10-27 on Claude Code `2.1.311`, with the fixes after round 5 and 5 forks of each arm.
All 30 forks were valid, and they cost 4.089 in the units of `total_cost_usd`.
The verdict of `bar.ts` was "No winner", with these misses of C:

- 80k: C reads more files again.
- 200k: C reads more files again, and C reads a lower share of cache in follow-up 1.

The base sessions had a context of 184,043 tokens (size `80k`) and 435,584 tokens (size `200k`).
Each value below is the mean of 5 forks.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Share 1 | Share 2 | Next task |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.156 | 0.054 | 24,139 | 4,547 | 8,076 | 0.60 | 0.919 | 0.973 | 1 |
| C | 80k | 0.090 | 0 | 53 | 2,975 | 2,407 | 0.80 | 0.962 | 0.977 | 1 |
| H | 80k | 0.123 | 0.091 | 47,130 | 14,648 | 6,744 | 3.40 | 0.974 | Not measured | 1 |
| B | 200k | 0.189 | 0.081 | 26,832 | 4,575 | 8,115 | 0.20 | 0.921 | 0.972 | 1 |
| C | 200k | 0.143 | 0 | 66 | 3,337 | 7,555 | 1 | 0.916 | 0.974 | 1 |
| H | 200k | 0.117 | 0.084 | 25,565 | 14,885 | 6,981 | 3.60 | 0.974 | Not measured | 1 |

No arm broke a planted constraint or redid a finished task, and each fork did the next task.
C costs less than B at both sizes: 0.090 against 0.156 at `80k`, and 0.143 against 0.189 at `200k`.

The misses are small:

- Rereads: at `80k`, 4 of the 5 forks of C read 1 file again, against 3 of the 5 forks of B. At `200k`, each fork of C read 1 file again, against 1 fork of B. This page does not name the file, because the result rows hold counts only.
- Cache: the share of follow-up 1 at `200k` is 0.916 for C against 0.921 for B, a gap of 0.005. The share of C per fork was 0.940, 0.907, 0.913, 0.910, and 0.910, and that of B was 0.935, 0.907, 0.915, 0.912, and 0.935.

Two facts limit this round:

- The checks of English words of `ground` and `finish` were still in the framework, because the change `drop-word-checks` waited for the round to end.
- During the round, a subagent ran `git stash` and `git stash pop` on the work tree, so for a short time `plugins/claudetto` held the code of `HEAD`. A fork that started in that window may have loaded the older plugin.

The `compaction` value `code` stays experimental, and `auto` does not pick it.

## Round 7, the Cheap-Model Shakedown

Round 7 ran on 2026-10-27 on Claude Code `2.1.311`, on `claude-haiku-5-5` instead of `claude-sonnet-5-5`, with 3 forks of each arm.
It is the shakedown the user approved, which asked whether a cheap model can carry the probe.
The command was `bun claudekit/probe/main.ts --run --runs 3 --model claude-haiku-5-5 --dir /tmp/claudetto-probe-haiku`.
`--model` sets the same model on every arm and on both base sessions, so no arm gets a cheaper summarizer than the others.
No `--effort` flag exists in `claudekit/probe/plan/plan.ts`, so each call used the default effort of the CLI for that model, and this page does not read what that default is.

All 18 forks were valid.
The base sessions had a context of 188,115 tokens (size `80k`) and 436,909 tokens (size `200k`), so both bases were valid.
The verdict of `bar.ts` was "No winner", with four reasons, and all four are gaps rather than misses:

- `80k`: C left 1 constraint check untested, and H left 1.
- `200k`: C left 2 constraint checks untested, and H left 2.

A gap stops the verdict before the quality and cost bars are read (`gapsAt` in `dev/probe/bar.ts`, a module of the archived harness), so this round reports no bar result at all.

Each value below is the mean of 3 forks, from `results.jsonl` of the run. The `Untested` column is a mean too, so `0.33` is one fork of the three and `0.67` is two, which is where the gap counts above come from.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Untested | Next task |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.0359 | 0.0232 | 25,030 | 5,166 | 8,888 | 1.67 | 0 | 0 |
| C | 80k | 0.0105 | 0 | 101 | 6,061 | 8,899 | 0.67 | 0.33 | 0 |
| H | 80k | 0.0088 | 0.0060 | 25,860 | 13,232 | 5,764 | 3.67 | 0.33 | 0 |
| B | 200k | 0.0488 | 0.0363 | 26,905 | 5,093 | 8,904 | 2.00 | 0 | 0 |
| C | 200k | 0.0095 | 0 | 79 | 4,988 | 8,026 | 1.67 | 0.67 | 0 |
| H | 200k | 0.0085 | 0.0056 | 27,907 | 14,181 | 6,713 | 3.00 | 0.67 | 0 |

### The Cheap Model Did Not Do the Work

The `next` column is 0 for all 18 forks, against 1 for all 30 forks of round 6.
The measure is literal: `measure.ts` sets it from `[x] 1.4` in the fixture's `tasks.md`, and no fork of this round ticked that box.
The gate of claudetto ticks a box only after a passed check, so a 0 means that the fork did not finish task 1.4 with a passing `bun test`.
Six of the 18 forks also left a planted constraint untested, which happens when the file the check needs does not exist, against 0 of the 30 forks of round 6.

The work tree of the last fork of the round, H at `80k`, is the one tree the run left on disk.
In it task `1.5` is ticked and task `1.4` is not, `src/server.ts` and `test/server.test.ts` are new, and `src/banner.ts` of task 1.4 is absent.
So that fork skipped the task its handoff named and did the one after it.
This is one fork's end state and not a mean, because a fork resets the tree.

The consequence for the decision is that the arms cannot be compared on this model.
Each quality bar of `bar.ts` compares C against B, and with `next` at 0 for both the bar reads 0 against 0 and tests nothing.
The round measures the harness, not the arms.

### What the Round Does Settle

- **The compaction step of C is free on any model.** Its compaction cost is 0 and it takes 79 to 101 ms, where B pays a model call of 25 to 27 seconds and H of 26 to 28 seconds. Round 6 measured the same shape on `claude-sonnet-5-5` (0 and 53 to 66 ms against 24 to 27 seconds).
- **A cheaper model makes the built-in summary a larger share of the bill, not a smaller one.** B's compaction call is 65% of B's fork cost at `80k` (0.0232 of 0.0359) and 74% at `200k` (0.0363 of 0.0488). On Sonnet in round 6 the same call was 35% and 43%. The summary is an output-heavy turn and the follow-ups are cache-read-heavy, so dropping to a cheap model shrinks the follow-ups by more than the summary.
- **H carries the largest context forward on this model too.** H leaves 13,232 tokens at `80k` and 14,181 at `200k`, two to three times B and C, which matches round 6 and goes with H's rereads of 3.00 to 3.67, the highest of the three arms in both rounds. C leaves the smallest context at `200k` (4,988 against 5,093 for B), and at `80k` it leaves the largest of B and C (6,061 against 5,166). That ordering at `80k` is the reverse of round 6, where C left 2,975 against 4,547 for B, and this round gives no cause for the reversal.

### Cost of Round 7

| Part | Cost in the units of `total_cost_usd` |
| --- | --- |
| 18 forks, summed from `results.jsonl` | 0.3657 |
| base session, `80k` | 0.3921 |
| base session, `200k` | 0.8552 |
| whole round | 1.6130 |

The two base figures are the final `totalCostUSD` of the `cost-state` row of each base transcript, under `~/.claude/projects/-private-tmp-claudetto-probe-haiku-*`.
They are not in `results.jsonl`, because a fork's `cost` is a difference against its base and the base total is never written out.
Round 6 on Sonnet cost 4.089 for its 30 forks alone, so the per-fork cost on Haiku 5.5 is about one seventh of the Sonnet cost.
Against the rate measured in `docs/window-weights.md`, about `$29.70` of API-equivalent cost per weekly percent on this plan, the whole round is about 0.05 of one weekly percent.

### Recommendation Carried Forward

The full pass at `--runs 10` on `claude-haiku-5-5` is not worth paying for.
It would cost about `$2.47`, from this round's own figures: 60 forks at the mean of 0.0203 per fork is 1.22, and the two base sessions cost 0.3921 and 0.8552 again, which is small, but it would buy no arm comparison, because the `next` bar and the constraint checks are already dead on this model at 3 forks and more forks of the same failure add nothing.
Either the full pass runs on `claude-sonnet-5-5`, where round 6 showed every bar alive, or the fixture is made easy enough that Haiku 5.5 finishes task 1.4, and then the result speaks about an easier fixture.
A third reading is that this round is itself the answer to the cheap-model question that the shakedown asked: a cheap model cannot run the arms of this probe.

## Round 8, the Full Pass on Sonnet

Round 8 ran on 2026-10-27 on Claude Code `2.1.312`, on `claude-sonnet-5-5`, with 10 forks of each arm.
The version is corrected from `2.1.311`, which this page carried until 2026-10-28, and the correction is read from the transcripts of the round, where each row carries the version that wrote it.
Claude Code installed `2.1.312` at 20:30:21Z, which is 21 seconds after the first base prompt of the round started.
In each of the 21 transcripts of the `80k` folder that hold two versions, the `2.1.311` rows end at 20:31:01.891Z and the `2.1.312` rows begin at 20:31:05.159Z, and every transcript of the `200k` folder is `2.1.312` alone.
So the first of the three base prompts of the `80k` base ran on `2.1.311` and everything after it, the rest of that base build and all 60 forks, ran on `2.1.312`.
The three arms share one base per size, so the split sits under all three equally and cannot move one arm against another.
The folders are `~/.claude/projects/-private-tmp-claudetto-probe-round8-80k-xkSBNi` and `-private-tmp-claudetto-probe-round8-200k-b2zNCb`.
Round 7 was checked the same way and is `2.1.311` in all 20 of its transcripts, so the line above it stands.
The command was `bun claudekit/probe/main.ts --run --runs 10 --model claude-sonnet-5-5 --dir /tmp/claudetto-probe-round8`.
It is the full pass that the user's approval covers, and 10 runs per arm meets the citable floor of `CITABLE_MIN_RUNS`, which the run printed before it started.

All 60 forks were valid.
The base sessions had a context of 181,033 tokens (size `80k`) and 431,144 tokens (size `200k`), so both bases were above their target.
The 60 forks cost 9.1698 in the units of `total_cost_usd`, which is about 0.31 of a weekly percent at the 29.70 per percent of `docs/window-weights.md`.
The cost of the two base sessions is not in the output of the round: `runBase` prints the base context and not the base cost, so the whole-round cost of this pass is not known.

The verdict of `bar.ts` was "No winner", with these reasons:

- `80k`: C reads more files again.
- `80k`: cache problem, C writes more cache after the compaction.
- `80k`: cache problem, C reads a lower share in follow-up 1.
- `80k`: cache problem, C reads a lower share in follow-up 2.
- `200k`: H left 1 constraint check untested.

The round started before the 0-against-0 `next` gap was added to `bar.ts`, so the process printed a verdict from the module as it was.
The verdict was recomputed from `results.jsonl` with the current module, and it is the same text, because the gap does not fire here: `next` is 1 for every fork of B and C at `80k`, and 0.7 for B against 1 for C at `200k`.

Each value below is the mean of 10 forks, from `results.jsonl` of the run.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Share 1 | Share 2 | Untested | Next task |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.1700 | 0.0556 | 23,271 | 4,393 | 7,821 | 0.0 | 0.929 | 0.972 | 0 | 1.0 |
| C | 80k | 0.1388 | 0 | 74 | 2,521 | 9,235 | 1.4 | 0.868 | 0.954 | 0 | 1.0 |
| H | 80k | 0.1245 | 0.0812 | 41,275 | 13,450 | 5,982 | 2.5 | 0.960 | Not measured | 0 | 1.0 |
| B | 200k | 0.1830 | 0.0815 | 30,336 | 4,456 | 8,649 | 0.3 | 0.902 | 0.971 | 0 | 0.7 |
| C | 200k | 0.1682 | 0 | 94 | 3,298 | 8,095 | 1.9 | 0.911 | 0.968 | 0 | 1.0 |
| H | 200k | 0.1325 | 0.0820 | 37,696 | 14,290 | 6,822 | 2.5 | 0.945 | Not measured | 0.1 | 1.0 |

### Cost: H Is Cheapest, and No Arm Wins

H costs 26.8% less than B at `80k` (0.1245 against 0.1700) and 27.6% less at `200k` (0.1325 against 0.1830).
C costs 18.4% less than B at `80k` (0.1388) and 8.1% less at `200k` (0.1682).
Neither arm wins, because the rule takes the cheapest arm that also meets each quality bar, and both C and H read more files again than B: C 1.4 and 2.5 for H at `80k` against 0.0 for B, and C 1.9 and H 2.5 at `200k` against 0.3 for B.
The rereads are not one odd fork. At `80k` every fork of C read 1 or 2 files again while every fork of B read none, and at `200k` C read 1 to 3 again against 0 or 1 for B.

### The Bars at 200k Were Never Read

`gapsAt` of `dev/probe/bar.ts` (a module of the archived harness) returns the gaps of a size in place of the bar misses, so the one untested constraint of H at `200k` stopped the bars of that size before they ran.
Read by hand from the table, C at `200k` would miss two bars and meet the rest: it reads more files again (1.9 against 0.3) and reads a lower share in follow-up 2 (0.968 against 0.971), while it breaks no constraint, redoes no work, does the next task more often (1.0 against 0.7), costs less, writes less cache (8,095 against 8,649), and reads a higher share in follow-up 1 (0.911 against 0.902).
The cache write of B at `200k` rests on one fork of 16,301 against 7,225 to 8,315 for the other nine, so without that fork B writes 7,801 and C would miss that bar too.

### Why the Cache Write of C and H Is the Same Number in Every Fork

C writes 9,235 in all 10 forks at `80k`, and H writes 5,982 at `80k` and 6,822 at `200k` in all 10 forks of each size.
Code builds the head of C and the handoff of H with no model call, so the prefix of the first request after it is the same text in every fork, and the cache write is the same count.
B varies from 7,607 to 8,102 at `80k`, because a model wrote each of its summaries.

### Two Limits of the Measurement

- Arms C and H carry 394 bytes more always-loaded prompt than B. `compactionState` of `archive/plugins/claudetto/modules/session/prompt/domain/compaction.ts:20` gives the `handoff` text for the options `code` and `handover` and the `built-in` text for `built-in`, and the trimmed texts measure 531 and 137 bytes. Every request of C and H pays that difference, so the cost gap in favour of C and H is understated here, not overstated.
- The cache read share of the second follow-up of H is not measured in any of the 20 H forks, as in round 6, so no round has compared the second turn of H against B.

### What the Round Settles

The decision rule of `specs/compaction-path/spec.md` changes the default path only when an arm meets each bar.
Round 8 reports no winner at the citable floor, so the default stays with the built-in compaction, the `compaction` value `code` stays experimental, and `auto` does not pick it.
The open question that round 8 does not answer is whether a cheaper model can write the head or the handoff that a capable model then acts on, which is the question of round 9.

## Round 9, the Pair Round

Round 9 ran on 2026-10-28 on Claude Code `2.1.312`, with 10 forks of each arm, and it is the paid half of that question.
The command was `bun claudekit/probe/main.ts --run --runs 10 --model claude-sonnet-5-5 --compact-model claude-haiku-5-5 --dir /tmp/claudetto-probe-round9`.
`--compact-model` sets the model of the compaction step alone, so the question is whether a `claude-haiku-5-5` summary serves a `claude-sonnet-5-5` follow-up.
All 15,727 rows of the two base project folders carry `"version":"2.1.312"`, so no version split sits under this round, unlike round 8.
The folders are `~/.claude/projects/-private-tmp-claudetto-probe-round9-80k-pEI2Rj` and `-private-tmp-claudetto-probe-round9-200k-9V6rXk`.
The run printed "10 runs per arm meets the citable floor (10), so a page of `docs/` may cite it."

All 60 forks were valid.
The base sessions had a context of 182,797 tokens (size `80k`) and 432,571 tokens (size `200k`), and `runBase` now prints the base cost too: 1.0470 and 2.5641.
The 60 forks cost 9.3856, so the whole round cost 12.9967 in the units of `total_cost_usd`, which is about 0.44 of a weekly percent at the 29.70 per percent of `docs/window-weights.md`.
This is the first round that reports a whole-round cost, which is the gap round 8 left.

The verdict of `bar.ts` was "No winner", with these reasons:

- `80k`: C reads more files again, C costs no less, C writes more cache after the compaction, and C reads a lower share in follow-up 1 and in follow-up 2.
- `200k`: C reads more files again, C costs no less, and C reads a lower share in follow-up 1 and in follow-up 2.

No gap fired at either size, so every bar was read at both sizes, which round 7 and round 8 could not do.

Each value below is the mean of 10 forks, from `results.jsonl` of the run.

| Arm | Size | Cost | Compaction cost | Compaction ms | Context after | First cache write | Rereads | Share 1 | Share 2 | Untested | Next task |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | 80k | 0.1469 | 0.0326 | 24,411 | 4,680 | 8,243 | 0.8 | 0.926 | 0.976 | 0 | 1.0 |
| C | 80k | 0.1758 | 0 | 72 | 3,203 | 11,083 | 2.1 | 0.904 | 0.965 | 0 | 1.0 |
| H | 80k | 0.1220 | 0.0802 | 32,236 | 13,475 | 6,007 | 3.4 | 0.951 | Not measured | 0 | 1.0 |
| B | 200k | 0.1752 | 0.0571 | 20,404 | 4,543 | 8,045 | 0.6 | 0.933 | 0.976 | 0 | 1.0 |
| C | 200k | 0.1771 | 0 | 86 | 3,424 | 8,002 | 2.2 | 0.922 | 0.965 | 0 | 1.0 |
| H | 200k | 0.1416 | 0.0867 | 32,086 | 14,290 | 6,822 | 2.9 | 0.954 | Not measured | 0 | 1.0 |

No arm broke a planted constraint, redid a finished task, or left a constraint untested, and each of the 60 forks did the next task.

### The Flag Moved Arm B Alone, as Its Usage Line Says

The `modelUsage` map of the last `cost-state` row of each transcript names the models of that session.
Exactly 10 of the 31 transcripts with a cost in each size folder hold a `claude-haiku-5-5` entry, and the Haiku cost of those 10 sums to 0.3263 at `80k` and 0.5713 at `200k`.
Divided by 10 that is 0.0326 and 0.0571, which are the `compactCost` means of B in the table above to four decimal places.
So the whole Haiku spend of the round is B's compaction call, and arms C and H made no model call for the step: C builds its head in code and H reads a handoff that code wrote.
The pair therefore asks its question of the built-in summary only, which is the limit recorded before the run.

### A Cheap Summarizer Makes the Built-in Path Cheaper, and It Still Does the Work

Against round 8, which is the same probe on the same version with the summary on `claude-sonnet-5-5`:

| Measure | Round 8, Sonnet summary | Round 9, Haiku summary |
| --- | --- | --- |
| B cost, 80k | 0.1700 | 0.1469 |
| B cost, 200k | 0.1830 | 0.1752 |
| B compaction cost, 80k | 0.0556 | 0.0326 |
| B compaction cost, 200k | 0.0815 | 0.0571 |
| B rereads, 80k | 0.0 | 0.8 |
| B rereads, 200k | 0.3 | 0.6 |
| B next task, 200k | 0.7 | 1.0 |

The compaction call costs 41.4% less at `80k` and 29.9% less at `200k`, and the whole B fork costs 13.6% less at `80k` and 4.3% less at `200k`.
The quality did not fall where this probe can see it: B broke no constraint and redid no work in either round, and at `200k` it did the next task in 10 of 10 forks against 7 of 10 in round 8.
B does read more files again than in round 8, 0.8 against 0.0 at `80k` and 0.6 against 0.3 at `200k`, which is the measure that would show a summary that lost a fact.
The per-fork spread is small: at `80k` 8 of the 10 B forks read exactly 1 file again and 2 read none.
So the direct answer to that question is yes for the built-in summary, with one caveat the probe states and does not resolve, that the rereads of B rose while its cost fell.

### Why This Round Does Not Say C Got Worse

C costs more than B in this round, 19.7% more at `80k` and 1.1% more at `200k`, where in round 8 it cost 18.4% and 8.1% less.
Two separate things moved, so the ordering flip has two possible causes and this page does not separate them.

- B became cheaper for the reason above.
- Arm C and arm H did not run the same code as in round 8. Four files of the handoff module were edited between the end of round 8 and the start of round 9: `plugins/claudetto/modules/session/handoff/adapters/mod.ts`, `adapters/project.ts`, and `handover.ts`, and then `redact.ts`. C's first cache write is 11,083 in all 10 forks at `80k`, against 9,235 in all 10 forks of round 8, and 8,002 against 8,095 at `200k`. Both rounds are deterministic per size, which fits a changed prefix text rather than a changed cache hit, but the two sizes moved in opposite directions, so the size of the text is not the whole cause and this page names none.

The within-round comparison is sound, because the three arms share one base per size and one build of the plugin.
The across-round comparison is sound for B, whose summary is Claude Code's own and does not come from the edited module, and it is not sound for C and H.

### What the Round Settles

The decision rule still gives no winner, so the default stays with the built-in compaction, the `compaction` value `code` stays experimental, and `auto` does not pick it.
Three results are new.

- **The cheapest path measured so far is the built-in compaction with a cheap summarizer, at 0.1469 and 0.1752.** H is cheaper still, at 0.1220 and 0.1416, which is 17.0% and 19.2% below B, but H reads 3.4 and 2.9 files again against 0.8 and 0.6 for B, so it fails the rereads bar at both sizes as in every round before.
- **A cheap summarizer costs no measured quality in the built-in path.** That is the question round 9 asked, and round 7 could not ask it, because on Haiku throughout no fork finished the next task. Here the follow-ups ran on Sonnet and all 60 forks did.
- **None of these savings is a live saving, and no document may cite them as one.** Arm B got its cheap summary from a separate `claude -p --model claude-haiku-5-5` process that the harness ran for the compaction step (`archive/dev/probe/plan.ts:40-84`, the `--compact-model` flag). A live session has no such step: it bills the summary on the model the session runs. The live counterpart is the `session.compact` handler of task 10.6, which is off in every row, and its price belongs in `docs/window-weights.md` from `$.session.usage()` deltas of a real session.
- **The compaction call is now 22% of a B fork at `80k` and 33% at `200k`**, against 35% and 43% on Sonnet in round 6. Round 7 measured the opposite shape, 65% and 74%, because there the follow-ups were cheap too. So moving the summary alone to a cheap model shrinks the one expensive turn and leaves the follow-ups where they were.
