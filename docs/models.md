# Model and Effort Evidence

Audited on 2026-10-27 by two web searches plus Anthropic's own documentation, at the user's request. Every claim below is marked `official` (an Anthropic page), `measured` (a published benchmark with a method and numbers), or `self-report` (experience with no numbers). A claim with no source does not appear.

The five levels are `low`, `medium`, `high`, `xhigh`, and `max`. The keys are `effortLevel` and `maxEffortLevel`, and the flag is `--effort`.

## The Short Answer for Claudetto

| Role | Model | Effort | Rests on |
| --- | --- | --- | --- |
| Lead, planning and delegation | `claude-opus-5-5` | `medium`, `high` when `medium` misses | `official`, and three measurements below |
| Worker on well-specified edits | `claude-sonnet-5-5` | `medium` | `official`, and `paddo.dev` |
| Wide read-only search | `claude-haiku-5-5` | `medium` | `official`, with the `low` failure modes below |
| Running checks and reporting failures | `claude-haiku-5-5` | `medium` at the lowest | the `low` failure modes below, which include skipping checks |
| A handoff or a summary | `claude-haiku-5-5` | `medium` | `official`, Anthropic names summaries and compactions as its use |

No row says `xhigh` or `max`. No source found supports either level for any workload this project runs, and three sources find them worse.

## Opus 5.5: The User's Ruling Is Now Measured

The user ruled on 2026-10-27 that `xhigh` and `max` are off the table for `claude-opus-5-5`, from a community report. Three independent sources agree, and one of them is a real benchmark. The ruling needs no revisiting.

`measured`, `paddo.dev`, 2026-09-29: six merged changes from one TypeScript monorepo, 20 runs per model per level, 300 runs in all, graded by the original tests and priced at list rates. Read as clean runs of 20, then runs that broke a passing test, then cost. <https://paddo.dev/blog/default-was-right/>

| Effort | Clean of 20 | Broke a test | Cost |
| --- | --- | --- | --- |
| `low` | 11 | 0 | `$16.97` |
| `medium` | 13 | 0 | `$44.10` |
| `high` | 12 | 1 | `$65.16` |
| `xhigh` | 12 | 1 | `$139.79` |
| `max` | 11 | 2 | `$307.16` |

`medium` is the best row on both axes at once. It has the most clean runs, it is the only row above `low` with no broken test, and `max` costs about seven times as much to do worse. The author notes the differences are one or two runs from one codebase, so the ordering is weak evidence while the cost column is strong.

`measured`, SlopCodeBench, write-up dated 2026-10-15, read through a secondary site because the primary was not opened: Opus 5.5 at `medium` scored `28/196` strict passes at about `$193`, and `xhigh` scored `25/196` at about `$817`, which is `4.22x` the cost for a lower score. One run per setting, so the gap may be noise. The cost ratio is not noise. <https://www.developersdigest.tech/blog/slopcodebench-october-2026-effort-xhigh-medium-opus-5-5>

`self-report`, Amp, a vendor engineering blog, 2026-09-28: Opus 5.5 "starts to overthink" past `high`, and at `xhigh` and `max` it "scores lower than at high" while costing several times more, so Amp stops at `high`. They cite internal evals and publish no numbers. <https://ampcode.com/news/opus-5.5>

`official`: the default is `medium`, and Anthropic says to start there and set it explicitly. It reserves `xhigh` and `max` for work where a gain has been measured. Opus 5.5 at `medium` matches or exceeds Opus 5 at `high` on coding and knowledge work, and on several coding evals `low` comes close at much lower cost. Opus 5.5 thinks more per turn than Opus 5 at the same level, most of all at `xhigh` and `max`. <https://platform.claude.com/docs/en/build-with-claude/effort> and <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5>

`official` and `measured`, found on 2026-10-27 in a second audit: Anthropic prints its own per-level table for Opus 5.5 on a `SWE-bench Pro` subset of 482 problems, with cost per task. It says each score pools two runs, except the `xhigh` row, which is a single run. <https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence>

| Effort | Tasks solved | Cost per task |
| --- | --- | --- |
| `low` | 87.4% | `$0.11` |
| `medium` | 92.8% | `$0.21` |
| `high` | 95.3% | `$0.29` |
| `xhigh` | 96.7% | `$0.74` |
| `max` | not published | not published |

This is the vendor's own benchmark, so read it as the best case for raising effort, and it still puts `xhigh` at about `2.6` times the cost of `medium` for `3.9` points. It disagrees with `paddo.dev` on the ordering, where `medium` beat `high` and `xhigh`, and it agrees with `paddo.dev` on the cost column. Both are recorded, and the ordering stays weak evidence. The same page gives Anthropic's internal agentic-coding benchmark at `medium` only, 86.6% at `$0.84` per attempt. It is not `SWE-bench Verified`, and no Anthropic page audited here prints a `SWE-bench Verified` number for any of the three models.

One source disagrees. `measured`, Pascal Reischl, 2026-09-27, using the Artificial Analysis Intelligence Index: tasks solved of 100 rise with effort, `low` 42, `medium` 51, `high` 54, `xhigh` 56, `max` 58, at `0.4x`, `1x`, `1.4x`, `2.6x`, and `4.5x` the usage of `medium`. <https://pascalreischl.com/en/blog/claude-effort-levels/> That is a general intelligence index, not a repository coding task, and the two repository-shaped benchmarks above both show the opposite. For this project, which only does repository work, the repository benchmarks win.

The pre-restart snippet wrote `maxEffortLevel: "high"` for `claude-opus-5-5`, which satisfied the ruling. The tier snippet of the new tree (`plugins/claudetto/src/tiers/snippet.ts:36`) writes no `maxEffortLevel`, so no key enforces the ruling today. It writes `effortLevel` from the row (`plugins/claudetto/src/tiers/snippet.ts:49`), and every row carries `medium` (`plugins/claudetto/src/tiers/tiers.ts:78`), which is where a model starts and not a ceiling.

## Sonnet 5.5: `medium`, and `max` Is Not Worth It

`official`: all five levels. The API default is `high`, and Claude Code and the apps default to `medium`. For agentic coding, start at `medium` for well-specified tasks and move to `high` for harder or longer ones. Anthropic says Sonnet 5.5 "complements Opus 5.5 best when running at lower effort settings." <https://platform.claude.com/docs/en/build-with-claude/effort> and <https://www.anthropic.com/claude-sonnet-5-5>

`measured`, `paddo.dev`, same 300-run study: `low` 10 clean and `$8.38`, `medium` 11 and `$11.76`, `high` 11 and `$26.60`, `xhigh` 10 and `$96.04`, `max` 13 and `$415.18`. Zero broken tests at every level, which is the real finding: Sonnet did not regress anything at any effort. `max` bought two clean runs for about thirty-five times the cost of `medium`.

`official`, two failure modes that matter to this project. At `low`, Sonnet 5.5 can report a change as done without running a check that exercises it. At `low` and `medium` on long agentic tasks it is more likely to stop and check in with the user. Anthropic gives system-prompt text against both. <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5>

Both failure modes are already answered in this project's own prompt, which requires a check to have run in the session before a part is called done. So the prompt text Anthropic recommends is work the project has done, and it is one reason `main.md` cannot simply shrink to nothing.

`official`, a third behaviour: at `xhigh` and `max`, Sonnet 5.5 starts its own review rounds, sometimes with reviewer subagents. Anthropic says to run routine work at `high` or below, and reports that one prompt line stopping this cut session cost by about a third at `max`. Anthropic's own launch table shows Sonnet scoring `46.2%` on FrontierCode at `max`, below its `xhigh` score, with a footnote blaming exactly this: it more often ran Claude Code's code-review skill, which caused timeouts or out-of-scope edits.

The snippet already writes `maxEffortLevel: "medium"` for `claude-sonnet-5-5`, which matches the evidence.

## Haiku 5.5: The Floor Is `medium`, Not `high`

This reverses the community report the user relayed earlier, which said never below `high` and up to `xhigh`.

`official`: the default is `medium`, and Anthropic says to start at `medium` including for agentic coding. `low` is for chat, short tool tasks, simple high-volume requests, and subagents. `high` is for knowledge work, longer agent tasks, and strict instruction following. `xhigh` and `max` only if your own evals show a gain, and Anthropic says to compare them against Sonnet 5.5 on cost and speed rather than reaching for them. <https://platform.claude.com/docs/en/build-with-claude/effort> and <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5>

So the earlier report's floor of `high` is above Anthropic's own starting point, and its ceiling of `xhigh` is a level Anthropic says to justify with evals first.

`measured`, Artificial Analysis, 2026-10-07, Intelligence Index and FrontierCode with effort varied. <https://artificialanalysis.ai/articles/claude-haiku-5-5>

| Effort | Index | Cost per task | FrontierCode | Cost per rollout |
| --- | --- | --- | --- | --- |
| `low` | 29 | `$0.02` | `34.8%` | `$0.06` |
| `medium` | 34 | `$0.05` | `41.6%` | `$0.13` |
| `high` | 38 | `$0.08` | `41.9%` | `$0.26` |
| `xhigh` | 41 | `$0.12` | `45.8%` | `$0.63` |
| `max` | 43 | `$0.21` | `46.4%` | `$1.33` |

Two readings of that table. On FrontierCode, `medium` to `max` is about ten times the cost for `4.8` points, and `medium` to `high` is twice the cost for `0.3` points. And Sonnet 5.5 at `max` scores `56` on the index against Haiku's `43`, so no amount of Haiku effort reaches Sonnet.

`official`, Anthropic's own test of the `low` to `medium` step: it roughly halved early stopping, and it more than doubled output tokens per attempt. That is the trade in one sentence.

### Why `low` Is Disqualified for Our Agents

All `official`, from the Haiku 5.5 prompting page:

- At `low` effort in long agent prompts it skips searches, stops early, and hands the task back.
- At `low` and `medium` it sometimes reports a code change as done without running a check.
- It can write reasoning-like text into user-facing replies, more often at `low`.

This project's agents exist to run checks and to search widely. An effort level whose documented failure is skipping searches and skipping checks cannot run `Apollo`, which reports check failures, or `Artemis`, which does wide searches. So `low` is out for both, despite Anthropic listing `low` for subagents in general.

### The Claim about Token Efficiency at `low`

A report the user relayed says Haiku 5.5 at `low` beats anything else on token efficiency. No measurement was found that supports it, and the measurement that exists cuts the other way: Artificial Analysis reports Haiku 5.5 using more output tokens than GPT-6 Luna for the same index score, with the gap widening at lower effort. At `low` it is the cheapest per task at `$0.02`, and it scores `29`.

So the claim holds only if cost per task is the whole measure and the result does not have to be right. This project's acceptance measure is billed cost per finished task, and an unfinished task costs more than a cheap one, so the claim does not transfer.

The claim is now also contradicted by our own data, which is the stronger answer, because it is this project's agents on this project's work. All 80 transcripts under `~/.claude/projects` were read on 2026-10-27 and de-duplicated by `message.id`, giving 1,938 responses. Output tokens per response, by model and by the effort recorded on the turn: `claude-haiku-5-5` at `low` 1,798 over 216 responses, `claude-sonnet-5-5` at `medium` 1,028 over 1,101, `claude-opus-5-5` at `low` 904 over 87, `claude-opus-5` at `high` 790 over 484, and `claude-opus-5-5` at `medium` 743 over 59. So Haiku at `low` wrote the most output per response of every configuration this machine has run, 75% above Sonnet at `medium`. The within-model pair points the same way, because Opus 5.5 at `low` wrote more per response than at `medium`. The method and the full tables are in `openspec/changes/claudetto-restart/references.md`. This is `self-report` on sample design, because each row carries its own workload and the effort level is not isolated, but it is our own count and not a relayed figure.

That matters more than a token share suggests. Priced at Anthropic's official rates, output is 28.2% of the cost of this traffic while being 1.12% of its tokens. A configuration that writes more output is expensive even when it moves few tokens, so the output-per-response row above is a cost row and not only a quality row.

### The Price Cliff

`official`: price per million tokens changes at `100k` prompt tokens. Input is `$0.10` below and `$0.50` above, output `$0.50` and `$2.50`, cache read `$0.01` and `$0.05`, cache write `$0.125` and `$0.625`. <https://www.anthropic.com/claude-haiku-5-5>, 2026-10-07. The `1h` cache write is `$0.20` below and `$1` above, read on 2026-10-27 from <https://platform.claude.com/docs/en/about-claude/pricing>.

The whole-request reading is confirmed, so the cliff is real and it is worse than the earlier note allowed. It was recorded here as `self-report` from a secondary source. The "Long context pricing" section of <https://platform.claude.com/docs/en/about-claude/pricing> states it, read on 2026-10-27: "Claude Haiku 5.5 is priced by prompt length: a request whose prompt is over 100,000 tokens pays higher prices. A request's prompt length counts all of its input tokens, including cache reads and cache writes. Each request is priced on its own: a request over the threshold pays the higher prices even when part of its prompt is a cache hit, and earlier requests keep the prices they were billed at." So it is `official` that crossing `100k` reprices the whole request at five times, and not only the excess.

Two details of that quote tighten the cap. The threshold counts cache reads and cache writes toward the prompt length, so a cached prefix does not shelter a request from the cliff, and on this machine cache reads are 93.67% of all tokens, which is nearly the whole prompt length. And the wording is "over 100,000", so exactly `100,000` still pays the lower prices. Each request is priced alone, so one long request is repriced without dragging the session with it.

`official`: one multiplier stacks on top of the cliff. US-only inference (`inference_geo`) is priced at `1.1x`, and the same page says that "On Claude Haiku 5.5, the multiplier also applies to the higher prices for prompts over 100,000 tokens", read on 2026-10-27. The project sets no such routing, so no figure here carries the multiplier, and a figure must gain it if that routing is ever set. The same page gives the Batch API a `50%` discount on input and output, which no path in Claude Code uses, so it prices nothing here.

`official`: the context window is `1M` tokens with up to `128k` output, and the tokenizer counts the same text as about `30%` more tokens than Haiku 4.5. Thinking is on by default and counts toward `max_tokens`, and earlier thinking blocks stay in context. <https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5>

Together those two facts mean a long Haiku subagent run drifts toward the cliff on its own, because retained thinking grows the prompt. So a Haiku agent in this project needs a prompt budget under `100k` tokens, which is a cap to set and measure, not a hope.

`official`: `thinking: {"type": "disabled"}` works only at `high` or below and returns a 400 at `xhigh` and `max`. Same for Sonnet 5.5's `between_tools` setting. So a configuration that disables thinking and sets a high effort level is an error, not a preference.

### What Haiku 5.5 Fails At

- Complex agentic and multi-step terminal coding. `Terminal-Bench 4.0` is `39.2%` against `70.6%` for Sonnet 5.5. `official`.
- `AutomationBench-AA` at `35%` against `53%` to `60%` for rivals, which Artificial Analysis says is likely understated by over-refusal and plans to re-run. `AA-Omniscience` accuracy `36%` with a `40%` hallucination rate. `measured`.
- Safety classifiers can return `stop_reason: "refusal"` with no server-side fallback, and penetration testing is blocked. `official`. This project reads program internals, so a refusal path needs handling.
- A user message sent mid-task inside a `tool_result` can be treated as untrusted and ignored. `official`. That is exactly how this session's own messages arrive, so a Haiku agent may miss a mid-run instruction.
- Picking the next task up after a compaction or a handover, on our own fixture. `measured`, 2026-10-27, round 7 of `docs/evidence/code-compaction-probe.md`. Across all 18 forks of the three arms, built-in `/compact`, code compaction, and handover, not one fork finished the fixture's next task with a passing check, against all 30 forks of round 6 on `claude-sonnet-5-5`, which all did. Six of the 18 also left a planted constraint untested, against none of the 30. The effort level was the CLI default and not pinned, so this measures the default configuration and not a level.

## The Delegation Pattern

`official`, vendor-selected customer quotes on the Haiku 5.5 launch page: Cognition runs Haiku 5.5 as the sidekick to an Opus 5.5 lead in Devin Fusion, scoring `66.2` on FrontierCode at lower cost and latency. Rogo uses Haiku 5.5 to pull figures from filings while a larger model builds the deck.

Modeled, not measured, and labelled as arithmetic from price sheets by its own author: eight Haiku subagents cost `$0.27` against `$4.57` when they inherit Opus, and a 30-turn subagent costs `$0.24` on Haiku, `$1.09` on Sonnet, and `$2.17` on Opus. <https://redreamality.com/blog/claude-haiku-5-5-subagent-compaction-cost-model/>, 2026-10-10.

The finding that matters most is the opposite of the headline. In two separate cost models, the orchestrator and the hand-offs dominate: one model puts `$0.414` of a `$0.445` run in the orchestrator and hand-offs, with the subagents at `$0.031`, and the other puts digesting the subagent reports in the lead's context at `$0.14`, about the cost of all eight Haiku runs together. Both are models and not measurements.

If that holds, cheapening the subagent model is close to pointless, and the saving is in how much the subagent sends back. That agrees with the paper this project already cites, and it is the strongest available argument for short, structured agent reports over long ones. It needs our own measurement before it drives a decision.

`CLAUDE_CODE_SUBAGENT_MODEL` is the environment variable that sets the subagent model. One secondary source reports that the built-in `Explore` agent does not follow it without `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`, and that resolution order is per-call model, then the agent's `model` frontmatter, then the variable, then the main model. Neither claim was confirmed against an Anthropic page, so both are open.

## A Cheap Model for a Handoff

`official`: Anthropic names summaries and compactions as intended uses for Haiku 5.5.

No source measured what a Haiku summary loses against a larger one. A cost model gives a 400k-token session at `$0.16` for Sonnet 5.5 with a warm cache, `$0.23` for Haiku in one shot, and about `$0.061` for Haiku in five chunks plus a merge, while warning that chunking loses cross-chunk references. With a cold cache Haiku wins. All modeled.

`official`, and it bears on the handoff design: editing earlier turns or the system prompt invalidates replay of thinking blocks, so a resumed session should start fresh from the summary rather than replaying. This project's handoff already works that way.

## Where the Level Must Be Written, and the Cache

Added by the second audit of 2026-10-27, from <https://code.claude.com/docs/en/model-config>, heading "Adjust effort level".

Claude Code takes the first source that applies: an explicit choice (`CLAUDE_CODE_EFFORT_LEVEL`, `--effort`, or `/effort`), then your settings (the level saved for the model, or `effortLevel`), then the model default. The default is "`high` on every model that supports effort, except that Opus 5.5, Sonnet 5.5, and Haiku 5.5 default to `medium`". The project's own docs mirror for `2.1.311` carries the same line at route `configure/models-and-providers`, so the three models claudetto uses already start at `medium` with no setting at all.

One trap follows, and it decides where a floor goes. The page says "a top-level `effortLevel` in your user settings file doesn't count for Opus 5.5", because that key is the older form, which "keeps applying where it applied before, on Opus 5, Fable 5.1, and earlier models". A top-level `effortLevel` in project, local, or managed settings, or passed with `--settings`, does apply to every model. So a floor for Opus 5.5 or Haiku 5.5 in a user settings file must go inside `modelSettings`. The tier snippet writes `modelSettings` (`plugins/claudetto/src/tiers/snippet.ts:47`), but only for the Haiku window, and it writes `effortLevel` at the top level (`plugins/claudetto/src/tiers/snippet.ts:49`), which is the older form that the trap describes. So the snippet does not avoid the trap for Opus 5.5 in a user settings file, and the floor that this file calls for belongs inside the `modelSettings` block.

On `max` the two official pages disagree, and this records both with no winner. The model-config page says "`max` isn't accepted as a level in either key". The settings reference, as read in the audit, lists `max` among the values of `maxEffortLevel` and says a `max` value sets no cap. The docs mirror gives `maxEffortLevel` as a plain string with no value list. Nothing in the plan needs `max`, because the user ruled it out for Opus 5.5, so this stays open.

The cache question is settled for the API and open for Claude Code. The platform effort page says that "Because top-level effort shapes the rendered prompt, changing it between requests doesn't preserve cached prefixes from earlier turns", and lists as a practice that "Changing the top-level effort value between requests invalidates prompt caching". Per-message effort, a beta behind the header `mid-conversation-output-config-2026-07-01`, keeps the cache on all three models. <https://platform.claude.com/docs/en/build-with-claude/effort> No Claude Code page read in this audit links an effort change to the prompt cache, so Claude Code's own behavior is unconfirmed. Two forum threads disagree about it, which `docs/dossier/exports/exports.md` records. The safe reading for this plan: set the level once in settings, and treat a mid-session `/effort` as a cache loss until a capture shows otherwise.

## Open, and Not Guessed

- No per-level numbers by workload for debugging, writing tests, code review, or large reads, on any model.
- No measured end-to-end result, quality and cost together, for an Opus-plans and Haiku-works setup.
- No independent test of handoff or summary fidelity on a cheap model. Our own test exists now and it stopped one step short of fidelity: round 7 of `docs/evidence/code-compaction-probe.md` shows that `claude-haiku-5-5` finished no next task after any of the three compaction paths, so the run cannot separate a summary that lost information from a model that could not act on a summary that kept it. Separating the two needs the same fixture with the handoff written by a cheap model and the follow-ups run by a larger one, which the probe cannot express today, because `--model` sets one model for every step.
- No Anthropic page states a per-level token multiplier, except the Haiku 5.5 `low` to `medium` step above, which Anthropic describes as "more than doubled" output tokens per attempt. Per-level cost exists only for Opus 5.5 on `SWE-bench Pro`. Every other cost multiplier above is third-party. This line replaces an earlier one that said no Anthropic page gave any multiplier or per-level cost, which the second audit of 2026-10-27 disproved.
- No per-level number of any kind for Sonnet 5.5 or Haiku 5.5 from Anthropic. The Sonnet launch page is chart only, and the one per-level Sonnet table found is third-party and unchecked (<https://apidog.com/blog/claude-sonnet-5-5-benchmarks/>), where only the three `max` cells match the official page.
- None of the Anthropic documentation pages carries a visible date, so each is dated by its fetch on 2026-10-27.
- Closed on 2026-10-27. The `100k` price tier applies to the whole request, it counts cache reads and writes toward the prompt length, and it prices each request on its own. The quote and the page are in "The Price Cliff" above.
- Primary Reddit and Hacker News threads were not retrieved, only secondary mentions, except the Hacker News launch thread.
