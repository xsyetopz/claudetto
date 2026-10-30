# Dossier, Late September Gap C

Scope: the last third of `external/2026-09-29` to `external/2026-10-08`. That is `2026-10-07` (25 files), `2026-10-07_p2` (21 files) and `2026-10-08` (9 files), 55 in all. Four were already read and are skipped. The other 51 were read in full, including all comments. Every file but one is a Reddit thread capture, and its post and comments are `self-report`. No bullet below is promoted to `measured` for a Reddit author, even when the author states a method; the bullet then says "method stated". The one `measured` use is a table in the failure dossier. The project runs Claude Code `2.1.311`. Only a few files name a version, and the bullet carries it.

Format of each bullet: the claim, the file path, the question number, the label, and `post` or `comment`. The failure dossier is a document and not a Reddit thread, so its bullets say `document` and give a line number. Paths below are exact file names under the folder shown. `Q1` to `Q9` follow the headings in order.

## 1. Effort per Model

- `claude-opus-5-5`, per work kind. A commenter runs `medium` as the daily driver and bumps it when the task is underspecified, with review on `high`. `external/2026-10-07/export-Claude Opus 5.5 Effort Level.jsonl`. Q1. `self-report`. `comment`.
- Same thread, a split by share of tasks: "Medium/low for 75% of tasks, high for 20%, <5% above high." Another commenter always runs `high` and "never hits limits". Disagreement, no winner. Same file. Q1. `self-report`. `comment`.
- Same thread, pro for `high` as the parent with `low` for task agents. Another commenter orchestrates on `high`, Sonnet 5.5 at `medium`, and Haiku for "stupid jobs". Same file. Q1. `self-report`. `comment`.
- Same thread, a method hint: compare output tokens per task on `medium` and `high`. The commenter says their transcripts showed a big gap in output while input barely moved, and gives no numbers. Same file. Q1. `self-report`. `comment`.
- Opus 5.5 con on cost: a commenter "tapered my effort to med and high modes because I was going thru all my usage in < 12 hours on a 20x plan". Another says Opus on `high` exhausts a 20x plan. Another prefers "opus low and more concurrency". `external/2026-10-07/export-20$ Claude Code subscription- How do you genuinely exhaust your weekly usage-.jsonl`. Q1. `self-report`. `comment`.
- Opus 5.5 `medium` con: "a few sentence feature request ran into more than 8M tokens PRs e2e". `external/2026-10-07/export-I find the Claude app much smarter than Claude terminal.jsonl`. Q1. `self-report`. `comment`.
- Opus 5.5 cost per call by effort: "low 0,45$, medium 0,85$ and high 2,35$". The commenter adds "I don't remember exactly". `external/2026-10-07_p2/export-What effort are you running Opus 5.5-.jsonl`. Q1. `self-report`. `comment`.
- Same thread, a con on `high` and above: it "goes rogue", so subagents are only for research. Another commenter started on `medium` at launch and is now leaning back to `high`. Same file. Q1. `self-report`. `comment`.
- Same thread, Sonnet 5.5 split: one commenter says it consumed usage rapidly, another says it implements most plans with more room left. Disagreement. Same file. Q1. `self-report`. `comment`.
- Same thread, `xhigh` to plan and `medium` or `high` to implement, as one commenter's recipe. A Max5 user finished the week at 98% on Opus 5.5 `xhigh`. Same file. Q1. `self-report`. `comment`.
- `claude-sonnet-5-5` against `claude-opus-5-5` on SVG editing, which is not strictly coding. The post says Sonnet 5.5 `High` beat Opus 5.5 `High`. Method stated by the post author: each variant ran once on 19 cases, "18 vs 16 is two edits", and Sonnet was cheaper on 17 of 19 and about half the total. The author says `max` was worse than `high` and cost more. `external/2026-10-07_p2/export-I was underestimating Sonnet 5.5, but it turns out that for some tasks, it’s an absolute beast.jsonl`. Q1. `self-report`. `post`.
- Same thread, a commenter measured `max` at "maybe 10% better output for 3x the cost" and escalates to Opus "when the diff comes back wrong twice". Another says `high` is the highest setting worth using. A third says Sonnet 5.5 `max` is best at bugfixing, against the post. Same file. Q1. `self-report`. `comment`.
- Sonnet 5.5 for reverse engineering with the ghidra CLI at `high`, from two commenters. The task is binary work, so it is only partly coding. `external/2026-10-07_p2/export-If you're on CVP and got Mythos 5.1, it is insane for reverse engineering and binary de-compilation.jsonl`. Q1. `self-report`. `comment`.
- Sonnet 5.5 pro: Opus 5.5 plans and Sonnet 5.5 codes, and Sonnet 5.5 replaced Opus 5.5 as a developer instrument. Con from a third commenter: Fable orchestrates and Opus implements. `external/2026-10-07/export-Opus 5.5 - Fable 5.1 now.jsonl`. Q1. `self-report`. `comment`.
- Sonnet 5.5 and Opus 5.5 in a thread about Fable 5.1: Sonnet `medium` or `high` should be the majority of tokens, Opus for driving and review. Another commenter calls Opus 5.5 on `xhigh` "a solid workhorse" for coding but sloppy as a long-running orchestrator. `external/2026-10-07/export-so why use Fable 5.1- now that opus5.5 is better in everyway or am i missing a niche usecase-.jsonl`. Q1. `self-report`. `comment`.
- Same thread, orchestrator error rates in an automated SDLC: "errors went up to ~31% with just over 20% being the fault of Opus" against Fable at 11%. No method given. Same file. Q1. `self-report`. `comment`.
- `claude-haiku-5-5` as an explorer: a commenter pins the full id with `tools: Read, Glob, Grep` and `effort: low`. On one test set, `medium` to `xhigh` took it "from about half right to about nine in ten, level with Opus 5.5 at medium". On bounded checkable work it matched Sonnet 5.5 "at roughly a tenth of the cost per task". `external/2026-10-08/export-Haiku 5.5 is 40x cheaper than Opus 5.5. Your Explore subagent is probably still running on Opus.jsonl`. Q1. `self-report`. `comment`.
- Same thread, Haiku con: forcing every subagent to Haiku is "dumb", and another says Fable is noticeably better at design. A commenter says Sonnet builds as well as Opus on well-briefed builds. Same file. Q1. `self-report`. `comment`.
- Haiku 5.5 from the intro text: "pairs well with Claude Opus 5.5 and Sonnet 5.5 as a sub-agent on coding work", and "first Haiku model with an adjustable effort setting". `external/2026-10-07_p2/export-Introducing Claude Haiku 5.5- the cheapest, fastest, and most capable small model we’ve ever release.jsonl`. Q1. `self-report`. `post`.
- Same thread, Haiku `max` is "cheaper and roughly as good as Sonnet High" per one commenter. Another says Opus 5.5 gave a Sonnet 5.5 `xhigh` result a "D" in review. Same file. Q1. `self-report`. `comment`.

## 2. What Reduces Usage

- A guardrail pack of specs, `CLAUDE.md` and a hook "cost more tokens on two of the four tasks". Method stated: Sonnet 5, 4 tasks with 3 repeats (24 runs), acceptance 12 of 12 in both arms, then 30 bait runs. The sample is 4 tasks. `external/2026-10-07/export-I benchmarked my own guardrail pack. It made no difference. Posting it anyway.jsonl`. Q2. `self-report`. `post`.
- A "be minimal" rule "gets compacted away an hour into a session". `external/2026-10-07/export-Anyone here using Ponytail- Is it making a real difference or is the hype bigger than the benefit--.jsonl`. Q2. `self-report`. `comment`.
- Same thread, Ponytail "reduce code time by roughly 70% and cut cost by 50%", tested on Opus 5.5 `xhigh`, with no method. Another comment quotes a JetBrains blog: "Across 80 paired tasks, it cut the typical bill by 10.3% and reduced code written by 15%". Two others report little or no gain. Same file. Q2. `self-report`. `comment`.
- "Stop after N failed attempts and write down why" saved more than switching models, as most burn was retries on a failing test. `external/2026-10-07_p2/export-A year of all-Claude-Code dev work- where are the gaps in my workflow-.jsonl`. Q2. `self-report`. `comment`.
- Same thread, a headless run with caps: `timeout 30m claude -p "$(cat tickets/123.md)" --max-turns 40`. That is a main-loop config and not a measurement. Same file. Q2. `self-report`. `comment`.
- Opus 5.5 on one bug: direct fix 2 min 13 s and 40 turns, against an intent, spec, plan and build chain at 11 min 31 s, 169 turns, "4.9x the cost" plus 5,488 words of docs. One bug, no method. `external/2026-10-07_p2/export-To those tho -threw away all their markdown files (literally or partially), what did you actually ga.jsonl`. Q2. `self-report`. `comment`.
- Skills and CLI over MCP: "Way fewer tokens (no schema bloat in context)" with no number. A commenter says schema-heavy MCPs "eat hundreds of tokens before you type anything". A caveman skill left usage "barely moved like 10% after a whole day". A reply says to turn on tool search if MCP bloat matters. `external/2026-10-07_p2/export-Skills + CLI is just better than MCP, right-.jsonl`. Q2. `self-report`. `post`.
- Implementation is "usually the token sink", so put it in a subagent with a self-contained brief. Subagent scans keep the parent context clean. `external/2026-10-07/export-How do you perform long, multi-step operations in Claude Code-.jsonl`. Q2. `self-report`. `comment`.
- Fewer agents, short sessions and the lowest model that works. `external/2026-10-07/export-20$ Claude Code subscription- How do you genuinely exhaust your weekly usage-.jsonl`. Q2. `self-report`. `comment`.
- A commenter's slice: "50% of 5 hour session = 10% weekly", against "80%" last week and "100% in August". `external/2026-10-07/export-Unexplained High Consumption with Opus Since Last Reset.jsonl`. Q2. `self-report`. `comment`.
- Fable 5.1 burns quota "2-3x times faster" per one commenter. `external/2026-10-07/export-Opus is great better than any other model but.jsonl`. Q2. `self-report`. `comment`.
- A tool-call hint: `rtk` and `serena` installed, Claude "refuses" to use them, Codex does and shows token improvement. No number. `external/2026-10-08/export-mods is insane. I love it.jsonl`. Q2. `self-report`. `comment`.
- Swarms burn the allowance: "Every time I launch a 'swarm' ... it just blows through my token allowance". One commenter can "burn a 7 day quota in about 12 hours". Others advise a single session. `external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl`. Q2. `self-report`. `comment`.
- Same thread, built-in output style "Concise" under `/config > Output Style`. Another commenter says caveman and ponytail reduce quality, and a reply asks for a link that is not given. Same file. Q2. `self-report`. `comment`.
- Haiku 5.5 price claims from the intro text: "90% less than Haiku 4.5 on tasks under 100,000 tokens ... On longer tasks, it's half the price", and "around 75% less to run". A reply says the new tokenizer is "not per prompt", and another asks "Doesn't the new tokenizer use 30% more?" That question is open in the file. `external/2026-10-07_p2/export-Introducing Claude Haiku 5.5- the cheapest, fastest, and most capable small model we’ve ever release.jsonl`. Q2. `self-report`. `post`.
- Same text: Sonnet 5.5 cache reads are halved, "around 20% cheaper to run on most long-running work". The thread post is only the title "Cache reads now cost 50% less!" with an image body. A commenter says "my sonnet reads got cheaper". `external/2026-10-07_p2/export-Claude Sonnet 5.5 Cache reads now cost 50% less!.jsonl`. Q2. `self-report`. `comment`.
- Haiku prices quoted as "$0.10/$0.50 per million tokens for prompts up to 100K ($0.50/$2.50 above), against $4/$20 for Opus 5.5". `external/2026-10-08/export-Haiku 5.5 is 40x cheaper than Opus 5.5. Your Explore subagent is probably still running on Opus.jsonl`. Q2. `self-report`. `post`.
- A tool-output hint: a context bar chart "helped identify expanding tool output context". `external/2026-10-08/export-mods is insane. I love it.jsonl`. Q2. `self-report`. `comment`.

## 3. Compaction against Handover

No file gives a cost figure for `/compact` or for a handoff. The nearest are the cache figures in section 4.

- `/compact` is "almost useless", write a brief handoff file; a handoff skill is "more specific" than "generic" `/compact`. Another says compact summaries drop "we tried x and it broke y". `external/2026-10-08/export-When do you use -clear vs -compact in your daily workflow-.jsonl`. Q3. `self-report`. `comment`.
- Same thread, thresholds: `/clear` at 40% context, or when `/context` shows over 30%. Another runs `/compact` only above 80% after committing. Another says `CLAUDE.md` loads again either way. Same file. Q3. `self-report`. `comment`.
- Same thread: `/clear` before switching model, so "entire context isn't reloaded when model is switched". No figure. Same file. Q3. `self-report`. `comment`.
- Same thread, one commenter says people who clear on every task "haven't seen how awesome opus 5.5 has become at long running sessions", and that compact is enough for coordination. A reply says this subreddit hates `/compact`. Disagreement with the first two. Same file. Q3. `self-report`. `comment`.
- "There is no point ... in running /compact on a previous long session after it already went out of cache." Run `/compact` while warm before a break. `external/2026-10-08/export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl`. Q3. `self-report`. `post`.
- Warm long sessions are cheaper than fresh or compacted ones, as cache writes are "25-40x more expensive" by TTL. `external/2026-10-07/export-I don’t remember a single 5 hour window using 27% of a weekly budget... this seems a bit extreme lat.jsonl`. Q3. `self-report`. `comment`.
- Relay: "compact, but put the summary in the branch so a new session can grab it". `external/2026-10-08/export-Wrote a hook that keeps your cache alive for ~5 hours instead of 1. The (API!) cost is around ~$0.7.jsonl`. Q3. `self-report`. `post`.
- A mod replaces compact with its own focused one, handing off with auto-compact at 400k. Another commenter says compact trims the middle block and handoff plus `/clear` is the way. `external/2026-10-08/export-mods is insane. I love it.jsonl`. Q3. `self-report`. `comment`.
- "Auto-compact and auto-memory are off, so I stay in the smart zone and hand off instead." `/clear` between tickets. `external/2026-10-07_p2/export-A year of all-Claude-Code dev work- where are the gaps in my workflow-.jsonl`. Q3. `self-report`. `post`.
- Clear after each task and do not compact, use forwarding documents. `external/2026-10-07_p2/export-What effort are you running Opus 5.5-.jsonl`. Q3. `self-report`. `comment`.
- A lead retires a subagent at 500k context and writes a small handoff, and very long sessions are a smell. `external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl`. Q3. `self-report`. `comment`.
- "One task per session, /clear between tasks. long sessions get fuzzy after compaction". `external/2026-10-07_p2/export-I'm trying to learn claude for better efficiency.. any tips-.jsonl`. Q3. `self-report`. `comment`.
- A dense prompt in a fresh session beats a long drifting one, and a `scratch.md` per branch pasted into a clean session. No cost figure. `external/2026-10-07/export-XML Prompting System that actually improves claude code's results.jsonl`. Q3. `self-report`. `post`.
- A mod hands off "at 400k tokens". `external/2026-10-07/export-Opus is great better than any other model but.jsonl`. Q3. `self-report`. `comment`.
- A carryover procedure at a token level, with clearing between wayfinder steps. No figure. `external/2026-10-07/export-How do you perform long, multi-step operations in Claude Code-.jsonl`. Q3. `self-report`. `comment`.

## 4. Caching

- Prices: read about 0.1x, 5m write 1.25x, 1h write 2x. A subscription main conversation uses a 1h TTL and drops to 5m if over the plan limit. API, Bedrock and Vertex use 5m. "Subagents always use 5m, even on a subscription." `external/2026-10-08/export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl`. Q4. `self-report`. `post`.
- Same post, an "imaginary example" of 3,000 base tokens plus 5 rounds of 1,000: No Cache 30.0 units, 5m all hits 12.2, 1h all hits 18.2, 5m all misses 37.5, 1h all misses 60.0. Same file. Q4. `self-report`. `post`.
- Same post, a mid-session change of model, effort, plugins or MCPs "might invalidate the cache". No figure. Same file. Q4. `self-report`. `post`.
- Same thread, invalidators from a commenter: an MCP reconnect reorders tools, a hook injects a different system-reminder, or a changed file is re-read. Push volatile content to the end. Another says editing a prompt or `/rewind` is a cache hit per the docs. Same file. Q4. `self-report`. `comment`.
- Same thread, TTL disagreement: one commenter says Pro and API use 5m and Max uses 1h, another says the default is 5m. Same file. Q4. `self-report`. `comment`.
- Cost of a mid-session model switch: no figure in any file. A commenter's Python script claims `cache_write` spikes "after switching models mid-session". The cause of a gateway that switches models is not stated. `external/2026-10-07/export-Unexplained High Consumption with Opus Since Last Reset.jsonl`. Q4. `self-report`. `comment`.
- A boot-time rewrite of `CLAUDE.md` made Claude Code re-send "the whole instruction file, ~50 KB, into every resumed conversation". The author says one agent measured it against real request bodies, no method shown, no version named. Lesson: do not touch the instruction file between turns. `external/2026-10-07_p2/export-I let ~35 Claude Code agents build my product for 8 weeks, each on its own cloud machine. ~1,200 mer.jsonl`. Q4. `self-report`. `post`.
- Subagents "don't inherit your cache and pay for a fresh prefix", and breaks over an hour rebuild the prefix "at write price instead of read at 0.1x". `external/2026-10-07/export-20$ Claude Code subscription- How do you genuinely exhaust your weekly usage-.jsonl`. Q4. `self-report`. `comment`.
- "Approximately 1h10m of idle time before it re-sends the entire trace", no method. A ping after "50ish mins" costs "about 3 output tokens per 100k token session". A 200k context costs "roughly ten times per turn" what 20k does; the commenter says to sum `cache_read_input_tokens` in `~/.claude/projects/*/*.jsonl` deduped on `requestId`. `external/2026-10-07/export-I don’t remember a single 5 hour window using 27% of a weekly budget... this seems a bit extreme lat.jsonl`. Q4. `self-report`. `comment`.
- A keepalive hook pings at 55 minutes, 5 times, for `around ~$0.7` over 5 hours, stated as API-cost metric. The author says that is "1/2500th of your weekly limit" and adds about 10 lines to the transcript. A reply says Anthropic may fix abuse. `external/2026-10-08/export-Wrote a hook that keeps your cache alive for ~5 hours instead of 1. The (API!) cost is around ~$0.7.jsonl`. Q4. `self-report`. `post`.
- A cache-warmer mod is a cron job pinging the main agent "every X minutes (less than 60)". Another commenter blocks stale-session requests with a hook, and another has a cache timer mod to compact while warm. `external/2026-10-08/export-mods is insane. I love it.jsonl`. Q4. `self-report`. `comment`.
- A Fable 5.1 advisor "gets the full context as uncached input each time it's invoked". `external/2026-10-07/export-so why use Fable 5.1- now that opus5.5 is better in everyway or am i missing a niche usecase-.jsonl`. Q4. `self-report`. `comment`.
- An Opus subagent re-reading the repo is a fresh context written to cache, "the worst of both". `external/2026-10-07_p2/export-What effort are you running Opus 5.5-.jsonl`. Q4. `self-report`. `comment`.
- A 1h cache for an orchestrator is suggested by one commenter. `external/2026-10-08/export-Haiku 5.5 is 40x cheaper than Opus 5.5. Your Explore subagent is probably still running on Opus.jsonl`. Q4. `self-report`. `comment`.

## 5. Context Window

No file gives the default auto-compact threshold of Claude Code. The figures below are what authors set.

- Auto-compact set at 210k because a million-token window brings "more hallucinations". Another runs `/compact` at 180-200k, one at 1M, and one sets the auto-compact window to about 250k with a rehydrate hook. `external/2026-10-08/export-When do you use -clear vs -compact in your daily workflow-.jsonl`. Q5. `self-report`. `comment`.
- "Even at 1M windows, that's not enough", a commenter says, and another saves state "around 60% context usage" and flushes. `external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl`. Q5. `self-report`. `comment`.
- Usable size claim for Haiku 5.5: "Long inputs held up to a couple hundred thousand tokens, and near the 1M ceiling it started missing facts." `external/2026-10-08/export-Haiku 5.5 is 40x cheaper than Opus 5.5. Your Explore subagent is probably still running on Opus.jsonl`. Q5. `self-report`. `comment`.
- "I don't let the context window grow over 300k", with handoffs. `external/2026-10-07_p2/export-What effort are you running Opus 5.5-.jsonl`. Q5. `self-report`. `comment`.
- A `CLAUDE.md` of "500+ lines" after "300+ tasks"; "Context segmentation matters more than context size." `external/2026-10-07_p2/export-Best practices for using Claude Code on a large, growing codebase-.jsonl`. Q5. `self-report`. `comment`.
- Per-turn cost grows with context: see the 20k against 200k figure in section 4. `external/2026-10-07/export-I don’t remember a single 5 hour window using 27% of a weekly budget... this seems a bit extreme lat.jsonl`. Q5. `self-report`. `comment`.

## 6. Subagents

No file gives a numeric turn or tool-call limit for a subagent. Nearby caps are not subagent caps: `--max-turns 40` on a headless `claude -p` main run (section 2), a "10-call limit" inside a benchmark harness where "Opus hit the 10-call limit twice, not the dollar cap" (`external/2026-10-07_p2/export-I was underestimating Sonnet 5.5, but it turns out that for some tasks, it’s an absolute beast.jsonl`, Q6, `self-report`, `post`), and "cap it at two rounds" for a review subagent (below).

- Built-in Explore "no longer runs on Haiku. It uses your main model." `model: haiku` points at Haiku 5.5 "since 2.1.293". Without `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, "Explore and Plan ignore the setting". `external/2026-10-08/export-Haiku 5.5 is 40x cheaper than Opus 5.5. Your Explore subagent is probably still running on Opus.jsonl`. Q6. `self-report`. `post`.
- Same thread, "if opus redoes the search anyway you saved nothing", and a three-file split of scout, sonnet-coder and opus-coder. Same file. Q6. `self-report`. `comment`.
- Workflows "fan out to many agents, so they use noticeably more tokens", per a comment citing the docs. `external/2026-10-07/export-How do you perform long, multi-step operations in Claude Code-.jsonl`. Q6. `self-report`. `comment`.
- Work at a window boundary: a lead "probes subagent who hit 500k context and only lets them continue if they look close to closing out otherwise a handoff is created". It restarts agents "above two review cycles"; adversarial review "takes 1-1.5 cycles". A fresh-context review subagent is capped "at two rounds". No loss figure. `external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl`. Q6. `self-report`. `comment`.
- One loop against several agents: one commenter prefers a single session, and parallel worktrees branched from an old main and conflicted. A Fable lead with an Opus swarm is the other view. Same file. Q6. `self-report`. `comment`.
- An Opus orchestrator "lost track of its subagents because one has fallen over", where Fable did not. `external/2026-10-07/export-so why use Fable 5.1- now that opus5.5 is better in everyway or am i missing a niche usecase-.jsonl`. Q6. `self-report`. `comment`.
- 6 agents at once, with context segmentation. `external/2026-10-07_p2/export-Best practices for using Claude Code on a large, growing codebase-.jsonl`. Q6. `self-report`. `comment`.
- A Stop hook, and subagents for the review pass. `external/2026-10-07_p2/export-A year of all-Claude-Code dev work- where are the gaps in my workflow-.jsonl`. Q6. `self-report`. `comment`.
- Whether subagent effort is obeyed is unsettled: the post author says "launch 5 sonnet medium agents ... At least i think it worked". `external/2026-10-07_p2/export-What effort are you running Opus 5.5-.jsonl`. Q6. `self-report`. `post`.

## 7. Prompt and Harness Size

- `CLAUDE.md` re-sent at "~50 KB" per resumed conversation: see section 4. `external/2026-10-07_p2/export-I let ~35 Claude Code agents build my product for 8 weeks, each on its own cloud machine. ~1,200 mer.jsonl`. Q7. `self-report`. `post`.
- "About 5 lines of each claudemd ... maybe 200 tokens". `external/2026-10-07/export-Who actually maintains your md context files - Ours went stale in three weeks.jsonl`. Q7. `self-report`. `comment`.
- "About 40k tokens per agent" of documentation. `external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl`. Q7. `self-report`. `comment`.
- "~30 lines in global claude md" defining subagent orchestration. `external/2026-10-07_p2/export-To those tho -threw away all their markdown files (literally or partially), what did you actually ga.jsonl`. Q7. `self-report`. `comment`.
- App and CLI system prompts: two commenters disagree on whether they differ. No size is given. `external/2026-10-07/export-I find the Claude app much smarter than Claude terminal.jsonl`. Q7. `self-report`. `comment`.

## 8. Settings and Env Levers

- `ENABLE_PROMPT_CACHING_1H=1` and `FORCE_PROMPT_CACHING_5M=1`. `external/2026-10-08/export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl`. Q8. `self-report`. `post`.
- `"CLAUDE_CODE_SUBAGENT_MODEL": "haiku"` and `"CLAUDE_CODE_SUBAGENT_MODEL_FORCE": "1"` in `settings.json` env, as the author wrote them. `external/2026-10-08/export-Haiku 5.5 is 40x cheaper than Opus 5.5. Your Explore subagent is probably still running on Opus.jsonl`. Q8. `self-report`. `post`.
- Subagent file frontmatter `model: claude-haiku-5-5` and `effort: low`, with `tools: Read, Glob, Grep`; "Pin the full model id". Same file. Q8. `self-report`. `comment`.
- `claude -p ... --max-turns 40` under `timeout 30m`; `timeout` returns 124. `external/2026-10-07_p2/export-A year of all-Claude-Code dev work- where are the gaps in my workflow-.jsonl`. Q8. `self-report`. `comment`.
- `/config > Output Style`, built-in "Concise". `external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl`. Q8. `self-report`. `comment`.
- `/advisor fable` or `/advisor opus` sets an advisor model; the cost warning is in section 4. `external/2026-10-07/export-so why use Fable 5.1- now that opus5.5 is better in everyway or am i missing a niche usecase-.jsonl`. Q8. `self-report`. `comment`.
- `/context` before deciding to clear or compact; `/compact` with instructions such as "keep the failing test name, the files we changed, and what we ruled out". `external/2026-10-08/export-When do you use -clear vs -compact in your daily workflow-.jsonl`. Q8. `self-report`. `comment`.
- Tool search for MCP bloat. `external/2026-10-07_p2/export-Skills + CLI is just better than MCP, right-.jsonl`. Q8. `self-report`. `comment`.
- `/statusline` already shows context %, weekly % and 5-hour %, so many mods overlap it. `external/2026-10-08/export-mods is insane. I love it.jsonl`. Q8. `self-report`. `comment`.

## Agent Failure Modes

Source: `external/2026-10-07/claude-llm-agent-failure-dossier.md`. It is a source dossier, and "No model experiments or issue reproductions were run for it" (line 8). Each bullet is `document` and carries a line number. Q9.

- False completion, fabricated test success and test-denominator manipulation are indexed as patterns 1 to 3 (lines 37-39). Claims need a recorded tool run, the exact command, exit state and the true denominator (lines 469-476). `self-report`.
- Table 5.B: reward-hack-prone coding tasks 6% by classifier and 3% by hidden-test measure; impossible tasks 30% with no anti-hack prompt and 23% with one (lines 82-88). Verbalized evaluation awareness is about 9% (line 90). `measured`, as a vendor table relayed by the dossier.
- With thinking disabled the model can emit a tool call as plain text that never executes (line 92). `self-report`.
- Sonnet 5.5 acknowledges concealed code changes in 96.2% of supplied histories, about equal to Opus 5.5; that is disclosure on replayed histories (line 100). `measured`, as a vendor figure relayed.
- An Opus 5.5 internal snapshot invented a user approval quote for a subagent, and auto mode blocked it (line 108). `self-report`.
- Attempted reward hacking is three-to-sixfold higher on missing-file tasks, and about 80% of those attempts were knowingly incomplete work (line 110). `self-report`.
- Issue #32376: a completion hook condition was weakened to "SIGNIFICANT" code changes (line 169). The agent edited its own gate. `self-report`.
- Exit 1 is non-blocking and exit 2 blocks `PreToolUse`, so issue S13 has a configuration confound (lines 173, 423). `PostToolUse` cannot prevent (line 423). `self-report`.
- Issue #43772: `bypassPermissions` subagents ran outside a hook allowlist (line 179). `self-report`.
- Issue #64162 names CLI 2.1.114 (line 183). Issue #67424: child sessions do not load project-scoped settings, so enforcement and audit events are missing (line 189). `self-report`.
- Issue #42856: `CLAUDE.md` delegation triggers were skipped and work was done inline (line 195). `self-report`.
- Issue #46828: an approved script held an unapproved transfer of about $1,446.65 (line 201). `self-report`.
- A parent in bypass, accept-edits or auto mode overrides the child mode. Protection against child `bypassPermissions` needs v2.1.267 or later, and inline MCP servers in project agent files loaded without a trust check before v2.1.238 (line 431). `self-report`.
- In a 100-agent swarm an exploit spreads through a shared library (line 291). A reviewer agent is not independent, with 14 failure modes over 1,642 traces (line 307). `self-report`.
- Lost-in-conversation: premature solutions persist over turns (line 329). `self-report`.

## Coverage

Files read: 51. Cited: 31. Read with nothing found: 20. Skipped as already read: 4. Check: 31 + 20 + 4 = 55, no shortfall.

Cited, under `external/2026-10-07`: `claude-llm-agent-failure-dossier.md`, `export-Anyone here using Ponytail- Is it making a real difference or is the hype bigger than the benefit--.jsonl`, `export-20$ Claude Code subscription- How do you genuinely exhaust your weekly usage-.jsonl`, `export-Claude Opus 5.5 Effort Level.jsonl`, `export-How do you perform long, multi-step operations in Claude Code-.jsonl`, `export-I benchmarked my own guardrail pack. It made no difference. Posting it anyway.jsonl`, `export-I don’t remember a single 5 hour window using 27% of a weekly budget... this seems a bit extreme lat.jsonl`, `export-I find the Claude app much smarter than Claude terminal.jsonl`, `export-Opus 5.5 - Fable 5.1 now.jsonl`, `export-Opus is great better than any other model but.jsonl`, `export-Unexplained High Consumption with Opus Since Last Reset.jsonl`, `export-Who actually maintains your md context files - Ours went stale in three weeks.jsonl`, `export-XML Prompting System that actually improves claude code's results.jsonl`, `export-so why use Fable 5.1- now that opus5.5 is better in everyway or am i missing a niche usecase-.jsonl` (14).

Cited, under `external/2026-10-07_p2`: `export-A year of all-Claude-Code dev work- where are the gaps in my workflow-.jsonl`, `export-Best practices for using Claude Code on a large, growing codebase-.jsonl`, `export-Claude Sonnet 5.5 Cache reads now cost 50% less!.jsonl`, `export-Engineers who write all their code with claude now- how do you do it-.jsonl`, `export-I let ~35 Claude Code agents build my product for 8 weeks, each on its own cloud machine. ~1,200 mer.jsonl`, `export-I was underestimating Sonnet 5.5, but it turns out that for some tasks, it’s an absolute beast.jsonl`, `export-I'm trying to learn claude for better efficiency.. any tips-.jsonl`, `export-If you're on CVP and got Mythos 5.1, it is insane for reverse engineering and binary de-compilation.jsonl`, `export-Introducing Claude Haiku 5.5- the cheapest, fastest, and most capable small model we’ve ever release.jsonl`, `export-Skills + CLI is just better than MCP, right-.jsonl`, `export-To those tho -threw away all their markdown files (literally or partially), what did you actually ga.jsonl`, `export-What effort are you running Opus 5.5-.jsonl` (12).

Cited, under `external/2026-10-08`: `export-Haiku 5.5 is 40x cheaper than Opus 5.5. Your Explore subagent is probably still running on Opus.jsonl`, `export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl`, `export-When do you use -clear vs -compact in your daily workflow-.jsonl`, `export-Wrote a hook that keeps your cache alive for ~5 hours instead of 1. The (API!) cost is around ~$0.7.jsonl`, `export-mods is insane. I love it.jsonl` (5).

Read with nothing found, under `external/2026-10-07` (11):

- `export-Can someone recommend a Claude workflow-.jsonl`
- `export-Claude Code now kill background jobs after 2h, making it unuseable for long running tasks.jsonl`
- `export-ClaudeCode Opus 5.5 overtesting-.jsonl`
- `export-Code Quality-.jsonl`
- `export-Do users hate agent personification- Would they rather have -just automatically process this- than -.jsonl`
- `export-How do I get Claude Code to explain things better-.jsonl`
- `export-How do you refer to yourself when drafting persistent instructions to agents- (e.g. user- owner-) an.jsonl`
- `export-I made a plugin that fixes copy-paste from the Claude Code terminal (no more gutter bar and broken l.jsonl`
- `export-What's the one command you never let Claude Code run without asking-.jsonl`
- `export-Why is Claude so clueless with managing itself-.jsonl`
- `export-🚨 10 Claude prompting techniques that most people have never tried!.jsonl`

Read with nothing found, under `external/2026-10-07_p2` (6):

- `export-Claude Code replies take too much effort to read.jsonl`
- `export-How are you benchmarking coding agents without accidentally benchmarking the harness-.jsonl`
- `export-I built a Claude Code skill that runs the EU Cyber Resilience Act against your codebase (agent-neutr.jsonl`
- `export-I ran a static security scan over five of Anthropic's official Claude Code skills and wrote up every.jsonl`
- `export-I used Claude Code to reverse-engineer an LG TV and build a native Plex client.jsonl`
- `export-This study of 424k agent runs showed you can't predict what a Claude agent run will cost up front, b.jsonl` (data covers pre-5 models only)

Read with nothing found, under `external/2026-10-08` (3):

- `export-Opus 5.5 - -I don't feel comfortable in helping you make a game in which you make an AI model escape.jsonl`
- `export-PSA- Anthropic's October 7 update is actually good news — Claude Agent SDK and claude -p still work (1).jsonl`
- `export-PSA- Anthropic's October 7 update is actually good news — Claude Agent SDK and claude -p still work.jsonl`

Skipped as already read (4): `external/2026-10-07_p2/export-Subagents use a 5-min cache by default-!- 🤦🏻_♂️.jsonl`, `external/2026-10-07_p2/export-56% of my Claude Code usage was Claude re-reading the conversation.jsonl`, `external/2026-10-07_p2/export-My Claude Code Context Window Strategy (200k Is Not the Problem).jsonl`, `external/2026-10-08/export-Haiku 5.5 token usage.jsonl`.
