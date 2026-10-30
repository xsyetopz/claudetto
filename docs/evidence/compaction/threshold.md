# Replaying This Login's Work against Other Compaction Thresholds

`docs/evidence/compaction/boundaries.md` measured what the real compactions did.
This page asks the next two questions: which threshold would have been cheapest, and what does compacting cost in work that no bill shows.
Both halves are free. No model call, no network, no paid run. Everything comes from the same three long transcripts.

Every number here is printed by `bun claudekit/compaction-cost/main.ts`, which is in the tree behind `just compaction-cost`, so a later run checks this page against itself.
Run on 2026-10-28, Claude Code `2.1.312`: 3 sessions, 8,705 assistant requests, 36 compactions.
The sample grows while the session that measures it runs, which is why the boundaries page records 35 compactions from an earlier hour of the same day and why re-running moves the last digits.

## Result in Brief

- **The cheapest threshold for this login's work is about 130,000, and the band within 1% of it runs from 110,000 to 135,000.** The bill plus the measured cost of lost work is `$501.70` at 130,000 against `$554.42` at the 224,999 the archived derivation produced, which is −9.5%.
- The value set is **140,000**, not 130,000. It is the one value inside the robust band of every charge and summary model tested, and its derived settings come out exact: `AUTOCOMPACT_PCT` of `50.0000` fires at exactly 140,000, and a Haiku `autoCompactWindow` of 200,000 fires at exactly 90,000, the trigger Anthropic's own cost page supports.
- A compaction costs **20.1 turns of steady-state work**, measured and not assumed: the edit rate over the first 40 turns after one is 0.0806 against a steady 0.1616, which is 116.7 edits that did not happen over 36 compactions, or `$1.22` each at `$0.0607` a turn.
- That charge is **not** an artefact of context size, which was the one confound left. At a fixed prompt size of 60,000 to 100,000 tokens the edit rate is 0.091 within 40 turns of a compaction against 0.159 beyond it, 57%, and the steady rate barely moves with size at all (0.159, 0.160, 0.194, 0.134 across four size bands).
- Compacting more often is **not** paid for in re-read files either. At four lookback depths the already-read share after a boundary sits 8 to 15 points *below* a control point of the same sessions.
- The threshold only moves the cache-read line, **43.6%** of the bill. Cache writes at 29.1% and output at 27.3% do not move, and running the compactions themselves is about 1% of the bill at every threshold.
- Going up is wrong on both halves at once: 267,000 bills 6.0% more and still wastes work.
- **The controlled round of 2026-10-30 keeps 140,000 rather than moving it to 100,000**, at the citable floor of 10 forks per arm. The candidate is 37.4% cheaper per fork on 34.0% fewer turns, and it loses the round on all three cache bars, writing 9.1% more cache per token its compaction kept and reading a lower share in both follow-ups. The same round is a measured counter-example to the lost-work charge above, which it reverses in direction.

## Method

Each assistant request carries a `usage` block, and the prompt it was billed for is `input_tokens` plus `cache_read_input_tokens` plus `cache_creation_input_tokens`.
Reading those in order gives the real context trajectory of a session: the sawtooth that rises to the threshold and drops at each `compact_boundary`.

The replay takes the **growth each request added**, which is measured, and runs that same sequence of growths against another threshold, inserting a compaction whenever the next growth would cross it.
It prices each line at the published `claude-opus-5-5` row of `references.md` with `1h` cache writes, which is the TTL this login sets.

Two assumptions are stated rather than hidden.

The growth of each request is treated as unchanged by the threshold, and the work lost to a compaction is charged separately below instead of being folded in here.
The cache-write line is taken from the measurement and not modelled, because modelling it from prompt growth reads about 43% of the measured line: the harness rewrites whole blocks rather than only what is new. Writes do not depend on the threshold in this model, so holding them at the measured value is both more accurate and neutral between the rows.

The replay is checked against reality at the threshold that actually ran.
It predicts 32 compactions where 36 happened, and a read line of `$212.07` against a measured `$230.64`, so it runs about 11% low on count and 8% low on that line.
Two things cause the gap. The harness counts more than this measure does, since `preTokens` averages 226,305 against a threshold of 224,999, so it fires a little earlier than `size > threshold` on the billed prompt. And the growth across each boundary is dropped rather than guessed, which holds the replayed sawtooth slightly below the real one.
That is the accuracy to read the tables at: the differences between rows are several times the error, and the absolute dollars are not.

## What a Compaction Leaves Behind

A flat kept share is the wrong model away from the threshold that produced it. 8.07% of 225,000 is 18,286 tokens, but 8.07% of 80,000 is 6,458, which is less than the summary alone needs.
The context after a compaction is a fixed block, the system prompt and the tool schemas, plus a summary of the conversation.

Fitting `post` against `pre` by least squares does not work, and that is worth recording: every real boundary fired at one threshold, so `pre` has almost no spread and a line through it has no leverage.
The first attempt returned a slope of 1.29 and an intercept of −274,470, which predicts a negative context at any threshold under 212,000. It was thrown away.

So the two parts are measured separately instead. The summary's size comes from the `isCompactSummary` record that follows each boundary, at four characters to the token, and the fixed block is what is left of `postTokens` once the summary is taken out.

| Part | Measured |
| --- | --- |
| boundaries with a summary record | 36 of 36 |
| fixed block | 11,760 tokens |
| mean summary | 6,526 tokens |
| summary per token compacted | 0.0288 |

That model predicts 18,249 tokens kept at a threshold of 225,000, which is 8.1% against the 8.07% measured, so it reproduces the rows it was built from.
Away from there it says what a flat share cannot: a compaction at 120,000 keeps 15,221 tokens, which is 12.7%, and one at 80,000 keeps 14,067, which is 17.6%.

Whether the summary itself shrinks with the conversation is not in these rows, so both bounds are run: `proportional` scales it, which favours a low threshold, and `--summary constant` holds it at 6,526 tokens, which favours a high one. Every conclusion below is checked under both.

## The Cost Mix of These Sessions

Measured, not modelled. 8,705 requests, priced at the `claude-opus-5-5` row with `1h` writes.

| Line | Cost | Share |
| --- | --- | --- |
| cache reads | `$230.64` | 43.6% |
| cache writes | `$153.54` | 29.1% |
| output | `$144.27` | 27.3% |
| fresh input | `$0.07` | 0.0% |
| total | `$528.52` | |

One assistant turn costs `$0.0607`, which is the price of a turn of lost work further down.
The threshold moves the first line and nothing else, so **56.4% of the bill is beyond this lever**.

## The Replay

| Threshold | Compactions | Mean prompt | Reads | Compacting | Billed | Against 224,999 |
| --- | --- | --- | --- | --- | --- | --- |
| 120,000 | 66 | 69,177 | `$119.94` | `$6.03` | `$423.78` | −17.8% |
| 130,000 | 60 | 72,000 | `$124.83` | `$5.97` | `$428.62` | −16.8% |
| 140,000 | 56 | 79,727 | `$138.23` | `$6.02` | `$442.06` | −14.2% |
| 170,000 | 44 | 93,137 | `$161.48` | `$5.76` | `$465.05` | −9.8% |
| 200,000 | 37 | 111,211 | `$192.82` | `$5.71` | `$496.34` | −3.7% |
| 224,999 | 32 | 122,316 | `$212.07` | `$5.56` | `$515.44` | base |
| 267,000 | 27 | 140,085 | `$242.88` | `$5.56` | `$546.25` | +6.0% |

The write line of `$153.54` and the output line of `$144.27` are the same in every row, so they are left out of the table and included in the billed total.

Two things here matter more than the totals.

The compacting column barely moves, and it is small: between 27 and 66 compactions it stays near `$6`, about 1% of the bill, because a lower threshold means more compactions of a smaller context and the two cancel.
So the thing the outside sources argue about, the price of one compaction, is not the effect at all.

The mean prompt column is the effect. It falls from 140,085 to 69,177 across the table and the read line follows it almost exactly.
This is the Anthropic quote of `references.md` seen from our side, "a trigger of 90,000 cost 70% less per request than the default": their 70% per request is this column.

## The Lost-Work Charge, Measured Instead of Assumed

Tool calls per request are flat near 0.58 at every distance from a compaction, and output per request is flat near 850 tokens, so the model is equally busy after one. What changes is the mix.

| Distance from the last compaction | Requests | Explore per request | Edits per request | Ratio |
| --- | --- | --- | --- | --- |
| first 5 turns | 180 | 0.111 | 0.011 | 10.00 |
| turns 5 to 15 | 360 | 0.136 | 0.086 | 1.58 |
| turns 15 to 40 | 900 | 0.122 | 0.092 | 1.33 |
| turns 40 to 100 | 2,151 | 0.095 | 0.179 | 0.53 |
| turns 100 and on | 4,501 | 0.091 | 0.153 | 0.59 |
| before the first compaction | 613 | 0.126 | 0.139 | 0.91 |

Explore counts `Read`, `Grep`, `Glob`, `ToolSearch`, `WebFetch`, and `WebSearch`. Edits count `Edit`, `Write`, `NotebookEdit`, and `MultiEdit`.

The edit rate takes about 40 turns to return to its steady value.
Over the first 40 turns after a compaction it is 0.0806 against a steady 0.1616, across 1,440 early requests and 6,652 steady ones.
That is 116.7 edits missing over the 36 compactions, which is **3.24 edits, or 20.1 turns of steady-state work, per compaction**, worth `$1.22`.

This is the charge that LangWatch had to assume. `references.md` records that their optimum moved from 220k to 314k purely by raising it from 28 to 55 steps of lost work.
Measured here it is 20.1 turns, below their lower assumption, so our own rows favour a lower threshold more than their model does.

## The Charge Is Not a Size Effect

The obvious objection is that distance from a compaction and context size are collinear by construction: right after a compaction the context is small, and a session explores before it edits.
If the low edit rate belonged to the small context rather than to the compaction, a lower threshold would make things worse rather than better, so this is the one objection that could flip the answer.

The free test is to hold size fixed and vary distance. Requests before the first compaction of a session are excluded, so both arms are post-compaction work.

| Prompt size | Early requests | Early edits | Steady requests | Steady edits | Early as a share |
| --- | --- | --- | --- | --- | --- |
| under 60k | 713 | 0.062 | 0 | — | — |
| 60k to 100k | 689 | 0.091 | 1,074 | 0.159 | 57% |
| 100k to 140k | 38 | 0.237 | 1,677 | 0.160 | 148% |
| 140k to 180k | 0 | — | 1,858 | 0.194 | — |
| 180k and over | 0 | — | 2,043 | 0.134 | — |

The 60k to 100k row is the only cell with a real sample on both sides, and it is decisive: at the same context size, being within 40 turns of a compaction cuts the edit rate to 57% of the steady rate, over 689 and 1,074 requests.
The steady column also shows no size effect worth the name: 0.159, 0.160, 0.194, and 0.134 across four bands, with the highest rate at a large context and the lowest at the largest.

Two rows carry the collinearity itself. Under 60k there are no steady requests at all, because a session never stays that small for 40 turns, and above 140k there are no early ones. The 148% in the third row rests on 38 requests and is noise.

So the charge survives the test it could have failed. What stays unmeasurable here is lost reasoning: a decision or a plan the summary dropped leaves no trace in a transcript.

## The Curve with the Charge Applied

| Threshold | Billed | Wasted work | Together | Against 224,999 | Charge at which 224,999 wins |
| --- | --- | --- | --- | --- | --- |
| 120,000 | `$423.78` | `$80.39` | `$504.17` | −9.1% | 44.4 turns |
| 130,000 | `$428.62` | `$73.08` | `$501.70` | **−9.5%** | 51.1 turns |
| 140,000 | `$442.06` | `$68.21` | `$510.27` | −8.0% | 50.4 turns |
| 170,000 | `$465.05` | `$53.59` | `$518.64` | −6.5% | 69.2 turns |
| 200,000 | `$496.34` | `$45.07` | `$541.41` | −2.3% | 62.9 turns |
| 224,999 | `$515.44` | `$38.98` | `$554.42` | base | — |
| 267,000 | `$546.25` | `$32.89` | `$579.14` | +4.5% | 101.5 turns |

The last column is how wrong the charge would have to be for the old 224,999 to win a row back: every row needs at least 2.2 times the measured 20.1 turns, and most need more than LangWatch's upper assumption of 55 steps.
The column is not monotone, because each entry is a ratio of two small differences and the compaction count is an integer.

## The Fine Sweep, and How Robust the Minimum Is

| Threshold | Compactions | Billed | Wasted work | Together |
| --- | --- | --- | --- | --- |
| 110,000 | 73 | `$413.00` | `$88.91` | `$501.92` |
| 120,000 | 66 | `$423.78` | `$80.39` | `$504.17` |
| 130,000 | 60 | `$428.62` | `$73.08` | **`$501.70`** |
| 140,000 | 56 | `$442.06` | `$68.21` | `$510.27` |
| 150,000 | 52 | `$446.06` | `$63.34` | `$509.40` |
| 160,000 | 47 | `$457.37` | `$57.25` | `$514.62` |
| 170,000 | 44 | `$465.05` | `$53.59` | `$518.64` |
| 180,000 | 42 | `$476.40` | `$51.16` | `$527.56` |

The bottom is flat and slightly ragged, which is the integer compaction count showing through: 110,000 and 130,000 are within `$0.25` of each other.
Read as a band rather than a point, the minimum is 110,000 to 135,000.

The band moves with the two things that are not measured, so both were swept at a 5,000 step to see how far:

| Charge per compaction | Summary model | Cheapest | Within 1% |
| --- | --- | --- | --- |
| 0 turns | proportional | 80,000, the sweep floor | 80,000 |
| 10 turns | proportional | 90,000 | 80,000 to 105,000 |
| 20.1 turns, measured | proportional | 130,000 | 95,000 to 135,000 |
| 20.1 turns, measured | constant | 140,000 | 105,000 to 145,000 |
| 30 turns | proportional | 130,000 | 125,000 to 160,000 |
| 40 turns | proportional | 160,000 | 130,000 to 185,000 |
| 40 turns | constant | 170,000 | 140,000 to 185,000 |

Three readings follow. The optimum is nowhere near 224,999 under any assumption tested. It is sensitive to the charge, which is why the charge had to be measured rather than assumed. And a single value that sits inside every band from the measured charge up to twice it, under both summary models, is **140,000**.

## What Changed on This Evidence

`HANDOFF_TRIGGER_TOKENS` is **140,000**, down from the 200,000 the user set earlier on 2026-10-28 and from the 225,000 of the archived tree.
The user asked on 2026-10-28 to keep dropping to a more precise value, and this is it: not the −9.5% point at 130,000, but the value that stays within 1% of optimal across the whole plausible range of the one term that is still assumed.

The derived values come out exact at 140,000, which is a second reason to prefer it over 130,000:

| Value | At 140,000 | At 130,000 |
| --- | --- | --- |
| `AUTOCOMPACT_PCT` | `50.0000` | `46.4285` |
| the harness fires at | 140,000 | 129,999 |
| `HAIKU_AUTOCOMPACT_WINDOW` | 200,000 | 213,846 |
| which fires at | 90,000 | 89,999 |

The Haiku row still clears its price step: 90,000 is under the 100,000 at which Haiku 5.5 input reprices, and 90,000 is the trigger Anthropic's own cost page supports (`references.md`).

What would move it again. If the paid run of task 10.5 finds the charge is nearer 10 turns than 20, the value belongs near 100,000. If it finds 40, the value belongs near 170,000. Nothing in these rows supports going back above 200,000.

No saving is claimed as delivered. The percentages are a replay of past work, not a bill, and 140,000 has not yet run a session.

## The Idle Lever Is Settled, Negatively

`CLAUDE_CODE_SLEEP_COMPACT` compacts an idle session before the prompt cache expires, which would make a late return read a small summary instead of the whole window (`references.md`).
Whether that bet pays depends on how often a session is left idle longer than the cache lifetime, and on this login it almost never is.

Of 8,702 gaps between consecutive requests, 11 are over 5 minutes, 4 are over 30 minutes, and **2 are over an hour**, which is 0.02%.
The median gap is 3.0 s and the 90th percentile is 13.6 s.

So sleep compaction would fire on sessions that are about to be resumed inside the cache lifetime anyway, paying a compaction and discarding most of the context for nothing.
It stays off, and that is now a decision with rows behind it rather than an open key.

## Re-reading Is Not What Compacting Costs

The complaint that a compaction fires at the wrong moment predicts that the session goes back and re-reads what it lost. It does not happen.

For each boundary the files read before it are collected, and the file reads in the 25 turns after it are checked against that set.
The control takes random points of the same sessions more than 25 turns from any boundary, 20 per boundary.

The first run used a 40-turn lookback, which is a defect: a compaction discards about 200,000 tokens, far more than 40 turns of history. The measure is repeated at four depths and the finding holds at every one, with both arms at the same depth in each row.

| Lookback | Point | Reads | Already read | Points with any |
| --- | --- | --- | --- | --- |
| 40 turns | after a compaction | 165 | 24.2% | 14 of 36 |
| 40 turns | control, 720 points | 4,500 | 31.8% | 440 of 720 |
| 100 turns | after a compaction | 165 | 31.5% | 17 of 36 |
| 100 turns | control, 720 points | 4,500 | 44.7% | 507 of 720 |
| 250 turns | after a compaction | 165 | 38.8% | 21 of 36 |
| 250 turns | control, 720 points | 4,500 | 54.5% | 547 of 720 |
| all history | after a compaction | 165 | 52.7% | 24 of 36 |
| all history | control, 720 points | 4,500 | 68.0% | 602 of 720 |

At every depth the post-compaction share sits below the control, by 8 to 15 points, and the read rate itself is lower: 4.6 file reads in the 25 turns after a boundary against 6.3 at a control point.
The control arm is a seeded draw, so it was re-run at seeds `11`, `7`, and `99`: its share moves by at most 1.5 points, a fraction of the gap.

The honest reading is narrow. It says the summary is good enough that the session does not go back for the files, which is one of the bars of `docs/evidence/code-compaction-probe.md`, "The Bars", measured for the first time on real work instead of probe forks. It does not say that nothing is lost; the charge above is what is lost.

## The Causal Arm

The charge above is an observational difference, and the size test removes the one confound that could flip its sign but not the rest.
The controlled version forks one prepared base session into two that differ only in the compaction threshold, `ref` at the 140,000 that claudetto ships and `alt` at a candidate, and takes turns to completion as the bar.
`claudekit/probe/` runs it. What follows is five rounds, four smoke rounds on 2026-10-29 and the citable round of 2026-10-30, in the order they ran.

The first round measured the fixture rather than the threshold, and said so rather than reporting a number.
A base session of 30,000 tokens of fixture ends at a context of 76,033, 76,176, and 76,546 tokens across three runs, about 2.54 times its target.
Twenty forks then ran to completion in 3 to 10 turns with **`compactions: 0` in every one**, so the verdict was `No winner. 30k: no fork compacted, so the threshold bar tests nothing`, which is the gap rule of the probe working as designed.
Nothing else was wrong with them: `rereads`, `redone`, and `broken` were 0 across all twenty, and all twenty finished the task.

Why no fork compacted was undiagnosable from that record, because it read `compact_metadata.post_tokens` out of the boundary event and no context at all.
The fork record now carries `peak`, the largest context any of its requests was billed for, and the no-compaction gap names it.
A six-fork round then peaked at 79,446 to 80,949 tokens from a base of 76,546, which is **2,900 to 4,400 tokens of growth from the fork's own work**, and barely more at 9 turns than at 4: about 250 tokens a turn.
So the fork was 19,000 tokens short of the lower arm and 59,000 short of the higher one, and no run count would have closed that gap.

The fixture had a second shortfall of the same kind. It left the fork 3 tasks, which it finished in 4 to 9 turns, while the charge above is defined over a 40-turn recovery, so the quantity could not have shown even if an arm had compacted.

Enlarging it to 15 reserved notes of about 6,000 tokens, one per fork task, did not work either, and the two forks that ran on it are worth recording because they correct an assumption that is easy to carry into a probe.
**A task that asks a session to read a file does not make it read the file.** Each note task needed one line of its note, and a session reaches one line with a search instead of a read: the two forks grew by 6,000 and 10,283 tokens against the 90,000 the notes hold.
**And a ticked box is not evidence that the work was done.** One of those two forks ticked all 21 boxes in 4 turns, which the probe scored as a finished task, because `next` reads the task list and nothing checked the files.

Both are fixed at their cause rather than by asking harder.
The fork's prompt now carries the same instruction the base session obeys, to read a `later/` file with one `Read` call, which is the form that produces a 77,000-token base in the first place.
And each note carries a six-digit code that is in that note and nowhere else, which the note's module has to return, so `skipped` counts the note tasks whose module is missing or holds the wrong code. It is a bar of the verdict beside the planted constraints, and a round where no fork wrote a single correct module reaches no verdict at all.
The three planted constraints come after every note task, so a fork meets them on the far side of its compaction and the summary has to have kept them.

### The Round That Compacted but Compared Nothing

The enlarged fixture then ran the citable round: 20 forks, 10 per arm, from a base of 78,603 tokens, at a cost of 20.73 in `total_cost_usd`.
Every fork compacted, every fork finished the task, and the report read `alt meets each bar`.
**That verdict is void, and the round is the reason the probe now has a gap rule for it.**

The forks' own boundary records say why. 19 of the 20 fired their first compaction between **176,582 and 176,661 tokens, mean 176,621**, with no difference between the arm set to 140,000 and the arm set to 100,000.
A threshold that is never the binding number cannot be what the bars measured.

The cause is a harness property worth stating plainly: **the context is checked between turns, not between tool results.**
The fork prompt asked for the `later/` notes up front, so a fork issued about 15 parallel `Read` calls in one turn, and their results joined the context together.
That one unchecked step carried a fork from about 79,000 tokens to 176,620, which is past 140,000 and past 100,000 at the same moment, so both arms compacted at the same point for the same reason.
The billed requests hid it: the last request before the boundary was billed 79,714 tokens against the 176,591 the harness counted, because the pending results are counted before they are sent.

One fork is the control that confirms the mechanism rather than only the defect. `alt` run 7 did not batch its reads. It fired once, at **112,126 tokens**, which is where a 100,000 threshold should fire, and then finished the same work in 24 turns for **0.492 against the 1.05 mean of the other 19**.
The other 19 each compacted twice, because the first compaction left about 100,000 tokens and the re-read notes carried the prompt back to between 201,243 and 205,335 before the second one cut it to about 4,500.
So the price of a fork in this fixture is set by how many compactions a burst forces, and **the second compaction cost about 0.55, over half of the fork**.

Three fixes follow, all in `claudekit/probe/`.
`firstPre` and `firstPost` now record `compact_metadata.pre_tokens` and `post_tokens` of the boundary event, which is the harness's own count and the number a threshold is compared with; before this the probe read only `post_tokens` and scored `peak`, the largest billed request, which in a fork that compacted is the prompt re-sent afterwards and not the high mark before it.
The verdict gains a gap: when the arms' mean first compaction sits within 5% of the lower one, the round reaches no verdict and says that the threshold did not decide the compaction.
And the fork prompt now asks for the note of the task at hand and forbids reading ahead, so the notes join the context one at a time and the two thresholds are crossed at different tasks.

### The Round Where the Arms Separated

With the batch read out of the prompt, a smoke round of 3 forks per arm from a base of 78,687 tokens billed 3.64 in `total_cost_usd` and the arms came apart at last.
**Every `alt` fork fired its compaction at 100,595, 99,952, and 99,992 tokens against its 100,000 threshold**, and the one `ref` fork that compacted fired at 139,532 against its 140,000.
The overshoot is gone: 600 tokens where the batched round overshot by 36,600.
So the threshold does what claudetto's own model of it says, and the earlier round's 176,600 was the fixture and nothing else.

| Arm | Threshold | Forks that compacted | First compaction | Cost per fork | Turns |
| --- | --- | --- | --- | --- | --- |
| `ref` | 140,000 | 1 of 3 | 139,532 | 0.84, 0.46, 0.49; mean 0.59 | 88, 76, 86 |
| `alt` | 100,000 | 3 of 3 | 100,595, 99,952, 99,992 | 0.45, 0.54, 0.47; mean 0.49 | 73, 87, 87 |

The round still reaches no verdict, and the reason is the fixture again: **2 of 3 `ref` forks finished the task without ever reaching 140,000**, peaking at 113,696 and 114,524 tokens.
An arm that holds such a fork can be read on no bar of this probe, because a fork that did not compact has no post-compaction cache figures at all, so the round's own report says `ref has 2 of 3 forks that did not compact, so the threshold and the cache bars test nothing`.
Read as zeros instead, which is what the verdict did before this round, those two forks turned into three cache problems scored against `alt`, a verdict about the thresholds built out of forks where one threshold never fired.

Why 15 notes of about 6,000 tokens did not carry a fork past 140,000 is a measured property of the model and not of the fixture size.
**A fork reads the note of a task with `Read` and an `offset` or a `limit` 14 to 28 times per fork**, against 13 to 20 whole reads, so it takes the one line it needs off the top of a note for about 20 tokens rather than the note's 6,000.
The growth of a fork is therefore **2,400 tokens per note task**, counting the task's own writes and test runs, and not the 6,000 the note holds: the forks ended between 113,696 and 121,000 tokens from a base of 78,687.
This is the third form of the same lesson on this page, after a task that asks for a read and a ticked box that is not work: **a fixture cannot buy context by putting it in a file, only by giving the fork work that must pass through the context.**

Two defects of the probe's own reporting that this round exposed are fixed, both with a test that fails first.
A fork that did not compact has NaN for the measures that only a compaction leaves, `JSON.stringify` writes a NaN as `null`, and `claudekit/probe/round/saved.ts` required those keys to be numbers, so a replay of this round dropped 2 of the 3 `ref` forks and printed the arm at 0.84 where the live run printed 0.59.
And the no-compaction gap tested the mean of an arm rather than its forks, so it fired only when no fork of either arm compacted; it now names the count per arm, which is what caught this round.

### The Round Where Every Fork Compacted, and Two Bars That Read the Wrong Thing

A fourth smoke round, later on 2026-10-29, is the first where **every fork of both arms compacted exactly once**, so the fixture shortfall of the round above is gone.
3 forks per arm from the same fixture, `5.23` in fork cost above the base, and every fork finished the task with `broken`, `redone`, `untested`, and `rereads` all 0 and `skipped` at 12 of 25 notes in all six.

| Arm | Threshold | First compaction | Context left | Cost per fork | Turns |
| --- | --- | --- | --- | --- | --- |
| `ref` | 140,000 | 140,828, 141,339, 140,102; mean 140,756 | 6,051, 6,177, 5,712; mean 5,980 | 0.88, 1.19, 1.16; mean 1.08 | 115, 117, 138; mean 123.3 |
| `alt` | 100,000 | 100,107, 100,123, 100,128; mean 100,119 | 11,472, 11,568, 11,275; mean 11,438 | 0.86, 0.54, 0.59; mean 0.67 | 138, 54, 59; mean 83.7 |

The arms separated by 40.6% on the compaction point, so the same-point gap does not fire, and `alt` is 38.2% cheaper on 32.2% fewer turns.
This is the first round of the probe whose bars read the threshold. It still reaches no verdict, and working out why found two defects in the verdict rule itself rather than in the fixture.

**A fork can compact and still save no follow-up to read.** `measure` takes the read share of the second and third requests after the boundary, and `ref` run 1 compacted near the end of its last step, so it had one request after the boundary and `shares` came back empty.
`share` took that fork into the mean as a NaN, which made both share bars unreadable for the whole arm, and because the bars are written as negations so that a NaN fails, the round reported `alt reads a lower share in follow-up 1` and `follow-up 2`.
Those two lines were false: `alt` saved a share in all three forks, at 0.862 and 0.971.
`share` now drops the forks that saved none, the way `firedAt` already dropped the forks that did not compact, and the round is held to its own run floor on this bar: an arm that saved a share in fewer than 3 forks makes the bar a gap, named before any arm is blamed for it.
The standing case for the rule is round 8 of `docs/evidence/code-compaction-probe.md:414`, where no fork of one arm measured the second follow-up in either of two rounds.

**The first cache write is not comparable between arms in absolute tokens.** It scales with the context the compaction left, and that is the quantity the threshold moves: all six forks of this round wrote between 1.740 and 1.856 tokens of cache per token kept, while `ref` was left a mean of 5,980 tokens and `alt` 11,438.
So the absolute bar read `alt` 98.3% above `ref`, and the rate reads it 3.6% above.
The 98.3% is the two summaries differing in length and not a cache cost of the threshold, so the bar now divides by the context the compaction left.

| Arm | First cache write | Context left | Per token kept |
| --- | --- | --- | --- |
| `ref` run 1 | 10,531 | 6,051 | 1.740 |
| `ref` run 2 | 11,053 | 6,177 | 1.789 |
| `ref` run 3 | 10,477 | 5,712 | 1.834 |
| `alt` run 1 | 21,225 | 11,472 | 1.850 |
| `alt` run 2 | 21,438 | 11,568 | 1.853 |
| `alt` run 3 | 20,926 | 11,275 | 1.856 |

Both fixes have a test that fails first, in `claudekit/probe/round/__tests__/verdict.spec.ts`, and re-reading the saved round with `--report` is free and makes no call.
What the corrected rule says about this round is narrower than the old one and is not a result:

```text
No winner. 90k: ref saved a read share for follow-up 1 in 2 forks, needs 3, so that bar tests nothing;
90k: ref saved a read share for follow-up 2 in 2 forks, needs 3, so that bar tests nothing
```

Three claims are worth separating, because the rest of this section would otherwise read as a win for `alt`.
The cost and turns bars are now read against a threshold that decided the compaction, and `alt` meets both.
The share bars are **unresolved**, not met: over the forks that saved one, `alt` reads 0.862 in follow-up 1 against `ref`'s 0.943, dragged by `alt` run 2 at 0.676, and two forks is below the floor either way.
And the cache-write bar still goes against `alt` after the correction, by 3.6% rather than 98.3%, which three forks per arm cannot separate from noise.

So the blocker that task 10.5 names is half cleared. The cache bars are equalized on the context each compaction left, which is what made the absolute comparison meaningless, and the false diagnosis is gone.
What is not cleared is the run count: the share and cache-write bars both now turn on differences of a few percent, and only the citable 10 forks per arm can say whether they are real.

### The Citable Round: 100,000 Is Cheaper on Both Bars That Matter and Still Does Not Win

The citable round ran on 2026-10-30: **20 forks, 10 per arm**, from one base session of 96,420 tokens, with `--dir /tmp/claudetto-probe-citable`.
It billed `19.59` in the units of `total_cost_usd`, `0.78` for the base and `18.81` for the forks, against the `18.85` the dry run priced it at, so the recalibrated `FORK_USD` of `0.92` and `BASE_USD` of `0.45` were 3.9% low.
That is **about 0.7% of the weekly limit** of this Max 20x login at the `$29.70` a weekly percent that `docs/window-weights.md:55` prices, inside the 0.4% to 0.8% band the dry run quoted.
`10 runs per arm meets the citable floor (10)`, so this page may cite it as a run count, which no earlier round could.

| Arm | Threshold | Forks that compacted | First compaction | Context left | Cost per fork | Turns |
| --- | --- | --- | --- | --- | --- | --- |
| `ref` | 140,000 | 9 of 10 | mean 140,644 | mean 6,496 | mean 1.1568 | mean 123.4 |
| `alt` | 100,000 | 10 of 10 | mean 103,229 | mean 11,561 | mean 0.7239 | mean 81.4 |

**`alt` meets all seven bars, five of them trivially.** It is **37.4% cheaper per fork** and needs **34.0% fewer turns**, and `broken`, `untested`, `redone` and `next` read the same value in all 20 forks, with `skipped` at 12 of the 25 notes in all 20 and `rereads` at 1 in a single `ref` fork.
So the two bars carrying any signal are cost and turns, and both go to `alt` at the citable floor.
The arms separated by 36.4% on the compaction point, so the same-point gap does not fire, and the overshoot is small in both: `alt` fires 3.2% above its threshold and `ref` 0.5% above its own.

**The round reaches no verdict, and the rule that stops it is the fixture one more time.**

```text
No winner. 90k: ref has 1 of 10 forks that did not compact, so the threshold and the cache bars
test nothing (peak context 134631 tokens)
```

`ref` run 10 finished the same work in 58 turns and peaked at 134,631 tokens, 5,369 short of its own threshold, so it has no compaction point and no post-compaction cache figures.
This is the predicted case rather than a surprise: the smoke round above read 2 of 3 `ref` forks finishing without compacting, and the free check that argued for buying this round predicted about 7 readable `ref` forks out of 10. Nine were readable, which is better than the prediction, and the gap rule is an all-or-nothing test on the arm, so one fork still stops it.

**Setting that fork aside does not give `alt` the round, which is why the gap is not what to fix.**
Re-reading the 19 forks that did compact is free, and the bars then read:

```text
No winner. 90k: cache problem, alt writes more cache per token of context its compaction left;
90k: cache problem, alt reads a lower share in follow-up 1;
90k: cache problem, alt reads a lower share in follow-up 2
```

| Cache bar | `ref` | `alt` | Against `alt` by |
| --- | --- | --- | --- |
| First cache write per token kept | 1.7390 | 1.8966 | 9.1% |
| Read share, follow-up 1 | 0.9510 | 0.9411 | 1.0 point |
| Read share, follow-up 2 | 0.9712 | 0.9003 | 7.1 points |

At 3 forks per arm the cache-write bar read 3.6% against `alt` and the section above called that inseparable from noise. At 10 forks per arm it reads 9.1%, in the same direction, so the citable round answers the question it was bought for: **the difference is real and not noise.**
The follow-up 2 share is the clearest of the three, and it is not an artefact of one fork: `alt` reads below `ref` in 9 of its 10 forks on that bar.
Two `alt` forks drag it hardest, run 1 and run 4 at 0.685 and 0.687, and `alt` run 5 is the only fork of the round that compacted **twice**, which also makes it the dearest `alt` fork at 1.20.

**So the threshold stays at 140,000, and the round is the evidence for keeping it rather than an absence of evidence.**
The decision rule of the `compaction-path` spec requires a lower mean cost, no worse result on each bar, and no cache problem; `alt` fails the third clause on all three of its bars at the citable floor.
What the round establishes against this page's own charge model is worth separating from that verdict, because the two point opposite ways.

**The lost-work charge does not reproduce in the controlled arm, and the direction is reversed.**
The observational charge of 20.1 turns predicts that the arm compacting earlier loses more work and so needs more turns for the same task. `alt` compacted 37,415 tokens earlier, 103,229 against 140,644, and finished the identical work, 13 of 25 note tasks and the last task ticked in every fork, in **81.4 turns against 123.4**.
Nothing in the fork record shows the lost work the charge is built from: `redone` and `rereads` are 0 in all 10 `alt` forks.
That is one fixture, one task shape and one base size, so it does not overturn a charge measured over 36 real compactions in three transcripts; what it does is put a measured counter-example beside it, which the "Limits" section below now names.

**One property of the verdict code that this round exposed and that is deliberately left alone.**
`writeRate` does not drop the forks that did not compact, the way `firedAt` and `share` were both corrected to do, so over the whole round it reads NaN for `ref` and the bar fails as a negation.
It is unreachable through `verdict` today, because the no-compaction gap fires before any bar is read, and the round above shows the bar fails on the rate itself at 9.1% and not only on the NaN, so the verdict does not turn on it.
It is recorded here rather than patched, because changing the rule after seeing a paid round's data is how a measure gets reshaped until it passes; the time to make `writeRate` consistent with its two neighbours is a change that also decides whether a non-compacting fork is a gap or a legitimate outcome of a high threshold, and that question is open.

## Reproducing This

```sh
just compaction-cost
just compaction-cost --sweep 110000,180000,10000
just compaction-cost --sweep 80000,200000,5000 --charge 40 --summary constant
just compaction-probe
just compaction-probe --report --dir /tmp/claudetto-probe-citable
```

The first form prints every table on this page. The second adds the sweep. The third is the robustness check: `--charge` overrides the measured turns and `--summary constant` switches the bounding model.
The fourth is the causal arm above, and it is free and makes no call until `--run` is added, which prices the round first.
The fifth re-reads the saved forks of the citable round and reprints its verdict, which is free and makes no call, so every figure of that section can be checked without buying the round again.
The tool reads `~/.claude/projects/*/*.jsonl` only, keeps no message text, and makes no model call.
`bun test` covers it: 23 tests in `claudekit/compaction-cost/__tests__/` check the loader, the kept model, the replay, the seeded control draw, and the flag parse against a fixture the test writes and arithmetic written out in the test.

A re-run prints slightly larger counts than the tables above, because the session doing the measuring keeps compacting into the same files: a run after these tables read 37 boundaries and 8,820 idle gaps against the 36 and 8,702 here.
That drift is the sample growing and not a defect, and it moves the means by well under 1%, as the same effect did in `docs/evidence/compaction/boundaries.md`.

The first version of this page came from temporary scripts that were deleted, and rebuilding the method in the tree changed numbers as well as preserving them: the predicted compaction count at the threshold that ran went from 39 to 32, the kept model was replaced, and the optimum moved from 146,000 to the 110,000 to 135,000 band.
That the first numbers could not be re-derived is the reason the tool is in the tree now.

## Limits

Three sessions of one login, two projects, inside two days.
The sessions ran `claude-opus-5`, and every price is the published `claude-opus-5-5` row, the nearest `references.md` holds.
The per-request growth and the kept model both come from the single threshold that actually ran, and the summary's behaviour away from it is bounded rather than known.
The lost-work charge is an observational difference. The size test above removes the confound that could have flipped its sign, and the controlled run has now been made: it does not reproduce the charge and reverses its direction, with the arm that compacted 37,415 tokens earlier finishing the same work in 34.0% fewer turns and showing no re-read or redone work at all. That is one fixture at one base size, so the charge stands on its 36 real compactions while the counter-example stands beside it, and neither is settled by the other.
Requests made by subagents are counted with the rest, because they are billed with the rest.
