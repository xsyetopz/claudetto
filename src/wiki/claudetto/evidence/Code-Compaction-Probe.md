# Code Compaction Probe

This page holds the results of the probe of change `code-compaction` (task 3.2).
The probe compares 3 arms on `claude-sonnet-5-5`: B is the built-in `/compact`, C is code compaction, and H is the handover.
Each arm runs 3 forks at 2 sizes, so a round has 18 forks.
The tool is `dev/probe/main.ts`, and the bars are in `dev/probe/bar.ts`.
Round 1 and round 2 ran on 2026-10-26 on Claude Code `2.1.310`.

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

## Next Step

The chain of the first fork of C at 80k reaches the boundary with no link before it, so the leak takes another path.
After the walk of the chain, the loader of Claude Code `2.1.310` adds back the parallel tool calls of each assistant row: each row of the file with the same `message.id`, and its tool results, also from before the boundary.
The tail of C began inside a group of parallel calls, and its first rows kept `handle`, so they kept the `message.id` of the group, and the first request held 11 tool results of about 26,000 bytes each from before the boundary.

The fix drops `handle` also from the run of tool messages at the start of the tail, when the message before the cut is not a plain user prompt.
These rows lose their thinking blocks.
The test "Parallel Calls Split By The Boundary Do Not Pull Back Their Siblings" in `tests/claudetto/session/handoff/stub-compact.test.ts` fails before the fix and passes after it.
The probe now builds each base with `DISABLE_AUTO_COMPACT=1`, and it stops before any fork when a base is below its size.
Round 3 runs only after the user approves its cost.
