---
status: accepted
date: 2026-11-17
---
# One Setting Sets the Subagent Cache TTL

## Context and Problem Statement

Two routes set the subagent prompt cache TTL: the setting `subagentPromptCacheTtl` and the agent frontmatter `experimental.cacheTtl`. On 2.1.327 the frontmatter field is present (chunk-m14bt1pz.js:1035791 (claude 2.1.327 binary)) and applies only when neither `subagentPromptCacheTtl` nor `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` is set; "1h" is ignored in overage (`cIn`, chunk-m14bt1pz.js:2564576 (claude 2.1.327 binary)). Which route does claudetto use?

With nothing set, a subscriber gets a 1 h cache TTL only for the query sources in the allowlist `repl_main_thread*`, `sdk`, `auto_mode`, `memdir_relevance` (GrowthBook `tengu_prompt_cache_1h_config` can widen it), so subagents default to 5 min (the TTL picker that returns `{ttl:"5m",reason:"default"}`, chunk-m14bt1pz.js:3210453 (2.1.327); named `rNe` in an older build). Precedence: `FORCE_PROMPT_CACHING_5M`, then `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, then `subagentPromptCacheTtl`, then agent frontmatter `experimental.cacheTtl` (its "1h" is ignored in overage), then `ENABLE_PROMPT_CACHING_1H` (`cIn`, chunk-m14bt1pz.js:2564576). Both earlier claims hold.

How a subagent gets a 1 h cache TTL.

`autoCompactWindow: 200000` and `subagentPromptCacheTtl: "1h"` were posted as token savers. At API list prices a 1h write costs 2x against 1.25x for 5m; on a subscription meter it costs about 1.1x a 5m write (CTX-846). Either way it pays only where a subagent or fork waits over 5 minutes or a main session idles; most unattended subagents keep the cache warm anyway; a 200k window compacts mid-task more often (using 1M then compacting costs less than 200k compacted five times). Five subagents started at the same instant each pay the full cache write (inferred); 88% of one panel's cost was cache writes. `SendMessage` to the same agent keeps history; Explore and Plan are one-shot; resuming a subagent idle over 5 minutes is a cache miss.

## Considered Options

- The agent frontmatter `experimental.cacheTtl`.
- The setting `subagentPromptCacheTtl`.
- The env var `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`.
- Agent frontmatter `experimental.cacheTtl`.
- The setting `subagentPromptCacheTtl` (`1h` puts `"ttl":"1h"` only on subagent and side requests, and the fork child with `subagent_type: "fork"` plus `CLAUDE_CODE_FORK_SUBAGENT=1`; `5m` sets none).
- `experimental.cacheTtl` in agent frontmatter (superseded).
- A blanket 1h recommendation (a commenter says it costs more: subagents rarely idle past 5 minutes and the 1h write premium is 2x at list prices; about 1.1x on a subscription meter, CTX-846).
- Set a 1h subagent TTL for all agents.
- Keep the 5m default and measure cache-hit percentage per session before changing it.

## Decision Outcome

Chosen option: keep the 5m default and measure the cache-hit share per session before any change; no blanket setting, and no agent file carries `cacheTtl` (user decision, AskUserQuestion 2026-11-17). If a measurement later shows a gain, the setting `subagentPromptCacheTtl` is the one route.

## Consequences

- Setup writes no `subagentPromptCacheTtl`, so subagents keep the 5m default; agent files hold no `cacheTtl`. (An earlier line here said setup writes `"1h"`. That contradicted the Decision Outcome and is corrected.)
- The frontmatter field stays unused even though the engine accepts it.
- First measurement (2.1.327, 2026-11-17 to 2026-11-18, 142 subagent transcripts, 36,995 requests): the cache-hit p50 is 0.984 and p10 is 0.941. 121 of 523 cache breaks follow an idle gap over 300 s, and all 67.5M subagent write tokens are 5m writes. The idle breaks are the only ones a 1h TTL would remove. Even if every re-created write token were an idle one (an upper bound: 14.6M re-created subagent write tokens, 21.6% of subagent writes, saving 14.6M × 1.25 = 18.2M input-equivalent), a 1h TTL would add 0.75 × 67.5M = 50.6M input-equivalent of write premium. That arithmetic uses API list prices. A subscription meter weighs tokens differently (CTX-846, three meter probes on 2026-11-18): a 1h write costs 1.09 times a 5m write on Opus 5.5 (bounds 0.92 to 1.30) and 1.06 on Sonnet 5.5 (bounds 0.89 to 1.20), and a cache read costs 0.033 of a 5m write on both models (Opus bounds 0.028 to 0.036, Sonnet 0.031 to 0.035), not the list 0.08. Second measurement in 5m-write units (2026-11-18, `BREAKS_OUT` from cache.py): 126 subagent breaks follow a gap between 300 and 3,600 s and re-created 9.1M of 68.4M subagent write tokens (13%). A 1h TTL turns those writes into reads and saves 9.1M × (1 − 0.033) = 8.8M. It adds 0.06 × 68.4M = 4.1M of premium at the Sonnet point estimate. The break-even ratio is 1 + 8.8 / 68.4 = 1.13, inside the Sonnet bounds: the net effect lies between a 7% loss and a 16% saving of subagent write cost, with a point estimate of a 7% saving. Where the idle breaks come from settles the decision. 99% of those 9.1M tokens come from GodHand subagents at turn 20 or later, 90% at turn 50 or later, across 28 long-lived agents that were resumed after waiting. claudetto ends each worker at the end of its slice (REQ-DELEGATION-065), so the idle-resume case that pays for a 1h TTL does not occur in its design, and the premium would be paid on every write for nothing. The 5m default stands. A narrower meter bound would cost about 8% of the weekly limit and cannot change this, because the saving depends on idle resumes that claudetto removes. Source: reports/2026-11-18-research/sessions.md (Cache section; scripts in reports/2026-11-18-research/sessions-scripts/); reports/2026-11-18-research/surface-probes/meter-probe.md, both runs (CTX-846).

The other two ways are not written.

The main loop keeps its own TTL.

Good: no 1h write premium (2x at list prices, about 1.1x on a subscription meter) paid on workers that end before they could idle. Bad: needs a per-session cache-hit measurement that does not exist yet. 2.1.325: setting `subagentPromptCacheTtl`, env `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, tools `SendMessage`, `TaskStop` present.

## Confirmation

A setup test asserts `subagentPromptCacheTtl` and no `cacheTtl` in agent files.

Source: openspec/specs/subagent-prompts/spec.md:112 ("The subagent cache TTL SHALL be set only by the `subagentPromptCacheTtl` setting, and no agent file SHALL carry `cacheTtl`"); openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-26/README.md:113-137 (`experimental.cacheTtl` frontmatter); plugins/claudetto/hooks/features/setup/settings.ts:118@088a227c; chunk-m14bt1pz.js:1035791 (2.1.327) and chunk-m14bt1pz.js:2564576 (2.1.327; first read in claude 2.1.325 binary; cited by the old plan, not re-read); chunk-m14bt1pz.js:3210453 and :2564576 (2.1.327) (claude 2.1.326 binary, relocated from chunk-wqb2b4v0.js:3067022 and :2438231 of 2.1.325); the old plan says the lead read the code with cc-inspect (offsets not rechecked); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:12; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:161; external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:128 (the 88% figure, weak match).
