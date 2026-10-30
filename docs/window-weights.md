# Window Weights

Task 9.2a of `openspec/changes/claudetto-restart`. This file records what `/usage` of Claude Code `2.1.311` already shows, so the window recorder (task group 9) adds only what it lacks.

## Source

The user pasted the `/usage` screen on 2026-10-27 (Max 20x plan, Europe/Tallinn). Nothing here is invented. Each row below is copied from those pastes. The command is interactive, so the user ran it and the rows are not reproduced by code. Reading A is the first paste, reading B the second, hours later, and reading C a later pair of pastes that carry the share rows only. A and B together give a measured delta, which is what this file needed most, because a single reading gives a level and only a pair gives a rate.

## What the Screen Shows, Reading A

| Part | Content in the paste |
| --- | --- |
| Session cost | `Total cost: $13.60`, API duration `1h 53m 41s`, wall duration `49m 53s` |
| Usage by model | `claude-opus-5-5` 8 input, 2.5k output, 60.8k cache read, 11.6k cache write ($0.1556). `claude-haiku-5-5` 3.1m input, 759.0k output, 4.8m cache read, 2.5m cache write, 51 web search ($2.12). `claude-sonnet-5-5` 27.2k input, 353.6k output, 31.2m cache read, 1.4m cache write ($11.32) |
| Prompt cache (main) | `234 requests · 97% of input tokens from cache · 1 miss (last 47m 2s ago — likely cause: model changed, earlier messages changed, 25.0k tokens re-cached) · 3 expected rebuilds (compaction or tool-result clearing) · warm (1h TTL, last activity 12s ago)` |
| Current session | `2% used`, resets 7:59pm |
| Current week (all models) | `28% used`, resets Nov 2 at 5:59am |
| Current week (Fable) | `0% used` |
| Contributions, last 24h, "shares overlap" | `97%` Give `claudetto:Artemis` subagents a cheaper model. `55%` Review the `claudetto` plugin. `23%` Start fresh when you switch tasks, run `/clear` |
| Skills, % of usage | `/claudetto:propose` 8%, `/claudetto:setup` 3% |
| Subagents, % of usage | `claudetto:Artemis` 25%, `claudetto:Hermes` 10%, `claudetto:propose` 6%, `claudetto:Hephaestus` 2% |

The screen labels the contribution part "Approximate · sessions on this machine only".

## What the Screen Shows, Reading B

| Part | Content in the paste |
| --- | --- |
| Session cost | `Total cost: $102.71`, API duration `6h 8m 4s`, wall duration `3h 38m 28s`, `6688 lines added, 570 lines removed` |
| Usage by model | `claude-opus-5-5` 8 input, 2.5k output, 60.8k cache read, 11.6k cache write ($0.1556). `claude-haiku-5-5` 4.1m input, 996.3k output, 6.0m cache read, 3.1m cache write, 69 web search ($2.68). `claude-sonnet-5-5` 44.4k input, 1.2m output, 93.1m cache read, 4.6m cache write ($34.21). `claude-opus-5` 14.5k input, 515.8k output, 79.9m cache read, 1.3m cache write ($65.66) |
| Prompt cache (main) | `830 requests · 98% of input tokens from cache · 2 misses (last 2h 46m 38s ago — likely cause: model changed, beta headers changed, effort changed, earlier messages changed, 233.0k tokens re-cached) · 8 expected rebuilds (compaction or tool-result clearing) · warm (1h TTL, last activity 3m 44s ago)` |
| Current session | `13% used`, resets 7:59pm |
| Current week (all models) | `31% used`, resets Nov 2 at 5:59am |
| Current week (Fable) | `0% used` |
| Contributions, last 24h, "shares overlap" | `97%` Give `claudetto:Hephaestus` subagents a cheaper model. `41%` Review the `claudetto` plugin. `39%` Start fresh when you switch tasks, run `/clear`. `11%` Run `/cc-inspect:cc-inspect` on a cheaper model |
| Skills, % of usage | `/cc-inspect:cc-inspect` 11%, `/claudetto:propose` 2%, `/claudetto:setup` 1% |
| Subagents, % of usage | `claudetto:Hephaestus` 25%, `claudetto:Artemis` 7%, `claudetto:Hermes` 4%, `cc-inspect:cc-inspect` 3%, `claudetto:propose` 2%, `claudetto:Athena` 1% |
| Plugins, % of usage | `claudetto` 41%, `cc-inspect` 14% |
| MCP servers, % of usage | `plugin:cc-inspect:cc-inspect` 3%, `plugin:cc-docs:claude-code-…` 3% |
| Footer | `f to fix 3 of 4 · d to day · w to week` |

## The Rate, from the First Reading to the Second

This is the first measured plan-limit rate in the change. Every figure is arithmetic on the two pastes.

| Quantity | A | B | Delta |
| --- | --- | --- | --- |
| session cost | `$13.60` | `$102.71` | `$89.11` |
| week, all models | 28% | 31% | 3 points |
| current session | 2% | 13% | 11 points |
| cache requests, main | 234 | 830 | 596 |
| cache misses | 1 | 2 | 1 |
| expected rebuilds | 3 | 8 | 5 |

- **About `$29.70` of API-equivalent cost per weekly percent.** The meter shows whole percents, so a 3-point move carries a rounding band of one point either way, giving `$22.28` to `$44.55` per percent. The week also covers every session on the account while this cost is one session, so other activity can only make the true dollars-per-percent lower.
- **About `$8.10` per session percent**, over the five-hour window.
- **Rebuilds outnumber misses five to one.** The 596 new requests brought 1 new miss and 5 new expected rebuilds, which the screen attributes to "compaction or tool-result clearing". So the cache writes that `D15` ranks as the top cost line are driven more by compaction and tool-result clearing than by invalidation. The one miss re-cached `233.0k` tokens, which at the official Sonnet 5.5 `1h` write price of `$4` per MTok is about `$0.93`. That makes a single miss cheap and the rebuild count the thing to watch, which points group 8 at compaction as a cache-write driver and not only as a context-length tool.
- The miss cause the screen names is a list and not one cause: "model changed, beta headers changed, effort changed, earlier messages changed". So the screen does not attribute a miss to one trigger, and no single invalidator can be blamed from this reading.

## Another Reading, from the Plugin's Own Usage Line

The pre-restart plugin printed its own usage line once after a band of `USAGE_LEVELS` changed, from `session.measure` through the next `classic.UserPromptSubmit` or `classic.PostToolBatch`. The new tree holds no such handler, so this reading is of the old plugin and cites no file. One arrived later in the same session, labelled by the harness as `tool.call` hook context: `Cost of the session so far: $107.72. Change of each plan share since the first reading: 5-hour -6%, weekly +4%.`

This is not a `/usage` paste. `sessionCost` of the pre-restart plugin, which the new tree does not hold, read `cost.usd` and `rateLimits[].percentUsed` from `$.session.usage()`, and `costReport` printed the cost as a level and each share as a change against `start`, the first share the session read. So the two numbers have different baselines, and they do not pair with reading A.

| Quantity | Baseline | Value |
| --- | --- | --- |
| session cost | the start of the session, so near zero | `$107.72` |
| week, all models | the first share the session read | +4 points |
| five-hour window | the same | -6 points |

- **The rate from this line alone is about `$26.93` per weekly percent**: the whole session cost of `$107.72` against a 4-point rise, with a whole-percent band of `$21.54` to `$35.91`. It needs no other reading, because both numbers start at the beginning of the session.
- Taken with the `$29.70` of the pair above, the two independent estimates overlap on `$22.28` to `$35.91`, and their point estimates sit `$2.77` apart. The week also carries every other session on the account, so the true dollars per weekly percent can only be lower than both.
- The five-hour share fell by 6 points while the week rose, so that window reset inside the session. A five-hour delta is therefore not a cost rate unless both reads sit in one window, which is a constraint the recorder of task 9.3 has to hold: it drops a row whose window reset between its two reads.
- The line is free and already in the code, so group 9 needs no new source for the plan share. What it needs is the per-turn tie to the token categories, which this line does not carry, and a share baseline per row rather than per session.

## Per-Model Cost of Reading B

`/usage` reports cost per model directly, which answers a gap that our transcript measurement could not: `claude-opus-5` had to be excluded there for want of a published price, and here its cost is given.

| Model | Cost | Share | Tokens | Blended `$`/MTok | Cache read share of its tokens |
| --- | --- | --- | --- | --- | --- |
| `claude-opus-5` | `$65.66` | 63.9% | 81,730,300 | `$0.80` | 97.8% |
| `claude-sonnet-5-5` | `$34.21` | 33.3% | 98,944,400 | `$0.35` | 94.1% |
| `claude-haiku-5-5` | `$2.68` | 2.6% | 14,196,300 | `$0.19` | 42.3% |
| `claude-opus-5-5` | `$0.16` | 0.2% | 74,908 | `$2.08` | 81.2% |

- `claude-opus-5` is the main-thread model of this session and is 63.9% of its cost on 81.7m tokens, the largest single line, while `claude-sonnet-5-5` carries more tokens, 98.9m, for half the cost. Per token `claude-opus-5` runs 2.32 times `claude-sonnet-5-5` here.
- `claude-opus-5` appears in reading B and not in reading A. The two readings are hours apart in a session that was compacted, and the miss cause in B names "model changed", so the main model changed between the readings. Which direction and when is not in either paste, so it is not stated here.
- The blended rate is not a price. It is cost divided by all four token categories, so it mixes input, output, read, and write, and it moves with the mix. No unit price for `claude-opus-5` is published on any page read, so its internal split stays unknown.
- `claude-haiku-5-5` has the lowest cache-read share, 42.3%, against 94.1% and 97.8% for the two main-thread models. That fits subagents starting cold with no parent prefix to read.

## What the Screen Shows, Reading C

The user pasted `/usage` twice more on 2026-10-27, the second time from the TUI Usage tab and seconds after the first, with the same shares. The paste carried the share rows only, so no session cost, no per-model line, and no cache line are recorded here. The rows below are copied from it.

| Part | Content in the paste |
| --- | --- |
| Current session | `17% used` |
| Current week (all models) | `32% used` |
| Current week (Fable) | `0% used` |
| Contributions, last 24h | `98%` Give `claudetto:Hephaestus` subagents a cheaper model. `40%` Start fresh when you switch tasks, run `/clear`. `34%` Review the `claudetto` plugin |
| Skills, % of usage | `cc-inspect:cc-inspect` 9%, `claudetto:propose` 1%, `claudetto:setup` 1% |
| Subagents, % of usage | `claudetto:Hephaestus` 21%, `claudetto:Artemis` 6%, `claudetto:Hermes` 3%, `cc-inspect:cc-inspect` 2%, `claudetto:propose` 1%, `claudetto:Athena` 1% |
| Plugins, % of usage | `claudetto` 34%, `cc-inspect` 11% |
| MCP servers, % of usage | `plugin:cc-inspect:cc-inspect` 6%, `plugin:cc-docs:claude-code-…` 2% |

- **The two reads of reading C sit seconds apart, so they settle nothing about a rate.** In particular they do not settle task 9.2d, which needs one pair of reads that brackets a headless run. The pair here brackets nothing.
- **`claudetto:Hephaestus` is now both the top subagent, 21%, and the top recommendation, 98%.** The same lever as in reading B, where it was 25% and 97%. The recommendation has held the top slot across two readings hours apart, and the subagent share fell 4 points between them, so the recommendation does not track the share closely. Task 11.5 still decides the subagent model by a cost-per-task measurement.
- **Reading C adds no row that reading B lacks.** The screen shows no `loops` row, no per-turn plan delta, and no tier comparison, which is the third reading in a row with none. That is three independent disconfirmations of the guess in task 9.2a that `/usage` already attributes a loop, so the recorder of group 9 still has to add it.
- The week rose from 31% in reading B to 32% here. No cost figure came with reading C, so this point gives no dollars-per-percent and does not revise the `$22.28` to `$35.91` band above.
- `claudetto` at 34% of usage is down from 41% in reading B, and `cc-inspect` at 11% is down from 14%. Both are shares of a moving total, so a fall can come from either side and neither is a measured reduction.

## The Haiku Trigger against Our Own Growth

The trigger of 90,000 prompt tokens for a Haiku 5.5 session leaves 10,000 tokens below the price step of 100,000. The vendor test behind it is the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence`: "In Anthropic's test with 10,000-token turns, a trigger of 90,000 cost 70% less per request than the default" (read 2026-10-28). The margin has to cover how far one call can grow the prompt before the handoff is written, so the question is whether our own growth fits inside 10,000.

The window rows of the recorder (`window.rows` in `$.store`) carry no Haiku session, so the growth below comes from the transcripts that every Haiku response here was written to, and not from `window.rows`. The rows were empty when this was measured and are not any more, and the section "The Price of the Handler, Still Missing" holds what they do and do not give; neither reading moves the growth below, which was never taken from them. `bun claudekit/haiku-growth/main.ts` reads them, counts each response once by `message.id`, takes the prompt as the three input counts together (cache reads and writes count toward the step), and takes growth between consecutive responses of one thread. A transcript file interleaves the main thread with subagent sidechains, so the thread of a response is the last link reached by following `parentUuid` through the file's own `uuid` map (`claudekit/haiku-growth/main.ts:86`, used at `claudekit/haiku-growth/main.ts:153`); `isSidechain` alone cannot tell two sidechains of one file apart. Run on 2026-10-29:

| Quantity | Reading |
| --- | --- |
| transcripts read | 1,120 |
| Haiku 5.5 responses | 2,196 |
| steps from one response to the next in one thread | 1,377 |
| largest growth of one step | 411,764 tokens |
| steps over the 10,000-token margin | 53 |
| pairs of steps in a row | 986 |
| largest growth of two steps in a row | 414,059 tokens |
| pairs over the margin | 96 |
| responses whose prompt was over 100,000 | 47 |
| largest Haiku 5.5 prompt | 436,909 tokens |

The earlier reading differenced responses by file. On the same 1,120 transcripts it gives 1,383 steps, 58 over the margin and 103 pairs over it, and the difference is steps that join two threads of one file, which are not the growth of one call. The largest step is inside one thread, so the headline is unchanged.

**90,000 does not clear our largest growth.** 53 of the 1,377 steps are larger than the margin, so a call that lands just under 90,000 can still cross 100,000 on the next response.

**The margin is not eaten by turn-by-turn growth. It is eaten by single requests whose prompt jumps because one large payload entered the context and was written to cache.** The usage of the largest steps, read from the same transcripts with `input_tokens`, `cache_read_input_tokens` and `cache_creation_input_tokens`:

| Step | `input_tokens` | `cache_read_input_tokens` | `cache_creation_input_tokens` |
| --- | --- | --- | --- |
| 411,764 | 2 | 13,599 | 411,764 |
| 163,329 | 2 | 11,830 | 163,329 |
| 98,853 | 2 | 6,925 | 98,853 |
| 86,153 | 2 | 8,977 | 86,153 |
| 84,009 | 2 | 6,921 | 84,009 |

The largest step is one request with a prompt of 425,365 (2 + 13,599 + 411,764), from a prompt of 13,601 one response earlier. The others have the same shape: `input_tokens` of 2 and nearly all of the step in `cache_creation_input_tokens`. The largest Haiku 5.5 prompt on this machine is 436,909.

What follows is that a compaction trigger of any value below the 100,000 price step cannot prevent such a request, because the payload arrives inside one call, after the last check and before the next. A lower trigger only shifts which turn is last. The defense is a bound on payload size, not a lower trigger.

The value stays at 90,000, because no reading here gives a better one and `prd.md`, G10, bars picking one. What the reading changes is the claim: the trigger lowers the share of Haiku requests priced above the step, and it does not rule them out. Each request is priced alone (`docs/models.md`, "The Price Cliff"), so a request that crosses pays the higher price for that request only.

Two limits on this reading. The 47 responses already over 100,000 came from threads that ran with no Haiku trigger, so they show the cliff is reachable and not what the trigger does. Whether a thread is a Haiku main session or a subagent was not told apart, so none of it is a measured Haiku main session. Rows from the recorder, once they exist, replace this reading.

## The Engine's Second Ask for a Missing `<summary>` Block

Task 10.7 asked whether the engine's second ask reaches a compaction that a hook answered, because that would double the saving of the `cheapSummary` handler or halve it. Read in `2.1.312` with `cc-inspect`. **It doubles it. The second ask exists, and a hook-answered compaction never reaches it.**

The ask is real and it is a whole second summarization call. At `chunk-r5cyd28m.js:2096878`, when the reply has neither a closed nor an opened `<summary>` block, the reactive path logs "Reactive compact: the reply has no `<summary>` block, asking for the summary once more" and calls `Ztn(...,!0)`, which appends the paragraph `Ytn` to the compaction prompt and queries the model again with `forkLabel:"reactive-compact"` (`chunk-r5cyd28m.js:2094424`). A second reply that also lacks the block ends the compaction with "no `<summary>` block in the second reply either". Two gates stand in front of it: `k9s()`, which reads the flag `tengu_dapper_fountain` with a default of `true` (`chunk-452kr8jw.js:2099`), and `compactionApiAttemptsLeft?.count !== 0`. The tag tests are `GJ`, the pattern `/<summary>([\s\S]*?)<\/summary>/` after `<analysis>` is stripped, and `owe`, an opening `<summary>` at the start of a line, so an unclosed tag passes (`chunk-r5cyd28m.js:2091137`). The bundled changelog says the same in plain words, in its `## 2.1.311` block: "Improved compaction: when the model's reply has no summary in it, Claude Code now usually asks for the summary once more before it replaces the conversation" (`chunk-zajfrx7d.js:11206`, heading at `chunk-zajfrx7d.js:3340`).

It does not reach our handler. `WIo` at `chunk-r5cyd28m.js:1531068` is the dispatch of `session.compact`: core runs only when the session is isolated, when the event has no hook registered, or when a hook calls `next`. The `<summary>` parse and the re-ask live inside core's summarizer, downstream of core's own model reply, so a hook that returns messages never gets there, and the log line records that "a hook's N messages stand".

Two consequences for the price of the handler, both unmeasured and both arithmetic on the reading above:

- Where the engine re-asks, its compaction costs **two** calls on the model the session runs, not one. So the saving of one bounded `claude-haiku-5-5` call is larger on those compactions than a one-call comparison shows.
- Our handler has no counterpart. `summarize` in `plugins/claudetto/src/summary.ts` makes one call and never re-asks; a throw or an empty reply returns nothing and `onCompact` falls back to `next(e)` (`plugins/claudetto/src/compaction/hook.ts`). So a failure costs the cheap call **plus** the engine's whole path, which is the worst case of the handler and the only case where it loses.

Found on the reactive path only. The auto and manual path at `chunk-r5cyd28m.js:2404938` retries on `prompt_too_long` through `Drn` and otherwise takes `ewe(messages) ?? mt`, the last assistant text message, with no second content-level ask. `compactionApiAttemptsLeft` is the shared counter for both, and it gates the re-ask rather than causing it.

### The Price of the Handler, Measured

The other half of task 10.7, the saving in window points and dollars, is **not recorded here and no figure is given**. Task 10.8 found that the summarizer request leaves no `usage` record in the transcript, so the figure has to come from `$.session.usage()` deltas across a compaction boundary in a live session with the window recorder running.

The recorder has now run, and a boundary has now been crossed under it. The store of the inline plugin, `~/.claude/plugins/store/claudetto_inline-42e2362bb3cf.json`, holds 97 measure rows and 50 turn rows written by the sessions of tasks 10.5 and 12.3 and by the probe's own forks.

The row format was the first gap and it is closed. A row carries `afterCompaction` when it is the first one written once a compaction has ended, so the fall in `tokens` beside the row before it belongs to that compaction and not to a turn. It is set on the row after rather than on a row of `source` `compaction`, because whether `session.measure` fires inside a compaction is unread, while the row after it carries the window the compaction left. **It is verified against a real compaction and not only in the lab**: the probe's first fork to compact left exactly one marked row out of 97, in the right place.

A whole probe fork could not give the figure, for a reason worth keeping: **the marked row of a fork holds `usd` `0.8295` against the `0.8392` that fork billed in total**, so its delta is the whole fork and isolates nothing, and its `tokens` of `81,149` is the context the fork ended at. **No turn row names the summarizer either**: all 50 turn rows are `source` `main` and none is `compaction`, so `turn.complete` does not fire for the summarizer request, which is task 10.8's transcript finding reached again from the engine's own usage.

`claudekit/compaction-price/` is the instrument that does give it, run as `bun claudekit/compaction-price/main.ts --run`. It pins the threshold low and runs a session as a series of short `claude -p` steps, so a step carries the compaction and a step on either side of it is the baseline to subtract. `--cheap-summary` turns the plugin's handler on for the run, and the two arms differ in that option alone.

Six paid runs on 2026-10-30, all at a threshold of 24,986 tokens on `claude-sonnet-5-5`, three per arm, billing 2.45 in `total_cost_usd` together.

| Arm | Whole run, 6 steps | Context before | Context at the end of the marked step | The compaction |
| --- | --- | --- | --- | --- |
| the engine's own | — | 24,508 | 10,973 | `0.0237` |
| the engine's own | `0.7389` | 22,710 | 23,423 | at most `0.0785` |
| the engine's own | `0.8720` | 22,718 | 23,086 | at most `0.0892` |
| `cheapSummary` | `0.2036` | 22,732 | 10,482 | `0.0027` |
| `cheapSummary` | `0.1791` | 22,737 | 10,053 | `0.0000` |
| `cheapSummary` | `0.1792` | 22,664 | 10,033 | `0.0001` |

The first row ran with a calibration step, so it billed 7 steps rather than 6 and its whole-run total is left out of the comparison.

**Two of the three engine runs are upper bounds and say so.** A row is written per step, so the marked row's delta is the compaction plus whatever that step did after its boundary, and the context rising across the mark rather than falling is what shows that it did. Only the first engine run ended its step at the boundary, which is why its `0.0237` is a reading and the other two are ceilings. All three handler runs ended at their boundary.

**The two numbers.** In dollars, the engine's compaction costs `0.0237` against the handler's `0.0009` mean over three runs, with no handler run above `0.0027`. In window points, both arms moved the five-hour window by `0` in all six runs: one point is a tenth of a percent, and a compaction of a 23,000-token context does not reach it, so the window half of this price is below the resolution of the instrument rather than unmeasured.

The whole-run totals are the steadier comparison, because they do not depend on where inside a step the boundary fell. Over six identical steps with one compaction each the engine arm billed `0.8055` as the mean of two runs and the handler arm `0.1873` as the mean of three, a fall of 77% and a difference of `0.6182`. The handler arm also reproduces to four decimals across two runs, `0.1791` and `0.1792`, while the engine arm's two runs differ by 18%.

**Three things this does not establish, and the switch stays off because of them.**

- **The scale is wrong by about six times.** These compactions compacted a context of about 23,000 tokens and the shipped threshold is 140,000. The summarizer reads the context it compacts, so both arms' figures grow with it, and nothing here says they grow at the same rate.
- **Nothing here checks the summary.** The handler's step ended at about 10,000 tokens and the engine's at about 23,000, so part of the difference is a shorter summary and not a cheaper call. A summary that drops what the work needed is not a saving, which is a bar of `docs/evidence/code-compaction-probe.md`, "The Bars", and no run here tests it.
- **Three runs per arm is the smoke floor and not the citable one of 10.** The direction is the same in all six runs; the size of it is not pinned.

Until those are answered, every tier row leaves the handler off and the `cheapSummary` option stays `off` by default. What has changed is that the figure is no longer missing and the reason to keep it off is no longer the absence of one.

One thing the rows settle for free, as a cross-check of a paid reading: the last base row of the first probe round holds `76,033` tokens, which is the figure `claudekit/probe/main.ts --run --base-only` printed from the `stream-json` events, and the six forks of the round after it hold `79,446`, `79,968`, `79,991`, `79,447`, `80,949`, and `80,430`, which are exactly the peaks that round recorded. Two independent paths agree on the context, so the probe's reading is not a parse of its own invention.

A defect of the instrument that its first paid run found is worth recording, because it is the fourth time this change has met the same shape. `DEFAULT_THRESHOLD` was a fixed 30,000 tokens, and the context of a first step is almost all the plugin's own prompt: the run started at 22,622 tokens and its six steps reached 28,319, so it crossed nothing, billed `0.28` and priced nothing. The threshold is now calibrated by one extra step that measures the context and sets the threshold two steps of growth above it, which read 22,708 and chose 24,986. The growth itself is measured, 1,135 to 1,145 tokens a step, and the notes are almost none of it, because a step that needs one line of a note reads that line with a `limit`. That is the lesson of `docs/evidence/compaction/threshold.md` again: a fixture cannot buy context by putting it in a file.

## What Already Exists, So the Recorder Does Not Repeat It

- Attribution of the window by skill and by subagent type, as shares of usage.
- Recommendations with a share, including a cheaper model for a named subagent and a fresh session on a task switch.
- A cache line for the main thread: request count, share of input from cache, misses with a likely cause, expected rebuilds, and the live TTL (`1h` here).
- Cost per model in API list dollars, with the token categories.

## What It Lacks, So the Recorder Adds It

- No row gives the plan-limit change per turn. The screen shows `28% used` for the week, and nothing says how much of it one turn, one cache read, or one output token moved. Task 9.3 takes the `five_hour` and `seven_day` `used_percentage` deltas from `$.session.usage()` after each turn and stores them with the token categories of that turn.
- No row separates sources (main, subagent, headless, scheduled). The row format of the recorder keeps `source`.
- No row prices a cache read, a cache write, and an output token in plan points. API dollars are shown, and `references.md` records that no Anthropic page gives the plan weights.
- The week figure covers every session on the account, while the contribution part covers this machine only. The recorder works from deltas within one session, so it does not depend on the unseen part.
- No row compares tiers. The tier ratio stays "not measured" until rows from two tiers exist.

## Notes for Other Tasks

- The `Give claudetto:Artemis subagents a cheaper model` row at `97%` and the `D10` rule (agent files carry no `model:` line, the model comes from the tier row through `CLAUDE_CODE_SUBAGENT_MODEL`) point at the same lever. Task 11.5 and the `tier-profiles` row decide the model by a measurement of cost per task, not by this recommendation alone.
- The cache line confirms in this session that the main thread cache is `1h`, which agrees with the cache facts in `references.md`. It does not confirm a cause for the one miss. The screen names four causes together, "model changed, beta headers changed, effort changed, earlier messages changed", and a model change is one of them and the only one that reading B shows independently, which makes it the likely cause and not the measured one.
