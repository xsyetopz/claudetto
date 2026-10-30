# Dossier: The Early Dated Folders

Notes from `external/2026-09-29` through `external/2026-10-08`, read 2026-10-27 for the `claudetto-restart` plan.

Every item is a stranger's post or comment. `self-report` means the author gave no method.
`measured` means the author gave a method, a command, or a table. Nothing here is verified by this project.
These folders are the oldest part of the dossier, so a claim in them may be overtaken by a later release.
The project runs Claude Code `2.1.311`.

## Headless against Interactive Metering

- One author, one refactor task, Claude Code Pro, Opus 5 at `medium`. Interactive runs took `1.6`, `1.7`, and `1.8` percent of the 5-hour limit per dollar. The Python Agent SDK took `5.2` per dollar. `claude -p` took `5.1` to `5.5`. The post names no Claude Code version. `external/2026-09-29_p2/export-Measured it- headless Claude Code (Agent SDK - claude -p) eats ~3x more of the 5-hour limit per toke.jsonl`, self-report.
- The thread favors caching as the cause. That is a theory in the thread, not a measurement. Same file, self-report.

## Subagent Cache TTL

- Subagents default to a 5-minute prompt cache, while a main session on a subscription gets 1 hour. `"subagentPromptCacheTtl": "1h"` needs Claude Code `2.1.242` or newer. A 1-hour write costs more than a 5-minute write, so the setting pays off only when a subagent is reused. `external/2026-10-07_p2/export-Subagents use a 5-min cache by default-!- ...jsonl`, self-report.
- Opus 5.5 prices in the same post: `$4` input, `$5` for a 5-minute write, `$8` for a 1-hour write, `$0.20` for a cached read. A full reprocess is "about 25x the cost of a cached read". Same file, self-report.
- Fable 5.1 prices in the same post: `$10` input, `$12.50` for a 5-minute write, `$20` for a 1-hour write, `$0.25` for a cached read. Same file, self-report.

## Haiku 5.5 as a Subagent

- Prices given: Haiku 5.5 `$0.10/$0.50` for a prompt up to 100K and `$0.50/$2.50` above it, against Opus 5.5 `$4/$20`. The post says Explore no longer runs on Haiku and uses the main model, and that the `haiku` alias points to Haiku 5.5 since Claude Code `2.1.293`. `external/2026-10-08/export-Haiku 5.5 is 40x cheaper than Opus 5.5...jsonl`, self-report.
- The same post names `CLAUDE_CODE_SUBAGENT_MODEL` set to `"haiku"` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` set to `"1"`, and says Explore and Plan ignore the first without the second. Same file, self-report.
- An author could not keep Haiku 5.5 under 100K tokens in agentic use, and a commenter says the full tool stack is `30k` tokens or more. This conflicts with the advice to route subagents to Haiku. Both are recorded, with no winner. `external/2026-10-08/export-Haiku 5.5 token usage.jsonl`, self-report.

## A Plugin Benchmark across Effort Levels

- Cost per task against no plugin, for the `Occam` plugin: Opus 5.5 at `max` `-51%`, Sonnet 5.5 at `max` `-55%`, Opus 5.5 at `medium` `-11%`, Sonnet 5.5 at `medium` `-3%`, which the author marks as within noise. For the `Ponytail 4.10` plugin: Opus 5.5 at `max` `-26%`, Sonnet 5.5 at `max` `-9%`, Opus 5.5 at `medium` `+11%`, Sonnet 5.5 at `medium` `+26%`. `external/2026-09-29_p3/export-I benchmarked a 30-line Claude Code plugin on Opus 5.5 and Sonnet 5.5...jsonl`, self-report.
- The same post gives two rule-load figures that disagree with each other. One says `Occam` is "about 650 tokens" at session start. Another says it "loads about 900 tokens per session", and `Ponytail` "about 3,100". Both are recorded. Same file, self-report.
- The author says the costs are list-price estimates from session metadata, over 9 tasks and 2 seeds. No Claude Code version is named. Same file, self-report.

## Context Re-reads

- An author priced 6 months of transcripts at API rates and got `20%` useful work and `56%` re-reading context. "Almost half" of the calls carried over 200K tokens. The post suggests `CLAUDE_CODE_AUTO_COMPACT_WINDOW` set to `"200000"`. `external/2026-10-07_p2/export-56% of my Claude Code usage was Claude re-reading the conversation.jsonl`, self-report.
- The author's edit says the re-reads are priced at the cache-read rate, so the `56%` already holds the discount. Same file, self-report.
- A moderator summary in the same thread says the analysis prices cached tokens at the full rate and so misleads, and that `/compact` invalidates the cache. The author and the summary disagree, and this records both with no winner. Same file, self-report.

## Items Verified in the Second Pass

A second pass on 2026-10-27 reopened each file below and confirmed every number. The full quotes are in `docs/dossier/exports/part-2.md`, under "Verification of the Unconfirmed Claims". Three attributions were wrong in the first pass and are corrected here. Each remains a self-report.

- `CONFIRMED`. Opus 5.5 at `high` with a Fable 5.1 advisor scored "90.1% at $2.92 per attempt", and Opus 5.5 at `xhigh` scored "91.1% for $4.11 per attempt (one attempt per task)". The post quotes Anthropic's own docs for both. `external/2026-10-02/export-PSA- you don't need Fable for everything. Set it as your -advisor instead.jsonl`. The second copy in `external/2026-10-01_p2/` was not compared.
- `CONFIRMED` with a correction. "~25,027 tokens" and "~9,353 tokens" are both from the commenter `Key_Raspberry_4395`, not the post author. "5,946 token savings" appears once, in a comment by `Deep_Ad1959`, with no method behind it in the file. `external/2026-10-02/export-Don't use Claude Code's Default System Prompt.jsonl`.
- `CONFIRMED` with a correction. The cut "from roughly 61,000 tokens to about 21,000 tokens" is from the commenter `nyczAcer`, not the post author. `external/2026-10-04/export-Context window instantly filling 50%...jsonl`.
- `CONFIRMED`. "Medium for 98% of things. High for the other 2%.", from the commenter `xxparrotxx`. `external/2026-10-03/export-What's the ideal Opus 5.5 reasoning effort...jsonl`.
- `CONFIRMED`. "auto compaction turned on at 250k", from the commenter `MassiveBoner911_3`. The docs that commenter cites were not checked. `external/2026-09-29/export-Been working for 5 hours...jsonl`.
- `CONFIRMED` with a correction. `85k/200k` (43%), `38k/200k` (19%), and the MCP load to `133k/200k` (66%) are the post author's. The drop from `42%` to `9%` with auto-compact off is a reader's comment by `shanksy8`, not the author's. `external/2026-10-07_p2/export-My Claude Code Context Window Strategy (200k Is Not the Problem).jsonl`.
- `CONFIRMED`. "Calls over 100k: 145 of 164 (88%)" sits in records 9 and 10, and "99.0% of Sonnet tokens and 81.3% of Opus tokens ran inside subagents" sits in record 17. `external/2026-10-08/export-Haiku 5.5 token usage.jsonl`.
- `CONFIRMED` as a disagreement with no winner. The two posts agree on `66.4%` for Opus 5.5 and on the per-token prices. The first compares Sonnet 5.5 at `70.6%` with Opus 5.5 at `66.4%`. The second says that pairs Sonnet at `max` with Opus at `xhigh`, and that at the same `xhigh` Sonnet scores `61.5%`. Neither gives a method. `external/2026-09-29/export-Sonnet 5.5 beats Opus 5.5 at coding...jsonl` and `external/2026-09-29_p2/export-Sonnet 5.5 vs Opus 5.5- the Terminal-Bench -win-...jsonl`.

## Coverage

Read in this pass: 6 files, the first 3 records of each.
Read in the second pass of 2026-10-27: each file of the section above, reopened and confirmed. Still not read: `external/2026-10-07/claude-llm-agent-failure-dossier.md`, whose first 60 lines hold no cost number.
Out of scope by the brief: the top-level `external/export-*.jsonl` files, `external/cc-bundle/`, and every folder dated `2026-10-11` or later.

## Versions Named in These Posts

`2.1.242` for the subagent cache setting, and `2.1.293` for the `haiku` alias. `4.10` is a plugin version, not a Claude Code version.
