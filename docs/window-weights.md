# Window Weights

How claudetto records the plan-limit windows, and how it keeps a Haiku session under the price step. The code is the source of each value below. No dollar-per-percent rate and no per-model spend is recorded here: a figure of that kind needs a paid run of Claude Code to read again.

## The Window Recorder

The `window` block (`plugins/claudetto/src/blocks/window/block.ts`) hooks `turn.start`, `turn.complete`, and `session.measure`. It stores two lists in `$.store`, each kept for `KEEP_MS`, 7 days (`plugins/claudetto/src/blocks/window/window.ts`).

- `window.rows` holds one row per `session.measure` that moved a window. A row has the `source`, the `task`, the context `tokens` and `window`, the cost `usd` since the last reading, the points the five-hour window moved (`points`), the points the seven-day window moved (`sevenPoints`), and the cache `ttl`. `source` is `main`, `subagent`, `compaction`, `handoff`, or `classifier`.
- `window.turns` holds one row per finished turn with its `model` and the four token counts from its `usage`: input, output, cache read, and cache write.
- `window.classify` holds one row per classifier model call (`plugins/claudetto/src/blocks/window/classify-spend.ts`), because those calls are not in the turns.

Three rules decide what a row means:

- A window delta is kept only when both readings are of the same window. `moved` drops a delta when the `resetsAt` of the two readings differs, when a window has no base, or when the percent fell.
- The `usd` of a row is the change of `cost.usd` since the last reading, never below 0.
- The row that follows a compaction carries `afterCompaction`, so the fall in `tokens` beside the row before it is read as the compaction and not as a turn. `asCompaction` marks it, for the engine's summarizer and for ours alike.

The `ttl` of a row follows the order the code reads it in (`ttlOf` of `plugins/claudetto/src/blocks/window/hooks.ts`): `FORCE_PROMPT_CACHING_5M` gives `5m`, then `CLAUDE_CODE_PROMPT_CACHE_TTL`, then the `promptCacheTtl` setting, and `auto` when none is set.

### The Report

`reportText` (`plugins/claudetto/src/blocks/window/report.ts`) prints, each as `not measured` when the rows cannot give it:

- Points per task, summed from the rows of one task. A task with one row is marked `too few rows`.
- The weight per 1,000 input tokens, for the five-hour and seven-day windows: the points of all rows divided by the input tokens of the counted turns. It needs `WEIGHT_MIN_ROWS`, 2, turns and 2 rows.
- Dollars per weekly percent for each cache TTL.
- The classifier's tokens and its share of the week's tokens.

`savingLine` turns a token count into window points with the same weight.

### The Weekly Limit in Tokens

The limit is spent in tokens, so `weeklyShare` of `claudekit/price/share.ts` counts a share as tokens against `WEEKLY_TOKENS`, `3_200_000_000`. The constant is the author's figure for the account.

## The Haiku Trigger and the Price Step

`claude-haiku-5-5` bills a request whose prompt is over `HAIKU_PRICE_STEP = 100_000` tokens at the higher row of `claudekit/price/table.ts` (`docs/models.md`, "The Haiku Price Step"). The prompt counts input, cache read, and cache write.

The compaction trigger for a Haiku session is `HAIKU_HANDOFF_TRIGGER_TOKENS = 90_000` (`plugins/claudetto/src/threshold.ts:17`), which leaves 10,000 tokens below the step. A trigger cannot stop a request that crosses the step inside one call, because a large payload can enter the context and the cache between two checks. Such a request pays the higher price for that request only. So the trigger lowers the share of Haiku requests above the step and does not rule them out.

`bun claudekit/haiku-growth/main.ts` reads the transcripts of the machine and prints how many steps from one Haiku response to the next grew by more than that 10,000-token margin, from the prompts it counts once by `message.id`. Run it for the current figures. It takes the thread of a response by following `parentUuid` through the file's own `uuid` map, because `isSidechain` alone cannot tell two sidechains of one file apart.

### The Bound on a Tool Result

The `price-step` block (`plugins/claudetto/src/blocks/price-step/`) bounds the payload. Its `tool.call` hook withholds a result that would take the next request of a Haiku 5.5 step over 100,000, and tells the model to ask for less. It adds the `input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, and `output_tokens` of the step's `usage` to the tokens of that step's results already passed, and counts the result at 3 characters a token (`bound.ts`). The 3 is an estimate and is not measured against the token-count API.

The `usage` comes from the step's stop chunk, and a step can stream long after its calls end. So a call waits for that chunk only until 1 second before its hook's 10-second budget ends, and then its result passes unbounded. The wait counts as the hook's own time, and a hook that outlives its budget twice in a row is unloaded.

## The Cheap Summary

`onCompact` (`plugins/claudetto/src/blocks/compaction/block.ts`) answers `session.compact` with a summary from `claude-haiku-5-5` when `isCheapSummaryOn` holds. Every tier row sets `cheapSummary: false`, so the option `cheapSummaryEnabled` is the only switch.

`summaryRequest` (`plugins/claudetto/src/blocks/compaction/summary.ts`) makes one call with `effort: "medium"`, at most `SUMMARY_MAX_TOKENS`, 2000, tokens, and a timeout of `SUMMARY_TIMEOUT_MS`, 90,000 ms. The summary is cut at a line break within `SUMMARY_MAX_CHARS`, 4000 characters. The call is skipped for a subagent and for the `precompute` trigger.

`summarize` never asks again. A throw or an empty reply returns nothing, and `onCompact` goes on to `next(e)`, so the engine's own compaction answers. A failure of the cheap call therefore costs that call plus the engine's whole path, which is the one case where the handler loses. The saving of the handler in dollars and window points is not recorded here.

## What the Recorder Adds to `/usage`

The `/usage` screen of Claude Code shows the window by skill and subagent type, recommendations, a cache line for the main thread, and cost per model. The recorder adds what the screen lacks:

- The plan-limit change per turn, from the `five_hour` and `seven_day` deltas that `session.measure` reports, stored beside the token categories of that turn.
- The `source` of a row: main, subagent, compaction, handoff, or classifier.
- A weight in window points per input token, which no screen gives.

The week figure covers every session on the account. The recorder works from deltas within one session, so it does not depend on the unseen part.
