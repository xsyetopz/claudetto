# A Handover against Core Compaction at 166k Tokens of Context

One real session shape, run twice on `claude-sonnet-5-5` on 2026-11-02, Claude Code `2.1.316`, through the budget gate (`/tmp/ab/gate.ts`) that logs each request's `usage`.
Both arms read seven files of 800 lines each with the `Read` tool (about 21,200 tokens each), then reply with one line. The turn ends at 166,011 tokens of context. Then the cycle runs and the prompt `Say DONE.` follows.

- Arm `handover`: the plugin with `handoverTokens` 150000. The turn's end forks the conversation for a handoff, and the hook answers the compaction with the first message, one assistant line, and that handoff.
- Arm `core`: the same plugin with `handoverTokens` 5000000, so it never forks. `/compact` is typed after the turn, and core's own summary request runs.

The run is driven by `/tmp/probe-148/run.sh` and `drive.py`, which types each follow-up once the gate shows no request in flight.

## Free count first

The planned run was built on the fake API (`/tmp/probe-148/fake.ts`: seven `Read` replies, a handoff for the fork, a summary for core's request), and each arm's bodies were counted before any paid call.

| Counter | `handover` | `core` |
| --- | --- | --- |
| `bun claudekit/paid-run/main.ts` (four characters to a token) | 579,957 | 581,871 |
| File results at the density measured on one real `Read` (2.34 characters to a token), the rest at four (`/tmp/probe-148/count.ts`) | 888,236 | 890,150 |
| Paid: input + output + cache read + cache write | 920,168 | 922,798 |

The first counter undercounts by 37% because the files tokenize at 2.34 characters to a token. The second is 3.5% under the paid total, which also holds the output. Both arms stay far under the 8,000,000 cap.

## Result

Tokens by type, per request of the cycle. The requests before it are the same in both arms: 735,264 tokens in `handover`, 735,227 in `core`.

| Arm | Request | Input | Output | Cache read | Cache write (`1h`) | Total |
| --- | --- | --- | --- | --- | --- | --- |
| `handover` | fork for the handoff | 47 | 510 | 166,011 | 22 | 166,590 |
| `handover` | the prompt after the handover | 2 | 6 | 13,515 | 4,791 | 18,314 |
| `core` | core's summary request | 23,091 | 800 | 144,849 | 66 | 168,806 |
| `core` | the prompt after the compaction | 2 | 5 | 12,775 | 5,983 | 18,765 |

| Per compaction cycle | `handover` | `core` |
| --- | --- | --- |
| Tokens | 184,904 | 187,571 |
| Dollars at `claudekit/price` rates (`1h` writes) | $0.043 | $0.094 |

The token counts are within 1.5% of each other, because both requests read the whole context once. The cost is not: core's summary request read 144,849 tokens from cache and sent 23,091 as uncached input at 20 times the cache-read rate, which is the last `Read` result and the reply. The fork read all 166,011 from cache and sent 47. So a handover costs 45% of core's compaction in dollars at the same size.

Why core's request missed the entry: it repeats the main request's tools, system, and messages, then adds its summary prompt to the last user message. Its breakpoints sit on the system blocks and on the message before the last (the last `Read` call), with no `ttl`, and the main request's `1h` entry at the last `Read` result lies after that. The lookback only goes backward, so the entry was never found. The fork repeats the last request byte for byte and adds the final reply with the breakpoint, so the entry is found one message back.

The summary core wrote cost 800 output tokens and the next request wrote 5,983 tokens for it; the handoff cost 510 and 4,791. Each is one sample, and the lengths change from run to run.

## Cost of the measurement

| Session | Tokens | Dollars |
| --- | --- | --- |
| Calibration: one `Read`, to measure the file density | 61,741 | $0.14 |
| First `handover` try, whose follow-up was typed while a request was still in flight | 95,541 | $0.11 |
| `handover` | 920,168 | $0.72 |
| `core` | 922,798 | $0.77 |
| Total | 2,000,248 | $1.73 (rounded; the rows sum to $1.74) |

The rows are rounded. From the gate logs of the four sessions, the unrounded dollars are $0.1362, $0.1129, $0.7154, and $0.7669, which sum to $1.7314. That is 0.0625% of the 3.20B tokens of last week.

## Limits

- One run per arm, so a difference in the summary's or the handoff's length is a sample and not a rate.
- The context was built from large `Read` results of random words, not from a working session.
- The `handover` arm's cycle ends at the user's next prompt, as the plugin designs it. The `core` arm was started by a typed `/compact`, not by the engine's auto-compaction, which sends the same request at a threshold.
