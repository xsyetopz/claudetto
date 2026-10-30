# Dossier: The Reddit Thread Exports

Notes from the `external/export-*.jsonl` thread exports, read 2026-10-27 for the `claudetto-restart` plan.

Every item here is a stranger's post or comment. The label `self-report` means the author gave no method.
The label `measured` means the author gave a method, a command, or a table. Nothing here is verified by this project.
A number is quoted as the author wrote it. Two authors' numbers are never added together.

## Effort per Model

- Opus 5.5 on Terminal-Bench, the author's conversion of Anthropic chart values: medium `57.6% / $2.94`, high `64.2% / $3.88`, xhigh `66.4% / $7.35`, max `64.8% / $11.24`. `export-Opus 5.5 Still Overthinks at Higher Effort.jsonl`, self-report.
- Opus 5.5 on FrontierCode, same author: medium `54.6% / $0.80`, high `54.0% / $1.09`, xhigh `51.4% / $2.25`. Same file, self-report.
- Opus 5.5 on CursorBench, same author: medium `52.5% / $2.90`, high `56.0% / $3.97`, xhigh `56.0% / $6.99`. Same file, self-report.
- The same author's view: "For coding, Opus 5.5 offers best value at medium or high effort", and xhigh is "~90% more expensive, but only 2.2% better". Same file, self-report.
- A per-model `effort_cost_index` in the program, with high as `1`. The Opus 5 row: low `0.67`, medium `0.76`, high `1`, xhigh `1.60`, max `1.70`. The Sonnet 5 row: `0.47`, `0.74`, `1`, `2.41`, `5.59`. `export-Claude Code ships a per-model table of what each effort level costs.jsonl`, self-report, which the author calls a vendor estimate.
- The same author ran 8 agents on Opus 5, 2 tasks at 4 effort levels. The observed medium-to-xhigh output-token ratio was `x1.78` against the catalog value `x2.11`. Same file, measured, and the sample is 2 tasks.
- "Doesn't seem like it makes sense to use max reasoning ever unless you love spending money." `export-Opus 5.5 Medium is the best reasoning level.jsonl`, self-report.
- "Opus 5.5 i use at medium default", and "Medium or high. Only xhigh for initial plans." `export-Question- What's the best effort setting for Opus 5.5-.jsonl`, self-report.
- "Opus 5.5 with effort 'max' consumes 6x more usage than medium effort." `export-Opus 5.5- which Reasoning Effort to Plan-.jsonl`, self-report with no method.
- "Opus 5.5 medium does perform better than Opus 5 High, and cheaper." `export-Opus 5.5 effort level-.jsonl`, self-report.
- "high, xhigh, and max are mostly overkill for 90% of my tasks." `export-Sweet spot for opus 5.5 when it comes to effort.jsonl`, self-report.
- "Opus 5.5 on Max 82.3%, but at a little over 3x the cost", on a code-review benchmark. `export-Opus 5.5 leads the code review benchmark.jsonl`, self-report.
- No figure for Sonnet 5.5 or Haiku 5.5 effort cost was found beyond the index row above.

## What Reduces Usage

- "Opus 5.5 is 40% cheaper while being 30% faster than opus 5." The body is empty, so only the title is known. `export-Opus 5.5 is 40% cheaper while being 30% faster than opus 5.jsonl`, self-report.
- "I think I've only used like 2% weekly usage", and "5.5 being 40% cheaper than 5 over similar task loads." `export-This is ... Good (Opus 5.5 -!).jsonl`, self-report.
- "Opus 5.5 completed 5 tasks for less then 3% of my total usage." `export-Opus 5.5 feels like 5.6 sol in a good way.jsonl`, self-report.
- "used ~4% of my weekly limit on 600k tokens in Code." `export-haven't raged once since opus 5.5.jsonl`, self-report.
- "blew through 2 sessions and 50% of my week usage on 20X." `export-Is Ultracode a Joke-.jsonl`, self-report.
- "25 opus 5.5 agents... burn through about 50% of my weekly usage", against "barely used 20% of my weekly usage" by the same author. `export-I ran out of codex on chatgpt pro with 4 days left...jsonl`, self-report.
- `"autoCompactWindow": 200000` and `"subagentPromptCacheTtl": "1h"` are named as the two token-saving settings, with no number. `export-Two hidden settings to cut token usage.jsonl`, self-report.

## Compaction against Handover

- A compaction on Fable at 950k of 1M: "14% of the 5 hour limit was gone just for the compact itself....it shows cost of $59.73." `export--clear vs -compact.jsonl`, self-report.
- "Compacting just cost me 20% of the 5h window", from the title. `export-On Max 5x plan - Compacting just cost me 20% of the 5h window.jsonl`, self-report.
- "Handoff documents are always better than compact", an opinion, beside "each new agent takes more than 75k-ish tokens". `export-Anthropic shipped 4 context tools between -clear and -compact...jsonl`, self-report.
- The same post lists `/btw`, `/rewind` with "Summarize from here" and "Summarize up to here", and `/compact <instructions>`. Same file.
- Authors compact at "~400k", or between "30-50%". Settings quoted: `/autocompact 200k`, and auto-compact at "500k", "400k", "300000". `export-do you guys use auto compact-.jsonl`, self-report.
- "compact when you're going to leave it for over an hour to avoid a cache miss." `export-Do I need to context compact manually-.jsonl`, self-report.

## Caching and the Cost of a Model Switch

- An author's table, which the author labels "imaginary example": no cache `30.0 units`, 5m all hits `12.2`, 1h all hits `18.2`, 5m all misses `37.5`, 1h all misses `60.0`. `export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl`, self-report.
- The same post: a subscription main conversation uses the 1h TTL and drops to 5m only over the plan limits. It names `ENABLE_PROMPT_CACHING_1H=1` and `FORCE_PROMPT_CACHING_5M=1`. Subagents are always 5m. Same file, self-report.
- A commenter says a 1h write costs more and the read saving may not cover it. The author's session analysis: "all cache misses came from followup work that was sent from the orchestrater after the agent had gone idle." `export-Two hidden settings to cut token usage.jsonl`, self-report.
- A moderator summary says "changing the effort level mid-conversation nukes your prompt cache." `export-Claude Code effort level and model selection - Claude.jsonl`, self-report.
- A disagreement, recorded with no winner: `export-Sweet spot for opus 5.5 when it comes to effort.jsonl` says "with Opus 5.5 you can change the effort level mid session without breaking prompt cache", and the thread above says the opposite.
- Switching to a cheaper model before a `/compact` loses cache sharing, because the cache key holds the model. A commenter: "It would cost 4x more for $1/M fresh input on Haiku 4.5." A Fable cache read is 0.25 dollars per million, in `export-Would I save on usage by switching to a cheaper model for context compaction...jsonl`, self-report.

## Context Window

- A Fable context shown as "950k/1m". `export--clear vs -compact.jsonl`, self-report.
- "Why Claude Code Max burns limits 40% faster with 20K less usable context", a title, and the reading of it is the author's. Self-report.
- A `CLAUDE.md` plus an output style puts the window at "around 350-450k context window size". `export-Claude's responses are just word vomit.jsonl`, self-report.
- "Mid session it's great for 30 to 40 messages but then it starts drifting." `export-Opus 5.5 is the smartest model I've used but it fucking forgets everything.jsonl`, self-report.
- "The 20x is only about 1.7 times the amount of the 5x when it comes to weekly usage... 4 times the amount of the 5x" on the 5-hour window. `export-I exhausted my claude max 20x weekly limit...jsonl`, self-report.

## Subagents

- Subagent writes are lost at the 5h cutoff, and a restart redoes the work. `export-TIL and potential PSA- you can lose subagent work when hitting the 5hr limit.jsonl`, self-report.
- On version `2.1.280` with Opus 5.5, an author asks why subagents hit a 200-turn limit. The body gives no cause. `export-What the hell is a turn limit (200-turn limit) and why are subagents suddenly hitting them-.jsonl`, self-report.
- The same author later calls it a "stringent limit of 200 tool calls before being forcefully stopped", and says "fork subagents are treated differently... they have a turn limit and others don't", and that a user cannot change it. Same file, self-report.
- The same author fears a resumed subagent "is more likely to take shortcuts", and says an earlier version reported the stop "as normal completion". Same file, self-report.

## Prompt, Tool, Skill, and `CLAUDE.md` Size

- Method: `--print "1+1"` through a custom Node proxy that read `cache_creation_input_tokens`, over four Claude Code versions. The baseline `v2.1.98` gave `50,511` tokens. `v2.1.100` gave `70,847` (+40.8%), `v2.1.104` gave `72,179` (+42.9%), `v2.1.107` gave `72,719` (+44.0%). `export-Why Claude Code Max burns limits 40% faster with 20K less usable context. Proxy evidence inside.jsonl`, measured, with the method stated.
- The same method on `v2.1.107` with the header `User-Agent: claude-cli/2.1.98` gave `51,618` (+2.2%). The author's workaround is `ANTHROPIC_CUSTOM_HEADERS='User-Agent: claude-cli/2.1.98 (external, sdk-cli)'`. The cause, a server-side injection, is the author's reading. Same file, measured for the numbers and self-report for the cause.
- Vercel "removed 80% of their tools and success jumped from 80% to 100%, with half the tokens", and Microsoft "cut 100 tools down to 2". Both are secondhand with no method. `export-I analyzed 246 repos and 57 papers on agent harnesses...jsonl`, self-report.

## Coverage

About 30 top-level threads were read in whole or in part. A thread with only praise or only complaint, and no number and no mechanism, was skipped and is not listed.
Skipped by scope: the Gemini 3.6 Flash thread, because it is not a Claude model.
Still unread at the end of the first pass: `Opus 5.5 Context Degradation`, `Six subagents on three different models`, `Opus 5.5 as a fleet orchestrator`, `Manual compact or Auto compact-`, `Are you manually compacting-handing off...`, `How often do you compact your sessions-`, `Output Style- Ultra Concise 5`, `CLAUDE.md for Opus 5.5 based on Anthropic's official platform docs`, `Claude Code Workflow Harness Change`, `Why token-saving plugins are costing you more money`, and `Two 5x sub or one 20x sub-`.
