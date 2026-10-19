# Handoff Cost

This page compares the cost of one handoff with the cost of one `/compact` on the same session.
On this session, the handoff cost $0.0630 and the compaction cost $0.2288.
The figures are from an earlier release (1.0.0), not from the `handoff` slice of 0.2.0.
That slice works another way: it runs at each compaction ([Handoff](Handoff)).

## Setup

| Item | Value |
| --- | --- |
| Date | 2026-10-12, 17:32 to 17:34 UTC |
| Claude Code | `2.1.296` |
| Model | `claude-sonnet-5-5`, context window 1,000,000 tokens |
| Checkout | Commit `627d1d22` of the earlier release |
| Session | `just sandbox` after `just sandbox-clean`, in a project with four slices of that release |
| Runs | 4: one base, one handoff fork, one compaction fork, one follow-up |

All runs used `just sandbox --model claude-sonnet-5-5 --output-format stream-json --verbose`.
The base run read 31 files with `Read`.
Its last call had a context of 81,316 tokens.
Both forks started from that context with `--fork-session`.
The handoff fork wrote a handoff file (1,585 bytes) and ran `/clear`, and the new session read it and answered.
The compaction fork ran `/compact`, then got the follow-up `Continue the work.`

## Sources

| Source | Content |
| --- | --- |
| S | `usage` and `total_cost_usd` of the `result` events in `stream-json` |
| T | `cost-state` and `compact_boundary` entries and `assistant` `usage` in the transcripts. A fork starts with the `cost-state` of its base, so a step is the difference of two `cost-state` values |
| U | The usage report of that release, used as a check only |

## Handoff

| Measure | Handoff step | Resume step | Total | Source |
| --- | --- | --- | --- | --- |
| Input tokens (not cached) | 6 | 4 | 10 | S |
| Cache read tokens | 164,242 | 25,946 | 190,188 | S |
| Cache write tokens | 2,576 | 5,874 | 8,450 | S |
| Output tokens | 869 | 147 | 1,016 | S |
| Model calls | 2 | 2 | 4 | T |
| Cost (API list price) | $0.0354 | $0.0276 | $0.0630 | S |
| Context, last call of the step | 82,927 | 18,487 | 18,487 | T |
| Time | 6.7 s | 2.4 s | 9.1 s | S |

## Compaction

| Measure | `/compact` step | Follow-up step | Total | Source |
| --- | --- | --- | --- | --- |
| Input tokens (not cached) | 59,526 | 2 | 59,528 | T |
| Cache read tokens | 20,245 | 12,613 | 32,858 | T |
| Cache write tokens | 3,542 | 15,803 | 19,345 | T |
| Output tokens | 3,049 | 391 | 3,440 | T |
| Model calls | not shown | 1 | not shown | T |
| Cost (API list price) | $0.1604 | $0.0684 | $0.2288 | S |
| Context, first call of the follow-up | 7,835 (`postTokens`) | 28,418 | 28,418 | T |
| Time | 18.8 s | 4.4 s | 23.2 s | T and S |

Read the context rows as two different points, not as one measure.

## Result

- The summary call of the compaction read 59,526 uncached tokens and wrote 3,049 output tokens.
- The handoff made no such call.
- The handoff took 9.1 s, and the compaction with its follow-up took 23.2 s.
- The sums of the usage report (source U) do not match the tables.
  A fork copies the history of its base, and the report does not show the `/compact` call.

## Limits

- One session of about 81,000 tokens, one model, and one run of each step.
  The numbers have no spread.
- The `/compact` call is not in the transcript as a message, so its call count is unknown.
- The cost is the API list price, not a subscription limit.
  Sources S and T come from the same client.
- The quality of the continued work is not measured.
- Cache expiry is not measured.
  The steps ran within two minutes, with a one-hour cache.

## See Also

- [Usage Evidence](Usage-Evidence)
- [Handoff](Handoff)
- [Evidence](Evidence)
