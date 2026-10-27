# Code Compaction Probe

This page holds the results of the probe of change `code-compaction` (task 3.2).
The probe compares 3 arms on `claude-sonnet-5-5`: B is the built-in `/compact`, C is code compaction, and H is the handover.
Each arm runs 3 forks at 2 sizes, so a round has 18 forks, and round 4 ran 5 forks of each arm (`--runs 5`), so 30 forks.
The tool is `dev/probe/main.ts`, and the bars are in `dev/probe/bar.ts`.
Round 1 and round 2 ran on 2026-10-26 on Claude Code `2.1.310`, and rounds 3 to 6 ran on 2026-10-27 on Claude Code `2.1.311`.

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
- Claude Code gives a `user` row that has `sourceToolAssistantUUID` that UUID as its `parentUuid` (`chunk-31gxg38t.js`, Claude Code `2.1.310`). The kept rows keep the value of the original rows, which the engine maps back through the `handle` of each message that the hook returns.
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

- The checks of English words of `ground` and `finish` were still in the plugin, because the change `drop-word-checks` waited for the round to end.
- During the round, a subagent ran `git stash` and `git stash pop` on the work tree, so for a short time `plugins/claudetto` held the code of `HEAD`. A fork that started in that window may have loaded the older plugin.

The `compaction` value `code` stays experimental, and `auto` does not pick it.
