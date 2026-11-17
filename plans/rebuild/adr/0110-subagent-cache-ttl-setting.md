---
status: accepted
date: 2026-11-17
---
# One Setting Sets the Subagent Cache TTL

## Context and Problem Statement

Two routes set the subagent prompt cache TTL: the setting `subagentPromptCacheTtl` and the agent frontmatter `experimental.cacheTtl`. On 2.1.326 the frontmatter field is present (chunk-4h798pp0.js:1023749 (claude 2.1.326 binary)) and applies only when neither `subagentPromptCacheTtl` nor `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` is set; "1h" is ignored in overage (`cIn`, chunk-4h798pp0.js:2520314 (claude 2.1.326 binary)). Which route does claudetto use?

With nothing set, a subscriber gets a 1 h cache TTL only for the query sources in the allowlist `repl_main_thread*`, `sdk`, `auto_mode`, `memdir_relevance` (GrowthBook `tengu_prompt_cache_1h_config` can widen it), so subagents default to 5 min (`rNe`, chunk-4h798pp0.js:3154956). Precedence: `FORCE_PROMPT_CACHING_5M`, then `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, then `subagentPromptCacheTtl`, then agent frontmatter `experimental.cacheTtl` (its "1h" is ignored in overage), then `ENABLE_PROMPT_CACHING_1H` (`cIn`, chunk-4h798pp0.js:2520314). Both earlier claims hold.

How a subagent gets a 1 h cache TTL.

`autoCompactWindow: 200000` and `subagentPromptCacheTtl: "1h"` were posted as token savers. A 1h write costs 2x against 1.25x for 5m, so it pays only where a subagent or fork waits over 5 minutes or a main session idles; most unattended subagents keep the cache warm anyway; a 200k window compacts mid-task more often (using 1M then compacting costs less than 200k compacted five times). Five subagents started at the same instant each pay the full cache write (inferred); 88% of one panel's cost was cache writes. `SendMessage` to the same agent keeps history; Explore and Plan are one-shot; resuming a subagent idle over 5 minutes is a cache miss.

## Considered Options

- The agent frontmatter `experimental.cacheTtl`.
- The setting `subagentPromptCacheTtl`.
- The env var `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`.
- Agent frontmatter `experimental.cacheTtl`.
- The setting `subagentPromptCacheTtl` (`1h` puts `"ttl":"1h"` only on subagent and side requests, and the fork child with `subagent_type: "fork"` plus `CLAUDE_CODE_FORK_SUBAGENT=1`; `5m` sets none).
- `experimental.cacheTtl` in agent frontmatter (superseded).
- A blanket 1h recommendation (a commenter says it costs more: subagents rarely idle past 5 minutes and the 1h write premium is 2x).
- Set a 1h subagent TTL for all agents.
- Keep the 5m default and measure cache-hit percentage per session before changing it.

## Decision Outcome

Chosen option: keep the 5m default and measure the cache-hit share per session before any change; no blanket setting, and no agent file carries `cacheTtl` (user decision, AskUserQuestion 2026-11-17). If a measurement later shows a gain, the setting `subagentPromptCacheTtl` is the one route.

## Consequences

- Setup writes `subagentPromptCacheTtl: "1h"`; agent files hold no `cacheTtl`.
- The frontmatter field stays unused even though the engine accepts it.

The other two ways are not written.

The main loop keeps its own TTL.

Good: no 2x write premium paid for nothing. Bad: needs a per-session cache-hit measurement that does not exist yet. 2.1.325: setting `subagentPromptCacheTtl`, env `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, tools `SendMessage`, `TaskStop` present.

## Confirmation

A setup test asserts `subagentPromptCacheTtl` and no `cacheTtl` in agent files.

Source: openspec/specs/subagent-prompts/spec.md:112 ("The subagent cache TTL SHALL be set only by the `subagentPromptCacheTtl` setting, and no agent file SHALL carry `cacheTtl`"); openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-26/README.md:113-137 (`experimental.cacheTtl` frontmatter); plugins/claudetto/hooks/features/setup/settings.ts:118@088a227c; chunk-4h798pp0.js:1023749 and chunk-4h798pp0.js:2520314 (claude 2.1.325 binary; cited by the old plan, not re-read); chunk-4h798pp0.js:3154956 and :2520314 (claude 2.1.326 binary, relocated from chunk-wqb2b4v0.js:3067022 and :2438231 of 2.1.325); the old plan says the lead read the code with cc-inspect (offsets not rechecked); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:12; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:161; external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:128 (the 88% figure, weak match).
