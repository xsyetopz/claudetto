# Economy research: least tokens for the most work

Scope is Claude Code 2.1.309 on Max 20x.
This file edits no code.
Each claim has a tag.
- `[official]` means the local docs checkout `claude-code-docs/docs/` says it. Some of those pages are marked Undocumented there, because the program shows them and Anthropic does not publish them. Prices and the effort cost index are in that group.
- `[measured]` means a user measured it and posted the method.
- `[anecdotal]` means a user said it with no method.
- `[derived]` means I computed it from tagged inputs. The command and output are in a raw file.

Raw files are in `/Users/krystian/Downloads/CodeProjects/xsyetopz/claudetto/openspec/changes/release-0-3-0-alpha-2/research/raw/`.
- `research/raw/economy-price-index.txt` has prices, the effort cost index, and the Sonnet versus Opus math.
- `research/raw/economy-compact-math.txt` has the compaction trigger and cache-read math.
- `research/raw/economy-settings-and-math.txt` has the current settings, the agent frontmatter, and the fork math.
- The thread excerpts are in `economy-model-effort.txt`, `economy-sonnet-vs-opus.txt`, `economy-haiku.txt`, `economy-haiku-roles.txt`, `economy-roles.txt`, `economy-effort-misc.txt`, `economy-context-window.txt`, `economy-compaction-reports.txt`, `economy-cache-reports.txt`, `economy-subagent-reports.txt`, and `economy-habits.txt`.
- Large numbers are shortened here. The exact values are in the raw files.

## Short answer

1. Keep `autoCompactWindow` at 300k. A 400k window costs about 20% more overall and has no proven quality gain (`research/raw/economy-compact-math.txt`).
2. The real compaction trigger is 225k and not 300k, because `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is 80.3571 (`research/raw/economy-compact-math.txt`).
3. The `reviewer` agent breaks your rule. It is Sonnet 5.5 at `high`. Move it to `medium`.
4. Use Opus 5.5 at `medium` as the main agent. Raise to `high` per turn. A per-turn effort change keeps the cache on 5.5 models.
5. Haiku 5.5 fits search and mechanical checks only. It does not fit research or fact checks.
6. There is no setting for a cheaper compaction model in the 2.1.309 docs. Do not try to route compaction.

## Roles

Index numbers come from `research/raw/economy-price-index.txt`.
A lower index is cheaper for the same model on the same task.

| Role | Model | Effort | Context bound | Reason |
| --- | --- | --- | --- | --- |
| main | Opus 5.5 | `medium`, per turn up to `high` | trigger 225k, window 300k | Default effort is `medium` for Opus 5.5 `[official]`. Index `medium` 0.66 against `high` 1 `[official]`. Sources: `research/raw/economy-price-index.txt`, `research/raw/economy-compact-math.txt`. |
| reviewer | Sonnet 5.5 | `medium` (now `high`) | short life | Your rule forbids Sonnet `high`. Sonnet index `high` 1 against `medium` 0.54 `[official]`. Escalate to Opus `high` by hand for a risky diff. |
| worker | Sonnet 5.5 | `medium` (now `medium`) | short life | `low` to `medium` adds 10% in index. `medium` to `high` adds 85% `[derived]`. |
| scout | Haiku 5.5 | `low` (now `low`) | hard stop 100k | Price steps up 5x above 100k prompt tokens `[derived]`. Search quality equals Sonnet in one test `[measured]`. |
| researcher | Sonnet 5.5 | `medium` (now `low`) | short life | Fact errors rise as model and effort fall `[measured]`. `medium` adds only 10% index. |
| compaction | the main model | none to set | trigger 225k | No compaction model setting in the docs. A model switch is a full cache miss `[official]`. |
| handoff | the main model | none to set | file at about 175K | Users write a handoff file and start a fresh session `[anecdotal]`. Source: `research/raw/economy-habits.txt`. |

### Is Sonnet 5.5 `high` costlier than Opus 5.5 `low` or `medium`?

The answer depends on the task, and no single number settles it.
- Opus 5.5 costs 2x Sonnet 5.5 per token in input, output, and cache read `[official]`. Source: `research/raw/economy-price-index.txt`.
- Opus index is 0.48 at `low` and 0.66 at `medium`. Sonnet index at `high` is 1 `[official]`.
- Sonnet `high` costs the same as Opus `low` when Sonnet uses 0.96x the Opus `high` tokens. For Opus `medium` the break-even is 1.32x `[derived]`.
- One user ran 30 passes at `high` and measured Sonnet at $0.15 and Opus at $0.36 per task, both 30 of 30 `[measured]`. Source: `research/raw/economy-sonnet-vs-opus.txt`.
- From those numbers Opus used 1.2x the Sonnet tokens. Sonnet `high` then costs 2.00 against 2.30 for Opus `low` and 3.17 for Opus `medium` `[derived]`.
- Another user ran one Rust task at `medium` and measured Opus at $2.08 and Sonnet at $0.52 `[measured]`. Opus used 2x the tokens `[derived]`.
- A commenter quoted a table with Opus `low` at 10k tokens and Sonnet `high` at 37k tokens `[anecdotal]`. Source: `research/raw/economy-model-effort.txt`. That reverses the result.
- Another thread says Sonnet 5.5 needs 193k output tokens per task, 60% more than Opus 5.5 Max `[anecdotal]`. Source: `research/raw/economy-effort-misc.txt`.
- The thread "Sonnet 5.5 is not worth using it unless at Low/Med effort" has score 87. Its top comment (score 42) says Sonnet `high` was faster and cheaper but left bugs that Opus caught `[anecdotal]`. Source: `research/raw/economy-model-effort.txt`.
- The same comment says Sonnet then Opus review cost more than Opus alone `[anecdotal]`.
- The index is per attempt and does not price retries. The thread "Claude Code ships a per-model table..." (score 74) says so `[anecdotal]`. Source: `research/raw/economy-sonnet-vs-opus.txt`.

Verdict for your rule.
- Sonnet `high` is outside your rule anyway.
- Sonnet `medium` costs 1.08 against 2.30 for Opus `low` on the 1.2x data `[derived]`. It is the cheap tier.
- Use Opus `low` or `medium` when a miss is costly. Retries and review rounds erase the Sonnet saving `[anecdotal]`.
- Test on your own transcripts before you move the main agent. A commenter in "Anyone else using Opus 5.5 Low as their daily driver" (score 7) says Sonnet was a wash against Opus `medium` `[anecdotal]`. Source: `research/raw/economy-model-effort.txt`.

### Haiku 5.5

Official facts.
- Price is 0.1 input and 0.5 output per million tokens. Above 100k prompt tokens it is 0.5 and 2.5 `[official]`. That is 5x `[derived]`. Source: `research/raw/economy-settings-and-math.txt`.
- Default effort is `medium`. Index is 0.38 at `low`, 0.52 at `medium`, 1 at `high`, 2.03 at `xhigh` `[official]`. Source: `research/raw/economy-price-index.txt`.
- Haiku 5.5 keeps the cache when effort changes `[official]`.

Evidence on fit.
- Subagent test on 6 tasks at `high` (score 5). Code search found 44 of 48 files for Haiku and Sonnet, and 45 for Opus. Cost was $0.44, $1.38, and $6.17 `[measured]`. Source: `research/raw/economy-haiku-roles.txt`.
- The same test at `xhigh` found the same 44 files at 3x the cost `[measured]`.
- The same test on web research gave 10 wrong facts for Haiku, 3 for Sonnet, and 1 for Opus. Fact checks marked 30 correct sentences as errors for Haiku `[measured]`.
- Small bug fixes cost $0.013 for Haiku and $0.206 for Opus, all 30 runs passing `[measured]`. Source: `research/raw/economy-haiku-roles.txt`.
- Thread "Haiku 5.5 token usage" (score 26): users cannot keep Haiku under 100k in agent use. Top answer is to remove tools and MCP servers `[anecdotal]`. Source: `research/raw/economy-haiku.txt`.
- Thread "claude code 66k system prompt" (score 9) lists 35.6k for system tools and 16.6k for MCP tools `[anecdotal]`. Source: `research/raw/economy-habits.txt`.
- A one-tool Sonnet agent started at about 30k tokens. A general-purpose agent started at about 116k `[measured]`. Source: `research/raw/economy-subagent-reports.txt`.
- Thread "DO NOT USE Haiku 5.5 on Medium effort" (score 0) says `medium` failed a reasoning test. Replies say Haiku is for mechanical tasks `[anecdotal]`. Source: `research/raw/economy-haiku.txt`.
- Thread "Haiku 5.5 is cheap bad" (score 17) says it trusts load-bearing comments `[anecdotal]`. Source: `research/raw/economy-haiku-roles.txt`.
- One user saw a new tokenizer use about 40% more input tokens `[anecdotal]`. Source: `research/raw/economy-haiku.txt`.

Verdict.
- Keep Haiku as `scout` with Read, Grep, and Glob only.
- Keep `low`. No report measured search at `low`. The measured point is `high`. Check `low` against your own transcripts before you trust it.
- Your 100k bound is right for the price. The tested range of start context is 30k to 66k, so the working room is 34k to 70k `[derived]`.
- Your `modelSettings` window for Haiku (about 144k) gives a trigger of exactly 100k `[derived]`. Source: `research/raw/economy-compact-math.txt`.
- The compaction request carries its instruction on top of the 100k. That request may cross the price step `[derived]`.
- A window of about 132k gives a trigger of 90k and leaves room. Source: `research/raw/economy-compact-math.txt`.
- Never give Haiku research, fact checks, or judgment.

## Context window: 300k or 400k

Your real trigger.
- The docs formula is the smaller of `effective * pct / 100` and `effective` minus 13k, where `effective` is the window minus 20k `[official]`. Sources: `claude-code-docs/docs/how-it-works/context-and-compaction.md` and `research/raw/economy-compact-math.txt`.
- With pct 80.3571, a 300k window triggers at 225k. A 400k window triggers at 305k `[derived]`. Source: `research/raw/economy-compact-math.txt`.
- Without the override the triggers would be 267k and 367k `[derived]`. Source: `research/raw/economy-compact-math.txt`.

Cache cost.
- Cache read is 0.2 per million for Opus 5.5 and 0.1 for Sonnet 5.5 `[official]`. Source: `research/raw/economy-price-index.txt`.
- One full read costs $0.045 at 225k and $0.061 at 305k on Opus `[derived]`. Source: `research/raw/economy-compact-math.txt`.
- My model ramps from a 40k base to the trigger and reads the whole context each turn. Per unit of new work, the 305k trigger reads 1.30x more than the 225k trigger `[derived]`.
- Fewer compactions save only about $0.05 per 100k of new tokens at an assumed $0.30 per compaction `[derived]`.
- The net is about $1.05 against $1.26 per 100k of new tokens on Opus `[derived]`. The 400k window costs about 20% more overall.
- One user measured $0.20 per compaction and $9.68 over a week for 47 compactions at 200K `[measured]`. Source: `research/raw/economy-context-window.txt`.
- The same user saw re-reading fall from 56% to 28% of spend. Calls per prompt rose 53%. Net cost per prompt fell 26%, or only 7% against the 5 days before `[measured]`. Do not go far below your 225k.

Quality reports.
- "Opus 5.5 Context Degradation" (score 7): no loss at 500k and exhaustion past 700k `[anecdotal]`. Opus 5 degraded near 300k `[anecdotal]`. A comment (score 3) saw skipped instructions `[anecdotal]`. Source: `research/raw/economy-context-window.txt`.
- "I measured rule-following against context fill" (score 5): 52 sessions. Rule violations were 8.7% at 0-20% fill and 5.5% at 80-100%. The slope was flat. Early turns were worst `[measured]`. Source: `research/raw/economy-context-window.txt`.
- "Forcing context window to 250k has dramatically increased my usage" (score 14): the 20x plan lasted the whole week at 250k, down from 1M. The user saw no memory loss `[anecdotal]`. Source: `research/raw/economy-context-window.txt`.
- "How's 1m context window now" (comment score 1): relay at 200-300k because the model gets groggy `[anecdotal]`. Source: `research/raw/economy-compaction-reports.txt`.
- A Copilot thread comment sets 400k to cut cost `[anecdotal]`. It is the only report for 400k. Source: `research/raw/economy-model-effort.txt`.
- I found no report that measures Sonnet 5.5 quality past a set size. One comment (score 1) says small models do worse in long context `[anecdotal]`. Source: `research/raw/economy-model-effort.txt`.

Verdict.
- Keep 300k, which triggers at 225k.
- 400k trades about 20% more cost for no measured quality gain. The only gain is fewer compactions in tasks that cannot split.
- Do not go below about 200K, because the re-read cost returns as more calls.
- Use the same bound for Sonnet 5.5. Sonnet agents live short, so they rarely reach it.

## Cache

Official facts.
- Main conversation: 1 hour on a subscription within plan usage, 5 minutes otherwise `[official]`.
- Subagents, workflows, forks, compaction, and titles: 5 minutes `[official]`.
- `CLAUDE_CODE_PROMPT_CACHE_TTL` sets the main TTL. `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` sets the rest. Frontmatter `experimental.cacheTtl` is a third source `[official]`.
- A model switch is a full miss. A `/compact` starts a new prefix. A product upgrade is a miss `[official]`.
- An effort change keeps the cache on Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1 `[official]`. Source: `claude-code-docs/docs/how-it-works/request-and-cache.md`.
- The 1h write costs 1.6x the 5m write on all three 5.5 models, and 40x the read on Opus `[derived]`. Source: `research/raw/economy-settings-and-math.txt`.

Your values.
- Main TTL is `1h`. That is already the default on your plan. The setting still guards you when usage passes the plan limit. Thread "Your Claude Code prompt cache drops from an hour to five minutes..." (score 16) says the same `[anecdotal]`. Source: `research/raw/economy-cache-reports.txt`.
- Subagent TTL is unset, so it is 5 minutes. Keep it. A subagent that lives under 5 minutes would pay 1.6x on its write for no gain `[derived]`.
- One corpus measured a 1h TTL at +21% for subagents and +7% for the main session `[measured]`. Source: `external/agent-failure-dossier/04-engineering-delegation-and-cost.md`.
- Counter case: one user cut weekly burn 60% with a 1h subagent TTL plus a keepalive ping, on tasks that wait hours `[measured]`. Source: `research/raw/economy-habits.txt`.
- Rule: set `experimental.cacheTtl` on a single agent that waits more than 5 minutes. Do not set it for all.

Where the money goes.
- One user priced about 19.6k requests. Cache writes were 3.2% of tokens and 46.0% of cost. Reads were 96.5% of tokens and 44.8% of cost `[measured]`. Source: `research/raw/economy-cache-reports.txt`.
- Rebuilds come from breaks longer than the TTL, subagent spawns, and compaction `[measured]`.
- In a panel of 15 subagent calls, 88% of the cost was cache writes `[measured]`. Source: `research/raw/economy-subagent-reports.txt`.

Fork mode.
- A fork inherits the history and the model and shares the parent cache `[official]`. Source: `claude-code-docs/docs/extend/subagents/runtime.md`.
- Your `CLAUDE_CODE_FORK_SUBAGENT` is `0`. Keep it.
- A fork reads the whole parent context at the parent price each turn. A typed Sonnet worker with a 30k start pays one 5m write and then cheap reads.
- With an Opus parent, a fork is cheaper only if the parent context is under about 52k at 10 worker turns, or 27k at 30 turns `[derived]`. Source: `research/raw/economy-settings-and-math.txt`.

Reuse the cache in subagent prompts.
- Spawns of the same agent type share a prefix of tools, system prompt, and agent body. Keep that body static. Put the task text last.
- Do not put dates, ids, or run names at the top of an agent body. A change early in the prefix makes every later part miss `[official]`.
- Keep the tool list fixed per agent. A tool-set change changes the first part of the request `[official]`.
- A short tool list cut the start of a call from about 116k to about 30k `[measured]`. Source: `research/raw/economy-subagent-reports.txt`.
- Spawn same-type agents inside 5 minutes of each other. The first write must finish before the next spawn can read it. This is general API behavior and I did not verify it in the local docs.
- A per-call `model` from the main agent beats the `model` in frontmatter `[official]`. Source: `claude-code-docs/docs/extend/subagents/frontmatter.md`. A commenter reports Opus passing Sonnet at spawn `[anecdotal]`. Source: `research/raw/economy-roles.txt`.

Compaction.
- Compaction runs on the session model with a 5-minute cache `[official]`.
- Idle compaction fires before the 1-hour cache ends, on contexts over 200K, after about 54 minutes idle `[anecdotal]`. Source: `research/raw/economy-compaction-reports.txt`. The setting `idleCompaction` exists `[official]`.
- A cheaper model for compaction gives no cache hit. At 200k, a cold Haiku pass would cost about $0.125 against $0.24 for a warm Opus pass. Two model switches would add a $1.60 rewrite `[derived]`. Source: `research/raw/economy-compact-math.txt`.
- Thread "Would I save on usage by switching to a cheaper model for context compaction" (score 4): the answer was yes only after the cache expires `[anecdotal]`. Source: `research/raw/economy-compaction-reports.txt`.
- Thread "On Max 5x plan - Compacting just cost me 20% of the 5h window" (score 10): users say do not let context reach compaction `[anecdotal]`. Source: `research/raw/economy-compaction-reports.txt`.

## Other zero-cost habits

Your file already sets `enableArtifact`, `enableWorkflows`, `awaySummaryEnabled`, `autoDreamEnabled`, `autoMemoryEnabled`, and `promptSuggestionEnabled` to `false` (`research/raw/economy-settings-and-math.txt`).
- Start a fresh session per task, and use `/clear` between unrelated tasks `[official]`. Source: `external/agent-failure-dossier/04-engineering-delegation-and-cost.md`.
- Keep long output out of context. Quiet test scripts print one result line and the failures `[anecdotal]`. Source: `research/raw/economy-habits.txt`.
- Read a line range and not a whole file. A reviewer of that advice says the saving is small while the cache is warm `[anecdotal]`.
- Send wide searches to a subagent, and only the answer returns `[anecdotal]`.
- Check `/context` for what fills the window. It under-counts tools and one attachment `[measured]`. Source: `external/agent-failure-dossier/04-engineering-delegation-and-cost.md`.
- Do not let a test or an agent wait past the cache TTL. A late result pays a rewrite `[anecdotal]`. Source: `research/raw/economy-context-window.txt`.
- Let the main agent pass no `model` in `Agent` calls, so frontmatter wins `[official]`.

## Setting changes

| Item | Current | Proposed | Source |
| --- | --- | --- | --- |
| `agents/reviewer.md` `effort` | `high` | `medium` | Your rule. Index 1 against 0.54 `[official]`. |
| `agents/researcher.md` `effort` | `low` | `medium` | Adds 10% index `[official]`. Fact errors `[measured]`. |
| `agents/worker.md` `effort` | `medium` | keep | Step to `high` adds 85% `[derived]`. |
| `agents/scout.md` `effort` | `low` | keep, test on your transcripts | Measured point is `high` only. |
| `modelSettings.claude-opus-5-5.maxEffortLevel` | unset | `high` | `[official]` `configure/settings/model.md`. Enforces your rule. |
| `modelSettings.claude-sonnet-5-5.maxEffortLevel` | unset | `medium` | Same. I did not verify that the cap reaches subagent frontmatter. |
| `model`, `effortLevel` in user settings | unset | check with `/model` and `/effort` | Default effort is `medium` for 5.5 models `[official]`. |
| `autoCompactWindow` | 300k | keep | Cost math `[derived]`. Source: `research/raw/economy-settings-and-math.txt`. |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `80.3571` | keep, and write down that it means 225k and 100k | `[derived]`. |
| `modelSettings.claude-haiku-5-5.autoCompactWindow` | about 144k | optional about 132k | Trigger 90k leaves room under the price step `[derived]`. Source: `research/raw/economy-compact-math.txt`. |
| `CLAUDE_CODE_PROMPT_CACHE_TTL` | `1h` | keep | `[official]`. |
| `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` | unset (5m) | keep unset | 1.6x write `[derived]`. Use `experimental.cacheTtl` per agent when needed. |
| `CLAUDE_CODE_FORK_SUBAGENT` | `0` | keep | Fork math `[derived]`. |
| `idleCompaction` | unset (on) | keep | Compaction before the cache ends `[anecdotal]`. |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | `6` | keep | Fan-out waste reports `[anecdotal]`. |

## Gaps

- No source gives the absolute token ratio of Sonnet 5.5 to Opus 5.5 over many tasks. The index is relative to each model.
- The cost index table that users quote is from older models. The 5.5 values are in `claude-code-docs/docs/configure/models-and-providers.md`.
- The Anthropic effort article (`claude.dev/blog/spending-your-effort`) was linked in a thread and I did not fetch it.
- I did not verify whether `maxEffortLevel` caps a subagent `effort`.
- The "first write must finish" cache rule is not in the local docs.
- I did not read the thread on token-saving plugins, so I make no claim about it.
