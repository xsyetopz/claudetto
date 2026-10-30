# Compaction Boundaries of This Login's Own Sessions

This page measures what the built-in compaction actually did in this login's real sessions, read from the `compact_boundary` records that Claude Code writes into every transcript.
It exists because the claim "built-in compaction gets expensive" is everywhere and the numbers behind it are almost always one person's estimate.
These are not estimates: the token counts and the wall clock come out of the transcripts.
The money figures are the one part that is derived, and the reason is in [What the Transcript Does Not Hold](#what-the-transcript-does-not-hold).

Read on 2026-10-28, Claude Code `2.1.312`, 35 rows.
The sample grows with use, so a later run of the same command returns more rows: it grew from 34 to 35 while this page was being written, because the session writing it compacted. That 35th row is the last one in the table.

## Result in Brief

- 35 real compactions, every one with `trigger` of `auto`. No `manual` row exists, so no `/compact` this login typed is in the sample.
- Each one read a mean of 226,332 tokens and left a mean of 18,288, which is 8.08% kept. The range of what was kept is 5.30% to 12.72%.
- The summary itself is a mean of 26,055 characters, about 6,514 tokens. That is far smaller than `postTokens`, so `postTokens` is not the size of the summary. See [Why `postTokens` Is Not the Summary](#why-posttokens-is-not-the-summary).
- The mean compaction took 154.9 s, with a range of 59.2 s to 241.6 s. Over the 35 rows that is 90.4 minutes of waiting.
- The first request after a compaction wrote a mean of 31,887 cache-creation tokens and read only 8,912. The cache rebuild on the way back up is real and it is now measured here, not argued.
- Every row fired within 1,118 tokens below and 6,878 above 224,999, which is exactly where this login's own `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` of `80.3571` puts the threshold. The archived formula lands where it was designed to. See [The Threshold Is Where We Put It](#the-threshold-is-where-we-put-it).
- Derived cost, at the published `claude-opus-5-5` row and with the measured token counts: about `$0.34` per compaction when the cache is live and about `$1.20` when it is cold. Across all 35 that is about `$11.72` warm and about `$41.83` cold.
- **The warm figure is the one that applies.** The request immediately before every boundary had `input_tokens` of 2 and read 200,146 to 224,663 tokens from cache, and the median idle between that request and the compaction is 0.6 s. Auto-compaction fires on a maximally warm prefix. One row of 35 is the exception, at 4.06 hours idle. See [What the Transcript Does Not Hold](#what-the-transcript-does-not-hold).

## Method

Claude Code writes one record per compaction with `subtype` of `compact_boundary`, carrying `compactMetadata.trigger`, `.preTokens`, `.postTokens`, and `.durationMs`.
The method of reading them is from the Reddit post in [Sources](#sources), and this is what was run:

```sh
jq -r 'select(.subtype=="compact_boundary") | [input_filename, .compactMetadata.trigger, .compactMetadata.preTokens, .compactMetadata.postTokens, .compactMetadata.durationMs] | @tsv' ~/.claude/projects/*/*.jsonl
```

That gives 153 rows over this machine's transcripts.
118 of them are from the probe folders of `archive/dev/probe`, so they are this project's own paid experiments and not real work, and every one of those is excluded here.
The 35 that remain are from two projects, 27 from `claudetto` and 8 from `claude-code-docs`.

Each row was then joined to the two records that follow it in the same file, in order: the summary, which arrives as a `user` message with `isCompactSummary` of `true`, and the first `assistant` message carrying a `usage` block.
That join is what gives the summary size and the cache rebuild. It succeeded for all 35 rows.
32 of those next calls ran on `claude-opus-5` and 3 on `claude-sonnet-5-5`.

The counting half of this page is also in the tree, as `just compaction-cost` (`claudekit/compaction-cost/`), which prints the trigger split, the mean pre and post, the kept share with its range, and the mean duration.
Run later the same day it read 36 boundaries instead of 35, because the session doing the measuring compacted again, and the means moved by under 0.1%: mean pre 226,305 against 226,332 here, mean post 18,286 against 18,288, kept 8.07% against 8.08%, 155.2 s against 154.9 s.
The figures this page holds that the tool does not are the ones that need the join above: the summary size, the cache rebuild of the next call, and the idle gap before each boundary.

## The Rows

| # | `preTokens` | `postTokens` | Summary tokens | Kept | Next-call cache write | Seconds |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 231877 | 23257 | 8487 | 10.03% | 39649 | 241.6 |
| 2 | 225323 | 16688 | 7088 | 7.41% | 29152 | 167.4 |
| 3 | 225816 | 18069 | 7705 | 8.00% | 30577 | 172.3 |
| 4 | 223881 | 16205 | 5895 | 7.24% | 26344 | 146.4 |
| 5 | 226518 | 20770 | 7042 | 9.17% | 35144 | 155.0 |
| 6 | 225334 | 16379 | 7070 | 7.27% | 27913 | 159.7 |
| 7 | 226661 | 19230 | 6610 | 8.48% | 31948 | 147.3 |
| 8 | 226634 | 16074 | 7030 | 7.09% | 36542 | 173.9 |
| 9 | 229016 | 22311 | 4419 | 9.74% | 46071 | 72.6 |
| 10 | 226803 | 27131 | 4774 | 11.96% | 44979 | 59.2 |
| 11 | 229057 | 17293 | 5334 | 7.55% | 28623 | 69.6 |
| 12 | 225703 | 15273 | 7275 | 6.77% | 26232 | 176.3 |
| 13 | 231827 | 29496 | 7648 | 12.72% | 57139 | 183.3 |
| 14 | 225304 | 14020 | 5174 | 6.22% | 23753 | 149.9 |
| 15 | 228451 | 21297 | 5716 | 9.32% | 36014 | 140.3 |
| 16 | 224891 | 14531 | 5997 | 6.46% | 25676 | 160.3 |
| 17 | 225459 | 16166 | 5814 | 7.17% | 27596 | 172.0 |
| 18 | 225325 | 20271 | 5519 | 9.00% | 35144 | 143.8 |
| 19 | 226187 | 18133 | 6749 | 8.02% | 33331 | 180.6 |
| 20 | 225012 | 16202 | 6200 | 7.20% | 27445 | 157.7 |
| 21 | 225736 | 18792 | 6266 | 8.32% | 32667 | 163.3 |
| 22 | 227119 | 15538 | 4835 | 6.84% | 26472 | 132.7 |
| 23 | 225507 | 20301 | 5723 | 9.00% | 34959 | 150.9 |
| 24 | 225665 | 20309 | 8119 | 9.00% | 33775 | 189.7 |
| 25 | 226320 | 18752 | 6536 | 8.29% | 32098 | 138.2 |
| 26 | 225665 | 18787 | 6415 | 8.33% | 32020 | 149.2 |
| 27 | 226011 | 19107 | 7794 | 8.45% | 34288 | 179.3 |
| 28 | 226415 | 20557 | 6331 | 9.08% | 35463 | 149.7 |
| 29 | 226274 | 14095 | 6610 | 6.23% | 24809 | 173.8 |
| 30 | 225002 | 14239 | 6740 | 6.33% | 24738 | 164.4 |
| 31 | 225258 | 16168 | 7607 | 7.18% | 27935 | 184.6 |
| 32 | 225004 | 18849 | 7898 | 8.38% | 31957 | 185.7 |
| 33 | 225136 | 16268 | 7801 | 7.23% | 26365 | 160.2 |
| 34 | 225461 | 17542 | 6722 | 7.78% | 28383 | 153.0 |
| 35 | 225960 | 11981 | 5023 | 5.30% | 20828 | 117.2 |

Summary tokens are the characters of the summary message divided by 4, so they are an approximation of a token count and not a counted one.
Nothing in the transcript gives the token count of that message.

## The Threshold Is Where We Put It

`clawdipedia` route `how-it-works/context-and-compaction`, section "When Compaction Runs", gives the levels as formulas.
With `window` the window in force and `out` the smaller of the model output limit and `20000`, the compact threshold is `window - out - 13000`, and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` replaces it with the smaller of `(window - out) * pct / 100` and `window - out - 13000`.

This login's `~/.claude/settings.json` holds `autoCompactWindow` of `300000` and an `env` entry `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` of `80.3571`.
So the threshold in force is the smaller of `floor(280000 * 80.3571 / 100)`, which is 224,999, and `267000`, which is 224,999.

The 35 rows fired between 223,881 and 231,877, a mean of 226,332.
33 of the 35 are at or above 224,999 and the two below it are short of it by 1,118 and 108 tokens.
The overshoot above the line reaches 6,878 tokens and is the growth of the turn that crossed it, because the check runs between turns.

Two things follow.
The first is that the archived `AUTOCOMPACT_PCT` of `archive/plugins/claudetto/modules/session/limits.ts:32-35` is confirmed against 35 live firings: it was derived to make the harness compact at `HANDOFF_TRIGGER_TOKENS`, 225,000, and that is where the harness compacts.
The second is that none of these rows measures the Claude Code default.
They measure a threshold claudetto itself wrote into this login's settings, so this page is evidence about our own configuration, and it is not evidence about what an unconfigured install does.

## Why `postTokens` Is Not the Summary

The mean of `postTokens` is 18,288 and the mean summary is about 6,514 tokens, so `postTokens` is about 2.8 times the summary.
The difference is the system prompt, the tool schemas, and whatever the next turn re-read.
Any cost figure that prices `postTokens` as output tokens therefore overstates the output of a compaction by about this factor, and the figures on this page use the measured summary size instead.

## What the Transcript Does Not Hold

The summarizer request itself carries no `usage` record anywhere in the transcript.
The summary arrives as a `user` message, which has no `usage` block at all, and no `assistant` record exists for the compaction turn.
So the transcript gives the tokens the compaction read and the tokens it produced, and it never gives what the compaction was billed.

Every money figure below is therefore derived from the measured token counts and the published prices of `openspec/changes/claudetto-restart/references.md`, "Official Prices", and none of it is a bill.
The derivation is the sum of three terms: the whole context read once, the summary as output, and the cache write that the next request pays on the new prefix.
The first term has two cases, because a context read from a live cache entry is billed at the cache-read price and a context read after the entry expired is billed at the full input price.

| Published row | Cache live | Cache expired |
| --- | --- | --- |
| `claude-opus-5-5` | `$0.335` mean, `$11.72` over 35 | `$1.195` mean, `$41.83` over 35 |
| `claude-sonnet-5-5` | `$0.167` mean, `$5.86` over 35 | `$0.598` mean, `$20.91` over 35 |

32 of the 35 sessions ran `claude-opus-5`, which has no published row in `references.md`, so the Opus line above uses the `claude-opus-5-5` row as the nearest published one. The figure is a bound and not that session's price.

The gap between the two columns is 3.57 times, and it is the whole of the "idle compaction is expensive" claim.
It is not about compaction being large. It is about whether the cache entry survived to the moment the compaction fired.

Which column applies is measurable after all, from the request that comes immediately before each boundary.
A compaction runs between turns, so the cache state of the turn just before it is the cache state the compaction inherits.
In all 35 rows that previous request had `input_tokens` of **2** and read between 200,146 and 224,663 tokens from cache, so the prefix was live every time.
The idle time between that request finishing and the compaction starting, which is the gap between the two timestamps less `durationMs`, has a **median of 0.6 s**, and 34 of the 35 are under 7.8 s.

So the warm column is the one that applies here, and `$0.335` is the figure, not `$1.195`.
One row is the exception: row 8 idled **4.06 hours** before compacting, and this login sets `CLAUDE_CODE_PROMPT_CACHE_TTL` to `1h`, so that entry had expired and that single compaction paid the cold price.
That is 1 of 35, and even there the cold read was owed to the next request whether or not a compaction followed, so what the compaction added was the summary output and the cache write, not the cold read.

## When a Compaction Fires at the Wrong Time

Three different things can be meant by a compaction firing at the wrong time, and the rows separate them.

The cache state is not one of them, for this login.
Auto-compaction fires between turns at a median of 0.6 s after the turn that crossed the threshold, so the prefix is as warm as it ever gets.
The expensive event people describe is the first request after a break longer than the cache lifetime, and that cost falls on that request whether or not a compaction follows it.

The threshold is late but almost certainly does not matter.
Ours fires at 224,999 of a 300,000 window, which is 75% full.
The one external source with a real sample reports a flat optimum, "anything between 239k and 453k lands within 10% of it" with a floor at 146k, fitted on a window near 1M (`references.md`).
A lower trigger buys a cheaper request and pays for it in more compactions and more discarded context, and no row here prices that trade.

The moment inside the work is the real one, and it is unmeasured here.
The harness picks the moment by token count alone and knows nothing about whether a task is half done, and each firing discards about 92% of the conversation.
The cost of that shows up as re-reading, which `docs/evidence/code-compaction-probe.md` measured in the probe arms rather than in real sessions.
Nothing in a `compact_boundary` record says whether the work survived.

## What This Does and Does Not Settle

It settles that a compaction on this login reads about 226,000 tokens to keep about 18,000, that it costs about 2.5 minutes of waiting, that the request after it rebuilds about 32,000 tokens of cache, and that it fires on a live cache.
Those numbers are measured.

It does not settle the price of a compaction, for the reason above, and it does not settle whether another path is cheaper.
That comparison needs the billed cost of a compaction, which only `$.session.usage()` deltas across the boundary can give, and that is what task 10.7 exists for.

It does not settle whether the moment is right for the work, only that the cache state is not the problem.

It also does not support any claim about the Claude Code default threshold, because this login does not run it.

## Sources

The external sources that prompted this page, with what each is worth, are in `openspec/changes/claudetto-restart/references.md` under "Compaction Cost Claims (Read 2026-10-28)".
The `jq` method over `compact_boundary` is from the Reddit post recorded there.
The formulas for the levels are from `clawdipedia` route `how-it-works/context-and-compaction`.
