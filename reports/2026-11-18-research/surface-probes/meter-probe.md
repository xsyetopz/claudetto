# Subscription Meter: 1-Hour Versus 5-Minute Cache Writes

Hypothesis: on the user's subscription, a 1-hour cache write costs about 1.1 times a 5-minute write on the weekly meter (CTX-846), not the API list ratio of 2 / 1.25 = 1.6.

## Method

- Account: the user's claude.ai subscription, run on 2026-11-18 at the user's instruction. Claude Code 2.1.327, model Opus 5.5 (`claude-opus-5-5`).
- Each request is a new `claude -p "Reply with OK." --safe-mode --no-session-persistence --model opus --tools "" --append-system-prompt-file <file> --output-format stream-json --verbose`. The file starts with a fresh nonce and holds about 284k tokens of word text. Every request wrote 283,817 cache tokens and read 0, with 2 input tokens and 4 output tokens.
- The TTL comes from `CLAUDE_CODE_PROMPT_CACHE_TTL` (`1h` or `5m`). The usage block confirms it: `ephemeral_1h_input_tokens` or `ephemeral_5m_input_tokens` equals 283,817.
- The meter is `rate_limit_info.unifiedWindows.seven_day.utilization` from each run's `rate_limit_event`. It has two decimals, so one step is 1% of the weekly limit. The response carried no `five_hour` window.
- The arms ran A-B-A: 1h, 5m, 1h. A segment counts the requests from one meter step to the next.
- Script and per-request log: `meter-probe/probe.py` and `meter-probe/log.jsonl`. The first log line is a single-request size check; the run proper starts at the second line.

## Result

| Segment | TTL | Meter step | Requests in the step | Write tokens per 1% |
| --- | --- | --- | --- | --- |
| 1 | 1h | 0.77 to 0.78 | 11 (i=11 to 21) | 3.12M |
| 2 | 5m | 0.78 to 0.79 | 12 (i=22 to 33) | 3.41M |
| 3 | 1h | 0.79 to 0.80 | 11 (i=34 to 44) | 3.12M |

- The two 1h segments agree (11 and 11), so the meter did not drift between them.
- Meter cost of a 1h write relative to a 5m write: 12 / 11 = 1.09. Each count is exact to within one request, so the ratio lies between 11/12 = 0.92 and 13/10 = 1.30. The API list ratio of 1.6 is outside that range; it would need about 17.6 requests in the 5m step.
- A 1h write costs about 0.32% of the weekly limit per 1M tokens on Opus 5.5, and a 5m write about 0.29%. The poster of CTX-846 reported about 0.3%.
- The meter does not follow API prices. One step cost $24.98 of API-equivalent value at 1h ($2.271 per request, from Claude Code's own `total_cost_usd`) and $17.03 at 5m ($1.419 per request), yet both moved the meter by the same 1%.
- Cost of the probe: the weekly meter went from 0.76 to 0.80, and $94 of API-equivalent value was spent.

## Limits

- One model (Opus 5.5) and one window (weekly). The 5-hour window was not reported for this account.
- The root session of this conversation ran on the same account while segment 1 ran. That pushes segment 1 toward fewer requests. Segment 3 ran while this session was idle and gave the same count, so the effect is below one request.
- Two-decimal resolution bounds the ratio to 0.92 to 1.30. A narrower bound needs more steps per arm: each step costs 1% of the weekly limit.

Conclusion: confirmed. On this subscription a 1-hour write costs about 1.1 times a 5-minute write on the meter (0.92 to 1.30), not 1.6 times.

## Second Run: Sonnet 5.5 and Cache Reads

Hypotheses: on Sonnet 5.5 the 1h/5m meter ratio is also about 1.1; a cache read costs about 0.08 of a 5m write on the meter, the API list ratio (0.1 / 1.25).

Method: the same request shape, run on 2026-11-18 at the user's instruction. Script and log: `meter-probe-2/probe2.py`, `meter-probe-2/log.jsonl` (396 lines, every request exit 0). Arms ran back to back: Sonnet 1h (one warm-up step, then one counted step), Sonnet 5m, Sonnet 1h, then Opus read. The read arm wrote one fixed 283,816-token prefix with a 1h TTL once (i=62) and then read it 333 times (i=63 to 395), each request reading 283,816 tokens and writing 0.

| Segment | Arm | Meter step | Requests in the step |
| --- | --- | --- | --- |
| 1 | Sonnet 1h | 0.81 to 0.82 | 16 (i=13 to 28) |
| 2 | Sonnet 5m | 0.82 to 0.83 | 17 (i=29 to 45) |
| 3 | Sonnet 1h | 0.83 to 0.84 | 16 (i=46 to 61) |
| 4 | Opus read | 0.84 to 0.85 | 1 write and 333 reads (i=62 to 395) |

- Sonnet 1h/5m ratio: 17 / 16 = 1.06, bounds 16/18 = 0.89 to 18/15 = 1.20. Both runs put the ratio near 1.1 (Opus 1.09, Sonnet 1.06); the intersection of the bounds is 0.92 to 1.20.
- Sonnet write: about 0.22% of the weekly limit per 1M tokens at 1h and 0.21% at 5m. A Sonnet write costs about 0.69 of an Opus write on the meter (11/16), against 0.50 at API prices ($1.135 against $2.271 per request).
- Cache read: the step holds one Opus 1h write (1/11 of a step, from the first run) and up to one leftover Sonnet write from the step before (at most 1/16). The 333 reads therefore cost 0.84 to 0.92 of a step. A read token costs 0.033 of an Opus 5m write token (bounds 0.028 to 0.036), about 0.0096% of the weekly limit per 1M read tokens. The API list ratio of 0.08 is outside the bounds: on this meter, reads cost under half what list prices imply relative to writes.
- Cost of the run: the weekly meter went from 0.80 to 0.85; $84 of API-equivalent value ($63 Sonnet, $21 reads).

Limits: the read weight was measured on Opus only here; the third run below measures it on Sonnet. Tightening the 1h/5m bound below ±0.1 needs about four steps per arm (8% of the weekly limit), and ADR-0110 shows the subagent decision does not depend on it.

Conclusion: the 1.1 ratio holds on Sonnet (1.06, 0.89 to 1.20). The read hypothesis is refuted: a read costs about 0.033 of a 5m write on the meter, not 0.08.

## Third Run: Sonnet Cache Reads

Hypothesis: a Sonnet 5.5 cache read costs the same fraction of a Sonnet 5m write as an Opus read does of an Opus 5m write, 0.033.

Method: the same request shape on Sonnet 5.5, 2026-11-18. Script and log: `meter-probe-3/probe3.py` (probe2.py with the stop guard at 0.90), `meter-probe-3/log.jsonl` (728 lines, every request exit 0). One fixed 283,779-token prefix was written once with a 1h TTL (i=0) and then read on every request. The first step (0.86 to 0.87, i=0 to 218) holds the write and is a warm-up; the counted step (0.87 to 0.88) holds only reads.

| Segment | Arm | Meter step | Requests in the step |
| --- | --- | --- | --- |
| 1 | Sonnet read, warm-up | 0.86 to 0.87 | 1 write and 218 reads (i=0 to 218) |
| 2 | Sonnet read | 0.87 to 0.88 | 509 reads (i=219 to 727) |

- 509 reads of 283,779 tokens make 144.4M read tokens per 1% of the weekly limit, about 0.0069% per 1M read tokens.
- Against the Sonnet 5m write step of the second run (17 requests, 4.83M tokens per 1%), a Sonnet read token costs 0.033 of a Sonnet 5m write token (bounds 0.031 to 0.035, from 16 to 18 writes and 508 to 510 reads).
- Against the Opus read step of the second run (333 reads in 0.84 to 0.92 of a step, so 362 to 396 reads per step), a Sonnet read costs 0.71 to 0.78 of an Opus read, close to the 0.69 measured for writes.
- This session ran on the same account during the counted step, which can only shorten the step. The true Sonnet read weight is therefore at most the measured one.
- Cost of the run: the weekly meter went from 0.86 to 0.88.

Conclusion: confirmed. A cache read costs about 0.033 of a 5m write on both models, so the read and write shares in ADR-0110 hold for Sonnet as measured values.
